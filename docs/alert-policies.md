# Risk assessment through documented policies

Update: the team chose a combination of three conditions for the
landslide and flood map and delegated its initial parameters. See
[Condition map](condition-risk-map.md). That operational rule has its own
engine and does not automatically fill in the scientific policies described here.

`packages/domain/src/alerts/evaluate.ts` implements the four categories with no
dependency on React, providers or the browser. It contains no scientific thresholds.
The configuration is read from `apps/web/public/data/alerts/rules.json`.

The team confirmed that no approved rules exist yet, so that
file contains an empty list. **Do not change a rule to approved
to make the interface show a level.** The approval and the references
must come from a real review of its geographic application and of the product.

## What each assessment needs

| Category   | Minimum evidence                                                           |
| ---------- | -------------------------------------------------------------------------- |
| Drought    | RONI, slope side (Pacific/Caribbean), 30-day POWER anomaly, SMAP moisture. |
| Flooding   | IMERG 1 and 7 days, CNE zone, slope side.                                  |
| Saturation | SMAP volumetric moisture with a criterion applicable to the soil/product.  |
| Landslide  | Slope, soil properties, IMERG rainfall, SMAP moisture and CNE history.     |

A missing, simulated, unverified or outdated input returns
`indeterminate`. Future or invalid dates, inverted periods,
non-finite values, missing sources, units and products other than
the configured ones, and incomplete windows are also rejected. A verified numeric zero or `false`
are valid values; they are not the same as a missing value.

## Shape of a policy

The container carries `schemaVersion: alert-risk-policies-v1` and a `policies` list.
Each policy must provide:

- `id`, `version` and `risk` (one of the four categories).
- `approval`: `status: approved`, a name in `by`, a date in `date` and HTTPS URLs
  in `references`. The date cannot be later than the assessment.
- `requirements`: one entry per required indicator, with `unit`, `productId`,
  `maxAgeDays` and optionally `windowDays`. The maximum age is an explicit decision
  of the policy, not a hidden constant in the program.
- `bands`: each one has `id`, `severity` and `all`, a non-empty list of simultaneous
  conditions. Conditions state `indicator`, `operator` and `value`.
- `defaultSeverity`: the agreed classification when all the data is
  valid but no activation combination is met.

The operators are `gte`, `lte`, `gt`, `lt` and `eq`. The first four require
numeric values. `eq` allows booleans and categories; there are no automatic
conversions between `true`, `"true"`, numbers or text. This makes it possible to express
combinations by slope side, susceptibility, soil and rainfall without imposing a universal
El Niño rule or an arbitrary weight for the Caribbean.

If several bands match, the highest severity among them and the
default severity is selected. The band IDs, the factors used and the
identity and references of the policy are returned. Two approved policies for the same
category are rejected so a version is not picked arbitrarily.

## Identity of the connected indicators

| Evidence                | `productId`                       | Unit                   |
| ----------------------- | --------------------------------- | ---------------------- |
| RONI index              | `NOAA-RONI-ERSSTv6`               | `°C`                   |
| Rainfall anomaly        | `POWER-PRECTOTCORR-30D-1991-2020` | `%`                    |
| IMERG rainfall 1/7 days | `GPM_3IMERGDL.07`                 | `mm`                   |
| CNE flood zone          | `cne:inundaciones`                | empty string (boolean) |
| CNE landslide history   | `cne:deslizamientos`              | empty string (boolean) |

CNE keeps an unverified status because its date is unknown. No approved
identity has been defined for soil, slope or slope side. SMAP must distinguish the surface
layer from the root zone before its identity and criterion are set. Writing a
`productId` is not enough to resolve the pending verification.

## Tests

The only thresholds and approvals that exist are **synthetic fixtures in the
test files**, with `example.test` references. They are not published in the
real configuration. The tests cover each category, exact limits, missing
factors, units, periods, age, regional combinations, policy conflicts
and keeping the indeterminate result without approval.
