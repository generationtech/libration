# LIB-052 — Unified Demo event playback and Milky Way event presentation

| Field | Value |
|-------|-------|
| ID | LIB-052 |
| Status | complete |
| Created | 2026-08-19 |
| Approved | 2026-08-19 (human; this request) |
| Completed | 2026-08-19 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Move all event-playback / Demo-navigation controls into the Data tab (generic Demo, Eclipse playback, Milky Way viewing-window playback) so Layers own only what is rendered. Add Milky Way upcoming/active map event labels with advance notice, analogous in spirit to eclipse event labels, without a second clock or a generic EventTour framework.

## Scope

**In scope**

- Data tab topics: Time (generic Demo) and Event playback (Eclipse + Milky Way families).
- Migrate Eclipse Tour UI off Layers → Eclipse; preserve sequencer behaviour via the existing Demo controller.
- Milky Way viewing-window tour under Data (grouped nightly opportunities, level filters, shared lead-in/post-wait/loop/speed).
- Remove Layers time-navigation (Eclipse Tour section, Go to next Prime).
- Milky Way map event labels with advance notice; Layers retain presentation controls.
- Persist event-playback preferences under Data; migrate `scene.eclipseTour`.
- ADR for Data vs Layers ownership; docs, tests, visual verification.

**Out of scope**

- Second product clock; generic `EventTour<T>` / astronomical event engine.
- Eclipse astronomy changes; Milky Way Viewing Window authority (ADR 0018).
- Clouds/light pollution in MW event truth; MW placard; MW status on bottom HUD.
- Moving rendering controls into Data.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant; product semantics upstream of `RenderPlan`.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md) — Demo substitutes the instant.
- [ADR 0015](../decisions/0015-domain-tour-sequencer-drives-shared-demo-time.md) — sequencer commands Demo time (clock decision retained; Layers placement superseded).
- [ADR 0018](../decisions/0018-milky-way-viewing-window-is-a-reference-city-event.md) — MW windows remain reference-city events; tour consumes them.
- New ADR 0019 — domain event playback belongs to Data; Layers answers what is rendered.

## Design notes

- **Ownership:** Layers = what is rendered. Data = when the product is viewed. Domain event authorities stay upstream and serve both.
- **Clock:** Event playback → existing Demo controller → `TimeContext.now`. One speed field: `data.demoTime.speedMultiplier`.
- **Families:** persisted `data.eventPlayback.family`. Switching family or structural prefs while running deactivates sequencing and preserves product time.
- **MW grouping:** contiguous partitioned Viewing/Strong/Prime intervals of one night become one tour event; status may change level during playback.
- **Filters:** Data owns tour eligibility (eclipse Solar/Lunar; MW Viewing/Strong/Prime). Layers MW checkboxes own label/presentation classes. Eclipse subtype filters remain presentation-coupled for this item.
- **Labels:** one MW map label, GC-subpoint anchor, reference-city copy, Layers horizon; independent of ribbon/contour/marker visibility.

## Acceptance criteria

See authorizing request completion criteria 1–47. In short: Data is the single home for Demo and event playback; Layers retain presentation only; MW labels exist with advance notice; eclipse behaviour unchanged except control location; tsc/test/build green; AWAITING SCOPE.

## Verification plan

- Focused tests: sequencer contract, MW grouping, eclipse regression, config migration, Data tab topics, Layers cleanup, MW labels
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
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- ADR 0015 status + new ADR 0019

## Completion record

**Implementation summary**

Data is now the single home for product-time navigation. Data → Time keeps generic Demo. Data → Event playback sequences Eclipses and Milky Way viewing windows through the existing Demo controller (`TimeContext.now`). Layers → Eclipse no longer has Eclipse Tour; Layers → Milky Way no longer has Go to next Prime. Durable prefs live in `data.eventPlayback`; pre-LIB-052 `scene.eclipseTour` migrates. MW playback groups contiguous Viewing/Strong/Prime intervals into one nightly tour event (factory Viewing off, Strong/Prime on). Layers keep MW label presentation (default 2-day horizon, GC-subpoint anchor, `Knoxville · MW Prime · tomorrow` / `Knoxville · MW Prime`). Navigation does not require Layers presentation ON. [ADR 0019](../decisions/0019-domain-event-playback-belongs-to-data.md); ADR 0015 clock decision retained, Layers placement superseded.

**Commands run**

- Focused tests (event playback, MW labels, Data/Layers UI, config migration, eclipse tour wrappers, visual scenarios) — passed after three assertion fixes
- `npx tsc --noEmit` — clean
- `npm test` — 249 files / 2288 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-C9dxcA3M.js` 1,524.22 kB). `visualScenarios` and `?scenario=` absent from `dist/`
- Cursor Browser: `http://localhost:1420/?scenario=milky-way`, `&mwEvent=active`, `&observerCity=sao_paulo`; Config Data Time / Event playback; Layers Eclipse and Space objects

**Actual results**

Shared sequencer contract holds for start/pause/resume/reset/previous/next/loop/stop. Eclipse catalog times unchanged after UI migration. MW grouped night plays as one event. Config migration preserves old Eclipse Tour fields. Map labels: one at a time; active takes precedence; city copy is local.

**Visual verification**

- Scenario: `milky-way` (2026-08-19T06:00Z). Viewport: Cursor Browser pane.
- Inspected: `Knoxville · MW Prime · tomorrow` near GC marker, offset from “Galactic center”, contours/ribbon present; HUD date/time only.
- Interaction: Config → Data → Time (generic Demo, speed 60); Event playback → Eclipses (338 matching, Solar/Lunar, Start/Pause/Next…); family Milky Way (Knoxville, Viewing off, Strong/Prime on, end 2499-12-31, Start enabled). Layers → Eclipse: presentation only, no tour. Layers → Milky Way: labels + 2-day horizon, no Go to next Prime.
- Repeat: `mwEvent=active` at 2026-08-20T02:27:16Z: `Knoxville · MW Prime`, no countdown, same GC-subpoint family. `observerCity=sao_paulo`: `São Paulo · MW Viewing · in 15h 41m`; no stale Knoxville.

**Not verified**

- In-browser Eclipse/MW tour through a post-wait jump, Return-to-present while a family is running, and reference-city change while MW playback is active (covered by sequencer/fingerprint tests, not this Browser session).
- Narrow Config panel and sticky Data topic while scrolling.
- High-latitude no-label map case (unit-tested with an Arctic observer).

**Discovered, not done**

- Eclipse subtype filters remain presentation-coupled (LIB-047); Data owns Solar/Lunar family toggles only.
- São Paulo at the Knoxville upcoming station shows Viewing within the 2-day label horizon when no Prime is due yet — expected, not a defect.
