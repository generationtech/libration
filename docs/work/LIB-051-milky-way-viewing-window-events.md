# LIB-051 — Milky Way viewing window events

| Field | Value |
|-------|-------|
| ID | LIB-051 |
| Status | complete |
| Created | 2026-08-19 |
| Approved | 2026-08-19 (human; this request) |
| Completed | 2026-08-19 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Add a first-class, reference-city **Milky Way Viewing Window** event family: bounded UTC intervals when the Galactic center is favorably elevated from the configured city under explicit solar-darkness and existing physical-moonlight conditions. Not a galactic-plane alignment, not a hidden visibility score, and not an observing-quality forecast.

## Scope

**In scope**

- Headless evaluator: Galactic-center altitude ∩ solar altitude ∩ `localMoonlightContribution01`.
- One family `milkyWayViewingWindow` with partitioned levels Viewing / Strong / Prime (highest qualifying level; latitude-aware Prime).
- Bounded intervals (`startUtcMs`, `endUtcMs`, `peakUtcMs`, facts). Deterministic ids. Policy version `milky-way-viewing-v1`.
- Layers → Space objects → Milky Way → Viewing windows. Master default off. Independent of ribbon/contours.
- Concise Config status, next-window lookup, Go to next Prime (existing Demo clock).
- Knoxville, Atacama-latitude, high-latitude, moon, twilight, eclipse-attenuation, Demo-time, timezone tests.
- Focused tests, visual verification, docs; ADR if the product definition is durable.

**Out of scope**

- Clouds, weather, transparency, light pollution, Bortle, city-size heuristics.
- Hidden aggregate visibility score as authority.
- Whole-band (Cygnus/Cassiopeia) viewing windows.
- Milky Way Viewing Tour / generic EventTour; Eclipse Tour unchanged (ADR 0015).
- Map labels, contour restyle during events, second product clock.
- User-exposed threshold sliders.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one canonical UTC instant; no network in the render path.
- [ADR 0017](../decisions/0017-offline-iau-galactic-zenith-projection-authority.md) — Galactic center / zenith-subpoint authority. Events consume astronomy, not contour pixels.
- [ADR 0010](../decisions/0010-eclipse-events-global-circumstances-derived.md) — eclipses remain global; this family is local by design.
- [ADR 0015](../decisions/0015-domain-tour-sequencer-drives-shared-demo-time.md) — Go to next Prime commands Demo time; no second clock.
- Illumination remains [ADR 0002](../decisions/0002-single-upstream-planetary-illumination-rasterpatch.md). Cloud raster does not gate events.

## Design notes

Honest copy: a window marks times when the Galactic center is favorably elevated from the reference city under sufficiently dark solar conditions and acceptable modeled moonlight. It does not claim the Milky Way will definitely be visible.

Policy version `milky-way-viewing-v1` (not user-facing). Thresholds are documented in the ADR / implementation; v1 uses mixed absolute altitude floors plus `altitudeQuality = current / nightlyMaximum` so Knoxville (~25° culmination) can still have Prime near its local best.

## Acceptance criteria

- Viewing / Strong / Prime exist, are reference-city-specific, and use GC altitude, solar altitude, and existing local moonlight.
- No clouds, light pollution, or hidden score as authority. LIB-049 ribbon and LIB-050 contours unchanged.
- Thresholds work at Knoxville latitude; Prime is high-quality at ~23°S; GC-never-rises is honest.
- Intervals have start/end/peak; UTC internally; local display via existing timezone infrastructure.
- Multiple windows per night if conditions split; twilight and moon rise/set affect eligibility; lunar-eclipse transmission participates without a special case.
- Demo product time drives status; Go to next Prime uses the existing Demo start.
- Focused tests, `npx tsc --noEmit`, `npm test`, and `npm run build` pass.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: classification, intervals, Knoxville/Atacama/high-lat, moon, twilight, eclipse attenuation, Demo, timezone, performance, clouds do not gate
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — Config/DEV scenario; confirm scenario registry absent from production bundle
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- ADR: expected for the viewing-window product definition

## Completion record

**Implementation summary**

