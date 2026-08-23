# LIB-083 — Moon longitude-locked scene frame

| Field | Value |
|-------|-------|
| ID | LIB-083 |
| Status | complete |
| Created | 2026-08-23 |
| Approved | 2026-08-23 (human; this request) |
| Completed | 2026-08-23 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md), [LIB-081](LIB-081-scene-camera-pan.md), and [LIB-082](LIB-082-scene-reference-frame-foundation.md). Human-authorized. This request explicitly authorizes approval and activation of the first production alternate scene frame: Moon longitude-lock with latitude unlocked. Do not implement latitude lock, Sun-fixed, or generic entity-fixed. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

## Objective

Implement a Moon-anchored longitude-locked scene reference frame so the Moon occupies a fixed scene-frame meridian while Earth geography moves continuously beneath it in longitude as time advances. Lunar latitude remains physical. The camera stays independent (zoom, pan, wrap, reset). Canonical physical state is not mutated.

## Scope

**In scope**

- Production `moonAnchored` scene reference frame with longitude locked and latitude identity.
- Continuous/unwrapped Moon anchor longitude from the canonical UTC instant’s authoritative sublunar point.
- Forward and inverse longitude transforms centralized in the scene-reference-frame layer.
- Whole-Earth raster shift (base map, illumination, Clouds) plus existing periodic world copies.
- Vector/path/entity mapping through the shared frame → projection → camera seam.
- Smallest practical runtime control to switch Earth-fixed ↔ Moon longitude-lock (not persisted).
- Camera recenter to identity when switching frames; Reset view resets camera only.
- Tests and visual verification including Earth-fixed regression.

**Out of scope**

- Moon latitude lock / full position-lock (LIB-084).
- Sun-fixed, generic entity-fixed, anchor picker, heading lock, map rotation, camera-follow.
- Frame or camera persistence, URL frame state.
- Tiles, map library, pinch zoom, astronomy/civil-time changes, unrelated renderer refactors.

## Architectural boundaries

- Canonical geographic/astronomical coordinates remain authoritative. Frame-relative coordinates are derived presentation state.
- Do not keep the Moon horizontally fixed by writing Moon longitude into `SceneCamera.centerU`.
- Projection still consumes scene-frame lon/lat. Camera remains `{ scale, centerU, centerV }` over projected scene-frame space.
- Horizontal camera wrapping (LIB-081) is not reference-frame longitude continuity (LIB-082 primitives).
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

## Acceptance criteria

- Earth-fixed remains the default and is visually identical to completed LIB-082/LIB-081.
- In Moon longitude-lock, the Moon marker’s scene-frame longitude is the frame origin (`0°`) within tolerance; scene latitude equals canonical lunar latitude.
- The continuous Moon anchor follows `178 → 179 → 180 → 181 → 182` (or equivalent) through the canonical antimeridian; no ~360° scene jump.
- Geography, rasters, illumination, Clouds, tracks, and entities share one frame transform; vectors and rasters stay registered.
- Antipodal/global geography remains representable via periodic copies; paths do not draw world-spanning seams from mixed longitude equivalents.
- Inverse mapping supports earthquake hover, wrap copies, zoom, and pan.
- Switching frames recenters the camera to identity; Reset view does not change the active frame.
- Frame is runtime-only (not URL/storage/`SceneConfig`). Reload returns to Earth-fixed.

## Verification plan

- Focused tests: Earth-fixed regression; Moon anchor invariant; latitude identity; antimeridian continuity; forward/inverse; antipodal copies; raster offset; camera composition; pointer-stable zoom; hover; seam-sensitive path; frame switch; Reset view.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — render input, mapping path, and experimental control
- Visual verification: required — Earth-fixed regression plus Moon-frame static/animated, lunar antimeridian, antipodal seam, `lunar-track`, `lunar-locus`, `moon-libration`, solar eclipse, `solar-eclipse-dateline`, Clouds, ISS, earthquake hover, resize. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md) and a new ADR for Moon longitude-lock production semantics
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- This work item
- Cursor/agent scene-system rule if durable architecture changed

## Completion record

**Implementation summary**

