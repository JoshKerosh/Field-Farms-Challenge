# Clima y satélite

La pantalla `/environment` combina el visor histórico de subcuenca de `dev`, mapas geográficos reales y los indicadores publicados en `/data/`. Se reutilizan el contrato, el catálogo y los archivos POWER/RONI del ticket de datos (commit `8e43a8c`). Los conectores y los mapas de Mi finca y Mi cuenca no se modifican.

## Visores y procedencia

- **Mi subcuenca:** recupera la reproducción temporal del histórico MODIS regional de 2026 en `src/data/real/climate.json`, con el mismo motor de limpieza de nubes del prototipo. La cuadrícula dentro del contorno es ilustrativa y se identifica como tal; no representa píxeles medidos en la finca. El refinamiento visual de sus cuadros no añade mediciones.
- **Imágenes satelitales:** Esri World Imagery como base y capas geográficas NASA GIBS de verdor MODIS, lluvia IMERG, temperatura superficial MODIS y humedad SMAP superficial/de raíces. Estas imágenes públicas no requieren cuenta Earthdata. Las fechas y cadencias se leen de GetCapabilities; no se inventan fechas para la animación.
- **Temperatura:** se utiliza `MODIS_Terra_L3_Land_Surface_Temp_8Day_Day`, compuesto de ocho días. La fecha es el inicio del periodo y la escala oficial está en kelvin. Se verificó que la capa diaria del 15 de noviembre estaba completamente transparente sobre Costa Rica; el compuesto evita ese vacío, conservando su fecha real. Si una consulta no tiene píxeles válidos, se informa en el visor.
- **Altitud:** Terrain Tiles Terrarium, con datos SRTM y otras fuentes. Se decodifican metros reales por píxel y se aplica una escala hipsométrica compartida con la leyenda. La geometría 3D se exagera 1,3 veces; el número de altitud se corrige para mostrar metros, no altura exagerada.
- La finca se marca en todas las capas y su parcela se dibuja cuando existe. Las cuencas seleccionadas incluyen el punto y las que intersectan la parcela, utilizando las mismas reglas de Mi cuenca. Cambiar entre vegetación y altitud conserva el mapa y la fecha recordada de cada capa.
- El suavizado solo interpola visualmente los bordes: no aumenta la resolución del producto (MODIS NDVI aproximadamente 250 m, temperatura 1 km, SMAP 9 km, IMERG aproximadamente 10 km). “Ajustar escala” permite reducir el tamaño de los píxeles en pantalla.

Documentación primaria: [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/), [Terrain Tiles y formato Terrarium](https://github.com/tilezen/joerd/blob/master/docs/formats.md).

- POWER disponible: lluvia acumulada de 7 y 30 días, referencia 1991–2020, anomalía, temperatura máxima promedio y humedad en raíces. El archivo incluido tiene observaciones hasta el 11 de noviembre de 2026 y una serie diaria de 90 días por zona.
- NOAA RONI disponible: índice del trimestre móvil y señal climática, con fecha propia y cobertura del Pacífico ecuatorial. El archivo incluido llega al 31 de octubre de 2026.
- MODIS numérico actualizado: se lee `nasa/modis/latest.json` cuando el conector lo publique. Su ausencia no impide consultar el histórico regional ni las imágenes de GIBS, y no se presenta como ausencia de todo dato MODIS.
- Los ejemplos simulados IMERG/SMAP no se utilizan para los indicadores. Sus capas visuales sí son imágenes reales de NASA GIBS y no rellenan artificialmente las tarjetas de POWER.

La exploración de mapas no exige seleccionar una finca. Los indicadores de POWER sí requieren una finca: su ubicación determina la región usando el mismo dataset territorial de la app. Se muestran las coordenadas del punto de referencia y su distancia aproximada a la finca. Los seis puntos regionales no son mediciones dentro de la parcela ni un pronóstico diario.

## Integración con Plan de recuperación

El lector compartido conserva `powerHistory` para los 24 meses de lluvia de recuperación y
admite `refresh` para volver a consultar las observaciones de clima y su catálogo. El catálogo
mantiene tanto las fuentes NASA/NOAA regionales como `recovery-power` y `recovery-history`.
Los archivos POWER y RONI de ambas ramas contienen las mismas observaciones; se conserva
su contenido y fecha, sin convertir la fecha del merge en una actualización ambiental.

Clima y satélite permite explorar imágenes públicas sin registrar un perfil. Sin ubicación,
abre el mapa general y no genera un histórico para la ubicación predeterminada del prototipo.
La opción Mi subcuenca pide seleccionar la finca antes de mostrar su histórico regional.
Plan de recuperación mantiene su confirmación de perfil y sus metas privadas por parcela.
Los históricos de recuperación permanecen separados del conector regional ORNL y de las
capas visuales GIBS; la ausencia de `nasa/modis/latest.json` no borra los datos AppEEARS.

Cada indicador conserva su fecha de observación. La procedencia también muestra la fecha de publicación del archivo, la antigüedad del dato y el enlace original. Si el catálogo informa una falla pero existe un archivo válido, se presenta como último dato disponible. Cada fuente carga por separado: una falla de MODIS no oculta POWER o NOAA. “Volver a consultar” solicita los archivos de nuevo. Las observaciones ya visitadas se guardan mediante el service worker para consulta sin conexión, manteniendo sus fechas originales.

Los archivos deben cumplir el contrato, identificar la fuente esperada, proceder de su dominio oficial y declarar datos no simulados. Fechas imposibles, series no numéricas, fuentes inconsistentes o unidades duplicadas se rechazan. Un valor ausente se muestra como “Sin datos disponibles”; un cero real sigue siendo cero.

Las explicaciones comparan los indicadores publicados con su referencia histórica. No convierten una anomalía regional en una confirmación de sequía, inundación o pérdida de pasto en la finca. La humedad es un índice de 0 a 1, no un porcentaje de contenido volumétrico. El modo de simulación global no modifica estos datos.

Verificación: `npm test`, `npm run typecheck`, `npm run lint` y `npm run test:e2e -- tests/e2e/environment.spec.ts`. La prueba de MODIS utiliza una respuesta controlada exclusivamente dentro del test para comprobar el comportamiento cuando exista el archivo.
