# LIB-026 — Solar eclipse visual-semantics reconciliation

| Field | Value |
|-------|-------|
| ID | LIB-026 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized item. Authorized to create, approve, activate, diagnose, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not regenerate README media.

LIB-024 remains approved and paused: ground-position marker is in the tree; README recapture waits for an explicit later request.

## Objective

At every point through a solar eclipse, each visible element should have one stable meaning, evolve continuously when its underlying geometry evolves, and remain visually distinguishable from the other eclipse and illumination layers.

## Scope

**In scope**

- Primitive-ownership diagnostic of the final solar overlay RenderPlan at the six exact 2017 Knoxville-captured UTC stations (A–F).
- Isolate visual families (path, live partial, live central, alignment, ground marker, ordinary solar shading).
- Alpha/self-overlap audit (wrap copies, overlapping rings, polar closure); fix compositing geometry rather than hiding with alpha.
- Live partial continuity sampling; alignment-beam presentation so it reads as a ribbon, not map shading.
- Corridor fill vs limit-stroke z-order if needed; documented presentation tokens; A–F RenderPlan assertions.
- Cursor Browser visual verification of A–F, isolation stages, continuous playback, dateline/polar/annular/partial-only.
- Proportional docs, STATE, DEVELOPMENT_LOG, and this completion record.

**Out of scope**

- New eclipse astronomy; atmospheric daylight dimming; event browser; notifications; generic astronomy-event framework.
- New projection; generalized collision engine; animation framework; lunar changes.
- README edits; GIF/video; screenshot / media regeneration.
- Commits, pushes, tags, branches, or releases.
- Completing LIB-024 README recapture.
- Changing ground-marker astronomical lifecycle or corridor geography unless a verified geometry defect is found.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; backends must not decide product behaviour.
- ADR 0008 / 0009 / 0010 — existing authority, cached corridor, global vs derived circumstances. No new ADR unless a durable boundary is introduced.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — presentation is not a second authority.
- Predecessors: [LIB-014](LIB-014-solar-eclipse-live-footprint.md) … [LIB-025](LIB-025-solar-eclipse-lifecycle-shading-reconciliation.md).

## Acceptance criteria

- Every translucent region in A–F is positively identified; A–F primitive-ownership table exists.
- No same-family region accidentally alpha-stacks on itself.
- No forecast partial region remains once globally active.
- Live partial region evolves continuously and has one stable visual identity, distinct from ordinary night shading.
- Alignment beam remains visually distinct from geographic shading; Dramatic remains genuinely dramatic without dominating as a shadow region.
- Corridor retains stable visual identity and time-independent geometry; boundaries remain readable through active partial shading.
- Central footprint remains compact and distinct; ground marker remains the strongest current-location cue; marker/beam target agreement preserved.
- Pre-central B, first-central C, mid-central D, near-GE E, late-central F, central-exit, and global-end transitions are coherent.
- Continuous playback looks coherent, not merely isolated stations.
- Dateline, polar, annular, and partial-only regressions pass.
- No unrelated config additions unless necessary. Canvas remains astronomy-neutral.
- Type-check, full suite, and production build pass. No README/media regenerated. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: visual-family tokens, A–F RenderPlan snapshots, wrap/self-overlap, live partial continuity, alignment geometry, corridor z-order, lifecycle, scenarios
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production must exclude DEV scenario machinery
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) for exact A–F times, family isolation, continuous playback, dateline/polar/annular/partial-only

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: only if a new durable architecture boundary is introduced (expected: none).

## Completion record

**Implementation summary**

Manual 2017 playback still looked inconsistent after LIB-025 because several real layers shared one cool-violet language, a closed live-partial ring could unwrap to 360° and polar-close the Arctic, and Dramatic alignment occupied map-scale area. Presentation tokens now give each family a stable hue. Closed fill rings fold into the smallest longitude arc; overlapping ±360° copies are dropped so one semantic fill cannot stack alpha on itself. Corridor fill stays below the live partial; limit strokes stay above it. Beam origin half-width is ~5.4° (Dramatic ~6.4°). Penumbra outline sampling is 2°. No new config keys. No ADR. No README/media regeneration.

**Commands run**

