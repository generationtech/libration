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

### Visual verification and contributor workflow

Keep the Cursor-native verification path as the default for visually impacting work. Procedure: [`docs/VISUAL_VERIFICATION.md`](VISUAL_VERIFICATION.md).

### Map inventory (Phase 8 remainder)

Further curated static substrates when a raster and rights exist. The preferred next family, when sourced, is a temperature or precipitation climatology. Selector polish and additional climate/night-light/seasonal families remain unapproved until scoped. Live weather is not base-map onboarding; see [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md).

### Derived astronomical overlays

Time-relative geographic overlays that reuse the existing solar and lunar models rather than adding a second ephemeris. Analemma variants, eclipse paths, standstills, and related ideas remain unapproved in [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md). [LIB-006](work/LIB-006-experimental-lunar-locus.md) completed the lunar-locus experiment; [LIB-007](work/LIB-007-lunar-locus.md) shipped the production overlay.

### Composition extensions (Phase 9)

Deepen the existing upstream illumination and overlay-readability model: per-layer readability for stack rows that do not yet have it, further substrate heuristics, atmospheric scattering beyond current twilight constants, additional weather/cloud products that reuse the lifecycle contract. No new rendering boundary. Each slice needs explicit product scope.

### Scene view and projection (Phase 11)

Zoom, pan, viewport clipping, tiles, alternate projections, globe or perspective view, pointer inspection. Unlocks denser regional dynamic products. Not approved as a work item.

### Presets (Phase 12)

Named partial presets, application order, last-write-wins, export/import, including dynamic-source enablement. A user-preset persistence seam already exists; a full composable preset system does not. Not approved as a work item.

### Renderer evolution (Phase 13)

GPU feasibility, backend capability matrix, performance instrumentation, renderer-independent visual tests. The `RenderPlan` boundary is the prerequisite. Not approved as a work item.

### Further dynamic-data consumers

New feeds (radar, volcanoes, lightning, additional spacecraft, and so on) reuse [`docs/specs/scene/dynamic-data-lifecycle.md`](specs/scene/dynamic-data-lifecycle.md). The seam existing is not scope.
