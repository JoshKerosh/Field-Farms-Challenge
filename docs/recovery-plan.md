# Plan de recuperación

La ruta `/care` usa la finca real elegida en Mi finca. No consume escenarios simulados ni las
prioridades numéricas del prototipo. Los mapas y los estados anteriores de acciones se conservan.

## Seguimiento local

IndexedDB `ffc-recovery`, almacén `plans`, separa planes por identificador SIRI. Sin parcela,
la ubicación activa conserva un identificador provisional estable aunque cambie el GPS.
Las ubicaciones antiguas conservan su clave de punto como identificador provisional para
seguir encontrando los planes existentes. «Registrar otra finca» inicia una identidad nueva.
Si aparece una parcela para ese mismo punto,
la vista ofrece copiar el plan provisional mediante confirmación; conserva el original.
El perfil se confirma al crear el plan. Los cambios posteriores del perfil global no reescriben
el perfil confirmado de otro plan.

Mi finca presenta primero un resumen del registro, con accesos al plan y a la cuenca, edición
de datos y borrado. «Borrar registro» pide confirmación y elimina la ficha, la ubicación y el
plan asociado (incluida su copia provisional conocida), con sus fotos y gastos. Mantiene otros
planes. Ante un fallo al limpiar la ficha intenta restaurar los planes eliminados.

El plan permite editar meta, plazo, lugar y presupuesto. La unidad queda fija cuando existen
mediciones para no reinterpretar los registros anteriores. Los avances permiten corregir fecha,
cantidad, nota y gasto sin perder las fotos. El respaldo JSON incluye fotos codificadas y puede
restaurarse con confirmación: reemplaza el plan actual, no suma gastos duplicados. Se rechazan
archivos inválidos y respaldos de una parcela catastral diferente. Un respaldo provisional puede
vincularse explícitamente a la finca actual. La importación admite archivos de hasta 50 MB.

Las cantidades son acumuladas a la fecha indicada: el avance usa la última medición, no suma
mediciones repetidas. Si dos registros tienen la misma fecha, prevalece el agregado después.
Los gastos sí se suman. Completar una tarea no demuestra recuperación ambiental.
Se admiten tres fotos por registro, JPG/PNG/WebP de hasta 20 MB cada una. Se redimensionan a
1600 píxeles y guardan como JPEG, junto con notas y gastos. Los fallos de guardado no muestran
éxito ni borran el formulario. La impresión permite compartir un resumen, sin envíos automáticos.
Eliminar datos del navegador también elimina estos planes: no hay sincronización remota.

Los textos están en `features/restoration/recovery-copy.ts`, con versiones española e inglesa
comprobadas por TypeScript. Los identificadores, respuestas y unidades persistidos no dependen
del idioma. Los estilos usan los tokens de ambos temas.

## Datos disponibles

Se incorporó `public/data/recovery/rainfall.json`, descargado directamente de NASA POWER:
42 puntos de su rejilla meteorológica nativa, noviembre de 2024 a octubre de 2026.
Cada total mensual exige todos los días con dato válido. Las peticiones regionales se dividen
en intervalos de hasta 366 días, límite de la API. La vista elige la referencia regional más
cercana; no la presenta como pluviómetro de la parcela ni como promedio de la cuenca.

También se consultan los 90 días de POWER existentes. CNE y SINAC sólo aportan coincidencias
con cartografía parcial de Huetar Norte: polígonos de potencial de inundación simplificados
y contornos históricos de áreas protegidas. No encontrar una coincidencia no demuestra
ausencia de riesgo o restricciones. Los ejemplos IMERG/SMAP quedan excluidos.

## Preparación manual de MODIS y lluvia

Desde la raíz, en PowerShell:

```powershell
py -3.13 -m venv jobs/data-pipeline/.venv
& jobs/data-pipeline/.venv/Scripts/python.exe -m pip install -e 'jobs/data-pipeline[test,recovery]'
& jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.recovery --rainfall-only
```

El comando usa los últimos 24 meses completos anteriores al mes de ejecución. Para reproducir
esta entrega, agregar `--start 2024-11-01 --end 2026-10-31`.

MODIS requiere una cuenta Earthdata habilitada en AppEEARS. Configurar credenciales únicamente
en la sesión local, nunca en el frontend, archivos versionados o mensajes:

```powershell
$env:EARTHDATA_USERNAME = Read-Host 'Usuario Earthdata'
$env:EARTHDATA_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Contraseña Earthdata' -AsSecureString)).Password
& jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.recovery --request
# El comando devuelve el ID y las fechas para reanudar la misma solicitud:
& jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.recovery --task ID --start 2024-11-01 --end 2026-10-31
Remove-Item Env:EARTHDATA_USERNAME, Env:EARTHDATA_PASSWORD
```

AppEEARS procesa la solicitud de forma asíncrona. Repetir `--task` cuando indique que sigue
pendiente; no se mantiene un proceso de espera ni se añade una tarea programada.
Alternativamente, importar GeoTIFFs AppEEARS con `--input <carpeta>` y fechas explícitas.
Se solicitan MOD13Q1.061 NDVI, VI Quality y pixel reliability en proyección geographic.

El importador conserva tierra con QA buena, sin nubes adyacentes/mixtas, sombras, nieve ni
aerosoles altos. Respeta el rango NDVI válido [-0.2, 1], incluidos valores negativos. Genera
medianas mensuales, series por cuenca ponderadas por área y teselas JSON para consultas a 5 km.
La inclusión espacial usa centros de píxel, una aproximación adecuada para este contexto
regional, no una delimitación de franjas de restauración. No se confunde tamaño de tesela con
resolución de observación. La lluvia conserva su rejilla regional de origen.

Las comparaciones NDVI usan el mismo mes del año anterior y píxeles válidos comunes que cubran
al menos el 80 % del área. Ese umbral es de disponibilidad, no un umbral de degradación.
El manifiesto se publica después de las teselas. Los archivos originales permanecen ignorados
en `jobs/data-pipeline/data/`. La ruta `recovery/history.json` sólo aparece tras importar datos
reales; mientras falte, la vista informa que la vegetación está pendiente.

El 15 de noviembre de 2026 se comprobó la importación AppEEARS realizada por el equipo:
24 meses (noviembre de 2024 a octubre de 2026), series de 34 cuencas y 310 teselas,
sin archivos faltantes ni valores NDVI fuera del rango del producto. También está incorporada
la adquisición pública de POWER. Las pruebas con rasters sintéticos se mantienen separadas
de estos archivos reales. Queda pendiente la revisión visual manual de la interfaz.

## Validación

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build` y
`jobs/data-pipeline/.venv/Scripts/python.exe -m pytest jobs/data-pipeline/tests`.
La revisión posterior utilizó Playwright CLI con Edge: registro manual de una finca,
creación de meta y avance con foto/gasto, persistencia al recargar, reinicio del formulario,
idiomas español/inglés, temas claro/oscuro y adaptación a 390 px. Se revisaron capturas en
`output/playwright/`. Impeccable permanece desactivado. Earthdata ya fue importado.

El inicio ya no carga un perfil de ejemplo automáticamente. Los registros antiguos llamados
«Finja Ejemplo» o «Finca Ejemplo» se ignoran como residuos; una finca registrada nuevamente
mediante el formulario lleva una versión explícita y puede conservar cualquier nombre.
«Registrar otra finca» vacía el perfil y la ubicación activos, conservando los planes por parcela.
Las fichas nuevas de Fuentes muestran el período y la fecha real de MODIS y POWER.
