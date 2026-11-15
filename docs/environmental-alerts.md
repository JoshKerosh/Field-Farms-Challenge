# Environmental alerts without Earthdata

The `/alerts` screen lets users try four categories: drought, flooding,
excess water in the soil and landslide. It needs no accounts, tokens or
external services to open or use the demo scenarios.

## Try it

From the root, run `npm run dev` and open `/alerts` at the address
Vite prints. Use **Simulate drought**, **Simulate heavy rain** or **Simulate
heat**. When leaving the simulation, the pending assessments come back and no
fictional values are kept as if they were real data.

The simulation mode is the same shared state used by Environment. It is
not persisted on reload. The global and local controls let users exit.

## History, comparison and mapping

Below the scenarios there are three real-data views that don't change when
a simulation is enabled and don't assign severity:

- **History:** a series of up to 90 days of POWER precipitation and relative root-zone
  wetness. Users can choose the indicator and show 7, 30 or 90 days, with an
  equivalent accessible table. Gaps are not joined or filled with zeros.
- **Temporal comparison:** two consecutive windows of 1, 7 or 30 days, always
  of equal length and without overlap. Rainfall is summed and wetness is averaged.
  It shows the absolute and percentage difference; with missing days it doesn't compute the
  comparison, and with a zero reference it doesn't divide by zero.
- **CNE map:** real geometries of the subwatershed area, flood susceptibility
  layers and landslide records, feature selection, legend and
  zoom. It downloads the geometries only when Alerts is opened. It uses lightweight SVG,
  following the existing minimap, with no external tiles or credentials.

The published point is Upala (10.8; −85.08). Away from that point, its
series or map is not applied to another location. The **View point with data** button lets users browse
the reference separately, without changing the farm or its assessments; the notice
says when that reference is being viewed. The mapping downloaded for Río Zapote contains
25 flood features and zero landslide features in the area queried. This
does not prove complete historical coverage or the absence of a hazard. The
download date is kept and the interface says there is no verified observation date for the map.
The geometry is clipped to the frame and simplified to 10 m only for drawing;
it does not replace the pipeline's exact point overlay or a cadastral delineation.

The sources are updated with the commands documented in
`jobs/data-pipeline/CLIMATE.md`. The history uses published static data and the
last available day; it is not a live weather query from the browser.

## Two separate modes

- **Available data:** the four real assessments are indeterminate until
  there are verifiable indicators and approved scientific rules. The engine
  never turns missing data into low risk.
- **Simulation:** every indicator comes from the isolated example in
  `apps/web/src/demo/fixtures/environmental-alerts.ts`, including its periods.
  The levels are a predefined visual script, **not comparisons with scientific
  thresholds**. Neither the farm, its land use capacity nor cattle rotation
  turn these examples into real assessments of the selected location.

The cards are sorted by severity and show the reason, indicators, source,
period and general guidance. The demo level is labeled as
such on every card. Tables scroll horizontally on mobile. The generation
date is shown in Costa Rica's time zone and stays separate
from the observation period. The interface and the related assistant
answers work in Spanish and English. There is no WhatsApp link in Alerts.

## Status of the real data

The frontend reads real JSON from `public/data/alerts/climate/power/` and `alerts/climate/roni/`, validates
its format, keeps dates and falls back to local copies if an update fails.
RONI is kept separate from ONI and the full seasonal period is validated.
POWER uses thirty comparable historical windows from 1991–2020 for its anomaly.
It only applies to the exact point queried, with a serialization precision of six
decimals; it is never turned into an average for a subwatershed or another farm.
If there is no applicable verified file, the prototype's old copy stays
marked as unverified. The prototype's slope side doesn't get an invented
date either. POWER wetness is not turned into SMAP volumetric moisture.

The IMERG reader is wired to the pipeline format: it checks the fingerprint of the
geographic layer, the feature index and point containment, without matching watersheds
by name alone. The real authenticated download is still missing. The per-point CNE overlays
are published, but keep an unknown date and unverified status. An empty query
does not prove the absence of risk. SMAP, slope and soil are still pending
data and an agreed source. The 2014–2015 history remains historical context
and does not determine the current severity.

The four evaluators already process configurable policies and produce severity,
factors, version and references. They only accept approved policies with complete
requirements, units, product, window and explicit age limits. The
file `public/data/alerts/rules.json` is empty because the team has not yet
approved rules. See [policy format](alert-policies.md) and
[connectors without Earthdata](../jobs/data-pipeline/CLIMATE.md).

The evidence types added in `packages/domain/src/alerts` belong to
alerts and reuse `Provenance`; they don't replace the global SPA-7 contract or the
existing `FieldAlert` and `EnvironmentalIndicator` types.

The engine distinguishes available, outdated, simulated, unavailable and
unverified. Without an approved validity rule it doesn't arbitrarily assign an expiry
period: it keeps the date and marks the verification as pending.

## Verification

With the dependencies and the Python environment already set up:

```sh
npm run verify:alerts
```

The command checks types, lint, TypeScript tests, Python tests and the build,
and stops with an error if any check fails. To add Alerts tests
on desktop and mobile:

```sh
npm run verify:alerts -- --browser
```

On Windows it uses Edge if installed and no other channel was chosen with
`PLAYWRIGHT_CHANNEL`. It doesn't install dependencies, query NASA/CNE or change
Git. The examples and tests still don't require Earthdata. Software
validation does not replace scientific approval or resolve missing indicators.

The checks can also be run separately:

```sh
npm run typecheck
npm run lint
npm test
```

For the browser tests with Edge installed, in PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e -- tests/e2e/alerts.spec.ts
```

In Git Bash:

```bash
PLAYWRIGHT_CHANNEL=msedge npm run test:e2e -- tests/e2e/alerts.spec.ts
```

The tests cover four categories, ordering, scenario switching, clean exit,
provenance, units, dates, missing/outdated/simulated indicators,
ES/EN, accessibility and the absence of Earthdata requests. The examples don't validate
the predictive ability of the future risk rules.

## To enable real assessments later

Integrate the agreed contract and geographic identifiers, load
indicators with verified quality and validity, justify and approve thresholds and
regional rules, and validate the results with reproducible cases. The IMERG
connector and its optional Earthdata configuration are documented in
`jobs/data-pipeline/IMERG.md`; they are not required for this demo.

## Closing review of November 15, 2026

84 TypeScript tests, 56 Python tests and the 46 full browser tests
on desktop and mobile passed, including accessibility, languages and offline
PWA. The `verify:alerts` command also checks types, lint and the build
and returns an error on a failed check.

This is a working, tested delivery, not the completion of every task in the
Alerts project. Still pending: scientific approval of rules and
validity, SMAP data/ingestion, slope, soil source, verification of local
layers and the authenticated IMERG download. No fictional values or approvals
are enabled to hide those dependencies.
