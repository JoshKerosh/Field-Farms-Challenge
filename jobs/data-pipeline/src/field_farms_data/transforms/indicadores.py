"""Cálculo de indicadores con el contrato compartido (packages/domain/src/data).

Las funciones son puras: reciben lo ya descargado y devuelven diccionarios listos para JSON.
Los conectores no aplican umbrales: el estado queda `sin_evaluar` (o `sin_dato` si falta el valor).
"""

from datetime import date, timedelta

from field_farms_data.providers.noaa import season_end
from field_farms_data.providers.zonas import Zona

# Ventana mínima de días con dato para publicar un acumulado de 30 días.
DIAS_VENTANA = 30


def indicador(id_: str, nombre: str, valor: float | None, unidad: str, fuente: str, fecha: date,
              capa: str = 'nasa', simulado: bool = False) -> dict:
    return {'id': id_, 'nombre': nombre, 'valor': valor, 'unidad': unidad,
            'estado': 'sin_dato' if valor is None else 'sin_evaluar', 'fuente': fuente,
            'fecha': fecha.isoformat(), 'simulado': simulado, 'capa': capa}


def _ventana(rows, param: str, fin: date, dias: int) -> list[tuple[date, float]]:
    inicio = fin - timedelta(days=dias - 1)
    return [(d, v[param]) for d, v in rows if inicio <= d <= fin and v[param] is not None]


def ultima_fecha(rows, param: str) -> date | None:
    fechas = [d for d, v in rows if v[param] is not None]
    return max(fechas) if fechas else None


def power_zona(zona: Zona, rows, clim: dict[str, list[float]], fuente: str = 'nasa-power') -> dict:
    """Indicadores de 30 días (y lluvia de 7 días) con su anomalía frente a 1991–2020."""
    fin = ultima_fecha(rows, 'PRECTOTCORR')
    if fin is None:
        raise ValueError(f'{zona.id}: POWER no trae lluvia en el periodo')

    lluvia = _ventana(rows, 'PRECTOTCORR', fin, DIAS_VENTANA)
    completa = len(lluvia) == DIAS_VENTANA
    lluvia_30 = round(sum(v for _, v in lluvia), 1) if completa else None
    normal_30 = sum(clim['PRECTOTCORR'][d.month - 1] for d, _ in lluvia) if completa else 0
    # Con menos de 10 mm normales (pleno verano) el porcentaje no dice nada.
    anom = round((lluvia_30 / normal_30 - 1) * 100) if lluvia_30 is not None and normal_30 >= 10 else None

    lluvia_7 = _ventana(rows, 'PRECTOTCORR', fin, 7)
    tmax = _ventana(rows, 'T2M_MAX', fin, DIAS_VENTANA)
    hum = _ventana(rows, 'GWETROOT', fin, DIAS_VENTANA)
    hum_30 = round(sum(v for _, v in hum) / len(hum), 2) if len(hum) == DIAS_VENTANA else None
    hum_normal = (sum(clim['GWETROOT'][d.month - 1] for d, _ in hum) / len(hum)) if hum else None

    inds = [
        indicador('lluvia_30d', 'Lluvia de los últimos 30 días', lluvia_30, 'mm', fuente, fin),
        indicador('lluvia_30d_normal', 'Lluvia normal para esos 30 días (1991–2020)',
                  round(normal_30, 1) if completa else None, 'mm', fuente, fin),
        indicador('lluvia_30d_anomalia', 'Lluvia frente a lo normal (30 días)', anom, '%', fuente, fin),
        indicador('lluvia_7d', 'Lluvia de los últimos 7 días',
                  round(sum(v for _, v in lluvia_7), 1) if len(lluvia_7) == 7 else None, 'mm', fuente, fin),
        indicador('tmax_30d', 'Temperatura máxima promedio (30 días)',
                  round(sum(v for _, v in tmax) / len(tmax), 1) if len(tmax) == DIAS_VENTANA else None,
                  '°C', fuente, fin),
        indicador('humedad_raiz_30d', 'Humedad del suelo en raíces (30 días, 0 seco a 1 saturado)',
                  hum_30, '0-1', fuente, fin),
        indicador('humedad_raiz_30d_anomalia', 'Humedad del suelo frente a lo normal (30 días)',
                  round(hum_30 - hum_normal, 2) if hum_30 is not None and hum_normal else None,
                  '0-1', fuente, fin),
    ]
    inicio_serie = fin - timedelta(days=89)
    serie = [{'fecha': d.isoformat(), 'valores': {'lluvia': v['PRECTOTCORR'], 'tmax': v['T2M_MAX'],
                                                  'humedad_raiz': v['GWETROOT']}}
             for d, v in rows if inicio_serie <= d <= fin]
    return {'id': zona.id, 'nombre': zona.nombre, 'lat': zona.lat, 'lon': zona.lon,
            'indicadores': inds, 'serie': serie}


def roni_item(rows: list[tuple[str, int, float]], fuente: str = 'noaa-roni') -> dict:
    season, year, value = rows[-1]
    fin = season_end(season, year)
    inds = [
        indicador('roni', f'Índice RONI de El Niño ({season} {year})', value, '°C', fuente, fin),
        # Umbral oficial de NOAA: El Niño con RONI ≥ +0,5 y La Niña con RONI ≤ −0,5.
        indicador('roni_fase', 'Fase ENOS según NOAA (1 El Niño, 0 neutral, −1 La Niña)',
                  1 if value >= 0.5 else -1 if value <= -0.5 else 0, 'fase', fuente, fin),
    ]
    serie = [{'fecha': season_end(s, y).isoformat(), 'valores': {'roni': v}} for s, y, v in rows[-24:]]
    return {'id': 'nino34', 'nombre': 'Pacífico ecuatorial, región Niño 3.4', 'indicadores': inds,
            'serie': serie}


def modis_zona(zona: Zona, recientes: list[tuple[str, str, float | None]],
               historicos: list[float | None], fuente: str = 'nasa-modis') -> dict:
    """Verdor de la imagen más reciente con dato frente al promedio de la misma fecha en años previos."""
    con_dato = [r for r in recientes if r[2] is not None]
    if not con_dato:
        raise ValueError(f'{zona.id}: MODIS sin imágenes válidas recientes')
    _, fecha_txt, ndvi = con_dato[-1]
    fecha = date.fromisoformat(fecha_txt)
    validos = [h for h in historicos if h is not None]
    # Con menos de 5 años el promedio no es una referencia confiable.
    normal = round(sum(validos) / len(validos), 3) if len(validos) >= 5 else None
    inds = [
        indicador('verdor', 'Verdor de la vegetación (NDVI, 0 a 1)', ndvi, 'NDVI', fuente, fecha),
        indicador('verdor_normal', f'Verdor promedio de esa fecha ({len(validos)} años previos)',
                  normal, 'NDVI', fuente, fecha),
        indicador('verdor_anomalia', 'Verdor frente al promedio', round(ndvi - normal, 3)
                  if normal is not None else None, 'NDVI', fuente, fecha),
    ]
    serie = [{'fecha': c, 'valores': {'verdor': v}} for _, c, v in recientes]
    return {'id': zona.id, 'nombre': zona.nombre, 'lat': zona.lat, 'lon': zona.lon,
            'indicadores': inds, 'serie': serie}
