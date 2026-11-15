"""Offline tests; fixtures are synthetic and never published as provider observations."""

import json
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from field_farms_data import source_probe as probe  # noqa: E402


def power_fixture():
    days = [(date(2026, 10, 12) + timedelta(days=i)).strftime('%Y%m%d') for i in range(30)]
    return {'header': {'time_standard': 'UTC'},
            'parameters': {'PRECTOTCORR': {'units': 'mm/day'}, 'GWETROOT': {'units': '1'}},
            'properties': {'parameter': {'PRECTOTCORR': dict.fromkeys(days, 2.0),
                                         'GWETROOT': dict.fromkeys(days, 0.5)}}}


def roni_fixture(cells, year=2026):
    return ('Relative Oceanic Niño Index ERSSTv6 '
            '<table><tr><th>2026</th><td>99</td></tr></table>'
            f'<table><tr id="latest-data"><th><p>{year}</p></th>'
            + ''.join(f'<td><span>{value}</span></td>' for value in cells) + '</tr></table>')


class SourceProbeTests(unittest.TestCase):
    def test_complete_window_and_units(self):
        sample = probe.parse_power(power_fixture(), date(2026, 11, 15))
        self.assertEqual(sample['precipitation30d']['value'], 60)
        self.assertEqual(sample['rootZoneWetness30d']['value'], 0.5)
        self.assertEqual(sample['observedStart'], '2026-10-12')
        self.assertEqual(sample['observedEnd'], '2026-11-10')
        self.assertEqual(sample['lagDays'], 5)
        self.assertIsNone(sample['precipitationAnomaly30d']['value'])

    def test_zero_rain_is_valid(self):
        data = power_fixture()
        data['properties']['parameter']['PRECTOTCORR']['20261110'] = 0
        self.assertEqual(probe.parse_power(data, date(2026, 11, 15))['precipitation30d']['value'], 58)

    def test_invalid_or_missing_measurement_rejects_window(self):
        for value in (-999, None, float('nan'), True):
            with self.subTest(value=value), self.assertRaises(ValueError):
                data = power_fixture()
                data['properties']['parameter']['PRECTOTCORR']['20261020'] = value
                probe.parse_power(data, date(2026, 11, 15))

    def test_incompatible_units_and_time_standard(self):
        for parameter, unit in [('GWETROOT', 'm3/m3'), ('PRECTOTCORR', 'mm/hr')]:
            data = power_fixture()
            data['parameters'][parameter]['units'] = unit
            with self.assertRaises(ValueError):
                probe.parse_power(data, date(2026, 11, 15))
        data = power_fixture()
        data['header']['time_standard'] = 'LST'
        with self.assertRaises(ValueError):
            probe.parse_power(data, date(2026, 11, 15))

    def test_future_values_are_not_selected(self):
        data = power_fixture()
        for values in data['properties']['parameter'].values():
            values['20261116'] = 0.5
        self.assertEqual(probe.parse_power(data, date(2026, 11, 15))['observedEnd'], '2026-11-10')

    def test_roni_selects_latest_row_and_completed_season(self):
        sample = probe.parse_roni(roni_fixture([0] * 8 + [2.0]), date(2026, 11, 15))
        self.assertEqual(sample['value'], 2)
        self.assertEqual(sample['season'], 'ASO')
        self.assertEqual(sample['observedStart'], '2026-08-01')
        self.assertEqual(sample['observedEnd'], '2026-10-31')
        self.assertEqual(sample['index'], 'RONI')

    def test_roni_year_boundaries_and_missing_cells(self):
        sample = probe.parse_roni(roni_fixture([0.5]), date(2026, 3, 1))
        self.assertEqual(sample['observedStart'], '2025-12-01')
        self.assertEqual(sample['observedEnd'], '2026-02-28')
        sample = probe.parse_roni(roni_fixture([0] * 11 + [0.7]), date(2027, 2, 1))
        self.assertEqual(sample['observedStart'], '2026-11-01')
        self.assertEqual(sample['observedEnd'], '2027-01-31')
        sample = probe.parse_roni(roni_fixture([0.5, 'NA', '---']), date(2026, 5, 1))
        self.assertEqual(sample['season'], 'DJF')

    def test_roni_rejects_oni_layout_changes_and_nonfinite(self):
        for html in ['ONI table', roni_fixture(['nan']),
                     roni_fixture([0]) + roni_fixture([1]), roni_fixture([0] * 13)]:
            with self.subTest(html=html), self.assertRaises(ValueError):
                probe.parse_roni(html, date(2026, 11, 15))

    def test_location_excludes_holes_and_resolves_real_layer(self):
        ring = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]
        self.assertTrue(probe.ring_contains(ring, 1, 1))
        self.assertFalse(probe.ring_contains(ring, 3, 3))
        location = probe.locate_subbasin(-85.08, 10.8)
        self.assertIn('nombre', location['subbasin']['properties'])
        with self.assertRaises(ValueError):
            probe.locate_subbasin(0, 0)

    def test_atomic_write_rejects_nonfinite_without_truncation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'latest.json'
            probe.atomic_json(path, {'value': 1})
            before = path.read_bytes()
            with self.assertRaises(ValueError):
                probe.atomic_json(path, {'value': float('nan')})
            self.assertEqual(path.read_bytes(), before)

    def test_older_observation_cannot_replace_newer_sample(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'latest.json'
            probe.preserve_latest(path, {'observedEnd': '2026-11-10', 'value': 2})
            result = probe.preserve_latest(path, {'observedEnd': '2026-11-09', 'value': 1})
            self.assertEqual(result, 'preserved-newer-local-sample')
            self.assertEqual(json.loads(path.read_text())['value'], 2)

    def test_different_location_cannot_replace_existing_sample(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'latest.json'
            probe.preserve_latest(path, {'observedEnd': '2026-11-10', 'location': {'latitude': 10.8}})
            before = path.read_bytes()
            with self.assertRaises(ValueError):
                probe.preserve_latest(path, {'observedEnd': '2026-11-11', 'location': {'latitude': 9.8}})
            self.assertEqual(path.read_bytes(), before)

    def test_cne_empty_sample_is_not_absence_of_risk(self):
        capabilities = b'<WFS_Capabilities><Name>cne:inundaciones</Name></WFS_Capabilities>'
        body = b'{"type":"FeatureCollection","features":[]}'
        with patch.object(probe, 'fetch', side_effect=[(capabilities, {}), (body, {})]):
            result = probe.check_cne(Path('.'), -85.08, 10.8)
        self.assertEqual(result['geometrySamples'][0]['featureCount'], 0)
        self.assertIn('does not establish absence', result['limitation'])

    def test_cne_records_geometry_failure_separately_from_capabilities(self):
        capabilities = b'<WFS_Capabilities><Name>cne:inundaciones</Name></WFS_Capabilities>'
        with patch.object(probe, 'fetch', side_effect=[(capabilities, {}), TimeoutError('timeout')]):
            result = probe.check_cne(Path('.'), -85.08, 10.8)
        self.assertEqual(result['geometrySamples'][0]['status'], 'failed')

    def test_network_failure_keeps_last_valid_and_records_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            from argparse import Namespace
            out = Path(directory)
            path = out / 'power/latest.json'
            probe.atomic_json(path, {'observedEnd': '2026-11-10', 'value': 2})
            before = path.read_bytes()
            args = Namespace(out=out, as_of=date(2026, 11, 15), lon=-85.08, lat=10.8,
                             sources=['power'])
            with patch.object(probe, 'fetch', side_effect=TimeoutError('timeout')):
                self.assertEqual(probe.run(args), 1)
            self.assertEqual(path.read_bytes(), before)
            report = json.loads((out / 'report.json').read_text())
            self.assertEqual(report['checks']['power']['status'], 'failed')


if __name__ == '__main__':
    unittest.main()
