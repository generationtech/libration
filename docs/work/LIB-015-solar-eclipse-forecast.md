# LIB-015 — Solar eclipse forecast window and upcoming-event progression

| Field | Value |
|-------|-------|
| ID | LIB-015 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized second Eclipse System implementation slice (E2). Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not implement E3+ (lunar eclipses, beam, reference-city circumstances, labels/event browser).

## Objective

Before a solar eclipse becomes active, Libration discovers authoritative upcoming solar eclipses inside a configurable product-time forecast horizon and renders future eclipse geography (event corridor distinct from the live E1 footprint) that transitions coherently into the live footprint as the event arrives.

## Scope

**In scope**

- Durable forecast-horizon control (bounded set, production UI, default 7 days; Off/Live-only preserves E1).
- Deterministic authority queries: next after T; events intersecting (T, T+H]; active at T; ordered collection when several fit.
- Explicit upcoming vs active lifecycle derived from product UTC + authority + config (not persisted).
- Cached, time-independent central-event corridor (centerline + swept totality/annularity band) from Besselian sampling.
- Restrained partial-forecast geography; honest partial-only events (no fabricated central corridor).
- Forecast presentation distinct from live E1; active events may retain corridor as context.
- Authority-range truncation of the requested forecast window.
- DEV scenarios for forecast total/annular/partial (and multiple if useful), using production code.
- Focused tests, type-check, full suite, build, and Cursor visual verification including accelerated forecast→active transition.

**Out of scope**

- Lunar eclipse authority/runtime/visibility.
- Reference-city circumstances, local contacts, notifications, sound.
- Eclipse beam/alignment (E5); post-event history; generalized Astronomical Events framework.
- Advanced labels/event list; per-subtype styling editor; authority snapping of Sun/Moon glyphs.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant; no network in the render path.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0008](../decisions/0008-bundled-nasa-solar-eclipse-authority.md).
- Intended structure: [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) §7–8, §18 E2, §22.
- Predecessor: [LIB-014](LIB-014-solar-eclipse-live-footprint.md).
- Visual verification: [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Acceptance criteria

- Forecast horizon is durable/configurable; Off/Live-only preserves E1 live semantics.
- Upcoming solar events inside the horizon resolve from the bundled authority at product UTC.
- Service can return more than one upcoming event; presentation may emphasize the nearest.
- Direct product-time jumps immediately reconstruct forecast/live state (no scheduler).
- Authority-range truncation is explicit; no ambient fallback outside 1900–2100.
- Central-event forecast corridor is derived from authoritative Besselian sampling and cached per event.
- Partial-only events do not fabricate a central corridor.
- Live E1 footprint remains time-varying and visually distinct from forecast geography.
- Active eclipse may retain corridor as context; forecast disappears when the event lies outside the horizon.
- Forecast→active and active→completed transitions are coherent, including accelerated demo.
- Dateline/polar corridors remain coherent; Canvas/RenderPlan stay generic.
- No E3+ behaviour.

## Verification plan

- Focused tests: forecast lookup, corridor geometry vs NASA fixtures, partial forecast semantics, config/persistence, RenderPlan, scenarios, production containment
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — config, layer, scenarios, and Vite production containment
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) for forecast scenarios plus accelerated transition, horizon change, pause, and ordinary startup

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — forecast lookup, horizon, cached corridor, forecast/live distinction, truncation.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — E2 decisions now implemented.
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — forecast scenario catalog.
- [`docs/ROADMAP.md`](../ROADMAP.md) — E2 no longer pending.
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — implementation pointer only if product intent is unchanged.
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: evaluate whether cached event-corridor vs live footprint is a durable boundary.

## Completion record

**Implementation summary**

Product-UTC forecast lookup from the bundled NASA/Espenak–Meeus authority (binary search, not a full catalog scan). Configurable horizon (`0` = Off / Live only, default 7 days) plus forecast corridor / forecast partial toggles. Cached event corridor (60 s Besselian sampling, algorithm `solar-event-corridor-v1`) distinct from the live E1 umbra. Partial-only events get a representative greatest-eclipse penumbral region, not a fabricated central band. Presentation emphasizes the nearest upcoming event; the service still returns every event in the horizon. ADR 0009 records the corridor-vs-live boundary. No E3+.

**Commands run**

- `npx tsc --noEmit` — clean (exit 0)
- `npm test` — 181 files / 1682 passed / 0 failed (24.14s)
- `npm run build` — succeeded (`dist/assets/index-BfEp1jAM.js` 972.71 kB). `solar-eclipse-forecast`, `visualScenarios`, and `solar-eclipse-total` absent from `dist/`
- Cursor Browser visual verification of forecast scenarios, live-only contrast, product-time jump into the 2024 total with corridor context, 3600× active motion, pause freeze, post-event jump, and ordinary startup

