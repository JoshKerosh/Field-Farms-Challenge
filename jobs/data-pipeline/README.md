# Environmental data jobs

Python project independent of the npm workspaces.

The [POWER, RONI and CNE overlay connectors](CLIMATE.md) already publish JSON consumed by
Alerts, without Earthdata. They include an explicit historical baseline for anomalies,
validation, separate download/observation dates and preservation on failure.

## Checking alert sources

The [source check](SOURCE_CHECK.md) downloads small POWER and RONI samples
and queries the NASA catalogs and the CNE WFS. It uses only the Python standard
library; it stores results locally in `data/source-check/`, without publishing
indicators or downloading rasters. It includes verified results, limits and tests.

The [IMERG connector](IMERG.md) prepares real 1- and 7-day totals per subwatershed
through OPeNDAP, with NetCDF tests and preservation of the last valid summary.
The authenticated download requires `EARTHDATA_TOKEN` and GES DISC authorization;
by default the results are stored locally for review.

## Watershed and water layers

`python -m field_farms_data.publish.basins --datasets <folder>` reads `cuencas_hidrograficas.shp`, `Subcuencas_CRTM05.zip` and `Operadores y Fuentes (Ubicaciones).xlsx` (SAGA, AyA) and writes to `apps/web/public/data/geo/`:

| File                     | Content                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `cuencas.geojson`        | 34 watersheds simplified to 10 m; neighboring watersheds get different colors.            |
| `subcuencas/<n>.geojson` | Subwatersheds of watershed `n`, simplified to 5 m; `0` groups islands and coastal strips. |
| `fuentes/<n>.geojson`    | SAGA sources per watershed; the type (spring, well, surface) is inferred from the name.   |
| `asadas.geojson`         | Operators with their watershed, services and number of sources.                           |

Coordinates are converted from CRTM05 to WGS84 with each file's projection. 69 sources and 1 operator without coordinates are dropped. SAGA does not state the flow unit. Tests: `pytest`.

Each subwatershed has a stable `id` `"<cuenca>-<orden>"` (watershed-order): it is the key of the per-subwatershed indicator files.

## NASA, NOAA, local layers and examples

Format, contract and verification in [docs/data.md](../../docs/data.md).

| Command                                                      | Writes to `apps/web/public/data/`                                                                                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `python -m field_farms_data.publish.nasa`                    | `nasa/power/latest.json`, `noaa/roni/latest.json`, `nasa/modis/latest.json` and the status in `fuentes.json`. Run daily by `.github/workflows/datos-nasa.yml`. |
| `python -m field_farms_data.publish.climate`                 | `alerts/climate/power/*` and `alerts/climate/roni/*`; alert observations in their own format, without replacing the earlier indicators.                        |
| `python -m field_farms_data.publish.local --ffc <FFC_datos>` | `geo/cne/*`, `geo/sinac/areas_protegidas.geojson`, `local/orillas_verdor_1.5km.json`                                                                           |
| `python -m field_farms_data.publish.ejemplos`                | `ejemplos/*.json`, simulated, to work without waiting for another connector                                                                                    |

Downloads use only the standard library (`providers/http.py`), with no keys. If a source fails, its previous file is left untouched and `fuentes.json` marks it as `falla` (failure).

- `providers/`: access to NASA, NOAA and local sources, with credentials kept outside the repository.
- `transforms/`: normalization and calculations with GeoPandas/Rasterio once ingestion is added.
- `publish/`: indicators and layers prepared for web/mobile, with source, date, units and methodology version.

Hydrological linking and technical recommendations require validation beyond the proximity of the points. Rasters and downloaded data are not stored in Git; `data/` is ignored. Transformation tests will be added along with the first working job.
