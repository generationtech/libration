# LIB-019 — Eclipse configuration completeness, event information, and product polish

| Field | Value |
|-------|-------|
| ID | LIB-019 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized sixth Eclipse System implementation slice (E6). Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not implement E7 or any new astronomy capability family. Do not commit, push, tag, branch, or release.

## Objective

Turn the shipped E1–E5 Eclipse System into one coherent, discoverable, configurable, visually polished product feature without reopening eclipse astronomy or adding a new major capability family.

## Scope

**In scope**

- Coherent Eclipse System configuration grouping with parent/child dependency states.
- Presentation-only event-type filters (if they fit cleanly).
- Production event-information surface for upcoming solar, active solar, and active lunar events.
- Restrained nearest/active event labels.
- Understandable forecast-horizon copy and solar/lunar geography explanation.
- User styling (color / thickness / opacity) that preserves E1–E5 defaults.
- Deliberate solar/lunar master default review (default-on if appropriate).
- Honest unsupported-authority-range presentation (1900–2100).
- Chrome/status polish, accessibility of new controls, persistence/reset/normalization.
- Focused tests, type-check, full suite, build, Cursor visual verification, documentation reconciliation.

**Out of scope**

- New authority math; generic Astronomical Events architecture; lunar forecast map; event browser/history; notifications; atmospheric/ambient shading; lunar nodes; supermoon/perigee; symbolic maria; standalone Moon horizon; arbitrary observer coordinates; new authority sources.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant.
- [ADR 0008](../decisions/0008-bundled-nasa-solar-eclipse-authority.md), [ADR 0009](../decisions/0009-cached-solar-eclipse-event-corridor.md), [ADR 0010](../decisions/0010-eclipse-events-global-circumstances-derived.md).
- Intended structure: [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) §13, §18 E6.
- Predecessors: [LIB-014](LIB-014-solar-eclipse-live-footprint.md) through [LIB-018](LIB-018-eclipse-alignment-beam.md).
- Global event truth is never filtered by reference city. Type filters affect presentation only.
- Do not reopen eclipse authority, contact solving, or global/local semantics unless a genuine defect is found.

## Acceptance criteria

- Eclipse configuration is coherently grouped; parent/child settings behave.
- Defaults are reviewed as one system; solar/lunar master default decision is documented.
- Event-type filtering is implemented or explicitly deferred with rationale.
- Event-information surface exists for upcoming solar, active solar, and active lunar events.
- Reference-city circumstances integrate without duplication; chrome remains compact.
- Event labels are implemented where useful or explicitly deferred.
- Solar/lunar geography meanings are understandable; hybrid and penumbral stay honestly named.
- User styling controls are independent, persisted, and default-preserving.
- No-event ordinary mode stays clean; unsupported range is honest.
- Reference city never filters global truth; product-time jumps/pause/acceleration work.
- E1–E5 focused regression remains green; E6 tests, `tsc`, full suite, and build pass.
- Documentation/spec/roadmap/state/log are reconciled; no unapproved E7; repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: config/defaults/normalization, event-information projection, labels, style independence, type filters, unsupported range, E1–E5 regression
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — config, presentation, scenarios, production containment, bundle sizes
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) for solar forecast→active→complete, lunar active + city switch, multi-event, styles, default-on quiet date, authority-range edges

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: only if E6 makes a new durable architectural decision comparable to existing ADRs.

## Completion record

**Implementation summary**

E6 turned the shipped E1–E5 Eclipse System into one product surface without new astronomy. Factory Solar/Lunar masters are **on** (named presets stay explicitly off; persisted `false` is preserved). Layers groups: Eclipses (event information / labels), Solar (horizon copy “Live only” / “N days ahead”, type filters, geography), Lunar (types, Moon-visible wording), Alignment, Reference city, Eclipse appearance. Presentation-only type filters hide map/labels/info/chrome, not authority. Event information covers upcoming solar, active solar, and active lunar, reusing E4 circumstances. One restrained map label for the nearest/active event. Independent color/thickness/opacity families preserve E1–E5 default tokens. Unsupported range copy: “Eclipse data unavailable outside 1900–2100.” No lunar forecast map, event browser, map inspector, or ADR.

**Commands run**

