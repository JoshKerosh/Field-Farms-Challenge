# Real alert data without Earthdata

The `field_farms_data.publish.climate` job downloads POWER and RONI and publishes
small JSON files that the Alerts screen already consumes. It needs no keys, tokens,
extra backend or new dependencies. It reuses the validated readers
from the source check and keeps them separate from the risk engine.

## Run from the root

In PowerShell or Git Bash with the Windows virtual environment already set up:

```sh
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.climate
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.cne
```

The first command uses only the standard library; the second uses Shapely, already
declared by the project. The weather reference date can be fixed with
`--as-of 2026-11-15`. POWER/CNE query the point **10.8; −85.08** by default.
For another location, use `--lat`, `--lon` and a different `--out` folder. The geographic
identity of an earlier sample is not silently overwritten.

The alert files have their own `alerts/climate/` folder. The regional
indicators in `nasa/power/latest.json` and `noaa/roni/latest.json`, their consumers
and the `publish.nasa` job keep the `ArchivoIndicadores` contract.

## Format and updates

```text
apps/web/public/data/alerts/climate/power/{latest,YYYY-MM-DD,status}.json
apps/web/public/data/alerts/climate/roni/{latest,YYYY-MM-DD,status}.json
apps/web/public/data/alerts/cne/{latest,status}.json
```

POWER and RONI are updated independently: a failure in one doesn't prevent keeping and
updating the other provider. The last valid file, its observed
period and its source are kept on failure. `status.json` records the date and result of the
attempt, separate from the observation date. Older data doesn't replace
more recent observations. The same input doesn't produce another snapshot or
change the observation date. These are formats specific to these sources, not
a replacement for the shared SPA-7 contract.

The cache of original responses and history is stored in
`jobs/data-pipeline/data/climate/`, ignored by Git. Their hashes are checked before
the reference is reused. Only the small summaries go into `public/data`.

The `alert-climate.yml` workflow checks Python and prepares the JSON on a daily
schedule or manual run, without Earthdata. It produces reviewable artifacts: it has no
write permission on the repository and does not commit, push or deploy.
It was not run on GitHub in this delivery. A local update or an artifact
is not automatically published to a deployed site.

## POWER method

- Precipitation `PRECTOTCORR` and relative root-zone wetness `GWETROOT`
  are queried with UTC days. The reader requires a complete shared 30-day window. Missing
  days are not filled with zeros.
- Current precipitation is the sum of those 30 days, in mm.
- 90 daily values are also kept in `sample.dailyHistory`, querying a
  120-day margin to cover provider delays. Each day keeps rainfall
  and relative wetness, or `null` when there is no valid value. The screen's comparisons
  use two complete, consecutive, non-overlapping windows; they sum
  rainfall and average GWETROOT, without assigning risk levels.
- The reference is the average of 30 sums of 30 days, each ending on the
  same month/day as the latest current data, for the years 1991–2020. For windows that
  cross January, the end of 1990 is included in the historical download.
- Percentage anomaly: `100 × (current_total / mean_reference − 1)`.
- All 30 complete periods are required. If a historical day is missing or the mean
  reference is zero, the anomaly is unavailable. February 29 also
  stays pending until its handling is agreed; no equivalence is invented.
- The value, the reference mean, the number of windows, method,
  period, parameters and response hashes are kept.

The standard **1991–2020** period was chosen, as documented by the
[WMO](https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/climate-services/wmo-climatological-normals)
and [NOAA NCEI](https://www.ncei.noaa.gov/products/wmo-climate-normals).
The rolling calculation defined here is a reference derived from POWER: **it is not an
official IMN station normal nor an approved drought threshold**. The
[POWER daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)
allows querying the history per point; its recent values may be revised.
The dimensionless GWETROOT is not converted into SMAP volumetric moisture.

For the Nov 15, 2026 download, the Upala point produced **404.38 mm** between
Oct 15 and Nov 13; mean reference **178.7876667 mm**, anomaly **+126.1789 %**.
The frontend only applies that anomaly when the point serialized to six
decimals matches. That comparison is numeric identity, not a geographic radius of
representativeness. It is not assigned to the rest of the subwatershed or to another nearby farm.

## RONI

The [official NOAA CPC RONI table](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/) is read,
with an explicit ERSSTv6 identity, index and period. The ONI file is not used as a
substitute. The frontend validates the season's limits and distinguishes global
data from a local indicator. The last value queried was **+2.0 °C**, ASO
2026, from Aug 1 to Oct 31. Recent values may be revised; the index is not
a drought declaration for every region.

## CNE

The WFS responded with real geometries. The job queries a small envelope
around the point as an index filter and then computes the exact coverage
of the point with polygons, without using an invented hazard radius.
CRS, geometries and counts are checked; a truncated query is rejected. Centroids and lines
are not automatically turned into hazard zones.

The inspected attributes **contain no verifiable observation date**.
That's why even a positive intersection is `unverified`; a query without an
intersection produces `null`, not `false` or low risk. The download date is
stored separately and is never presented as the map's date. The service uses HTTP,
with no guarantee of transport integrity. The Upala query returned zero
features for both layers: this does not prove complete coverage or the absence of
risk. The source/versioning need review with the team before enabling
rules based on those maps.

The job also publishes `apps/web/public/data/alerts/cne/map.json`: it downloads
pages of 50 features up to a maximum of 500 per layer within the
subwatershed's bounding box. It rejects duplicate IDs, count changes during the query and incomplete
pages. If it hits the limit, it records the query as partial. Each layer
keeps the counts and hashes of the responses. Geometries are clipped to the
frame and simplified to 10 m only for display; the exact point
overlays use the original geometry. The map's date is still
unknown and is stored apart from the download. Zero features is not the same as
low risk. The view requires no tiles or CNE calls from the browser.

## Browser and offline use

The browser only requests the project's static JSON. It validates
schema, real origin, source, units, calculation, periods and location. It keeps
valid local copies of POWER/RONI with their dates and reports query failures.
It does not replace a new copy with an older one. Approved rules are not
restored from localStorage if the policy file can't be fetched.

The PWA uses NetworkFirst for these files, and the content's date still
determines its validity. Indicator expiry is computed with the
explicit limit of each policy; a cached response doesn't become new data
or confirm a successful provider update.

## What is still blocked

The team has not yet approved thresholds/rules or their age limits. SMAP data,
slope, an agreed soil source, verifiable metadata for the local
layers and authenticated IMERG validation are missing. The evaluators for the four categories
already support documented policies and combinations, but the real configuration
stays empty and incomplete assessments remain indeterminate.

Tests: `python -m pytest jobs/data-pipeline/tests -q` with the environment set up;
`npm test` and the browser tests in `tests/e2e/alerts.spec.ts`.
