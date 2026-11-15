# Initial architecture

## Decision

Modular application organized by feature, with light internal layers and no database: data is flat files in `apps/web/public/data/` published by the Python jobs (see [data](data.md)). One monorepo holds the web app, shared rules, Pages Functions and data jobs. No microservices are created per feature.

The first delivery is a navigable base: the repositories read local examples, not a business API. The web app is deployed on Cloudflare Pages; the Python jobs run on GitHub Actions and commit their files.

## Boundaries

- `features/farms`: farm profile and management; pasture rotation stays here for now.
- `features/watersheds`: territorial context and documented relationships.
- `features/water`: sources and flow and rainfall observations.
- `features/restoration`: actions and future restoration priorities.
- `features/environment`: presentation of indicators prepared by Python.
- `features/alerts`: alerts and reported events.
- `features/organizations`: ASADAS, FLUC and collaboration.
- `features/assistant`: predefined help, separate from the voice capability.
- `features/benefits`: economic information and external catalog; it does not determine eligibility.

Each module exports its public interface from `index.ts`. Other modules and the composition import that entry point. Add `use-cases` when there is an operation to coordinate or real rules; don't create empty layers by convention.

## Dependencies and flow

The router composes loaders with asynchronous repository interfaces. The adapters in `demo/repositories` implement those interfaces using typed fixtures and return copies to avoid accidental mutation. Pages consume their loaders' results.

`packages/domain` knows nothing about the interface, the browser or providers. Access interfaces belong to each module. `shared` holds reusable presentation; `platform` holds browser and service integrations. The data file contract (`packages/domain/src/data`) does belong to the domain, because the web app and the Python jobs share it.

Records composes water, restoration, events and organizations without duplicating information. Guide and Sources are also composition pages. The view selector holds ephemeral presentation state; it does not replace a session or a permission.

## Data truth

Field entities have a stable ID, source and date. Examples have origin `demo`; observed data and estimated results must keep their differences and the method used. The farm–ASADA relationship in this demo is fictional; a radius or proximity does not prove recharge or supply.

The catalog is documentary information kept apart from the examples. Each opportunity distinguishes payment, loan, recognition or grant, keeps its URL and review date, and is not published as open without confirmation. A past deadline overrides the stored status. Dates without a time are treated as inclusive; upcoming calls will keep the official times and time zones when published.

## Upcoming persistence

The backend will be the authority on identity, memberships, consent, restrictions and transactions. Migrations and tests will be reviewed with the code. Measurements will include stable identifiers to prevent duplicates during retries.

Dexie will store authorized data locally plus an outbox. The interface will distinguish local save, pending send and remote confirmation. The current PWA only precaches code and demo resources; it does not implement that protocol.

## My watershed with real layers

The My watershed map uses real data; the rest of the demo still uses examples. When a point is chosen:

1. The watershed and subwatershed come from the layers published by `jobs/data-pipeline` in `public/data/geo` (subwatersheds and sources are downloaded only for the watersheds involved).
2. The cadastral parcel is requested from SIRI (WMS GetFeatureInfo) through `/api/parcela`, because SIRI does not send CORS headers. The logic lives in `platform/siri/parcel.ts` and is used by the Pages Function `functions/api/parcela.ts` and by a Vite middleware. It returns only the parcel containing the point and seven fields, with a one-day HTTP cache.
3. The overlays are computed in the browser with Turf (`features/watersheds/analysis`): the share of the farm in each watershed and subwatershed (parts under 1 % are ignored), rivers within ≤ 200 m requested directly from the IGN WFS (it allows CORS), and sources and ASADA offices within ≤ 300 m, or the nearest source if there are none.
4. The "Everything in the farm's watersheds" mode shows ASADAS, sources and rivers of those watersheds, each layer from a certain zoom level.

Proximity does not prove recharge or supply; the interface says so. The full cadastre layer and SIRI roads are not shown: MapLibre would need a tile proxy.

## Evolution

Given the time, the priority is responsive React + PWA. Capacitor is a later option to package the web interface and add device capabilities; it requires adapting and testing the experience for Android/iOS. React Native + Expo remains an alternative if a native interface is needed: it would share types, rules and backend, but its screens and navigation would be built for that platform. Neither mobile option is implemented in this delivery.

Add FastAPI when an on-demand calculation or integration needs its own API. Python will access providers, transform data and publish small results; rasters stay out of the repository.
