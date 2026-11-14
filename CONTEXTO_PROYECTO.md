# Field Farms Challenge — Contexto, decisiones y alineación

14 nov 2026

## Contexto

Field Farms Challenge es una app web (PWA) para el reto "Field Shift: Adapting Farms with NASA Data" de NASA Space Apps 2026, que se hace el 14 y 15 de noviembre en el TEC de Cartago.

| Tema | Dato |
| --- | --- |
| Cliente | PNUD Costa Rica, proyecto GANAR (ganadería sostenible), Área de Conservación Arenal–Huetar Norte |
| Otros actores | SINAC (restauración, Ley Forestal), AyA y las FLUC (ASADAS), CNE (prevención) |
| Usuarios | Finqueros en el celular (a veces sin señal), ASADAS, técnicos de PNUD e instituciones, jurado |
| Premios meta | Local Impact, Galactic Impact y Best Use of Data |
| Entregables | Todo en inglés, demo de 30 s o máximo 7 slides, enlace público |
| Equipo | Programa en JavaScript y Python; presupuesto de $0 |
| Prototipo | Lienzo de diseño con la v10 actual (español e inglés) y versiones anteriores guardadas |

El nombre anterior era RotaCuenca. La rotación de cultivos pasó a ser una extensión futura; se mantuvo la rotación de potreros.

## Objetivo y problema

El objetivo es vincular las fincas y los acueductos comunitarios (ASADAS) a través de la visión de cuenca hidrográfica: lo que una finca hace arriba llega al agua que toma la comunidad abajo.

El problema que resolvemos, según la reunión con PNUD:

- Finqueros y ASADAS son "dos universos" que no se hablan, aunque comparten la misma agua.
- Más del 70 % del agua es subterránea (nacientes y pozos), así que el daño no se ve hasta que la naciente baja.
- Ganaderos y ASADAS no llevan registros del caudal, y sin datos no hay prevención (CNE).
- El Niño 2026 es fuerte: sequía en el Pacífico e inundaciones en el Caribe.
- El finquero no sabe dónde restaurar ni qué le pide la Ley Forestal, y no puede pagar un agrónomo.

Frase guía: "El agua no conoce límites" y "el agua se siembra".

## Decisiones tomadas

La decisión central fue pasar de "plan de cultivos por finca" (v1–v6) a "visión de cuenca que une finca y ASADA" (v8–v10), tras la reunión con PNUD.

| Decisión | Origen | Versión |
| --- | --- | --- |
| Bajar a ras de suelo con datos reales del SNIT (IGN 1:5 000) y NASA MODIS: "Dónde restaurar" y "Ríos sin bosque" | Reunión con SINAC | v10 |
| Quitar las capas ilustrativas ("Prioridad" y el patrón de "Verdor") | Calidad de datos | v10 |
| Asistente sencillo para baja alfabetización, con voz | PNUD | v9 |
| Alertas con las dos caras de El Niño y deslizamientos | PNUD | v9 |
| Proyección del caudal mensual para prevenir (CNE) | PNUD | v9 |
| Guía ABC como pantalla de inicio | PNUD | v9 |
| Registros fáciles de caudal (balde y cronómetro) para finquero, ASADA e institución | PNUD | v8 |
| Acciones del dueño que protegen el agua (corredores ribereños, nacientes, Ley Forestal) | PNUD | v8 |
| Aliados FLUC en la app | PNUD (archivo AyA) | v8 |
| Rotación de cultivos queda para después; se mantiene la rotación de potreros | Equipo + PNUD | v8 |
| Cobertura para todo el país, no solo Huetar Norte | Equipo | v8 |
| Separar capa NASA (global) de capa local, para replicar en otros países | Equipo | v8 |
| Nombre: Field Farms Challenge | Equipo | v8 |
| Mapas con pellizco para acercar y botones grandes (accesibilidad) | Equipo | v6 |
| PWA modular: React + TypeScript + Vite; backend Supabase/PostgreSQL/PostGIS; Python para datos; monorepo por funcionalidades. Sustituye la sugerencia inicial Firebase → Supabase | Equipo, arquitectura acordada | base 0.1 |
| Marcar en la app qué dato es real, simulado o ilustrativo | Equipo | todas |
| El finquero elige qué comparte (ubicación, cultivos, nombre, teléfono) | Equipo | diseño |

Las variantes de diseño v7 (tanque, números, gota, máquina del tiempo, voz, vecinos) quedaron guardadas para decidir el estilo.

## Datos que usamos

De 14 fuentes, 12 son reales; IMERG/SMAP y las fincas de ejemplo están simuladas, y la anomalía cantonal no tiene institución confirmada.

