# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Finqueros y ganaderos de Costa Rica que utilizan el teléfono, en ocasiones sin señal y con distintos niveles de alfabetización digital. ASADAS, FLUC y equipos técnicos necesitan consultar información compartida sobre la misma cuenca.

## Product Purpose

Relacionar el cuidado de la finca con el agua de la comunidad: conocer la cuenca, registrar observaciones y acompañar acciones de regeneración. La primera entrega es una base navegable con ejemplos identificados.

## Positioning

Una visión de cuenca conecta finca, fuente de agua y ASADA, combinando observaciones de campo e indicadores ambientales. Una relación hidrológica requiere información validada; la cercanía por sí sola no demuestra una conexión.

## Operating Context

Equipo con JavaScript y Python, presupuesto inicial de $0 y cliente PNUD Costa Rica, proyecto GANAR. Se conserva el prototipo v10 como referencia funcional. La implementación inicial utiliza React, TypeScript y Vite; Supabase/PostgreSQL/PostGIS y los procesos Python se incorporan por etapas.

## Capabilities and Constraints

- Primera entrega: navegación, módulos, ejemplos tipados y catálogo informativo de apoyos.
- Secciones principales: Mi finca, Mi cuenca, Alertas, Cuidar, Registros y Guía.
- Accesos secundarios: ambiente, asistente, beneficios y fuentes.
- La rotación de potreros se conserva. Planes de siembra y simulaciones de vecinos quedan documentados para después.
- La base no implementa autenticación, sincronización, ingesta NASA, solicitudes de financiamiento ni cálculos monetarios.
- Un selector de vista demo no concede permisos reales. Los datos del ejemplo no se envían a organizaciones.
- Español de Costa Rica inicialmente; textos centralizados para futuras traducciones.

## Brand Commitments

Nombre Field Farms Challenge. Frase del prototipo: «El agua se siembra». Se hereda su identidad visual y su guía ABC; esta etapa no es un rediseño integral.

## Evidence on Hand

`references/prototype-v10.html` preserva el HTML original, sus datos y sus avisos de licencia. `CONTEXTO_PROYECTO.md` conserva las decisiones históricas. Las fuentes primarias de apoyos se registran en `docs/opportunities.md`. Los ejemplos nuevos son ficticios y se identifican en la aplicación.

## Product Principles

- Una tarea sencilla antes de una pantalla llena de indicadores.
- Procedencia, fecha y carácter estimado visibles.
- El finquero decide qué compartir cuando exista la integración real.
- Los beneficios económicos requieren costos y comparaciones verificables.
- La app orienta hacia apoyos; las entidades externas deciden y certifican.

## Accessibility & Inclusion

Interfaz adaptable al teléfono y al aumento de texto, controles de al menos 44 px, foco visible, formularios etiquetados y alternativas textuales a mapas y gráficos. La ayuda por voz complementa el texto y depende de la disponibilidad del dispositivo. Esta entrega debe funcionar sin cuentas externas y permitir consultar las pantallas precargadas sin conexión.
