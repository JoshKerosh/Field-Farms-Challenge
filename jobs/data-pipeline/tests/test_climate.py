"""All numeric data in these fixtures are synthetic; no network or account required."""

import json
from datetime import date, timedelta
from unittest.mock import patch

from field_farms_data.publish import climate


def history(end=date(2026, 11, 13)):
    values = {}
    for year in climate.BASELINE_YEARS:
        reference = date(year, end.month, end.day)
        for offset in range(30):
            values[(reference - timedelta(days=offset)).strftime('%Y%m%d')] = 2.
    return {'header': {'time_standard': 'UTC'}, 'parameters': {'PRECTOTCORR': {'units': 'mm/day'}},
            'properties': {'parameter': {'PRECTOTCORR': values}}}


def sample():
    return {'source': 'NASA POWER', 'observedEnd': '2026-11-13', 'precipitation30d': {'value': 90},
            'location': {'longitude': -85.08, 'latitude': 10.8}, 'evidence': {'sha256': 'synthetic'}}


def test_thirty_complete_windows_produce_explicit_percent_anomaly():
    result = climate.rainfall_anomaly(sample(), history())
    assert result['value'] == 50
    assert result['referenceMeanMm'] == 60
    assert result['referenceWindowCount'] == 30


def test_missing_reference_day_and_zero_mean_do_not_become_zero_anomaly():
    missing = history()
    del missing['properties']['parameter']['PRECTOTCORR']['19911113']
    assert climate.rainfall_anomaly(sample(), missing)['value'] is None
    zeros = history()
    zeros['properties']['parameter']['PRECTOTCORR'] = dict.fromkeys(zeros['properties']['parameter']['PRECTOTCORR'], 0)
    assert climate.rainfall_anomaly(sample(), zeros)['value'] is None


def test_reference_windows_cross_years_without_using_wrong_calendar_dates():
    current = sample() | {'observedEnd': '2026-01-07'}
    assert climate.rainfall_anomaly(current, history(date(2026, 1, 7)))['referenceMeanMm'] == 60
    assert climate.rainfall_anomaly(current | {'observedEnd': '2024-02-29'}, {})['status'] == 'unavailable'


def test_publication_is_idempotent_and_cannot_replace_newer_data_or_another_point(tmp_path):
    import pytest
    result, _ = climate.publish(tmp_path, 'power', sample())
    assert result == 'published'
    assert climate.publish(tmp_path, 'power', sample())[0] == 'unchanged'
    assert climate.publish(tmp_path, 'power', sample() | {'observedEnd': '2026-11-12'})[0] == 'preserved-newer'
    with pytest.raises(ValueError):
        climate.publish(tmp_path, 'power', sample() | {'location': {'longitude': -84, 'latitude': 10}})


def test_provider_failure_preserves_latest_and_updates_failure_status(tmp_path):
    climate.publish(tmp_path / 'power', 'power', sample())
    before = (tmp_path / 'power/latest.json').read_bytes()
    with patch.object(climate, 'get_power', side_effect=TimeoutError('fixture timeout')):
        assert climate.execute(date(2026, 11, 15), tmp_path, tmp_path, -85.08, 10.8, ['power']) == 1
    assert (tmp_path / 'power/latest.json').read_bytes() == before
    assert json.loads((tmp_path / 'power/status.json').read_text())['status'] == 'failed'


def test_incomplete_baseline_is_not_cached_or_published_as_a_success(tmp_path):
    import pytest
    bad_history = history()
    del bad_history['properties']['parameter']['PRECTOTCORR']['19911113']
    with patch.object(climate, 'locate_subbasin', return_value={}), patch.object(climate, 'parse_power', return_value=sample()), \
         patch.object(climate, 'daily_history', return_value=[]), \
         patch.object(climate, 'fetch', side_effect=[(b'{}', {'sha256': 'current'}),
                                                    (json.dumps(bad_history).encode(), {'sha256': 'baseline'})]):
        with pytest.raises(ValueError, match='historical reference'):
            climate.get_power(-85.08, 10.8, date(2026, 11, 15), tmp_path)
    assert not list(tmp_path.glob('*.json'))


def test_history_preserves_zero_rain_and_missing_values_in_order():
    payload = {'properties': {'parameter': {'PRECTOTCORR': {'20261113': 0, '20261112': -999},
                                             'GWETROOT': {'20261113': .8, '20261112': 2}}}}
    result = climate.daily_history(payload, date(2026, 11, 13), 3)
    assert [d['date'] for d in result] == ['2026-11-11', '2026-11-12', '2026-11-13']
    assert result[-1]['precipitationMm'] == 0
    assert result[-2]['precipitationMm'] is None
    assert result[-2]['rootZoneWetness'] is None
