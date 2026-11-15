# Conector IMERG diario: preparación para inundación (SPA-28 → SPA-32)

Implementación preparada con pruebas sin credenciales. La descarga autenticada
**todavía no está validada con la cuenta del proyecto**. No se ha activado ninguna
regla de inundación ni se han sustituido los datos de la pantalla actual.

## Archivos y responsabilidad

- `providers/imerg.py`: busca gránulos en CMR, exige siete días consecutivos de
  IMERG **Late V07**, valida intervalos diarios UTC y usa el enlace OPeNDAP que
  anuncia NASA. No construye un nombre V07B/V07C adivinando la versión del archivo.
- `transforms/imerg.py`: valida NetCDF, recorta por la extensión de las subcuencas
  y calcula promedios espaciales ponderados por áreas de intersección.
- `publish/imerg.py`: coordina el proceso, conserva la última salida válida,
  escribe resúmenes pequeños y el estado del intento. No confirma eventos ni
  asigna severidad de riesgo.
- `.github/workflows/imerg.yml`: prueba Python en PR y prepara JSON en ejecuciones
  manuales/programadas. Solo sube un artefacto para revisión; no hace commits,
  push ni despliegues. No se ha ejecutado en GitHub desde esta sesión.

## Instalación local

Se añadió **netCDF4 como extra opcional**, para leer los recortes binarios del
servidor sin implementar un decodificador DAP propio. NumPy es una dependencia
transitiva. Shapely y PyProj ya formaban parte del proyecto.

Desde la raíz, en PowerShell:

```powershell
python -m venv jobs/data-pipeline/.venv
jobs/data-pipeline/.venv/Scripts/python.exe -m pip install -e "jobs/data-pipeline[imerg,test]"
jobs/data-pipeline/.venv/Scripts/python.exe -m pytest jobs/data-pipeline/tests -q
```

En Git Bash, el ejecutable del mismo entorno Windows es:

```bash
jobs/data-pipeline/.venv/Scripts/python.exe -m pytest jobs/data-pipeline/tests -q
```

El entorno virtual es local y está ignorado por Git.

## Qué se puede probar sin cuenta

```bash
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.imerg --discover-only --as-of 2026-11-15
```

Consulta metadatos públicos, sin descargar lluvia. Genera `discovery.json` y
`status.json` en `jobs/data-pipeline/data/imerg/` (ignorado por Git). El estado
`discovered-only` **no significa que Earthdata esté autorizado**.

En la consulta pública del 15 nov de 2026, el último gránulo listado correspondía
al **13 nov**, archivo V07C, colección `C2723754859-GES_DISC`. La prueba completa
de lectura de los rásteres queda pendiente hasta tener autorización.

## Autorización Earthdata

