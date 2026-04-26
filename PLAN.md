# Project Plan

## Current phase

Libration is in a post-foundation consolidation and feature-expansion phase.

The major runtime foundations are implemented well enough to support disciplined feature-forward work:

- renderer-agnostic RenderPlan pipeline.
- structured chrome model.
- top-band hour-marker semantic path.
- SceneConfig authority.
- curated base-map catalog.
- categorized map selector and base-map presentation UI.
- map onboarding tooling.
- static and month-aware base-map families.
- static and derived overlays.
- astronomical scene overlays and markers.
- solar shading / dark-side visualization.
- Canvas backend execution.
- AI co-engineering rules and Cursor project rules.

The current strategic objective is to expand the product without destabilizing the architectural boundaries that now exist.

## Current goals

1. Keep architecture and docs aligned with actual runtime behavior.
2. Preserve AI co-engineering consistency through repo rules and implementation patterns.
3. Continue disciplined map and scene expansion.
4. Preserve future-feature inventory without prematurely implementing it.
5. Avoid reopening settled foundations unless a real architectural mismatch exists.
6. Prepare the project for more advanced atmospheric composition, planetary illumination, and lifecycle work.

## Near-term execution slices

### Slice 1: Documentation alignment with source reality

Status: active.

Deliverables:

- verify runtime claims against actual source.
- remove stale references and duplicated guidance.
- keep architecture docs concise and durable.
- avoid rebuilding another sprawling documentation tree.

Exit criteria:

- docs reflect actual runtime state.
- docs do not reference removed structures.
- future chat sessions can onboard quickly.

### Slice 2: Atmospheric composition refinement and planetary illumination

Status: planned.

Current implemented foundation:

- solar shading / dark-side visualization.
- subsolar marker.
- sublunar marker.
- solar analemma overlay.
- derived astronomical scene overlays.

Candidate work:

- twilight in the solar shading pass: solar-altitude band classification in the upstream illumination raster, emitted as a single `rasterPatch` (not a separate twilight layer; done).
- atmospheric transition rendering.
- composition-aware day/night illumination.
- emissive night-light blending strategy.
- masking and clipping rules.
- blend modes.
- overlay readability strategy.
- active solar-position synchronization along analemma trajectories.

Exit criteria:

- composition rules are clearly defined before broad implementation.
- atmospheric transitions feel coherent rather than binary.
- astronomical overlays participate correctly in scene composition.
- backend remains product-semantics-free.

### Slice 3: Scientific substrate expansion

Status: planned.

Candidate work:

- geology onboarding.
- terrain refinement.
- climate or vegetation substrate exploration.
- emissive-compatible substrate planning.

Exit criteria:

- at least one additional scientifically grounded substrate family is validated and integrated cleanly.

### Slice 4: Map inventory and selector polish

Status: planned.

Candidate work:

- normalize family ids, labels, and categories while catalog is still young.
- improve selector copy for month-aware map families.
- strengthen attribution presentation.
- consider active displayed-month indication for seasonal families.
- finalize placeholder versus validated family states.
- validate all preview thumbnails and metadata.

Exit criteria:

- map inventory feels curated and intentional.
- catalog semantics are stable enough for long-term persistence.
- existing categorized selector and presentation controls scale cleanly as more families are added.

### Slice 5: Dynamic layer lifecycle foundation

Status: future.

Candidate work:

- lifecycle manager.
- acquisition modes.
- cache policies.
- versioned state snapshots.
- stale/error/loading states.
- playback and scrubbed-time readiness.

Exit criteria:

- live or forecast layers can be integrated without fetching during render execution.

## Active architectural guardrails

Do not break these while implementing future work:

- Product time is canonical UTC instant plus selected reference presentation.
- Display formatting must not move canonical time.
- SceneConfig is authoritative for scene content.
- Base-map family ids are persisted, not concrete raster URLs.
- Map catalog is bundled data, not runtime folder scanning.
- Projection defines spatial truth.
- Chrome is screen-space and reserves layout.
- Scene is projection-space and starts below chrome.
- RenderPlan is the rendering boundary.
- Backends execute only.

## Recommended next prompt pattern

Use this shape for future implementation prompts:

```text
We are continuing Libration development.

Before editing, read:
- README.md
- ARCHITECTURE.md
- PLAN.md
- AGENTS.md
- docs/ROADMAP.md
- docs/FUTURE_FEATURES.md
- docs/DEVELOPMENT_STRATEGY.md

Task:
<single phase-scoped objective>

Constraints:
- preserve RenderPlan boundary
- keep SceneConfig authoritative
- avoid backend product semantics
- update tests
- update docs if behavior changes

Return:
- files changed
- implementation summary
- tests run
- risks or follow-up work
```

## Current non-goals

Do not start these until their phase is intentionally opened:

- alternate projections.
- zoom/pan camera implementation.
- live data feeds.
- public plugin system.
- GPU backend.
- broad preset UI.
- total UI redesign.
- uncontrolled map ingestion pipelines.
