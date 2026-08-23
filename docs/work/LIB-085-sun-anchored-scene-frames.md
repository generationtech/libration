# LIB-085 — Sun-anchored scene frames

| Field | Value |
|-------|-------|
| ID | LIB-085 |
| Status | complete |
| Created | 2026-08-23 |
| Approved | 2026-08-23 (human; this request) |
| Completed | 2026-08-23 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md), [LIB-081](LIB-081-scene-camera-pan.md), [LIB-082](LIB-082-scene-reference-frame-foundation.md), [LIB-083](LIB-083-moon-longitude-locked-scene-frame.md), and [LIB-084](LIB-084-moon-position-locked-scene-frame.md). Human-authorized. This request explicitly authorizes approval and activation of Sun-anchored scene frames using the same axis-lock semantics as the Moon. Do not generalize to arbitrary entities. Do not introduce a generic anchor selector. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md), [ADR 0027](../decisions/0027-moon-longitude-lock-is-a-scene-reference-frame.md), [ADR 0028](../decisions/0028-moon-position-lock-translates-scene-frame-latitude.md).

## Objective

Add production Sun-anchored scene reference frames (`sunAnchored`) with both longitude-lock and position-lock, reusing the Moon axis-lock semantics already proven by LIB-083/LIB-084. Deliver useful Sun-relative moving-map views and prove the current frame architecture works for a second real anchor before any generic entity abstraction.

## Scope

**In scope**

- Production `sunAnchored` frames: longitude-lock (latitude identity) and position-lock (both axes).
- Earth-fixed and both Moon modes remain available. Five runtime Scene frame choices.
- Continuous/unwrapped Sun anchor longitude from the canonical UTC instant’s authoritative subsolar point.
- Forward/inverse transforms matching Moon: longitude relative to continuous anchor; position-lock subtracts solar latitude.
- Raster dest shift (X for longitude-lock; X+Y for position-lock) shared by base map, illumination, and Clouds.
- Camera independence; frame-switch camera reset; Reset view resets camera only.
- Seasonal/deterministic solar-latitude verification for position-lock.
- Tests and visual verification including Earth-fixed and Moon-frame regression.

**Out of scope**

- Arbitrary entity anchoring, generic entity selector, ISS/storm/aircraft/ship frames.
- Camera-follow, writing subsolar coordinates into `SceneCamera`.
- Frame or camera persistence, URL frame state, map rotation, heading lock.
- Tiles, map library, astronomy/civil-time changes, unrelated renderer refactors.
- Generic entity-frame redesign (roadmap phase D).

## Architectural boundaries

- Canonical geographic/astronomical coordinates remain authoritative. Scene-frame coordinates are derived presentation state.
- Do not keep the Sun fixed by writing subsolar lon/lat into `SceneCamera`.
- Illumination remains canonical physical sampling rendered through the scene-frame dest. Do not special-case shading to look stationary.
- Scene longitude zero in Sun longitude-lock is the current subsolar meridian, not civil clock noon.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md); [ADR 0027](../decisions/0027-moon-longitude-lock-is-a-scene-reference-frame.md); [ADR 0028](../decisions/0028-moon-position-lock-translates-scene-frame-latitude.md).

## Acceptance criteria

- Production frame set: Earth-fixed; Moon longitude-lock; Moon position-lock; Sun longitude-lock; Sun position-lock.
- Earth-fixed remains the load default. Reload returns to Earth-fixed.
- Sun longitude-lock: `sceneSunLon ≈ 0`, `sceneSunLat = canonicalSunLat`.
- Sun position-lock: `sceneSunLon ≈ 0`, `sceneSunLat ≈ 0`.
- Continuous solar longitude follows the Moon antimeridian policy (no ~360° jump).
- Inverse recovers canonical geography. Hover maps to the same earthquake record.
- Rasters: Earth-fixed unchanged; Sun longitude-lock X only; Sun position-lock X+Y; base map, illumination, and Clouds agree.
- Camera remains independent (zoom, pan, wrap, reset). Position-lock vertical extent reuses the translated-Earth helper.
- Switching any of the five configurations resets the camera. Reset view does not change the frame.
- Moon layers under Sun frame transform as ordinary geographic data (no leftover Moon-relative shortcut).
- Seasonal position-lock proof: Sun stays at origin while Earth vertical placement changes with solar latitude.

## Verification plan

- Focused tests: five frame kinds; Sun origin both modes; continuous solar longitude; latitude identity vs subtract; inverse; raster dest; camera composition; frame transitions; hover; Moon-as-non-anchor; eclipse geometry; seasonal solar latitude.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — mapping path, rasters, and Scene frame control
- Visual verification: required — Earth-fixed and Moon regression; Sun longitude-lock static/animated; solar antimeridian; Sun position-lock static/seasonal; camera; illumination; Clouds; Moon/lunar layers; ISS; earthquakes; eclipses; resize. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- [ADR 0027](../decisions/0027-moon-longitude-lock-is-a-scene-reference-frame.md) / [ADR 0028](../decisions/0028-moon-position-lock-translates-scene-frame-latitude.md) and a new ADR if Sun anchoring warrants one
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule if the frame contract changes
- This work item