1. Crear o utilizar la cuenta del proyecto en [Earthdata Login](https://urs.earthdata.nasa.gov/).
2. Autorizar el acceso de GES DISC siguiendo [sus instrucciones oficiales](https://disc.gsfc.nasa.gov/data-access).
3. Crear un token de usuario y proporcionarlo mediante `EARTHDATA_TOKEN` en el
   proceso que ejecuta Python. No ponerlo en archivos versionados, argumentos,
   capturas o mensajes. El programa no imprime ni almacena el token y rechaza
   redirecciones para no enviarlo a otro origen.
4. Para GitHub Actions, configurar el secreto del repositorio `EARTHDATA_TOKEN`.
   Tener el secreto no reemplaza la autorización de la cuenta en GES DISC.

Para introducir el token en PowerShell sin escribirlo en texto plano en el
historial, se puede usar:

```powershell
$earthdataSecure = Read-Host 'Earthdata token' -AsSecureString
$earthdataCredential = [System.Net.NetworkCredential]::new('', $earthdataSecure)
$env:EARTHDATA_TOKEN = $earthdataCredential.Password
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.imerg
Remove-Item Env:EARTHDATA_TOKEN
Remove-Variable earthdataCredential, earthdataSecure
```

En Git Bash:

```bash
read -r -s -p 'Earthdata token: ' EARTHDATA_TOKEN
echo
export EARTHDATA_TOKEN
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.imerg
unset EARTHDATA_TOKEN
```

Si falta el token, el proceso escribe `status: blocked`, razón
`earthdata-token-missing`, sale con código 2 y conserva cualquier `latest.json`.

## Ejecución y publicación

La salida predeterminada es local, dentro de `jobs/data-pipeline/data/imerg/`:

```text
discovery.json        # Solo si se usa --discover-only
status.json           # Estado del intento: ok, blocked, failed o discovered-only
YYYY-MM-DD.json       # Resumen cuya fecha es el último día observado
latest.json           # Último resumen válido
```

Para preparar los JSON en la ubicación prevista del frontend, una vez revisada
la descarga real y coordinado el formato con Base compartida:

```bash
jobs/data-pipeline/.venv/Scripts/python.exe -m field_farms_data.publish.imerg --out apps/web/public/data/nasa/imerg
```

No se ejecutó esa publicación local en esta entrega. El formato
`imerg-subbasins-v1` es específico del proveedor: no sustituye SPA-7.
Cada subcuenca usa un ID derivado de su geometría normalizada; se conserva la
huella completa y la versión del conjunto geográfico. Al cambiar geometrías
pueden cambiar los IDs: requieren correspondencia explícita con el mapa y el
motor antiguo antes de integrar la pantalla.

`latest.json` contiene:

- Producto, colección, versión, resolución de 0,1°, condición provisional Late.
- `origin: estimated` y `dataMode: real`: estimaciones satelitales de la fuente
  real, no mediciones de pluviómetro ni datos simulados.
- Período UTC observado y fecha de generación, separados.
- URL, ID, revisión, huella de respuesta y huella numérica de cada gránulo.
- Versión de geometrías y método de cálculo.
- Por subcuenca: `rain1d` y `rain7d` con valor, unidad, período, estado y fracción
  de área válida. `null` significa que no hay información suficiente.

`status.json` tiene la fecha del intento y sus resultados. Un fallo actualiza ese
estado, **no la fecha del dato anterior**. El retraso se informa en días; no se
inventa un umbral de caducidad. El consumidor debe evaluar vigencia aunque el
último intento haya sido exitoso. No hay archivo `fuentes.json` global porque
su formato todavía no está acordado.

## Método y controles

1. CMR busca las tres últimas semanas hasta la fecha de referencia. Elige la
   semana que termina en el último día publicado, sin asumir que existe el dato
   de ayer. Si falta un día dentro de esa semana, falla; no busca silenciosamente
   otra semana antigua.
2. El esquema DAP4 determina el orden de las dimensiones. Se descargan e inspeccionan
   coordenadas y tiempo antes de solicitar `precipitation` recortada. Solo se
   aceptan los órdenes `time,lon,lat` y `time,lat,lon`.
3. Se valida la malla ascendente de 0,1° y su cobertura. Los límites entre celdas
   se calculan con puntos medios para evitar huecos por redondeo float32.
4. Las intersecciones entre subcuenca y celda se calculan en WGS84 y sus áreas
   en **EPSG:5367** reutilizando las utilidades geográficas existentes. Los pesos
   se normalizan por la suma de áreas de intersección. No se utiliza el centroide
   ni un promedio simple de los píxeles como promedio de la subcuenca.
5. La variable diaria debe expresar `mm/day`; cada registro corresponde a un día
   completo. Su profundidad diaria en mm se acumula directamente: **no se vuelve
   a multiplicar por 24**. Rellenos, negativos y valores no finitos son faltantes;
   cero sí es precipitación válida.
6. Se exige información válida en todos los píxeles con área positiva para cada
   indicador. Si un píxel falta un día, `rain7d` queda no disponible. `rain1d`
   puede seguir disponible si el último día está completo. La fracción válida
   se informa para diagnóstico, sin extrapolar el resto.
7. La semana usa la misma malla y soporte geográfico; cualquier cambio de malla
   durante el período hace fallar la actualización.
8. No se guardan rásteres en disco: coordenadas y recortes viven en memoria,
   limitados a 8 MiB por respuesta. Solo se escriben JSON. No se crean fincas ni
   datos simulados en `public/data/`.
9. La publicación del archivo `latest.json` es atómica. Un dato más antiguo no
   reemplaza uno nuevo. Si no cambian entradas numéricas, revisión y geometrías,
   se conserva la salida para evitar duplicados por regeneración del NetCDF.

Las 1.868 geometrías versionadas fueron leídas y sus pesos calculados sobre una
malla **sintética** equivalente a IMERG: recorte de 33 × 35 celdas. Esa prueba
verifica el cálculo geográfico, **no la descarga ni observaciones de lluvia reales**.
Los datos y umbrales de las pruebas unitarias son sintéticos y no se publican.

## Limitaciones que impiden cerrar SPA-28/SPA-32

- Validar una descarga autenticada real contra el formato DAP4/NetCDF publicado.
  Si NASA entrega otro esquema o redirige, el conector falla explícitamente.
- Acordar el contrato SPA-7 e IDs con los responsables de Base compartida.
- Completar la cobertura y el cruce de las capas CNE con finca/subcuenca.
- Documentar y acordar las reglas de inundación y vigencia. Ningún umbral se
  ha inferido de los ejemplos o del índice RONI.
- Integrar carga, estado, fechas, explicaciones e idioma en la pantalla. La
  acción preparada solo genera artefactos; publicar automáticamente en el repo
  o desplegar requiere autorización adicional.

## Referencias primarias

- [NASA, producto IMERG Late diario](https://doi.org/10.5067/GPM/IMERGDL/DAY/07)
- [NASA, directorio de precipitación](https://gpm.nasa.gov/data/directory)
- [NASA GES DISC, tutorial oficial de OPeNDAP y token](https://github.com/nasa/gesdisc-tutorials/blob/main/notebooks/How_To_Download_a_Spatial_and_Variable_Subset_of_Level_1B_Data_Using_OPeNDAP.ipynb)
- [NASA CMR, API](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html)
