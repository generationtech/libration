# LIB-017 — Reference-city eclipse circumstances

| Field | Value |
|-------|-------|
| ID | LIB-017 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized fourth Eclipse System implementation slice (E4). Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not implement E5+ (beam/alignment, lunar forecast map, generic events).

## Objective

For any globally resolved solar or lunar eclipse, calculate and present what the configured reference-city observer can actually experience — visibility, local contact times, local maximum, magnitude/obscuration where meaningful, and Sun/Moon altitude — without filtering or redefining global event truth.

## Scope

**In scope**

- Derived `ReferenceCityEclipseCircumstances` from `EclipseEvent` + Besselian/lunar geometry + shared reference-city lat/lon + product UTC.
- Authoritative solar local-circumstance reduction (C1–C4, maximum, magnitude, obscuration, geometric Sun altitude/azimuth) from the existing NASA Besselian elements.
- Lunar per-contact Moon altitude, locally visible contacts, moonrise/set-during-event, local-visible maximum.
- Inspectable details in the existing Layers configuration surface; optional compact persistent chrome status on the bottom HUD.
- Two durable toggles (details, chrome status); defaults on. No second city selector.
- Global-independence regression: city change must not alter event identity or global solar/lunar geography.
- DEV `observerCity=` on existing eclipse scenarios; focused tests; type-check; full suite; build; visual verification.

**Out of scope**

- Mars Attacks beam / live alignment; lunar forecast map; notifications; generic Astronomical Events framework.
- Standalone always-on Moon altitude/azimuth chrome; atmospheric refraction; terrain horizon; arbitrary user lat/lon.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0008](../decisions/0008-bundled-nasa-solar-eclipse-authority.md), [ADR 0009](../decisions/0009-cached-solar-eclipse-event-corridor.md), [ADR 0010](../decisions/0010-eclipse-events-global-circumstances-derived.md).
- Intended structure: [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) §12, §18 E4.
- Observer: [`src/core/referenceCityObserver.ts`](../../src/core/referenceCityObserver.ts) only.
- Predecessors: [LIB-014](LIB-014-solar-eclipse-live-footprint.md), [LIB-015](LIB-015-solar-eclipse-forecast.md), [LIB-016](LIB-016-lunar-eclipse-truth-and-visibility.md).

## Acceptance criteria

- Global eclipse discovery, solar path/corridor/live footprint, and lunar shadow/visibility region are independent of reference city.
- No reference city still allows global eclipses; circumstances are absent (not a Knoxville fallback).
- Solar local contacts from the same Besselian authority; C2/C3 only for local total/annular; magnitude ≠ obscuration.
- Geometric horizon only (center altitude; no refraction). Contacts ≤ 15 s vs independent fixtures.
- Lunar contact visibility per contact; local maximum is not an invisible global GE.
- UTC remains authoritative in domain state; presentation uses the reference city’s IANA zone.
- Inspectable details and optional chrome status exist; copy says “not visible locally” rather than implying no global event.
- Disabling circumstances or chrome does not disable the global eclipse map.
- RenderPlan/backends do not solve observer eclipse circumstances.
- No E5+ behaviour.

## Verification plan

- Focused tests: solar contacts vs USNO/NASA fixtures; obscuration geometry; lunar visibility; global independence; config/persistence; chrome/details presentation; scenarios
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — chrome, config, scenarios, production containment
- Visual verification: required — city-switch global-path immutability plus visible/not-visible local fixtures

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: [0010](../decisions/0010-eclipse-events-global-circumstances-derived.md) — eclipse events are global; circumstances are derived.

## Completion record

**Implementation summary**

Derived `ReferenceCityEclipseCircumstances` from the existing `EclipseFrame` plus chrome `displayTime.topBandAnchor` catalog city (`resolveReferenceCityObserverLocation`). Solar local C1–C4/max from the same NASA Besselian elements as E1/E2 (hour angle `μ + λ_geo − ω ΔT`; roots `m²−L1'²`, `m²−|L2'|²`, `u u̇ + v v̇`; 30 s sample, bisection + Newton, 1 ms tolerance). Magnitude is NASA diameter fraction; obscuration is generic circle-overlap area. Geometric Sun/Moon center altitude, no refraction. Lunar circumstances reuse E3 global contacts plus Moon altitude and geometric moonrise/set inside the event interval. Cache keyed by authority version + event id + lat/lon. Inspectable Layers rows plus optional bottom-HUD line (`scene.eclipseCircumstances.detailsEnabled` / `chromeStatusEnabled`, both default on). Copy says “not visible from {city}”, never that the global event is absent. ADR 0010. No E5+.

**Commands run**

- `npx tsc --noEmit` — clean (exit 0)
- Focused eclipse/circumstances/config/scenario tests — 16 files / 207 passed / 0 failed
- `npm test` — 189 files / 1742 passed / 0 failed (25.81s)
- `npm run build` — succeeded (`dist/assets/index-DXKzLWbM.js` 1,297.31 kB). `visualScenarios`, `solar-eclipse-total`, `lunar-eclipse-total`, and `observerCity` absent from `dist/`
- Cursor Browser visual verification of Knoxville/Tokyo/none solar, forecast, lunar visible/not-visible, city switch, chrome/details toggles, 3600× demo, ordinary startup

**Actual results**

