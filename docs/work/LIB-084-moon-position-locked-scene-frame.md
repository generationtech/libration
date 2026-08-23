# LIB-084 — Moon position-locked scene frame

| Field | Value |
|-------|-------|
| ID | LIB-084 |
| Status | complete |
| Created | 2026-08-23 |
| Approved | 2026-08-23 (human; this request) |
| Completed | 2026-08-23 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md), [LIB-081](LIB-081-scene-camera-pan.md), [LIB-082](LIB-082-scene-reference-frame-foundation.md), and [LIB-083](LIB-083-moon-longitude-locked-scene-frame.md). Human-authorized. This request explicitly authorizes approval and activation of Moon position-lock: the existing `moonAnchored` kind with longitude and latitude both locked. Do not implement Sun-fixed or generic entity-fixed. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md), [ADR 0027](../decisions/0027-moon-longitude-lock-is-a-scene-reference-frame.md).

## Objective

Extend the production `moonAnchored` scene reference frame so it supports both longitude-lock (LIB-083, latitude identity) and full position-lock (longitude and latitude locked to the sublunar point). In position-lock the Moon remains at scene-frame origin while Earth geography moves in both axes. This is a reference-frame transform, not camera-follow.

## Scope

**In scope**

- `moonAnchored` with `latitudeLocked: true` (position-lock) alongside existing longitude-only mode.
- Forward/inverse latitude transform: `sceneLat = canonicalLat − moonAnchorLat`; no latitude wrapping; scene-frame latitude may leave ±90°.
- Vertical raster dest shift (base map, illumination, Clouds) without vertical wrap; clip beyond terrestrial latitude.
- Camera remains independent (zoom, pan, wrap, reset). Vertical clamp uses scene-frame Earth extent; identity camera stays `1, 0.5, 0.5`.
- Runtime Scene frame control: Earth-fixed / Moon — longitude locked / Moon — position locked. Not persisted.
- Frame-switch camera reset; Reset view resets camera only.
- Tests and visual verification including Earth-fixed and longitude-lock regression.

**Out of scope**

- Sun-fixed, generic entity-fixed, generic axis checkboxes, anchor picker.
- Camera-follow, writing Moon latitude into `centerV`.
- Frame or camera persistence, URL frame state, map rotation, heading lock.
- Vertical world wrapping, polar mirroring, tiles, map library, pinch zoom.
- Astronomy/civil-time changes, unrelated renderer refactors.

## Architectural boundaries

- Canonical geographic coordinates remain authoritative. Scene-frame coordinates are derived presentation state.
- Scene-frame latitude is not geographic latitude; do not clamp it to ±90° while operating in scene space.
- Latitude is not periodic. Do not reuse longitude seam helpers for latitude.
- Projection maps scene-frame latitude linearly (no physical-latitude clamp).
- `SceneCamera` remains `{ scale, centerU, centerV }` over projected scene-frame space.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md); [ADR 0027](../decisions/0027-moon-longitude-lock-is-a-scene-reference-frame.md).

## Acceptance criteria

- Earth-fixed remains the load default and matches completed LIB-083 Earth-fixed behaviour.
- Moon longitude-lock remains: `sceneMoonLon ≈ 0`, `sceneMoonLat = canonicalMoonLat`.
- Moon position-lock: Moon maps to scene `(0°, 0°)` within tolerance; both axes stay fixed as time advances; Earth moves horizontally and vertically.
- Scene-frame latitude may be outside ±90° (e.g. canonical −80 with anchor +28 → −108). Inverse recovers canonical latitude.
- Rasters shift in both axes without vertical wrap; vectors/entities stay registered.
- Camera identity is default scene-frame view; pan/zoom/reset remain independent; no per-frame camera tracking.
- Switching any of the three frame configurations resets the camera to identity. Reset view does not change the frame.
- Frame is runtime-only. Reload returns to Earth-fixed.

## Verification plan

- Focused tests: frame variants; Moon origin; longitude-lock regression; latitude forward/inverse including outside ±90°; linear projection outside geographic range; raster vertical offset; vector/raster registration; camera composition; vertical constraints; reset; frame switch; hover inverse; time progression.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — mapping path, rasters, and Scene frame control
- Visual verification: required — Earth-fixed and longitude-lock regression; position-lock static/animated; latitude extreme/standstill; antimeridian; camera independence; Clouds; ISS; earthquake; eclipse; resize. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- [ADR 0027](../decisions/0027-moon-longitude-lock-is-a-scene-reference-frame.md) and a new ADR for position-lock / scene-frame latitude
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule if the projection or frame contract changes
- This work item

## Completion record

**Implementation summary**

