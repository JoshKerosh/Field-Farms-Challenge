import json
from unittest.mock import patch

import pytest
from shapely.geometry import box, mapping, Point

from field_farms_data.publish import cne


def collection(features):
    return {'type': 'FeatureCollection', 'totalFeatures': len(features), 'numberMatched': len(features),
            'crs': {'properties': {'name': 'urn:ogc:def:crs:EPSG::4326'}}, 'features': features}


def test_true_intersection_preserves_unknown_map_date_and_never_becomes_current():
    payload = collection([{'id': 'synthetic-zone', 'geometry': mapping(box(-86, 10, -85, 11))}])
    result = cne.intersect_response(payload, -85.5, 10.5)
    assert result['value'] is True
    assert result['status'] == 'unverified'
    assert result['observedEnd'] is None


def test_empty_or_nonintersecting_query_does_not_produce_false_safety():
    empty = collection([]) | {'crs': None}
    assert cne.intersect_response(empty, -85, 10)['value'] is None
    outside = collection([{'id': 'synthetic', 'geometry': mapping(box(-84, 9, -83, 10))}])
    assert cne.intersect_response(outside, -85, 10)['value'] is None


def test_points_are_not_used_as_zones_with_an_invented_hazard_radius():
    payload = collection([{'id': 'centroid', 'geometry': mapping(Point(-85.5, 10.5))}])
    result = cne.intersect_response(payload, -85.5, 10.5)
    assert result['value'] is None
    assert result['unsupportedGeometryCount'] == 1


def test_truncated_and_wrong_crs_queries_are_rejected():
    payload = collection([{'id': 'zone', 'geometry': mapping(box(-86, 10, -85, 11))}])
    with pytest.raises(ValueError):
        cne.intersect_response(payload | {'totalFeatures': 1000, 'numberMatched': 1000}, -85.5, 10.5)
    with pytest.raises(ValueError):
        cne.intersect_response(payload | {'crs': None}, -85.5, 10.5)


def test_failed_update_cannot_truncate_existing_data(tmp_path):
    latest = tmp_path / 'latest.json'
    latest.write_text(json.dumps({'location': {'longitude': -85.08, 'latitude': 10.8}, 'synthetic': 'previous'}))
    before = latest.read_bytes()
    with patch.object(cne, 'fetch', side_effect=TimeoutError('synthetic')):
        assert cne.execute(tmp_path, tmp_path / 'cache', -85.08, 10.8) == 1
    assert latest.read_bytes() == before
    assert json.loads((tmp_path / 'status.json').read_text())['status'] == 'failed'


def test_map_pagination_rejects_duplicate_ids_and_exposes_partial_coverage(tmp_path):
    repeated = [{'type': 'Feature', 'id': f'test-{i}', 'geometry': mapping(box(-86, 10, -85, 11))} for i in range(50)]
    batch = collection(repeated) | {'numberMatched': 100, 'totalFeatures': 100}
    body = json.dumps(batch).encode()
    with patch.object(cne, 'fetch', return_value=(body, {})):
        with pytest.raises(ValueError, match='duplicate'):
            cne.map_layer('cne:inundaciones', [-86, 10, -85, 11], tmp_path)


def test_map_query_validates_complete_empty_response_without_inventing_geometry(tmp_path):
    body = json.dumps(collection([]) | {'crs': None}).encode()
    with patch.object(cne, 'fetch', return_value=(body, {})):
        features, evidence, matched, complete = cne.map_layer('cne:inundaciones', [-86, 10, -85, 11], tmp_path)
    assert features == [] and matched == 0 and complete
