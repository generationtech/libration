# LIB-086 — Generalize Anchored Scene Reference Frames

| Field | Value |
|-------|-------|
| ID | LIB-086 |
| Status | complete |
| Created | 2026-08-23 |
| Approved | 2026-08-23 (human; this request) |
| Completed | 2026-08-23 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md) through [LIB-085](LIB-085-sun-anchored-scene-frames.md). Human-authorized. This request explicitly authorizes approval and activation of architectural consolidation of the proven Moon/Sun scene-frame model. Do not add a new user-visible frame. Do not add arbitrary entities. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md)–[ADR 0029](../decisions/0029-sun-anchoring-reuses-moon-axis-lock.md).

## Objective

Replace duplicated Moon-anchored and Sun-anchored production frame representations with one explicit anchored scene-reference-frame model. Keep the five user-visible choices and their behaviour identical to completed LIB-085.

## Scope

**In scope**

- Production `SceneReferenceFrame` as Earth-fixed or anchored (`anchorKind: moon | sun`, shared lock semantics).
- Shared constructors, forward/inverse transform, raster dest, camera vertical extent, and longitude continuity that do not branch on Moon vs Sun.
- Rename Moon-named runtime policy (`moonLongitudeLockedAnchor.ts`) to an anchor-neutral module.
- UI remains five runtime choices mapping into the common production type.
- Tests and visual regression; documentation of the generalized model and third-anchor contract (assess only).

**Out of scope**

- New user-visible frames; ISS/storm/aircraft/ship-fixed; generic picker; provider framework; `EntityReferenceFrame<T>`.
- Camera-follow, persistence, URL frame state, map rotation, heading lock.
- Astronomy, civil-time, tiles, map library, unrelated renderer cleanup.
- Changing the five production behaviours.

## Architectural boundaries

- Canonical physical coordinates remain authoritative. Scene-frame coordinates are derived presentation state.
- Anchor physical-state derivation stays explicit at the application boundary (sublunar vs subsolar). The frame consumes coordinates and identity, not astronomy.
- Transform/raster/camera branch on Earth-fixed vs anchored and on lock semantics, not on Moon vs Sun.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; ADRs 0026–0029.

## Acceptance criteria

- Production model is Earth-fixed or anchored; Moon and Sun are `anchorKind` values, not sibling transform kinds.
- User-visible set remains Earth-fixed, Moon longitude-lock, Moon position-lock, Sun longitude-lock, Sun position-lock.
- Same numeric anchor + same lock mode transform identically for `moon` and `sun` identity.
- No Moon/Sun branch in transform, raster dest, camera extent, or continuity math.
- Earth-fixed identity is exact. Camera remains independent. Frame switch still resets camera. Reload still Earth-fixed.
- Runtime policy module is no longer Moon-named.
- Zero deliberate visual/interaction change from LIB-085.

## Verification plan

- Focused tests: shared construction; lock semantics; forward/inverse independent of `anchorKind`; continuity; raster dest; camera extent; Earth-fixed identity; UI mapping; retained Moon/Sun acceptance tests.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production frame type is on `SceneRenderInput`
- Visual verification: required — five-mode regression matrix. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- New ADR for consolidation; ADR 0029 representation note
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule / [`AGENTS.md`](../../AGENTS.md)
- This work item

## Completion record

**Implementation summary**

Production `SceneReferenceFrame` is now `earthFixed | anchored`. Anchored frames carry `anchorKind: "moon" | "sun"`, `lockMode: "longitude" | "position"`, `continuousAnchorLonDeg`, and `anchorLatDeg`. Lock mode is a closed union so latitude-only and unlocked anchored frames are not constructible. Convenience Moon/Sun constructors delegate to `anchoredSceneReferenceFrame`. Forward/inverse, raster dest, camera vertical extent, and longitude continuity branch on Earth-fixed vs anchored and on `lockMode`, not on body. Physical derivation stays explicit in `App.tsx` (`sublunarPoint` vs `subsolarPoint`). Runtime policy renamed `moonLongitudeLockedAnchor.ts` → `sceneFrameAnchor.ts`. UI remains five runtime choices mapping into the common type. ADR 0030. No new user-visible frame.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` (port 1420 already in use; used the existing server at `http://127.0.0.1:1420`) plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before navigation); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- `npm test`: 276 files / 2758 passed / 0 failed (LIB-085 baseline was 2750; +8 tests)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-L7efeokj.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before navigation; after load `overflow: hidden`, canvas CSS 100%, `resize`). Canvas bitmap 1919×1079. Scene frame `<select>` still has five options. Synthetic WheelEvents drove zoom.

