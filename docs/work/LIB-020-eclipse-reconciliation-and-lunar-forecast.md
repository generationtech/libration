# LIB-020 — Eclipse reconciliation and lunar forecast

| Field | Value |
|-------|-------|
| ID | LIB-020 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized post-E6 Eclipse System reconciliation. Authorized to create, approve, activate, implement, verify, and complete in the same request. This is not E7 and does not reopen eclipse astronomy. Do not commit, push, tag, branch, or release.

## Objective

Repair three production-surface defects from hands-on use of the completed E1–E6 Eclipse System (event-label toggle, lower-left HUD spacing, Solar/Lunar factory-default diagnosis) and close the remaining product asymmetry by adding advance lunar-eclipse forecasting on the existing EclipseAuthority / EclipseEventService / E2 forecast architecture.

## Scope

**In scope**

- Event labels toggle must suppress on-map eclipse label primitives.
- Lower-left HUD: treat persistent eclipse status as a separate contextual row so date/time spacing is preserved.
- Diagnose Solar/Lunar factory, reset, normalization, preset, and persistence paths; repair only if the implementation is wrong.
- Lunar forecast horizon, upcoming lookup, representative GE Moon-visible region, event information, labels, reference-city future circumstances, and persistent status.
- Forecast → active transition; type filters; DEV scenario; focused tests; type-check; full suite; build; Cursor visual verification; documentation.

**Out of scope**

- Eclipse history/browser; notifications; generic Astronomical Events; swept solar penumbra union; atmospheric/ambient shading; lunar nodes; supermoon/perigee; symbolic maria; standalone Moon visibility overlay; new authority sources; observer refraction/topography.
- Reopening Besselian/lunar authority math, global/reference-city semantics, or E1–E5 astronomy unless a concrete defect requires it.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant.
- [ADR 0008](../decisions/0008-bundled-nasa-solar-eclipse-authority.md), [ADR 0009](../decisions/0009-cached-solar-eclipse-event-corridor.md), [ADR 0010](../decisions/0010-eclipse-events-global-circumstances-derived.md).
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md).
- Predecessors: [LIB-014](LIB-014-solar-eclipse-live-footprint.md) through [LIB-019](LIB-019-eclipse-product-polish.md).
- Global event truth is never filtered by reference city. Type filters affect presentation only.
- Reuse EclipseAuthority / EclipseEventService. Do not invent a second forecast system or a solar-style lunar path.

## Acceptance criteria

- Event labels OFF emits no eclipse map-label primitives; ON restores them. Event information and persistent status remain independent.
- HUD eclipse status no longer crowds date/time; two-line date/time is unchanged when status is absent; long status strings fit.
- Factory and reset Solar/Lunar masters are ON; explicit saved OFF remains OFF; old-config normalization matches documented E6 migration; named presets stay deliberate.
- Lunar forecast horizon is durable (same vocabulary as Solar; default 7 days). Upcoming lunar events resolve from bundled authority. Live only disables advance presentation.
- Future lunar map geometry is the representative Moon-visible region at greatest eclipse, not a terrestrial path. Quieter than active. Nearest upcoming gets map geography; others remain in the service/info.
- Forecast event information, labels, local circumstances, and persistent status work. Reference city never filters global forecast.
- Forecast → active → completed transitions are coherent. Type filters apply to presentation only.
- Solar E1–E6 and active lunar E3/E5/E6 remain green. Runtime stays offline. Documentation/state/log transaction complete. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: label toggle output, HUD layout structure, defaults/normalization/presets, lunar forecast service/geometry/circumstances, solar and active-lunar regression
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — config, scenarios, production containment
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: only if a new durable architectural boundary appears (expected: none).

## Completion record

**Implementation summary**

Post-E6 reconciliation, not E7. Event labels now rebuild the layer registry (`sceneRuntimeAffectingEqual` includes `eclipseInfo.labelsEnabled`). Persistent eclipse status is a separate HUD row below an unchanged date/time block. Factory/reset Solar and Lunar masters are already ON; the observed Lunar OFF is a preserved explicit persisted or named-preset value, not a factory defect. Lunar forecasting reuses EclipseAuthority / EclipseEventService with a separate 7-day horizon and a quieter GE Moon-visible region (nearest upcoming only on the map). No new ADR.

**Commands run**

