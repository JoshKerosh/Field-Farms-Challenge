"""Synthetic NetCDF fixtures only. No network, credentials or real risk thresholds."""

import json
import urllib.parse
from datetime import date, timedelta
from unittest.mock import patch

import netCDF4
import numpy as np
import pytest
from shapely.geometry import box

from field_farms_data.providers import imerg as provider
from field_farms_data.publish import imerg as publisher
from field_farms_data.transforms import imerg as transform


def granule(day, revision=1):
    return {'meta': {'concept-id': f'G-{day}', 'revision-id': revision},
            'umm': {'CollectionReference': {'ShortName': 'GPM_3IMERGDL', 'Version': '07'},
                    'TemporalExtent': {'RangeDateTime': {
                        'BeginningDateTime': f'{day}T00:00:00.000Z',
                        'EndingDateTime': f'{day}T23:59:59.999Z'}},
                    'RelatedUrls': [{'URL': f'https://{provider.DATA_HOST}/test/{day}.nc4',
                                     'Subtype': 'OPENDAP DATA'}]}}


def window_items():
    return [granule(str(date(2026, 11, 7) + timedelta(days=i))) for i in range(7)]


@pytest.fixture
def nc_bytes(tmp_path):
    def create(values=None, dims=('time', 'lon', 'lat'), units='mm/day', day='2026-11-13', lon=None):
        path = tmp_path / 'synthetic.nc4'
        with netCDF4.Dataset(path, 'w') as ds:
            ds.createDimension('time', 1)
            ds.createDimension('lon', 2)
            ds.createDimension('lat', 2)
            for name, coordinates, coord_units in [
                ('lon', lon if lon is not None else [-85.05, -84.95], 'degrees_east'),
                ('lat', [10.75, 10.85], 'degrees_north')]:
                variable = ds.createVariable(name, 'f8', (name,))
                variable.units = coord_units
                variable[:] = coordinates
            time = ds.createVariable('time', 'f8', ('time',))
            time.units = 'days since 1970-01-01'
            time[:] = [(date.fromisoformat(day) - date(1970, 1, 1)).days]
            rain = ds.createVariable('precipitation', 'f8', dims, fill_value=-9999.)
            rain.units = units
            rain[:] = [[[1., 2.], [3., 4.]]] if values is None else values
        return path.read_bytes()
    return create


def basin(geometry=None):
    return {'id': 'synthetic-basin', 'name': 'Synthetic', 'geometrySha256': 'test',
            'geometry': geometry if geometry is not None else box(-85.1, 10.7, -84.9, 10.9)}


def test_discovery_uses_latest_complete_week_not_yesterday_assumption():
    items = window_items()
    items.reverse()
    result = provider.choose_window(items, date(2026, 11, 15))
    assert result[0]['date'] == '2026-11-07'
    assert result[-1]['date'] == '2026-11-13'


def test_discovery_rejects_missing_day_and_duplicates():
    with pytest.raises(provider.SourceError, match='incomplete'):
        provider.choose_window(window_items()[1:6], date(2026, 11, 15))
    with pytest.raises(provider.SourceError, match='duplicate'):
        provider.choose_window(window_items() + [granule('2026-11-13')], date(2026, 11, 15))


@pytest.mark.parametrize('change', ['half-day', 'wrong-product', 'wrong-host', 'not-https'])
def test_discovery_rejects_unexpected_products_intervals_and_hosts(change):
    items = window_items()
    umm = items[-1]['umm']
    if change == 'half-day':
        umm['TemporalExtent']['RangeDateTime']['BeginningDateTime'] = '2026-11-13T12:00:00Z'
    elif change == 'wrong-product':
        umm['CollectionReference']['ShortName'] = 'GPM_3IMERGDF'
    elif change == 'wrong-host':
        umm['RelatedUrls'][0]['URL'] = 'https://example.com/raster'
    else:
        umm['RelatedUrls'][0]['URL'] = f'http://{provider.DATA_HOST}/raster'
    with pytest.raises(provider.SourceError):
        provider.choose_window(items, date(2026, 11, 15))


def test_requests_reject_external_hosts_and_token_redirects():
    with pytest.raises(provider.SourceError, match='unsupported'):
        provider.request_bytes('https://example.com/data', 'synthetic-secret')
    redirect = provider.NoRedirect()
    with pytest.raises(provider.SourceError, match='redirect'):
        redirect.redirect_request(None, None, 302, '', {}, 'https://example.com/login')


