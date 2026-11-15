# Field Farms Challenge — Context, decisions and alignment

Nov 14, 2026

## Context

Field Farms Challenge is a web app (PWA) for the "Field Shift: Adapting Farms with NASA Data" challenge of NASA Space Apps 2026, held on November 14 and 15 at TEC in Cartago.

| Topic | Detail |
| --- | --- |
| Client | UNDP (PNUD) Costa Rica, GANAR project (sustainable cattle ranching), Arenal–Huetar Norte Conservation Area |
| Other stakeholders | SINAC (restoration, Forestry Law), AyA and the FLUC (ASADAS), CNE (prevention) |
| Users | Farmers on their phones (sometimes without signal), ASADAS, UNDP and institutional technicians, judges |
| Target awards | Local Impact, Galactic Impact and Best Use of Data |
| Deliverables | Everything in English, a 30 s demo or at most 7 slides, a public link |
| Team | Programs in JavaScript and Python; $0 budget |
| Prototype | Design canvas with the current v10 (Spanish and English) and earlier versions saved |

The earlier name was RotaCuenca. Crop rotation became a future extension; pasture rotation was kept.

## Goal and problem

The goal is to link farms and community water systems (ASADAS) through the watershed view: what a farm does upstream reaches the water the community takes downstream.

The problem we solve, according to the meeting with UNDP:

- Farmers and ASADAS are "two worlds" that don't talk to each other, even though they share the same water.
- More than 70 % of the water is groundwater (springs and wells), so the damage isn't visible until the spring drops.
- Ranchers and ASADAS don't keep flow records, and without data there is no prevention (CNE).
- El Niño 2026 is strong: drought on the Pacific and floods on the Caribbean.
- The farmer doesn't know where to restore or what the Forestry Law requires, and can't afford an agronomist.

Guiding phrases: "Water knows no borders" and "water is sown".

## Decisions made

The central decision was to move from a "crop plan per farm" (v1–v6) to a "watershed view that joins farm and ASADA" (v8–v10), after the meeting with UNDP.

| Decision | Origin | Version |
| --- | --- | --- |
| Go down to ground level with real SNIT data (IGN 1:5 000) and NASA MODIS: "Where to restore" and "Rivers without forest" | Meeting with SINAC | v10 |
| Remove the illustrative layers ("Priority" and the "Greenness" pattern) | Data quality | v10 |
| Simple assistant for low literacy, with voice | UNDP | v9 |
| Alerts with both faces of El Niño and landslides | UNDP | v9 |
| Monthly flow projection for prevention (CNE) | UNDP | v9 |
| ABC guide as the home screen | UNDP | v9 |
| Easy flow records (bucket and stopwatch) for farmer, ASADA and institution | UNDP | v8 |
| Owner actions that protect the water (riparian corridors, springs, Forestry Law) | UNDP | v8 |
| FLUC allies in the app | UNDP (AyA file) | v8 |
| Crop rotation is left for later; pasture rotation is kept | Team + UNDP | v8 |
| Coverage for the whole country, not only Huetar Norte | Team | v8 |
| Separate the NASA layer (global) from the local layer, to replicate in other countries | Team | v8 |
| Name: Field Farms Challenge | Team | v8 |
| Pinch-to-zoom maps and large buttons (accessibility) | Team | v6 |
| Modular PWA: React + TypeScript + Vite; Supabase/PostgreSQL/PostGIS backend; Python for data; monorepo by feature. Replaces the initial Firebase → Supabase suggestion | Team, agreed architecture | base 0.1 |
| Mark in the app which data is real, simulated or illustrative | Team | all |
| The farmer chooses what to share (location, crops, name, phone) | Team | design |
| No Supabase: data in flat files (`public/data/`) published by Python connectors; records go to the repo's `registros/` through a Pages Function | Team, Nov 14 | hackathon |

The v7 design variants (tank, numbers, drop, time machine, voice, neighbors) were saved to decide the style.

## Data we use

Of 14 sources, 12 are real; IMERG/SMAP and the example farms are simulated, and the cantonal anomaly has no confirmed institution.

