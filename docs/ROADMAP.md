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

Status: partially complete.

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
- first restrained moonlight slice: moon phase, lunar altitude, and local incidence provide a bounded cool secondary night-side illumination field (broad but directional) inside the same upstream illumination raster while preserving day/twilight behavior and backend semantics.
- physically-derived polar illumination behavior from seasonal solar geometry.
- astronomical scene participation integrated into the layered scene system.

Remaining future work:

- further atmospheric scattering refinement, composition-aware day/night, and emissive night-light blending.
- emissive/night-light composition.
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

Exit criteria:

- docs can onboard a future chat session.
- Cursor receives persistent project rules.
- roadmap and future-feature backlog are explicit.
- stale historical docs are clearly marked historical.

## Phase 8: Map inventory and scientific substrate expansion

Status: planned.

Candidate deliverables:

- validated geology map.
- climate map families.
- bathymetry/ocean substrate.
- vegetation/land cover substrate.
- night-lights or emissive-compatible substrate.
- seasonal natural-color refinements.
- map selector attribution and explanatory copy.

## Phase 9: Atmospheric composition and planetary illumination

Status: planned.

Candidate deliverables:

- blending modes.
- masking.
- clipping.
- composition-aware day/night illumination.
- higher-fidelity atmospheric scattering and illumination refinement on top of the existing continuous attenuation-driven twilight model.
- emissive/night-light blend.
- atmospheric glow and transition tuning.
- overlay-compatible visual tuning.

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
