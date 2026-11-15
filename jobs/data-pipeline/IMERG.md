# Daily IMERG connector: preparation for flooding (SPA-28 → SPA-32)

Implementation prepared with tests that need no credentials. The authenticated download
**has not yet been validated with the project account**. No flood rule has been
enabled and the data on the current screen has not been replaced.

## Files and responsibility

- `providers/imerg.py`: searches granules in CMR, requires seven consecutive days of
  IMERG **Late V07**, validates daily UTC intervals and uses the OPeNDAP link
  NASA announces. It doesn't build a V07B/V07C name by guessing the file version.
- `transforms/imerg.py`: validates NetCDF, crops to the extent of the subwatersheds
  and computes spatial averages weighted by intersection areas.
- `publish/imerg.py`: coordinates the job, keeps the last valid output,
  writes small summaries and the attempt status. It doesn't confirm events or
  assign risk severity.
- `.github/workflows/imerg.yml`: tests Python on PRs and prepares JSON on manual/scheduled
  runs. It only uploads an artifact for review; it doesn't commit,
  push or deploy. It has not been run on GitHub from this session.

## Local installation

**netCDF4 was added as an optional extra**, to read the server's binary crops
without implementing a custom DAP decoder. NumPy is a transitive
dependency. Shapely and PyProj were already part of the project.

From the root, in PowerShell:

```powershell
python -m venv jobs/data-pipeline/.venv
jobs/data-pipeline/.venv/Scripts/python.exe -m pip install -e "jobs/data-pipeline[imerg,test]"
jobs/data-pipeline/.venv/Scripts/python.exe -m pytest jobs/data-pipeline/tests -q
```

In Git Bash, the executable of the same Windows environment is:

```bash
jobs/data-pipeline/.venv/Scripts/python.exe -m pytest jobs/data-pipeline/tests -q
```

The virtual environment is local and ignored by Git.

## What can be tested without an account

```bash
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.imerg --discover-only --as-of 2026-11-15
```

It queries public metadata, without downloading rainfall. It produces `discovery.json` and
`status.json` in `jobs/data-pipeline/data/imerg/` (ignored by Git). The
`discovered-only` status **does not mean Earthdata is authorized**.

In the public query of Nov 15, 2026, the latest listed granule was for
**Nov 13**, file V07C, collection `C2723754859-GES_DISC`. The full raster
reading test is pending until authorization is in place.

## Earthdata authorization

