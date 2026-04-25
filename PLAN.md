# Project Plan

## Current phase

Libration is in a post-foundation consolidation phase.

The major runtime foundations are implemented well enough to support feature-forward work:

- renderer-agnostic RenderPlan pipeline.
- structured chrome model.
- top-band hour-marker semantic path.
- SceneConfig authority.
- curated base-map catalog.
- map onboarding tooling.
- static and month-aware base-map families.
- static and derived overlays.
- Canvas backend execution.

The immediate priority is to consolidate documentation, enforce AI co-engineering rules, and make the next development phases easier to execute without rediscovering project context.

## Current goals

1. Refactor documentation into a smaller, clearer living system.
2. Add Cursor project rules for future co-engineering consistency.
3. Preserve the full future-feature inventory.
4. Clarify completed phases and future phases.
5. Keep implementation work phase-scoped, testable, and architecture-safe.
6. Avoid reopening already-stabilized foundations unless a real architectural bug is found.

## Near-term execution slices

### Slice 1: Documentation and rules consolidation

Status: planned.

Deliverables:

- refreshed `README.md`.
- refreshed `ARCHITECTURE.md`.
- refreshed `PLAN.md`.
- new `AGENTS.md`.
- new `docs/PROJECT_STRATEGY.md`.
- new `docs/DEVELOPMENT_STRATEGY.md`.
- new `docs/ROADMAP.md`.
- new `docs/FUTURE_FEATURES.md`.
- new `docs/AI_COENGINEERING.md`.
- reorganized map docs under `docs/maps/`.
- historical execution docs moved under `docs/historical/`.
- `.cursor/rules` project rules.

Exit criteria:

- a new chat session can understand the project from docs alone.
- Cursor receives persistent architecture rules.
- future feature backlog is explicit and retained.
- current phase is not buried in stale historical notes.

### Slice 2: Documentation alignment with source reality

Status: next after Slice 1.

Deliverables:

- verify all names, ids, config fields, scripts, and runtime claims against source.
- update links and file references after doc moves.
- remove stale duplicated sections.
- preserve spec-level detail where still useful.

Exit criteria:

- docs do not claim unsupported features are implemented.
- historical docs are clearly marked historical.
- specs and roadmap do not contradict current source.

### Slice 3: Scene and map polish

Status: planned.

Candidate work:

- normalize map family ids, labels, and categories while catalog is still young.
- remove transitional placeholder flags only after assets are fully sourced and validated.
- improve selector copy for month-aware map families.
- add clearer attribution display.
- validate base-map presentation controls across families.
- decide geology onboarding versus day/night emissive composition.

Exit criteria:

- curated map inventory feels intentional.
- catalog metadata is stable enough to preserve ids.
- map selector communicates family behavior clearly.

### Slice 4: Advanced composition planning

Status: planned.

Candidate work:

- day/night shading integration with base-map presentation.
- emissive/night-lights composition strategy.
- blend modes.
- masks.
- clipping.
- separate visual products from data lifecycle concerns.

Exit criteria:

- composition rules are specified before implementation.
- backend remains product-semantics-free.
- Canvas implementation does not block future GPU backend.

### Slice 5: Dynamic layer lifecycle foundation

Status: future.

Candidate work:

- layer data lifecycle manager.
- static, derived, interval, and event-driven acquisition modes.
- cache policies.
- versioned state snapshots.
- stale/error/loading states.
- playback and scrubbed-time readiness.

Exit criteria:

- live or forecast layers can be added without fetching during render.
- scene layers remain deterministic from prepared state.
- renderer remains side-effect free.

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
- any relevant specs under docs/specs/

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
- map asset sourcing without provenance.
