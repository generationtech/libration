# Scene System Specification


## Current Implemented Scene System Status

The Scene System is now implemented beyond the initial specification baseline.

Current capabilities include:

- `SceneConfig` as authoritative persisted scene model.
- Explicit base-map family selection through `scene.baseMap.id`.
- Multi-base-map selector/editor integration.
- Deterministic ordered scene-layer composition.
- Static raster overlay support.
- Derived overlay support, including solar analemma ground-track.
- Generalized semantic participation for supported overlay sources.
- Scene-authoritative runtime rebuild behavior for scene-only changes.
- Month-aware base-map families resolved from product time.
- Runtime base-map image-load failure fallback without moving map policy into the backend.
- Optional per-family **base map presentation** (`scene.baseMap.presentation`): user-tunable brightness, contrast, gamma, and saturation — visual-only, not persisted per month file. The canvas backend applies B/C/S via `filter` and applies γ in a full-resolution pixel pass when γ ≠ 1.

These additions preserve the current projection and scene-view assumptions: equirectangular, full-world fixed view.

---

## Purpose

Define the architecture and behavior of the Libration Scene System.

The Scene System composes all projection-space content beneath the display chrome into a unified, user-controlled visual scene.

This document is aligned with `scene-config-v1 (refined v2)` and formalizes:
- how SceneConfig is interpreted
- how projection and view are applied
- how layers compose and render
- how future capabilities integrate without rewrites

---

## Core Definition

A **Scene** is:

> An ordered, projection-aware composition of layer instances rendered within a defined scene view.

---

## Authoritative Inputs

The Scene System is driven by:

- `SceneConfig`
  - projectionId
  - viewMode
  - baseMap
  - ordered layer stack
- global time context
- resolved viewport (excluding chrome)

---

## Scene Responsibilities

The Scene System owns:

- base map realization (as foundational layer)
- layer stacking and ordering
- projection-space alignment
- scene-view application
- composition (opacity; future blending)
- preparation of RenderPlans (via builders)

The Scene System does NOT own:

- display chrome (top band, HUD)
- backend execution
- primitive drawing logic

---

## Architectural Position

Pipeline:

Layer → LayerState → RenderPlan Builder → RenderPlan → Executor → Backend

Scene System responsibilities occur **upstream of the backend**:

- selects/constructs layer instances from config
- resolves ordering
- provides projection + view to builders
- ensures all layers emit consistent RenderPlan intent

---

## Scene Composition Model

### Components

1. **Projection**
   - Maps (lat, lon) → scene coordinates
   - Defined by `projectionId`

2. **Scene View**
   - Defines visible portion and framing
   - Defined by `viewMode`

3. **Base Map**
   - Foundational raster aligned to projection
   - Modeled explicitly in config

4. **Layer Stack**
   - Ordered `SceneLayerInstance[]`

---

## Ordering Model

- Lower `order` renders first (bottom)
- Higher `order` renders later (top)
- Ordering is **user-controlled (Option B)**

Notes:
- Base map is conceptually lowest, but still explicit
- Future: optional family-aware guidance (non-blocking)

---

## Layer Semantics

Each layer instance separates:

- **family** (environment, astronomy, mobility, annotation, reference, custom)
- **type** (behavioral category)
- **source** (data origin)
- **presentation** (visual configuration)

This separation prevents coupling between data acquisition and rendering.

---

## Composition Rules

### v1

- single active projection
- single scene view (`fullWorldFixed`)
- alpha compositing only
- no blending modes

### Future

- blending modes (multiply, screen, additive)
- masking / clipping
- family-aware ordering hints

---

## Projection Alignment

All scene elements must:

- be defined in geographic coordinates
- be transformed via the active projection
- align in a shared coordinate system

> Maps conform to projection — never define it.

---

## Scene View (v1)

`viewMode = "fullWorldFixed"`

- entire world mapped to scene viewport
- no zoom or pan
- viewport derived upstream (chrome excluded)

---

## Future Scene Views

- zoom/pan 2D
- orthographic globe
- perspective globe

The Scene System must not assume full-world rendering as permanent.

---

## Data vs Rendering Separation

Invariant:

- Layers describe data
- Builders convert data → RenderPlan
- Backend executes primitives only

No product semantics may leak into backend execution.

---

## Temporal Model

- Scene is time-aware via shared time context
- Derived layers depend on time deterministically

Future:
- per-layer time modes (live, fixed, scrubbed)
- playback and forecast visualization

---

## Data Lifecycle Integration (Future-Aware)

Scene System **consumes** data produced by the Layer Data Lifecycle system:

- acquisition, caching, versioning occur outside rendering
- Scene only consumes ready/stale/error states

---

## Performance Considerations (Future-Aware)

Current:
- full-world raster acceptable

Future:
- tiling
- level-of-detail
- selective redraw
- GPU-backed execution paths

Design must not block these evolutions.

---

## Interaction Model (Future)

- layer selection and isolation
- hover/click inspection (requires inverse projection)
- legends and metadata panels

---

## Relationship to SceneConfig

- SceneConfig defines **what exists**
- Scene System defines **how it is realized**

---

## Non-Goals (v1)

- multiple simultaneous projections
- zoom/pan implementation
- tiling implementation
- live networking pipelines
- blending modes implementation

---

## Summary

The Scene System is:

- projection-aware
- view-aware
- layer-composed
- user-ordered
- renderer-agnostic

It forms the foundation for Libration evolving into a:

> composable, time-aware global scene engine
