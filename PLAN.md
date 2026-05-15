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
- derived overlay readability v1 + v1.1 + **substrate-aware lift scale** + **optional SceneConfig presentation** (grid, analemma, subsolar/sublunar, city pins, static equirect rasters; solar night veil + emissive **policy** lift + presentation/catalog attenuation + user veil/lift multipliers into RenderPlan; optional **one** `OverlayReadabilityFrame` per tick on `TimeContext`).
- Canvas backend execution.
- AI co-engineering rules and Cursor project rules.

The current strategic objective is to **extend** the delivered upstream planetary illumination and composition system (**readability extensions beyond presentation scalars**, atmosphere, clouds/weather planning) without destabilizing RenderPlan, SceneConfig authority, or execution-only backends.

## Current goals

1. Keep architecture and docs aligned with actual runtime behavior.
2. Preserve AI co-engineering consistency through repo rules and implementation patterns.
3. Continue disciplined map and scene expansion.
4. Preserve future-feature inventory without prematurely implementing it.
5. Avoid reopening settled foundations unless a real architectural mismatch exists.
6. Extend planetary composition on top of the **delivered** twilight, moonlight, emissive, and **overlay readability** stacks (v1 + v1.1 + derived substrate lift scale + SceneConfig presentation scalars): further readability **extensions** (per-layer tuning, richer heuristics), then clouds/weather planning, then atmospheric refinement—incremental slices, not a new compositor layer.

## Near-term execution slices

### Overlay readability (v1 + v1.1 + derived substrate lift + SceneConfig presentation) — **phase complete**

**Status:** shipped in production. This phase is **closed**; treat as a settled foundation alongside planetary illumination composition (subsolar veil, emissive policy lift, presentation/catalog–based substrate lift, plus optional **persisted** `scene.overlayReadability.presentation` scaling applied in the shell).

**v1 (subsolar-only veil):** derived solar night-veil hints on lat/lon grid, solar analemma, subsolar/sublunar markers, **city pins** (per-pin veil scalar), and **static equirect raster overlays** (global scalar → merged `imageBlit` `cssFilter` upstream). The app shell attaches **one** `OverlayReadabilityFrame` per tick on `TimeContext`; layers use `getOverlayReadabilityFrameOrCompute`.

**v1.1 (emissive policy lift):** `computeOverlayReadabilityFrameFromTimeMs` accepts normalized **emissive night-light policy** from `scene.illumination.emissiveNightLights` (`mode`, `presentation.intensity`, `presentation.driverExponent`); the shell passes those inputs each tick. `globalReadabilityVeil01` / `readabilityVeil01At` combine subsolar veil with bounded **policy-only** emissive legibility pressure (**no emissive texture sampling** in the readability path). Payload keys remain `OverlayReadabilityHints.nightVeil01` / pin `readabilityNightVeil01` but carry the **combined** scalar for frame-backed overlays.

**Scene presentation scaling (shipped):** normalized `scene.overlayReadability.presentation` (`readabilityVeilScale01` 0–1.5, `overlayLiftMultiplier01` 0.65–1.35, defaults 1) post-processes the derived frame in the shell; Layers tab exposes controls and reset.

**Not in this closed stack (future):** per-layer readability tuning; richer substrate-only heuristics beyond presentation + catalog flags.

**Derived substrate lift (implemented):** `substrateOverlayReadabilityLiftScale01` on `OverlayReadabilityFrame` from effective base-map presentation + catalog `capabilities` (no raster sampling); hints, static rasters, and city pins carry `overlayReadabilityLiftScale01` into RenderPlan builders.

**Next frontier (implementation):** per-layer readability tuning when justified; richer substrate modeling in catalog or resolver if needed.

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

**Rolling doc fixes:** overlay readability **v1 + v1.1 + derived substrate lift** documented as **complete** in `PLAN.md`, `ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/FUTURE_FEATURES.md`, and agent/strategy docs; terminology aligned with shipped runtime (no “v1 only” or “substrate unreadable” drift).

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
- **Overlay readability (v1 + v1.1 + substrate + optional SceneConfig presentation, derived):** `OverlayReadabilityFrame` from `computeOverlayReadabilityFrameFromTimeMs` (emissive policy + **substrate** inputs: effective base-map presentation + catalog `capabilities`), then `scene.overlayReadability.presentation` scaling, attached each tick via `TimeContext.overlayReadabilityFrame` and `getOverlayReadabilityFrameOrCompute` in layers; `OverlayReadabilityHints` on grid/analemma/marker payloads (`overlayReadabilityLiftScale01` from frame); per-pin `readabilityNightVeil01` on city pins + payload-level lift scale; static equirect raster `readability` + merged `cssFilter` in `buildBaseRasterMapRenderPlan`; vector stroke/alpha via `effectiveOverlayReadabilityLiftVeil01` (no emissive raster sampling in the readability path).

**Likely next implementation slice:**

- **Readability extensions:** per-layer tuning when justified; optional richer substrate modeling beyond presentation + catalog flags.

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
