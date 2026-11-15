# Comprobación de fuentes para alertas

Este comprobador prepara evidencia local antes de conectar las alertas. Usa solo
la biblioteca estándar de Python 3.12 o posterior. No instala paquetes, no lee ni
envía credenciales, no descarga rásteres y no publica datos en la aplicación.
Los JSON de salida son muestras de viabilidad, **no el contrato compartido SPA-7**.

## Repetir la comprobación

Desde la raíz del repositorio, tanto en PowerShell como en Git Bash:

```sh
python jobs/data-pipeline/src/field_farms_data/source_probe.py --as-of 2026-11-15
```

Para consultar datos recientes, omitir `--as-of`: el valor por defecto es la fecha
de Costa Rica (UTC−6). La fecha de referencia no cambia la fecha de descarga; las
fuentes pueden revisar observaciones anteriores. No se promete reproducibilidad
bit a bit de una futura descarga.

Para probar solo POWER y NOAA:

```sh
python jobs/data-pipeline/src/field_farms_data/source_probe.py --sources power roni
```

Para otro punto, usar `--lat`, `--lon` y una carpeta de salida diferente mediante
`--out jobs/data-pipeline/data/otro-punto`. El punto debe estar dentro de exactamente
una subcuenca de las capas versionadas. No se sustituye por una ubicación cercana.
No se sobrescribe una muestra existente de otra ubicación o versión de fuente.

Las salidas predeterminadas quedan en la carpeta local ignorada por Git:

```text
jobs/data-pipeline/data/source-check/
  report.json           # Resultado independiente por fuente y pendientes
  power/latest.json     # Ventana válida de 30 días, unidades y ubicación
  roni/latest.json      # Última temporada completa, versión y fecha
  raw/<sha256>.raw      # Respuestas originales pequeñas y metadatos
```

El reporte distingue `validated-sample`, `metadata-only`, `sample-checks` y
`failed`. Que el proceso termine con código 0 significa que las comprobaciones
solicitadas respondieron y pasaron sus validaciones limitadas; **no significa que
todos los conectores o indicadores estén disponibles**. Sale con código 1 si
alguna consulta o muestra falla. Un fallo no sobrescribe el último JSON válido;
una observación más antigua tampoco reemplaza una más reciente. La fecha del dato
siempre se conserva; no se actualiza para aparentar una observación nueva.

El timeout por petición es de 25 segundos y cada respuesta se limita a 4 MiB.
No hay reintentos automáticos ni automatización programada en esta prueba.

## Resultado observado el 15 de noviembre de 2026

Punto: **10,8° N, −85,08°**, dentro de **Río Zapote**, según
`apps/web/public/data/geo/subcuencas/17.geojson`, elemento 21 (índice desde cero).
La capa indica gran cuenca «Cuencas Lago De Nicaragua» y vertiente «Atlantica».
Estos nombres no se reinterpretan automáticamente como una región climática.
El identificador de archivo/elemento es una referencia local, no un ID estable.

| Fuente | Resultado real de la prueba | Limitación |
| --- | --- | --- |
| NASA POWER | Ventana UTC completa del 15 oct al 13 nov de 2026: precipitación acumulada **404,38 mm** y media GWETROOT **0,848**, adimensional. | Es una consulta puntual dentro de una subcuenca, no un promedio por área. La última fecha disponible común tiene dos días de retraso respecto a la referencia. |
| NOAA CPC RONI | **+2,0 °C**, temporada **ASO 2026**, intervalo 1 ago–31 oct; tabla identificada como **ERSSTv6**. | Índice global estacional, no observación diaria de sequía local. NOAA advierte que los valores recientes pueden revisarse. |
| IMERG | Catálogo accesible: `GPM_3IMERGDL`, versión `07`, colección `C2723754859-GES_DISC`. | Solo metadatos de colección. No se ha probado la descarga autenticada ni obtenido lluvia IMERG. |
| SMAP | Catálogo accesible: `SPL4SMGP`, versión `008`, colección `C3480440870-NSIDC_CPRD`. | Solo metadatos. Falta descargar y validar variable, unidades, calidad y cobertura. |
| NASADEM | Catálogo accesible: `NASADEM_HGT`, versión `001`, colección `C2763264762-LPCLOUD`. | No hay elevación descargada ni pendiente calculada. |
| CNE | WFS respondió y anunció `cne:inundaciones`, `cne:deslizamientos`, `cne:coronas_de_deslizamientos` y `cne:Inundaciones_lidar`. Las tres primeras devolvieron GeoJSON vacío en el área consultada. | Área aproximada de lon −85,10 a −85,06 y lat 10,78 a 10,82; máximo de tres elementos por capa. No demuestra ausencia de riesgo, cobertura completa, validez de geometrías ni intersección con una finca. El servicio utiliza HTTP. |

