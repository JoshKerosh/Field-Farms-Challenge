"""Publish real POWER point observations and global NOAA RONI without Earthdata."""

import argparse
import hashlib
import json
import urllib.error
import urllib.parse
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from field_farms_data.source_probe import (
    ROOT, POWER_URL, RONI_URL, atomic_json, fetch, locate_subbasin,
    parse_power, parse_roni, valid_number,
)

BASELINE_YEARS = range(1991, 2021)
METHOD = 'power-point-30d-calendar-reference-1991-2020-v1'


def daily_history(payload, end, count=90):
    """Preserve gaps explicitly; a missing day is never interpreted as no rain."""
    parameters = payload['properties']['parameter']
    rain, wetness = parameters['PRECTOTCORR'], parameters['GWETROOT']
    return [{'date': (end - timedelta(days=i)).isoformat(),
             'precipitationMm': rain.get((end - timedelta(days=i)).strftime('%Y%m%d'))
             if valid_number(rain.get((end - timedelta(days=i)).strftime('%Y%m%d')), 0) else None,
             'rootZoneWetness': wetness.get((end - timedelta(days=i)).strftime('%Y%m%d'))
             if valid_number(wetness.get((end - timedelta(days=i)).strftime('%Y%m%d')), 0, 1) else None}
            for i in reversed(range(count))]


def power_url(lon, lat, start, end, parameters):
    return POWER_URL + '?' + urllib.parse.urlencode({
        'parameters': parameters, 'community': 'AG', 'longitude': lon, 'latitude': lat,
        'start': start.strftime('%Y%m%d'), 'end': end.strftime('%Y%m%d'),
        'format': 'JSON', 'time-standard': 'UTC'})


def rainfall_anomaly(sample, historical):
    """Thirty complete comparable windows, no zero filling or implicit year exclusions."""
    end = date.fromisoformat(sample['observedEnd'])
    unavailable = {'value': None, 'unit': '%', 'status': 'unavailable',
                   'method': METHOD, 'referenceYears': [1991, 2020]}
    if (end.month, end.day) == (2, 29):
        return unavailable | {'reason': 'Leap-day comparison policy requires review'}
    if historical['parameters']['PRECTOTCORR']['units'] != 'mm/day' or historical['header'].get('time_standard') != 'UTC':
        raise ValueError('Incompatible POWER baseline units or time standard')
    values = historical['properties']['parameter']['PRECTOTCORR']
    totals = []
    for year in BASELINE_YEARS:
        reference_end = date(year, end.month, end.day)
        days = [(reference_end - timedelta(days=i)).strftime('%Y%m%d') for i in range(30)]
        if any(not valid_number(values.get(key), 0) for key in days):
            return unavailable | {'reason': 'At least one reference window is incomplete'}
        totals.append(sum(values[key] for key in days))
    reference = sum(totals) / len(totals)
    if reference <= 0:
        return unavailable | {'reason': 'Zero reference rainfall; percent anomaly undefined'}
    return {'value': (sample['precipitation30d']['value'] / reference - 1) * 100,
            'unit': '%', 'status': 'available', 'method': METHOD,
            'referenceYears': [1991, 2020], 'referenceMeanMm': reference,
            'referenceWindowCount': len(totals),
            'description': 'Mean of 30 complete 30-day windows ending on the same month/day in 1991–2020. '
                           'Derived POWER point reference, not an official IMN station normal.'}


def public_evidence(evidence):
    return {key: value for key, value in evidence.items() if key != 'rawFile'}


