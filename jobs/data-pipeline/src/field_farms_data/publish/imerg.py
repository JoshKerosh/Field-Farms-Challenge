"""Publish small IMERG summaries. Default output is local and ignored by Git.

No commit, push, deployment, raster storage or risk thresholds are performed.
"""

import argparse
import hashlib
import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from field_farms_data.providers import imerg as source
from field_farms_data.source_probe import ROOT, atomic_json


def publish_bundle(out, bundle):
    latest = out / 'latest.json'
    if latest.exists():
        previous = json.loads(latest.read_text(encoding='utf-8'))
        if previous.get('schemaVersion') != bundle['schemaVersion']:
            raise ValueError('Existing latest has an incompatible schema')
        if previous['observedEnd'] > bundle['observedEnd']:
            return 'preserved-newer-snapshot'
        if previous.get('inputFingerprint') == bundle['inputFingerprint']:
            return 'unchanged'
    # The dated snapshot is written first; latest is replaced atomically only after validation.
    atomic_json(out / f"{bundle['observedEnd']}.json", bundle)
    atomic_json(latest, bundle)
    return 'published'


def build_bundle(window, token, geo_dir):
    from field_farms_data.transforms import imerg as transform

    basins = transform.load_subbasins(geo_dir)
    arrays, evidence = [], []
    grid = None
    cell_weights = None
    for granule in window:
        dims = source.schema(granule['url'], token)
        coordinates = source.request_bytes(source.subset_url(granule['url'], '/lon;/lat;/time'), token)
        lon, lat = transform.read_coordinates(coordinates, granule['date'])
        indices = transform.selection(lon, lat, basins)
        selected_lon = lon[indices['lon'][0]:indices['lon'][1] + 1]
        selected_lat = lat[indices['lat'][0]:indices['lat'][1] + 1]
        if len(selected_lon) < 2 or len(selected_lat) < 2:
            raise ValueError('At least two cells per axis are required to infer cell footprints')
        if grid is not None:
            import numpy as np
            if (not np.array_equal(selected_lon, grid[0]) or not np.array_equal(selected_lat, grid[1])):
                raise ValueError('IMERG grid changed within the seven-day window')
        else:
            grid = (selected_lon, selected_lat)
            cell_weights = transform.weights(*grid, basins)
        url = source.subset_url(granule['url'], transform.constraint(dims, indices))
        body = source.request_bytes(url, token)
        values = transform.read_precipitation(body, granule['date'], *grid)
        arrays.append(values)
        evidence.append(granule | {'subsetUrl': url, 'sha256': source.fingerprint(body),
                                   'decodedSha256': source.fingerprint(values.astype('<f8').tobytes())})
    days = [g['date'] for g in window]
    summaries = transform.aggregate(arrays, days, basins, cell_weights)
    if not any(b['rain1d']['status'] == 'available' for b in summaries):
        raise ValueError('No subbasin has a complete last-day indicator; previous data preserved')
    geometry_version = hashlib.sha256(json.dumps(
        sorted([{key: value for key, value in b.items() if key != 'geometry'} for b in basins], key=lambda b: b['id']),
        sort_keys=True).encode()).hexdigest()
    # DAP-generated NetCDF bytes can change even for unchanged numeric observations.
    # Keep the raw-byte hash for audit, but use decoded values for idempotency.
    content = [{key: value for key, value in entry.items() if key != 'sha256'} for entry in evidence]
    fingerprint = hashlib.sha256(json.dumps({'sources': content, 'geometry': geometry_version,
                                            'method': transform.METHOD}, sort_keys=True).encode()).hexdigest()
    return {'schemaVersion': 'imerg-subbasins-v1', 'origin': 'estimated', 'dataMode': 'real',
            'source': {'institution': 'NASA GES DISC', 'product': 'GPM_3IMERGDL', 'version': '07',
                       'url': 'https://doi.org/10.5067/GPM/IMERGDL/DAY/07',
                       'run': 'Late', 'provisional': True, 'resolutionDegrees': 0.1},
            'observedStart': days[0], 'observedEnd': days[-1], 'timeStandard': 'UTC',
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'inputFingerprint': fingerprint, 'geometryVersion': geometry_version,
            'method': {'id': transform.METHOD, 'areaCrs': 'EPSG:5367',
                       'description': 'Mean of daily grid depths weighted by subbasin/cell intersection area; '
                                      '7-day sum uses the same grid support for all days.',
                       'missingData': 'Any invalid intersecting pixel makes its indicator unavailable.',
                       'ids': 'Source-specific geometry-content IDs; not the agreed SPA-7 IDs.'},
            'granules': evidence, 'subbasins': summaries}


def execute(as_of, out, geo_dir, discover_only=False):
    """Failed attempts update status, never the observation date or last valid summary."""
    attempted = datetime.now(timezone.utc).isoformat()
    previous = out / 'latest.json'
    status = {'schemaVersion': 'imerg-pipeline-status-v1', 'attemptedAt': attempted,
              'asOf': as_of.isoformat(), 'lastValidAvailable': previous.exists()}
    token = os.environ.get('EARTHDATA_TOKEN', '').strip()
    try:
        if not token and not discover_only:
            raise source.SourceError('earthdata-token-missing')
        window = source.discover(as_of)
        if discover_only:
            atomic_json(out / 'discovery.json', {'discoveredAt': attempted, 'granules': window,
                                                'downloadAccess': 'not-tested'})
            status.update({'status': 'discovered-only', 'downloadAccess': 'not-tested'})
        else:
            bundle = build_bundle(window, token, geo_dir)
            result = publish_bundle(out, bundle)
            saved = json.loads(previous.read_text(encoding='utf-8'))
            status.update({'status': 'ok', 'writeResult': result,
                           'observedEnd': saved['observedEnd'],
                           'lagDays': (as_of - date.fromisoformat(saved['observedEnd'])).days,
                           'lastValidAvailable': True,
                           'freshness': 'Expiry must be assessed by the consumer; this is download status only.'})
    except source.SourceError as error:
        status.update({'status': 'blocked' if str(error) == 'earthdata-token-missing' else 'failed',
                       'reason': str(error)})
    except (ValueError, KeyError, TypeError, OSError, ImportError, RuntimeError):
        # Never log third-party exception text: a server could echo authorization headers.
        status.update({'status': 'failed', 'reason': 'validation-or-processing-failed; '
                       'check installed optional dependencies and provider schema'})
    atomic_json(out / 'status.json', status)
    print(json.dumps(status, ensure_ascii=False, indent=2))
    return 0 if status['status'] in ('ok', 'discovered-only') else 2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', type=date.fromisoformat,
                        default=datetime.now(timezone(timedelta(hours=-6))).date())
    parser.add_argument('--out', type=Path, default=ROOT / 'jobs/data-pipeline/data/imerg')
    parser.add_argument('--geo-dir', type=Path, default=ROOT / 'apps/web/public/data/geo/subcuencas')
    parser.add_argument('--discover-only', action='store_true', help='Query public CMR, without authentication or rain data')
    args = parser.parse_args()
    raise SystemExit(execute(args.as_of, args.out, args.geo_dir, args.discover_only))


if __name__ == '__main__':
    main()
