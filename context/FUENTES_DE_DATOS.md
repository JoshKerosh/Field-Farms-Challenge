# Field Farms Challenge · Fuentes de datos

Actualizado: 14 nov 2026. Estado: **Real** (dato oficial descargado), **Pendiente** (conector por hacer), **Simulado** (de ejemplo en la app), **Falló** (servidor caído al descargar).

## NASA y NOAA

| Dato | Institución | Origen (servicio o enlace) | Archivo descargado | Cómo se obtuvo | Estado |
| --- | --- | --- | --- | --- | --- |
| Clima: lluvia, temperatura, humedad del suelo | NASA POWER | `https://power.larc.nasa.gov/api/temporal` (comunidad AG; mensual 1991–2025 y diario 2026-01-01 a 2026-11-10) | `02_nasa_noaa/NASA_POWER_y_NOAA_RONI_app.json`, `nasa_power_regiones.json` | API, 6 puntos de referencia | Real |
| Verdor 250 m por zona (MOD13Q1 v061) | NASA, vía ORNL DAAC | `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset` · https://doi.org/10.5067/MODIS/MOD13Q1.061 | `02_nasa_noaa/NASA_MODIS_250m_por_zona_app.json`, `nasa_modis_ndvi.json` | API, cada 16 días (2026 vs 2012–2025) | Real |
| Verdor mensual 1 km, todo el país (MOD13A3 v061) | NASA, vía GIBS | `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`, capa `MODIS_Terra_L3_NDVI_Monthly` · https://doi.org/10.5067/MODIS/MOD13A3.061 | `03_v10_orillas_y_verdor/orillas_y_verdor_1.5km.csv` (columnas NDVI) | Imágenes WMS traducidas a valores con la tabla de colores oficial `MODIS_L3_NDVI.xml`; 72 meses (2016–2020 y nov 2025–oct 2026) | Real |
| Lluvia diaria IMERG Late v07 | NASA GES DISC | `https://gpm1.gesdisc.eosdis.nasa.gov/opendap/GPM_L3/GPM_3IMERGDL.07/` (último archivo: 13 nov 2026) | Pendiente | OPeNDAP con Earthdata; falta autorizar la app «NASA GESDISC DATA ARCHIVE» | Pendiente (simulado en la app) |
| Humedad del suelo SMAP L4 (SPL4SMGP) | NASA NSIDC | https://nsidc.org/data/spl4smgp | Pendiente | Earthdata | Pendiente (simulado en la app) |
| Índice de El Niño (RONI, ONI) | NOAA Climate Prediction Center | https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni · https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt | `02_nasa_noaa/NASA_POWER_y_NOAA_RONI_app.json` | Archivo de texto, consultado 13 nov 2026 | Real |
| Perspectiva de El Niño | NOAA CPC | Citado vía Infobae (10 nov 2026); reemplazar por la página de NOAA CPC | Sin archivo | Nota de prensa | Real (cita por mejorar) |

## Costa Rica · servicios oficiales (descargados el 14 nov 2026)

| Dato | Institución | Origen | Archivo descargado | Capas | Estado |
| --- | --- | --- | --- | --- | --- |
| Ríos, bosque y potreros 1:5 000 (2017) | Instituto Geográfico Nacional (IGN) | SNIT · `https://geos.snitcr.go.cr/be/IGN_5/wms` | `03_v10_orillas_y_verdor/orillas_y_verdor_1.5km.csv` (columnas de orilla) | `hidrografia_5000`, `forestal2017_5k`, `pastos2017_5k` | Real |
| Zonas con potencial de inundación | Comisión Nacional de Emergencias (CNE) | `http://mapas.cne.go.cr/servicios/cne/wfs` (nodo CNE del SNIT) | `04_snit_huetar_norte/CNE_zonas_potencial_inundacion.geojson` | `cne:inundaciones` | Real |
| Deslizamientos y coronas | CNE | `http://mapas.cne.go.cr/servicios/cne/wfs` | `04_snit_huetar_norte/CNE_deslizamientos_centroides.geojson`, `CNE_coronas_deslizamiento_centroides.geojson` | `cne:deslizamientos`, `cne:coronas_de_deslizamientos` | Real |
| Áreas silvestres protegidas y áreas de conservación (fichas) | SINAC | `https://geos1pne.sirefor.go.cr/wfs`, leído a través del SNIT | `04_snit_huetar_norte/ACAHN_areas_protegidas_fichas_SINAC.csv` | `areas_silvestres_protegidas`, `areas_conservacion` | Real (solo atributos; la geometría no respondió) |
| Pago por Servicios Ambientales | FONAFIFO | `https://geodatos.sinia.go.cr/geoserver/FONAFIFO/wfs` | No se pudo bajar | `psa2019` a `psa2025` | Falló (error 502) |
| Catálogo de servicios | IGN · SNIT | https://www.snitcr.go.cr/ico_servicios_ogc | — | — | Referencia |

