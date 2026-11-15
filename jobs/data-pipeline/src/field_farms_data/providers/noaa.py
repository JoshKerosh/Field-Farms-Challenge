"""NOAA Climate Prediction Center: Relative Oceanic Niño Index (RONI), the official El Niño index.

Public text file: SEAS YR ANOM, one row per rolling three-month season.
"""

import calendar
from datetime import date

from field_farms_data.providers.http import get_text

RONI_URL = 'https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt'
# Last month of each rolling season (DJF ends in February).
SEASON_END = {'DJF': 2, 'JFM': 3, 'FMA': 4, 'MAM': 5, 'AMJ': 6, 'MJJ': 7,
              'JJA': 8, 'JAS': 9, 'ASO': 10, 'SON': 11, 'OND': 12, 'NDJ': 1}


def parse_roni(text: str) -> list[tuple[str, int, float]]:
    rows = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) == 3 and parts[0] in SEASON_END:
            rows.append((parts[0], int(parts[1]), float(parts[2])))
    if not rows:
        raise ValueError('el archivo RONI no trae filas')
    return rows


def season_end(season: str, year: int) -> date:
    """Last day of the season. NDJ of 2026 ends in January 2027."""
    month = SEASON_END[season]
    year = year + 1 if season == 'NDJ' else year
    return date(year, month, calendar.monthrange(year, month)[1])


def fetch() -> list[tuple[str, int, float]]:
    return parse_roni(get_text(RONI_URL))
