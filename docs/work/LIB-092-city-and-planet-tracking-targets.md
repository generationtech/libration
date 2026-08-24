# LIB-092 — City and Planet Tracking Targets

| Field | Value |
|-------|-------|
| ID | LIB-092 |
| Status | complete |
| Created | 2026-08-24 |
| Approved | 2026-08-24 (human; this request) |
| Completed | 2026-08-24 |

Depends on [LIB-080](LIB-080-scene-camera-zoom.md) through [LIB-091](LIB-091-direct-click-to-track-for-map-objects.md). Human-authorized. This request explicitly authorizes approval and activation of **city pins and eligible planets as additional trackable targets** on the proven tracking architecture. Do not implement Milky Way tracking. Do not implement earthquake tracking. Do not introduce new tracking mathematics, camera behaviour, reference-frame kinds, or a second selection architecture unless implementation evidence proves a real gap. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md)–[ADR 0035](../decisions/0035-click-to-track-uses-scene-space-semantic-hit-targets.md).

## Objective

Make every currently rendered eligible city pin and planet independently trackable through the existing pipeline: stable identity → canonical target resolution → `setTrackingTarget` → Longitude or Position → anchored `SceneReferenceFrame` → `SceneCamera` → position-lock auto-cover. Both the Tracking target control and direct click/tap on the rendered glyph must work, and both must use the same `setTrackingTarget` transition established by LIB-090/LIB-091.

## Scope

**In scope**

- Extend `TrackableMapObjectId` so individual cities and planets have stable identities, reusing canonical `CityPinEntry.id` and `PlanetaryBodyId`.
- One equality/helper seam if identity is structured.
- City resolution from existing pin coordinates (static). Planet resolution from the same current mapped/subpoint coordinates already used to paint the glyph (dynamic).
- Availability fallback to Earth-fixed with remembered mode retained and camera policy reset, matching ISS policy.
- Native grouped Target `<select>` (`<optgroup>`), existing display names, UI select-key encoding if needed.
- Semantic point-hit targets for visible city pins and planet glyphs, including wrap copies; deterministic nearest-center overlap with a category+identity tie key.
- Focused tests, full suite, build, and visual verification.

**Out of scope**

- Milky Way, Galactic Center/Anticenter, or earthquake tracking.
- City-specific or planet-specific frame math, camera policy, or auto-cover.
- Searchable dropdown, autocomplete, target modal, command palette, clustering/chooser UI.
- Persistence, URL tracking state, heading lock, map rotation, camera-follow, new lock modes.
- New city IDs, new planet IDs, or a second planetary-position calculation.

## Architectural boundaries

- Cities and planets are integrations: identity + existing authoritative coordinates + target resolution + Target option + semantic hit target.
- After canonical lon/lat is resolved, the transform stack must not care whether the target is Moon, Sun, ISS, city, or planet.
- Renderers continue to consume `SceneReferenceFrame`, not Target select values. Plan builders must not branch on city vs planet for frame math.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §6.6–6.7; ADRs 0026–0035.

## Acceptance criteria

- Every rendered eligible city pin and eligible planet is independently trackable from the Target control and by clicking the glyph.
- City longitude-lock: `sceneLon ≈ 0`, `sceneLat` = canonical city latitude; city is static so the Earth stays horizontally stationary while other objects move.
- City position-lock: city at scene origin; generic auto-cover from city latitude; no hard-coded city zoom.
- Planet longitude-lock: planet on the frame meridian, mapped latitude remains physical.
- Planet position-lock: planet at scene origin; Earth moves; generic auto-cover from planet latitude.
- Mode is retained across city/planet/Moon/Sun/ISS switches. Same-target click is a no-op.
- Unavailable/missing city or planet falls back to Earth-fixed, keeps remembered mode, resets camera policy.
- Earthquakes remain hover-only. Milky Way is not a target.
- No new reference-frame or camera special case.

## Verification plan

