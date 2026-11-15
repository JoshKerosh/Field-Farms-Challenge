"""Regional NASA screening inputs: area-weighted POWER and sampled SRTM terrain.

No Earthdata, no soil-class inference and no risk probabilities. Public output is
only replaced after validation; raw provider responses remain in the local cache.
"""
import argparse
import hashlib
import json
import math
import time
import urllib.parse
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import Point, box, mapping, shape
from shapely.ops import transform
from shapely import make_valid

from field_farms_data.source_probe import ROOT, atomic_json, fetch, valid_number

POWER = 'https://power.larc.nasa.gov/api/temporal/daily/regional'
SRTM = 'https://api.opentopodata.org/v1/srtm90m'
METHOD = 'nasa-regional-power-area-srtm-samples-v1'
FORWARD = Transformer.from_crs(4326, 5367, always_xy=True).transform
INVERSE = Transformer.from_crs(5367, 4326, always_xy=True).transform
STEP_M = 90


def cached_fetch(url, cache, pause=0):
    key = hashlib.sha256(url.encode()).hexdigest()
    entry = cache / f'{key}.json'
    if entry.exists():
        record = json.loads(entry.read_text(encoding='utf-8'))
        raw = (cache / record['rawFile']).read_bytes()
        if record['url'] != url or hashlib.sha256(raw).hexdigest() != record['sha256']:
            raise ValueError('Regional cache integrity mismatch')
        return json.loads(raw), record
    if pause:
        time.sleep(pause)
    raw, evidence = fetch(url, cache / 'raw')
    atomic_json(entry, evidence)
    return json.loads(raw), evidence


def power_cells(payload, parameter):
    if (payload.get('type') != 'FeatureCollection'
            or payload['header'].get('time_standard') != 'UTC'
            or payload['parameters'][parameter]['units'] != ('1' if parameter == 'GWETROOT' else 'mm/day')):
        raise ValueError('Invalid regional POWER metadata')
    cells = {}
    for feature in payload['features']:
        coordinates = feature['geometry']['coordinates']
        lon, lat = coordinates[:2]
        if (feature['geometry']['type'] != 'Point' or not valid_number(lon, -180, 180)
                or not valid_number(lat, -90, 90) or (lon, lat) in cells):
            raise ValueError('Invalid or duplicate POWER grid point')
        series = feature['properties']['parameter'][parameter]
        for key in series:
            datetime.strptime(key, '%Y%m%d')
        # NASA native meteorological grid, not an invented fine spatial grid.
        geometry = box(lon - .3125, lat - .25, lon + .3125, lat + .25)
        cells[lon, lat] = {'series': series, 'area': transform(FORWARD, geometry)}
    if not cells:
        raise ValueError('Empty regional POWER response')
    return cells


def complete_sum(series, end, days, high=None):
    values = [series.get((end - timedelta(days=i)).strftime('%Y%m%d')) for i in range(days)]
    return sum(values) if all(valid_number(value, 0, high) for value in values) else None


def weighted_weather(geometry, wetness, rain, end):
    area = transform(FORWARD, geometry)
    total = area.area
    weighted_wet = weighted_rain = covered = 0
    count = 0
    for key, wet in wetness.items():
        if key not in rain:
            continue
        overlap = area.intersection(wet['area']).area
        if overlap <= 0:
            continue
        w = complete_sum(wet['series'], end, 3, 1)
        r = complete_sum(rain[key]['series'], end, 7)
        if w is None or r is None:
            continue
        weighted_wet += overlap * w / 3
        weighted_rain += overlap * r
        covered += overlap
        count += 1
    coverage = covered / total if total > 0 else 0
    # Partial coverage is reported explicitly; below 95% there is no estimate.
    ready = coverage >= .95
    return {'wetness3d': weighted_wet / covered if ready else None,
            'rain7dMm': weighted_rain / covered if ready else None,
            'coverageFraction': min(1, coverage), 'powerCellCount': count,
            'observedStart': (end - timedelta(days=6)).isoformat(),
            'wetnessStart': (end - timedelta(days=2)).isoformat(), 'observedEnd': end.isoformat()}