Los valores anteriores proceden de descargas realizadas por el comprobador, no
del JSON del prototipo. No se encontraron archivos originales CNE/RIESGOS,
rásteres IMERG/SMAP ni shapefiles en el repositorio inspeccionado. Esto no
descarta que el equipo tenga los originales en otra ubicación.

## Validación que sí se realiza

- POWER: `PRECTOTCORR` en `mm/day`, GWETROOT adimensional y días UTC; se exige una
  ventana común completa de 30 días. Se rechazan rellenos negativos, nulos, valores
  no finitos y humedad fuera de 0–1. Cero de precipitación sí es válido.
- Se usa el último día común válido anterior a la fecha de referencia. Si hay un
  hueco en su ventana de 30 días, se rechaza la muestra, sin rellenar con ceros ni
  buscar silenciosamente una ventana antigua que oculte el hueco.
- RONI: se extrae únicamente la fila `latest-data` de la página identificada como
  RONI/ERSSTv6. Se excluyen temporadas aún no finalizadas, se manejan períodos que
  cruzan el año y no se usa `oni.ascii.txt` como sustituto. Un cambio de estructura
  provoca un fallo explícito para revisión.
- Se conserva URL, fecha de descarga, período observado y SHA-256 de cada respuesta.
- CNE: se comprueba respuesta WFS y la estructura básica de las colecciones GeoJSON;
  no se validan topología, proyección efectiva ni completitud del servicio.

## Pendientes antes de activar alertas reales

1. Comprobar autorización de la cuenta del proyecto para Earthdata/GES DISC/NSIDC
   y las rutas de descarga. No compartir contraseñas ni tokens en el chat o en Git.
2. Descargar y procesar IMERG/SMAP y DEM en almacenamiento temporal, con control de
   cobertura y unidades. No asumir que consultar CMR verifica acceso a los datos.
3. Elegir y validar la fuente de suelos. SoilGrids de ISRIC es un candidato,
   todavía no consultado por este script ni acordado como fuente del proyecto.
4. Acordar la referencia comparable para anomalía de precipitación. La muestra
   devuelve `null` para esa anomalía; no compara con una constante inventada.
5. Acordar fuente científica, ámbito y versión de cada umbral, además de reglas de
   vigencia por producto. Se informa `lagDays`, sin clasificar arbitrariamente la
   frescura ni convertir humedad POWER a humedad volumétrica SMAP.
6. Definir IDs estables y el contrato SPA-7 con los responsables de Base compartida;
   después calcular resúmenes por subcuenca y verificar capas CNE completas.

No se evalúa riesgo, no se confirma ningún evento ambiental y no se modificó el
motor ni la pantalla de alertas en esta entrega.

## Pruebas sin red ni instalaciones

```sh
python -m unittest discover -s jobs/data-pipeline/tests -p test_source_probe.py -v
```

Los datos de prueba son sintéticos y permanecen separados de las descargas reales.
Cubren unidades y fechas, ventanas incompletas, ceros, rellenos, períodos RONI,
conservación del último válido, protección de ubicación y fallos de red/CNE.

## Documentación oficial

- [NASA POWER, API diaria y estándares temporales](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)
- [NOAA CPC, RONI](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/)
- [NASA CMR, API de búsqueda](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html)
- [NASA, IMERG Late diario](https://gpm.nasa.gov/node/3322)
- [NSIDC, SMAP L4 SPL4SMGP v8](https://nsidc.org/data/spl4smgp/versions/8)
- [CNE, WFS GetCapabilities](http://mapas.cne.go.cr/servicios/cne/wfs?service=WFS&request=GetCapabilities)
- [ISRIC, SoilGrids](https://isric.org/explore/soilgrids)
