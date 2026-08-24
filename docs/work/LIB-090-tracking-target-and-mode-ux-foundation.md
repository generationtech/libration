# LIB-090 — Tracking Target and Mode UX Foundation

| Field | Value |
|-------|-------|
| ID | LIB-090 |
| Status | complete |
| Created | 2026-08-24 |
| Approved | 2026-08-24 (human; this request) |
| Completed | 2026-08-24 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md) through [LIB-089](LIB-089-iss-tracking-target.md). Human-authorized. This request explicitly authorizes approval and activation of a **product/interaction model refactor** over the already-proven tracking architecture. Do not add new trackable object classes. Do not add city, planet, Milky Way, or earthquake tracking. Do not implement click-to-track. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md)–[ADR 0033](../decisions/0033-iss-tracking-reuses-anchored-frame-target-architecture.md).

## Objective

Replace the transitional seven-choice Scene frame selector with two orthogonal user-facing concepts — **Tracking target** and **Tracking mode** — while preserving all current tracking behavior. Establish a canonical `setTrackingTarget` seam so a later rendered-object click can set the same tracking target without a parallel interaction system.

## Scope

**In scope**

- Runtime tracking-selection model: target identity + lock mode (Earth-fixed = no target).
- Compact chrome: Tracking target and Tracking mode controls.
- Map target + mode → existing target resolution → `SceneReferenceFrame`.
- Mode retention across valid trackable-target switches (runtime only; not persisted).
- ISS availability policy preserved; UI stays coherent with the production frame.
- Canonical `setTrackingTarget` operation for later direct object selection.
- Focused tests, full suite, build, and visual verification.

**Out of scope**

- New target identities; city, planet, Milky Way, or earthquake tracking.
- Click-to-track, hover-to-track, generic picker, target search.
- Persistence, URL tracking state.
- Heading lock, map rotation, camera-follow, new lock modes.
- New astronomy or ISS propagation.
- Unrelated chrome redesign.

## Architectural boundaries

- Production `SceneReferenceFrame` remains `earthFixed` vs `anchored { target, lockMode, continuousAnchorLonDeg, anchorLatDeg }`.
- Earth is not a `TrackableMapObjectId`.
- Renderer and plan builders continue to receive the production frame, not DOM select values.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; ADRs 0026–0033.

## Acceptance criteria

- User-facing selection is Tracking target + Tracking mode, not seven combined frame kinds.
- Earth-fixed / no target, and Moon/Sun/ISS × longitude/position, all remain available with identical frame mathematics.
- Mode is retained when switching among valid trackable targets; Earth-fixed does not erase remembered mode.
- ISS listed but disabled when unavailable; active ISS tracking falls back to Earth-fixed.
- Changing target or mode reinitializes camera policy; Reset does not change target/mode.
- Position-lock auto-cover and longitude-lock identity camera are unchanged.
- Continuity is session-local; target switch reinitializes; mode-only switch on the same target preserves continuous longitude.
- A future click can call `setTrackingTarget(id)` without constructing frames or synthesizing DOM events.
- Earthquakes remain excluded. Cities/planets/Milky Way are not added.

## Verification plan

- Focused tests: selection model; target/mode mapping; orthogonality; mode retention; Earth-fixed; ISS unavailable; camera reset; auto-cover; Reset; continuity.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — tracking UX is on the live scene path
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- ADR if orthogonal UI state warrants one
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule / [`AGENTS.md`](../../AGENTS.md)
- This work item

## Completion record

**Implementation summary**