Reference-city **Milky Way Viewing Window** event family (`milkyWayViewingWindow`, policy `milky-way-viewing-v1`, [ADR 0018](../decisions/0018-milky-way-viewing-window-is-a-reference-city-event.md)). Headless `listMilkyWayViewingWindows` intersects Galactic-center altitude, solar altitude, and existing `localMoonlightContribution01` (including lunar-eclipse transmission, no special case). Viewing / Strong / Prime are partitioned by highest qualifying level. Latitude-aware Prime uses `altitudeQuality = GC altitude / nightly max` so Knoxville (~25° culmination) can still have Prime. Config: Layers → Space objects → Milky Way → Viewing windows; master default off; **Go to next Prime** writes existing Demo `startIsoUtc`. Config-panel product time now also updates on ≥ 1 s jumps so status follows Demo seeks. Ribbon, contours, planets, ISS, and eclipse HUD unchanged.

**Commands run**

- `npx tsc --noEmit` — clean
- `npm test` — 245 files / 2266 passed / 0 failed (viewing-window performance case 3180 ms for 30 d + 1 y + 10 y + next-Prime lookup)
- `npm run build` — succeeded (`dist/assets/index-CxHSb9ek.js` 1,511.26 kB). `visualScenarios`, `observerCity`, and `?scenario=` absent from `dist/`. Policy token `milky-way-viewing-v1` present as expected.
- Cursor Browser `http://localhost:1420/?scenario=milky-way` and `?scenario=milky-way&observerCity=sao_paulo` (viewport Cursor pane, not 1920×1080)

**Actual results**

Knoxville August 2026: nightly max ~25°, Prime windows exist; IDs `milky-way:city.knoxville:<startUtcMs>:<level>`. Atacama (−23°, −68°) Prime peaks > 70°. 65°N: `gcNeverRises`. London: `gcInsufficient`. No daylight windows. Prime starts at Sun ≤ −18°. Bright moonlight drops Strong/Prime to Viewing or none. Lunar-eclipse transmission can open Prime without a special case. Clouds/Bortle/pollution are not evaluator inputs.

**Visual verification**

```text
Visual verification:
- Scenario: milky-way (Knoxville)
- Viewport: Cursor built-in browser pane (not 1920×1080 CSS)
- Browser: Cursor built-in browser
- Inspected: ribbon + nested GC contours; Viewing windows status;
  Go to next Prime; Data/Demo; HUD eclipse line
- Result: PASS
- Observations: DEV banner 2026-08-19T06:00:00.000Z, HUD August 19 2026
  2:00 AM. Config Next Prime Aug 19, 10:07 PM–10:46 PM, peak GC 24.5°.
  Go to next Prime: HUD 10:07 PM, status Milky Way · Prime, GC 24.5°,
  97% of nightly maximum, Astronomical night · low moonlight, Ends
  10:46 PM. Data tab Demo 2026-08-19 10:07:55 PM, paused (Resume).
  HUD showed date/time only — no eclipse event line. Contours did not
  restyle because the event was active.

Visual verification:
- Scenario: milky-way&observerCity=sao_paulo
- Viewport: Cursor built-in browser pane (not 1920×1080 CSS)
- Browser: Cursor built-in browser
- Inspected: southern latitude Prime, twilight gate, post-window status
- Result: PASS
- Observations: HUD 3:00 AM at scenario start (UTC−3). Next Prime
  Aug 28, 7:10 PM–7:25 PM, peak GC 84.6°. Go to next Prime: HUD
  August 28 2026 7:10 PM, Milky Way · Prime, GC 83.6°, 100% of nightly
  maximum; São Paulo inside the 75° contour. Demo start 6:00 PM: HUD
  6:00 PM, status Next Prime (not Active) while GC contours remained
  high — twilight gate. After 3600× playback past the window: HUD
  August 29 9:51 AM, Next Prime Aug 29, 7:10 PM–8:18 PM; no Active
  Strong/Prime.
```

**Not verified**

Clouds-on vs clouds-off visual (evaluator regression is automated). Exact 10-year millisecond split vs 30-day/1-year separately (combined performance test 3180 ms). Full-Moon 9 PM São Paulo screenshot (Prime on Aug 28 was only 15 minutes; later 3600× overshot into daylight). Inner 1920×1080 viewport. Lunar-eclipse visual (numeric test only). High-latitude Config copy in the browser (automated `gcNeverRises` / `gcInsufficient`).

**Discovered, not done**

- Milky Way Band Viewing Window (Cygnus/Cassiopeia when GC is poor) — recorded in `docs/FUTURE_FEATURES.md`.
- Milky Way Viewing Tour using the Eclipse Tour Demo-time pattern — recorded; Eclipse Tour stays eclipse-only.
