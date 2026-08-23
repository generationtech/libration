# LIB-087 — Automatic Scene-Cover Zoom for Position-Locked Frames

| Field | Value |
|-------|-------|
| ID | LIB-087 |
| Status | complete |
| Created | 2026-08-23 |
| Approved | 2026-08-23 (human; this request) |
| Completed | 2026-08-23 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md) through [LIB-086](LIB-086-generalize-anchored-scene-reference-frames.md). Human-authorized. This request explicitly authorizes approval and activation of a **camera-policy** milestone: automatic scene-cover zoom for anchored position-locked frames. Do not change reference-frame coordinate mathematics. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md)–[ADR 0030](../decisions/0030-anchored-scene-frames-are-one-production-kind.md).

## Objective

When an anchored **position-locked** scene frame translates Earth vertically, automatically choose the minimum camera scale that covers the interior scene viewport so no empty background band appears merely because of anchor-latitude displacement.

## Scope

**In scope**

- Automatic cover zoom for Moon position-lock and Sun position-lock, via shared position-lock / anchored-frame helpers (no Moon/Sun duplicate logic).
- Explicit runtime camera policy: automatic cover vs manual zoom override (not persisted).
- Recompute cover while auto remains active (time, latitude, resize).
- Manual wheel zoom suspends auto-cover; Reset view and switching into position-lock re-arm it.
- Reset-view enabled/disabled semantics for the automatic default (not `scale === 1`).
- Focused tests and visual verification.

**Out of scope**

- New frames, new anchor kinds, generic picker, persistence, URL camera, camera-follow.
- Changing reference-frame translation, canonical geography, raster dimensions, vertical wrap/mirror.
- Writing `centerV` from the anchor each frame.
- Rotation, heading lock, tiles, map library, astronomy, civil time, broad UI redesign.

## Architectural boundaries

- Camera policy is a view choice over already-transformed scene-frame space. The frame still defines where Earth exists.
- Do not encode cover by mutating the anchor or the frame transform.
- Cover is a **cover** fit, not contain. Cropping geography is expected.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; ADRs 0026–0030.

## Acceptance criteria

- Earth-fixed and Moon/Sun longitude-lock keep existing identity-default camera behaviour.
- Moon/Sun position-lock auto-cover uses one position-lock calculation, not body-specific constants.
- At ~0° anchor latitude, required scale is ~1.
- Non-zero latitude produces the minimum scale that covers the viewport; no empty north/south band from translation.
- Manual wheel zoom suspends auto-cover; later time/latitude updates do not rewrite that scale.
- Reset in position-lock clears override, restores current cover scale, stays in the same frame. Reset is disabled at that automatic default even if `scale > 1`.
- Frame switch reinitializes policy (no carried manual override).
- Auto-cover does not write anchor latitude into `centerV`.
- Horizontal wrap / `centerU` / raster copies unchanged.
- Supported Moon/Sun latitudes fit within camera max scale 8, proven by math/tests.

## Verification plan

- Focused tests: Earth-fixed/longitude-lock regression; zero / ± / lunar-extreme / solar-solstice latitudes; minimum sufficient scale; max bound; manual override; Reset; frame switch; resize; `centerV` independence.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — camera policy is on the live scene path
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- New ADR for default cover camera policy
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule / [`AGENTS.md`](../../AGENTS.md)
- This work item

## Completion record

Fill only when completing.

**Implementation summary**

Position-lock default camera is automatic scene-cover zoom (`minimumScaleToCoverSceneFrameEarth` = `1 / (1 − |anchorLat| / 90)` under the current stretched identity mapping). Policy is explicit runtime `off | auto | manual` on App, not on the frame or `SceneCamera`. Cover updates scale only; `centerV` stays independent of the anchor. Wheel zoom sets `manual`; Reset and entering a position-lock kind re-arm `auto`. Earth-fixed and longitude-lock remain identity. ADR 0031.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` at `http://localhost:1420/` plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before navigation); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- `npm test`: 277 files / 2772 passed / 0 failed (LIB-086 baseline was 276 / 2758; +1 file / +14 tests in `sceneCameraCover.test.ts`)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-BdhmF60J.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before navigation; after load `overflow: hidden`, canvas CSS 100%, `resize`). Canvas bitmap 1919×1079. Scene-strip top/bottom near-black fraction sampled from canvas pixels.

- `baseline` Earth-fixed: identity world (Americas; Sun over Caribbean; Moon in Atlantic); Reset disabled.
- `baseline` Moon longitude-lock: full-world identity (London/Cairo/Mumbai together); Reset disabled; no auto-cover crop.
- `baseline` Moon position-lock: Moon at origin ~(957, 573); map covers strip (near-black 0); Reset disabled at cover default (`scale > 1`).
- `baseline` Sun longitude-lock: identity-scale meridian lock; Reset disabled.
- `baseline` Sun position-lock (June): Sun at origin ~(949, 576), 197 sun-coloured hits; North America/Greenland cover; near-black ~0; Reset disabled.
- Wheel override on Sun position-lock: Reset enabled; view cropped to NW Africa coast. Demo 86400× advanced the canvas (`hash` 554143 → 907075) while Reset stayed enabled (cover did not reassert). Reset restored cover (north Pacific) and disabled the button.
- Resize: Moon position-lock auto-cover at 1280×720 still near-black 0 and Reset disabled. After wheel override, resize to 1280×720 left Reset enabled (did not re-arm).
- `lunar-locus&locusEpoch=standstill` Moon position-lock: Moon origin ~(958, 574); Europe/Africa/ME cover; near-black ~0. Accelerated demo: Reset stayed disabled; Earth moved (Europe → North America); Moon stayed near origin; no black bands.
- `terminator` Sun position-lock (equinox): Americas Greenland–São Paulo (scale ~1); near-black 0.
- `night` Sun position-lock (Dec solstice): Africa; equator below centre; near-black 0.
- Overlays under Moon position-lock cover: `clouds`, `iss-presentation` (ISS track), `solar-eclipse-total` (eclipse shadow), `lunar-track` (track through Australia). All near-black 0; markers/tracks registered.

**Not verified**

- Pinch zoom / physical multi-touch.
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`); inspection used the Cursor pane plus canvas sampling.
- Interactive earthquake hover labels (untrusted pointermove).
- Southern solar-solstice visual beyond `night` (Dec 21 06:00 UTC already exercises south declination).
- Pixel-identical comparison against a stored LIB-086 screenshot.

**Discovered, not done**

- Required cover scale is independent of viewport pixel height/aspect under the current stretched identity mapping; resize still re-runs the formula (idempotent while auto).
- Pan does not suspend auto-cover. During an active pan the cover applicator is skipped so pan math is not overwritten mid-gesture; after pan ends, auto resumes (scale only).
- Existing max 8× covers all supported Moon/Sun latitudes (`|lat| ≤ 78.75°` reaches 8). No max raise.
- Longitude-lock was not auto-zoomed; identity already fills vertically. No separate aspect-ratio letterbox issue under this camera model.
