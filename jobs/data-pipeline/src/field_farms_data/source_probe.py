"""Read-only provider checks and local samples; not a production indicator contract.

Uses only the Python standard library. No raster downloads, credentials, risk rules,
frontend changes or publication to public/data. Run with --help for options.
"""

import argparse
import calendar
import hashlib
import json
import math
import re
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
RONI_URL = 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/'
POWER_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point'
CMR_URL = 'https://cmr.earthdata.nasa.gov/search/'
CNE_URL = 'http://mapas.cne.go.cr/servicios/cne/wfs?service=WFS&request=GetCapabilities'
SEASONS = ('DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ')
MAX_BYTES = 4 * 1024 * 1024


def atomic_json(path, value):
    """An unsuccessful write must not truncate the last valid file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                     suffix='.tmp', delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(content)
    try:
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def fetch(url, raw_dir):
    request = urllib.request.Request(url, headers={'User-Agent': 'FieldFarms-source-probe/0.1'})
    with urllib.request.urlopen(request, timeout=25) as response:
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError('Response exceeds metadata/sample size limit; no raster is saved')
        final_url = response.url
    digest = hashlib.sha256(body).hexdigest()
    raw_dir.mkdir(parents=True, exist_ok=True)
    raw_path = raw_dir / f'{digest}.raw'
    raw_path.write_bytes(body)
    return body, {'url': url, 'resolvedUrl': final_url, 'sha256': digest,
                  'rawFile': f'raw/{raw_path.name}'}


def valid_number(value, low=None, high=None):
    return (isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value) and (low is None or value >= low)
            and (high is None or value <= high))


def ring_contains(ring, lon, lat):
    """Ray casting for locating this sample point, not parcel/area analysis."""
    inside = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[1] > lat) != (b[1] > lat):
            crossing = (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]
            if lon < crossing:
                inside = not inside
    return inside


def locate_subbasin(lon, lat):
    matches = []
    for path in sorted((ROOT / 'apps/web/public/data/geo/subcuencas').glob('*.geojson')):
        layer = json.loads(path.read_text(encoding='utf-8'))
        for index, feature in enumerate(layer['features']):
            geom = feature['geometry']
            polygons = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
            if any(ring_contains(poly[0], lon, lat)
                   and not any(ring_contains(hole, lon, lat) for hole in poly[1:])
                   for poly in polygons):
                matches.append({'properties': feature['properties'],
                                'file': path.relative_to(ROOT).as_posix(),
                                'featureIndex': index,
                                'layerSha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    if len(matches) != 1:
        raise ValueError(f'Sample point must resolve to exactly one subbasin; found {len(matches)}')
    return {'longitude': lon, 'latitude': lat, 'subbasin': matches[0],
            'spatialMethod': 'point-in-polygon on versioned WGS84 layer',
            'limitation': 'Point sample inside a subbasin, NOT an area-weighted subbasin mean. '
                          'File/index is a local reference, not a shared stable indicator ID.'}


def parse_power(payload, as_of):
    """Use a complete, common 30-day window; missing values never become zeros."""
    metadata = payload['parameters']
    if metadata['PRECTOTCORR']['units'] != 'mm/day':
        raise ValueError('Unexpected precipitation units; review before conversion')
    if metadata['GWETROOT']['units'] not in ('1', 'dimensionless', 'unitless'):
        raise ValueError('Unexpected GWETROOT units; it is not SMAP volumetric moisture')
    if payload['header'].get('time_standard') != 'UTC':
        raise ValueError('Expected daily UTC time standard')
    parameters = payload['properties']['parameter']
    rain, soil = parameters['PRECTOTCORR'], parameters['GWETROOT']
    common = []
    for key in rain.keys() & soil.keys():
        observed = datetime.strptime(key, '%Y%m%d').date()
        if observed < as_of and valid_number(rain[key], 0) and valid_number(soil[key], 0, 1):
            common.append(observed)
    if not common:
        raise ValueError('No valid common observation before as-of date')
    end = max(common)
    days = [end - timedelta(days=i) for i in reversed(range(30))]
    keys = [day.strftime('%Y%m%d') for day in days]
    if any(not valid_number(rain.get(k), 0) or not valid_number(soil.get(k), 0, 1) for k in keys):
        raise ValueError('Incomplete 30-day window; sample rejected, last valid sample preserved')
    return {'source': 'NASA POWER', 'origin': 'provider-data',
            'observedStart': days[0].isoformat(), 'observedEnd': end.isoformat(),
            'timeStandard': 'UTC', 'lagDays': (as_of - end).days,
            'precipitation30d': {'value': sum(rain[k] for k in keys), 'unit': 'mm',
                                'method': 'sum of 30 complete daily PRECTOTCORR values'},
            'rootZoneWetness30d': {'value': sum(soil[k] for k in keys) / 30, 'unit': '1',
                                  'method': 'mean of 30 daily GWETROOT values',
                                  'limitation': 'Relative wetness, not volumetric SMAP moisture'},
            'daily': [{'date': day.isoformat(), 'precipitationMm': rain[k],
                       'rootZoneWetness': soil[k]} for day, k in zip(days, keys)],
            'parameterMetadata': metadata,
            'precipitationAnomaly30d': {'value': None, 'status': 'not-computed',
                                       'reason': 'A documented comparable baseline is not agreed'},
            'riskEvaluation': 'not-performed; no approved thresholds',
            'freshness': 'not-classified; lagDays is reported without inventing an expiry rule'}


class LatestRoniRow(HTMLParser):
    """Only the identified current row, never hidden historical-version tables."""

    def __init__(self):
        super().__init__()
        self.active = False
        self.in_cell = False
        self.cell = ''
        self.cells = []
        self.matches = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'tr' and dict(attrs).get('id') == 'latest-data':
            self.matches += 1
            self.active = True
        if self.active and tag in ('td', 'th'):
            self.in_cell = True
            self.cell = ''

    def handle_data(self, data):
        if self.active and self.in_cell:
            self.cell += data

    def handle_endtag(self, tag):
        if self.active and tag in ('td', 'th'):
            self.cells.append(self.cell.strip())
            self.in_cell = False
        if tag == 'tr':
            self.active = False


def parse_roni(html, as_of):
    if 'Relative Oceanic' not in html or 'ERSSTv6' not in html:
        raise ValueError('RONI/ERSSTv6 identity changed; do not substitute ONI')
    parser = LatestRoniRow()
    parser.feed(html)
    if parser.matches != 1 or not 2 <= len(parser.cells) <= 13:
        raise ValueError('Unexpected RONI table layout')
    year_text, *cells = parser.cells
    if not re.fullmatch(r'\d{4}', year_text):
        raise ValueError('Invalid RONI year')
    year = int(year_text)
    observations = []
    for i, cell in enumerate(cells):
        if cell in ('', '---', '***', 'NA'):
            continue
        value = float(cell)
        if not valid_number(value):
            raise ValueError('Non-finite RONI value')
        end_year, end_month = year + (i + 1) // 12, (i + 1) % 12 + 1
        start_year, start_month = year + (i - 1) // 12, (i - 1) % 12 + 1
        end = date(end_year, end_month, calendar.monthrange(end_year, end_month)[1])
        if end >= as_of:
            continue
        observations.append({'season': SEASONS[i], 'year': year, 'value': value,
                             'observedStart': date(start_year, start_month, 1).isoformat(),
                             'observedEnd': end.isoformat()})
    if not observations:
        raise ValueError('No completed RONI season available before as-of date')
    latest = max(observations, key=lambda o: o['observedEnd'])
    return {'source': 'NOAA CPC', 'index': 'RONI', 'sstVersion': 'ERSSTv6',
            'origin': 'provider-data', 'unit': 'degC', **latest,
            'lagDays': (as_of - date.fromisoformat(latest['observedEnd'])).days,
            'revisionStatus': 'Recent values are estimates and may be revised by NOAA',
            'method': 'Official three-month seasonal RONI; NOT daily local drought',
            'riskEvaluation': 'not-performed; regional rules and thresholds not approved'}


def preserve_latest(path, sample):
    if path.exists():
        previous = json.loads(path.read_text(encoding='utf-8'))
        for key in ('source', 'index', 'sstVersion', 'location'):
            if previous.get(key) != sample.get(key):
                raise ValueError('Existing sample has a different source/version/location; '
                                 'choose a separate --out directory')
        if previous['observedEnd'] > sample['observedEnd']:
            return 'preserved-newer-local-sample'
    atomic_json(path, sample)
    return 'saved'


def check_cmr(short_name, as_of, raw_dir):
    query = urllib.parse.urlencode({'short_name': short_name, 'page_size': 100})
    raw, evidence = fetch(CMR_URL + 'collections.json?' + query, raw_dir)
    entries = json.loads(raw)['feed']['entry']
    if not entries:
        raise ValueError('No collection metadata returned')
    collections = [{'id': e['id'], 'shortName': e['short_name'], 'version': e['version_id'],
                    'title': e['title']} for e in entries]
    # A catalog match does not establish authenticated access or an accepted version.
    return {'status': 'metadata-only', 'source': 'NASA CMR', 'collections': collections,
            'evidence': evidence, 'asOf': as_of.isoformat(),
            'downloadAccess': 'not-tested; Earthdata project authorization must be verified',
            'indicatorStatus': 'unavailable; no raster downloaded or processed'}


def check_cne(raw_dir, lon, lat):
    raw, evidence = fetch(CNE_URL, raw_dir)
    root = ET.fromstring(raw)
    if root.tag.split('}')[-1] not in ('WFS_Capabilities', 'WFS_CapabilitiesType'):
        raise ValueError('Endpoint did not return WFS capabilities')
    names = [node.text for node in root.iter() if node.tag.split('}')[-1] == 'Name'
             and node.text and any(term in node.text.lower() for term in ('inund', 'desliz', 'corona'))]
    if not names:
        raise ValueError('No flood/landslide layer names in capabilities')
    samples = []
    for name in ('cne:inundaciones', 'cne:deslizamientos', 'cne:coronas_de_deslizamientos'):
        if name not in names:
            continue
        query = urllib.parse.urlencode({
            'service': 'WFS', 'version': '1.0.0', 'request': 'GetFeature',
            'typeName': name, 'srsName': 'EPSG:4326', 'outputFormat': 'application/json',
            'maxFeatures': 3,
            'bbox': f'{lon - 0.02},{lat - 0.02},{lon + 0.02},{lat + 0.02},EPSG:4326'})
        try:
            body, layer_evidence = fetch(CNE_URL.split('?')[0] + '?' + query, raw_dir)
            layer = json.loads(body)
            if layer.get('type') != 'FeatureCollection' or not isinstance(layer.get('features'), list):
                raise ValueError('Not a GeoJSON FeatureCollection')
            features = layer['features']
            if len(features) > 3 or any(f.get('type') != 'Feature' or not isinstance(f.get('geometry'), dict)
                                        for f in features):
                raise ValueError('Unexpected sample size or missing feature geometry')
            samples.append({'layer': name, 'status': 'downloaded-sample',
                            'featureCount': len(features), 'evidence': layer_evidence})
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, TypeError) as error:
            reason = f'HTTP {error.code}' if isinstance(error, urllib.error.HTTPError) else str(error)
            samples.append({'layer': name, 'status': 'failed', 'reason': reason})
    return {'status': 'sample-checks' if samples else 'metadata-only',
            'layers': sorted(set(names)), 'evidence': evidence, 'geometrySamples': samples,
            'bbox': [lon - 0.02, lat - 0.02, lon + 0.02, lat + 0.02],
            'indicatorStatus': 'unavailable; bounded samples, NOT a complete coverage or parcel intersection',
            'limitation': 'Zero returned features does not establish absence of risk. '
                          'At most 3 features per layer; CRS, topology and area coverage need validation. '
                          'CNE endpoint uses HTTP, without transport integrity guarantees.'}


def run(args):
    out = args.out.resolve()
    raw_dir = out / 'raw'
    retrieved_at = datetime.now(timezone.utc).isoformat()
    report = {'probeVersion': 1, 'asOf': args.as_of.isoformat(), 'retrievedAt': retrieved_at,
              'purpose': 'Local feasibility check; not the SPA-7 production contract',
              'checks': {}, 'pending': ['Approved risk thresholds and freshness policies',
                                        'Comparable precipitation-anomaly baseline',
                                        'Soil source selection and validation (SoilGrids is a candidate)',
                                        'Area-weighted subbasin summaries and stable IDs']}
    location = locate_subbasin(args.lon, args.lat)
    report['location'] = location
    for name in args.sources:
        print(f'Checking {name}...', flush=True)
        try:
            if name == 'power':
                query = urllib.parse.urlencode({
                    'parameters': 'PRECTOTCORR,GWETROOT', 'community': 'AG',
                    'longitude': args.lon, 'latitude': args.lat,
                    'start': (args.as_of - timedelta(days=60)).strftime('%Y%m%d'),
                    'end': (args.as_of - timedelta(days=1)).strftime('%Y%m%d'),
                    'format': 'JSON', 'time-standard': 'UTC'})
                raw, evidence = fetch(POWER_URL + '?' + query, raw_dir)
                sample = parse_power(json.loads(raw), args.as_of)
                sample['location'] = location
            elif name == 'roni':
                raw, evidence = fetch(RONI_URL, raw_dir)
                sample = parse_roni(raw.decode('utf-8'), args.as_of)
            elif name == 'cne':
                report['checks'][name] = check_cne(raw_dir, args.lon, args.lat)
                continue
            else:
                short_name = {'imerg': 'GPM_3IMERGDL', 'smap': 'SPL4SMGP',
                              'nasadem': 'NASADEM_HGT'}[name]
                report['checks'][name] = check_cmr(short_name, args.as_of, raw_dir)
                continue
            sample.update({'retrievedAt': retrieved_at, 'evidence': evidence})
            sample_path = out / name / 'latest.json'
            publication = preserve_latest(sample_path, sample)
            report['checks'][name] = {'status': 'validated-sample',
                                     'sampleFile': f'{name}/latest.json',
                                     'candidateObservedEnd': sample['observedEnd'],
                                     'observedEnd': json.loads(sample_path.read_text(encoding='utf-8'))['observedEnd'],
                                     'writeResult': publication}
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, KeyError,
                TypeError, ET.ParseError) as error:
            # URLs contain only public query arguments. No credentials are read or sent.
            reason = f'HTTP {error.code}' if isinstance(error, urllib.error.HTTPError) else str(error)
            report['checks'][name] = {'status': 'failed', 'reason': reason,
                                     'lastValidSample': 'preserved if present; not refreshed by this failure'}
        finally:
            print(f"  {report['checks'].get(name, {}).get('status', 'failed')}", flush=True)
    atomic_json(out / 'report.json', report)
    print(f'Report: {out / "report.json"}', flush=True)
    failed = any(c['status'] == 'failed'
                 or any(s['status'] == 'failed' for s in c.get('geometrySamples', []))
                 for c in report['checks'].values())
    return 1 if failed else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', type=date.fromisoformat,
                        default=datetime.now(timezone(timedelta(hours=-6))).date(),
                        help='Reference date in Costa Rica (YYYY-MM-DD); defaults to today')
    parser.add_argument('--lat', type=float, default=10.8)
    parser.add_argument('--lon', type=float, default=-85.08)
    parser.add_argument('--out', type=Path, default=ROOT / 'jobs/data-pipeline/data/source-check')
    parser.add_argument('--sources', nargs='+', choices=['power', 'roni', 'imerg', 'smap', 'nasadem', 'cne'],
                        default=['power', 'roni', 'imerg', 'smap', 'nasadem', 'cne'])
    args = parser.parse_args()
    if not (-90 <= args.lat <= 90 and -180 <= args.lon <= 180):
        parser.error('Coordinates out of range')
    raise SystemExit(run(args))


if __name__ == '__main__':
    main()
