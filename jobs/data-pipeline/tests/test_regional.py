import json
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from shapely.geometry import Point, box

from field_farms_data.publish import regional


def series(value):
    end = date(2026, 11, 13)
    return {(end - timedelta(days=i)).strftime('%Y%m%d'): value for i in range(7)}


def test_weather_is_area_weighted_and_gaps_are_not_filled_with_zero():
    geom = box(-85, 10, -84.9, 10.1)
    area = regional.transform(regional.FORWARD, geom)
    wet = {(0, 0): {'series': series(.9), 'area': area}}
    rain = {(0, 0): {'series': series(10), 'area': area}}
    result = regional.weighted_weather(geom, wet, rain, date(2026, 11, 13))
    assert result['wetness3d'] == pytest.approx(.9)
    assert result['rain7dMm'] == pytest.approx(70)
    assert result['coverageFraction'] == pytest.approx(1)
    rain[(0, 0)]['series'].pop('20261110')
    missing = regional.weighted_weather(geom, wet, rain, date(2026, 11, 13))
    assert missing['wetness3d'] is None and missing['rain7dMm'] is None


def test_two_cell_average_uses_actual_intersection_area_and_valid_zero():
    geom = box(-85, 10, -84.9, 10.1)
    areas = [regional.transform(regional.FORWARD, box(-85, 10, -84.975, 10.1)),
             regional.transform(regional.FORWARD, box(-84.975, 10, -84.9, 10.1))]
    wet = {i: {'series': series(v), 'area': a} for i, (v, a) in enumerate(zip([0, 1], areas))}
    rain = {i: {'series': series(0), 'area': a} for i, a in enumerate(areas)}
    result = regional.weighted_weather(geom, wet, rain, date(2026, 11, 13))
    # Very small projection boundary differences are negligible for this fixture.
    assert result['wetness3d'] == pytest.approx(.75, abs=.001)
    assert result['rain7dMm'] == 0


def test_srtm_slope_is_a_metric_gradient_and_missing_neighbour_invalidates_summary():
    point = Point(*regional.FORWARD(-85, 10))
    locations = regional.stencil(point)
    # Rise/run = 1 east-west and 0 north-south -> 45 degrees.
    elevations = dict(zip(locations, [100, 10, 190, 100, 100]))
    summary = regional.terrain_summary([point], elevations)
    assert summary['slopeDegreesMax'] == pytest.approx(45)
    assert summary['flatSampleFraction'] == 0
    elevations.pop(locations[1])
    summary = regional.terrain_summary([point], elevations)
    assert summary['sampleCount'] == 0
    assert summary['slopeDegreesMax'] is None and summary['flatSampleFraction'] is None


def test_bad_srtm_location_dataset_and_nodata_are_not_replaced_by_zero():
    locations = [(-85, 10)]
    response = {'status': 'OK', 'results': [{'dataset': 'srtm90m', 'elevation': None,
                                           'location': {'lat': 10, 'lng': -85}}]}
    assert regional.validate_elevations(response, locations) == {(-85, 10): None}
    response['results'][0]['dataset'] = 'other'
    with pytest.raises(ValueError):
        regional.validate_elevations(response, locations)
    response['results'][0]['dataset'] = 'srtm90m'
    response['results'][0]['location']['lng'] = -84
    with pytest.raises(ValueError):
        regional.validate_elevations(response, locations)


def test_sampling_is_deterministic_inside_geometry_and_keeps_holes():
    geom = box(-85, 10, -84.5, 10.5).difference(box(-84.9, 10.1, -84.6, 10.4))
    samples = regional.sample_centres(geom)
    assert len(samples) == 9
    assert [p.wkt for p in samples] == [p.wkt for p in regional.sample_centres(geom)]
    assert all(geom.contains(Point(*regional.INVERSE(p.x, p.y))) for p in samples)


def test_failed_update_preserves_previous_public_layer(tmp_path):
    target = tmp_path / 'nasa-regions.geojson'
    previous = {'observedEnd': '2026-11-13', 'test': 'previous valid snapshot'}
    target.write_text(json.dumps(previous))
    with patch.object(regional, 'build', side_effect=ValueError('provider unavailable')):
        with pytest.raises(ValueError):
            regional.execute(date(2026, 11, 15), target, tmp_path / 'cache')
    assert json.loads(target.read_text()) == previous
    assert json.loads((tmp_path / 'nasa-regions-status.json').read_text())['status'] == 'failed'
