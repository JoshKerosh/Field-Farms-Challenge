# Evaluación de riesgos mediante políticas documentadas

Actualización: el equipo decidió una combinación de tres condiciones para el
mapa de deslizamientos e inundaciones y delegó sus parámetros iniciales. Véase
[Mapa de condiciones](condition-risk-map.md). Esa regla operativa tiene su propio
motor y no llena automáticamente las políticas científicas descritas aquí.

`packages/domain/src/alerts/evaluate.ts` implementa las cuatro categorías sin
dependencias de React, proveedores o navegador. No contiene umbrales científicos.
La configuración se lee de `apps/web/public/data/alerts/rules.json`.

El equipo confirmó que todavía no existen reglas aprobadas, por lo que ese
archivo contiene una lista vacía. **No se debe cambiar una regla a aprobada
para conseguir que la interfaz muestre un nivel.** La aprobación y las referencias
deben corresponder a una revisión real de su aplicación geográfica y del producto.

## Qué necesita cada evaluación

| Categoría     | Evidencias mínimas                                                               |
| ------------- | -------------------------------------------------------------------------------- |
| Sequía        | RONI, vertiente, anomalía POWER de 30 días, humedad SMAP.                        |
| Inundación    | IMERG 1 y 7 días, zona CNE, vertiente.                                           |
| Saturación    | Humedad volumétrica SMAP con un criterio aplicable al suelo/producto.            |
| Deslizamiento | Pendiente, propiedades del suelo, lluvia IMERG, humedad SMAP y antecedentes CNE. |

Un input faltante, simulado, sin verificar o desactualizado devuelve
`indeterminate`. También se rechazan fechas futuras o inválidas, períodos
invertidos, valores no finitos, fuentes ausentes, unidades y productos distintos
de los configurados y ventanas incompletas. Un cero numérico o `false` verificado
sí son valores válidos; no equivalen a un valor ausente.

## Forma de una política

El contenedor lleva `schemaVersion: alert-risk-policies-v1` y una lista `policies`.
Cada política debe proporcionar:

- `id`, `version` y `risk` (una de las cuatro categorías).
- `approval`: `status: approved`, nombre en `by`, fecha en `date` y URLs HTTPS
  en `references`. La fecha no puede ser posterior a la evaluación.
- `requirements`: una entrada por indicador requerido, con `unit`, `productId`,
  `maxAgeDays` y opcionalmente `windowDays`. La antigüedad es una decisión explícita
  de la política, no una constante oculta del programa.
- `bands`: cada una tiene `id`, `severity` y `all`, una lista no vacía de condiciones
  simultáneas. Las condiciones indican `indicator`, `operator` y `value`.
- `defaultSeverity`: clasificación acordada cuando se dispone de todos los datos
  válidos pero no se cumple una combinación de activación.

Los operadores son `gte`, `lte`, `gt`, `lt` y `eq`. Los cuatro primeros requieren
valores numéricos. `eq` permite booleanos y categorías; no hay conversiones
automáticas entre `true`, `"true"`, números o texto. Esto permite expresar
combinaciones por vertiente, susceptibilidad, suelo y lluvia sin imponer una regla
universal de El Niño ni un peso arbitrario para el Caribe.

Si coinciden varias bandas, se selecciona la mayor severidad entre ellas y la
severidad predeterminada. Se devuelven IDs de bandas, factores utilizados y la
identidad y referencias de la política. Dos políticas aprobadas para la misma
categoría se rechazan para no elegir arbitrariamente una versión.

## Identidad de los indicadores conectados

| Evidencia                        | `productId`                       | Unidad                  |
| -------------------------------- | --------------------------------- | ----------------------- |
| Índice RONI                      | `NOAA-RONI-ERSSTv6`               | `°C`                    |
| Anomalía de lluvia               | `POWER-PRECTOTCORR-30D-1991-2020` | `%`                     |
| Lluvia IMERG 1/7 días            | `GPM_3IMERGDL.07`                 | `mm`                    |
| Zona CNE de inundación           | `cne:inundaciones`                | cadena vacía (booleano) |
| Antecedente CNE de deslizamiento | `cne:deslizamientos`              | cadena vacía (booleano) |

CNE conserva estado sin verificar por fecha desconocida. No se ha definido una
identidad aprobada para suelo, pendiente ni vertiente. SMAP debe distinguir capa
superficial y zona de raíces antes de fijar su identidad y criterio. No basta
con escribir un `productId` para resolver la verificación pendiente.

## Pruebas

Los únicos umbrales y aprobaciones existentes son fixtures **sintéticas en los
archivos de prueba**, con referencias `example.test`. No se publican en la
configuración real. Las pruebas cubren cada categoría, límites exactos, factores
faltantes, unidades, períodos, antigüedad, combinaciones regionales, conflictos
de políticas y conservación de resultado indeterminado sin aprobación.
