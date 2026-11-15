"""NASA MODIS MOD13Q1 (verdor NDVI, 16 días, 250 m) con el servicio web de ORNL DAAC, sin clave.

https://modis.ornl.gov/data/modis_webservice.html
"""

from urllib.parse import urlencode

from field_farms_data.providers.http import get_json

BASE = 'https://modis.ornl.gov/rst/api/v1/MOD13Q1'
BAND = '250m_16_days_NDVI'
FILL = -3000
SCALE = 0.0001
# 1 km a cada lado: 9 × 9 píxeles alrededor del punto; se promedian los válidos.
KM = 1


def dates_url(lat: float, lon: float) -> str:
    return f'{BASE}/dates?{urlencode({"latitude": lat, "longitude": lon})}'


def subset_url(lat: float, lon: float, start: str, end: str) -> str:
    query = urlencode({'latitude': lat, 'longitude': lon, 'band': BAND, 'startDate': start,
                       'endDate': end, 'kmAboveBelow': KM, 'kmLeftRight': KM})
    return f'{BASE}/subset?{query}'


def mean_ndvi(pixels: list[int]) -> float | None:
    """Promedio de los píxeles válidos; agua y nubes quedan como relleno o valores negativos."""
    valid = [p * SCALE for p in pixels if p != FILL and p > 0]
    return round(sum(valid) / len(valid), 3) if valid else None


def list_dates(lat: float, lon: float) -> list[tuple[str, str]]:
    """Fechas disponibles como (A2026289, 2026-10-16), de la más antigua a la más reciente."""
    payload = get_json(dates_url(lat, lon))
    return [(d['modis_date'], d['calendar_date']) for d in payload['dates']]


def fetch_range(lat: float, lon: float, start: str, end: str) -> list[tuple[str, str, float | None]]:
    """El servicio admite hasta 10 fechas por consulta."""
    payload = get_json(subset_url(lat, lon, start, end), timeout=120)
    return [(s['modis_date'], s['calendar_date'], mean_ndvi(s['data'])) for s in payload['subset']]
