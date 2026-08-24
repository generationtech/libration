# LIB-089 — ISS Tracking Target

| Field | Value |
|-------|-------|
| ID | LIB-089 |
| Status | complete |
| Created | 2026-08-24 |
| Approved | 2026-08-24 (human; this request) |
| Completed | 2026-08-24 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md) through [LIB-088](LIB-088-trackable-map-object-foundation.md). Human-authorized. This request explicitly authorizes approval and activation of **ISS as the first new dynamic tracking target** on the LIB-088 trackable-map-object architecture. Do not redesign the tracking UI. Do not add cities, planets, Milky Way, earthquakes, or generic click-to-track. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md)–[ADR 0032](../decisions/0032-anchored-frames-target-a-trackable-map-object.md).

## Objective

Make the existing ISS map object trackable in both established lock modes (longitude-lock and position-lock) as another `TrackableMapObjectId`, using the existing authoritative ISS geographic position already rendered by Libration. Prove that the architecture generalizes without another transform, camera, raster, wrap, or auto-cover architecture change.

## Scope

**In scope**

- Add `"iss"` to the closed production `TrackableMapObjectId` union.
- Resolve ISS from the existing authoritative canonical geographic position at the same canonical frame instant used for rendering.
- Expose a transitional seven-choice Scene frame selector (Earth-fixed + Moon/Sun/ISS × two lock modes).
- ISS availability policy when no valid authoritative position exists.
- Reuse existing longitude continuity, position-lock auto-cover, manual override/Reset, inverse mapping, and world copies.
- Focused tests, full suite, build, and visual verification.

**Out of scope**

- City, planet, Milky Way, or earthquake tracking.
- Generic target picker, click-to-track, hover-to-track, target search.
- Tracking/camera persistence, URL state.
- Heading-up, velocity/heading lock, map rotation, orbital chase, 3D globe, tiles.
- New orbital propagation or TLE service.
- Unrelated ISS or UI redesign.

## Architectural boundaries

- ISS is a target identity, not a new reference-frame kind.
- Object-specific knowledge stays in target resolution; frame math must not branch on `"iss"`.
- The ISS anchor and the rendered ISS glyph must share the same physical state at the same canonical instant.
- Do not fabricate coordinates. Do not silently reuse an arbitrarily stale coordinate.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; ADRs 0026–0032.

## Acceptance criteria

- `"iss"` is a stable third `TrackableMapObjectId`.
- Valid authoritative ISS state resolves to its canonical lon/lat; missing/invalid state cannot construct an ISS-anchored frame.
- Moon and Sun resolution remain unchanged.
- Seven UI choices map to Earth-fixed or `target + lockMode`.
- ISS longitude-lock: ISS scene longitude ≈ 0, scene latitude = canonical ISS latitude.
- ISS position-lock: ISS scene longitude ≈ 0, scene latitude ≈ 0; LIB-087 auto-cover applies from actual ISS latitude.
- Same-state invariant: tracking anchor and rendered ISS position map to the same expected frame point.
- Antimeridian continuity uses the existing generic helper; no ISS-specific wrap logic.
- Manual override, Reset, pan, frame-switch, and camera independence preserve LIB-087/088 policy.
- Earthquakes remain rendered and not trackable.

## Verification plan

- Focused tests: identity; resolution/availability; Moon/Sun unchanged; UI mapping; ISS longitude/position lock; same-state; antimeridian and multi-orbit continuity; auto-cover equator/mid/extreme; manual override/Reset/frame switch; camera independence; raster/vector registration; ISS track; inverse hover.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — ISS tracking is on the live scene path
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- ADR if availability or target-session semantics warrant one
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule / [`AGENTS.md`](../../AGENTS.md)
- This work item

## Completion record

**Implementation summary**

