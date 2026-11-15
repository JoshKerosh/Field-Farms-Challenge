"""Point/zone intersections with CNE maps; unknown map dates remain unknown."""

import argparse
import json
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

from shapely.geometry import Point, shape, box, mapping
from pyproj import Transformer

from field_farms_data.source_probe import ROOT, atomic_json, fetch, locate_subbasin
from field_farms_data.transforms.geo import project

WFS = 'http://mapas.cne.go.cr/servicios/cne/wfs'
LAYERS = {'floodZone': 'cne:inundaciones', 'landslideZone': 'cne:deslizamientos'}


def map_layer(layer, bounds, cache):
    """Bounded WFS pagination; partial coverage is explicit and never used as a risk result."""
    features, responses, seen = [], [], set()
    matched = None
    for offset in range(0, 500, 50):
        query = urllib.parse.urlencode({'service': 'WFS', 'version': '1.0.0', 'request': 'GetFeature',
            'typeName': layer, 'srsName': 'EPSG:4326', 'outputFormat': 'application/json',
            'maxFeatures': 50, 'startIndex': offset,
            'bbox': ','.join(str(v) for v in bounds) + ',EPSG:4326'})
        body, evidence = fetch(WFS + '?' + query, cache / 'raw')
        payload = json.loads(body)
        batch = payload.get('features')
        total = payload.get('numberMatched', payload.get('totalFeatures'))
        if payload.get('type') != 'FeatureCollection' or not isinstance(batch, list) or not isinstance(total, int) or isinstance(total, bool) or total < 0:
            raise ValueError('Invalid WFS map response')
        if matched is not None and total != matched:
            raise ValueError('Layer changed while paging')
        matched = total
        # Reuse CRS/geometry validation without treating a truncated batch as a complete query.
        intersect_response(payload | {'numberMatched': len(batch), 'totalFeatures': len(batch)}, 0, 0)
        responses.append({k: v for k, v in evidence.items() if k != 'rawFile'})
        for feature in batch:
            identifier = str(feature.get('id', ''))
            if not identifier or identifier in seen:
                raise ValueError('Missing/duplicate CNE IDs: pagination not trustworthy')
            seen.add(identifier)
            features.append(feature)
        if len(features) >= total:
            if len(features) != total:
                raise ValueError('WFS count mismatch')
            break
        if len(batch) != 50:
            raise ValueError('Incomplete WFS page')
    return features, responses, matched, len(features) == matched


def build_map(lon, lat, cache, retrieved_at):
    location = locate_subbasin(lon, lat)
    reference = location['subbasin']
    original = json.loads((ROOT / reference['file']).read_text(encoding='utf-8'))['features'][reference['featureIndex']]
    boundary = shape(original['geometry'])
    bounds = list(boundary.bounds)
    frame = box(*bounds)
    to_m = Transformer.from_crs('EPSG:4326', 'EPSG:5367', always_xy=True)
    to_ll = Transformer.from_crs('EPSG:5367', 'EPSG:4326', always_xy=True)
    layers = []
    for indicator, layer in LAYERS.items():
        features, responses, matched, complete = map_layer(layer, bounds, cache)
        clipped = []
        for feature in features:
            geometry = shape(feature['geometry']).intersection(frame)
            if geometry.is_empty:
                continue
            # Display-only simplification, not the geometry used for exact point intersections.
            geometry = project(project(geometry, to_m).simplify(10, preserve_topology=True), to_ll)
            if geometry.is_empty:
                continue
            attributes = feature.get('properties') or {}
            name = attributes.get('nombre') or attributes.get('Name') or feature['id']
            clipped.append({'type': 'Feature', 'id': feature['id'], 'geometry': mapping(geometry),
                            'properties': {'id': str(feature['id']), 'name': str(name)}})
        layers.append({'id': indicator, 'sourceLayer': layer, 'matchedCount': matched,
                       'completeQuery': complete, 'downloadedCount': len(features), 'evidence': responses,
                       'data': {'type': 'FeatureCollection', 'features': clipped}})
    return {'schemaVersion': 'alert-cne-map-v1', 'dataMode': 'real',
            'location': {'longitude': lon, 'latitude': lat}, 'retrievedAt': retrieved_at,
            'observedEnd': None, 'bounds': bounds, 'displaySimplificationMetres': 10,
            'subbasin': {'name': reference['properties']['nombre'], 'geometry': mapping(boundary)},
            'layers': layers, 'source': WFS,
            'limitation': 'Historical cartography without verified map observation date; '
                          'does not prove a current event or absence of risk. Query completeness is not mapping coverage.'}


