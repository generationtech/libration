# Roadmap

This document owns **strategic future direction** and **approved but not started work**.

It does not own active work, completed work, historical execution, or speculative ideas.

| Kind of truth | Owner |
|---------------|--------|
| Current development state | [`docs/STATE.md`](STATE.md) |
| How work is executed | [`docs/WORKFLOW.md`](WORKFLOW.md) |
| Speculative / unapproved ideas | [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md) |
| What exists today | [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md) |
| Completed execution history | [`docs/history/`](history/), [`docs/DEVELOPMENT_LOG.md`](DEVELOPMENT_LOG.md) |

Phase names below (8, 9, 11–13) are continuity labels from the pre-modernization plan. They are **not** a status mechanism. Nothing here is scheduled by phase number.

An idea on this page is direction, not permission to start — except items listed as **approved work items**.

---

## Approved, not started

None.

---

## Strategic direction

These themes are the product’s intended future shape. They become work only when a human approves a `docs/work/LIB-###` item. Details and extras live in [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md).

### Preferred next development direction

**Scene camera, then scene reference frame**, after the Libration **2.0.0** baseline. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](specs/scene/camera-and-reference-frame.md), [ADR 0026](decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md). Earth-fixed full-world presentation remains the default (identity camera and Earth-fixed identity frame). Do not start a listed slice until a work item is approved.

