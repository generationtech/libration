# 0026 — Scene camera is independent of projection, physical state, and scene reference frame

- **Status:** Accepted
- **Date:** 2026-08-22 (record written with the camera / map-reference-frame architecture; zoom is not yet implemented)

## Context

Libration 2.0.0 presents a full-world equirectangular map in an Earth-fixed frame: geography is stationary, and astronomical / entity positions move across it. `scene.viewMode` is `fullWorldFixed`. Projection (`src/core/equirectangularProjection.ts`) maps longitude and latitude linearly onto the scene strip. There is no zoom, pan, or entity-fixed map.

The product is evolving toward interactive viewing (zoom, then pan) and, later, scene reference frames in which a selected entity can be fixed while geography moves. Those capabilities are easy to implement in the wrong layer: by mutating entity coordinates, by changing the projection contract, by scaling the Canvas context (and therefore strokes and type), or by continuously copying an entity position into the camera (a follow-hack that fights pan).

Architecture already distinguished scene view from projection ([ARCHITECTURE.md](../../../ARCHITECTURE.md) §6.2) but did not define a camera, a scene reference frame, or their independence from physical state.

Civil time already has a “reference frame” (display mode, IANA zone, reference city). This decision is about the **scene/map** frame, not civil time.

## Decision

1. **Physical / astronomical state** is computed at the canonical UTC instant and is not modified by viewing. Entity lat/lon, tracks, loci, illumination geometry, and lifecycle snapshots do not change because the user zoomed or panned.

2. **Scene reference frame** (future) is a transform of that state into the coordinates that projection consumes. Earth-fixed is identity and remains the default. Entity-fixed modes (Moon, Sun, later a generic anchor) change this transform. They must not be implemented by overwriting camera centre each frame.

3. **Projection** remains spatial truth. Equirectangular full-world mapping is unchanged by zoom or pan. Camera is not a projection parameter and not a new `projectionId`.

4. **Scene camera** is a view into the already-projected world: uniform scale and translation, no rotation in this development phase. Identity camera (`scale = 1`, projected-world centre) is exactly the 2.0.0 presentation.

5. **Chrome stays screen-space.** The scene camera does not transform top-band chrome, bottom HUD, or DOM overlays. Structural meridians register with the map at identity camera; when zoomed they remain a full-world instrument ruler.

6. **Zoom is implemented as a view transform at `RenderPlan` construction**, not as `ctx.scale` in a backend, not as a map-library viewport, and not as a persisted `viewMode` value. Camera state is runtime until a later persistence decision.

Intended structure: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md). First implementation slice: [LIB-080](../work/LIB-080-scene-camera-zoom.md) (proposed).

## Consequences

**Good.**

- Zoom and pan can land incrementally without redesigning astronomy, `SceneConfig` composition, or projection.
- A later Moon-fixed (or generic entity-fixed) mode can coexist with user zoom and pan.
- Screen-space styling (marker size, stroke width, chrome) can stay stable while geographic geometry scales.
- Backends still execute primitives; they do not invent camera policy from configuration.

**Costs.**

- Every scene plan builder that maps lon/lat or blits a full-world raster must use the shared view mapping, or that layer will desynchronize.
- Pointer hit-testing (earthquake hover today) must invert the same mapping.
- Chrome will no longer line up with zoomed meridians. That is accepted rather than zooming the time instrument.
- Full-world rasters will look soft when zoomed in until a later tile/high-resolution effort (not part of this decision).

**Non-decisions.** Exact wheel-vs-pinch UX, maximum scale, camera persistence, URL view state, map rotation, and alternate projections remain open and are not authorized by this record.
