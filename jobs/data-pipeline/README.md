# Proceso de datos ambientales

Proyecto Python independiente de los workspaces de npm.

Los [conectores POWER, RONI y cruces CNE](CLIMATE.md) ya publican JSON que consume
Alertas, sin Earthdata. Incluyen referencia histórica explícita para anomalías,
validación, fechas separadas de descarga/observación y conservación ante fallos.

## Comprobar fuentes de alertas

La [comprobación de fuentes](SOURCE_CHECK.md) descarga muestras pequeñas de POWER
y RONI y consulta los catálogos NASA y el WFS de la CNE. Usa solo la biblioteca
estándar de Python; guarda resultados locales en `data/source-check/`, sin publicar
indicadores ni descargar rásteres. Incluye resultados verificados, límites y pruebas.

El [conector IMERG](IMERG.md) prepara acumulados reales de 1 y 7 días por subcuenca
mediante OPeNDAP, con pruebas NetCDF y conservación del último resumen válido.
La descarga autenticada requiere `EARTHDATA_TOKEN` y autorización GES DISC;
por defecto los resultados se guardan localmente para revisión.

## Capas de cuencas y agua

`python -m field_farms_data.publish.basins --datasets <carpeta>` lee `cuencas_hidrograficas.shp`, `Subcuencas_CRTM05.zip` y `Operadores y Fuentes (Ubicaciones).xlsx` (SAGA, AyA) y escribe en `apps/web/public/data/geo/`:

| Archivo                  | Contenido                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `cuencas.geojson`        | 34 cuencas simplificadas a 10 m; cuencas vecinas con colores distintos.                  |
| `subcuencas/<n>.geojson` | Subcuencas de la cuenca `n`, simplificadas a 5 m; `0` agrupa islas y franjas costeras.   |
| `fuentes/<n>.geojson`    | Fuentes del SAGA por cuenca; el tipo (naciente, pozo, superficial) se deduce del nombre. |
| `asadas.geojson`         | Operadores con su cuenca, servicios y cantidad de fuentes.                               |

Las coordenadas se convierten de CRTM05 a WGS84 con la proyección de cada archivo. Se descartan 69 fuentes y 1 operador sin coordenadas. El SAGA no indica la unidad del caudal. Pruebas: `pytest`.

Cada subcuenca lleva un `id` estable `"<cuenca>-<orden>"`: es la llave de los archivos de indicadores por subcuenca.

## NASA, NOAA, capas locales y ejemplos

Formato, contrato y verificación en [docs/datos.md](../../docs/datos.md).

| Comando                                                      | Escribe en `apps/web/public/data/`                                                                                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `python -m field_farms_data.publish.nasa`                    | `nasa/power/latest.json`, `noaa/roni/latest.json`, `nasa/modis/latest.json` y el estado en `fuentes.json`. Lo corre a diario `.github/workflows/datos-nasa.yml`. |
| `python -m field_farms_data.publish.climate`                 | `alerts/climate/power/*` y `alerts/climate/roni/*`; observaciones de alertas con formato propio, sin reemplazar los indicadores anteriores.                      |
| `python -m field_farms_data.publish.local --ffc <FFC_datos>` | `geo/cne/*`, `geo/sinac/areas_protegidas.geojson`, `local/orillas_verdor_1.5km.json`                                                                             |
| `python -m field_farms_data.publish.ejemplos`                | `ejemplos/*.json`, simulados, para trabajar sin esperar a otro conector                                                                                          |

Las descargas usan solo la biblioteca estándar (`providers/http.py`), sin claves. Si una fuente falla, su archivo anterior no se toca y `fuentes.json` la marca `falla`.

- `providers/`: acceso a NASA, NOAA y fuentes locales, con credenciales fuera del repositorio.
- `transforms/`: normalización y cálculos mediante GeoPandas/Rasterio cuando se incorpore la ingesta.
- `publish/`: indicadores y capas preparados para web/móvil, con fuente, fecha, unidades y versión de metodología.

La vinculación hidrológica y las recomendaciones técnicas requieren validación independiente de la proximidad de los puntos. Los rasters y datos descargados no se guardan en Git; `data/` está ignorado. Se agregarán pruebas de transformaciones junto con el primer proceso funcional.