def intersect_response(payload, lon, lat):
    if not isinstance(payload, dict) or payload.get('type') != 'FeatureCollection' or not isinstance(payload.get('features'), list):
        raise ValueError('Expected GeoJSON FeatureCollection')
    features = payload['features']
    crs_data = payload.get('crs')
    crs_properties = crs_data.get('properties') if isinstance(crs_data, dict) else None
    crs = crs_properties.get('name') if isinstance(crs_properties, dict) else None
    if features and crs not in ('urn:ogc:def:crs:EPSG::4326', 'EPSG:4326', 'urn:ogc:def:crs:OGC:1.3:CRS84'):
        raise ValueError('Unverified coordinate reference system')
    matched = payload.get('numberMatched', payload.get('totalFeatures'))
    if not isinstance(matched, int) or isinstance(matched, bool) or matched != len(features):
        raise ValueError('Incomplete WFS result: cannot claim complete intersection query')
    intersections = []
    unsupported = 0
    for feature in features:
        geom = shape(feature['geometry'])
        if geom.is_empty or not geom.is_valid:
            raise ValueError('Invalid CNE geometry')
        west, south, east, north = geom.bounds
        if not (-180 <= west <= east <= 180 and -90 <= south <= north <= 90):
            raise ValueError('CNE coordinates outside WGS84 range')
        if geom.geom_type not in ('Polygon', 'MultiPolygon'):
            unsupported += 1
            continue
        if geom.covers(Point(lon, lat)):
            intersections.append(str(feature.get('id', 'unidentified-feature')))
    return {'value': True if intersections else None, 'intersectingFeatureIds': intersections,
            'returnedFeatureCount': len(features), 'unsupportedGeometryCount': unsupported,
            'status': 'unverified', 'observedStart': None, 'observedEnd': None,
            'reason': 'The service does not supply a verified observation date. '
                      'No intersecting feature does not prove no hazard or complete mapping coverage.'}


def execute(out, cache, lon, lat):
    status = {'schemaVersion': 'alert-source-status-v1', 'kind': 'cne',
              'attemptedAt': datetime.now(timezone.utc).isoformat(),
              'lastValidAvailable': (out / 'latest.json').exists()}
    try:
        if (out / 'latest.json').exists():
            previous = json.loads((out / 'latest.json').read_text(encoding='utf-8'))
            if previous['location'] != {'longitude': lon, 'latitude': lat}:
                raise ValueError('Use a separate output folder for a different point')
        indicators = []
        for indicator, layer in LAYERS.items():
            # Query envelope is only an index filter. The final test is exact polygon coverage of the point.
            query = urllib.parse.urlencode({'service': 'WFS', 'version': '1.0.0', 'request': 'GetFeature',
                'typeName': layer, 'srsName': 'EPSG:4326', 'outputFormat': 'application/json', 'maxFeatures': 100,
                'bbox': f'{lon - .001},{lat - .001},{lon + .001},{lat + .001},EPSG:4326'})
            body, evidence = fetch(WFS + '?' + query, cache / 'raw')
            result = intersect_response(json.loads(body), lon, lat)
            indicators.append({'id': indicator, 'productId': layer, 'source': 'CNE',
                               'evidence': {k: v for k, v in evidence.items() if k != 'rawFile'}, **result})
        document = {'schemaVersion': 'alert-cne-v1', 'dataMode': 'real',
                    'location': {'longitude': lon, 'latitude': lat},
                    'retrievedAt': status['attemptedAt'], 'observedEnd': None,
                    'transport': 'HTTP; no transport integrity guarantee', 'indicators': indicators}
        cartography = build_map(lon, lat, cache, status['attemptedAt'])
        atomic_json(out / 'map.json', cartography)
        atomic_json(out / 'latest.json', document)
        status.update({'status': 'ok', 'lastValidAvailable': True, 'observationDateVerified': False})
    except (ValueError, KeyError, TypeError, OSError, urllib.error.URLError):
        status.update({'status': 'failed', 'reason': 'source-or-geometry-validation-failed; previous data preserved'})
    atomic_json(out / 'status.json', status)
    print(json.dumps(status))
    return 0 if status['status'] == 'ok' else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lat', type=float, default=10.8)
    parser.add_argument('--lon', type=float, default=-85.08)
    parser.add_argument('--out', type=Path, default=ROOT / 'apps/web/public/data/alerts/cne')
    parser.add_argument('--cache', type=Path, default=ROOT / 'jobs/data-pipeline/data/cne')
    args = parser.parse_args()
    if not (-90 <= args.lat <= 90 and -180 <= args.lon <= 180):
        parser.error('Coordinates out of range')
    raise SystemExit(execute(args.out, args.cache, args.lon, args.lat))


if __name__ == '__main__':
    main()