Production `moonAnchored` scene reference frame with longitude locked and latitude identity. Continuous lunar anchor from `sublunarPoint` at the canonical UTC instant; forward/inverse centralized in `sceneReferenceFrame.ts`. Rasters shift by `−λMoon_continuous / 360 × width` then reuse periodic dest copies; vectors transform to scene-frame longitude then existing seam unwrap + camera wrap. Compact runtime **Scene frame** control (Earth-fixed / Moon — longitude locked); not persisted. Switching frames resets the camera to identity; Reset view resets the camera only.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` (http://localhost:1420, `strictPort: true`) plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before navigation); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (combined with `npm test`; process exit 0)
- `npm test`: 276 files / 2691 passed / 0 failed
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-B0x-ndoG.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before navigation; after load `overflow: hidden`, canvas CSS 100%, `resize`). Canvas bitmap 1919×1079. Screenshots of the Cursor pane crop the left of that layout (accepted compositor-capture limitation vs canvas size). Synthetic WheelEvents drove zoom; synthetic pointer drag used for pan (capture skipped on untrusted events).

- `baseline` Earth-fixed: identity Reset disabled; Pacific/LA/grid/terminator registered; Scene frame default Earth-fixed.
- `baseline` Moon longitude-lock: Sun at canvas x≈18 (canonical ~0° mapped to scene ~−180°); Moon pale disc at x=959.4, y=702.5 (Δx from centre −0.08 px); centre pixel ocean `[31,98,141]` (Pacific under a ~180° lunar anchor). Reset disabled (identity camera).
- Animated Moon-lock (Config → Data, speed 3600×, Resume ~3 s): Moon x 959.5 (Δx +0.08 px); y 692.46 (Δy −10 px); geography hash changed; Reset still disabled (camera not rewritten). Pause; wheel zoom enabled Reset; Reset restored identity **without** leaving Moon longitude-lock (select still Moon — longitude locked; Moon x=958.5). Switch back to Earth-fixed succeeded. Reload `baseline` returned Scene frame to Earth-fixed.
- `lunar-track` Earth-fixed: Pacific/Americas crop, track registered. Moon-lock: dark Moon disc at ~960,733 (high southern latitude); track crosses that meridian; columns 40/960/1880 populated (19424 / 46790 / 20726); left vs +900 px identity ratio 0. Demo 3600×, 8 samples / 200 ms: Moon x 954–965 (no ~1920 px jump); y 733→732; geography hash changed every sample (antimeridian-scale motion).
- `lunar-locus` recent: dark Moon at x=960, y=726; columns populated.
- `lunar-locus` `locusEpoch=standstill`: distinct epoch `2025-03-08T12:00:00.000Z`; columns populated.
- `moon-libration`: pale Moon at x=964, y=656; East Asia/Australia registered with grid in the pane crop.
- `solar-eclipse-total`: Sun at x=962, y=540 (stacked with Moon at scene origin at greatest eclipse).
- `solar-eclipse-dateline`: Sun at x=960, y=608; left/right column means 134.5 / 136.9 (no blank edge).
- `clouds`: columns populated; cloud texture registered with Pacific geography/grid in the pane crop.
- `iss-presentation`: ISS track registered with Americas/grid/terminator.
- `earthquake-presentation`: persistent label `M3.2 - 25 km W of Valparaíso` registered on the Moon-frame map; orange markers present.
- Resize 1280×720 while Moon-lock + zoomed: inner 1280×720, canvas 1279×719, frame still Moon — longitude locked, Reset still enabled, columns populated.

**Not verified**

- Pinch zoom (out of scope). Physical multi-touch on a real device.
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`); inspection used the Cursor pane crop of the 1920×1080 layout plus canvas pixel sampling.
- Interactive earthquake *hover* label on canvas from synthetic pointermove (untrusted events; hover inverse is covered by `earthquakeMarkerHover` tests). Persistent earthquake labels were visible.
- Pixel-identical Earth-fixed vs a stored LIB-082 screenshot (qualitative; Earth-fixed mapping still exact in tests).
- Moon latitude lock / position-lock (not implemented).

**Discovered, not done**

- Chrome structural meridians remain a full-world Earth-fixed ruler and do not track the Moon-relative map (accepted; ADR 0027).
- Pane screenshots crop the left of the 1920×1080 layout (known compositor limitation from LIB-022/LIB-082). Moon-at-centre proofs used canvas pixel sampling, not the pane crop.
- Identity camera plus a shifted raster dest must emit extra periodic copies; copy-offset math now takes `identityOriginX` (otherwise a non-zero Moon shift would leave a blank strip at identity).
- LIB-084 (Moon latitude lock / position-locked frame) is documented as the likely next slice and is **not** created or activated.