- Baseline before changes: `npm test` — 194 files / 1799 passed / 0 failed
- Focused iteration: eclipse service/geometry/labels/info/HUD/config tests (green during implementation)
- `npx tsc --noEmit` — clean (exit 0)
- `npm test` after changes — 195 files / 1826 passed / 0 failed
- `npm run build` — succeeded; `dist/assets/index-DbOK2hQ3.js` 1,334.14 kB (gzip 322.68 kB); no DEV scenario ids in `dist/`
- Representative costs (`npx tsx` against production modules): upcoming lunar lookup 0.0008 ms; first GE forecast region 0.228 ms; cached region 0.0003 ms; first forecast frame 0.393 ms; cached forecast frame 0.0002 ms; first active lunar frame 0.286 ms; cached active 0.0001 ms; quiet dual-horizon frame 0.214 ms / cached 0.0001 ms
- Cursor Browser at http://localhost:1420; CSS viewport 1905×1080 via CDP device metrics (canonical 1920×1080 requested; panel screenshots often crop the lower-left HUD)

**Actual results**

Type-check clean. Full suite green. Production bundle has no `lunar-eclipse-forecast-total` / `?scenario=` registry. Lunar forecast is inexpensive and cached. Factory Solar/Lunar ON; explicit `false` preserved; named presets `minimal` / `celestial` / `featuredCities` remain explicitly OFF.

**Visual verification**

Browser: Cursor Browser. Viewport: 1905×1080 CSS (closest achievable). Persistence isolated on `?scenario=` URLs.

| Scenario | UTC | Inspected | Result |
|----------|-----|-----------|--------|
| `lunar-eclipse-forecast-total` | `2022-05-13T04:00:00.000Z` | Quiet GE Moon-visible region over Americas/Atlantic; label `Total lunar eclipse · in 2d 21h`; HUD `May 13 2022` / `12:00:00 AM` / `Lunar eclipse · Total · in 2d 21h` with a clear gap; no Earth-shadow Moon; no lunar beam | Forecast presentation only |
| same, Event labels OFF | same | Map label gone immediately; region and HUD status remain | Issue A fixed |
| `…&observerCity=tokyo` | same | Same Americas/Atlantic forecast geography; event info: Upcoming total; `Not visible from Tokyo` | Global-first |
| `lunar-eclipse-total` | `2022-05-16T04:11:29.000Z` | Label `Total lunar eclipse` (no relative time); Earth-shadow Moon; alignment axis | Forecast → active via URL jump |
| `lunar-eclipse-forecast-total&horizon=0` | `2022-05-13T04:00:00.000Z` | Lunar horizon Live only; forecast children disabled; event information empty; Solar horizon still 7 days | Live only disables lunar advance |
| `solar-eclipse-forecast` | `2024-04-03T18:00:00.000Z` | Corridor Mexico→US; label `Total solar eclipse · in 4d 21h`; event info Upcoming total, Knoxville local Partial 88.6% | Solar E2/E6 intact |
| same, Event labels OFF | same | Label gone; corridor remains | Solar label toggle |
| `baseline` | `2030-06-15T12:00:00.000Z` | Factory masters on; ordinary date | No eclipse geography, labels, or empty event furniture |

Factory Layers checkboxes on forecast/baseline-derived factory config: Solar checked, Lunar checked, both horizons 7 days, Event information / labels / persistent status on.

**Not verified**

- Pixel-perfect HUD for every long city name in the Cursor panel crop (Tokyo HUD row was often below the visible panel). Layout structure and Knoxville forecast HUD spacing were inspected; long-string layout is covered by `bottomHudReadoutPlan` / `bottomChromeBandPlan` tests.
- Accelerated demo Resume through a full lunar forecast→active→end in this Browser session (prior E items saw Resume stay paused under automation). Product-time jumps reconstruct via URL scenario change and service tests.
- Dedicated visual partial/penumbral forecast map scenes (automated: partial 2008-08-16 and penumbral 2017-02-08 naming/geometry).
- Wall-clock real-time mode.
- Ordinary persisted `http://localhost:1420/` Lunar checkbox (scenarios isolate persistence; an existing explicit saved OFF would remain OFF).

**Discovered, not done**

- Event browser / history
- Notifications
- Generic Astronomical Events
- Swept solar penumbra union
- Atmospheric / ambient eclipse shading
- Map click-inspect
- About-page authority provenance
