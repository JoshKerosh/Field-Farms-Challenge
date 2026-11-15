# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Farmers and cattle ranchers in Costa Rica who use their phone, sometimes without signal and with different levels of digital literacy. ASADAS, FLUC and technical teams need to look up shared information about the same watershed.

## Product Purpose

Connect farm care with the community's water: understand the watershed, record observations and support regeneration actions. The first delivery is a navigable base with labeled examples.

## Positioning

A watershed view connects farm, water source and ASADA, combining field observations with environmental indicators. A hydrological relationship requires validated information; proximity alone does not prove a connection.

## Operating Context

Team working in JavaScript and Python, initial budget of $0, client UNDP (PNUD) Costa Rica, GANAR project. The v10 prototype is kept as the functional reference. The implementation uses React, TypeScript and Vite; data is flat files published by Python jobs, with no database.

## Capabilities and Constraints

- First delivery: navigation, modules, typed examples and an informational catalog of support programs.
- Main sections: My farm, My watershed, Alerts, Care, Records and Guide.
- Secondary shortcuts: environment, assistant, benefits and sources.
- Pasture rotation is kept. Planting plans and neighbor simulations are documented for later.
- The base does not implement authentication, sync, NASA ingestion, funding applications or monetary calculations.
- A demo view selector does not grant real permissions. Example data is not sent to organizations.
- Costa Rican Spanish first; text centralized for translations.

## Brand Commitments

Name Field Farms Challenge. Prototype tagline: "El agua se siembra" (water is sown). Its visual identity and ABC guide are inherited; this stage is not a full redesign.

## Evidence on Hand

`references/prototype-v10.html` preserves the original HTML, its data and its license notices. `PROJECT_CONTEXT.md` keeps the historical decisions. Primary sources for support programs are recorded in `docs/opportunities.md`. New examples are fictional and labeled in the app.

## Product Principles

- One simple task before a screen full of indicators.
- Source, date and estimated status visible.
- The farmer decides what to share once the real integration exists.
- Economic benefits require verifiable costs and comparisons.
- The app points toward support programs; external entities decide and certify.

## Accessibility & Inclusion

Interface that adapts to the phone and to larger text, controls of at least 44 px, visible focus, labeled forms and text alternatives to maps and charts. Voice help complements the text and depends on device support. This delivery must work without external accounts and let users browse the preloaded screens offline.
