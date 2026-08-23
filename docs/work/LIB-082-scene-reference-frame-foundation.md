# LIB-082 — Scene reference-frame foundation

| Field | Value |
|-------|-------|
| ID | LIB-082 |
| Status | complete |
| Created | 2026-08-22 |
| Approved | 2026-08-22 (human; this request) |
| Completed | 2026-08-22 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md) and [LIB-081](LIB-081-scene-camera-pan.md). Human-authorized. This request explicitly authorizes approval and activation of scene reference-frame foundation. Do not implement Moon-fixed, Sun-fixed, or generic entity-fixed user-visible modes. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

## Objective

Introduce a first-class scene/map reference-frame transform between canonical geographic/astronomical state and the existing Earth-fixed projection/camera pipeline, with Earth-fixed identity as the only active frame, so later moving-map modes can be mathematically clean and independent of camera behaviour.

## Scope

**In scope**

- Scene reference-frame abstraction and Earth-fixed identity transform (forward and inverse).
- Longitude continuity primitives (canonical, wrapped delta, nearest equivalent, continuous/unwrapped) required by future entity-fixed frames.
- Relative-longitude contract for a future anchor, without rendering a non-Earth-fixed frame.
- Shared mapping seam: canonical → frame → projection → camera (and the inverse).
- Runtime location for active frame (always Earth-fixed; not persisted).
- Tests and visual regression that LIB-081 behaviour is unchanged.

**Out of scope**

- Moon-fixed, Sun-fixed, or generic entity-fixed modes.
- Reference-frame selector UI, camera-follow, anchor tracking, map rotation, heading lock.
- Latitude-relative frame behaviour (intentionally deferred).
- Camera or reference-frame persistence, URL frame state.
- Raster tiling, new map library, new gesture behaviour.
- Unrelated renderer cleanup, astronomy changes, civil-time changes.

## Architectural boundaries

- Canonical physical/geographic coordinates remain authoritative. Frame-relative coordinates are derived presentation state.
- Projection continues to receive scene-frame lon/lat. Do not encode frame behaviour in equirectangular helpers.
- `SceneCamera` remains `{ scale, centerU, centerV }` over projected scene-frame space. Do not add frame, time, or anchor to the camera.
- Horizontal camera wrapping (LIB-081) is not reference-frame longitude continuity.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

## Acceptance criteria

- Earth-fixed identity preserves completed LIB-081 rendering and interaction (zoom, pan, wrap, reset, hover).
- Forward/inverse Earth-fixed mapping is exact (identity short-circuit; no numeric drift).
- Longitude continuity helpers distinguish canonical, wrapped, and continuous values; antimeridian sequences can be represented without a 360° jump.
- A future-frame proof test shows continuous relative longitude without a production non-Earth-fixed mode.
- No user-facing frame selector. Frame is not persisted.

## Verification plan

- Focused tests: Earth-fixed forward/inverse identity; camera composition; wrapped display copies; hover inverse path; longitude primitives; synthetic relative-longitude continuity.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — render input and mapping path
- Visual verification: required — regression vs completed LIB-081 (`baseline` identity/zoom/pan/wrap/reset, `lunar-track`, `lunar-locus`, `moon-libration`, solar eclipse, `solar-eclipse-dateline`, Clouds, ISS, `earthquake-presentation` hover after zoom/pan/wrap)

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md) if implementation evidence requires it
- This work item

## Completion record

Fill only when completing.

**Implementation summary**

Earth-fixed `SceneReferenceFrame` on `SceneRenderInput` (runtime only). Forward/inverse are exact identity short-circuits. Shared mapping `sceneXFromLongitudeDeg` / `sceneYFromLatitudeDeg` composes frame → projection → camera; inverse helpers reverse that order. `SceneCamera` unchanged. Longitude primitives: canonical (−180, 180], wrapped delta, nearest equivalent, continuous follow, relative-to-continuous-anchor. Canvas backend rejects non-identity frames until a later item threads a live frame. No selector, no persistence, no Moon/Sun mode.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` (http://localhost:1420, `strictPort: true`) plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before navigation)

**Actual results**

- `npx tsc --noEmit`: clean
- `npm test`: 275 files / 2673 passed / 0 failed
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-D7xZFIy8.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080. Device metrics set before navigation. Screenshots of the Cursor pane crop the left of that layout (accepted compositor-capture limitation vs canvas size; layout/canvas CSS were 1920×1080). Synthetic PointerEvents/WheelEvents drove zoom and pan (capture skipped on untrusted events).

- `baseline`: identity Reset disabled; Pacific/LA registered with grid/terminator; wheel zoom enabled Reset and scaled geography with chrome unzoomed; pan after zoom kept grid registered; Reset restored identity (Reset disabled); 1× wrap showed a wrap seam / East-Pacific copies with no blank latitude strip.
- `lunar-track`: Moon track registered with Pacific geography, grid, and Sun.
- `lunar-locus` recent: locus figure registered with Moon/Sun/grid.
- `lunar-locus` `locusEpoch=standstill`: distinct epoch (2025-03-08); grid registered on Pacific crop.
- `moon-libration`: Moon glyph and grid registered.
- `solar-eclipse-total`: 2024 path/marker/beam registered with North American geography.
- `solar-eclipse-dateline`: left/right canvas edge pixel sums populated (756 / 757); no blank left-edge strip.
- `clouds`: cloud raster aligned with geography/grid/terminator.
- `iss-presentation`: ISS track registered with Pacific geography.
- `earthquake-presentation`: identity hover `M4 · 12 km ENE of Pāhala, Hawaii` (also `M4.4 · Near Islands, Alaska`); after wrap pan, East Asia (`M5.2 · Taiwan`) remained registered on the wrapped presentation.

Expected: visually unchanged from completed LIB-081. No registration drift observed.

**Not verified**

- Pinch zoom (out of scope). Physical multi-touch on a real device.
- Pixel-identical identity vs a stored LIB-081 screenshot (qualitative; identity mapping covered by tests with exact `toBe` equality).
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`); inspection used the Cursor pane crop of the 1920×1080 layout.
- Vertical 1× pan no-op as a dedicated screenshot (covered by unchanged camera tests).
- Moon-fixed / Sun-fixed rendering (not implemented).

**Discovered, not done**

- Plan builders inherit Earth-fixed identity through mapping-helper defaults. A non-identity frame must be passed into `sceneXFromLongitudeDeg` / `sceneYFromLatitudeDeg` (optional argument already exists). The Canvas backend currently throws if a non-identity frame is attached, so Phase C must thread the live frame and lift that guard.
- Future longitude-relative frames must shift Earth rasters (base map, illumination, Clouds) in scene-frame space with vector geography; not implemented.
- Latitude-relative-to-anchor semantics remain deferred by design.
- Chrome structural meridians still do not track the panned/zoomed map (accepted; unchanged from LIB-081).
