# Mapa de condiciones

El equipo decidió clasificar por número de condiciones simultáneas y delegó la
selección de parámetros iniciales. El mapa de `/alerts` implementa esa decisión
independientemente del mapa histórico CNE y de las políticas de alertas anteriores.

## Regla operativa inicial: conditions-v1

| Condición | Deslizamientos                           | Inundaciones                                  |
| --------- | ---------------------------------------- | --------------------------------------------- |
| Agua      | Fracción de poros ocupada por agua ≥0.90 | Igual                                         |
| Suelo     | Clasificación geotécnica susceptible     | Clasificación de drenaje pobre                |
| Relieve   | Pendiente ≥20 grados                     | Altura sobre drenaje cercano (HAND) ≤5 metros |

Tres condiciones activadas: rojo; dos: naranja; una: amarillo; ninguna: verde.
**Cualquier condición desconocida, vencida o sin verificar produce gris.**
Los límites se incluyen. Un `false` o cero verificado no es un dato faltante.
El verde representa solamente cero condiciones activadas en este modelo.

Los cortes numéricos son decisiones iniciales de implementación, **no valores
validados para Costa Rica ni umbrales recomendados por las referencias**. No se
convierten en probabilidades, recomendaciones de evacuación ni alertas oficiales.
La selección queda centralizada en
`packages/domain/src/alerts/condition-risk.ts`, con versión para su calibración.

Se usa pendiente en vez de altitud absoluta para deslizamientos y HAND para
terreno bajo en inundaciones. Una elevación absoluta alta no mide inclinación;
una elevación absoluta baja no mide cercanía vertical al drenaje.

La condición de suelo requiere una clasificación cartográfica explícita con
fuente: ni la capacidad de uso agrícola ni el porcentaje de arcilla por sí solos
establecen susceptibilidad geotécnica o mal drenaje. Una clasificación negativa
también requiere evidencia; ausencia de cartografía no se transforma en `false`.

## Datos y limitación actual

El archivo público `apps/web/public/data/alerts/conditions.geojson` está vacío
deliberadamente: **el repositorio todavía no tiene capas verificadas de
saturación, suelo y relieve para poblar el mapa**. La interfaz muestra gris y
explica cuáles faltan. El mapa CNE conserva su significado histórico.
Esto termina el motor y la visualización, no la cobertura de datos reales.

POWER GWETROOT es un índice de humedad relativa de zona de raíces: no se renombra
como saturación de poros ni se replica un punto sobre una cuenca. Tampoco se usan
las cuadrículas ilustrativas `satBase`, su ruido ni sus fincas simuladas.

## Contrato para publicar polígonos

GeoJSON WGS84 con `type: FeatureCollection`, `schemaVersion:
alert-condition-map-v1`, `dataMode: real` y `features`. Cada feature tiene
`type: Feature`, geometría Polygon/MultiPolygon y propiedades:

- `id` único y `name`.
- `conditions`: `saturation`, `slope`, `heightAboveDrainage`,
  `susceptibleSoil`, `poorDrainage`. Cada lectura puede ser `null`.
- Lecturas presentes: `value`, `unit`, `status`, `source` HTTPS, `observedAt`
  y `validUntil` en ISO 8601. Solo `available` dentro de su vigencia participa.
  El productor de cada capa debe justificar y asignar esa vigencia.
- Unidades respectivas: `fraction-of-pore-space`, `degree`, `m`, `boolean`,
  `boolean`. Suelo y drenaje son booleanos estrictos; no se convierten cadenas.

Los polígonos publicados deben ser zonas no superpuestas con evidencias de
soporte espacial y profundidad compatibles. El publicador debe armonizar su
resolución y documentar procedencia y método; este consumidor no interpola ni
deriva esas capas. Se recortan visualmente al contorno de la subcuenca. Huecos
sin cobertura quedan grises. Cada riesgo consulta solo sus tres condiciones.
La selección de zona muestra resultados de cada condición y fuentes.

## Referencias de contexto

- [USGS: monitoreo de deslizamientos](https://www.usgs.gov/programs/landslide-hazards/science/real-time-monitoring-potential-landslides):
  relación entre humedad, presión de poros y estabilidad. No prescribe los cortes
  elegidos aquí.
- [USGS: deslizamientos inducidos por lluvia](https://www.usgs.gov/programs/landslide-hazards/science/overview-rainfall-induced-landslides):
  necesidad de observaciones y calibración de criterios de aviso.
- [ISRIC: propiedades de SoilGrids](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html):
  propiedades estimadas e incertidumbre; no equivale directamente a una capa de
  estabilidad del terreno.

## Verificación

`npm run verify:alerts -- --browser` incluye pruebas de todas las combinaciones,
límites, fechas, unidades y datos faltantes; y pruebas del mapa de escritorio y
móvil. Solo las pruebas interceptan el archivo con polígonos sintéticos. Esos
fixtures nunca se publican como observaciones reales.
