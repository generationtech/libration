# Scene System Implementation Phase 1 — Execution Criteria


## Completion Note

Phase 1 is complete.

The implementation now goes beyond the original Phase 1 foundation:

- SceneConfig is authoritative.
- Base map selection is config-driven.
- Scene layers are ordered and composition-driven.
- Static and derived overlays exist.
- Multi-base-map support and selector integration exist.
- Base-map inventory has evolved to a bundled JSON catalog.
- Real topography, political, and Blue Marble / natural-color maps have been onboarded.
- Month-aware base-map families support product-time-driven raster selection.

This document should remain as the historical execution criteria for the foundation phase, not as the current roadmap.

---

## Purpose

Define the execution framework, scope boundaries, success criteria, and exit conditions for the first major implementation phase of the Scene System work.

This document exists so the project can move deliberately through a large architectural migration without drifting, overreaching, or losing sight of what completion looks like.

It is intended to be used during active implementation as the authoritative guide for:

- what Phase 1 is trying to accomplish
- what is explicitly out of scope
- how to determine whether Phase 1 is complete
- what failure modes indicate the work has gone off track

---

## Execution Model

For each major implementation phase, development should define and track:

1. **Objective**
   - What this phase is trying to achieve

2. **Scope Boundary**
   - What this phase is explicitly not doing yet

3. **Success Criteria**
   - Observable, testable end state

4. **Exit Tests**
   - How completion is verified

5. **Failure Modes**
   - Signals that the phase has gone wrong or is incomplete

This document applies that model to the first active implementation phase.

---

## Phase 1 Name

**SceneConfig Integration and Base Map Migration**

This is the foundational migration phase.

---

## Objective

Introduce `SceneConfig` into the product as the authoritative scene model, while preserving current user-visible behavior.

This phase establishes the structural foundation for all later scene-system work.

At the end of this phase, the app should behave essentially the same as it does today, but its scene should be driven by the new scene architecture rather than legacy booleans and hardcoded map assumptions.

---

## Scope Boundary

Phase 1 is **not** for adding new user-facing capabilities.

This phase does **not** include:

- new map types or new cartographic assets
- dynamic data layers
- live feeds
- alternate projections
- scene-view / camera behavior changes
- zoom / pan
- tiling
- projection switching
- advanced composition features
- blending modes
- new overlay families beyond what is required for migration
- broad UI redesign

Minimal editor or config-surface wiring is acceptable only if it is required to make the new structure usable and testable, but Phase 1 is not an editor-feature phase.

---

## Success Criteria

Phase 1 is complete only when **all** of the following are true.

### 1. Scene exists as a first-class config domain

`LibrationConfigV2.scene` exists and is authoritative.

It contains, at minimum:

- `projectionId`
- `viewMode`
- `baseMap`
- `layers[]`

This is the core structural milestone.

---

### 2. Base map is driven by SceneConfig

The base map is no longer selected by a hardcoded runtime constant alone.

Runtime scene behavior must be driven by:

- `scene.baseMap.id`
- `scene.baseMap.visible`
- `scene.baseMap.opacity`

Even if only one real asset is available initially, the runtime contract must become config-driven.

---

### 3. Existing scene-relevant booleans are migrated into SceneLayerInstances

Legacy layer flags must no longer be the authoritative scene model.

Current scene participants should be represented through initial `SceneLayerInstance[]` entries, such as:

- grid → reference-oriented layer instance
- illumination / solar shading → astronomy-oriented layer instance or transitional equivalent
- pins / markers → annotation-oriented layer instance

This is the semantic migration milestone.

---

### 4. Runtime scene rendering is driven by SceneConfig

Rendering must consume `scene.layers` and `scene.baseMap`, not legacy layer booleans as the primary truth.

That includes:

- layer enablement
- ordering semantics
- base map presence

Legacy compatibility shims are acceptable during migration, but the runtime’s authoritative path must be the new scene model.

---

### 5. Visual output remains effectively unchanged

This phase is a structural migration, not a visual redesign.

The resulting application should preserve:

- the same scene layout
- the same top-chrome interaction with the scene
- the same visible layer behavior
- the same overall rendered result, aside from intentionally neutral internal restructuring

If user-visible rendering changes substantially, the phase is not complete.

---

### 6. Defaults and normalization are in place

If `scene` is missing or incomplete, normalization must supply sane defaults.

That includes:

