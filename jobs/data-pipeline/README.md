# Environmental data jobs

Python project independent of the npm workspaces.

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
| `python -m field_farms_data.publish.local --ffc <FFC_datos>` | `geo/cne/*`, `geo/sinac/areas_protegidas.geojson`, `local/orillas_verdor_1.5km.json`                                                                           |
| `python -m field_farms_data.publish.ejemplos`                | `ejemplos/*.json`, simulated, to work without waiting for another connector                                                                                    |

Downloads use only the standard library (`providers/http.py`), with no keys. If a source fails, its previous file is left untouched and `fuentes.json` marks it as `falla` (failure).

- `providers/`: access to NASA, NOAA and local sources, with credentials kept outside the repository.
- `transforms/`: normalization and calculations with GeoPandas/Rasterio once ingestion is added.
- `publish/`: indicators and layers prepared for web/mobile, with source, date, units and methodology version.

Hydrological linking and technical recommendations require validation beyond the proximity of the points. Rasters and downloaded data are not stored in Git; `data/` is ignored. Transformation tests will be added along with the first working job.