Added `"iss"` as the third production `TrackableMapObjectId`. Resolution consumes the existing ISS overlay authority (`resolveAuthoritativeIssCanonicalPosition` → `issTrackShouldPaint` + `resolveIssCurrentSample` at product UTC). No second SGP4 path. App gathers that position before constructing the frame so the anchor and glyph share one canonical instant. Seven transitional Scene frame choices. ISS options listed but `disabled` when no valid position exists; active ISS tracking falls back to Earth-fixed. Continuity is tracking-session-local (kind switch nulls `anchorContinuousLonRef`). Frame math, longitude continuity, auto-cover, Reset, pan, and inverse mapping are unchanged. ADR 0033.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` at `http://localhost:1420/` plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before load); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- `npm test`: 280 files / 2804 passed / 0 failed (LIB-088 baseline was 278 / 2778; +2 files / +26 tests, including 15 in `issTrackingTarget.test.ts` and 5 in `issAuthoritativePosition.test.ts`)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-DV0J5AQ6.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before load; after load `overflow: hidden`, canvas CSS 100%, `resize`). Canvas bitmap 1919×1079. Compositor screenshots are not used as geography evidence; canvas pixel sampling is.

- `iss-presentation` Scene frame `<select>` has seven options; ISS enabled. Earth-fixed Reset disabled.
- ISS longitude-lock (paused start `2026-08-06T01:17:00.000Z`): select `issLongitudeLocked`; ISS cyan on centre meridian x=959, y≈585–589 (scene strip, not full-canvas centre); `topBlack` 0; Reset disabled.
- ISS position-lock at start (ISS near equator): `issPositionLocked`; brightest glyph (959, 576); `topBlack` 0; Reset disabled. Auto-cover ≈1× (full-world geography).
- Pan: trusted click moved ISS centroid to (1338, 846); frame stayed `issPositionLocked`; Reset enabled. Reset restored glyph (959, 576) and disabled Reset.
- Frame switches: Earth-fixed → ISS longitude → ISS position → Moon position → Sun longitude → ISS position → Earth-fixed. Each left Reset disabled (camera-policy reinit). Kind switch clears continuity.
- Accelerated Demo 60× while ISS position-lock: ISS originPx remained cyan ~[180,240,255] at scene origin; Earth column hashes changed (1045551735 → 1488320427 → 1398969560); `topBlack` 0 throughout; cyan track occupied left/centre/right thirds (461 / 627 / 734) — no 360° jump line. After ~30 s wall the map was regional East Asia (high ISS latitude cover), not the start full-world view.
- ISS longitude-lock during the same Demo: meridian centroid x≈959; y moved 757 → 428 over 4 s; originPx not ISS cyan; Earth hashes changed; Reset disabled.
- Resize ISS position-lock auto-cover at 1280×720 (canvas 1279×719): ISS on meridian centroid (639, 388) in the scene strip; `topBlack` 0; Reset disabled.
- `baseline`: ISS longitude-lock and position-lock `option.disabled === true`; Moon/Sun enabled; default Earth-fixed.
- `earthquake-presentation`: ISS options disabled; earthquakes remain a rendered non-target.
- `clouds`: ISS options disabled; Earth-fixed bright-sample 125627; Moon position-lock 115045, `topBlack` 0, Reset disabled.

**Not verified**

- Trusted scene-strip wheel zoom in Cursor Browser (synthetic `WheelEvent` is untrusted and ignored; `browser_scroll` scrolls the page, which is `overflow: hidden`). Manual zoom override remains covered by tests; pan+Reset is the visual analog.
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`).
- Interactive earthquake hover labels (untrusted pointermove).
- Combined ISS tracking + live Clouds/earthquakes/city pins on `iss-presentation` (those layers are live-only suppressed at the scenario instant; ISS off on `clouds` / `earthquake-presentation`).
- Pixel-identical comparison against a stored screenshot.
- Dedicated Profiler/world-copy instrumentation under 60× ISS motion.

**Discovered, not done**

- The seven-choice Scene frame selector is transitional. Split into Tracking target + Tracking mode, and later click-to-track, remain unscoped (roadmap D2 / FUTURE_FEATURES).
- No ISS-specific transform, wrap, or cover was required. Generic continuity handled ISS antimeridian samples in tests (`178…−178` → `178…182`).
- Fast ISS latitude did not produce cover jitter severe enough to warrant animation infrastructure.
- Untrusted wheel/pointer in Cursor Browser remains an environment limitation (same as prior camera items).
