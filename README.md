# Field Farms Challenge

Base navegable de una PWA que relaciona fincas, fuentes de agua y ASADAS. Conserva la identidad del prototipo v10 y organiza las funcionalidades para desarrollarlas por etapas.

## Arranque

Requisitos: Node.js 22.12+ (22 LTS o 24+) y npm. No se necesitan cuentas externas, variables de entorno, Python ni Supabase para abrir la demo.

```sh
npm install
npm run dev
```

Abrir la dirección que muestra Vite, normalmente `http://127.0.0.1:5173`. La aplicación comienza en la guía ABC.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

El build queda en `apps/web/dist`. El service worker funciona en producción, no en el servidor de desarrollo. Después de la primera descarga, la base demo puede consultarse sin conexión. Esto no incluye guardar ni sincronizar observaciones.

## Pruebas de navegador

```sh
npx playwright install chromium
npm run test:e2e
```

Las pruebas inician el servidor de producción en el puerto 4173 y cubren escritorio y teléfono. En Windows se puede usar un Edge ya instalado:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

Estado de dependencias al 14 de noviembre de 2026: `npm audit --omit=dev` no reporta vulnerabilidades. La auditoría completa mantiene cuatro avisos de severidad baja en la cadena de herramientas de build PWA (`deepmerge` y sus dependientes). Los overrides de `glob` y `minimatch` resuelven los avisos moderados; su compatibilidad está comprobada con lint, compilación y las pruebas del service worker. No aplicar `npm audit fix --force` sin revisar los cambios de versiones.

## Organización

| Directorio                      | Responsabilidad                                                       |
| ------------------------------- | --------------------------------------------------------------------- |
| `apps/web`                      | React, rutas, pantallas, componentes e integraciones del dispositivo. |
| `packages/domain`               | Tipos y reglas independientes de React, Supabase y Dexie.             |
| `jobs/data-pipeline`            | Procesos Python de datos; publica las capas de cuencas y del SAGA.    |
| `functions`                     | Cloudflare Pages Functions (`/api/parcela`, consulta al SIRI).        |
| `supabase`                      | Configuración y ubicación de futuras migraciones y pruebas.           |
| `tests/e2e`                     | Navegación, accesibilidad, vigencia y uso sin conexión.               |
| `references/prototype-v10.html` | Copia intacta del prototipo proporcionado.                            |
| `docs`                          | Arquitectura, inventario funcional y fuentes de oportunidades.        |

Los módulos están en `apps/web/src/features`. Registros integra mediciones de agua, acciones y eventos sin crear un almacenamiento paralelo. Los adaptadores demo implementan interfaces asíncronas por módulo; las futuras integraciones los reemplazarán desde la composición de rutas.

## Qué incluye

- Seis secciones principales y accesos a beneficios, ambiente, asistente y fuentes.
- Finca, fuentes, relaciones y observaciones ficticias claramente identificadas.
- Mi cuenca con datos reales: ubicar un punto (GPS o tocando el mapa) muestra la cuenca y subcuenca, el lindero de la finca según el catastro del SIRI, los ríos del IGN y las fuentes y ASADAS del SAGA cercanas, con un resumen textual equivalente y minimapa. Ver [cuencas reales](docs/architecture.md#mi-cuenca-con-capas-reales).
- Gráficos acompañados de tablas.
- Vistas demo de finquero, ASADA e institución; el selector no concede permisos.
- Ayuda predefinida y lectura de voz cuando el dispositivo la permite.
- Catálogo informativo de apoyos con procedencia y fecha de revisión.
- Textos de interfaz centralizados en `src/i18n` para futuras traducciones.

El ahorro se muestra como **Aún no calculado**. Los enlaces a programas no equivalen a una convocatoria abierta ni a elegibilidad. Guardar, exportar y avisar están identificados como pendientes y no realizan envíos.

## Próximas integraciones

1. Finca, membresías y registros persistentes con Supabase/PostgreSQL/PostGIS, permisos e integridad en backend.
2. Dexie, cola de sincronización e identificadores estables.
3. Procesos Python de NASA/NOAA y capas locales, con método y procedencia.
4. Costos, inversiones y períodos comparables para evaluar beneficios económicos.

La prioridad es React responsive + PWA. Después se puede evaluar Capacitor para reutilizar la interfaz web en Android/iOS; con React Native + Expo se compartirían tipos, reglas y backend, construyendo las pantallas para móvil.

Autenticación, sincronización, ingesta, cálculos monetarios y trámites externos no están implementados. Tampoco se han migrado las 13 pantallas completas del prototipo.

## Alojamiento

Cloudflare Pages: instalar desde la raíz, comando `npm run build`, salida `apps/web/dist`. `_redirects` permite abrir rutas internas. La carpeta `functions/` de la raíz se publica como Pages Functions y atiende `/api/parcela`; en `npm run dev` y `npm run preview` la misma lógica corre como middleware de Vite. Esta entrega no publica ni crea recursos externos.

## Capas de cuencas y agua

`apps/web/public/data/geo/` contiene las capas ya generadas (versionadas para que la app funcione con solo `npm install`). Para regenerarlas con los datasets de PNUD y el SAGA:

```sh
cd jobs/data-pipeline
python -m venv .venv && .venv/bin/pip install -e ".[test]"
.venv/bin/python -m field_farms_data.publish.basins --datasets <carpeta con los datasets de PNUD>
.venv/bin/pytest
```

## Referencias y licencias

Consultar [arquitectura](docs/architecture.md), [inventario](docs/prototype-inventory.md), [oportunidades](docs/opportunities.md), [producto](PRODUCT.md) y [diseño](DESIGN.md).

Las fuentes Bricolage Grotesque y Nunito Sans proceden del HTML proporcionado; sus avisos y licencia SIL OFL se conservan en `apps/web/public/fonts/LICENSE.txt`. El prototipo conserva todos sus comentarios y recursos. Sus cifras y modelos no se consideran validados por esta implementación.
