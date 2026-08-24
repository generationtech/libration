# LIB-093 — Galactic Center and Galactic Anticenter Tracking Targets

| Field | Value |
|-------|-------|
| ID | LIB-093 |
| Status | completed |
| Created | 2026-08-24 |
| Approved | 2026-08-24 (human; this request) |
| Completed | 2026-08-24 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md) through [LIB-092](LIB-092-city-and-planet-tracking-targets.md). Human-authorized. This request explicitly authorizes approval and activation of **Galactic Center and Galactic Anticenter as additional trackable point targets** on the proven tracking architecture. Do not invent a synthetic `"milkyWay"` target. Do not implement earthquake tracking. Do not introduce new tracking mathematics, camera behaviour, reference-frame kinds, or a second galactic-coordinate path unless implementation evidence proves a real gap. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md)–[ADR 0036](../decisions/0036-city-and-planet-tracking-reuses-structured-target-identity.md).

## Objective

Make the existing mapped Galactic Center and Galactic Anticenter independently trackable through the existing pipeline: stable identity → canonical mapped lon/lat from the Milky Way payload → `setTrackingTarget` → Longitude or Position → anchored `SceneReferenceFrame` → `SceneCamera` → position-lock auto-cover. Both the Tracking target control and direct click/tap on the rendered point markers must work.

## Scope

**In scope**

- Extend `TrackableMapObjectId` with structured identities for the two existing Milky Way tagged points.
- Semantic equality, deterministic hit-test tie key, and native-select encoding/decoding.
- Resolve lon/lat from the same Milky Way geometry payload used to paint the glyphs.
- Availability: omit when the tagged point is not currently rendered (planet pattern). Active tracking of an unavailable point falls back to Earth-fixed, keeps remembered mode, and resets camera policy.
- Add both targets to the Celestial native Target group. No synthetic parent “Milky Way” option.
- Semantic point-hit targets for visible Galactic Center / Anticenter glyphs, including wrap copies. The galactic-plane band is not a hit target.
- Focused tests, full suite, build, and visual verification.

**Out of scope**

- Synthetic `"milkyWay"` tracking target; band / nearest-band-point / path picking.
- Earthquake tracking.
- New galactic astronomy, a second coordinate transform, or Milky-Way-specific frame/camera/cover math.
- Searchable dropdown, persistence, URL state, heading lock, map rotation, camera-follow, new lock modes.

## Architectural boundaries

- Galactic Center and Anticenter are integrations: identity + existing authoritative mapped lon/lat + target resolution + Target option + semantic hit target.
- After canonical lon/lat is resolved, the transform stack must not care whether the target is Moon, Sun, ISS, city, planet, or a galactic point.
- Renderers continue to consume `SceneReferenceFrame`. Hit collection may know the semantic identities; coordinate transformation remains generic.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; ADRs 0026–0036.

## Audit (pre-implementation)

Confirmed in source:

1. Identities live on `MilkyWayGeometry` as `galacticCenter` / `galacticAnticenter` (`src/core/milkyWayGeometry.ts`). Center is Galactic `(l,b) = (0,0)`; anticenter is `(180,0)`.
2. Mapped lon/lat are the existing zenith subpoints: `lat = EQD dec`, `lon = wrap180(EQD RA − GAST)`, same `tagPoint` path as the ribbon.
3. Geometry is sampled at `TimeContext.now` in `createMilkyWayLayer` — the same canonical scene instant as rendering.
4. Point markers are painted in `buildMilkyWayRenderPlan` via generic `sceneXFromLongitudeDeg` / `sceneYFromLatitudeDeg`.
5. Center is factory-on; anticenter is factory-off (`galacticCenterEnabled` / `galacticAnticenterEnabled`). Either is omitted when the flag is off, geometry is null, the layer is hidden, or the UTC is outside 1600–2500.
6. Band, ribs, and tagged points share one `MilkyWayPayload`.
7. Positions already use generic scene-frame mapping.

## Availability policy

Planet-style omit: a galactic point is listed and trackable only when that tagged point has a finite current mapped position **and** is rendered (layer visible, payload supported, presentation flag on, geometry present). Missing/disabled points are not listed disabled. If the selected galactic point becomes unavailable, fall back to Earth-fixed, keep remembered mode, and reinitialize camera.

## Acceptance criteria

- Galactic Center and Galactic Anticenter are independently trackable from the Target control and by clicking the rendered point marker when available.
- No Target option labeled simply `Milky Way`. The galactic-plane band is not trackable.
- Longitude-lock: `sceneLon ≈ 0`, `sceneLat` = canonical mapped latitude.
- Position-lock: `sceneLon ≈ 0`, `sceneLat ≈ 0`; generic auto-cover from mapped latitude.
- Mode is retained across galactic / Moon / Sun / ISS / city / planet switches. Same-target click is a no-op.
- Clicking the band away from the tagged points does not change tracking.
- Earthquakes remain hover-only. Existing target classes are undisturbed.
- No new reference-frame or camera special case.