def get_power(lon, lat, as_of, cache):
    location = locate_subbasin(lon, lat)
    url = power_url(lon, lat, as_of - timedelta(days=120), as_of - timedelta(days=1), 'PRECTOTCORR,GWETROOT')
    body, evidence = fetch(url, cache / 'raw')
    payload = json.loads(body)
    sample = parse_power(payload, as_of)
    sample['dailyHistory'] = daily_history(payload, date.fromisoformat(sample['observedEnd']))
    # Reuse the baseline only if its request identity and raw content hash still match.
    baseline_url = power_url(lon, lat, date(1990, 1, 1), date(2020, 12, 31), 'PRECTOTCORR')
    cache_key = hashlib.sha256(baseline_url.encode()).hexdigest()
    baseline_path = cache / f'{cache_key}.json'
    baseline_ready = False
    if baseline_path.exists():
        cached = json.loads(baseline_path.read_text(encoding='utf-8'))
        raw_path = cache / cached['evidence']['rawFile']
        if (cached['evidence']['url'] != baseline_url
                or hashlib.sha256(raw_path.read_bytes()).hexdigest() != cached['evidence']['sha256']):
            raise ValueError('Baseline cache integrity check failed')
        history, baseline_evidence = json.loads(raw_path.read_bytes()), cached['evidence']
        baseline_ready = rainfall_anomaly(sample, history)['status'] == 'available'
    if not baseline_ready:
        raw, baseline_evidence = fetch(baseline_url, cache / 'raw')
        history = json.loads(raw)
        # Validate the content before accepting it as a reusable baseline cache.
        if rainfall_anomaly(sample, history)['status'] != 'available':
            raise ValueError('A complete comparable historical reference is required')
        atomic_json(baseline_path, {'evidence': baseline_evidence})
    sample['precipitationAnomaly30d'] = rainfall_anomaly(sample, history)
    sample.update({'location': location, 'evidence': public_evidence(evidence),
                   'baselineEvidence': public_evidence(baseline_evidence),
                   'retrievedAt': datetime.now(timezone.utc).isoformat()})
    return sample


def publish(out, kind, sample):
    fingerprint = hashlib.sha256(json.dumps({
        'source': sample['evidence']['sha256'], 'baseline': sample.get('baselineEvidence', {}).get('sha256'),
        'method': METHOD if kind == 'power' else 'NOAA-CPC-RONI-ERSSTv6',
        'location': sample.get('location'),
    }, sort_keys=True).encode()).hexdigest()
    document = {'schemaVersion': 'alert-source-v1', 'kind': kind, 'dataMode': 'real',
                'inputFingerprint': fingerprint, 'sample': sample}
    latest = out / 'latest.json'
    if latest.exists():
        previous = json.loads(latest.read_text(encoding='utf-8'))
        if previous['schemaVersion'] != 'alert-source-v1' or previous['kind'] != kind:
            raise ValueError('Incompatible source document')
        if previous['sample'].get('location') != sample.get('location'):
            raise ValueError('Different location: use a separate output directory')
        if previous['sample']['observedEnd'] > sample['observedEnd']:
            return 'preserved-newer', previous
        if previous.get('inputFingerprint') == fingerprint:
            return 'unchanged', previous
    atomic_json(out / f"{sample['observedEnd']}.json", document)
    atomic_json(latest, document)
    return 'published', document


def execute(as_of, out, cache, lon, lat, sources):
    failures = 0
    for kind in sources:
        target = out / kind
        status = {'schemaVersion': 'alert-source-status-v1', 'kind': kind,
                  'attemptedAt': datetime.now(timezone.utc).isoformat(),
                  'lastValidAvailable': (target / 'latest.json').exists()}
        try:
            if kind == 'power':
                sample = get_power(lon, lat, as_of, cache)
            else:
                raw, evidence = fetch(RONI_URL, cache / 'raw')
                sample = parse_roni(raw.decode('utf-8'), as_of)
                sample.update({'evidence': public_evidence(evidence),
                               'retrievedAt': datetime.now(timezone.utc).isoformat()})
            result, document = publish(target, kind, sample)
            status.update({'status': 'ok', 'writeResult': result, 'lastValidAvailable': True,
                           'observedEnd': document['sample']['observedEnd']})
        except (ValueError, KeyError, TypeError, OSError, urllib.error.URLError):
            failures += 1
            status.update({'status': 'failed', 'reason': 'source-or-validation-failed; previous snapshot preserved'})
        atomic_json(target / 'status.json', status)
        print(json.dumps(status, ensure_ascii=False))
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', type=date.fromisoformat,
                        default=datetime.now(timezone(timedelta(hours=-6))).date())
    parser.add_argument('--out', type=Path, default=ROOT / 'apps/web/public/data/alerts/climate')
    parser.add_argument('--cache', type=Path, default=ROOT / 'jobs/data-pipeline/data/climate')
    parser.add_argument('--lat', type=float, default=10.8)
    parser.add_argument('--lon', type=float, default=-85.08)
    parser.add_argument('--sources', nargs='+', choices=['power', 'roni'], default=['power', 'roni'])
    args = parser.parse_args()
    if not (-90 <= args.lat <= 90 and -180 <= args.lon <= 180):
        parser.error('Coordinates out of range')
    raise SystemExit(execute(args.as_of, args.out, args.cache, args.lon, args.lat, args.sources))


if __name__ == '__main__':
    main()