def sample_centres(geometry):
    """Nine deterministic spatially spread sample sites, not exhaustive terrain."""
    projected = transform(FORWARD, geometry)
    x0, y0, x1, y1 = projected.bounds
    candidates = [projected.representative_point()]
    for i in range(7):
        for j in range(7):
            point = Point(x0 + (i + .5) / 7 * (x1 - x0), y0 + (j + .5) / 7 * (y1 - y0))
            if projected.contains(point):
                candidates.append(point)
    selected = [candidates.pop(0)]
    while candidates and len(selected) < 9:
        index = max(range(len(candidates)), key=lambda i: min(candidates[i].distance(p) for p in selected))
        selected.append(candidates.pop(index))
    return selected


def stencil(point):
    return [(round(lon, 6), round(lat, 6)) for lon, lat in
            [INVERSE(point.x + dx, point.y + dy) for dx, dy in
             [(0, 0), (-STEP_M, 0), (STEP_M, 0), (0, -STEP_M), (0, STEP_M)]]]


def validate_elevations(payload, locations):
    if payload.get('status') != 'OK' or len(payload.get('results', [])) != len(locations):
        raise ValueError('Incomplete SRTM response')
    result = {}
    for expected, reading in zip(locations, payload['results']):
        lon, lat = expected
        if (reading.get('dataset') != 'srtm90m'
                or abs(reading['location']['lng'] - lon) > 1e-6
                or abs(reading['location']['lat'] - lat) > 1e-6
                or (reading['elevation'] is not None and not valid_number(reading['elevation'], -500, 9000))):
            raise ValueError('SRTM position, dataset or elevation mismatch')
        result[expected] = reading['elevation']
    return result


def terrain_summary(centres, elevations):
    samples = []
    for centre in centres:
        positions = stencil(centre)
        values = [elevations.get(p) for p in positions]
        if any(value is None for value in values):
            continue
        z, west, east, south, north = values
        slope = math.degrees(math.atan(math.hypot((east - west) / (2 * STEP_M),
                                                 (north - south) / (2 * STEP_M))))
        samples.append({'longitude': positions[0][0], 'latitude': positions[0][1],
                        'elevationM': z, 'slopeDegrees': slope})
    complete = len(samples) == len(centres) and bool(samples)
    return {'sampleCount': len(samples), 'plannedSampleCount': len(centres),
            'slopeDegreesMax': max(s['slopeDegrees'] for s in samples) if complete else None,
            'flatSampleFraction': sum(s['slopeDegrees'] <= 2 for s in samples) / len(samples) if complete else None,
            'elevationMinM': min((s['elevationM'] for s in samples), default=None),
            'elevationMaxM': max((s['elevationM'] for s in samples), default=None),
            'samples': samples}


