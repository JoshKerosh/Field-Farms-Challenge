import json
from datetime import date, timedelta

import pytest

from field_farms_data.providers import modis, noaa, power
from field_farms_data.providers.zonas import ZONAS
from field_farms_data.publish import archivos
from field_farms_data.transforms import indicadores as ind

ZONA = ZONAS[0]
CLIM = {'PRECTOTCORR': [5.0] * 12, 'GWETROOT': [0.7] * 12}


def filas(dias: int, lluvia: float = 10.0, fin: date = date(2026, 11, 11)):
    return [(fin - timedelta(days=dias - 1 - i), {'PRECTOTCORR': lluvia, 'T2M_MAX': 30.0, 'GWETROOT': 0.8})
            for i in range(dias)]


def valores(item):
    return {i['id']: i['valor'] for i in item['indicadores']}


def test_parse_daily_drops_fill_days():
    payload = {'properties': {'parameter': {
        'PRECTOTCORR': {'20261110': 3.4, '20261111': -999.0},
        'T2M_MAX': {'20261110': 29.9, '20261111': -999.0},
        'GWETROOT': {'20261110': 0.85, '20261111': -999.0}}}}
    rows = power.parse_daily(payload)
    assert rows == [(date(2026, 11, 10), {'PRECTOTCORR': 3.4, 'T2M_MAX': 29.9, 'GWETROOT': 0.85})]


def test_power_zona_computes_30_day_anomaly():
    item = ind.power_zona(ZONA, filas(40), CLIM)
    v = valores(item)
    assert v['lluvia_30d'] == 300.0
    assert v['lluvia_30d_normal'] == 150.0
    assert v['lluvia_30d_anomalia'] == 100
    assert v['lluvia_7d'] == 70.0
    assert v['humedad_raiz_30d_anomalia'] == 0.1
    assert item['indicadores'][0]['fecha'] == '2026-11-11'
    assert all(i['estado'] == 'sin_evaluar' and not i['simulado'] for i in item['indicadores'])


def test_power_zona_without_full_window_publishes_sin_dato():
    v = {i['id']: i for i in ind.power_zona(ZONA, filas(20), CLIM)['indicadores']}
    assert v['lluvia_30d']['valor'] is None
    assert v['lluvia_30d']['estado'] == 'sin_dato'
    assert v['lluvia_7d']['valor'] == 70.0


def test_power_zona_skips_percent_when_normal_is_tiny():
    dry = {'PRECTOTCORR': [0.1] * 12, 'GWETROOT': [0.7] * 12}
    assert valores(ind.power_zona(ZONA, filas(30), dry))['lluvia_30d_anomalia'] is None


def test_parse_roni_and_season_end():
    rows = noaa.parse_roni('SEAS   YR  ANOM\nJAS  2026  1.69\nASO  2026  1.97\n')
    assert rows[-1] == ('ASO', 2026, 1.97)
    assert noaa.season_end('ASO', 2026) == date(2026, 10, 31)
    assert noaa.season_end('NDJ', 2026) == date(2027, 1, 31)
    v = valores(ind.roni_item(rows))
    assert v == {'roni': 1.97, 'roni_fase': 1}
    with pytest.raises(ValueError):
        noaa.parse_roni('sin datos')


def test_modis_mean_ignores_fill_and_water():
    assert modis.mean_ndvi([5000, 7000, -3000, -500]) == 0.6
    assert modis.mean_ndvi([-3000]) is None


def test_modis_zona_needs_five_years_for_normal():
    recientes = [('A2026273', '2026-09-30', 0.55), ('A2026289', '2026-10-16', 0.62)]
    v = valores(ind.modis_zona(ZONA, recientes, [0.6] * 6))
    assert v == {'verdor': 0.62, 'verdor_normal': 0.6, 'verdor_anomalia': 0.02}
    assert valores(ind.modis_zona(ZONA, recientes, [0.6] * 3))['verdor_anomalia'] is None


def test_actualizar_fuente_keeps_last_good_date_on_failure(tmp_path):
    (tmp_path / 'fuentes.json').write_text(json.dumps({'actualizado': '', 'fuentes': [
        {'id': 'nasa-power', 'estado': 'falla', 'ultima_carga_buena': None}]}), encoding='utf-8')
    archivos.actualizar_fuente(tmp_path, 'nasa-power', fecha_dato=date(2026, 11, 11))
    archivos.actualizar_fuente(tmp_path, 'nasa-power', error='HTTPError: 503')
    fuente = json.loads((tmp_path / 'fuentes.json').read_text(encoding='utf-8'))['fuentes'][0]
    assert fuente['estado'] == 'falla'
    assert fuente['ultima_carga_buena'] == '2026-11-11'
    assert fuente['ultimo_error'] == 'HTTPError: 503'