## Verification plan

- Focused tests: identity; equality; UI key round-trip; catalog/grouping; resolution vs payload; availability omit/fallback; longitude and position lock; continuity; generic auto-cover equivalence; hit targets under Earth-fixed/anchored/zoom/pan/wrap; wrap-copy identity; click selection; same-target no-op; band non-selection; overlap/tie; earthquake exclusion; Moon/Sun/ISS/city/planet regressions.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — tracking is on the live scene path
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- ADR for Milky Way point tracking semantics
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule / [`AGENTS.md`](../../AGENTS.md)
- This work item

## Completion record

**Implementation summary**

Galactic Center and Galactic Anticenter are production tracking targets on the existing identity → resolution → `setTrackingTarget` → anchored frame → camera/cover → LIB-091 hit stack. Identities are structured `{ kind: "milkyWayPoint", id: "galacticCenter" | "galacticAnticenter" }`. There is no synthetic `"milkyWay"` target. Equality is `trackableMapObjectIdEquals`. Native-select values `milkyway:galacticCenter` / `milkyway:galacticAnticenter` are UI encoding only. Positions come from `geometry.galacticCenter` / `geometry.galacticAnticenter` in the same Milky Way payload used to paint (dynamic Earth-relative zenith subpoints at `TimeContext.now`). Availability is planet-style omit: listed only when that tagged glyph is currently rendered. Factory Center on, Anticenter off. Missing/disabled points fall back to Earth-fixed, keep remembered mode, reinitialize camera. Celestial grouping is Moon, Sun, eligible planets, then Galactic Center and Anticenter. Click-to-track reuses LIB-091 scene-space hits and the painted glyph radius; the galactic-plane band is not a hit target. Generic longitude/position lock, continuity, wrap, camera, and auto-cover are unchanged. Earthquakes remain hover-only. ADR 0037.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` at `http://127.0.0.1:1420/` plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before load); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- `npm test`: 285 files / 2871 passed / 0 failed (LIB-092 baseline was 284 / 2853; +1 file / +18 tests, all in `src/core/milkyWayPointTracking.test.ts`)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-oBGPhiwN.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before load). Compositor screenshots are not geography evidence; DOM/CDP control state is.

- `milky-way` Target: Earth-fixed; Celestial Moon, Sun, Galactic Center; Spacecraft ISS disabled; no generic Milky Way option. Anticenter omitted until the glyph is enabled. Mode Position disabled under Earth-fixed.
- Select Galactic Center → Target Galactic Center, Mode Position enabled, Reset disabled (auto-cover). Mode Longitude: Target stays Galactic Center, Reset disabled (identity).
- Enable Show Galactic anticenter → Galactic Anticenter appears in Celestial after planets. Enable City pins and Jupiter: grouping Moon, Sun, Jupiter, Galactic Center, Galactic Anticenter; Cities nine reference cities; ISS remains listed disabled (no TLE at this demo instant).
- Position retention: Moon → Galactic Center → Jupiter → Knoxville → Galactic Anticenter → Sun, Mode Position throughout, Reset disabled. Longitude: Sun → Galactic Center → Galactic Anticenter, Mode Longitude throughout. ISS skipped: disabled on this fixture.
- 60× Demo resume while tracking Galactic Center Longitude: Target stayed Galactic Center, Reset disabled.
- Existing overlays enabled in-session (base map, solar shading, Clouds, earthquakes, ISS layer, planets, Milky Way band, city pins, Moon/Sun, lunar ground track). Live-only Clouds/earthquakes/ISS remain hidden at this demo instant.
- `earthquake-presentation`: no quake or Milky Way options; ISS disabled; canvas click on geography stayed Earth-fixed.
- `iss-presentation`: ISS enabled; no Galactic Center (Milky Way layer off — omit policy).
- 1280×720 `milky-way`: Galactic Center in Celestial; no generic Milky Way; Target/Mode/Reset/Config do not overlap or clip.

**Not verified**

- Trusted scene-strip wheel zoom (environment-limited, same as LIB-091/092).
- Precise Galactic Center/Anticenter canvas click: screenshot-space mapping vs 1920 CSS plus small glyph hit radius made point clicks unreliable in this browser. A 3120-point synthetic `PointerEvent` scan also did not select (untrusted events). Dropdown galactic tracking and automated hit/click tests cover the seam.
- Wrapped-copy galactic click; pan-vs-click; antimeridian visual; manual wheel override then Reset. Covered by tests; dropdown Position/Longitude and Demo retention were verified.
- ISS in the milky-way cross-category sequence (disabled without a valid ISS position). Confirmed enabled on `iss-presentation`.
- Full-canvas 1920×1080 PNG export.

**Discovered, not done**

- Anticenter is factory-off; it is a legitimate target only after the existing presentation flag is on. Do not invent a default-on policy here.
- The galactic-plane band remains an extended feature, not a tracking target.
- Earthquakes remain hover-only.
- A generic target picker remains unscoped.