def test_dmr_dimension_order_and_dap_constraint():
    xml = b'<Dataset xmlns="http://xml.opendap.org/ns/DAP/4.0#"><Float32 name="precipitation"><Dim name="/time"/><Dim name="/lat"/><Dim name="/lon"/></Float32><Float64 name="lon"><Dim name="/lon"/></Float64><Float64 name="lat"><Dim name="/lat"/></Float64></Dataset>'
    with patch.object(provider, 'request_bytes', return_value=xml):
        assert provider.schema('https://opendap.earthdata.nasa.gov/test', 'test') == ['time', 'lat', 'lon']
    expression = transform.constraint(['time', 'lat', 'lon'], {'lat': (980, 982), 'lon': (940, 943)})
    assert '/precipitation[0:1:0][980:1:982][940:1:943]' in expression


def test_dmr_fails_closed_on_login_html():
    with patch.object(provider, 'request_bytes', return_value=b'<html>Login</html>'):
        with pytest.raises(provider.SourceError):
            provider.schema('https://opendap.earthdata.nasa.gov/test', 'test')


def test_netcdf_transposes_lon_lat_and_does_not_multiply_daily_by_24(nc_bytes):
    lon, lat = transform.read_coordinates(nc_bytes(), '2026-11-13')
    result = transform.read_precipitation(nc_bytes(), '2026-11-13', lon, lat)
    np.testing.assert_array_equal(result, [[1., 3.], [2., 4.]])


def test_netcdf_supports_lat_lon_order(nc_bytes):
    body = nc_bytes(dims=('time', 'lat', 'lon'))
    lon, lat = transform.read_coordinates(body, '2026-11-13')
    np.testing.assert_array_equal(transform.read_precipitation(body, '2026-11-13', lon, lat), [[1., 2.], [3., 4.]])


@pytest.mark.parametrize('units', ['mm/hr', 'kg m-2 s-1', 'unknown'])
def test_incompatible_units_are_not_guessed(nc_bytes, units):
    body = nc_bytes(units=units)
    lon, lat = transform.read_coordinates(body, '2026-11-13')
    with pytest.raises(ValueError, match='units'):
        transform.read_precipitation(body, '2026-11-13', lon, lat)


def test_netcdf_date_mismatch_and_irregular_grid(nc_bytes):
    with pytest.raises(ValueError, match='date'):
        transform.read_coordinates(nc_bytes(), '2026-11-12')
    with pytest.raises(ValueError, match='0.1'):
        transform.read_coordinates(nc_bytes(lon=[-85, -84]), '2026-11-13')


def test_fill_negative_and_nan_become_missing_but_zero_is_valid(nc_bytes):
    body = nc_bytes(values=[[[0., -9999.], [-1., float('nan')]]])
    lon, lat = transform.read_coordinates(body, '2026-11-13')
    result = transform.read_precipitation(body, '2026-11-13', lon, lat)
    assert result[0, 0] == 0
    assert np.count_nonzero(np.isnan(result)) == 3


def test_projected_weights_partition_subbasin_and_ignore_outside_grid():
    lon, lat = np.array([-85.05, -84.95]), np.array([10.75, 10.85])
    weights = transform.weights(lon, lat, [basin()])[0]
    assert sum(w for _, w in weights) == pytest.approx(1)
    assert len(weights) == 4
    with pytest.raises(ValueError, match='partition'):
        transform.weights(lon, lat, [basin(box(-86, 10.7, -84.9, 10.9))])


def test_grid_rounding_does_not_leave_holes_between_float32_cells():
    lon = np.array([-85.05, -84.95], dtype='f4')
    lat = np.array([10.75, 10.85], dtype='f4')
    weights = transform.weights(lon, lat, [basin(box(-85.09, 10.71, -84.91, 10.89))])[0]
    assert sum(w for _, w in weights) == pytest.approx(1)


def test_area_weighted_mean_and_seven_day_sum():
    arrays = [np.array([[2., 10.]])] * 7
    days = [g['date'] for g in provider.choose_window(window_items(), date(2026, 11, 15))]
    result = transform.aggregate(arrays, days, [basin()], [[(0, .75), (1, .25)]])[0]
    assert result['rain1d']['value'] == 4
    assert result['rain7d']['value'] == 28
    assert result['rain1d']['unit'] == 'mm'


def test_missing_earlier_day_does_not_hide_behind_valid_last_day():
    arrays = [np.array([[2., 10.]])] * 7
    arrays[0] = np.array([[np.nan, 10.]])
    days = [g['date'] for g in provider.choose_window(window_items(), date(2026, 11, 15))]
    result = transform.aggregate(arrays, days, [basin()], [[(0, .75), (1, .25)]])[0]
    assert result['rain1d']['value'] == 4
    assert result['rain7d']['value'] is None
    assert result['rain7d']['validAreaFraction'] == .25


def test_incomplete_or_unordered_week_is_rejected():
    with pytest.raises(ValueError, match='Seven'):
        transform.aggregate([], [], [], [])
    days = ['2026-11-13'] * 7
    with pytest.raises(ValueError, match='contiguous'):
        transform.aggregate([np.ones((1, 1))] * 7, days, [basin()], [[(0, 1)]])