- `baseline` Earth-fixed: default `earthFixed`; Reset disabled; centre `[106,124,89]` (LIB-085 was `[107,125,92]`; same Americas/terminator reading). Reload after other frames returned Earth-fixed; Reset disabled.
- `baseline` Moon longitude-lock: centre ocean `[31,98,141]` (exact LIB-085 match); pale Moon ~`(957, 700)` vs LIB-085 y=702; Reset disabled.
- `baseline` Moon position-lock: Moon near origin `(956, 574)`; top/bottom means differ (translated Earth); Reset disabled.
- `baseline` Sun longitude-lock: Sun `(956, 450)` RGB `[255,211,76]` vs LIB-085 ~`(960, 452)`; Reset disabled.
- `baseline` Sun position-lock: Sun `(956, 580)` vs LIB-085 `(959, 574)`; dark top (blank beyond translated north); Reset disabled.
- Camera: wheel zoom on Sun position-lock enabled Reset. Switching Moon longitude / Sun position / Earth-fixed after zoom disabled Reset (camera reset policy preserved). Cross-anchor switches: Moon longitude → Sun longitude; Sun longitude → Moon position; Moon position → Sun position; Sun position → Earth-fixed.
- `clouds`: stride bright-white counts earth 6217 / sun lon 6205 / sun pos 4648 (same pattern as LIB-085: position-lock loses some off-strip).
- `iss-presentation`: cyan earth 2381 / sun lon 2420 / moon pos 2402.
- `earthquake-presentation`: warm earth 135 / sun pos 141.
- `lunar-track`: populated columns 96 in earth / sun lon / sun pos.
- `solar-eclipse-total`: Sun on centre meridian (x ~947–954 vs cx 951). Stride red-hit counts were 1–2 vs LIB-085 dense counts 35–41 — sampling density, not a confirmed presentation change.
- `solar-eclipse-dateline`: left/right columns populated under both Sun modes.
- Resize 1280×720 while Sun position-lock + zoomed: inner 1280×720, canvas 1263×719, frame still `sunPositionLocked`, Reset still enabled.

Expected result: visually equivalent to LIB-085.

**Not verified**

- Pinch zoom (out of scope). Physical multi-touch on a real device.
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`); inspection used the Cursor pane plus canvas pixel sampling.
- Interactive earthquake *hover* label on canvas from synthetic pointermove (untrusted events; hover inverse is covered by `earthquakeMarkerHover` tests).
- Dedicated `lunar-locus` visual pass (shared helpers + lunar-track visual + retained lunar-track tests).
- Dense full-canvas eclipse umbra pixel counts comparable to LIB-085 (stride sampling only).
- Pixel-identical Earth-fixed vs a stored LIB-085 screenshot (qualitative; Earth-fixed and Moon/Sun mapping still exact in tests).
- Dedicated Moon-frame pan/wrap sample (Sun position-lock zoom + frame-switch reset were exercised; pan/wrap remain covered by retained camera tests).

**Discovered, not done**

- Moon/Sun convenience constructors and type guards remain for readability and UI/acceptance tests; they delegate to the common type and are not separate transform kinds.
- Deprecated alias `isLatitudeLockedSceneReferenceFrame` kept as `isPositionLockedSceneReferenceFrame`.
- Physical derivation is still an explicit Moon vs Sun branch at the application boundary (`sublunarPoint` / `subsolarPoint`). That is the intended seam, not leftover transform duplication.
- A third `anchorKind` is not authorized. Contract is recorded in ADR 0030: authoritative canonical lon/lat at the frame instant; meaningful longitude continuity across ±180°; north-up position-lock without heading; equirect dest-shift presentation. ISS has a sub-satellite point so *coordinate math* could fit; heading-up chase view, storms without a single subpoint, and a generic picker do not. No third-anchor work started.
