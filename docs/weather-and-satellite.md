# Weather and satellite

The `/environment` screen combines the subwatershed history viewer from `dev`, real geographic maps and the indicators published in `/data/`. It reuses the contract, the catalog and the POWER/RONI files from the data ticket (commit `8e43a8c`). The connectors and the My farm and My watershed maps are not changed.

## Viewers and sources

- **My subwatershed:** brings back the time playback of the regional 2026 MODIS history in `src/data/real/climate.json`, with the same cloud-cleaning engine as the prototype. The grid inside the outline is illustrative and labeled as such; it does not represent pixels measured on the farm. The visual refinement of its cells adds no measurements.
- **Satellite imagery:** Esri World Imagery as the base, plus NASA GIBS geographic layers for MODIS greenness, IMERG rainfall, MODIS land surface temperature and SMAP surface/root-zone moisture. These public images do not require an Earthdata account. Dates and cadences are read from GetCapabilities; no dates are invented for the animation.
- **Temperature:** `MODIS_Terra_L3_Land_Surface_Temp_8Day_Day`, an eight-day composite, is used. The date is the start of the period and the official scale is in kelvin. The daily layer for November 15 was checked and was fully transparent over Costa Rica; the composite avoids that gap while keeping its real date. If a query has no valid pixels, the viewer says so.
- **Elevation:** Terrain Tiles Terrarium, with SRTM and other sources. Real meters per pixel are decoded and a hypsometric scale shared with the legend is applied. The 3D geometry is exaggerated 1.3 times; the elevation number is corrected to show meters, not the exaggerated height.
- The farm is marked on every layer and its parcel is drawn when it exists. The selected watersheds include the point and those that intersect the parcel, using the same rules as My watershed. Switching between vegetation and elevation keeps the map and the remembered date of each layer.
- Smoothing only interpolates the edges visually: it does not increase the product's resolution (MODIS NDVI about 250 m, temperature 1 km, SMAP 9 km, IMERG about 10 km). "Fit scale" lets the on-screen pixel size be reduced.

Primary documentation: [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/), [Terrain Tiles and the Terrarium format](https://github.com/tilezen/joerd/blob/master/docs/formats.md).

- POWER available: 7- and 30-day accumulated rainfall, 1991–2020 baseline, anomaly, average maximum temperature and root-zone moisture. The included file has observations up to November 11, 2026 and a 90-day daily series per zone.
- NOAA RONI available: rolling-season index and climate signal, with its own date and equatorial Pacific coverage. The included file runs to October 31, 2026.
- Updated numeric MODIS: `nasa/modis/latest.json` is read once the connector publishes it. Its absence does not prevent browsing the regional history or the GIBS imagery, and is not presented as the absence of all MODIS data.
- The simulated IMERG/SMAP examples are not used for the indicators. Their visual layers are real NASA GIBS imagery and do not artificially fill the POWER cards.

Exploring the maps does not require selecting a farm. The POWER indicators do require a farm: its location determines the region using the app's same territorial dataset. The coordinates of the reference point and its approximate distance to the farm are shown. The six regional points are not measurements inside the parcel nor a daily forecast.

## Integration with the Recovery plan

The shared reader keeps `powerHistory` for the 24 months of recovery rainfall and
accepts `refresh` to fetch the weather observations and their catalog again. The catalog
keeps both the regional NASA/NOAA sources and `recovery-power` and `recovery-history`.
The POWER and RONI files of both branches contain the same observations; their content
and date are kept, without turning the merge date into an environmental update.

Weather and satellite lets users explore public imagery without registering a profile. Without a location,
it opens the general map and does not produce a history for the prototype's default location.
The My subwatershed option asks to select the farm before showing its regional history.
The Recovery plan keeps its profile confirmation and its private goals per parcel.
The recovery histories stay separate from the regional ORNL connector and from the
GIBS visual layers; the absence of `nasa/modis/latest.json` does not erase the AppEEARS data.

Each indicator keeps its observation date. The source details also show the file's publication date, the data's age and the original link. If the catalog reports a failure but a valid file exists, it is shown as the last available data. Each source loads separately: a MODIS failure does not hide POWER or NOAA. "Fetch again" requests the files again. Observations already visited are stored by the service worker for offline use, keeping their original dates.

Files must follow the contract, identify the expected source, come from its official domain and declare non-simulated data. Impossible dates, non-numeric series, inconsistent sources or duplicated units are rejected. A missing value is shown as "No data available"; a real zero is still zero.

The explanations compare the published indicators with their historical baseline. They do not turn a regional anomaly into a confirmation of drought, flooding or pasture loss on the farm. Moisture is an index from 0 to 1, not a percentage of volumetric content. The global simulation mode does not change this data.

Verification: `npm test`, `npm run typecheck`, `npm run lint` and `npm run test:e2e -- tests/e2e/environment.spec.ts`. The MODIS test uses a controlled response only inside the test to check the behavior when the file exists.
