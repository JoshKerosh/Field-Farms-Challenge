# App data (flat files)

There is no database. Every piece of data the app shows is a file in `apps/web/public/data/`. Cloudflare Pages serves it statically at `/data/...`, and the service worker stores it for offline use. The connectors (Python, `jobs/data-pipeline`) write the files and commit them.

The data contract keeps its Spanish field and file names (`fuente`, `capa`, `fecha_dato`, `fuentes.json`, `ejemplos/`…); they are identifiers shared by the web app and the Python jobs.

## What is there and who writes it

| Path in `public/data/`                                      | Content                                                                                                                              | Real or simulated | Updated by             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------------- |
| `fuentes.json`                                              | Catalog of the 18 sources: institution, URL, license, status and last good data                                                      | —                 | Every connector        |
| `nasa/power/latest.json`                                    | NASA POWER in 6 zones: 30- and 7-day rainfall with anomaly against 1991–2020, maximum temperature, soil moisture and a 90-day series | **Real**          | `publish.nasa`, daily  |
| `noaa/roni/latest.json`                                     | RONI El Niño index, phase according to NOAA and a 24-season series                                                                   | **Real**          | `publish.nasa`, daily  |
| `nasa/modis/latest.json`                                    | MODIS 250 m greenness in 6 zones, against the average for the same date since 2012                                                   | **Real**          | `publish.nasa`, daily  |
| `geo/cuencas.geojson`, `geo/subcuencas/<cuenca>.geojson`    | 34 watersheds and 1 868 subwatersheds (MINAE)                                                                                        | Real              | `publish.basins`, once |
| `geo/fuentes/<cuenca>.geojson`, `geo/asadas.geojson`        | SAGA sources and ASADAS (AyA)                                                                                                        | Real              | `publish.basins`, once |
| `geo/cne/inundacion.geojson`                                | 116 zones with flood potential (CNE), Huetar Norte                                                                                   | Real              | `publish.local`, once  |
| `geo/cne/deslizamientos.geojson`, `geo/cne/coronas.geojson` | 68 landslides and 661 scarps (CNE)                                                                                                   | Real              | `publish.local`, once  |
| `geo/sinac/areas_protegidas.geojson`                        | 8 ACAHN protected areas with their SINAC profile                                                                                     | Real              | `publish.local`, once  |
| `local/orillas_verdor_1.5km.json`                           | 27 987 cells: 15 m riverbank (IGN 1:5 000) and MODIS 1 km greenness                                                                  | Real              | `publish.local`, once  |
| `ejemplos/imerg.json`, `ejemplos/smap.json`                 | **Example** IMERG rainfall and SMAP moisture per subwatershed                                                                        | **Simulated**     | `publish.ejemplos`     |
| `ejemplos/indicadores-subcuenca.json`                       | **Example** indicators per subwatershed                                                                                              | **Simulated**     | `publish.ejemplos`     |
| `esquemas/archivo-indicadores.schema.json`                  | JSON schema of the contract                                                                                                          | —                 | By hand                |

FLUC, the 2014–15 drought, the cantonal anomaly and the 3 km grid are still bundled in `apps/web/src/data/real/`, because the app already imports them that way. They are registered in `fuentes.json` with `archivos: []`.

## The contract

Types in `packages/domain/src/data/index.ts`. Every JSON data file includes:

```json
{
  "meta": {
    "fuente": "nasa-power",
    "url": "https://power.larc.nasa.gov/api/temporal/daily/point",
    "capa": "nasa",
    "simulado": false,
    "fecha_dato": "2026-11-11",
    "fecha_carga": "2026-11-15T03:49:28Z",
    "version": 1
  },
  "datos": { "unidad": "zona", "items": [ … ] }
}
```

- `fuente` (source) is the id in `fuentes.json`. `capa` (layer) separates global data (NASA and NOAA, replicable in another country) from local data (N-10).
- `fecha_dato` is the date of the data, not of the download. POWER arrives about 3 days late.
- New GeoJSON layers carry the same `meta` as an extra member of the collection (RFC 7946 allows it).