## Completion record

**Implementation summary**

Production `sunAnchored` sibling of `moonAnchored`, with the same axis-lock fields (`continuousAnchorLonDeg`, `anchorLatDeg`, `longitudeLocked`, `latitudeLocked`). Shared transform helpers; not a generic entity-frame type. Sun longitude-lock: `sceneSunLon ≈ 0`, `sceneSunLat = canonicalSunLat`. Sun position-lock: origin `(0°, 0°)`. Continuous solar longitude from `subsolarPoint` at the canonical UTC instant, same nearest-equivalent + 360° rebase policy as the Moon. Rasters reuse Moon dest-shift (X; X+Y for position-lock). Illumination stays canonical physical samples with a shared dest. Camera independent. Runtime Scene frame control has five choices. ADR 0029.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` (http://localhost:1420, `strictPort: true`) plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before navigation); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- `npm test`: 276 files / 2750 passed / 0 failed (LIB-084 baseline was 2712; +38 tests)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-BnY_0Jdt.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before navigation; after load `overflow: hidden`, canvas CSS 100%, `resize`). Canvas bitmap 1919×1079. Synthetic WheelEvents drove zoom; synthetic pointer drag used for pan.

- `baseline` Earth-fixed: Scene frame default `earthFixed`; five options present; Reset disabled; centre land-ish `[107,125,92]`. Reload after other frames returned Earth-fixed.
- `baseline` Moon longitude-lock regression: centre ocean `[31,98,141]`; Moon pale at y=702; Reset disabled.
- `baseline` Moon position-lock regression: origin rings present; bottom mean 26 (`#1a1a1a`); Reset disabled.
- `baseline` Sun longitude-lock static: Sun disc centroid x=960.3 (Δx +0.8 from 959.5); y=452 (June subsolar latitude north of scene centre); Reset disabled.
- Sun longitude-lock animated (3600× ~2.5 s): hash changed; centre `[110,129,100]` → `[33,141,171]`; after pause Sun disc x=959.5 (Δx +0.5); y=445; Reset still disabled.
- `baseline` Sun position-lock static: Sun `[251,209,75]` at (959, 574) scene-strip origin; top y=80 `#1a1a1a` (blank beyond translated north); Reset disabled.
- Seasonal: `terminator` (2026-03-20 equinox) Sun at (959.5, 576), topMean 64 / bottomMean 193; `night` (2026-12-21 solstice) Sun at (959.5, 576), topMean 74 / bottomMean 26. Sun origin fixed; Earth vertical placement differs; camera identity.
- Camera: wheel zoom enabled Reset; switching Earth/Sun/Moon configurations disabled Reset (camera reset). Horizontal pan enabled Reset; Reset view restored identity and kept `sunLongitudeLocked`.
- `lunar-track` Sun frames: columns populated; cool track ~165k; position-lock origin is Sun not Moon.
- `solar-eclipse-total`: redHits 35 (longitude-lock) / 41 (position-lock); Sun on centre meridian.
- `solar-eclipse-dateline`: left/right columns populated under both Sun modes; redHits 36–38.
- `clouds`: bright 35219 / 35131 / 27787 (Earth / Sun lon / Sun pos).
- `iss-presentation`: cyan 95662 / 97275 / 95966.
- `earthquake-presentation`: warm 213 / 241 / 181 (Earth / Sun pos / zoomed); Reset enabled after zoom.
- Resize 1280×720 while Sun position-lock + zoomed: inner 1280×720, canvas 1279×719, frame still `sunPositionLocked`, Reset still enabled, markers present.

**Not verified**

- Pinch zoom (out of scope). Physical multi-touch on a real device.
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`); inspection used the Cursor pane plus canvas pixel sampling.
- Interactive earthquake *hover* label on canvas from synthetic pointermove (untrusted events; hover inverse is covered by `earthquakeMarkerHover` tests).
- Dedicated `lunar-locus` visual pass (shared helpers + lunar-track visual + lunar-track tests under Sun frames).
- Pixel-identical Earth-fixed vs a stored LIB-084 screenshot (qualitative; Earth-fixed and Moon mapping still exact in tests).

**Discovered, not done**

- Camera vertical extent and raster Y used Moon-only predicates; LIB-085 added `isLatitudeLockedSceneReferenceFrame` / `isAnchoredSceneReferenceFrame` without collapsing kinds.
- Runtime policy still lives in `moonLongitudeLockedAnchor.ts` (now Moon+Sun). Rename is a later generalization slice.
- Lunar/eclipse renderers already consumed the shared frame helpers; no leftover Moon-relative shortcut required a product fix.
- Chrome structural meridians remain a full-world Earth-fixed ruler.
- Generalized entity-frame (`anchorKind = Moon | Sun`, extra entities, picker) is documented in [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) and roadmap phase D. Not created or activated.
