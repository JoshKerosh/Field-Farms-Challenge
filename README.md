# Sow Water

Navigable base of a PWA that connects farms, water sources and ASADAS (community water systems). It keeps the identity of the v10 prototype and organizes the features so they can be built in stages.

## Getting started

Requirements: Node.js 22.12+ (22 LTS or 24+) and npm. No external accounts, environment variables or Python are needed to open the demo.

```sh
npm install
npm run dev
```

Open the address Vite prints, usually `http://127.0.0.1:5173`. The app starts on the ABC guide.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

The build goes to `apps/web/dist`. The service worker runs in production, not in the dev server. After the first download, the demo data can be browsed offline. This does not include saving or syncing observations.

## Browser tests

```sh
npx playwright install chromium
npm run test:e2e
```

The tests start the production server on port 4173 and cover desktop and phone. On Windows an installed Edge can be used:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

Dependency status as of November 14, 2026: `npm audit --omit=dev` reports no vulnerabilities. The full audit keeps four low-severity advisories in the PWA build toolchain (`deepmerge` and its dependents). The `glob` and `minimatch` overrides resolve the moderate advisories; their compatibility is checked with lint, the build and the service worker tests. Do not run `npm audit fix --force` without reviewing the version changes.

## Layout

| Directory                       | Responsibility                                                      |
| ------------------------------- | ------------------------------------------------------------------- |
| `apps/web`                      | React, routes, screens, components and device integrations.         |
| `packages/domain`               | Types, rules and the data contract, independent of React and Dexie. |
| `jobs/data-pipeline`            | Python connectors: NASA, NOAA and local layers in `public/data/`.   |
| `functions`                     | Cloudflare Pages Functions (`/api/parcela`, SIRI lookup).           |
| `tests/e2e`                     | Navigation, accessibility, data freshness and offline use.          |
| `references/prototype-v10.html` | Untouched copy of the provided prototype.                           |
| `docs`                          | Architecture, data (`data.md`), inventory and opportunities.        |

The modules live in `apps/web/src/features`. Records brings together water measurements, actions and events without a parallel store. The demo adapters implement asynchronous interfaces per module; future integrations will replace them from the route composition.

## What it includes

- Six main sections plus shortcuts to benefits, environment and sources.
- Weather and satellite brings back the regional MODIS viewer with Play and adds NASA GIBS imagery by theme, color elevation and 3D relief, the farm and delimited watersheds. POWER and NOAA provide regional indicators with their dates; see [weather and satellite data](docs/weather-and-satellite.md).
- Fictional farm, sources, relationships and observations, clearly labeled.
- My watershed with real data: locating a point (GPS or tapping the map) shows the watershed and subwatershed, the farm boundary from the SIRI cadastre, IGN rivers and nearby SAGA sources and ASADAS, with an equivalent text summary and a minimap. See [real watersheds](docs/architecture.md#my-watershed-with-real-layers).
- Charts paired with tables.
- Demo views for farmer, ASADA and institution; the selector does not grant permissions.
- Predefined help and text-to-speech when the device supports it.
- Informational catalog of support programs with source and review date.
- Interface text centralized in `src/i18n` for translations.

Savings are shown as **Not calculated yet**. Links to programs do not mean an open call or eligibility. Save, export and notify are labeled as pending and do not send anything.

## Upcoming integrations

Local tracking of goals and expenses in `/care`, the regional NASA rainfall package and the
manual vegetation preparation are described in the [Recovery plan](docs/recovery-plan.md).
The MODIS import from November 2024 to October 2026 already produced series for 34 watersheds
and 310 tiles. A manual visual review of the view with a selected farm is still pending.

1. Farm and records on the device (Dexie), with a sync queue to repository files through a Pages Function.
2. Real IMERG and SMAP with the NASA Earthdata account; POWER, RONI and MODIS are already published daily (see [data](docs/data.md)).
3. Costs, investments and comparable periods to assess economic benefits.

The priority is responsive React + PWA. Capacitor could later reuse the web interface on Android/iOS; with React Native + Expo, types, rules and backend would be shared while the screens are built for mobile.

Authentication, sync, ingestion, monetary calculations and external procedures are not implemented. The 13 full screens of the prototype have not been migrated either.

## Hosting

Cloudflare Pages: install from the root, command `npm run build`, output `apps/web/dist`. `_redirects` lets internal routes open directly. The root `functions/` folder is published as Pages Functions and serves `/api/parcela`; in `npm run dev` and `npm run preview` the same logic runs as Vite middleware. This delivery does not publish or create external resources.

## Watershed and water layers

`apps/web/public/data/geo/` holds the generated layers (versioned so the app works with just `npm install`). To regenerate them from the PNUD datasets and SAGA:

```sh
cd jobs/data-pipeline
python -m venv .venv && .venv/bin/pip install -e ".[test]"
.venv/bin/python -m field_farms_data.publish.basins --datasets <folder with the PNUD datasets>
.venv/bin/pytest
```

## Use of Super Intelligence (SI)

Under the NASA Space Apps Challenge rules, we declare where we used Super Intelligence (SI, artificial intelligence) tools. No generated content uses NASA logos, flags or insignia.

| Part             | Tools                                    | How it was used                                                                                                                                                                                                | Where it is marked                                                                                                                       |
| ---------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Code             | Claude Code, Codex, ChatGPT, Antigravity | Agentic programming: SI wrote and changed much of the code, and the team defined the design, reviewed the changes and ran the tests. Applies to the whole repository.                                          | This section and the app's **Sources** screen                                                                                            |
| Data             | Claude Code, Codex, ChatGPT              | Study of the datasets (NASA, NOAA, MINAE, AyA, CNE, SINAC), design of the connectors and of how the app uses each dataset. The data is real and was not generated by SI, except files marked as **simulated**. | This section, [data](docs/data.md) and the **Sources** screen                                                                            |
| Interface images | SI-generated                             | App icon (`apps/web/public/icon.svg`, `apps/web/public/icons/*.png`) and map icons (`map-icons.tsx`)                                                                                                           | Visible text "SI-generated (AI) icons" in the map legends, and metadata in the files (`<title>`/`<desc>` in the SVG, `tEXt` in the PNGs) |
| Pitch video      | Claude Code, HyperFrames                 | Composition and animation of the video. The screens shown are real captures of the app.                                                                                                                        | Visible watermark for the whole video and MP4 metadata                                                                                   |
| Video voice      | Kokoro TTS (voice `am_michael`)          | SI-generated synthetic narration                                                                                                                                                                               | Named in the video watermark and in each WAV's metadata                                                                                  |

## References and licenses

See [architecture](docs/architecture.md), [inventory](docs/prototype-inventory.md), [opportunities](docs/opportunities.md), [product](PRODUCT.md) and [design](DESIGN.md).

The Bricolage Grotesque and Nunito Sans fonts come from the provided HTML; their notices and SIL OFL license are kept in `apps/web/public/fonts/LICENSE.txt`. The prototype keeps all its comments and resources. Its figures and models are not considered validated by this implementation.

## Recovery tracking

Set goals in the Recovery plan and record progress, photos and expenses in Records. Water measurements have their own section. Support programmes are centralised in Benefits. The Assistant route redirects to the guide; alert simulation controls have been retired.
