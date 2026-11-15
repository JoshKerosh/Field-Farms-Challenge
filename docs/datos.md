# Datos de la app (archivos planos)

No hay base de datos. Todo dato que muestra la app es un archivo en `apps/web/public/data/`. Cloudflare Pages lo sirve como estático en `/data/...`, y el service worker lo guarda para usarlo sin conexión. Los conectores (Python, `jobs/data-pipeline`) escriben los archivos y hacen commit.

## Qué hay y quién lo escribe

| Ruta en `public/data/`                                      | Contenido                                                                                                                                  | Real o simulado | Se actualiza con               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ------------------------------ |
| `fuentes.json`                                              | Catálogo de las 18 fuentes: institución, URL, licencia, estado y último dato bueno                                                         | —               | Cada conector                  |
| `nasa/power/latest.json`                                    | NASA POWER en 6 zonas: lluvia de 30 y 7 días con anomalía frente a 1991–2020, temperatura máxima, humedad del suelo y una serie de 90 días | **Real**        | `publish.nasa`, todos los días |
| `noaa/roni/latest.json`                                     | Índice RONI de El Niño, fase según NOAA y serie de 24 trimestres                                                                           | **Real**        | `publish.nasa`, todos los días |
| `nasa/modis/latest.json`                                    | Verdor MODIS 250 m en 6 zonas, frente al promedio de la misma fecha desde 2012                                                             | **Real**        | `publish.nasa`, todos los días |
| `geo/cuencas.geojson`, `geo/subcuencas/<cuenca>.geojson`    | 34 cuencas y 1 868 subcuencas (MINAE)                                                                                                      | Real            | `publish.basins`, una vez      |
| `geo/fuentes/<cuenca>.geojson`, `geo/asadas.geojson`        | Fuentes y ASADAS del SAGA (AyA)                                                                                                            | Real            | `publish.basins`, una vez      |
| `geo/cne/inundacion.geojson`                                | 116 zonas con potencial de inundación (CNE), Huetar Norte                                                                                  | Real            | `publish.local`, una vez       |
| `geo/cne/deslizamientos.geojson`, `geo/cne/coronas.geojson` | 68 deslizamientos y 661 coronas (CNE)                                                                                                      | Real            | `publish.local`, una vez       |
| `geo/sinac/areas_protegidas.geojson`                        | 8 áreas protegidas del ACAHN con su ficha del SINAC                                                                                        | Real            | `publish.local`, una vez       |
| `local/orillas_verdor_1.5km.json`                           | 27 987 cuadros: orilla de 15 m (IGN 1:5 000) y verdor MODIS 1 km                                                                           | Real            | `publish.local`, una vez       |
| `ejemplos/imerg.json`, `ejemplos/smap.json`                 | Lluvia IMERG y humedad SMAP **de ejemplo** por subcuenca                                                                                   | **Simulado**    | `publish.ejemplos`             |
| `ejemplos/indicadores-subcuenca.json`                       | Indicadores por subcuenca **de ejemplo**                                                                                                   | **Simulado**    | `publish.ejemplos`             |
| `esquemas/archivo-indicadores.schema.json`                  | Esquema JSON del contrato                                                                                                                  | —               | A mano                         |

FLUC, la sequía 2014–15, la anomalía cantonal y la grilla de 3 km siguen empaquetadas en `apps/web/src/data/real/`, porque la app ya las importa así. Están registradas en `fuentes.json` con `archivos: []`.

## El contrato

Tipos en `packages/domain/src/data/index.ts`. Todo archivo JSON de datos trae:

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

- `fuente` es el id en `fuentes.json`. `capa` separa lo global (NASA y NOAA, se replica en otro país) de lo local (N-10).
- `fecha_dato` es la fecha del dato, no la de la descarga. POWER llega con unos 3 días de rezago.
- Las capas GeoJSON nuevas llevan el mismo `meta` como miembro extra de la colección (RFC 7946 lo permite).

En los archivos de indicadores, cada item (zona, subcuenca, cuadro o país) trae `indicadores` y, si aplica, una `serie`:

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

`estado` es `bien`, `atencion`, `urgente`, `sin_evaluar` o `sin_dato`. Los conectores publican `sin_evaluar`: los umbrales llevan fuente citada y los aplican Alertas y Estado finca, no el conector. Si falta el valor, `valor` es `null` y `estado` es `sin_dato`.

**Llaves para cruzar datos:**

- Zonas: `N`, `C`, `S`, `M`, `U`, `V`. Son las mismas de `REGION_NAMES` en la app.
- Subcuencas: `id` = `"<cuenca>-<orden>"` (p. ej. `14-123`, río San Carlos), en `geo/subcuencas/<cuenca>.geojson`. Una subcuenca con varias partes tiene un id por parte.

## Cómo leerlos desde la app

```ts
import { cargarIndicadores, indicador, unidad } from '../platform/data/data-files';

const power = await cargarIndicadores('power');
const lluvia = indicador(unidad(power, 'N'), 'lluvia_30d_anomalia');
// lluvia.valor, lluvia.fecha, lluvia.fuente, lluvia.simulado → mostrar siempre fuente y fecha (X-04)
```

`cargarIndicadores` valida el archivo con el contrato antes de devolverlo. `cargarFuentes()` devuelve el catálogo para la pantalla de fuentes (SPA-10).

## Cómo se garantiza que es dato NASA real

1. Cada conector llama directo a la API pública y guarda en `meta.url` el servicio que usó.
2. La prueba `apps/web/src/platform/data/data-files.test.ts` corre en `npm test`, en CI y antes de cada commit de la Action. Falla si:
   - un archivo no cumple el contrato;
   - un archivo no pertenece a una fuente del catálogo;
   - un archivo fuera de `ejemplos/` dice `simulado: true`;
   - un dato real de capa `nasa` no viene de `nasa.gov`, `noaa.gov` u `ornl.gov`.
3. Si una fuente se cae, su archivo no se toca: queda el último dato bueno con su fecha. `fuentes.json` la marca `falla` con el error y la Action termina en rojo.
4. Prueba manual de una vez: comparar un punto con la herramienta oficial. Por ejemplo, la Zona Norte (10.8, −85.08) con el [POWER Data Access Viewer](https://power.larc.nasa.gov/data-access-viewer/).

## Correr los conectores

```bash
cd jobs/data-pipeline
pip install -e ".[test]"
python -m field_farms_data.publish.nasa                 # POWER, RONI y MODIS (MODIS tarda: ORNL responde en ~40 s)
python -m field_farms_data.publish.nasa --solo power    # uno solo
python -m field_farms_data.publish.local --ffc <carpeta FFC_datos>
python -m field_farms_data.publish.ejemplos
pytest
```

La Action `.github/workflows/datos-nasa.yml` corre a las 5:00 de Costa Rica en la rama por defecto. Con **Run workflow** se puede correr en cualquier rama.

## Pendiente

- IMERG (SPA-28) y SMAP (SPA-29) necesitan la cuenta NASA Earthdata. Cuando estén, escriben en `nasa/imerg/latest.json` y `nasa/smap/latest.json` y se borran los ejemplos.
- Indicadores por subcuenca reales (SPA-21) reemplazan `ejemplos/indicadores-subcuenca.json`.
- Registros del usuario: se guardan en el dispositivo y luego en `registros/` del repo con la función de SPA-37.