**Actual results**

Horizon set `{0,1,3,7,14,30,90,365}`; default 7; missing old-config keys normalize to 7. Live-only (`0`) emits no forecast selections. Range lookup 1000× `(T, T+30d]` and 1000 active-at-T queries each complete in < 50 ms. First 2024 corridor build asserted < 500 ms (this suite: 60 s vs 30 s sampling comparison 357 ms); cached retrieval < 5 ms and returns the same object; serialized geometry < 400 KB. Authority-range truncation sets `forecastCoverage.truncated` and returns only events in the supported query interval.

**Visual verification**

Viewport: `Emulation.setDeviceMetricsOverride` 1920×1080; canvas typically 1888×1079 CSS px. Limitation: Cursor Browser panel is not a guaranteed physical 1920×1080 window. Scenario banner UTC is the scenario seed, not the live product clock after a Data-tab jump.

```text
URL: http://localhost:1420/?scenario=solar-eclipse-forecast
Viewport: requested 1920×1080; canvas 1888×1079
Scenario banner: solar-eclipse-forecast · 2024-04-03T18:00:00.000Z · persistence isolated
Inspected: forecast corridor, no live umbra, Layers horizon control
Result: PASS
Observations: purple Mexico→US→Canada limit-line strip with faint fill; large quiet GE penumbral disk over the Pacific; no compact live umbra (canvas dark-purple sample count 0 in the NA scan). Horizon combobox shows 7 days with Off/Live only through 365 days. Map readable.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-forecast-annular
Inspected: annular forecast corridor vs totality styling
Result: PASS
Observations: Oregon→US→Yucatan→Brazil warm/red centerline and corridor; not totality purple.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-forecast-partial
Inspected: partial-only forecast; no central corridor
Result: PASS
Observations: no fabricated totality/annularity strip; representative partial region over Europe/W Asia; NZ far from the region.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-forecast-multiple
Inspected: multi-event density at 365-day horizon
Result: PASS
Observations: at least two corridors; nearest Oct 2023 annular stronger; second southern/Pacific path quieter.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-dateline
Inspected: live-only Pacific total (horizon 0)
Result: PASS
Observations: Pacific centerline from the left edge; no world-spanning fill.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-total
Inspected: live E1 umbra vs forecast-strip styling
Result: PASS
Observations: bright centerline Mexico→US→Canada; compact live umbra (canvas dark-purple samples 123); large violet penumbra; no NASA-style filled forecast strip (horizon 0).
```

```text
Interaction: solar-eclipse-forecast, commit demo start 2024-04-08 2:00 PM, Reset (paused jump)
Inspected: forecast→active reconstruction; corridor retained as context
Result: PASS
Observations: dark-purple sample count rose from 0 to 115 (live umbra present) while the Mexico→Canada corridor remained. Scenario banner still showed 2024-04-03 (static seed).
```

```text
Interaction: Resume 3600× for ~2 s, then Pause; then jump demo start to 2024-04-09
Inspected: live motion along corridor; pause freeze; completion
Result: PASS
Observations: while playing, sampled region centroid moved (444,541)→(426,544) then (728,563) as the live footprint progressed. After Pause, two samples 1 s apart were identical (728,563 n=1040). After 2024-04-09 reset, dark-purple count fell to 78 (night/ocean residual, not a live umbra).
```

```text
URL: http://localhost:1420/ (no scenario)
Inspected: ordinary startup containment
Result: PASS
Observations: no scenario banner; city pins and Sun/Moon present; Solar eclipses overlay off by default; no forecast corridor.
```

**Not verified**

- Dedicated Cursor visual of 2021-12-04 polar corridor (automated: no map-spanning ring; unwrapped ring span < 270°). No DEV scenario.
- Wall-clock watch of the full 5-day 3600× approach from 2024-04-03 (would be ~120 s). Transition was verified by direct product-time jump into the event plus 3600× motion while active.
- Pixel-level proof that switching the horizon to 1 day hides the 5-days-out 2024 corridor (Mexico desert is naturally bright; automated tests cover disappear/reappear). The Layers combobox change itself was observed.
- Past-vs-future corridor segmentation during an active eclipse (optional; not implemented).
- Map labels / time-to-event chrome (deferred to E6).

**Discovered, not done**

- Past/future corridor shading during an active event would make progression readable without labels, but needs extra segmentation. Not required for E2.
- A representative GE penumbral disk is honest and bounded; a full swept-penumbra union would need GIS polygon union and is visually huge. Leave for later presentation work if wanted.
- Event labels and an event list remain E6. Lunar eclipses, beam, and reference-city circumstances remain E3–E5.
