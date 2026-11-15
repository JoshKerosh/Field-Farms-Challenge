---
name: Field Farms Challenge
description: Identity inherited from the v10 prototype for an accessible field tool.
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

The identity of the v10 HTML is kept: water blue, forest green, light backgrounds and readable controls. It is an interface for working in the field: the task, the context and the data source come before decoration.

## Colors

Blue marks navigation and primary actions. Green marks care and completed actions. Amber marks the demo and pending features, always paired with text. The normative values are in the frontmatter and in `apps/web/src/styles/tokens.css`.

## Typography

Bricolage Grotesque for headings and brand; Nunito Sans for interface and body text. The fonts bundled in the prototype are reused, with their license. The scale is fixed in rem and respects text zoom. Quantities use tabular figures.

## Layout

On the phone: one column, compact header, content and bottom navigation with the prototype's six sections. On desktop: side navigation and content with a limited reading width. The prototype's fixed 390 × 844 canvas is replaced by an adaptive flow that keeps its visual language.

## Elevation & Depth

Hierarchy is expressed through surfaces and spacing. Regular sections use dividers; highlighted panels use a tonal background. Decorative shadows are not needed.

## Shapes

Softly rounded controls and large touch areas. Panels use the large radius; small states can use compact tags. Panels are not nested for every piece of information.

## Components

- Buttons and action links: minimum height of 44 px, hover, focus, active and disabled states.
- Navigation: icon and text, semantic active section, adaptive layout.
- States: demo, pending, empty and offline, with explicit text.
- Maps and charts: equivalent text summary; geographic examples do not represent proven hydrological connections.
- Route changes: updated title and focus on the main heading.

## Do's and Don'ts

- Do keep the farm and watershed context across sections.
- Do show source and date next to external information.
- Do respect reduced motion and text zoom.
- Don't present examples, predictions or savings as observed facts.
- Don't rely only on color, a map or an icon to convey information.
