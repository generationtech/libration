# Roadmap

## Purpose

This roadmap records completed phases and planned future phases.

It is intentionally phase-oriented rather than issue-oriented. Detailed current tasks live in `PLAN.md`.

## Phase 0: Initial public foundation

Status: complete.

Delivered:

- Tauri, React, TypeScript desktop app foundation.
- local-first app shell.
- initial world-time visualization.
- AGPL licensing.
- public-release documentation.
- baseline test infrastructure.

## Phase 1: RenderPlan architecture

Status: complete enough for current Canvas path.

Delivered:

- renderer-neutral render intent model.
- executor/backend separation.
- Canvas backend implementation.
- text, rect, line, path, gradient, raster patch, and image primitives.
- bridge modules for Canvas-specific realization.
- backend resource lifecycle reporting for raster image failures.

Remaining future work:

- reduce transitional backend-native path payloads.
- expand primitive coverage only when needed.
- prepare for GPU backend after product semantics are fully upstream.

## Phase 2: Structured chrome and top-band model

Status: complete for supported production path.

Delivered:

- top chrome as screen-space layout.
- reserved scene viewport below chrome.
- structured `chrome.layout.hourMarkers`.
- semantic hour-marker planner.
- hour-marker layout.
- text and procedural realization adapters.
- text, analog clock, radial line, and radial wedge realization families.
- top-band display formatting that does not move canonical time.
- hour-marker editor extraction and axis organization.
- removal of stale flat hour-marker persistence.

Remaining future work:

- polish appearance controls.
- add user-facing clarity for reference-frame and display-format modes.
- revisit accessibility and high-contrast controls.

## Phase 3: Font and glyph subsystem

Status: implemented and usable.

Delivered:

- font asset preprocessing.
- generated font asset database and manifest.
- runtime font registry.
- Canvas font loading and registration.
- typography role resolution.
- procedural glyph emission through RenderPlan-compatible primitives.

Remaining future work:

- font management UI polish.
- additional bundled font curation.
- optional user font import only if it can preserve durable identity and licensing clarity.

## Phase 4: SceneConfig foundation

Status: complete.

Delivered:

- authoritative `SceneConfig`.
- projection id.
- view mode.
- base map config.
- ordered layer stack.
- deterministic ordering.
- scene-authoritative runtime rebuild behavior.
- compatibility from older scene-relevant booleans where needed.

Remaining future work:

- keep legacy compatibility from creeping back into active authoring paths.
- continue strengthening tests around config normalization and migration.

## Phase 5: Curated base-map catalog

Status: complete enough for feature-forward map work.

Delivered:

- bundled JSON base-map catalog.
- family ids, labels, categories, paths, previews, capabilities, defaults, and attribution.
- selector/editor integration.
- per-family base-map presentation controls.
- static and month-aware variant modes.
- product-time month resolution.
- missing month fallback.
- runtime image failure fallback.
- `maps:prep` onboarding workflow.

Current families include:

- legacy reference map.
- political map.
- geology placeholder or early family depending on catalog state.
- Blue Marble / natural-color families.
- topography family if present in the active catalog.

Remaining future work:

- normalize family ids and labels while catalog is young.
- ensure all placeholder flags match real source status.
- strengthen attribution display.
- document each source workflow cleanly.

## Phase 6: Static and derived overlays

Status: partially complete for the full static/derived overlay roadmap; **upstream planetary illumination composition (twilight, moonlight, emissive night lights, single `rasterPatch`) is delivered** and should be treated as a coherent subsystem (see `ARCHITECTURE.md`, `PLAN.md`). **Overlay readability** (v1 + v1.1 + **derived substrate lift scale** + **SceneConfig presentation scalars** + **per-layer pilots** for **default stack rows** — `perLayer.grid`, `perLayer.solarAnalemma`, `perLayer.subsolarMarker`, `perLayer.sublunarMarker`, `perLayer.cityPins`, `perLayer.staticEquirectOverlay`) is a **completed milestone** within this phase; broader overlay/editor and astronomical depth remain future work.

Delivered:

