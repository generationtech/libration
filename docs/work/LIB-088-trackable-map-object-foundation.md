# LIB-088 — Trackable Map Object Foundation

| Field | Value |
|-------|-------|
| ID | LIB-088 |
| Status | complete |
| Created | 2026-08-24 |
| Approved | 2026-08-24 (human; this request) |
| Completed | 2026-08-24 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md) through [LIB-087](LIB-087-automatic-scene-cover-zoom-for-position-locked-frames.md). Human-authorized. This request explicitly authorizes approval and activation of an **architectural foundation** for tracking arbitrary rendered map objects. Do not add ISS, city, planet, Milky Way, or earthquake tracking. Do not redesign the existing scene-frame UX beyond mapping the five current choices onto target identity + lock mode. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md)–[ADR 0031](../decisions/0031-position-lock-default-camera-is-automatic-scene-cover-zoom.md).

## Objective

Generalize the existing Moon/Sun anchored scene-frame pipeline around a **trackable map object**: a rendered object that can expose an authoritative canonical geographic longitude/latitude for the current frame instant and can therefore serve as a scene-frame anchor. Establish the target identity/resolution architecture and migrate existing Moon/Sun tracking onto it with **no deliberate user-visible behavior change**.

## Scope

**In scope**

- Stable production target identity for Moon and Sun only (closed type; not free-form strings; not a plugin registry).
- Target-resolution seam: object-specific knowledge produces canonical lon/lat; the reference frame consumes resolved anchor state.
- Refactor anchored `SceneReferenceFrame` so it references that target identity rather than a Moon/Sun-specific `anchorKind`. Coordinate math must not branch on target identity.
- Keep `lockMode = "longitude" | "position"`. Keep Earth-fixed as a distinct non-targeted identity.
- Preserve LIB-087 cover policy as target-agnostic (anchored + position-lock + anchor latitude).
- Keep the five existing Scene frame choices and labels.
- Document the trackability contract and that future targets may be dynamic or static.
- Focused tests, full suite, and visual regression.

**Out of scope**

- ISS, city, planet, Milky Way, or earthquake tracking.
- Clickable object selection; generic target picker; object registry/plugin system.
- New lock modes, heading lock, map rotation.
- Frame/camera persistence, URL state.
- Astronomy or civil-time changes; unrelated renderer refactors.
- Changing the five current user-visible scene-frame behaviors.

## Architectural boundaries

- Target identity is stable and independent of current coordinates.
- Object-specific knowledge belongs in target resolution, not in reference-frame coordinate math.
- The frame consumes `target`, `lockMode`, `continuousAnchorLonDeg`, and `anchorLatDeg`.
- Plan builders remain unaware of target identity except when rendering that object's own canonical data.
- Inverse mapping uses resolved coordinates already embedded in the active frame.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; ADRs 0026–0031.

## Acceptance criteria

- Production anchored frames carry a trackable target identity (`moon` | `sun`), not a celestial-body-specific sibling type.
- Moon resolves from the existing authoritative sublunar point; Sun from the existing authoritative subsolar point.
- Same numeric `continuousAnchorLonDeg` + `anchorLatDeg` + `lockMode` yield identical forward/inverse, raster dest, camera vertical extent, and automatic cover scale regardless of target identity.
- Longitude continuity remains target-independent.
- Five UI choices still map to Earth-fixed or `target + lockMode`.
- Earth-fixed remains a distinct non-targeted identity.
- Moon/Sun acceptance tests from LIB-080–087 remain; camera/cover/hover semantics unchanged.
- Zero deliberate visual/interaction change from LIB-087.

## Verification plan

- Focused tests: target identity; UI mapping; resolution via existing seams; same-coordinates same-transform including cover; continuity; retained Moon/Sun acceptance; frame switching; inverse hover.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production frame type is on the live scene path
- Visual verification: required — five-mode regression, cross-target switching, auto-cover/manual override, representative layers, resize. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- New ADR for the target-resolution boundary
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule / [`AGENTS.md`](../../AGENTS.md)
- This work item

## Completion record

**Implementation summary**

