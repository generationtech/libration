# LIB-091 — Direct Click-to-Track for Map Objects

| Field | Value |
|-------|-------|
| ID | LIB-091 |
| Status | complete |
| Created | 2026-08-24 |
| Approved | 2026-08-24 (human; this request) |
| Completed | 2026-08-24 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md) through [LIB-090](LIB-090-tracking-target-and-mode-ux-foundation.md). Human-authorized. This request explicitly authorizes approval and activation of **direct selection of already-trackable rendered objects** (Moon, Sun, ISS). Do not add cities, planets, Milky Way, or earthquakes. Do not add a generic object search/picker. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md)–[ADR 0034](../decisions/0034-tracking-ui-is-orthogonal-target-and-mode.md).

## Objective

Allow the user to click or tap a rendered trackable object on the map and make that object the current Tracking target, reusing the LIB-090 `setTrackingTarget` seam. Click-to-track changes target only; remembered Tracking mode is retained.

## Scope

**In scope**

- Direct selection of rendered Moon, Sun, and ISS glyphs.
- Scene-space hit testing against actually rendered glyph copies, including wrapped copies.
- Modest accessible hit radius from existing marker size constants.
- Deterministic nearest-center overlap policy.
- Reuse of the LIB-081 pan-drag threshold for click vs pan.
- Pointer cursor affordance on trackable glyphs; pan cursor still wins while dragging.
- ISS availability remains `setTrackingTarget` + existing authority.
- Focused tests, full suite, build, and visual verification.

**Out of scope**

- City, planet, Milky Way, or earthquake tracking.
- Generic picker, search, popovers, hover-to-track, double-click, multi-select.
- Persistence, URL tracking state.
- Heading lock, map rotation, camera-follow, new lock modes.
- New astronomy, ISS propagation, or generic GIS picking infrastructure.

## Architectural boundaries

- Click resolves `TrackableMapObjectId` (`moon` | `sun` | `iss`) and calls `setTrackingTarget`.
- Do not construct `SceneReferenceFrame` or mutate camera in the click path.
- Do not synthesize Target `<select>` DOM events.
- Canvas backend must not own tracking-selection state.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; ADRs 0026–0034.

## Acceptance criteria

- Clicking a rendered Moon, Sun, or ISS glyph sets that Tracking target; remembered mode is unchanged.
- Same-target click is a no-op (no camera reset).
- Empty geography does not change tracking and does not imply Earth-fixed.
- A pan that exceeds the existing drag threshold does not select on pointer-up.
- Wrapped visible copies resolve to the same physical target id.
- Hit-target centers agree with rendered glyph centers under Earth-fixed, longitude-lock, position-lock, zoom, pan, and wrap.
- Overlapping hit areas: nearest center wins; ties use a stable secondary order.
- Unavailable ISS is refused by `setTrackingTarget`.
- Earthquakes remain hover-only and non-trackable.
- Target/Mode/Reset chrome remain authoritative and independent of click-through.
- Position-lock auto-cover and longitude-lock identity camera follow the same policy as the Target control.

## Verification plan

- Focused tests: identity; scene coordinates; wrap copies; hit radius; nearest/tie; click target change; cross-target; same-target; position cover; longitude identity; ISS unavailable; pan vs click; empty geography; earthquake non-selection; camera/frame policy; dropdown still works.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — click-to-track is on the live scene path
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- ADR if semantic hit-target architecture warrants one
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule / [`AGENTS.md`](../../AGENTS.md)
- This work item

## Completion record

**Implementation summary**

Click/tap on a rendered Moon, Sun, or ISS glyph copy sets Tracking target through the existing `setTrackingTarget` seam. Remembered mode is unchanged. Hit testing is scene/CSS-space against the same glyph copies used to paint, including wrapped copies sharing one `TrackableMapObjectId`. Hit radius is `max(painted + 3px, 8px)`. Nearest center wins; ties use `moon`, `sun`, `iss` order. Pan vs click reuses the 4px drag threshold. Same-target click is a no-op. Empty geography does not clear tracking. Earthquakes remain hover-only. Canvas does not own selection state. ADR 0035.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` at `http://localhost:1420/` plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before load); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- `npm test`: 283 files / 2833 passed / 0 failed (LIB-090 baseline was 281 / 2815; +2 files / +18 tests in `trackableMapObjectHit.test.ts` and `trackableMapObjectHitTargets.test.ts`)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-BBdSE1i3.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before load; after load `overflow: hidden`, canvas CSS 100%, `resize`). Compositor screenshots are not used as geography evidence; DOM/CDP control state is.

- `baseline` Earth-fixed, remembered Position: click Sun → Target Sun, Mode Position, Reset disabled (auto-cover). Click Moon from Earth-fixed → Moon Position. Empty geography and a click where ISS is not painted leave the current target. ISS option disabled. Dropdown Earth-fixed restore works. Same-target click: no Reset enable. Pan starting on Sun: target unchanged, Reset enabled; Reset view restores camera, Target stays Sun. Mode Longitude then click Moon: Moon Longitude, Reset disabled (identity). Cursor: `pointer` on a trackable glyph origin, `grab` on empty scene.
- `iss-presentation`: ISS enabled. Earth-fixed click ISS → ISS Position, Reset disabled (cover). Remembered Longitude, Earth-fixed, click ISS → ISS Longitude. Sequential Moon → Sun → ISS under Longitude (relative scene positions) retains Longitude. Sequential Moon → Sun under Position. Wrap pan then click leftmost copy → Moon. Synthetic wheel then click a visible glyph → Moon. Dropdown Target/Mode remain authoritative.
- `earthquake-presentation`: ISS disabled. Click Taiwan quake: stays Earth-fixed. Click Sun: Sun Position. Click quake again: stays Sun.
- 1280×720 `iss-presentation`: Target/Mode/Reset do not overlap. ISS click-to-track and dropdown Target/Mode still work.

**Not verified**

- Trusted scene-strip wheel zoom in Cursor Browser is environment-limited; a synthetic `WheelEvent` did change camera in this item (Reset enabled) and a following glyph click selected Moon, but that is not a substitute for a trusted wheel gesture.
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`).
- Interactive earthquake hover labels (canvas-only; untrusted pointermove). Click non-selection was verified.
- Pixel-identical comparison against a stored screenshot.
- Position-lock auto-cover can zoom enough that ISS leaves the viewport after Moon/Sun lock; ISS is then not clickable until visible again (by design: only painted copies hit-test). Earth-fixed identity ISS click and Longitude sequential ISS click were verified.

**Discovered, not done**

- City pins already have stable `{ id, latDeg, lonDeg }` and wrap-aware point glyphs; they are not a `TrackableMapObjectId` and were not added to the hit list.
- Planets already have `PlanetaryBodyId` plus current subpoint lon/lat and wrap-aware glyphs; same seam could collect them later without new astronomy.
- Milky Way is a galactic-plane band plus GC/anticenter point glyphs, not one canonical tracking point.
- Earthquakes remain excluded.
- ISS current-glyph X uses the unwrap + identity-X path; hit collection must stay on that path (already done).