- static raster overlay path.
- source-driven overlay construction.
- generalized semantic participation for supported rows.
- derived layer source model.
- solar analemma ground-track overlay.
- subsolar marker.
- sublunar marker.
- solar shading / dark-side visualization.
- continuous attenuation-driven twilight transitions driven by surface solar altitude (civil, nautical, astronomical retained as semantic anchors), encoded in the same planetary illumination raster as day/night rather than a separate user-facing twilight layer.
- non-emissive atmospheric tint and attenuation composition replacing earlier glow-style twilight behavior.
- perceptually legible moonlight composition integrated into the same planetary illumination raster.
- bounded cool secondary lunar illumination field with phase, night-eligibility, and local incidence participation.
- scene-level `scene.illumination.moonlight.mode` (`off` / `natural` / `enhanced` / `illustrative`) adjusts composition policy only while preserving renderer/backend boundaries.
- scene-level `scene.illumination.emissiveNightLights` (`mode`, durable `assetId`, `presentation` intensity and driver exponent) for upstream emissive radiance (not a base-map selection); `assetId` canonicalizes through the bundled emissive composition catalog; greenfield default mode is **`illustrative`** (with illustrative moonlight; persisted explicit modes are preserved); Layers UI exposes **Off / Natural / Enhanced / Illustrative** plus night-light intensity and faint-light lift; validated NASA Black Marble 2016 1° JPEG is the shipped default asset (`docs/maps/MAP_ASSET_SOURCES.md`).
- physically-derived polar illumination behavior from seasonal solar geometry.
- astronomical scene participation integrated into the layered scene system.
- **Overlay readability (v1 + v1.1 + substrate + SceneConfig presentation + default-stack per-layer pilots):** solar night-veil–aligned hints on lat/lon grid, solar analemma polyline, subsolar/sublunar markers, city pins (per-pin combined veil), and static full-viewport equirect raster overlays (global combined veil → merged `imageBlit` cssFilter upstream, or pilots per defaulted row below); **one** `OverlayReadabilityFrame` per tick on `TimeContext` when the shell attaches it (`getOverlayReadabilityFrameOrCompute` in layers); v1.1 folds **emissive night-light policy** (mode + presentation) into the combined veil without emissive raster sampling; **substrate-aware** `substrateOverlayReadabilityLiftScale01` from effective base-map presentation + catalog `capabilities` modulates overlay lift upstream; **persisted** `scene.overlayReadability.presentation` scales combined veil and substrate lift after the derived frame; optional **`perLayer`** keys **`grid`**, **`solarAnalemma`**, **`subsolarMarker`**, **`sublunarMarker`**, **`cityPins`**, **`staticEquirectOverlay`** apply the same scalars again for those layers only.

Remaining future work:

- **Readability extensions (future):** `perLayer` pilots for scene stack rows **beyond** the **six** defaulted ids (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`) when additional rows ship with the same readability contract; richer substrate modeling beyond presentation + catalog `capabilities` (still upstream, no backend policy).
- further atmospheric scattering and transition refinement on the existing continuous twilight field.
- weather/cloud **participation planning** and later upstream participation in planetary composition (ties to Phase 10 lifecycle when opened).
- active solar-position synchronization along astronomical reference trajectories.
- richer derived astronomical overlays.
- overlay editor refinement.
- opacity and ordering UX.
- source and presentation separation in all new layer types.

## Phase 7: Documentation and AI co-engineering consolidation

Status: active.

Goals:

- consolidate docs.
- preserve future feature inventory.
- create project-level AI working rules.
- add Cursor project rules.
- keep future sessions from re-solving settled architecture.
- keep agent-facing and plan docs aligned with shipped subsystems (e.g. overlay readability v1 + v1.1 + derived substrate lift + SceneConfig presentation scalars + **`perLayer` defaults for grid, solar analemma, subsolar/sublunar markers, city pins, static equirect overlay**, not stale “v1 only” or “substrate unreadable” phrasing).

Exit criteria:

- docs can onboard a future chat session.
- Cursor receives persistent project rules.
- roadmap and future-feature backlog are explicit.
- stale historical docs are clearly marked historical.

**Completed milestones (rolling):**

- **Overlay readability (v1 + v1.1 + derived substrate lift + SceneConfig presentation + default-stack per-layer pilots):** docs describe shipped behavior including `scene.overlayReadability.presentation` and optional `perLayer` keys `grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`; **next** readability work is richer substrate heuristics and **`perLayer` coverage for rows beyond those defaults** when product-ready only (Phase 6 “remaining” extensions).

## Phase 8: Map inventory and scientific substrate expansion

Status: planned.

Candidate deliverables:

- validated geology map.
- climate map families.
- bathymetry/ocean substrate.
- vegetation/land cover substrate.
- additional night-light or emissive-compatible **substrate** families (distinct from the composition-input Black Marble path).
- seasonal natural-color refinements.
- map selector attribution and explanatory copy.

## Phase 9: Planetary scene composition and illumination — incremental extensions

Status: planned (**extends** Phase 6 production baseline upstream illumination + readability closure; adds atmosphere, heuristic tuning, clouds/weather when prerequisites exist — **no** new rendering boundary).

The subsystem remains **incremental-extension territory** (`PLAN.md` Slice 2): readability **after** shipped v1 + v1.1 + substrate lift + presentation + **six** default-stack `perLayer` pilots (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`); richer substrate/heuristic modeling and atmosphere/clouds—not speculative greenfield composition.