## Costa Rica · archivos recibidos

| Dato | Institución | Origen | Archivo descargado | Estado |
| --- | --- | --- | --- | --- |
| ASADAS y fuentes de agua (1 334 operadores, 5 395 fuentes) | AyA · SAGA | Archivo entregado por el equipo | `01_originales/SAGA_Operadores_y_Fuentes_Ubicaciones.xlsx` | Real |
| Registro de FLUC (federaciones, ligas, uniones) | AyA | Compartido por PNUD | `01_originales/FLUC_AyA_2026-10-21.xlsx` | Real |
| Cuencas hidrográficas (34) | MINAE | Archivo del equipo; versión oficial en el SNIT (CENIGA, `cuencas_hidrograficas`) | `01_originales/cuencas_hidrograficas/cuencas_hidrograficas.shp` | Real |
| Subcuencas (1 868) | Por confirmar | Archivo entregado por el equipo | `01_originales/subcuencas/Subcuencas_CRTM05.shp` | Real, origen por confirmar |
| Uso de la tierra, inundación, deslizamientos, flujos de lodo, sequía 2014–15, áreas protegidas (MINAET), geología | Varias (CNE, MINAET) | Archivo entregado por el equipo | `01_originales/RIESGOS_datosabiertos.zip` | Real, origen por confirmar |
| Anomalía de lluvia por cantón, octubre 2026 | Por confirmar (¿IMN?) | Archivo entregado por el equipo | `01_originales/Anomalia_lluvia_cantonal_octubre2026.xlsx` | Real, origen por confirmar |

## Normas y métodos

| Tema | Fuente |
| --- | --- |
| Ley Forestal 7575, artículo 33 (100 m nacientes; 15 m rural / 10 m urbano en ríos de terreno plano; 50 m en terreno quebrado) | https://faolex.fao.org/docs/pdf/cos7778.pdf |
| Cálculo de agua para cultivos y pastos (FAO-56, Hargreaves) | https://www.fao.org/3/x0490s |
| Acciones «Prepárate» del MAG | La Nación, 25 set 2026; reemplazar por la página oficial del MAG |

## Simulado en la app

| Dato | Motivo |
| --- | --- |
| Lluvia fuerte (IMERG) y humedad del suelo (SMAP) en alertas | Conectores pendientes |
| Fincas de ejemplo, vecinos y modo demo | Mostrar el funcionamiento sin datos personales |
| Registros de caudal de ejemplo y tablero institucional | Ídem |

## Pendientes

- Confirmar el origen de las subcuencas, del paquete RIESGOS y de la anomalía de lluvia por cantón.
- Autorizar «NASA GESDISC DATA ARCHIVE» en Earthdata y conectar IMERG; conectar SMAP.
- Reintentar FONAFIFO y la geometría del SINAC.
- Revisar las condiciones de uso de las capas del SNIT marcadas «capa oficial: NO».

## Tabla de trabajo: dato, archivo, uso, descarga y conexión

Nombres de archivo según el paquete `FFC_datos.zip`. «Descarga» es de donde se baja el archivo o la copia; «Conexión» es el servicio que debe usar el conector del backend para actualizarlo solo.

