# Alertas ambientales de Sow Water

La pantalla `/alerts` muestra únicamente observaciones reales publicadas. Se retiraron los
controles de simulación y el estado compartido de simulación de la aplicación. Los ejemplos
puros del motor permanecen aislados para pruebas; no hay una ruta que los active en la interfaz.

Para consultar la vista, ubicar y registrar una finca y abrir Alertas. Se conservan las cuatro
categorías, con una explicación de los datos o reglas que faltan. Las evaluaciones incompletas
se presentan contraídas y no incluyen tablas de celdas vacías. Un mapa de condiciones sin
observaciones se sustituye por una explicación, conservando el mapa de antecedentes CNE cuando
existe cartografía para la ubicación consultada.

## Historial, comparación y cartografía

La vista ofrece observaciones y cartografía reales, sin convertirlas por sí solas en alertas oficiales:

- **Historial:** serie de hasta 90 días de precipitación y humedad relativa de
  raíces POWER. Permite elegir indicador y mostrar 7, 30 o 90 días, con tabla
  accesible equivalente. Los huecos no se unen ni se rellenan con ceros.
- **Comparación temporal:** dos ventanas consecutivas de 1, 7 o 30 días, siempre
  de igual longitud y sin solapamiento. Se suma lluvia y se promedia humedad.
  Muestra diferencia absoluta y porcentual; con días faltantes no calcula la
  comparación y con referencia cero no divide por cero.
- **Mapa CNE:** geometrías reales del área de la subcuenca, capas de susceptibilidad
  a inundación y registros de deslizamiento, selección de elementos, leyenda y
  ampliación. Descarga las geometrías solo al abrir Alertas. Usa SVG ligero,
  siguiendo el minimapa existente, sin mosaicos externos ni credenciales.

El punto publicado es Upala (10,8; −85,08). Fuera de ese punto no se aplica su
serie o mapa a otra ubicación. El botón **Ver punto con datos** permite consultar
la referencia por separado, sin cambiar la finca ni sus evaluaciones; el aviso
indica cuándo se está viendo esa referencia. La cartografía descargada para Río Zapote contiene
25 elementos de inundación y cero de deslizamiento en el área consultada. Esto
no prueba cobertura histórica completa ni ausencia de amenaza. Se conserva la
fecha de descarga y se indica que no hay fecha de observación del mapa verificada.
La geometría se recorta al encuadre y se simplifica a 10 m solo para dibujarla;
no reemplaza el cruce exacto de puntos del pipeline ni una delimitación catastral.

Las fuentes se actualizan con los comandos documentados en
`jobs/data-pipeline/CLIMATE.md`. El historial usa datos estáticos publicados y el
último día disponible; no es una consulta meteorológica en vivo al navegador.

## Evaluaciones y límites

Las evaluaciones continúan pendientes mientras no existan indicadores verificables y reglas
aprobadas. GWETROOT es humedad relativa de raíces; no reemplaza humedad volumétrica SMAP.
Las muestras de pendiente regionales no reemplazan un DEM o HAND de la parcela. No se usan los
archivos de ejemplo para completar datos faltantes. Se muestran las observaciones disponibles y
se explica que nuevas mediciones, fuentes verificadas y reglas aprobadas permitirán ampliar la vista.
El historial puntual resume la lluvia del último día y de siete días, y el promedio de humedad
relativa de treinta días, únicamente para ventanas completas. No aplica estos totales a otra finca.
La información está disponible en español e inglés. No sustituye avisos oficiales de CNE o IMN.

## Estado de los datos reales

El frontend lee JSON reales de `public/data/alerts/climate/power/` y `alerts/climate/roni/`, valida
su formato, conserva fechas y recupera copias locales si falla una actualización.
RONI se mantiene separado de ONI y se valida el período estacional completo.
POWER usa treinta ventanas históricas comparables de 1991–2020 para su anomalía.
Solo se aplica al punto exacto consultado, con precisión de serialización de seis
decimales; nunca se convierte en promedio de una subcuenca o de otra finca.
Si no hay un archivo verificado aplicable, la copia antigua del prototipo sigue
marcada sin verificar. La vertiente del prototipo tampoco adquiere una fecha
inventada. La humedad POWER no se convierte en humedad volumétrica SMAP.