Candidate deliverables:

- **Readability extensions:** `perLayer` readability for scene stack rows **beyond** those six defaulted ids when product-defined; finer semantics when multiple overlay rows share one pilot key (e.g. static equirect); substrate heuristics beyond presentation + catalog `capabilities` (e.g. per-family tuning in catalog or resolver) if product needs them.
- higher-fidelity atmospheric scattering, glow, and transition tuning on top of the existing continuous attenuation-driven twilight model.
- weather/cloud participation in planetary composition (after planning and lifecycle prerequisites).
- composition-aware day/night illumination nuances tied to overlays and substrate.
- blending modes, masking, and clipping **only when justified** by readability or data participation needs (not as an open-ended backend compositor).
- optional **additional** emissive or radiance contributors beyond the dedicated Black Marble path if product scope requires them.

Architectural direction:

- atmospheric attenuation, reflected illumination, and emissive illumination already participate in one coherent upstream planetary composition model; Phase 9 **deepens and widens** that model.
- composition semantics remain upstream.
- RenderPlan remains the rendering boundary.
- backend remains unaware of planetary composition policy.
- future weather/cloud systems should participate in scene composition rather than acting as isolated overlays.

Delivered in Phase 6 (emissive MVP and integration **complete** for current scope):

- typed emissive presentation modes, deterministic solar-altitude visibility gate, moonlight coexistence scaling, and `scene.illumination.emissiveNightLights` normalization.
- bundled emissive composition catalog plus resolver (`resolveEmissiveCompositionAssetIdToCanonicalId`); unknown or blank `assetId` values canonicalize to the catalog default.
- emissive radiance sampled into the same upstream planetary illumination raster as solar/twilight/moonlight when mode is not `off` and the resolved raster decodes; otherwise contribution is zero; Layers tab mode control; onboarded asset validation (dimensions + SHA-256) in CI; perceptual luma driver via `presentation.driverExponent`.

Remaining under Phase 9 (**composition expansion**, not baseline emissive or settled overlay readability **v1 + v1.1 + substrate lift + presentation scalars + six default-stack `perLayer` pilots** delivery):

- readability extensions (`perLayer` beyond the shipped six defaults where needed; finer multi-row static-raster semantics; richer substrate modeling beyond presentation + catalog flags).
- weather/cloud participation, atmospheric refinement, and optional higher-resolution or alternate-year emissive assets when curated.

## Phase 10: Dynamic data lifecycle

Status: future.

Candidate deliverables:

- lifecycle manager.
- acquisition modes.
- cache policies.
- versioned snapshots.
- loading/stale/error states.
- playback/scrubbing readiness.
- live and forecast data preparation.

Candidate future layers:

- weather.
- clouds.
- radar.
- aircraft.
- shipping.
- earthquakes or volcanoes.
- aurora forecasts.
- satellite paths.

## Phase 11: Scene view and projection expansion

Status: future.

Candidate deliverables:

- zoom and pan.
- viewport clipping.
- tile readiness.
- alternate projections.
- globe or perspective view.
- scene interaction.
- inverse projection for hover/click inspection.

## Phase 12: Preset system

Status: future.

Candidate deliverables:

- named partial config presets.
- explicit preset application order.
- last-write-wins semantics.
- preset stacks.
- narrow appearance presets.
- scene/layer presets.
- export/import of presets.

## Phase 13: Renderer expansion

Status: future.

Candidate deliverables:

- GPU renderer feasibility study.
- backend capability matrix.
- performance instrumentation.
- renderer-independent visual tests where practical.
- bare-metal NVIDIA path only after upstream contracts are stable.