| Dato | Estado | Para qué sirve |
| --- | --- | --- |
| NASA POWER: lluvia, temperatura, humedad del suelo (6 puntos, 1991–nov 2026) | Real | Clima, largo del verano, escenarios de El Niño |
| NASA MODIS verdor 250 m por zona (2026 vs 2012–2025) | Real | Pantalla satélite, estado del pasto |
| NASA MODIS verdor mensual 1 km, todo el país (nov 2025–oct 2026 vs 2016–2020) | Real | Dónde restaurar, tu zona desde arriba |
| NOAA índice RONI de El Niño (+2,0) y pronóstico | Real | Alertas y escenarios |
| NASA IMERG (lluvia fuerte) y SMAP (humedad) | Simulado | Alertas de inundación y deslizamiento |
| SAGA: 1 334 ASADAS, 5 395 fuentes | Real | Nacientes, conexiones, 87 % agua subterránea |
| Cuencas (34) y subcuencas (1 868) | Real | Visión de cuenca, arriba y abajo |
| RIESGOS: uso de la tierra, inundación, deslizamientos, sequía 2014–15 | Real | Tierra frágil, alertas, "esto pasó en 2015" |
| Anomalía de lluvia por cantón, oct 2026 | Real, origen por confirmar | Alertas por cantón |
| Registro FLUC (AyA, 21 oct 2026) | Real | Aliados de cada ASADA |
| IGN 1:5 000 (2017): ríos, bosque, potreros | Real | Ríos sin bosque (15 m de ley) |
| Ley Forestal 7575, art. 33 | Real | Reglas de protección |
| Plan Prepárate del MAG y FAO-56 | Real | Acciones y cálculos de agua |
| Fincas, vecinos, modo demo, registros de ejemplo, tablero institucional | Simulado | Mostrar cómo funciona |

Por sumar: planes oficiales de recuperación del SINAC (links recibidos), capa de humedales del SNIT, Pago por Servicios Ambientales de FONAFIFO, pendiente del terreno (NASA SRTM), Sentinel-2 o Landsat para verdor más fino, IMERG/SMAP reales y GLDAS para validar con 2015.

## Decisiones pendientes

La más urgente es el formato de la demo (video o slides), porque se entrega en inglés antes del cierre del 15 de noviembre.

| Decisión | Opciones | Quién decide |
| --- | --- | --- |
| Formato de la demo | Video de 30 s o hasta 7 slides | Equipo |
| Qué usar de los planes del SINAC | Zonas prioritarias oficiales, especies por zona, metas de restauración | Equipo, tras revisar los links |
| Sumar capa de humedales | Sí en la v11 o dejarla para después | Equipo |
| Mostrar el ahorro y el apoyo al finquero | Pago por Servicios Ambientales (FONAFIFO), ahorro del plan de finca | Equipo + SINAC |
| Conectar IMERG y SMAP reales | Hacerlo en el hackathon (cuenta Earthdata) o dejarlo simulado | Equipo |
| Estilo de diseño final | Una de las 6 variantes v7 o el estilo actual | Equipo |
| Construir la arquitectura | Decidido: base navegable modular con datos demo; persistencia Supabase y procesos Python por etapas | Equipo |
| Cifras oficiales de GANAR (hectáreas, fincas) | Pedir a PNUD | PNUD |
| Origen del archivo de lluvia cantonal | Confirmar si es del IMN | Equipo |
| Validar con familia en Canaán de Rivas (lechería) | Entrevista o prueba de uso | Equipo |
| Qué se queda fuera para no abrumar | Recortar pantallas (clima, plan de cultivos, vecinos) | Equipo |

## Alineación con el objetivo

Estamos bien alineados en la visión de cuenca y en las acciones de la finca; la brecha más grande es el puente real entre finquero y ASADA, que hoy existe sobre todo en el discurso y en datos simulados.

| Pilar del objetivo | Nivel | Qué ya hay | Qué falta |
| --- | --- | --- | --- |
| Visión de cuenca (dónde nace el agua, arriba afecta abajo) | Alto | Subcuenca de cada finca, corte "Dónde nace tu agua", nacientes y conexiones cuenca abajo | Mostrar el recorrido del agua de una finca concreta a una ASADA concreta |
| Acciones del dueño que protegen el agua potable | Alto | Cuidar, Ley Forestal, nacientes en riesgo, ríos sin bosque y dónde restaurar con datos reales | Especies y zonas oficiales del SINAC |
| Uso de datos NASA | Alto | POWER, MODIS 250 m y 1 km para todo el país, RONI | IMERG y SMAP reales |
| Unir finqueros y ASADAS | Medio | Roles en registros, aviso a fincas y ASADAS (simulado), aliados FLUC | Un espacio compartido: la ASADA ve qué hacen las fincas de su recarga y les responde |
| Registros fáciles de caudal | Medio | Calculadora con balde, gráfico, proyección mensual | Guardar y compartir de verdad (sin servidor aún) |
| Prevención (CNE, El Niño) | Medio | Alertas de sequía, inundación y deslizamiento; historia 2014–15 | Lluvia y humedad reales; validar con 2015 |
| Fácil para baja alfabetización | Medio | Guía ABC, asistente con voz, botones grandes | Probarlo con finqueros reales |
| Replicable en otros países | Medio | Capa NASA separada de la capa local | Demostrarlo con un segundo país o cuenca |

Riesgo de foco: pantallas como clima, plan de cultivos y vecinos no sirven directo al objetivo y pueden abrumar en la demo.

## Próximos pasos

Actualización de implementación: la base navegable conserva el prototipo v10 en `references/prototype-v10.html`. La web utiliza ejemplos tipados y el catálogo de apoyos documentado; no implica autenticación, sincronización ni datos NASA conectados. Ver `README.md` y `docs/architecture.md` para el estado técnico actual.

- [ ] Revisar los links del SINAC y elegir qué entra en la app
- [ ] Diseñar el puente finca–ASADA: una vista donde la ASADA ve las fincas de su zona de recarga y lo que hacen
- [ ] Decidir qué pantallas se recortan para la demo
- [ ] Validar "Dónde restaurar" del Arenal con la persona del SINAC
- [ ] Elegir formato de demo y preparar el material en inglés
- [ ] Pedir a PNUD las cifras oficiales de GANAR