Introduced `TrackableMapObjectId` (`"moon" | "sun"`) and a resolution seam (`src/core/trackableMapObject.ts`) that maps identity onto the existing `sublunarPoint` / `subsolarPoint` authorities. Anchored `SceneReferenceFrame` now carries `target` instead of `anchorKind`. Forward/inverse, raster dest, camera vertical extent, longitude continuity, and automatic cover remain target-agnostic. `App.tsx` resolves the target, then builds the common frame. The five Scene frame UI choices are unchanged and map to Earth-fixed or `target + lockMode`. Earth-fixed is not a target. ADR 0032. No ISS/city/planet/Milky Way/earthquake tracking.

**Commands run**

- `npx tsc --noEmit`
- `npx vitest run src/core/trackableMapObject.test.ts src/core/sceneFrameAnchor.test.ts src/core/sceneReferenceFrame.test.ts src/core/sceneCamera.test.ts src/core/sceneCameraCover.test.ts`
- `npm test`
- `npm run build`
- `npm run dev` at `http://localhost:1420/` plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before reload); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- Focused tests: 5 files / 116 passed / 0 failed
- `npm test`: 278 files / 2778 passed / 0 failed (LIB-087 baseline was 277 / 2772; +1 file / +6 tests, including 5 in `trackableMapObject.test.ts`)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-CkBe6pSA.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before reload; after load `overflow: hidden`, canvas CSS 100%, `resize`). Canvas bitmap 1919×1079. Scene frame `<select>` still has the same five options and labels.

- `baseline` Earth-fixed: default `earthFixed`; Reset disabled; centre `[106,124,89]` (LIB-087 match).
- `baseline` Moon longitude-lock: centre `[31,98,141]` (LIB-087 match); Reset disabled; no auto-cover crop (`topBlack` 0 at identity).
- `baseline` Moon position-lock: Moon near origin ~(982, 576); `topBlack` 0; Reset disabled at cover default.
- `baseline` Sun longitude-lock: identity-scale meridian lock; Reset disabled.
- `baseline` Sun position-lock: Sun origin ~(960, 576), 50 sun-coloured hits; `topBlack` 0; Reset disabled.
- Wheel override on Sun position-lock enabled Reset; switching Moon longitude → Sun longitude → Moon position → Sun position → Earth-fixed each reinitialized policy (Reset disabled).
- Reset on Moon position-lock after wheel: re-armed auto-cover (Reset disabled, `topBlack` 0, frame unchanged).
- Overlays: `clouds` bright counts earth 1091 / moon lon 1089 / moon pos 900 / sun lon 1006 / sun pos 749 (position-lock crops as before). `iss-presentation` cyan earth 792 / sun lon 792 / moon pos 896. `lunar-track` populated columns 24 in earth / sun lon / moon pos. `solar-eclipse-total`: Sun on centre meridian under Sun longitude-lock (x 961.5 vs cx 959) and Sun position-lock (x 962).
- Seasonal: `terminator` Sun position-lock Sun ~(960, 576), `topBlack` 0; `night` Sun position-lock Sun ~(960, 576), `topBlack` 0, Reset disabled.
- Resize: Moon position-lock auto-cover at 1280×720 canvas 1279×719, `topBlack` 0, Reset disabled. After wheel override, resize left Reset enabled.

Expected result: visually equivalent to LIB-087.

**Not verified**

- Pinch zoom / physical multi-touch.
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`); inspection used the Cursor pane plus canvas sampling.
- Interactive earthquake hover labels (untrusted pointermove).
- Dense eclipse umbra pixel counts (stride sampling found Sun meridian lock, not umbra fill).
- Dedicated `lunar-locus` standstill animation pass (lunar-track overlay + retained tests).
- Pixel-identical comparison against a stored LIB-087 screenshot.

**Discovered, not done**

- ISS already exposes an authoritative `currentPosition` `{ lonDeg, latDeg }` in lifecycle state. Adding ISS tracking would be: extend `TrackableMapObjectId` with `"iss"`, resolve from that existing position at the canonical instant, expose UI, and reuse the anchored frame / continuity / cover. Remaining ISS work is identity + resolution + unavailable-position/live-enough policy + UI — not another transform or camera refactor.
- Clickable object selection, a generic picker, and a provider registry were not added (out of scope).
- Deprecated aliases `sceneFrameAnchorKindFromUiKind` and `nextMoonAnchorContinuousLonDeg` remain as thin wrappers.
- Computing both sublunar and subsolar points when any anchored frame is active is a small extra versus the previous single-body branch; both calls are the existing authorities, not a new ephemeris.