| Data | Status | What it is for |
| --- | --- | --- |
| NASA POWER: rainfall, temperature, soil moisture (6 points, 1991–Nov 2026) | Real | Weather, length of the dry season, El Niño scenarios |
| NASA MODIS greenness 250 m per zone (2026 vs 2012–2025) | Real | Satellite screen, pasture condition |
| NASA MODIS monthly greenness 1 km, whole country (Nov 2025–Oct 2026 vs 2016–2020) | Real | Where to restore, your area from above |
| NOAA RONI El Niño index (+2.0) and forecast | Real | Alerts and scenarios |
| NASA IMERG (heavy rain) and SMAP (moisture) | Simulated | Flood and landslide alerts |
| SAGA: 1 334 ASADAS, 5 395 sources | Real | Springs, connections, 87 % groundwater |
| Watersheds (34) and subwatersheds (1 868) | Real | Watershed view, upstream and downstream |
| RIESGOS: land use, flooding, landslides, 2014–15 drought | Real | Fragile land, alerts, "this happened in 2015" |
| Rainfall anomaly by canton, Oct 2026 | Real, origin to be confirmed | Alerts by canton |
| FLUC registry (AyA, Oct 21, 2026) | Real | Allies of each ASADA |
| IGN 1:5 000 (2017): rivers, forest, pastures | Real | Rivers without forest (15 m by law) |
| Forestry Law 7575, art. 33 | Real | Protection rules |
| MAG's Plan Prepárate and FAO-56 | Real | Water actions and calculations |
| Farms, neighbors, demo mode, example records, institutional dashboard | Simulated | Show how it works |

To add: SINAC's official recovery plans (links received), SNIT wetlands layer, FONAFIFO Payment for Environmental Services, terrain slope (NASA SRTM), Sentinel-2 or Landsat for finer greenness, real IMERG/SMAP and GLDAS to validate against 2015.

## Pending decisions

The most urgent is the demo format (video or slides), because it is delivered in English before the November 15 deadline.

| Decision | Options | Who decides |
| --- | --- | --- |
| Demo format | 30 s video or up to 7 slides | Team |
| What to use from the SINAC plans | Official priority zones, species per zone, restoration targets | Team, after reviewing the links |
| Add the wetlands layer | Yes in v11 or leave it for later | Team |
| Show savings and support for the farmer | Payment for Environmental Services (FONAFIFO), farm plan savings | Team + SINAC |
| Connect real IMERG and SMAP | Do it during the hackathon (Earthdata account) or keep it simulated | Team |
| Final design style | One of the 6 v7 variants or the current style | Team |
| Build the architecture | Decided: modular navigable base with demo data; Supabase persistence and Python jobs in stages | Team |
| Official GANAR figures (hectares, farms) | Ask UNDP | UNDP |
| Origin of the cantonal rainfall file | Confirm whether it is from IMN | Team |
| Validate with a family in Canaán de Rivas (dairy) | Interview or usability test | Team |
| What to leave out so it isn't overwhelming | Cut screens (weather, crop plan, neighbors) | Team |

## Alignment with the goal

We are well aligned on the watershed view and on farm actions; the biggest gap is the real bridge between farmer and ASADA, which today exists mostly in the pitch and in simulated data.

| Goal pillar | Level | What exists | What is missing |
| --- | --- | --- | --- |
| Watershed view (where the water starts, upstream affects downstream) | High | Subwatershed of each farm, "Where your water starts" section, springs and downstream connections | Show the water's path from a specific farm to a specific ASADA |
| Owner actions that protect drinking water | High | Care, Forestry Law, springs at risk, rivers without forest and where to restore with real data | SINAC's official species and zones |
| Use of NASA data | High | POWER, MODIS 250 m and 1 km for the whole country, RONI | Real IMERG and SMAP |
| Join farmers and ASADAS | Medium | Roles in records, notice to farms and ASADAS (simulated), FLUC allies | A shared space: the ASADA sees what the farms in its recharge area do and responds |
| Easy flow records | Medium | Bucket calculator, chart, monthly projection | Really save and share (no server yet) |
| Prevention (CNE, El Niño) | Medium | Drought, flood and landslide alerts; 2014–15 history | Real rainfall and moisture; validate against 2015 |
| Easy for low literacy | Medium | ABC guide, voice assistant, large buttons | Test it with real farmers |
| Replicable in other countries | Medium | NASA layer separate from the local layer | Show it with a second country or watershed |

Focus risk: screens like weather, crop plan and neighbors don't serve the goal directly and can overwhelm the demo.

## Next steps

Implementation update: the navigable base keeps the v10 prototype in `references/prototype-v10.html`. The web app uses typed examples and the documented support catalog; it does not imply authentication, sync or connected NASA data. See `README.md` and `docs/architecture.md` for the current technical state.

- [ ] Review the SINAC links and choose what goes into the app
- [ ] Design the farm–ASADA bridge: a view where the ASADA sees the farms in its recharge area and what they do
- [ ] Decide which screens are cut for the demo
- [ ] Validate Arenal's "Where to restore" with the SINAC contact
- [ ] Choose the demo format and prepare the material in English
- [ ] Ask UNDP for the official GANAR figures