| Dato | Fuente | Archivo descargado | Para qué lo usamos | Descarga | Conexión (conector) |
| --- | --- | --- | --- | --- | --- |
| Clima: lluvia, temperatura, humedad del suelo | NASA POWER | `02_nasa_noaa/NASA_POWER_y_NOAA_RONI_app.json` | Clima, largo del verano, escenarios de El Niño, barras de lluvia del caudal | https://power.larc.nasa.gov/data-access-viewer/ | API REST: `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M_MAX,T2M_MIN,GWETROOT&community=AG&latitude=..&longitude=..&start=..&end=..&format=JSON` (sin clave) |
| Índice de El Niño (RONI y ONI) | NOAA CPC | `02_nasa_noaa/NASA_POWER_y_NOAA_RONI_app.json` | Fuerza de El Niño y alertas | https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni | Archivo de texto: `https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt` y la tabla RONI de la misma página (mensual) |
| Verdor 250 m por zona (MOD13Q1) | NASA, ORNL DAAC | `02_nasa_noaa/NASA_MODIS_250m_por_zona_app.json` | Pantalla Satélite | https://modis.ornl.gov/globalsubset/ | API REST: `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=..&longitude=..&startDate=..&endDate=..&kmAboveBelow=..&kmLeftRight=..` (sin clave) |
| Verdor mensual 1 km, todo el país (MOD13A3) | NASA (GIBS / LP DAAC) | `03_v10_orillas_y_verdor/orillas_y_verdor_1.5km.csv` | Dónde restaurar, tu zona desde arriba | https://search.earthdata.nasa.gov (colección MOD13A3 v061) | Para mostrar: WMS `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi` capa `MODIS_Terra_L3_NDVI_Monthly`. Para calcular: LP DAAC con Earthdata (`earthaccess`, colección `MOD13A3` v061) o AppEEARS API `https://appeears.earthdatacloud.nasa.gov/api/` |
| Ríos, bosque y potreros 1:5 000 (2017) | IGN, SNIT | `03_v10_orillas_y_verdor/orillas_y_verdor_1.5km.csv` | Ríos sin bosque | https://www.snitcr.go.cr/ico_servicios_ogc (nodo IGN 1:5 000) | WMS/WFS `https://geos.snitcr.go.cr/be/IGN_5/wms` y `/wfs`, capas `hidrografia_5000`, `forestal2017_5k`, `pastos2017_5k` (copia con versión; cambia poco) |
| ASADAS y fuentes de agua | AyA (SAGA) | `01_originales/SAGA_Operadores_y_Fuentes_Ubicaciones.xlsx` | Nacientes, conexiones, riesgo | Archivo entregado por el equipo | SNIT, nodo AyA-ASADAS: capas `AyA_SNIT_ASADAS:EntesOperadores`, `AyA_SNIT_ASADAS:Coberturas_ASADAS`, `AyA_SNIT_ASADAS:Comunidades` (WFS; confirmar URL en la ficha del nodo) |
| Federaciones, ligas y uniones (FLUC) | AyA | `01_originales/FLUC_AyA_2026-10-21.xlsx` · `05_procesados_app/fluc.json` | Aliados de cada ASADA | Archivo compartido por PNUD | Sin servicio público conocido: pedir actualización periódica al AyA |
| Región del AyA por cantón | AyA | `05_procesados_app/canreg.json` | Unir ASADA con su FLUC | Hecho por el equipo | No aplica (tabla fija) |
| Cuencas hidrográficas (34) | MINAE (CENIGA) | `01_originales/cuencas_hidrograficas/` | Visión de cuenca | Archivo entregado por el equipo | SNIT, nodo CENIGA: capa `CENIGA:cuencas_hidrograficas` (WFS; copia con versión) |
| Subcuencas (1 868) | Por confirmar | `01_originales/subcuencas/` | Ubicar la finca y el plan por subcuenca | Archivo entregado por el equipo | Por confirmar (buscar versión oficial en el SNIT) |
| Cuadrícula nacional 3 km | Equipo | `05_procesados_app/grilla_nacional_cuencas_3km.json` | Consulta rápida de cuenca, uso, inundación y cantón | Generada | Se recalcula en el backend con PostGIS |
| Capacidad de uso de la tierra | Paquete RIESGOS | `01_originales/RIESGOS_datosabiertos.zip` (`CR_capacidad_deUSO.shp`) | Tierra frágil | Archivo entregado por el equipo | Por confirmar en el SNIT (MAG / INTA) |
| Zonas inundables (país) | Paquete RIESGOS / CNE | `01_originales/RIESGOS_datosabiertos.zip` (`inunwgs84.shp`) | Alertas de inundación | Archivo entregado por el equipo | WFS `http://mapas.cne.go.cr/servicios/cne/wfs`, capa `cne:inundaciones` |
| Deslizamientos y flujos de lodo (país) | Paquete RIESGOS / CNE | `01_originales/RIESGOS_datosabiertos.zip` (`Movimientos_en_Masa/`) | Alertas de deslizamiento | Archivo entregado por el equipo | WFS `http://mapas.cne.go.cr/servicios/cne/wfs`, capas `cne:deslizamientos`, `cne:coronas_de_deslizamientos` |
| Sequía 2014–15 | Paquete RIESGOS | `01_originales/RIESGOS_datosabiertos.zip` · `05_procesados_app/hist.json` | «Esto ya pasó en tu zona» | Archivo entregado por el equipo | No aplica (histórico fijo) |
| Anomalía de lluvia por cantón | Por confirmar (¿IMN?) | `01_originales/Anomalia_lluvia_cantonal_octubre2026.xlsx` | Alertas por cantón | Archivo entregado por el equipo | Por confirmar con el IMN; alternativa propia: calcular con IMERG por cantón |
| Inundación Huetar Norte | CNE, vía SNIT | `04_snit_huetar_norte/CNE_zonas_potencial_inundacion.geojson` | Mapa Huetar Norte | `http://mapas.cne.go.cr/servicios/cne/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=cne:inundaciones&outputFormat=application/json` | Mismo WFS |
| Deslizamientos Huetar Norte | CNE, vía SNIT | `04_snit_huetar_norte/CNE_deslizamientos_centroides.geojson`, `CNE_coronas_deslizamiento_centroides.geojson` | Mapa Huetar Norte | Mismo WFS, `typeName=cne:deslizamientos` y `cne:coronas_de_deslizamientos` | Mismo WFS |
| Áreas protegidas ACAHN (fichas) | SINAC, vía SNIT | `04_snit_huetar_norte/ACAHN_areas_protegidas_fichas_SINAC.csv` | Lista oficial de áreas protegidas | https://www.snitcr.go.cr/ico_servicios_ogc (nodo SINAC) | WFS `https://geos1pne.sirefor.go.cr/wfs`, capas `areas_silvestres_protegidas`, `areas_conservacion`; también `Registro Nacional de Humedales`, `cobertura_forestal_2023`, `corredoresbiologicos` |
| Contornos de áreas protegidas | MINAET (RIESGOS) | `04_snit_huetar_norte/ACAHN_areas_protegidas_contornos.geojson` | Dibujarlas en el mapa | Archivo entregado por el equipo | Reemplazar por la geometría del WFS del SINAC |
| Ley Forestal 7575, art. 33 | FAOLEX | Sin archivo | Franjas de protección | https://faolex.fao.org/docs/pdf/cos7778.pdf | No aplica (regla fija en el código) |
| Método FAO-56 | FAO | Sin archivo | Agua de suelo y pasto | https://www.fao.org/3/x0490s | No aplica (fórmula en el código) |
| Lluvia diaria IMERG Late v07 | NASA GES DISC | Pendiente | Alertas de lluvia fuerte | https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDL_07/summary | OPeNDAP con Earthdata: `https://gpm1.gesdisc.eosdis.nasa.gov/opendap/GPM_L3/GPM_3IMERGDL.07/AAAA/MM/3B-DAY-L.MS.MRG.3IMERG.AAAAMMDD-S000000-E235959.V07C.nc4` (recorte Costa Rica: `precipitation[0][940:974][980:1012]`) o `earthaccess` con colección `GPM_3IMERGDL` |
| Humedad del suelo SMAP L4 | NASA NSIDC | Pendiente | Alertas de suelo saturado | https://nsidc.org/data/spl4smgp | `earthaccess` con colección `SPL4SMGP` (Earthdata), o NSIDC data access API |
| Pago por Servicios Ambientales | FONAFIFO | No se pudo bajar (error 502) | Dinero que podría recibir el finquero | https://www.snitcr.go.cr/ico_servicios_ogc (nodo FONAFIFO) | WFS `https://geodatos.sinia.go.cr/geoserver/FONAFIFO/wfs`, capas `FONAFIFO:psa2019` a `FONAFIFO:psa2025` |

Notas para los conectores:
- Earthdata (IMERG, SMAP, MOD13A3): cuenta del proyecto, token como secreto del backend y aplicaciones autorizadas (`NASA GESDISC DATA ARCHIVE`, NSIDC, LP DAAC).
- Los servidores del SINAC y de FONAFIFO no respondieron el 14 nov 2026: el conector debe reintentar y usar la última copia buena.
- El WFS de la CNE es `http://` (sin https): consultarlo desde el backend, no desde el navegador.
