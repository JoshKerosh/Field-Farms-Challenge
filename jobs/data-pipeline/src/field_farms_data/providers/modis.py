"""NASA MODIS MOD13Q1 (NDVI greenness, 16 days, 250 m) through the ORNL DAAC web service, no key.

https://modis.ornl.gov/data/modis_webservice.html
"""

from urllib.parse import urlencode

from field_farms_data.providers.http import get_json

BASE = 'https://modis.ornl.gov/rst/api/v1/MOD13Q1'
BAND = '250m_16_days_NDVI'
FILL = -3000
SCALE = 0.0001
# 1 km on each side: 9 × 9 pixels around the point; the valid ones are averaged.
KM = 1


def dates_url(lat: float, lon: float) -> str:
    return f'{BASE}/dates?{urlencode({"latitude": lat, "longitude": lon})}'


def subset_url(lat: float, lon: float, start: str, end: str) -> str:
    query = urlencode({'latitude': lat, 'longitude': lon, 'band': BAND, 'startDate': start,
                       'endDate': end, 'kmAboveBelow': KM, 'kmLeftRight': KM})
    return f'{BASE}/subset?{query}'


def mean_ndvi(pixels: list[int]) -> float | None:
    """Average of the valid pixels; water and clouds come as fill or negative values."""
    valid = [p * SCALE for p in pixels if p != FILL and p > 0]
    return round(sum(valid) / len(valid), 3) if valid else None


def list_dates(lat: float, lon: float) -> list[tuple[str, str]]:
    """Available dates as (A2026289, 2026-10-16), oldest to newest."""
    payload = get_json(dates_url(lat, lon))
    return [(d['modis_date'], d['calendar_date']) for d in payload['dates']]


def fetch_range(lat: float, lon: float, start: str, end: str) -> list[tuple[str, str, float | None]]:
    """The service accepts up to 10 dates per request."""
    payload = get_json(subset_url(lat, lon, start, end), timeout=120)
    return [(s['modis_date'], s['calendar_date'], mean_ndvi(s['data'])) for s in payload['subset']]