- `projectionId = "equirectangular"`
- `viewMode = "fullWorldFixed"`
- a default base map
- a default migrated layer set
- default ordering mode
- default opacity values where needed

No hidden runtime-only assumptions should be required for the scene to function.

---

## Exit Tests

Phase 1 should not be considered complete until the following checks succeed.

### Test 1 — Cold start with no authored scene

Run the application with no explicit `scene` config present.

Expected result:
- the application starts correctly
- normalization injects defaults
- rendering matches expected current behavior

---

### Test 2 — Base map selection is config-driven

Change `scene.baseMap.id` in config.

Expected result:
- runtime scene resolution uses that value
- the system is no longer structurally dependent on a hardcoded base map selection path

Even if multiple user-visible assets are not yet present, the configuration path must be real.

---

### Test 3 — Layer enablement is driven by SceneConfig

Disable one migrated scene layer through `scene.layers[i].enabled`.

Expected result:
- that layer disappears from the rendered scene
- no legacy boolean path is required to make it happen

---

### Test 4 — Ordering is honored

Modify the ordering of two scene layers.

Expected result:
- rendering order changes accordingly
- the result is deterministic

Even if the initial stack is small, ordering must already be real.

---

### Test 5 — Legacy boolean scene dependence is removed

Remove, stub, or bypass the old scene-layer booleans as authoritative inputs.

Expected result:
- the app still works from the new scene path
- compatibility may remain for migration, but the old path is no longer the truth

---

## Failure Modes

If any of the following are true, Phase 1 is incomplete or has gone off track.

### 1. Dual-truth system remains in place

Examples:
- SceneConfig exists, but rendering still really depends on old flags
- both the legacy and new systems act as co-authoritative

This is one of the most dangerous outcomes because it creates long-term confusion and future bugs.

---

### 2. Hidden assumptions remain unaddressed

Examples:
- base map still implicitly assumed in runtime
- projection still treated as hidden hardcoded behavior rather than explicit scene state
- scene view still exists only as an undocumented assumption

If structural assumptions remain implicit, later phases will pay the price.

---

### 3. User-visible behavior drifts unintentionally

Examples:
- layers appear differently than before
- scene ordering behaves inconsistently
- rendering output changes for reasons unrelated to intended migration

This phase must preserve existing product behavior.

---

### 4. Source / presentation / lifecycle boundaries start collapsing

Examples:
- layer config starts mixing rendering and data-source concerns
- acquisition behavior leaks into scene config
- rendering concerns leak into source definitions

Phase 1 must strengthen architecture boundaries, not blur them.

---

### 5. Migration overreaches into later phases

Examples:
- implementing dynamic feeds before lifecycle architecture exists
- attempting projection switching now
- trying to redesign the full scene editor during core migration

This phase should stay focused.

---

## Deliverable of Phase 1

At the end of Phase 1, the project should have:

> A scene system that behaves essentially the same as before,  
> but is internally driven by `SceneConfig` rather than legacy layer flags and hardcoded scene assumptions.

That is the real milestone.

---

## Why This Phase Matters

Phase 1 is the most important phase in the entire scene-system effort because every later phase depends on it.

Later work requires this foundation:

- **Phase 2 / ordering and composition expansion**
  - needs `SceneLayerInstance[]` and real ordering
- **Phase 3 / static overlays**
  - needs source-driven scene layers
- **Phase 4 / dynamic and derived layers**
  - needs lifecycle-ready structure
- **Phase 5 / projection and camera evolution**
  - needs explicit `projectionId` and `viewMode`

If Phase 1 is done cleanly, later phases become straightforward.

If Phase 1 is sloppy, later phases become repeated migrations.

---

## Relationship to Existing Planning Docs

This document does not replace the broader scene roadmap.

Instead, it refines the roadmap into an execution-grade statement for the first active implementation phase.

It is intended to be used together with:

- SceneConfig specification
- Scene System specification
- Projection System specification
- Scene View / Camera specification
- Map Asset Contract
- Layer Data Lifecycle specification
- Layer Composition Rules
- Scene System Evolution Roadmap

---

## Summary

Phase 1 should be treated as a **foundation phase**, not a feature phase.

Success means:

- `SceneConfig` is authoritative
- base map is config-driven
- migrated layers live in `SceneLayerInstance[]`
- runtime consumes the new scene model
- normalization/defaults are real
- visual behavior remains stable

This is the point where the architecture becomes real enough to support the rest of the planned system.