USNO Solar Eclipse Computer vs this solver (catalog ΔT 74 s vs USNO 72.8 s; geometric horizon, no refraction):

Dallas 32.783°N 96.8°W (test-only fixture, local total): C1 17:23:12.564Z (−2.5 s), C2 18:40:38.166Z (−0.3 s), max 18:42:32.431Z (−0.9 s), C3 18:44:26.652Z (−3.3 s), C4 20:02:34.724Z (−1.1 s); mag 1.0143 vs 1.015; obscuration 1.000; Sun alt 64.8°.

Knoxville catalog (local partial, global still total, no C2/C3): C1 17:49:10.377Z (−2.6 s), max 19:07:39.231Z (−0.9 s), C4 20:23:30.782Z (−0.9 s); mag 0.8997 vs 0.900; obscuration 0.8856 vs 0.886; Sun alt 55.1°.

Tokyo and São Paulo 2024 solar: `outside_footprint`, not visible; global event remains total.

2022-05-16 lunar: Knoxville all contacts above horizon, local max = global GE (alt 31.5°); Tokyo all contacts below (GE alt −63.7°), locally not visible, no invisible local maximum.

Performance (this machine): first solar solve 9.5 ms; cached 0.015 ms; city-switch solve 4.6 ms; lunar 1.8 ms.

**Visual verification**

Viewport: `Emulation.setDeviceMetricsOverride` 1920×1080. Cursor Browser panel is not a guaranteed physical 1920×1080 window; Americas-centered crops are typical.

```text
URL: http://localhost:1420/?scenario=solar-eclipse-total
Viewport: requested 1920×1080
Scenario banner: solar-eclipse-total · 2024-04-08T18:17:15.000Z · persistence isolated
Inspected: global path + live footprint; Knoxville HUD/details
Result: PASS
Observations: path Mexico → US → Canada and Pacific umbra present. HUD: Eclipse · Partial 89% · max 3:07 PM. Layers: Global solar event Total; Local solar type Partial; C1 1:49:10 PM; Maximum 3:07:39 PM; C4 4:23:30 PM; Magnitude 0.900; Obscuration 88.6%; Sun altitude 55.1° (above horizon). No C2/C3.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-total&observerCity=tokyo
Inspected: global-path immutability vs Knoxville; local not-visible copy
Result: PASS
Observations: same 2024 path and Pacific umbra. Details: Reference city Tokyo; Global solar event Total; Local solar type Not visible from Tokyo. No local contact rows. Chrome city selector (same topBandAnchor control) switched Tokyo → Knoxville and details returned to Partial without a second eclipse city picker.
```

```text
Interaction: Layers — Persistent eclipse status off; then Reference-city eclipse details off
Inspected: independent toggles vs global map
Result: PASS
Observations: chrome off removed the HUD eclipse line; date/time remained; path unchanged; details still present. Details off removed the inspectable block; Solar eclipses remained checked.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-forecast
Inspected: upcoming local circumstances without hiding corridor
Result: PASS
Observations: 2024-04-03T18:00:00.000Z banner; 7-day horizon; purple forecast corridor Mexico → US → Canada; no live umbra. Details still list Knoxville Partial C1/max/C4 for the upcoming total.
```

```text
URL: http://localhost:1420/?scenario=lunar-eclipse-total
Inspected: Knoxville locally visible totality; global visibility region
Result: PASS
Observations: 2022-05-16T04:11:29.000Z. Moon-up region over the Americas; Knoxville pin 12:11:29 AM. Details: Totality visible; local maximum 12:11:29 AM; P1–P4 all listed with altitudes 12°–34°.
```

```text
URL: http://localhost:1420/?scenario=lunar-eclipse-total&observerCity=tokyo
Inspected: global visibility region unchanged; local not visible
Result: PASS
Observations: Americas Moon-up region still present. Details: Global lunar event Total; Local lunar visibility Not visible from Tokyo. No local-maximum row.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-total&observerCity=none
Inspected: no catalog city
Result: PASS
Observations: global path still drawn. Details: Circumstances unavailable (no catalog city). No Knoxville fallback.
```

```text
Interaction: solar-eclipse-total Data tab, speed 3600×, Resume then Pause then Reset
Inspected: accelerated demo and pause
Result: PASS
Observations: Resume became Pause; Reset returned to paused start 2:17:15 PM. Contact rows remained the event solution (time-independent).
```

```text
URL: http://localhost:1420/ (no scenario)
Inspected: ordinary startup containment
Result: PASS
Observations: no scenario banner; city pins and terminator present; no eclipse path or empty eclipse HUD furniture.
```

**Not verified**

- Physical 1920×1080 window; Cursor panel crops the map.
- São Paulo solar not-visible as a dedicated visual (numerical `outside_footprint`; Tokyo used for visual not-visible).
- Dedicated visual of Moon rising/setting during an eclipse (domain implements geometric crossings; 2022 Knoxville is fully above, Tokyo fully below).
- Pixel-hash comparison of path geometry across city switches (structural tests assert identical global geometry objects; visual comparison was qualitative).

**Discovered, not done**

- E5 live alignment / beam remains unapproved.
- Lunar forecast map presentation remains later.
- Standalone always-on Moon altitude/azimuth chrome remains a separate FUTURE_FEATURES candidate.
