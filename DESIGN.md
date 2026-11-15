---
name: Field Farms Challenge
description: Identidad heredada del prototipo v10 para una herramienta de campo accesible.
colors:
  primary: '#17617C'
  primary-deep: '#10485D'
  forest: '#2E7A43'
  canvas: '#F3F6F1'
  surface: '#FFFFFF'
  ink: '#16231C'
  muted: '#55665B'
  line: '#DCE4DD'
  water-tint: '#E3EFF3'
  forest-tint: '#E2F1E5'
  amber: '#F2B53A'
  amber-ink: '#6B4505'
  amber-tint: '#FDF1D6'
  danger: '#8E2A21'
typography:
  headline:
    fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif'
    fontSize: '2rem'
    fontWeight: 600
    lineHeight: 1.15
  body:
    fontFamily: 'Nunito Sans, Segoe UI, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: '8px'
  md: '12px'
  lg: '16px'
spacing:
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.surface}'
    rounded: '{rounded.md}'
    padding: '12px 20px'
  button-primary-hover:
    backgroundColor: '{colors.primary-deep}'
    textColor: '{colors.surface}'
---

# Design System: Field Farms Challenge

## Overview

Se conserva la identidad del HTML v10: azul agua, verde bosque, fondos claros y controles legibles. Es una interfaz para operar en el campo: la tarea, el contexto y la procedencia de los datos preceden a la decoración.

## Colors

El azul identifica navegación y acciones principales. El verde indica cuidado y acciones completadas. El ámbar identifica la demostración y las funciones pendientes, siempre acompañado de texto. Los valores normativos están en el frontmatter y en `apps/web/src/styles/tokens.css`.

## Typography

Bricolage Grotesque en títulos y marca; Nunito Sans en interfaz y texto. Se reutilizan las fuentes empaquetadas en el prototipo, con su licencia. La escala es fija en rem y respeta el aumento de texto. Las cantidades usan cifras tabulares.

## Layout

En el teléfono: una columna, encabezado compacto, contenido y navegación inferior con las seis secciones del prototipo. En escritorio: navegación lateral y contenido con ancho de lectura limitado. El lienzo fijo de 390 × 844 del prototipo se reemplaza por un flujo adaptable, manteniendo su lenguaje visual.

## Elevation & Depth

La jerarquía se expresa mediante superficies y espaciado. Las secciones normales utilizan divisores; los paneles destacados usan fondo tonal. No se necesitan sombras decorativas.

## Shapes

Controles de esquinas suaves y áreas táctiles amplias. Los paneles utilizan el radio grande; los estados pequeños pueden usar etiquetas compactas. No se anidan paneles para cada fragmento de información.

## Components

- Botones y enlaces de acción: altura mínima de 44 px, estados hover, foco, activo y deshabilitado.
- Navegación: icono y texto, sección activa semántica, distribución adaptable.
- Estados: demostración, pendiente, vacío y sin conexión con texto explícito.
- Mapas y gráficos: resumen textual equivalente; los ejemplos geográficos no representan conexiones hidrológicas comprobadas.
- Cambios de ruta: título actualizado y foco en el encabezado principal.

## Do's and Don'ts

- Do conservar el contexto de finca y cuenca entre secciones.
- Do mostrar fuente y fecha junto a la información externa.
- Do respetar movimiento reducido y ampliación de texto.
- Don't presentar ejemplos, predicciones o ahorros como hechos observados.
- Don't utilizar únicamente color, un mapa o un icono para transmitir información.