def build(as_of, cache):
    layer_path = ROOT / 'apps/web/public/data/geo/cuencas.geojson'
    raw_layer = layer_path.read_bytes()
    basins = json.loads(raw_layer)['features']
    climate, sources, models = {}, [], set()
    for parameter in ['GWETROOT', 'PRECTOTCORR']:
        url = POWER + '?' + urllib.parse.urlencode({
            'parameters': parameter, 'community': 'AG', 'longitude-min': -86.25,
            'longitude-max': -81.875, 'latitude-min': 7.5, 'latitude-max': 11.5,
            'start': (as_of - timedelta(days=24)).strftime('%Y%m%d'),
            'end': (as_of - timedelta(days=1)).strftime('%Y%m%d'),
            'format': 'JSON', 'time-standard': 'UTC'})
        payload, evidence = cached_fetch(url, cache)
        climate[parameter] = power_cells(payload, parameter)
        models.update(payload['header'].get('sources', []))
        sources.append({k: evidence[k] for k in ['url', 'resolvedUrl', 'sha256']})
    wet, rain = climate['GWETROOT'], climate['PRECTOTCORR']
    common_days = []
    for key in wet.keys() & rain.keys():
        for day, value in wet[key]['series'].items():
            parsed = datetime.strptime(day, '%Y%m%d').date()
            if parsed < as_of and valid_number(value, 0, 1) and valid_number(rain[key]['series'].get(day), 0):
                common_days.append(parsed)
    if not common_days:
        raise ValueError('No usable common regional POWER observations')
    end = max(common_days)
    if (as_of - end).days > 7:
        raise ValueError('Regional POWER data older than seven days')
    prepared, locations = [], []
    for basin in basins:
        geometry = make_valid(shape(basin['geometry']))
        centres = sample_centres(geometry)
        prepared.append((basin, geometry, centres))
        for point in centres:
            locations.extend(stencil(point))
    locations = sorted(set(locations))
    elevations = {}
    for start in range(0, len(locations), 100):
        batch = locations[start:start + 100]
        url = SRTM + '?' + urllib.parse.urlencode({
            'locations': '|'.join(f'{lat:.6f},{lon:.6f}' for lon, lat in batch),
            'interpolation': 'bilinear'})
        payload, evidence = cached_fetch(url, cache, pause=1.1)
        elevations.update(validate_elevations(payload, batch))
        sources.append({k: evidence[k] for k in ['url', 'resolvedUrl', 'sha256']})
        print(f'SRTM {min(start + 100, len(locations))}/{len(locations)}', flush=True)
    features = []
    for basin, geometry, centres in prepared:
        # Only simplify the displayed boundary, never the area-weighting geometry.
        display = transform(INVERSE, transform(FORWARD, geometry).simplify(150, preserve_topology=True))
        features.append({'type': 'Feature', 'geometry': mapping(display), 'properties': {
            'id': str(basin['properties']['cuenca_no']), 'name': basin['properties']['nombre'],
            'weather': weighted_weather(geometry, wet, rain, end),
            'terrain': terrain_summary(centres, elevations)}})
    if not any(f['properties']['weather']['wetness3d'] is not None
               and f['properties']['terrain']['slopeDegreesMax'] is not None for f in features):
        raise ValueError('No basin has complete usable weather and terrain')
    return {'type': 'FeatureCollection', 'schemaVersion': 'alert-nasa-regions-v1',
            'dataMode': 'real', 'method': METHOD, 'generatedAt': datetime.now(timezone.utc).isoformat(),
            'observedEnd': end.isoformat(), 'sources': sources, 'powerModels': sorted(models),
            'spatial': {'powerResolutionDegrees': [.625, .5], 'demResolutionM': 90,
                        'terrainSampleLimitPerBasin': 9, 'slopeStencilMetres': STEP_M,
                        'displaySimplificationMetres': 150, 'basinLayerSha256': hashlib.sha256(raw_layer).hexdigest()},
            'limitations': 'Regional model estimate, not a farm measurement. SRTM observed February 2000; '
                            'nine or fewer slope samples do not cover every hillside. No soil class or HAND. '
                            'POWER weather remains coarse; boundaries do not increase its resolution.',
            'features': features}


def execute(as_of, out, cache):
    status_path = out.with_name('nasa-regions-status.json')
    status = {'attemptedAt': datetime.now(timezone.utc).isoformat(), 'lastValidAvailable': out.exists()}
    try:
        document = build(as_of, cache)
        if out.exists():
            previous = json.loads(out.read_text(encoding='utf-8'))
            if previous.get('observedEnd', '') > document['observedEnd']:
                raise ValueError('Refusing to replace newer regional data')
        atomic_json(out, document)
        status.update({'status': 'ok', 'lastValidAvailable': True,
                       'observedEnd': document['observedEnd'], 'regions': len(document['features'])})
    except (ValueError, KeyError, TypeError, OSError) as error:
        status.update({'status': 'failed', 'reason': type(error).__name__})
        atomic_json(status_path, status)
        raise
    atomic_json(status_path, status)
    print(json.dumps(status), flush=True)
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', type=date.fromisoformat,
                        default=datetime.now(timezone(timedelta(hours=-6))).date())
    parser.add_argument('--out', type=Path, default=ROOT / 'apps/web/public/data/alerts/nasa-regions.geojson')
    parser.add_argument('--cache', type=Path, default=ROOT / 'jobs/data-pipeline/data/regional')
    args = parser.parse_args()
    raise SystemExit(execute(args.as_of, args.out, args.cache))


if __name__ == '__main__':
    main()
