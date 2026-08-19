# LIB-047 — Eclipse Tour / event-sequenced demo playback

| Field | Value |
|-------|-------|
| ID | LIB-047 |
| Status | complete |
| Created | 2026-08-18 |
| Approved | 2026-08-18 (human; this request) |
| Completed | 2026-08-18 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Add an Eclipse Tour under Layers → Eclipse that sequences matching solar/lunar catalog events by commanding the existing Demo-time controller. No second product clock. Data/Demo stays domain-neutral.

## Scope

**In scope**

- Durable Eclipse Tour configuration on the scene document, UI at the bottom of Layers → Eclipse.
- Headless catalog enumeration and sequencer above Demo playback.
- Start/Resume, Pause, Reset (current-event lead-in), Stop, Previous/Next, Set tour start to now.
- Shared Demo speed state/options; loop; lead-in/post-wait; solar/lunar family filters; subtype-filter eligibility.
- Data/Demo interoperability (manual time and present-time deactivation).
- Focused tests, docs, visual verification.

**Out of scope**

- Second clock, eclipse astronomy changes, Data/Demo redesign, generic event-tour framework, internet event sources, auto-enabling eclipse presentation, other domain tours.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant; product semantics upstream of `RenderPlan`.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md) — Demo substitutes the instant; tour must not add a parallel clock.
- [ADR 0008](../decisions/0008-bundled-nasa-solar-eclipse-authority.md) — bundled offline authority; tour enumerates that catalog only.
- New [ADR 0015](../decisions/0015-domain-tour-sequencer-drives-shared-demo-time.md) — domain tour sequencer commands shared Demo time.

## Design notes

- **Placement:** Layers → Eclipse → Eclipse Tour (bottom). Not a Config tab. Not on Data/Demo.
- **Clock:** Tour writes `data.mode`, `data.demoTime.enabled`, `data.demoTime.startIsoUtc`, and posts the existing pause/resume/reset transport. `TimeContext.now` is unchanged.
- **Range:** Date-only `YYYY-MM-DD` interpreted in the same effective Demo wall-clock zone as Data/Demo start fields. Start = that date 00:00:00.000; end = 23:59:59.999. Factory start = current UTC calendar date at normalize time; factory end = authority inclusive max date. Combined supported range is the union of solar and lunar metadata spans; UI clamps to that combined span. Enumeration uses only selected families.
- **Eligibility:** Event interval `[globalStartMs, globalEndMs]` intersects the configured range. Tour family checkboxes (solar/lunar) and existing subtype filters apply. Layer masters do not. Do not override forecast horizons.
- **Lead-in / post-wait:** Immediate, 1h, 2h, 6h, 1d, 2d, 1w. Immediate = event start/end, not GE. Clamp lead-in to range start and post-wait to range end.
- **Loop default ON.** Loop off pauses at the final clamped post-wait instant.
- **Reset:** current event lead-in (Demo configured start), not tour-range start. Tour range start is independent.
- **Structural mutation deactivates** the running tour: range, family filters, lead-in, post-wait, subtype filters. Speed and pause do not. Set tour start to now is config-only and does not yank playback.
- **Data interoperability:** Manual Demo start change or Demo becoming inactive (static mode / demo time off) deactivates tour. Pause/speed from either surface stay shared. No Return-to-Present duplicate on Eclipse Tour.
- **Runtime is session-only.** Restart: config restored, tour inactive.
- **Enumeration** on config/start, not every frame.

## Acceptance criteria

See the authorizing request completion criteria 1–49. In short: Eclipse Tour sequences eclipses through existing Demo time from Layers → Eclipse; Data/Demo remains domain-neutral; same-UTC eclipse rendering is unchanged; tsc/test/build green; AWAITING SCOPE.

## Verification plan

- Focused tests: catalog range, enumeration, filters, intersection, lead-in/post-wait, loop, single-event, no-event, start/pause/resume/reset/next/prev/stop, Data deactivation, shared speed, normalization/clamp, live-layer policy unchanged
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — tour must not add a second clock into the bundle
- Visual verification: required — multi-event tour smoke plus 2017 same-UTC comparison. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — concise completed note only
- [ADR 0015](../decisions/0015-domain-tour-sequencer-drives-shared-demo-time.md)

