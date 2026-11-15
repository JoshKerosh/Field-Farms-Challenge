"""NASA POWER (Langley Research Center): lluvia, temperatura máxima y humedad del suelo diarias.

API pública sin clave: https://power.larc.nasa.gov/docs/services/api/
"""

from datetime import date, timedelta
from urllib.parse import urlencode

from field_farms_data.providers.http import get_json

BASE = 'https://power.larc.nasa.gov/api/temporal'
PARAMS = ('PRECTOTCORR', 'T2M_MAX', 'GWETROOT')
FILL = -999.0
MONTHS = ('JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC')


def daily_url(lat: float, lon: float, start: date, end: date) -> str:
    query = urlencode({'parameters': ','.join(PARAMS), 'community': 'AG', 'latitude': lat,
                       'longitude': lon, 'start': start.strftime('%Y%m%d'),
                       'end': end.strftime('%Y%m%d'), 'format': 'JSON'})
    return f'{BASE}/daily/point?{query}'


def climatology_url(lat: float, lon: float) -> str:
    query = urlencode({'parameters': 'PRECTOTCORR,GWETROOT', 'community': 'AG', 'latitude': lat,
                       'longitude': lon, 'start': 1991, 'end': 2020, 'format': 'JSON'})
    return f'{BASE}/climatology/point?{query}'


def parse_daily(payload: dict) -> list[tuple[date, dict[str, float | None]]]:
    """Filas por día en orden. Los días sin ningún dato (relleno -999 de POWER) se descartan."""
    params = payload['properties']['parameter']
    days = sorted(params[PARAMS[0]])
    rows = []
    for key in days:
        values = {p: (None if params[p][key] == FILL else params[p][key]) for p in PARAMS}
        if all(v is None for v in values.values()):
            continue
        rows.append((date(int(key[:4]), int(key[4:6]), int(key[6:])), values))
    return rows


def parse_climatology(payload: dict) -> dict[str, list[float]]:
    """Promedio 1991–2020 por mes (índice 0 = enero) para cada parámetro."""
    params = payload['properties']['parameter']
    return {p: [params[p][m] for m in MONTHS] for p in params}


def fetch(lat: float, lon: float, today: date, days: int = 120):
    start = today - timedelta(days=days)
    daily = parse_daily(get_json(daily_url(lat, lon, start, today)))
    clim = parse_climatology(get_json(climatology_url(lat, lon)))
    return daily, clim
