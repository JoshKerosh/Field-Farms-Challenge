# Proceso de datos ambientales

Proyecto Python independiente de los workspaces de npm.

## Capas de cuencas y agua

`python -m field_farms_data.publish.basins --datasets <carpeta>` lee `cuencas_hidrograficas.shp`, `Subcuencas_CRTM05.zip` y `Operadores y Fuentes (Ubicaciones).xlsx` (SAGA, AyA) y escribe en `apps/web/public/data/geo/`:

| Archivo                  | Contenido                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `cuencas.geojson`        | 34 cuencas simplificadas a 10 m; cuencas vecinas con colores distintos.                  |
| `subcuencas/<n>.geojson` | Subcuencas de la cuenca `n`, simplificadas a 5 m; `0` agrupa islas y franjas costeras.   |
| `fuentes/<n>.geojson`    | Fuentes del SAGA por cuenca; el tipo (naciente, pozo, superficial) se deduce del nombre. |
| `asadas.geojson`         | Operadores con su cuenca, servicios y cantidad de fuentes.                               |

Las coordenadas se convierten de CRTM05 a WGS84 con la proyección de cada archivo. Se descartan 69 fuentes y 1 operador sin coordenadas. El SAGA no indica la unidad del caudal. Pruebas: `pytest`.

- `providers/`: acceso a NASA, NOAA y fuentes locales, con credenciales fuera del repositorio.
- `transforms/`: normalización y cálculos mediante GeoPandas/Rasterio cuando se incorpore la ingesta.
- `publish/`: indicadores y capas preparados para web/móvil, con fuente, fecha, unidades y versión de metodología.

La vinculación hidrológica y las recomendaciones técnicas requieren validación independiente de la proximidad de los puntos. Los rasters y datos descargados no se guardan en Git; `data/` está ignorado. Se agregarán pruebas de transformaciones junto con el primer proceso funcional.