- Focused tests: identity; equality; UI key round-trip; city/planet resolution and availability; grouped options; city/planet longitude and position lock; static city time progression; planet continuity; auto-cover city/planet; target-category equivalence; city/planet hit targets and clicks; wrap copies; same-target no-op; overlap; earthquake exclusion; Moon/Sun/ISS regressions.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — tracking is on the live scene path
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md)
- ADR if the expanded identity model warrants one
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) / Cursor scene-system rule / [`AGENTS.md`](../../AGENTS.md)
- This work item

## Completion record

**Implementation summary**

City pins and eligible planetary current glyphs are production tracking targets on the existing identity → resolution → `setTrackingTarget` → anchored frame → camera/cover → LIB-091 hit stack. `TrackableMapObjectId` is hybrid: `"moon" | "sun" | "iss"` plus `{ kind: "city", id }` / `{ kind: "planet", id }` using `CityPinEntry.id` and `PlanetaryBodyId`. Equality is `trackableMapObjectIdEquals`. Native Target `<select>` uses Earth-fixed ungrouped plus Celestial / Spacecraft / Cities optgroups; option values are UI encoding (`city:` + `encodeURIComponent`, `planet:` + body id). Cities resolve from the painted pin lon/lat (static). Eligible planets are Mercury–Neptune plus Pluto when a current mapped glyph is painted; coordinates are that glyph’s current subpoint. Missing city/planet falls back to Earth-fixed, keeps remembered mode, reinitializes camera. Click-to-track reuses LIB-091 scene-space hits; wrap copies share one id; nearest centre wins; ties use category+identity. No new frame or camera math. Earthquakes remain hover-only. Milky Way is not a target. ADR 0036.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` at `http://127.0.0.1:1420/` plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before load); resize check at **1280×720**

**Actual results**

- `npx tsc --noEmit`: clean (process exit 0)
- `npm test`: 284 files / 2853 passed / 0 failed (LIB-091 baseline was 283 / 2833; +1 file / +20 tests, including 17 in `src/core/cityPlanetTracking.test.ts`)
- `npm run build`: succeeded (`tsc && vite build`; `dist/assets/index-Ba8vts8g.js`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080 (device metrics before load). Compositor screenshots are not geography evidence; DOM/CDP control state is.

- `baseline` Target groups: Earth-fixed; Celestial (Moon, Sun); Spacecraft (ISS disabled); Cities (London, New York, Knoxville, Tokyo, Sydney, São Paulo, Cairo, Mumbai, Los Angeles). No planets (layer off). Mode Position disabled under Earth-fixed. Select Knoxville → Target Knoxville, Mode Position enabled, Reset disabled (auto-cover). Mode Longitude: Target stays Knoxville. Knoxville → Moon retains Position. Earth-fixed restores Mode disabled with Position remembered. Target/Reset do not overlap.
- `planetary-objects`: Celestial includes Mercury–Neptune plus Pluto with display names; no Cities group. Select Jupiter → Jupiter Position, Reset disabled. Jupiter → Saturn retains Position. Saturn Longitude retained.
- `earthquake-presentation`: no city/planet/quake options; ISS disabled. Canvas click on earthquake geography stays Earth-fixed.
- 1280×720 `baseline`: same groups (9 cities); Target/Mode/Reset do not overlap or clip.

**Not verified**

- Trusted scene-strip wheel zoom (environment-limited, same as LIB-091).
- Precise city-pin canvas click: Cursor screenshot-space mapping vs 1920 CSS, plus 8px city hit radius vs larger Sun disc, made pin clicks unreliable in this browser. Dropdown city tracking and automated city hit/click tests cover the seam. One trusted canvas click selected Sun and retained Position (LIB-091 path still live).
- Planet glyph canvas click; wrap-copy city/planet click; pan-vs-click; Demo-time planet motion. Covered by tests; dropdown planet tracking was verified.
- Full-canvas 1920×1080 PNG export.

**Discovered, not done**

- Milky Way remains a galactic-plane band plus tagged Galactic Center/Anticenter points, not one canonical tracking point. Do not invent one.
- Earthquakes remain hover-only.
- Overlapping city pins have no chooser; nearest centre plus deterministic tie key is the policy.
- Planets without a painted current glyph are omitted from Target (not listed disabled). ISS remains listed disabled when unavailable.
