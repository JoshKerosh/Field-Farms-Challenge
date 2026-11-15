# Alertas ambientales sin Earthdata

La pantalla `/alerts` permite probar cuatro categorías: sequía, inundación,
exceso de agua en el suelo y deslizamiento. No necesita cuentas, tokens ni
servicios externos para abrir o usar los escenarios de demostración.

## Probar

Desde la raíz, ejecutar `npm run dev` y abrir `/alerts` en la dirección que
indique Vite. Usar **Simular sequía**, **Simular lluvias intensas** o **Simular
calor**. Al salir de la simulación vuelven las evaluaciones pendientes y no se
conservan valores ficticios como si fueran datos reales.

El modo de simulación es el mismo estado compartido que utiliza Ambiente. No
se persiste al recargar la página. Los controles global y local permiten salir.

## Dos modos separados

- **Datos disponibles:** las cuatro evaluaciones reales son indeterminadas hasta
  contar con indicadores verificables y reglas científicas aprobadas. El motor
  nunca transforma ausencia de datos en riesgo bajo.
- **Simulación:** todos los indicadores proceden del ejemplo aislado de
  `apps/web/src/demo/fixtures/environmental-alerts.ts`, incluidos sus períodos.
  Los niveles son un guion visual predefinido, **no comparaciones con umbrales
  científicos**. Ni la finca, ni su capacidad de uso, ni la rotación ganadera
  convierten estos ejemplos en evaluaciones reales de la ubicación seleccionada.

Las tarjetas se ordenan por severidad y muestran motivo, indicadores, fuente,
período y orientaciones generales. El nivel de demostración se identifica como
tal en cada tarjeta. Las tablas se desplazan horizontalmente en móvil. La fecha
de generación se muestra en la zona horaria de Costa Rica y permanece separada
del período de observación. La interfaz y las respuestas relacionadas del
asistente funcionan en español e inglés. No hay enlace de WhatsApp en Alertas.

## Estado de los datos reales

La anomalía POWER empaquetada conserva su valor y ventana de observación, pero
se marca **sin verificar**: no se ha integrado la actualización ni aprobado la
referencia/metodología de anomalía o la regla de vigencia. El índice NOAA y la
vertiente del prototipo también quedan sin verificar; no se inventan fechas
ausentes ni se afirma que ONI y RONI sean intercambiables.

IMERG, SMAP, pendiente, suelo y cruces CNE permanecen no disponibles para esta
pantalla. La humedad POWER no se presenta como humedad volumétrica SMAP. Las
descargas locales de `jobs/data-pipeline/data/` no se incorporan automáticamente
al frontend; tampoco se utiliza el valor de un único punto como promedio de una
subcuenca distinta. El historial 2014–2015 sigue siendo contexto histórico real
según los archivos del proyecto y no determina la severidad actual.

Los tipos de evidencia añadidos en `packages/domain/src/alerts` pertenecen a las
alertas y reutilizan `Provenance`; no reemplazan el contrato global SPA-7 ni los
tipos existentes `FieldAlert` y `EnvironmentalIndicator`.

El motor distingue disponible, desactualizado, simulado, no disponible y sin
verificar. Sin una regla de vigencia aprobada no asigna arbitrariamente un plazo
de caducidad: conserva la fecha y marca la verificación pendiente.

## Verificación

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

Las pruebas cubren cuatro categorías, orden, cambio de escenario, salida limpia,
procedencia, unidades, fechas, indicadores faltantes/desactualizados/simulados,
ES/EN, accesibilidad y ausencia de solicitudes Earthdata. Los ejemplos no validan
la capacidad predictiva de las futuras reglas de riesgo.

## Para activar evaluaciones reales después

Integrar el contrato y los identificadores geográficos acordados, cargar
indicadores con calidad y vigencia verificadas, justificar y aprobar umbrales y
reglas regionales, y validar los resultados con casos reproducibles. El conector
IMERG y su configuración opcional de Earthdata se documentan en
`jobs/data-pipeline/IMERG.md`; no se requieren para esta demostración.