Replaced the seven-choice Scene frame selector with orthogonal **Target** / **Mode** chrome. Runtime state is `TrackingSelectionState` (`target: null | TrackableMapObjectId`, `rememberedMode`). Earth-fixed is no target. Default remembered mode is `position`. Mode is retained across Moon/Sun/ISS switches and while Earth-fixed; it is not persisted. Canonical `setTrackingTarget` refuses unavailable targets and does not change mode. `applyTrackingTargetAvailability` falls ISS-unavailable back to Earth-fixed while keeping remembered mode. Frame construction is `sceneReferenceFrameFromTrackingSelection` → existing Earth-fixed / `anchoredSceneReferenceFrame`. Combined UI kinds remain compatibility aliases. Target change reinitializes continuity and camera; same-target mode-only change preserves continuous longitude and still reinitializes camera. Production frame, cover, ISS authority, and Reset-camera semantics are unchanged. ADR 0034.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` at `http://localhost:1420/` plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before load); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- `npm test`: 281 files / 2815 passed / 0 failed (LIB-089 baseline was 280 / 2804; +1 file / +11 tests: 10 in `trackingSelection.test.ts` plus one combined-kind mapping case in `sceneFrameAnchor.test.ts`)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-DIw7MObM.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before load; after load `overflow: hidden`, canvas CSS 100%, `resize`). Canvas bitmap 1919×1079 on a fresh baseline load. Compositor screenshots are not used as geography evidence; DOM/CDP control state and bounding boxes are.

- `baseline` initial: Target = Earth-fixed; Mode = Position **disabled**; ISS option **disabled**; Reset disabled. Labels `Target` / `Mode` (`aria-label` Tracking target / Tracking mode). Chrome boxes (no overlap/clip): Target group 1473–1606, Mode 1613–1737, Reset 1750–1828, Config 1840–1894, all near y=1041–1068.
- Reload after Moon + Position returns to Earth-fixed, Mode Position disabled, ISS disabled.
- Moon: selecting Moon enables Mode (default Position). Longitude / Position switches work; Reset stays disabled (camera reinit). Moon Position → Sun = Sun Position. Earth-fixed: mode disabled, remembered Position; return to Moon = Moon Position. Setting ISS while disabled stays on current target.
- `iss-presentation`: ISS **enabled**; default Earth-fixed / mode disabled. ISS + Position and ISS + Longitude both work. ISS Position → Moon = Moon Position. Longitude → Sun = Sun Longitude → ISS = ISS Longitude. Reset disabled after each effective change.
- `clouds` and `earthquake-presentation`: ISS option disabled; Target Earth-fixed; Mode Position disabled. Earthquakes remain a rendered non-target.
- 1280×720 (`iss-presentation`, ISS Position): Target 848–981, Mode 987–1111, Reset 1125–1202, Config 1214–1268. No overlap or clipping. Inner 1280×720.
- Representative overlays present under the new chrome: base map, illumination, Clouds (`clouds`), ISS track (`iss-presentation`), Moon, Sun, eclipse geometry. Lunar-track registration was not re-pixel-sampled in this item; LIB-089 registration tests remain.

**Not verified**

- Trusted scene-strip wheel zoom in Cursor Browser (synthetic `WheelEvent` is untrusted and ignored; `browser_scroll` scrolls the page, which is `overflow: hidden`). Manual zoom override remains covered by tests; pan+Reset is the visual analog and was not re-driven with a trusted pointer drag in this item.
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`).
- Interactive earthquake hover labels (untrusted pointermove).
- Pixel-identical comparison against a stored screenshot.
- Combined ISS tracking + live Clouds/earthquakes/city pins on `iss-presentation` (those layers are live-only suppressed at the scenario instant; ISS off on `clouds` / `earthquake-presentation`).
- Accelerated Demo ISS lock under the new chrome (LIB-089 Demo evidence still applies; frame math unchanged).

**Discovered, not done**

- Combined UI kinds remain as compatibility aliases (`sceneReferenceFrameFromUiKind`). Chrome no longer depends on them. Removing the aliases is leftover cleanup, not required for orthogonality.
- Click-to-track is architecturally ready (`setTrackingTarget`) and remains unscoped (roadmap D3 / FUTURE_FEATURES). No rendered-object hit-testing was added.
- City pins already have stable `{ id, latDeg, lonDeg }` and planets have `PlanetaryBodyId` + subpoint lon/lat; neither is a `TrackableMapObjectId`. Milky Way is a band, not a point. Earthquakes remain excluded.
- Untrusted wheel/pointer in Cursor Browser remains an environment limitation (same as prior camera items).