Production `moonAnchored` second axis configuration: `latitudeLocked: true` (position-lock) beside existing longitude-lock (`latitudeLocked: false`). Forward latitude is `sceneLat = canonicalLat − moonAnchorLat` with no wrap and no ±90° clamp in scene space; inverse adds the anchor and clamps only when producing canonical geographic latitude. Rasters reuse the full-world strip: LIB-083 horizontal dest shift plus vertical dest shift `−moonAnchorLat / 180 × height` with no vertical copies. Camera identity stays `1, 0.5, 0.5` (default scene-frame view). At scale 1, `centerV` stays 0.5 (blank beyond translated Earth is accepted). At scale > 1, pan/zoom clamp against the scene-frame Earth extent. Runtime Scene frame control: Earth-fixed / Moon — longitude locked / Moon — position locked. Not persisted. Switching any of the three resets the camera; Reset view resets the camera only. ADR 0028.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` (http://localhost:1420, `strictPort: true`) plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before navigation); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- `npm test`: 276 files / 2712 passed / 0 failed (LIB-083 baseline was 2691; +21 tests)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-Dtgih3Ma.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before navigation; after load `overflow: hidden`, canvas CSS 100%, `resize`). Canvas bitmap 1919×1079. Pane screenshots crop the left of that layout (accepted compositor-capture limitation). Synthetic WheelEvents drove zoom; synthetic pointer drag used for pan (capture skipped on untrusted events). Brightest-pixel-on-centre-meridian is an unreliable Moon locator under 86400× Demo (Sun transits); Moon proofs used a compact disc / libration-ring probe near scene origin.

- `baseline` Earth-fixed: Scene frame default `earthFixed`; Reset disabled; three options present; centre land-ish `[106,124,89]`; bottom geography filled (mean lum 282). Reload after other frames returned Earth-fixed.
- `baseline` Moon longitude-lock (static): Reset disabled; centre ocean `[31,98,141]`; Moon pale peak on centre meridian south of scene centre (y≈708). Animated 86400×: Moon X stayed 959 (Δx 0); Moon Y moved (−54 px on the ring heuristic); geography hash changed; camera stayed identity.
- `baseline` Moon position-lock static: Moon disc/ring at y≈574 (scene-strip centre, not canvas mid-Y 539 because of top chrome); bottom mean lum 78 (`#1a1a1a` background); top geography; no vertical wrap. Animated 86400×: geography hash changed; Reset stayed disabled; dark-centre + ring at (959, 574) remained while the map moved. Time-advance while zoomed/panned: hash changed, Reset stayed enabled (camera not rewritten).
- Camera independence in position-lock: wheel zoom, horizontal pan, vertical pan at scale>1, identity horizontal wrap (~0.6 width), Reset restored the identity hash exactly and kept `moonPositionLocked`.
- Frame switch: all six transitions among Earth-fixed / longitude-lock / position-lock after a zoom reset the camera (Reset disabled after switch).
- `lunar-track` position-lock: default load Earth-fixed; after switch, cool track hits on the centre meridian (346); bottom blank (78); no empty left/right.
- `lunar-locus` recent position-lock: origin rings 435/294/363; bottom blank 78; identity camera.
- `lunar-locus` `locusEpoch=standstill` (high-priority latitude extreme): Earth-fixed Moon near south of canvas; position-lock Moon pale disc at y=574 `[230,239,253]` rings 722/385/213; rows y=80–200 mean 78 (blank beyond translated north edge); geography from y≈240 to bottom; no polar duplication.
- `moon-libration` position-lock: origin rings 243/390/351 (libration ring at origin); bottom blank 78 vs Earth-fixed bottom 569.
- `solar-eclipse-total` position-lock: default Earth-fixed; after switch, eclipse-red hits present (50); dark field present; Sun/Moon cluster near origin at greatest eclipse.
- `solar-eclipse-dateline` position-lock: left/mid/right column means 195/370/185 (both sides filled); redHits 355; bottom blank 78.
- `clouds` position-lock: bright cloud-ish pixels 13889 (Earth-fixed 17310; some coverage left the translated strip); bottom blank 78.
- `iss-presentation` position-lock: cyanish track pixels 64070 (Earth-fixed 56368); hash changed with the frame.
- `earthquake-presentation` position-lock: warm markers 401 (Earth-fixed 423); zoomed still 126; Reset enabled after zoom.
- Resize 1280×720 while position-lock + non-identity camera on `earthquake-presentation`: inner 1280×720, canvas 1279×719, frame still `moonPositionLocked`, Reset still enabled, markers still present.

**Not verified**

- Pinch zoom (out of scope). Physical multi-touch on a real device.
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`); inspection used the Cursor pane crop of the 1920×1080 layout plus canvas pixel sampling.
- Interactive earthquake *hover* label on canvas from synthetic pointermove (untrusted events; hover inverse is covered by `earthquakeMarkerHover` tests). Persistent/warm markers were visible under position-lock and after zoom.
- Pixel-identical Earth-fixed vs a stored LIB-083 screenshot (qualitative; Earth-fixed mapping still exact in tests).

**Discovered, not done**

- Chrome structural meridians remain a full-world Earth-fixed ruler (accepted; ADR 0027 / ADR 0028).
- At scale 1, identity camera in position-lock can show blank beyond the translated Earth strip. That is the defined default scene-frame view; hiding it by rewriting `centerV` each frame would be camera-follow.
- Generalized anchor + axis-lock beyond Moon-specific production types is documented in [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) and roadmap phase D. Not created or activated.
- Sun-fixed is not implemented.
