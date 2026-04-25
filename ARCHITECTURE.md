# Libration Architecture

## Purpose

This document is the durable architectural reference for Libration.

It defines the system boundaries that future implementation work must preserve. More tactical status and sequencing lives in `PLAN.md` and `docs/ROADMAP.md`.

## Architectural identity

Libration is a renderer-agnostic, longitude-first world time and global scene instrument.

The product is built around five architectural commitments:

1. Time is canonicalized as UTC instants.
2. Spatial structure is longitude-first, not timezone-first.
3. Product meaning is resolved upstream of rendering.
4. Rendering intent is expressed as backend-neutral `RenderPlan`.
5. Backends execute resolved plans and do not own product semantics.

## System pipeline

All visual output follows this shape:

```mermaid
flowchart LR
    IN[Config, Time, Assets] --> RES[Resolvers]
    RES --> SEM[Semantic Planning]
    SEM --> LAY[Layout]
    LAY --> ADA[Realization Adapters]
    ADA --> RP[RenderPlan]
    RP --> EX[Executor]
    EX --> BE[Backend]
```

The RenderPlan boundary is hard.

Upstream systems may know about time, map families, chrome meaning, scene layers, fonts, glyph kinds, and user configuration.

Backends may know about surfaces, drawing APIs, caches, image resources, font registration, and primitive execution.

Backends must not decide product behavior.

## Top-level subsystems

### App shell

The app shell owns:

- UI state.
- config loading and saving.
- preset application when implemented.
- render-loop orchestration.
- editor surfaces.
- runtime wiring between time context, scene config, chrome config, and renderer.

The app shell must not become a home for low-level product rules that belong in config normalization, resolvers, planners, or specs.

### Core time model

The product uses one authoritative instant per frame.

Display modes format that instant and its derived civil presentation. They must not mutate the canonical instant.

The reference-frame model separates:

- canonical UTC instant.
- selected reference civil zone.
- read-point meridian.
- civil display projection.
- top-band label format.

Changing local 12 hour, local 24 hour, UTC style labels, or reference city presentation must not create a second product clock.

Demo mode is the intentional exception when it supplies a separate configured time source.

### Display chrome

Display chrome is screen-space instrument content.

Current top chrome includes:

- hour marker entries.
- tickmark tape.
- NATO structural zone row.
- reserved vertical layout above the scene viewport.

Display chrome is not a scene layer. It does not participate in map projection or scene layer ordering.

Top-band hour markers are configured through `chrome.layout.hourMarkers` only. Runtime behavior is derived by resolver, semantic planner, layout, and realization adapter.

### Scene system

The scene system owns projection-space content under the chrome.

SceneConfig is authoritative for:

- `projectionId`.
- `viewMode`.
- `baseMap`.
- ordered `layers[]`.

The scene system composes:

- foundational base map.
- static overlays.
- derived overlays.
- future dynamic and data-driven layers.

Scene composition is deterministic. Base map remains beneath overlays. Overlay order is user-controlled through layer order, with equal-order ties preserving document array order.

### Map asset system

Base-map inventory is declared in the bundled JSON catalog:

```text
src/assets/maps/base-map-catalog.json
```

The app does not scan `public/maps` at runtime and does not fetch a remote catalog.

Persisted config stores base-map family ids, not concrete raster paths. Month-aware families resolve concrete rasters from product time through the catalog-backed resolver.

Map assets are geospatial substrates. They must satisfy the projection contract and must never define spatial truth.

### Layer engine

Layers describe what exists in the projection-space scene.

A layer may be static, derived, or future data-driven. It produces time-resolved layer state. RenderPlan builders convert that state into drawing intent.

Layers must not fetch live data during rendering. Future live feeds belong in a lifecycle system that prepares versioned data snapshots before render execution.

### RenderPlan system

RenderPlan is the shared declarative rendering contract.

Current primitive categories include:

- text.
- rect.
- line.
- path.
- gradients.
- raster patches.
- image blits.

Path and clip payloads should move toward descriptor-backed intent. Backend-native objects are transitional only where still required.

### Backend system

The current backend is Canvas.

Canvas-specific code belongs behind bridges such as:

- `canvasTextFontBridge`.
- `canvasPaintBridge`.
- `canvasPathBridge`.
- Canvas font loading and registration helpers.

Future backends must consume the same upstream render intent and must not require product-specific branching inside the backend.

Backend resource lifecycle reporting is allowed only for concrete resource events. For example, the backend may report that a raster image URL failed to load. It must not decide which map family or fallback raster should be used.

## Configuration architecture

`LibrationConfigV2` is the authoritative persisted application config.

Important config domains:

- chrome layout and top-band controls.
- structured hour-marker configuration.
- scene config.
- map presentation overrides.
- future preset and partial-patch systems.

Normalization must preserve user intent, backfill defaults, clamp unsupported values, and avoid reintroducing removed compatibility surfaces.

Config stores durable semantic ids, not transient file paths or derived runtime values.

## Scene architecture invariants

These rules are non-negotiable:

1. Projection defines spatial truth.
2. Base maps do not define spatial truth.
3. All scene geometry is defined in geographic or projection-aware coordinates before rendering.
4. Scene view and projection are separate concepts.
5. Base map families are selected by durable catalog ids.
6. Month-aware map switching is asset resolution, not camera behavior.
7. Layer ordering is deterministic.
8. Composition belongs upstream of backend execution.

## Chrome architecture invariants

These rules are non-negotiable:

1. Chrome is screen-space, not projection-space.
2. Chrome reserves layout before scene viewport resolution.
3. Display modes format presentation and must not mutate canonical time.
4. Hour-marker persisted state lives under `chrome.layout.hourMarkers`.
5. Runtime content and behavior are derived, not duplicated into parallel persisted axes.
6. Text and procedural glyph realizations flow through the same RenderPlan boundary.

## Renderer invariants

These rules are non-negotiable:

1. Backend receives resolved render intent.
2. Backend does not inspect SceneConfig to decide product behavior.
3. Backend does not implement month-aware map policy.
4. Backend does not decide fonts, glyph kinds, layer semantics, or layout.
5. Backend bridges translate shared intent into backend-native calls only.
6. Resource failure reporting is event reporting, not product fallback policy.

## Current implementation maturity

Stable enough for feature-forward work:

- RenderPlan boundary.
- Canvas backend execution.
- top-band semantic hour-marker path.
- SceneConfig authority.
- curated base-map catalog.
- static and month-aware base maps.
- static overlays.
- derived solar analemma overlay.
- solar shading with twilight band sampling in the upstream illumination raster.
- map presentation controls.
- map onboarding tooling.

Still future or partial:

- full dynamic data lifecycle.
- live feeds.
- gridded scientific datasets.
- advanced blending, masking, and emissive composition.
- alternate projections.
- zoom, pan, tiling, globe view, and camera interaction.
- broad preset system.
- public extension/plugin model.
