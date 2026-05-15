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
- continuous attenuation-driven planetary illumination composition with semantic twilight anchors.
- non-emissive twilight attenuation and atmospheric tint modulation.
- physically-derived polar illumination behavior from seasonal solar geometry.
- perceptually legible moonlight composition with configurable presentation modes.
- emissive night-light upstream composition (catalog-backed asset, policy, perceptual luma driver, Layers presentation controls, illustrative defaults).
- derived overlay readability v1 (grid, analemma, subsolar/sublunar, city pins; solar night-veil hints into RenderPlan).
- Canvas backend execution.
- AI co-engineering rules and Cursor project rules.

The current strategic objective is to **extend** the delivered upstream planetary illumination and composition system (readability, atmosphere, clouds/weather planning) without destabilizing RenderPlan, SceneConfig authority, or execution-only backends.

## Current goals

1. Keep architecture and docs aligned with actual runtime behavior.
2. Preserve AI co-engineering consistency through repo rules and implementation patterns.
3. Continue disciplined map and scene expansion.
4. Preserve future-feature inventory without prematurely implementing it.
5. Avoid reopening settled foundations unless a real architectural mismatch exists.
6. Extend planetary composition on top of the **delivered** twilight, moonlight, and emissive stack: readability policy, then clouds/weather planning, then atmospheric refinement—incremental slices, not a new compositor layer.

## Near-term execution slices

### Next runtime extensions (after doc alignment)

**Overlay readability v1 (shipped):** derived solar night-veil hints on lat/lon grid, solar analemma, subsolar/sublunar markers, and **city pins** (per-pin veil on `CityPinEntry`) → stronger strokes/alphas in upstream RenderPlan builders; no SceneConfig surface yet.

**Likely next readability / composition slices:** emissive- or substrate-aware legibility, static raster overlays, optional SceneConfig presentation axis—each scoped, tested, and documented.

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

### Slice 2: Planetary illumination — extensions on delivered foundations

Status: active.

**Implemented foundations (treat as settled; extend, do not reopen):**

- solar shading / dark-side visualization.
- coherent upstream planetary illumination composition: **one** illumination `rasterPatch`, SceneConfig-authoritative policy, renderer-agnostic execution.
- continuous attenuation-driven twilight with civil/nautical/astronomical **semantic** anchors (not separate user-facing twilight layers); non-emissive atmospheric tint and attenuation.
- physically-derived polar illumination behavior from seasonal solar geometry.
- perceptually legible **moonlight** in the same illumination raster, with presentation modes (`off` / `natural` / `enhanced` / `illustrative`) and Layers UI wiring.
- **Emissive city / night lights:** bundled emissive composition catalog, id canonicalization, upstream per-texel sampling, `computeEmissiveNightLightsContributionLinear01` policy, perceptual luma driver (`presentation.driverExponent`), intensity control, Layers **Off / Natural / Enhanced / Illustrative**, illustrative defaults paired with moonlight; validated Black Marble ship asset (see `docs/maps/MAP_ASSET_SOURCES.md`).
- subsolar marker, sublunar marker, solar analemma overlay, and derived astronomical overlays in the layer stack.
- **Overlay readability v1 (derived):** `computeOverlayReadabilityFrameFromTimeMs` + `OverlayReadabilityHints` on grid/analemma/marker payloads; per-pin `readabilityNightVeil01` on city pins; RenderPlan stroke/alpha scaling (terminator-aligned night veil; no emissive sampling in v1).

**Likely next implementation slice:**

- **Readability extensions:** emissive/substrate-aware contrast, static raster overlays, and/or a minimal SceneConfig presentation axis when product-ready.

**Remaining frontier work (incremental; sequence as dependencies allow):**

- weather / cloud participation **planning** and later upstream participation (depends on lifecycle and data model when opened).
- atmospheric transition rendering and scattering refinement on top of the existing continuous field (not a rewrite of the illumination boundary).
- composition-aware day/night illumination nuances tied to overlays and readability.
- masking, clipping, and blend modes **only when justified** by product scope and readability needs (not as a generic backend compositor).
- active solar-position synchronization along analemma trajectories.

Architectural constraints:

- composition policy remains upstream.
- RenderPlan remains the rendering boundary.
- backend remains product-semantics-free.
- avoid backend-specific composition behavior.
- avoid treating emissive lighting as a generic overlay hack.
- preserve deterministic composition semantics.
- do not introduce a generalized compositor abstraction or backend-owned composition logic.

Exit criteria:

- each extension ships with defined upstream rules, tests at resolver/composition/RenderPlan boundaries, and doc updates.
- atmospheric transitions remain coherent (continuous field preserved unless intentionally replaced with a scoped change).
- astronomical overlays remain correct in scene composition.
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
- Planetary composition semantics remain upstream.

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
- docs/PROJECT_STRATEGY.md
- docs/AI_COENGINEERING.md
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