- `npx tsc --noEmit` — clean
- `npm test` — 194 files / 1799 passed / 0 failed
- `npm run build` — succeeded; production JS `dist/assets/index-DoQXwHex.js` 1,326.95 kB (gzip 321.47 kB); no DEV scenario registry in `dist/`
- Authority assets: solar-eclipse-authority-v1.json 334,491 bytes (gzip 73,709); lunar-eclipse-authority-v1.json 297,252 bytes (gzip 43,924)
- Representative frame costs (`npx tsx` against production modules): quiet `resolveEclipseFrame` 0.001 ms; cached forecast frame ~0 ms; forecast solar `getState` 0.030 ms; active solar 0.141 ms; active lunar 0.173 ms; event-information projection 0.011 ms
- Cursor Browser at http://localhost:1420, viewport 1920×1080 via device metrics

**Actual results**

Type-check clean. Full suite green. Build contains no DEV scenario machinery. No obvious repeated heavy work in the integrated path (frame cache by `utcMs`+`horizonMs`; corridor and circumstances already cached).

**Visual verification**

Browser: Cursor Browser. Viewport: 1920×1080 (closest achievable via CDP device metrics). Persistence isolated on `?scenario=` URLs.

| Scenario | UTC | Inspected | Result |
|----------|-----|-----------|--------|
| `baseline` | `2030-06-15T12:00:00.000Z` | Factory eclipse masters on; ordinary supported date | No eclipse geography, no empty chrome, no empty event furniture |
| `solar-eclipse-forecast&observerCity=knoxville` | `2024-04-03T18:00:00.000Z` | Corridor Mexico→US→Canada; label `Total solar eclipse · in 4d 21h`; no beam; Layers event info | Upcoming total; greatest 18:17 UTC; Knoxville local Partial, max 3:07:39 PM, obscuration 88.6% |
| `solar-eclipse-total&observerCity=knoxville` | `2024-04-08T18:17:15.000Z` | Live footprint, alignment ribbon, label `Total solar eclipse` | Active; current shadow Totality; geography Live central shadow · Partial visibility · Alignment; Knoxville still local Partial |
| `solar-eclipse-annular` | `2023-10-14T17:59:27.300Z` | Annularity band and label | `Annular solar eclipse`; current shadow Annularity; `Live path of annularity` — not totality |
| `lunar-eclipse-total&observerCity=knoxville` | `2022-05-16T04:11:29.000Z` | Earth-shadow Moon, Moon-visible region, label, alignment axis | Active total; Knoxville Totality visible; Moon-visible copy explains geometric horizon |
| `lunar-eclipse-total&observerCity=tokyo` | same | Global Moon/region vs local copy | Global map unchanged; `Not visible from Tokyo` |
| `solar-eclipse-forecast-multiple` | `2023-10-01T00:00:00.000Z` | Two restrained corridors | One primary label `Annular solar eclipse · in 13d 15h`; nearest emphasized; no label pile-up |
| Layers on live-only total | `2024-04-08` | Parent/child | Forecast corridor/partial **disabled** when horizon is Live only |
| Ordinary `http://localhost:1420/` | persisted clock | Scenario leakage | No scenario banner |

**Not verified**

- Visual 1899 / 1900 / 2100 / 2101 map jumps: Data-tab date fill in this Browser session did not move the scenario-frozen product clock. Unsupported-range UI projection is covered by automated tests.
- Visual after-eclipse clear via Data-tab jump / 36000× resume in this session (Resume stayed paused in the automation snapshot). Product-time lifecycle remains covered by E2 tests and prior E2/E5 visual work.
- Per-control style min/max on every basemap. Defaults were inspected in Layers; independence is covered by tests.
- Dedicated hybrid and penumbral map scenarios (hybrid 2023-04-20 and penumbral naming covered by tests and type-filter UI).
- Pixel-level chrome status line (canvas-drawn; DOM has no HUD text).
- Wall-clock real-time mode (demo/scenario path only).

**Discovered, not done**

- Lunar forecast map
- Event browser / history
- Swept penumbra union
- Map click-inspect
- Atmospheric / ambient eclipse shading
- About-page authority provenance
- Broad accessibility redesign beyond eclipse control labels