- `npx tsx .tmp-lib026-af-diag.mts` — A–F primitive ownership (temp probe; deleted)
- `npx tsx .tmp-lib026-perf.mts` — layer build cost (temp probe; deleted)
- `npx vitest run` focused visual-semantics / appearance / alignment / lifecycle / scenario / equirect-plan tests
- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- Cursor Browser visual inspection of exact A–F stations, isolation TEST 1–6 at D, Normal vs Dramatic at D and E, 400× playback, post-central, after, dateline, annular, partial-only, ordinary startup

**Actual results**

- 2017 A–F primitive table: see this item’s completion report in the authorizing request. Corridor ring identical A–F (`n=387`, lat `[13, 45.4]`, lon `[-165.2, -34.6]`). Forecast partial only at A.
- Focused tests: 6 files / 100 passed
- `npx tsc --noEmit` clean
- `layer.getState`: B 0.029 ms, D 0.133 ms, post-central 0.010 ms; cached `resolveEclipseFrame` 0.016 ms
- `npm test`: 203 files / 1911 passed / 0 failed (one earlier full-suite run had two 5 s timeouts under load; rerun of those tests and a second full suite were green)
- `npm run build`: succeeded. `dist/` contains no `solar-eclipse-2017` / `eclipseStation` / `visualScenarios`

**Visual verification**

- App: `npm run dev` at http://localhost:1420; Cursor Browser; `Emulation.setDeviceMetricsOverride` 1920×1080; innerWidth 1920; canvas ~1888×1079 CSS ~1889×1080
- Showcase: Extra Large Moon, Event labels OFF, Alignment Dramatic (Normal compared at D and E), Ground marker ON Large, solar shading ON
- A `14:42:59Z`: corridor + faint teal forecast partial; night on western Pacific; no marker/beam/live partial
- B `15:56:19Z`: corridor remains; small teal live partial in the Pacific; no marker; no targeted beam; terminator distinct
- C `17:05:58Z`: vermilion marker Pacific/Oregon; compact umbra; gold ribbon to marker; teal Pacific partial; corridor unchanged
- D `17:52:57Z`: marker central US; teal oval (not Arctic cap); isolation TEST 1–6 attributed the large oval to live partial and the gold wedge to the beam
- E `18:36:03Z`: marker eastern TN / western NC; Dramatic beam stronger than Normal, still a ribbon not a shadow region
- F `19:55:15Z`: marker Atlantic ~16°N 45°W; corridor still across the US; teal partial south/east of the path
- Isolation at D: shading-only (no eclipse overlays); +corridor (violet path only); +live partial (teal oval appears); +umbra (compact indigo); +beam (gold ribbon); +marker (vermilion on top)
- Playback: Data tab 400× from station A; panel went Active/Partial then Totality with marker on the US path; later frames left the event (overlays gone). Scenario banner stays on the seed UTC
- `postCentral` `20:21Z`: corridor remains; marker and targeted beam gone; live partial east/south; Lifecycle Active / Current shadow Partial
- `after` `21:10Z`: no eclipse overlays; glyphs remain; no event panel
- `solar-eclipse-dateline&horizon=7`: Pacific corridor, no world-spanning fill
- `solar-eclipse-annular&horizon=7`: warm path, antumbra/marker, gold beam, teal partial, no totality indigo
- `solar-eclipse-partial&horizon=7`: Americas crop shows terminator only (Europe live partial is off-screen); no corridor/marker/targeted beam
- Ordinary `http://localhost:1420/`: title Libration, no scenario banner
- Result: PASS

**Not verified**

- Pixel-golden screenshots
- Exact 1920×1080 CSS canvas vs device-metrics override (innerWidth 1920; canvas CSS width ~1889)
- Polar 2021-12-04 visually (structural self-overlap test passed; no DEV polar scenario)
- Exact last-central ±60 s frames in the browser (automated RenderPlan sequence passed; visual used F then `postCentral` `20:21Z`)
- Exact global-end ±60 s frames in the browser (automated; visual used `after` `21:10Z`)
- Hybrid 2023-04-20 visually
- Slow 2-minute visual stepping of live partial (automated 2-minute geometry sampling 15:40Z–21:00Z)

**Discovered, not done**

- LIB-024 README recapture remains deferred until an explicit later request.
- Sparse penumbra outlines can still look chorded at the Earth’s limb; 2° sampling is better than 5° but not a smooth curve.
- Partial-only events still emit a compact local glyph-field (`solar-partial-field`), not a targeted terrestrial beam. Americas-centered screenshots do not show the 2022 Europe footprint.