In indicator files, each item (zone, subwatershed, cell or country) has `indicadores` (indicators) and, when it applies, a `serie` (series):

```json
{
  "id": "lluvia_30d_anomalia",
  "nombre": "Lluvia frente a lo normal (30 días)",
  "valor": 129,
  "unidad": "%",
  "estado": "sin_evaluar",
  "fuente": "nasa-power",
  "fecha": "2026-11-11",
  "simulado": false,
  "capa": "nasa"
}
```

`estado` (status) is `bien` (good), `atencion` (attention), `urgente` (urgent), `sin_evaluar` (not evaluated) or `sin_dato` (no data). The connectors publish `sin_evaluar`: thresholds carry a cited source and are applied by Alerts and Farm status, not by the connector. If the value is missing, `valor` is `null` and `estado` is `sin_dato`.

**Keys for joining data:**

- Zones: `N`, `C`, `S`, `M`, `U`, `V`. They are the same as `REGION_NAMES` in the app.
- Subwatersheds: `id` = `"<cuenca>-<orden>"` (e.g. `14-123`, San Carlos river), in `geo/subcuencas/<cuenca>.geojson`. A subwatershed with several parts has one id per part.

## How to read them from the app

```ts
import { cargarIndicadores, indicador, unidad } from '../platform/data/data-files';

const power = await cargarIndicadores('power');
const lluvia = indicador(unidad(power, 'N'), 'lluvia_30d_anomalia');
// lluvia.valor, lluvia.fecha, lluvia.fuente, lluvia.simulado → always show source and date (X-04)
```

`cargarIndicadores` validates the file against the contract before returning it. `cargarFuentes()` returns the catalog for the sources screen (SPA-10).

## How we guarantee it is real NASA data

1. Each connector calls the public API directly and stores the service it used in `meta.url`.
2. The test `apps/web/src/platform/data/data-files.test.ts` runs in `npm test`, in CI and before each commit made by the Action. It fails if:
   - a file does not follow the contract;
   - a file does not belong to a source in the catalog;
   - a file outside `ejemplos/` says `simulado: true`;
   - real data in the `nasa` layer does not come from `nasa.gov`, `noaa.gov` or `ornl.gov`.
3. If a source goes down, its file is left untouched: the last good data stays with its date. `fuentes.json` marks it as `falla` (failure) with the error and the Action ends in red.
4. One-time manual check: compare a point with the official tool. For example, the Northern Zone (10.8, −85.08) with the [POWER Data Access Viewer](https://power.larc.nasa.gov/data-access-viewer/).

## Running the connectors

```bash
cd jobs/data-pipeline
pip install -e ".[test]"
python -m field_farms_data.publish.nasa                 # POWER, RONI and MODIS (MODIS is slow: ORNL answers in ~40 s)
python -m field_farms_data.publish.nasa --solo power    # just one
python -m field_farms_data.publish.local --ffc <FFC_datos folder>
python -m field_farms_data.publish.ejemplos
pytest
```

The Action `.github/workflows/datos-nasa.yml` runs at 5:00 Costa Rica time on the default branch. With **Run workflow** it can run on any branch.

## Use of Super Intelligence (SI)

The analysis of the datasets, the design of the connectors and the way the app presents each dataset were done with the help of Super Intelligence (SI) tools (see [Use of SI](../README.md#use-of-super-intelligence-si)). The values come from the sources listed and were not generated by SI; simulated files are marked as such.

## Pending

- IMERG (SPA-28) and SMAP (SPA-29) need the NASA Earthdata account. Once ready, they write to `nasa/imerg/latest.json` and `nasa/smap/latest.json` and the examples are deleted.
- Real per-subwatershed indicators (SPA-21) replace `ejemplos/indicadores-subcuenca.json`.
- User records: stored on the device and later in the repo's `registros/` through the SPA-37 function.
