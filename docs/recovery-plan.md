# Recovery plan

The `/care` route uses the real farm chosen in My farm. It does not use simulated scenarios or the
prototype's numeric priorities. The maps and the previous action states are kept.

## Local tracking

IndexedDB `ffc-recovery`, store `plans`, separates plans by SIRI identifier. Without a parcel,
the active location keeps a stable provisional identifier even if the GPS changes.
Old locations keep their point key as a provisional identifier so existing plans can still
be found. "Register another farm" starts a new identity.
If a parcel appears for that same point,
the view offers to copy the provisional plan after confirmation; the original is kept.
The profile is confirmed when the plan is created. Later changes to the global profile do not rewrite
the confirmed profile of another plan.

My farm first shows a summary of the record, with shortcuts to the plan and the watershed, data
editing and deletion. "Delete record" asks for confirmation and removes the profile, the location and the
associated plan (including its known provisional copy), with its photos and expenses. Other plans
are kept. If clearing the profile fails, it tries to restore the deleted plans.

The plan lets users edit the goal, deadline, place and budget. The unit is locked once
measurements exist, so earlier records are not reinterpreted. Progress entries let users correct the date,
amount, note and expense without losing the photos. The JSON backup includes encoded photos and can
be restored after confirmation: it replaces the current plan and does not add duplicate expenses. Invalid
files and backups from a different cadastral parcel are rejected. A provisional backup can
be explicitly linked to the current farm. Imports accept files up to 50 MB.

Amounts are cumulative up to the given date: progress uses the latest measurement and does not add up
repeated measurements. If two records have the same date, the one added last wins.
Expenses are added up. Completing a task does not prove environmental recovery.
Three photos are accepted per record, JPG/PNG/WebP up to 20 MB each. They are resized to
1600 pixels and stored as JPEG, along with notes and expenses. Save failures don't show
success or clear the form. Printing lets users share a summary, with no automatic sending.
Clearing the browser's data also removes these plans: there is no remote sync.

The text is in `features/restoration/recovery-copy.ts`, with Spanish and English versions
checked by TypeScript. Persisted identifiers, answers and units don't depend on
the language. The styles use the tokens of both themes.

## Available data

`public/data/recovery/rainfall.json` was added, downloaded directly from NASA POWER:
42 points of its native meteorological grid, November 2024 to October 2026.
Each monthly total requires every day to have valid data. Regional requests are split
into intervals of up to 366 days, the API limit. The view picks the nearest regional
reference; it does not present it as a rain gauge on the parcel or as the watershed average.

The existing 90 days of POWER are also used. CNE and SINAC only provide matches
with partial Huetar Norte mapping: simplified flood-potential polygons
and historical outlines of protected areas. Not finding a match does not prove
the absence of risk or restrictions. The IMERG/SMAP examples are excluded.

## Manual MODIS and rainfall preparation

From the root, in PowerShell:

```powershell
py -3.13 -m venv jobs/data-pipeline/.venv
& jobs/data-pipeline/.venv/Scripts/python.exe -m pip install -e 'jobs/data-pipeline[test,recovery]'
& jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.recovery --rainfall-only
```

The command uses the last 24 full months before the month it runs in. To reproduce
this delivery, add `--start 2024-11-01 --end 2026-10-31`.

MODIS requires an Earthdata account enabled in AppEEARS. Set credentials only
in the local session, never in the frontend, versioned files or messages:

```powershell
$env:EARTHDATA_USERNAME = Read-Host 'Earthdata username'
$env:EARTHDATA_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Earthdata password' -AsSecureString)).Password
& jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.recovery --request
# The command returns the ID and the dates to resume the same request:
& jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.recovery --task ID --start 2024-11-01 --end 2026-10-31
Remove-Item Env:EARTHDATA_USERNAME, Env:EARTHDATA_PASSWORD
```

AppEEARS processes the request asynchronously. Repeat `--task` while it reports that it is still
pending; no waiting process is kept running and no scheduled task is added.
Alternatively, import AppEEARS GeoTIFFs with `--input <folder>` and explicit dates.
MOD13Q1.061 NDVI, VI Quality and pixel reliability are requested in geographic projection.

The importer keeps land with good QA, without adjacent/mixed clouds, shadows, snow or
high aerosols. It respects the valid NDVI range [-0.2, 1], including negative values. It produces
monthly medians, area-weighted series per watershed and JSON tiles for 5 km queries.
Spatial inclusion uses pixel centers, an approximation suited to this regional
context, not a delineation of restoration strips. Tile size is not confused with
observation resolution. Rainfall keeps its original regional grid.

NDVI comparisons use the same month of the previous year and shared valid pixels that cover
at least 80 % of the area. That threshold is about availability, not degradation.
The manifest is published after the tiles. The original files stay ignored
in `jobs/data-pipeline/data/`. The `recovery/history.json` route only appears after importing real
data; while it is missing, the view says the vegetation data is pending.

On November 15, 2026 the AppEEARS import made by the team was checked:
24 months (November 2024 to October 2026), series for 34 watersheds and 310 tiles,
with no missing files and no NDVI values outside the product range. The public POWER
acquisition is also included. Tests with synthetic rasters are kept separate
from these real files. A manual visual review of the interface is still pending.

## Validation

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and
`jobs/data-pipeline/.venv/Scripts/python.exe -m pytest jobs/data-pipeline/tests`.
The follow-up review used the Playwright CLI with Edge: manual registration of a farm,
creating a goal and a progress entry with photo/expense, persistence on reload, form reset,
Spanish/English, light/dark themes and adaptation to 390 px. Screenshots were reviewed in
`output/playwright/`. Impeccable stays disabled. Earthdata has already been imported.

Startup no longer loads an example profile automatically. Old records named
"Finja Ejemplo" or "Finca Ejemplo" are ignored as leftovers; a farm registered again
through the form carries an explicit version and can keep any name.
"Register another farm" empties the active profile and location, keeping the plans per parcel.
The new Sources entries show the real period and date of MODIS and POWER.