| Phase | Slice | Work item |
|-------|--------|-----------|
| A1 | Zoom (first implementation) | [LIB-080](work/LIB-080-scene-camera-zoom.md) complete |
| A2 | Pan on the same camera | [LIB-081](work/LIB-081-scene-camera-pan.md) complete |
| A3 | Camera consolidation | Incremental in A1/A2; no standalone LIB unless a gap remains |
| B | Scene reference-frame foundation (not camera-follow) | [LIB-082](work/LIB-082-scene-reference-frame-foundation.md) complete |
| C | Experimental Moon longitude-locked moving map | [LIB-083](work/LIB-083-moon-longitude-locked-scene-frame.md) complete |
| C2 | Moon latitude lock / position-locked frame | [LIB-084](work/LIB-084-moon-position-locked-scene-frame.md) complete |
| C3 | Sun-anchored longitude-lock and position-lock | [LIB-085](work/LIB-085-sun-anchored-scene-frames.md) complete |
| C4 | Shared anchored production model (Moon/Sun) | [LIB-086](work/LIB-086-generalize-anchored-scene-reference-frames.md) complete |
| C5 | Automatic scene-cover zoom for position-lock | [LIB-087](work/LIB-087-automatic-scene-cover-zoom-for-position-locked-frames.md) complete |
| C6 | Trackable map object foundation | [LIB-088](work/LIB-088-trackable-map-object-foundation.md) complete |
| D | ISS as the first additional trackable target | [LIB-089](work/LIB-089-iss-tracking-target.md) complete |
| D2 | Tracking target + Tracking mode UX (existing Moon/Sun/ISS set) | [LIB-090](work/LIB-090-tracking-target-and-mode-ux-foundation.md) complete |
| D2.5 | Direct click-to-track for rendered Moon, Sun, and ISS | [LIB-091](work/LIB-091-direct-click-to-track-for-map-objects.md) complete |
| D3 | City and planet tracking targets | [LIB-092](work/LIB-092-city-and-planet-tracking-targets.md) complete |
| D3.1 | Galactic Center and Galactic Anticenter tracking targets | [LIB-093](work/LIB-093-galactic-center-and-anticenter-tracking-targets.md) complete |
| D3.2 | Further trackable targets (generic picker) | Unscoped |
| E | Persistence, URL view, rotation, semantic zoom, tiles, globe, … | Unscoped; [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md#scene-view-and-projection) |

Moon visual development through [LIB-011](work/LIB-011-observer-oriented-lunar-libration.md) is complete. The Eclipse System sequence is complete: architecture ([LIB-012](work/LIB-012-eclipse-system-architecture.md)), authority selection ([LIB-013](work/LIB-013-eclipse-authority-evaluation.md)), E1 live solar footprint ([LIB-014](work/LIB-014-solar-eclipse-live-footprint.md)), E2 solar forecast window ([LIB-015](work/LIB-015-solar-eclipse-forecast.md)), E3 lunar eclipse truth/visibility ([LIB-016](work/LIB-016-lunar-eclipse-truth-and-visibility.md)), E4 reference-city eclipse circumstances ([LIB-017](work/LIB-017-reference-city-eclipse-circumstances.md)), E5 live alignment / beam ([LIB-018](work/LIB-018-eclipse-alignment-beam.md)), and E6 configuration completeness / event information / product polish ([LIB-019](work/LIB-019-eclipse-product-polish.md)). [LIB-020](work/LIB-020-eclipse-reconciliation-and-lunar-forecast.md) is a post-completion reconciliation (label toggle, HUD spacing, factory-default diagnosis, lunar forecast on the existing service). [LIB-021](work/LIB-021-lunar-eclipse-visual-reconciliation.md) is a further presentation reconciliation (map info panel, moonlight attenuation, spatial Earth-shadow, label avoidance). Neither is E7. No further eclipse LIB work is approved.

**Lunar visibility and moonlight geometry** (an ambient overlay, not a continuation of the Eclipse System) remains a candidate in that family, not the preferred next direction. Product intent: [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md#lunar-visibility-and-moonlight-geometry). It is **not** approved. Other lunar and Sun–Moon–Earth ideas, and deferred eclipse extras, remain unapproved backlog.

### Visual verification and contributor workflow

Keep the Cursor-native verification path as the default for visually impacting work. Procedure: [`docs/VISUAL_VERIFICATION.md`](VISUAL_VERIFICATION.md).

### Map inventory (Phase 8 remainder)

Further curated static substrates when a raster and rights exist. When map-inventory work is opened, the preferred next family, if sourced, is a temperature or precipitation climatology. Selector polish and additional climate/night-light/seasonal families remain unapproved until scoped. Live weather is not base-map onboarding; see [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md).

### Derived astronomical overlays

Time-relative geographic overlays remain a strategic theme. The lunar-locus experiment and production overlay are complete ([LIB-006](work/LIB-006-experimental-lunar-locus.md), [LIB-007](work/LIB-007-lunar-locus.md)). The Eclipse System (E1–E6) is production ([LIB-014](work/LIB-014-solar-eclipse-live-footprint.md) through [LIB-019](work/LIB-019-eclipse-product-polish.md)), with post-completion lunar forecast reconciliation in [LIB-020](work/LIB-020-eclipse-reconciliation-and-lunar-forecast.md). Remaining ideas in this theme stay unapproved in [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md). Where a new overlay can be derived from existing solar and lunar models, prefer that over a second ephemeris. Eclipse event truth uses the bundled NASA/Espenak–Meeus authority, not the visualization-grade Sun/Moon models; see [`docs/specs/scene/eclipse-system.md`](specs/scene/eclipse-system.md) and [ADR 0008](decisions/0008-bundled-nasa-solar-eclipse-authority.md). There is no approved next eclipse slice.

### Composition extensions (Phase 9)

Deepen the existing upstream illumination and overlay-readability model: per-layer readability for stack rows that do not yet have it, further substrate heuristics, atmospheric scattering beyond current twilight constants, additional weather/cloud products that reuse the lifecycle contract. No new rendering boundary. Each slice needs explicit product scope.

### Scene view and projection (Phase 11)

Zoom, pan, and a scene camera independent of projection and of a later entity-fixed map frame are the **preferred next development direction** (see above). Globe, perspective, alternate projections, tiles, and pointer inspection remain unapproved extras in [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md#scene-view-and-projection). Not an invitation to start those extras.

### Presets (Phase 12)

Named partial presets, application order, last-write-wins, export/import, including dynamic-source enablement. A user-preset persistence seam already exists; a full composable preset system does not. Not approved as a work item.

### Renderer evolution (Phase 13)

GPU feasibility, backend capability matrix, performance instrumentation, renderer-independent visual tests. The `RenderPlan` boundary is the prerequisite. Not approved as a work item.

### Further dynamic-data consumers

New feeds (radar, volcanoes, lightning, additional spacecraft, and so on) reuse [`docs/specs/scene/dynamic-data-lifecycle.md`](specs/scene/dynamic-data-lifecycle.md). The seam existing is not scope.
