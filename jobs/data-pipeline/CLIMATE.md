# Datos reales de alertas sin Earthdata

El proceso `field_farms_data.publish.climate` descarga POWER y RONI y publica
JSON pequeños que la pantalla de Alertas ya consume. No necesita claves, tokens,
un backend adicional ni dependencias nuevas. Reutiliza los lectores validados
del comprobador de fuentes y los mantiene separados del motor de riesgo.

## Ejecutar desde la raíz

En PowerShell o Git Bash con el entorno virtual Windows ya preparado:

```sh
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.climate
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.cne
```

El primer comando usa solo la biblioteca estándar; el segundo usa Shapely, ya
declarado por el proyecto. La fecha de referencia de clima se puede fijar con
`--as-of 2026-11-15`. POWER/CNE consultan por defecto el punto **10,8; −85,08**.
Para otra ubicación, usar `--lat`, `--lon` y una carpeta `--out` diferente. No se
sobrescribe silenciosamente la identidad geográfica de una muestra anterior.

Los archivos de alertas tienen su propia carpeta `alerts/climate/`. Los indicadores
regionales de `nasa/power/latest.json` y `noaa/roni/latest.json`, sus consumidores
y el proceso `publish.nasa` conservan el contrato `ArchivoIndicadores`.

## Formato y actualización

```text
apps/web/public/data/alerts/climate/power/{latest,YYYY-MM-DD,status}.json
apps/web/public/data/alerts/climate/roni/{latest,YYYY-MM-DD,status}.json
apps/web/public/data/alerts/cne/{latest,status}.json
```

POWER y RONI se actualizan independientemente: una falla no impide conservar y
actualizar el otro proveedor. Se conserva el último archivo válido, su período
observado y su fuente ante fallos. `status.json` registra la fecha y resultado del
intento, separadas de la fecha de observación. Datos más antiguos no reemplazan
observaciones más recientes. La misma entrada no genera otra instantánea ni
cambia la fecha de observación. Son formatos específicos de estas fuentes, no
una sustitución del contrato compartido SPA-7.

La caché de respuestas originales e históricos se guarda en
`jobs/data-pipeline/data/climate/`, ignorado por Git. Sus hashes se comprueban antes
de reutilizar la referencia. Solo los resúmenes pequeños quedan en `public/data`.

El workflow `alert-climate.yml` verifica Python y prepara los JSON con un horario
diario o ejecución manual, sin Earthdata. Produce artefactos revisables: no tiene
permiso de escritura del repositorio y no hace commits, push ni despliegues.
No fue ejecutado en GitHub en esta entrega. Una actualización local o un artefacto
no se publica automáticamente en una web desplegada.

## Método POWER

- Se consultan precipitación `PRECTOTCORR` y humedad relativa de raíces `GWETROOT`
  con días UTC. El lector exige una ventana común completa de 30 días. Los días
  faltantes no se rellenan con ceros.
- La precipitación actual es la suma de esos 30 días, en mm.
- Se conservan además 90 días diarios en `sample.dailyHistory`, consultando un
  margen de 120 días para cubrir retrasos del proveedor. Cada día conserva lluvia
  y humedad relativa o `null` cuando no existe un valor válido. Las comparaciones
  de la pantalla usan dos ventanas consecutivas completas y no solapadas; suman
  lluvia y promedian GWETROOT, sin asignar niveles de riesgo.
- La referencia es el promedio de 30 sumas de 30 días, cada una terminando en el
  mismo mes/día del último dato actual, para los años 1991–2020. Para ventanas que
  cruzan enero se incluye el final de 1990 en la descarga histórica.
- Anomalía porcentual: `100 × (acumulado_actual / referencia_media − 1)`.
- Se requieren los 30 períodos completos. Si falta un día histórico o la media
  de referencia es cero, la anomalía es no disponible. El 29 de febrero también
  queda pendiente hasta acordar su tratamiento; no se inventa una equivalencia.
- Se conserva el valor, el promedio de referencia, el número de ventanas, método,
  período, parámetros y hashes de las respuestas.

