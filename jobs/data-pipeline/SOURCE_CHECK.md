# Source check for alerts

This checker prepares local evidence before the alerts are connected. It uses only
the Python 3.12+ standard library. It doesn't install packages, read or
send credentials, download rasters or publish data to the app.
The output JSON files are feasibility samples, **not the shared SPA-7 contract**.

## Repeating the check

From the repository root, in PowerShell or Git Bash:

```sh
python jobs/data-pipeline/src/field_farms_data/source_probe.py --as-of 2026-11-15
```

To query recent data, omit `--as-of`: the default is the
Costa Rica date (UTC−6). The reference date doesn't change the download date; the
sources may revise earlier observations. Bit-for-bit reproducibility of a future
download is not promised.

To test only POWER and NOAA:

```sh
python jobs/data-pipeline/src/field_farms_data/source_probe.py --sources power roni
```

For another point, use `--lat`, `--lon` and a different output folder with
`--out jobs/data-pipeline/data/otro-punto`. The point must be inside exactly
one subwatershed of the versioned layers. It is not replaced by a nearby location.
An existing sample from another location or source version is not overwritten.

The default outputs go to the local folder ignored by Git:

```text
jobs/data-pipeline/data/source-check/
  report.json           # Independent result per source and pending items
  power/latest.json     # Valid 30-day window, units and location
  roni/latest.json      # Last complete season, version and date
  raw/<sha256>.raw      # Small original responses and metadata
```

The report distinguishes `validated-sample`, `metadata-only`, `sample-checks` and
`failed`. Exiting with code 0 means the requested checks
responded and passed their limited validations; **it does not mean that
every connector or indicator is available**. It exits with code 1 if
any query or sample fails. A failure doesn't overwrite the last valid JSON;
an older observation doesn't replace a more recent one either. The data date
is always kept; it is not updated to look like a new observation.

The per-request timeout is 25 seconds and each response is limited to 4 MiB.
There are no automatic retries or scheduled automation in this check.

## Result observed on November 15, 2026

Point: **10.8° N, −85.08°**, inside **Río Zapote**, according to
`apps/web/public/data/geo/subcuencas/17.geojson`, feature 21 (zero-based index).
The layer states the major watershed "Cuencas Lago De Nicaragua" and slope side "Atlantica".
These names are not automatically reinterpreted as a climate region.
The file/feature identifier is a local reference, not a stable ID.

| Source        | Actual test result                                                                                                                                                                                  | Limitation                                                                                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NASA POWER    | Full UTC window from Oct 15 to Nov 13, 2026: accumulated precipitation **404.38 mm** and mean GWETROOT **0.848**, dimensionless.                                                                    | It is a point query inside a subwatershed, not an area average. The latest shared available date is two days behind the reference.                                                                                                 |
| NOAA CPC RONI | **+2.0 °C**, season **ASO 2026**, interval Aug 1–Oct 31; table identified as **ERSSTv6**.                                                                                                           | Global seasonal index, not a daily local drought observation. NOAA warns that recent values may be revised.                                                                                                                        |
| IMERG         | Catalog reachable: `GPM_3IMERGDL`, version `07`, collection `C2723754859-GES_DISC`.                                                                                                                 | Collection metadata only. The authenticated download has not been tested and no IMERG rainfall was obtained.                                                                                                                       |
| SMAP          | Catalog reachable: `SPL4SMGP`, version `008`, collection `C3480440870-NSIDC_CPRD`.                                                                                                                  | Metadata only. The variable, units, quality and coverage still need to be downloaded and validated.                                                                                                                                |
| NASADEM       | Catalog reachable: `NASADEM_HGT`, version `001`, collection `C2763264762-LPCLOUD`.                                                                                                                  | No elevation downloaded and no slope computed.                                                                                                                                                                                     |
| CNE           | The WFS responded and announced `cne:inundaciones`, `cne:deslizamientos`, `cne:coronas_de_deslizamientos` and `cne:Inundaciones_lidar`. The first three returned empty GeoJSON in the queried area. | Approximate area from lon −85.10 to −85.06 and lat 10.78 to 10.82; at most three features per layer. It doesn't prove the absence of risk, complete coverage, valid geometries or intersection with a farm. The service uses HTTP. |

The values above come from downloads made by the checker, not
from the prototype's JSON. No original CNE/RIESGOS files,
IMERG/SMAP rasters or shapefiles were found in the inspected repository. This doesn't
rule out that the team has the originals somewhere else.

## Validation that is performed

- POWER: `PRECTOTCORR` in `mm/day`, dimensionless GWETROOT and UTC days; a
  complete shared 30-day window is required. Negative fill values, nulls, non-finite
  values and wetness outside 0–1 are rejected. Zero precipitation is valid.
- The last valid shared day before the reference date is used. If there is a
  gap in its 30-day window, the sample is rejected, without filling with zeros or
  silently looking for an older window that hides the gap.
- RONI: only the `latest-data` row of the page identified as
  RONI/ERSSTv6 is extracted. Seasons not yet finished are excluded, periods that
  cross the year are handled and `oni.ascii.txt` is not used as a substitute. A structure change
  causes an explicit failure for review.
- URL, download date, observed period and SHA-256 of each response are kept.
- CNE: the WFS response and the basic structure of the GeoJSON collections are checked;
  topology, effective projection and service completeness are not validated.

## Pending before enabling real alerts

1. Check the project account's authorization for Earthdata/GES DISC/NSIDC
   and the download paths. Don't share passwords or tokens in chat or in Git.
2. Download and process IMERG/SMAP and DEM in temporary storage, with
   coverage and unit checks. Don't assume that querying CMR verifies access to the data.
3. Choose and validate the soil source. ISRIC SoilGrids is a candidate,
   not yet queried by this script nor agreed as the project's source.
4. Agree on the comparable baseline for the precipitation anomaly. The sample
   returns `null` for that anomaly; it doesn't compare against an invented constant.
5. Agree on the scientific source, scope and version of each threshold, plus validity
   rules per product. `lagDays` is reported, without arbitrarily classifying
   freshness or converting POWER wetness into SMAP volumetric moisture.
6. Define stable IDs and the SPA-7 contract with the shared Base owners;
   then compute per-subwatershed summaries and verify complete CNE layers.

No risk is assessed, no environmental event is confirmed, and neither the
alerts engine nor the screen were changed in this delivery.

## Tests without network or installs

```sh
python -m unittest discover -s jobs/data-pipeline/tests -p test_source_probe.py -v
```

The test data is synthetic and kept separate from the real downloads.
It covers units and dates, incomplete windows, zeros, fill values, RONI periods,
keeping the last valid result, location protection and network/CNE failures.

## Official documentation

- [NASA POWER, daily API and time standards](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)
- [NOAA CPC, RONI](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/)
- [NASA CMR, search API](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html)
- [NASA, daily IMERG Late](https://gpm.nasa.gov/node/3322)
- [NSIDC, SMAP L4 SPL4SMGP v8](https://nsidc.org/data/spl4smgp/versions/8)
- [CNE, WFS GetCapabilities](http://mapas.cne.go.cr/servicios/cne/wfs?service=WFS&request=GetCapabilities)
- [ISRIC, SoilGrids](https://isric.org/explore/soilgrids)