El lector IMERG está conectado al formato del pipeline: verifica huella de la
capa geográfica, índice de elemento y contención del punto, sin asociar cuencas
solo por su nombre. Falta la descarga autenticada real. Los cruces CNE por punto
se publican, pero conservan fecha desconocida y estado sin verificar. Una consulta
vacía no prueba ausencia de riesgo. SMAP, pendiente y suelo siguen pendientes de
datos y fuente acordada. El historial 2014–2015 sigue siendo contexto histórico
y no determina la severidad actual.

Los cuatro evaluadores ya procesan políticas configurables y producen severidad,
factores, versión y referencias. Solo aceptan políticas aprobadas con requisitos
completos, unidades, producto, ventana y límites de antigüedad explícitos. El
archivo `public/data/alerts/rules.json` está vacío porque el equipo aún no ha
aprobado reglas. Consultar [formato de políticas](alert-policies.md) y
[conectores sin Earthdata](../jobs/data-pipeline/CLIMATE.md).

Los tipos de evidencia añadidos en `packages/domain/src/alerts` pertenecen a las
alertas y reutilizan `Provenance`; no reemplazan el contrato global SPA-7 ni los
tipos existentes `FieldAlert` y `EnvironmentalIndicator`.

El motor distingue disponible, desactualizado, simulado, no disponible y sin
verificar. Sin una regla de vigencia aprobada no asigna arbitrariamente un plazo
de caducidad: conserva la fecha y marca la verificación pendiente.

## Verificación

Con las dependencias y el entorno Python ya preparados:

```sh
npm run verify:alerts
```

El comando verifica tipos, lint, pruebas TypeScript, pruebas Python y compilación,
y se detiene con error si falla algún control. Para añadir pruebas de Alertas
en escritorio y móvil:

```sh
npm run verify:alerts -- --browser
```

En Windows utiliza Edge si está instalado y no se ha elegido otro canal con
`PLAYWRIGHT_CHANNEL`. No instala dependencias, no consulta NASA/CNE y no modifica
Git. Los ejemplos y las pruebas siguen sin requerir Earthdata. La validación de
software no sustituye la aprobación científica ni resuelve indicadores faltantes.

Los controles también pueden ejecutarse por separado:

```sh
npm run typecheck
npm run lint
npm test
```

Para las pruebas de navegador con Edge instalado, en PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e -- tests/e2e/alerts.spec.ts
```

En Git Bash:

```bash
PLAYWRIGHT_CHANNEL=msedge npm run test:e2e -- tests/e2e/alerts.spec.ts
```

Las pruebas cubren cuatro categorías, observaciones reales, ausencia de simulación,
procedencia, unidades, fechas e indicadores faltantes o desactualizados,
ES/EN, accesibilidad y ausencia de solicitudes Earthdata. Los ejemplos no validan
la capacidad predictiva de las futuras reglas de riesgo.

## Para activar evaluaciones reales después

Integrar el contrato y los identificadores geográficos acordados, cargar
indicadores con calidad y vigencia verificadas, justificar y aprobar umbrales y
reglas regionales, y validar los resultados con casos reproducibles. El conector
IMERG y su configuración opcional de Earthdata se documentan en
`jobs/data-pipeline/IMERG.md`; no se requieren para esta demostración.

## Revisión de cierre del 15 de noviembre de 2026

El pulido de Sow Water pasó 1141 pruebas TypeScript y 92 pruebas de navegador en escritorio
y móvil, con verificaciones de accesibilidad, idiomas, conexión con Registros y PWA sin conexión.
El código Python y la adquisición ambiental no cambian en este pulido. El comando
`verify:alerts` permite comprobar también el pipeline, tipos, lint y compilación.

Esta es una entrega funcional y probada, no el cierre de todas las tareas del
proyecto Alerta. Permanecen pendientes la aprobación científica de reglas y
vigencia, datos/ingesta SMAP, pendiente, fuente de suelos, verificación de capas
locales y la descarga autenticada IMERG. No se activan valores ni aprobaciones
ficticias para ocultar esas dependencias.