Se eligió el período estándar **1991–2020**, documentado por
[OMM](https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/climate-services/wmo-climatological-normals)
y [NOAA NCEI](https://www.ncei.noaa.gov/products/wmo-climate-normals).
El cálculo móvil aquí definido es una referencia derivada de POWER: **no es una
normal oficial de estaciones del IMN ni un umbral de sequía aprobado**. La
[API diaria POWER](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)
permite consultar el histórico por punto; sus valores recientes pueden revisarse.
GWETROOT adimensional no se convierte a humedad volumétrica SMAP.

Para la descarga del 15 nov de 2026, el punto de Upala produjo **404,38 mm** entre
el 15 oct y el 13 nov; referencia media **178,7876667 mm**, anomalía **+126,1789 %**.
El frontend solo aplica esa anomalía cuando coincide el punto serializado a seis
decimales. Esa comparación es identidad numérica, no un radio geográfico de
representatividad. No se asigna al resto de la subcuenca ni a otra finca cercana.

## RONI

Se lee la [tabla oficial NOAA CPC RONI](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/),
con identidad ERSSTv6, índice y período explícitos. No se usa el archivo ONI como
sustituto. El frontend valida los límites de la temporada y distingue dato
global de un indicador local. El último valor consultado fue **+2,0 °C**, ASO
2026, del 1 ago al 31 oct. Los valores recientes pueden revisarse; el índice no
es una declaración de sequía en todas las regiones.

## CNE

El WFS respondió con geometrías reales. El proceso consulta un pequeño sobre
alrededor del punto como filtro de índice y calcula después la cobertura exacta
del punto con polígonos, sin usar un radio de peligro inventado. Se comprueban
CRS, geometrías y conteos; una consulta truncada se rechaza. Centroides y líneas
no se convierten automáticamente en zonas de amenaza.

Los atributos inspeccionados **no contienen fecha de observación verificable**.
Por eso incluso una intersección positiva es `unverified`; una consulta sin
intersección produce `null`, no `false` ni riesgo bajo. La fecha de descarga se
guarda aparte y nunca se presenta como fecha del mapa. El servicio usa HTTP,
sin garantía de integridad del transporte. La consulta de Upala devolvió cero
elementos para las dos capas: esto no prueba cobertura completa ni ausencia de
riesgo. La fuente/versionado requieren revisión con el equipo antes de activar
reglas basadas en esos mapas.

El proceso publica también `apps/web/public/data/alerts/cne/map.json`: descarga
por páginas de 50 elementos hasta un máximo de 500 por capa en el encuadre de la
subcuenca. Rechaza IDs duplicados, cambios de conteo durante la consulta o páginas
incompletas. Si alcanza el límite, registra la consulta como parcial. Cada capa
conserva conteos y hashes de las respuestas. Las geometrías se recortan al
encuadre y se simplifican a 10 m exclusivamente para visualización; los cruces
exactos del punto utilizan la geometría original. La fecha del mapa sigue
desconocida y se guarda aparte de la descarga. Cero elementos no equivale a
riesgo bajo. La vista no requiere mosaicos ni llamadas CNE desde el navegador.

## Navegador y uso sin conexión

El navegador solicita únicamente los JSON estáticos del proyecto. Valida
esquema, origen real, fuente, unidades, cálculo, períodos y ubicación. Conserva
copias locales válidas de POWER/RONI con sus fechas y avisa de fallos de consulta.
No sustituye una copia nueva por otra más antigua. Las reglas aprobadas no se
recuperan de localStorage si el archivo de políticas no puede consultarse.

La PWA usa NetworkFirst para estos archivos y la fecha del contenido sigue
determinando su vigencia. La caducidad de indicadores se calcula con el límite
explícito de cada política; una respuesta cacheada no se convierte en un dato
nuevo ni confirma una actualización exitosa del proveedor.

## Qué sigue bloqueado

El equipo aún no aprobó umbrales/reglas ni sus límites de antigüedad. Faltan datos
SMAP, pendiente, fuente de suelos acordada, metadatos verificables de las capas
locales y validación autenticada IMERG. Los evaluadores de las cuatro categorías
ya soportan políticas documentadas y combinaciones, pero la configuración real
permanece vacía y las evaluaciones incompletas quedan indeterminadas.

Pruebas: `python -m pytest jobs/data-pipeline/tests -q` con el entorno preparado;
`npm test` y las pruebas de navegador de `tests/e2e/alerts.spec.ts`.
