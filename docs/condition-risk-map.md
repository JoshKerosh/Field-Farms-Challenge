# Condition map

The team decided to classify by the number of simultaneous conditions and delegated the
choice of initial parameters. The `/alerts` map implements that decision
independently of the historical CNE map and of the earlier alert policies.

## Initial operational rule: conditions-v1

| Condition | Landslides                                     | Floods                                         |
| --------- | ---------------------------------------------- | ---------------------------------------------- |
| Water     | Fraction of pore space filled with water ≥0.90 | Same                                           |
| Soil      | Susceptible geotechnical classification        | Poor drainage classification                   |
| Relief    | Slope ≥20 degrees                              | Height above nearest drainage (HAND) ≤5 meters |

Three conditions met: red; two: orange; one: yellow; none: green.
**Any unknown, expired or unverified condition produces gray.**
The limits are inclusive. A verified `false` or zero is not missing data.
Green only means zero conditions met in this model.

The numeric cutoffs are initial implementation decisions, **not values
validated for Costa Rica nor thresholds recommended by the references**. They are not
turned into probabilities, evacuation recommendations or official alerts.
The selection is centralized in
`packages/domain/src/alerts/condition-risk.ts`, versioned for calibration.

Slope is used instead of absolute elevation for landslides, and HAND for
low ground in floods. A high absolute elevation does not measure steepness;
a low absolute elevation does not measure vertical closeness to drainage.

The soil condition requires an explicit mapped classification with a
source: neither agricultural land use capacity nor clay percentage alone
establishes geotechnical susceptibility or poor drainage. A negative classification
also requires evidence; missing mapping is not turned into `false`.

## Data and current limitation

The public file `apps/web/public/data/alerts/conditions.geojson` is empty
on purpose: **the repository does not yet have verified
saturation, soil and relief layers to populate the map**. The interface shows gray and
explains which are missing. The CNE map keeps its historical meaning.
This completes the engine and the visualization, not the real data coverage.

POWER GWETROOT is a relative root-zone wetness index: it is not renamed
as pore saturation, and a point is not replicated over a watershed. The illustrative
`satBase` grids, their noise and their simulated farms are not used either.

## Contract for publishing polygons

WGS84 GeoJSON with `type: FeatureCollection`, `schemaVersion:
alert-condition-map-v1`, `dataMode: real` and `features`. Each feature has
`type: Feature`, Polygon/MultiPolygon geometry and properties:

- A unique `id` and `name`.
- `conditions`: `saturation`, `slope`, `heightAboveDrainage`,
  `susceptibleSoil`, `poorDrainage`. Each reading can be `null`.
- Present readings: `value`, `unit`, `status`, an HTTPS `source`, `observedAt`
  and `validUntil` in ISO 8601. Only `available` readings within their validity take part.
  The producer of each layer must justify and assign that validity.
- Respective units: `fraction-of-pore-space`, `degree`, `m`, `boolean`,
  `boolean`. Soil and drainage are strict booleans; strings are not converted.

Published polygons must be non-overlapping zones with evidence of compatible
spatial support and depth. The publisher must harmonize their
resolution and document source and method; this consumer does not interpolate or
derive those layers. They are visually clipped to the subwatershed outline. Gaps
without coverage stay gray. Each risk only looks at its three conditions.
Selecting a zone shows the result of each condition and its sources.

## Context references

- [USGS: landslide monitoring](https://www.usgs.gov/programs/landslide-hazards/science/real-time-monitoring-potential-landslides):
  relationship between moisture, pore pressure and stability. It does not prescribe the cutoffs
  chosen here.
- [USGS: rainfall-induced landslides](https://www.usgs.gov/programs/landslide-hazards/science/overview-rainfall-induced-landslides):
  need for observations and calibration of warning criteria.
- [ISRIC: SoilGrids properties](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html):
  estimated properties and uncertainty; not directly equivalent to a
  terrain stability layer.

## Verification

`npm run verify:alerts -- --browser` includes tests of every combination,
limit, date, unit and missing data, plus tests of the desktop and
mobile map. Only the tests intercept the file with synthetic polygons. Those
fixtures are never published as real observations.