## Completion record

**Implementation summary**

Eclipse Tour is a session sequencer above the existing Demo-time controller ([ADR 0015](../decisions/0015-domain-tour-sequencer-drives-shared-demo-time.md)). Controls sit at the bottom of Layers → Eclipse. Durable `scene.eclipseTour` holds range YMD, solar/lunar families, loop, lead-in, and post-wait. Speed is only `data.demoTime.speedMultiplier`. Start writes Demo mode/enabled/start to the current event’s clamped lead-in and resumes Demo playback; the frame loop steps the headless sequencer and jumps Demo start at post-wait. Reset snaps to the current-event lead-in. Stop deactivates sequencing and leaves product time paused. Previous/Next jump lead-ins and keep play/pause. Set tour start to now updates range start only (fingerprint omits start YMD). Structural tour/type-filter edits deactivate. Manual Data Demo start edits and Demo becoming inactive deactivate. Subtype filters apply; layer masters do not. Forecast horizons are not overridden. Catalog enumeration is cached off the animation frame.

**Commands run**

- `npx tsc --noEmit`
- focused: `eclipseTourCatalog`, `eclipseTourSequence`, `eclipseTourRuntime`, `workingV2Commit`, `LayersTab`
- `npm test`
- `npm run build`
- Cursor Browser: ordinary `http://localhost:1420/` (no `?scenario=`), Layers → Eclipse Tour, 2017-08-01…2017-09-15 mixed tour, Data Demo sync, present-time deactivation

**Actual results**

- `npx tsc --noEmit` clean
- focused: catalog 8, sequence 8, runtime 3, workingV2Commit 40, LayersTab 31 — 90 passed
- `npm test`: 229 files / 2150 passed / 0 failed
- `npm run build` succeeded (Vite client build)
- Authority range from metadata: solar and lunar 1900-01-01 inclusive … 2101-01-01 exclusive; calendar max `2100-12-31`. Counts: 454 solar, 459 lunar. Full-range enumeration 913 events in ~1.8 ms.

**Visual verification**

```text
Visual verification:
- Scenario: ordinary http://localhost:1420/ (no ?scenario=)
- Viewport: Cursor built-in browser pane (not canonical 1920×1080)
- Browser: Cursor built-in browser; npm run dev http://localhost:1420
- Inspected: Layers → Eclipse Tour at bottom; Data/Demo without tour
  fields; factory inactive on live Aug 18 2026; 2017-08-01…2017-09-15
  two-event tour; Start/Pause/Next; Data Demo start/speed/pause; Set
  demo start to current time deactivates tour
- Result: PASS
- Observations:
  - Factory: Solar/Lunar/Loop on; lead-in 1 day; post-wait 1 hour;
    speed 60; end 2100-12-31; start UTC calendar 2026-08-19 while HUD
    showed Aug 18 2026 8:29 PM local; Start enabled; ISS visible
  - Full remaining range status: 338 matching events (then 379 after
    start pulled back to 2017 with end still 2100-12-31)
  - Short range: 2 matching events
  - Start: Event 1 of 2 Partial lunar eclipse Aug 7 2017; HUD Aug 6
    2017 ~2:21 PM; ISS gone; lunar placard upcoming tomorrow
  - Pause: Start becomes Resume; Pause disabled; same event
  - Next (while paused): Event 2 of 2 Total solar eclipse Aug 21 2017;
    Data Demo start 2017-08-20 11:46:43 AM; US totality path; placard
    upcoming tomorrow; pause preserved
  - Data tab: Demo mode, demo time on, speed 60, Resume/Pause/Reset;
    no Eclipse Tour fields
  - Set demo start to current time: 2026-08-18 8:33:08 PM; tour Start
    enabled; Prev/Pause/Next/Reset/Stop disabled; 2 matching events
    status only; 2017 range config kept
  - Not visually waited: automatic post-wait jump (Next used;
    sequencer tests cover), Reset click, Stop click, loop wrap,
    live speed edit
```

**Follow-ups (not in this item)**

- Other domain tours / generic EventTour framework
- Auto-open eclipse placard, force presentation, or override forecast horizon
- Persist in-progress tour index across restart
