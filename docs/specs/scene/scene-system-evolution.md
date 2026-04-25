# Scene System Evolution Roadmap


## Current Completion Status

The roadmap has advanced beyond its initial Phase A/B/C foundation:

- Phase A base-map selection: complete, including multi-base-map selector/editor integration and file-backed catalog inventory.
- Phase B structured SceneConfig and layer stacking: complete.
- Phase C static overlay support: complete for first static raster overlay path.
- Derived overlay support: complete for solar analemma ground-track.
- Scene-authoritative runtime refresh: complete.
- Generalized semantic scene-layer participation: complete.
- Real base-map onboarding: complete for topography, political, and Blue Marble / natural-color maps.
- Month-aware base-map family support: complete for topography and additional Blue Marble-style families, including product-time month resolution and runtime image-load failure fallback.

Remaining major future frontier:

- full dynamic data lifecycle for feeds/gridded datasets
- advanced composition such as masking/blending/day-night emissive maps
- additional projections and scene view modes

---

## Phase A
- Base map selection

## Phase B
- Structured SceneConfig
- Layer stacking

## Phase C
- Static overlays

## Phase D
- Dynamic data layers

## Phase E
- Advanced projections and camera



---

# ADDITIONS (v2.1)

## Purpose (Added)

This roadmap defines the **phased evolution of the Scene System** in a way that:

- minimizes rework
- preserves architectural integrity
- incrementally delivers user-visible value
- aligns with the established specifications:
  - SceneConfig
  - Scene System
  - Projection System
  - Layer Lifecycle

---

## Guiding Principles (Added)

1. Each phase must be **fully functional and stable**
2. No phase should introduce architectural shortcuts that break later phases
3. Data model changes must be **forward-compatible**
4. Rendering pipeline must remain **renderer-agnostic**
5. Each phase should unlock meaningful product capability

---

## Phase A (Expanded)

### Goal
Introduce explicit base map selection.

### Deliverables
- Replace hardcoded base map with `SceneConfig.baseMap`
- Support multiple selectable map assets
- Validate assets against Map Asset Contract

### Non-Goals
- Layer system changes
- dynamic overlays

---

## Phase B (Expanded)

### Goal
Introduce structured SceneConfig and layer stacking.

### Deliverables
- Introduce `SceneConfig` domain
- Replace boolean layer flags with `SceneLayerInstance[]`
- Implement user-controlled ordering (Option B)
- Integrate with existing RenderPlan pipeline

### Risks
- Migration complexity from existing config
- UI/editor adjustments

---

## Phase C (Expanded)

### Goal
Support static overlay layers.

### Deliverables
- Static raster overlays (e.g., geology, boundaries)
- Static vector overlays
- Layer opacity handling
- Proper composition rules

### Enables
- richer visualization without dynamic data complexity

---

## Phase D (Expanded)

### Goal
Introduce dynamic and derived data layers.

### Deliverables
- Layer Data Lifecycle system
- Derived layers (terminator, eclipse paths)
- Initial gridded datasets (e.g., temperature)
- Initial live feed integration (optional subset)

### Risks
- performance
- lifecycle complexity
- caching correctness

---

## Phase E (Expanded)

### Goal
Enable advanced projection and view capabilities.

### Deliverables
- Projection abstraction fully utilized
- Additional projections (Mercator, etc.)
- SceneView expansion (zoom/pan)
- groundwork for globe rendering

### Risks
- interaction complexity
- performance implications

---

## Cross-Phase Dependencies (Added)

| Dependency | Introduced In | Used By |
|------|--------------|--------|
| SceneConfig | Phase B | All later phases |
| Composition rules | Phase B/C | All rendering |
| Map Asset Contract | Phase A | All map layers |
| Lifecycle system | Phase D | Dynamic layers |
| Projection abstraction | Phase B | Phase E |

---

## Suggested Implementation Order (Added)

1. SceneConfig introduction (Phase B core)
2. Base map refactor (Phase A + B overlap)
3. Layer stacking + ordering
4. Static overlays
5. Lifecycle system scaffolding
6. Derived layers
7. Dynamic data
8. Projection/view expansion

---

## Anti-Patterns to Avoid (Added)

- Skipping Phase B and jumping to dynamic layers
- Embedding dynamic logic before lifecycle system exists
- Hardcoding ordering assumptions
- Treating projections as a late-stage concern

---

## Success Criteria (Added)

The roadmap is successful if:

- each phase can ship independently
- no major refactors are required between phases
- future features plug into existing structure cleanly
- system remains predictable and debuggable

---

## Why This Matters (Added)

Without a phased roadmap:

- complexity compounds too early
- architectural shortcuts become permanent
- later features (projection, dynamic data) require rewrites

This roadmap ensures Libration evolves into a:

> structured, scalable, and extensible scene system

rather than an accumulation of ad hoc features.

---

## Summary (Expanded)

The Scene System Evolution Roadmap provides:

- a clear phased path from current state to full system
- alignment with architectural specifications
- protection against premature complexity

Each phase builds on the last, ensuring a stable foundation for future capabilities.