def test_content_ids_and_geometry_version_are_deterministic(tmp_path):
    from shapely.geometry import mapping
    path = tmp_path / '1.geojson'
    payload = {'features': [{'geometry': mapping(box(-85, 10, -84, 11)),
                              'properties': {'nombre': 'Synthetic'}}]}
    path.write_text(json.dumps(payload))
    assert transform.load_subbasins(tmp_path)[0]['id'] == transform.load_subbasins(tmp_path)[0]['id']
    payload['features'] *= 2
    path.write_text(json.dumps(payload))
    with pytest.raises(ValueError, match='Duplicate'):
        transform.load_subbasins(tmp_path)


def test_publish_idempotent_and_preserves_newer_snapshot(tmp_path):
    bundle = {'schemaVersion': 'imerg-subbasins-v1', 'observedEnd': '2026-11-13',
              'inputFingerprint': 'synthetic'}
    assert publisher.publish_bundle(tmp_path, bundle) == 'published'
    before = (tmp_path / 'latest.json').read_bytes()
    assert publisher.publish_bundle(tmp_path, bundle) == 'unchanged'
    assert publisher.publish_bundle(tmp_path, bundle | {'observedEnd': '2026-11-12'}) == 'preserved-newer-snapshot'
    assert (tmp_path / 'latest.json').read_bytes() == before


def test_missing_token_never_calls_provider_or_overwrites_latest(tmp_path, monkeypatch):
    monkeypatch.delenv('EARTHDATA_TOKEN', raising=False)
    path = tmp_path / 'latest.json'
    path.write_text('{"synthetic":"previous"}')
    with patch.object(provider, 'discover') as discover:
        assert publisher.execute(date(2026, 11, 15), tmp_path, tmp_path) == 2
        discover.assert_not_called()
    assert path.read_text() == '{"synthetic":"previous"}'
    status = json.loads((tmp_path / 'status.json').read_text())
    assert status['status'] == 'blocked'
    assert status['lastValidAvailable'] is True


def test_processing_failure_preserves_last_valid_without_logging_secret(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv('EARTHDATA_TOKEN', 'synthetic-secret')
    path = tmp_path / 'latest.json'
    path.write_text('{"synthetic":"previous"}')
    with patch.object(provider, 'discover', return_value=[]), patch.object(
            publisher, 'build_bundle', side_effect=ValueError('synthetic-secret')):
        assert publisher.execute(date(2026, 11, 15), tmp_path, tmp_path) == 2
    assert 'synthetic-secret' not in capsys.readouterr().out
    assert path.read_text() == '{"synthetic":"previous"}'


def test_full_synthetic_download_decode_aggregate_publish_flow(tmp_path, nc_bytes, monkeypatch):
    from shapely.geometry import mapping
    geo_dir = tmp_path / 'geo'
    geo_dir.mkdir()
    (geo_dir / '1.geojson').write_text(json.dumps({'features': [
        {'geometry': mapping(box(-85.09, 10.71, -84.91, 10.89)),
         'properties': {'nombre': 'Synthetic', 'vertiente': 'Atlantica'}}]}))
    window = provider.choose_window(window_items(), date(2026, 11, 15))
    bodies = {entry['date']: nc_bytes(values=np.full((1, 2, 2), i + 1.), day=entry['date'])
              for i, entry in enumerate(window)}

    def download(url, token=None):
        day = urllib.parse.urlsplit(url).path.split('/')[-1][:10]
        return bodies[day]

    monkeypatch.setenv('EARTHDATA_TOKEN', 'synthetic-secret')
    with patch.object(provider, 'discover', return_value=window), patch.object(
            provider, 'schema', return_value=['time', 'lon', 'lat']), patch.object(
            provider, 'request_bytes', side_effect=download):
        assert publisher.execute(date(2026, 11, 15), tmp_path / 'out', geo_dir) == 0
        saved = json.loads((tmp_path / 'out/latest.json').read_text())
        assert saved['origin'] == 'estimated'
        assert saved['dataMode'] == 'real'  # Production origin label; fixture itself remains offline only.
        assert saved['subbasins'][0]['rain1d']['value'] == pytest.approx(7)
        assert saved['subbasins'][0]['rain7d']['value'] == pytest.approx(28)
        assert len(saved['granules']) == 7
        assert publisher.execute(date(2026, 11, 15), tmp_path / 'out', geo_dir) == 0
        status = json.loads((tmp_path / 'out/status.json').read_text())
        assert status['writeResult'] == 'unchanged'
        assert not list((tmp_path / 'out').glob('*.nc4'))