1. Create or use the project account in [Earthdata Login](https://urs.earthdata.nasa.gov/).
2. Authorize GES DISC access following [its official instructions](https://disc.gsfc.nasa.gov/data-access).
3. Create a user token and provide it through `EARTHDATA_TOKEN` in the
   process that runs Python. Don't put it in versioned files, arguments,
   screenshots or messages. The program doesn't print or store the token and rejects
   redirects so it isn't sent to another origin.
4. For GitHub Actions, set the repository secret `EARTHDATA_TOKEN`.
   Having the secret doesn't replace the account's authorization in GES DISC.

To enter the token in PowerShell without writing it in plain text in the
history, you can use:

```powershell
$earthdataSecure = Read-Host 'Earthdata token' -AsSecureString
$earthdataCredential = [System.Net.NetworkCredential]::new('', $earthdataSecure)
$env:EARTHDATA_TOKEN = $earthdataCredential.Password
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.imerg
Remove-Item Env:EARTHDATA_TOKEN
Remove-Variable earthdataCredential, earthdataSecure
```

In Git Bash:

```bash
read -r -s -p 'Earthdata token: ' EARTHDATA_TOKEN
echo
export EARTHDATA_TOKEN
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.imerg
unset EARTHDATA_TOKEN
```

If the token is missing, the job writes `status: blocked`, reason
`earthdata-token-missing`, exits with code 2 and keeps any `latest.json`.

## Running and publishing

The default output is local, inside `jobs/data-pipeline/data/imerg/`:

```text
discovery.json        # Only when --discover-only is used
status.json           # Attempt status: ok, blocked, failed or discovered-only
YYYY-MM-DD.json       # Summary dated by the last observed day
latest.json           # Last valid summary
```

To prepare the JSON in the location the frontend expects, once the real
download has been reviewed and the format coordinated with the shared Base:

```bash
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.imerg --out apps/web/public/data/nasa/imerg
```

That local publication was not run in this delivery. The
`imerg-subbasins-v1` format is provider-specific: it does not replace SPA-7.
Each subwatershed uses an ID derived from its normalized geometry; the full
fingerprint and the version of the geographic set are kept. Changing geometries
can change the IDs: they need an explicit mapping to the map and the
old engine before the screen is integrated.

`latest.json` contains:

- Product, collection, version, 0.1° resolution, provisional Late status.
- `origin: estimated` and `dataMode: real`: satellite estimates from the real
  source, not rain gauge measurements or simulated data.
- Observed UTC period and generation date, kept separate.
- URL, ID, revision, response fingerprint and numeric fingerprint of each granule.
- Geometry version and calculation method.
- Per subwatershed: `rain1d` and `rain7d` with value, unit, period, status and fraction
  of valid area. `null` means there is not enough information.

`status.json` has the date of the attempt and its results. A failure updates that
status, **not the date of the earlier data**. The delay is reported in days; no
expiry threshold is invented. The consumer must assess validity even if the
last attempt succeeded. There is no global `fuentes.json` file because
its format has not been agreed yet.

## Method and checks

1. CMR searches the last three weeks up to the reference date. It picks the
   week ending on the last published day, without assuming yesterday's data
   exists. If a day is missing within that week, it fails; it doesn't silently look for
   another, older week.
2. The DAP4 schema determines the order of the dimensions. Coordinates and time are downloaded and inspected
   before requesting the cropped `precipitation`. Only the
   orders `time,lon,lat` and `time,lat,lon` are accepted.
3. The ascending 0.1° grid and its coverage are validated. The boundaries between cells
   are computed with midpoints to avoid gaps from float32 rounding.
4. Intersections between subwatershed and cell are computed in WGS84 and their areas
   in **EPSG:5367**, reusing the existing geographic utilities. The weights
   are normalized by the sum of intersection areas. Neither the centroid
   nor a simple average of the pixels is used as the subwatershed average.
5. The daily variable must be expressed in `mm/day`; each record covers a full
   day. Its daily depth in mm is accumulated directly: **it is not multiplied
   by 24 again**. Fill values, negatives and non-finite values are missing;
   zero is valid precipitation.
6. Valid information is required in every pixel with positive area for each
   indicator. If a pixel is missing a day, `rain7d` is unavailable. `rain1d`
   can still be available if the last day is complete. The valid fraction
   is reported for diagnosis, without extrapolating the rest.
7. The week uses the same grid and geographic support; any grid change
   during the period makes the update fail.
8. No rasters are saved to disk: coordinates and crops live in memory,
   limited to 8 MiB per response. Only JSON is written. No farms or
   simulated data are created in `public/data/`.
9. Publishing `latest.json` is atomic. Older data doesn't
   replace newer data. If the numeric inputs, revision and geometries don't change,
   the output is kept to avoid duplicates from regenerating the NetCDF.

The 1,868 versioned geometries were read and their weights computed on a
**synthetic** grid equivalent to IMERG: a crop of 33 × 35 cells. That test
checks the geographic calculation, **not the download or real rainfall observations**.
The data and thresholds in the unit tests are synthetic and are not published.

## Limitations that prevent closing SPA-28/SPA-32

- Validate a real authenticated download against the published DAP4/NetCDF format.
  If NASA delivers a different schema or redirects, the connector fails explicitly.
- Agree on the SPA-7 contract and IDs with the shared Base owners.
- Complete the coverage and overlay of the CNE layers with farm/subwatershed.
- Document and agree on the flood and validity rules. No threshold has
  been inferred from the examples or from the RONI index.
- Integrate loading, status, dates, explanations and language into the screen. The
  prepared Action only produces artifacts; automatically publishing to the repo
  or deploying requires additional authorization.

## Primary references

- [NASA, daily IMERG Late product](https://doi.org/10.5067/GPM/IMERGDL/DAY/07)
- [NASA, precipitation data directory](https://gpm.nasa.gov/data/directory)
- [NASA GES DISC, official OPeNDAP and token tutorial](https://github.com/nasa/gesdisc-tutorials/blob/main/notebooks/How_To_Download_a_Spatial_and_Variable_Subset_of_Level_1B_Data_Using_OPeNDAP.ipynb)
- [NASA CMR, API](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html)
