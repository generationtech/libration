# LIB-081 — Scene camera pan

| Field | Value |
|-------|-------|
| ID | LIB-081 |
| Status | complete |
| Created | 2026-08-22 |
| Approved | 2026-08-22 (human; this request) |
| Completed | 2026-08-22 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md). Human-authorized. This request explicitly authorizes approval and activation of scene camera pan. Do not start scene reference-frame work. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

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

Same `SceneCamera` `{ scale, centerU, centerV }` as LIB-080. `centerU` is unwrapped (periodic longitude); `centerV` is latitude-clamped (identity at scale 1). Pointer drag pan on the scene strip (4 CSS px threshold, Pointer Events, capture on trusted down). Shared `sceneCameraHorizontalWorldCopyOffsets` emits the viewport-intersecting display copies (raster slop 0, vector slop 5% width, cap 4). Canonical lon/lat unchanged. Inverse mapping + copies keep earthquake hover on wrapped instances. Reset restores `1, 0.5, 0.5`. Runtime only; no pinch; chrome unpanned.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` (http://localhost:1420, `strictPort: true`) plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before navigation)

**Actual results**

- `npx tsc --noEmit`: clean
- `npm test`: 273 files / 2650 passed / 0 failed
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-GLyrUHBn.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080. Device metrics set before navigation. Screenshots of the Cursor pane crop the left of that layout (accepted compositor-capture limitation vs canvas size; layout/canvas CSS were 1920×1080). Synthetic PointerEvents drove pan after skipping `setPointerCapture` on untrusted events.

- `baseline`: identity Reset disabled (Pacific/LA in left crop); 1× drag-right wrap showed East Asia/Tokyo then Americas after more than one world width; westward wrap showed Atlantic; vertical drag at 1× did not move polar rows / expose blank latitude; Reset restored identity; ~2×/~4× pan; pointer-stable wheel after pan kept the pointer pixel `[44,137,174]`; Config open/close left Reset enabled; resize 1280×720 while zoomed+panned kept Reset enabled and overlays registered.
- `lunar-track`: panned; track registered with geography/terminator.
- `lunar-locus` recent and `locusEpoch=standstill`: panned; locus/grid registered (standstill showed East Asia / eclipse label).
- `moon-libration`: panned; Sun/grid registered on Pacific view (Moon glyph off pane crop).
- `solar-eclipse-total`: panned; eclipse shadow over Pacific with grid/night lights.
- `solar-eclipse-dateline`: panned; eclipse path through Indonesia, no blank left-edge strip (edge pixel sums stayed populated).
- `clouds`: panned; cloud raster aligned with geography/grid/terminator.
- `iss-presentation`: panned; ISS track registered with Pacific geography.
- `earthquake-presentation`: identity hover `M4 · 12 km ENE of Pāhala, Hawaii`; after ~one-world pan, Hawaii/Alaska/Fiji markers and labels remained registered on the wrapped presentation.

**Not verified**

- Pinch zoom (out of scope). Physical multi-touch on a real device (single-finger pan shares the Pointer Events path; not exercised on hardware).
- Pixel-identical identity vs a stored 2.0.0 screenshot (qualitative; identity mapping covered by tests).
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`); inspection used the Cursor pane crop of the 1920×1080 layout.
- Moon glyph and ISS glyph themselves in the pane crop (track/Sun registration was visible).
- Time animation while panned (Demo while zoomed was LIB-080; pan does not change time ownership).

**Discovered, not done**

- Chrome structural meridians do not track the panned/zoomed map (accepted; do not move chrome into the camera).
- Full-world rasters go soft when zoomed (accepted; no tiles).
- Compositor screenshots can show a pane-edge “seam” that is not a product wrap artifact.
- Scene reference-frame foundation remains the next architectural phase and is unscoped.

