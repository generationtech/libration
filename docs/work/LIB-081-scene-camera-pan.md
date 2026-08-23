# LIB-081 — Scene camera pan

| Field | Value |
|-------|-------|
| ID | LIB-081 |
| Status | proposed |
| Created | 2026-08-22 |
| Approved | |
| Completed | |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md). Do not start before zoom is complete unless a human explicitly reorders. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

## Objective

Add map translation on the same scene camera introduced for zoom, including reset/recenter to the identity view, without treating pan as a separate view system.

## Scope

**In scope**

- Pointer/touch drag pan (and any small programmatic controls the zoom slice already made natural).
- Clamp or wrap policy for the camera centre consistent with the full-world equirectangular strip (including antimeridian).
- Reset/recenter to identity (shared with zoom).
- Hit-testing and overlay registration while translated.
- Tests and visual verification, including zoom+pan combinations.

**Out of scope**

- Entity-fixed / Moon-fixed / Sun-fixed frames.
- Map rotation, camera persistence, URL view state.
- Redesigning zoom, astronomy, chrome, or Config.
- Semantic zoom, tiles, globe.

Exact drag thresholds, inertia, and touch vs mouse details are chosen during implementation, not here.

## Architectural boundaries

- Same camera struct as LIB-080; pan mutates projected-world centre, not entity state and not projection.
- Chrome remains unpanned.
- Do not implement pan by assigning camera centre to a tracked body.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

## Acceptance criteria

- Drag pan moves the projected map; identity+no-drag remains 2.0.0.
- Zoom then pan (and pan then zoom) stay one camera.
- Reset restores identity scale and centre.
- Geographic overlays remain registered; screen-space marker sizes and stroke widths unchanged.
- Earthquake hover still works; drag is not click-select.
- Drag does not start from Config, launcher, or other DOM overlays.
- Antimeridian-visible scenarios remain coherent (no world-spanning jumps from naive wrap).
- Time animation continues while panned.

## Verification plan

- Focused tests: centre translation; inverse hit-test; reset; wrap/clamp; zoom+pan composition.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: as needed
- Visual verification: required — identity, pan, zoom+pan, reset, resize, dateline scenarios, overlay registration (`lunar-track`, eclipse dateline, `earthquake-presentation`).

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- This work item.

## Completion record

Fill only when completing.

**Implementation summary**

**Commands run**

**Actual results**

**Visual verification**

**Not verified**

**Discovered, not done**
