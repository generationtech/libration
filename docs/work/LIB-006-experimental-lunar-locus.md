# LIB-006 — Experimental lunar locus (compact lunar-day sampling)

| Field | Value |
|-------|-------|
| ID | LIB-006 |
| Status | complete |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (human) |
| Completed | 2026-08-14 |

Human-authorized development-only experiment after [LIB-005](LIB-005-lunar-ground-track-stroke-colors.md). Do not activate in the planning session that created this file; activate only when selected for execution. Completing this item does **not** authorize a production lunar analemma or locus overlay.

## Objective

Determine whether the Moon has a **compact, visually meaningful analemma-like locus** once its dominant daily longitudinal motion is removed by sampling the sublunar point at a mean lunar-day cadence.

Question:

> If the Moon's dominant daily longitudinal motion is removed by sampling the sublunar point at an appropriate lunar-day cadence, does the residual north/south and east/west motion form a compact, visually compelling locus analogous in spirit to the solar analemma?

This is a **development-only visual experiment**, not a production overlay. The first goal is to discover what the geometry actually looks like.

All three outcomes are legitimate successes:

1. a compact and visually compelling structure worth considering as a production feature;
2. an interesting but visually mediocre structure worth documenting and discarding;
3. a confusing or map-obscuring structure that should not be pursued.

Do not tune the mathematics to manufacture an attractive result. If the natural result is ugly, that is useful evidence.

## Scientific premise

The solar analemma ([LIB-003](LIB-003-solar-analemma-follow-sun.md), `src/core/solarAnalemmaGroundTrack.ts`) is compact because one sample per day at a fixed UTC clock time removes most of Earth's rotation, leaving residual east/west timing variation plus solar declination.

The Moon moves much faster against the celestial sphere. Sampling every 24 h produces large longitudinal displacement — the woven multi-day ground track already observed in [LIB-004](LIB-004-lunar-ground-track.md) — rather than a compact figure.

The experiment therefore samples at approximately a **mean lunar-day cadence**: the time between successive returns of the Moon to approximately the same terrestrial meridian. A public starting approximation is **24 h 50 m**. Do not hard-code that value blindly. Derive and verify the cadence from the repository's existing lunar model before sampling (see **Sampling design**).

## Scope

**In scope**

- Development-only lunar-locus experiment using the existing visual-scenario / DEV fixture path.
- Same lunar-position truth as the Moon marker and lunar ground track: `sublunarPoint` from `src/core/sublunarPoint.ts`. No second ephemeris.
- Sampling at a verified mean lunar-day cadence for approximately one lunar orbital cycle (~27–30 samples).
- Two geographic representations: raw sampled positions, and reference-meridian residual longitude.
- At least one compact glyph representation centered on or near the current Moon marker.
- Dots-only and dots-plus-faint-line treatments; optional temporal fade only if it improves comprehension.
- Visual comparison at at least three fixed epochs (four if needed for nodal/apsidal contrast).
- Quantitative latitude / residual-longitude notes per epoch.
- Correct dateline / wrap handling.
- Cursor Browser visual inspection per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).
- Automated tests of experimental mechanics (not visual beauty).
- An explicit completion recommendation: **PROMOTE TO PRODUCTION DESIGN**, **KEEP AS EXPERIMENT / NEEDS MORE STUDY**, or **DO NOT PURSUE**.
- Easy removal of experiment fixtures if the result is not worth keeping.

**Out of scope**

- Production Layers-tab toggle or durable user configuration.
- Persistence of the experiment.
- Permanent product documentation of a lunar analemma/locus feature.
- 27-day continuous high-frequency woven ground track.
- Lunar standstill envelope as a production feature.
- Eclipse prediction; lunar rise/set geometry; orbit-in-space rendering.
- Changing the lunar ephemeris; changing solar analemma behaviour.
- Solar ground-track implementation.
- General overlay redesign; renderer refactor; unrelated performance work.
- Historical astronomy research project.
- Self-approving a production follow-up. If promoted, create only a **proposed** follow-up item.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant per frame; product semantics resolve upstream of rendering; `RenderPlan` is the hard boundary; backends do not decide product behaviour; `SceneConfig` remains authoritative for production scene content.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md) — plan builders may emit ordinary primitives; the Canvas backend executes them only.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md) — sampling times are offsets from `TimeContext.now` (paused demo UTC in fixtures). No `Date.now()` in the experiment path.
- Cursor rules `010` (RenderPlan), `020` (scene system), `060` (visual verification).
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md); Implementation §2 (DEV scenario seed) and §8 (time model).

Expected flow:

```
paused product UTC (scenario seed)
→ sample times at verified mean lunar-day cadence
→ sublunarPoint(utcMs) at each sample
→ residual / glyph geometry in core or DEV experiment module
→ ordinary RenderPlan point/line primitives
→ existing backend execution
```

Preserve:

- one authoritative product-time model;
- existing `sublunarPoint`;
- RenderPlan boundary;
- backend neutrality;
- development-only scenario containment;
- configuration ownership (`SceneConfig` is not extended for this experiment).

Do not place lunar orbital mathematics in the Canvas backend. Do not make production layers aware of experiment query parameters. Do not modify the existing lunar ground track unless a tiny shared wrap helper is clearly justified and preserves existing behaviour. If substantial refactoring appears necessary, stop and record it under **Discovered, not done**.

### Binding decisions from planning inspection

**Lunar truth.** Every sample is `sublunarPoint(utcMs)` — the same function used by `src/layers/sublunarMarkerLayer.ts` and `src/core/lunarGroundTrack.ts`. Assert that the reference sample at offset 0 equals `sublunarPoint(now)` within ordinary floating-point tolerance.

**Containment.** Prefer extending `src/dev/visualScenarios.ts` plus a small DEV-only experiment module that feeds ordinary RenderPlan geometry. Do not add a `SceneConfig` stack row, Layers-tab control, or persistence field. Production `createLayerForSceneOverlayInstance` must not gain a new product id. Production bundles must not depend on experiment-only machinery (same DEV-dynamic-import containment as the scenario registry in `src/main.tsx`). Sampling math may live in `src/core/` as a pure unused-by-production function, or in `src/dev/` if that makes removal cleaner. Choose the smaller boundary.

**LIB-001 catalog rule.** Adding a scenario requires a work item. This item authorizes one temporary experiment id: `lunar-locus`. There is no documented eight-scenario cap ([LIB-004](LIB-004-lunar-ground-track.md)). Temporary experiment fixtures may be deleted at completion if the verdict is **DO NOT PURSUE**.

**Do not clone solar analemma sampling.** Architectural precedent only (derived astronomy, RenderPlan primitives, seam wrap). Do not sample one UTC clock time per mean solar day. Do not require a figure-eight.

**Do not clone lunar ground-track sampling.** That overlay is a 10-minute open path over hours. This experiment is ~28 sparse points over ~one orbital cycle.

## Sampling design

### Cadence

Starting public approximation: **24 h 50 m**. Binding requirement: derive the mean lunar-day period from the existing model before using it.

`src/core/sublunarPoint.ts` already contains the needed mean rates:

- GMST rate: `360.98564736629` degrees per day (coefficient of `n` in the GMST formula).
- Moon mean ecliptic longitude `Lp` rate: `481267.88123421` degrees per Julian century (`T`), with `T` in centuries of `36525` days.

Starting definition to verify:

```
meanLunarDayDays = 360 / (GMST_rate_deg_per_day − Lp_rate_deg_per_day)
```

where `Lp_rate_deg_per_day = 481267.88123421 / 36525`.

That period is the mean time for the sublunar point to return to the same meridian under the model's mean Earth rotation vs mean lunar longitude. Use the model's constants; do not paste a rounded 24h50m literal as the implementation cadence.

Before adopting it, the implementation agent must verify:

1. The formula is internally consistent with how `sublunarPoint` actually forms longitude (`RA − GMST`, not ecliptic longitude dumped onto Earth).
2. If mean lunar RA motion differs materially from `Lp` mean motion, document the chosen rate and why it better matches successive meridian returns.
3. A run of N samples at the chosen Δt does not show a large secular longitude drift (first-to-last residual should be periodic-scale, not a march around the globe). If it does, the cadence is wrong — fix the definition, do not apply an ad-hoc visual correction.

Document the adopted Δt (ms and `hh:mm:ss`), the source constants, and the verification in the completion record.

### Sample count and span

Start with **N = 28** samples (`k = 0 … 27`), including the reference instant: 27 mean lunar days, ~one sidereal month of mean solar time. Allowed range: **27–30** samples inclusive of the reference. Do not render a 27-day continuous high-frequency path.

Document N, cadence, first/last UTC, and calendar span.

### Representations

**A. Geographic sampled positions (baseline).** Plot raw `(lonDeg, latDeg)` from `sublunarPoint` at each `t_k = now + k · Δt`. This establishes whether lunar-day sampling alone is compact. Handle wrapping with existing short-arc utilities (`shortLonDeltaDeg` / `unwrappedLongitudes` in `src/renderer/renderPlan/equirectSeamPath.ts`). A ±180° jump must not emit a world-spanning segment. Distinguish a true residual offset from a wrap artifact.

**B. Reference-meridian residual.** Let sample 0 be the reference (`lon_0`, `lat_0`) at the canonical instant (the current Moon). For each later sample, the expected mean-return meridian is `lon_0` if Δt is a true mean lunar day. Residual longitude:

```
δlon_k = wrap(lon_k − lon_0)   → (−180°, +180°]
```

using the same wrap convention as `shortLonDeltaDeg` (`(((b − a) + 540) % 360) − 180`). Plot conceptually:

- horizontal: `δlon_k` (timing / longitude residual)
- vertical: `lat_k` (sublunar latitude / lunar declination)

Do not invent a visually convenient correction. If Δt is correct, mean motion is already removed and any remaining δlon is periodic. Derive any refinement of this formula from the cadence actually used, and document the mathematics in the completion record.

**C. Compact glyph attached to the current Moon (required visualization).** Strongest candidate: a compact figure whose current/reference sample coincides with the Moon marker, analogous in role to the solar analemma as an instrument glyph rather than a route.

- current Moon marker = current/reference point;
- vertical displacement = lunar declination / latitude;
- horizontal displacement = residual longitude;
- locus ≈ one lunar cycle.

Prefer a map-relative 1:1 degree mapping first (`lon_0 + δlon_k`, `lat_k`), so the shape retains orbital meaning. If a display scale is required for readability, use a **uniform** scale (same factor on x and y) and document it. Do not apply unequal x/y stretch to force a pretty shape. Screen-space offset is allowed only if map-relative 1:1 is unreadable; document the mapping.

The figure must read as *the Moon's longer-period excursion around the current state*, not as an unrelated decoration.

## Epoch comparison

The Moon's orbital geometry changes over the 18.6-year nodal cycle (vertical amplitude) and the ~8.85-year apsidal cycle (in-plane shape). Compare the **same** sampling scheme at several fixed paused epochs.

Required candidates (verify against this model's monthly `|latDeg|` envelope; substitute the nearest extreme month if a candidate is not actually near standstill here, and document the substitution):

| Role | Candidate UTC | Rationale |
|------|----------------|-----------|
| Recent / track comparison | `2026-01-16T22:00:00.000Z` | Same instant as `lunar-track`; compare compact locus vs the woven 48 h ground track. |
| Major-standstill envelope | `2025-03-08T12:00:00.000Z` | Near the 2024–2025 major standstill. Confirm the 27-day `|latDeg|` max is near the model's high envelope. |
| Minor-standstill / nodal contrast | `2015-09-16T12:00:00.000Z` | ~10.4 years earlier, near the 2015 minor standstill (opposite side of the 18.6-year cycle). Confirm the 27-day `|latDeg|` max is near the model's low envelope. |

Optional fourth, if three are not enough to judge character:

| Role | Candidate UTC | Rationale |
|------|----------------|-----------|
| Product-default / apsidal contrast | `2030-06-15T12:00:00.000Z` | Existing `baseline` demo instant; different date within the nodal cycle. |

Do not attempt exhaustive astronomical coverage. Three or four carefully chosen epochs are sufficient. Learn whether the locus is stable in character, changes shape, expands/contracts vertically, or becomes chaotic.

## Visual treatments

Compare a small number of restrained treatments. Do not spend significant effort styling an unproven visualization.

1. **Dots only** — one point per sample; current/reference point visibly distinguished. Exposes the natural locus without implying a continuous ground track.
2. **Dots + faint connecting line** — reveals sequence/order and whether the shape forms loops. Use existing short-arc unwrap so the faint line does not span the world at the dateline.
3. **Optional temporal fade** — current/reference strongest; older/future samples quieter. Test only if it improves comprehension.

Prefer dots first.

## Visual scenario

Authorize one temporary DEV scenario:

**`lunar-locus`**

Requirements:

- Paused demo UTC: default `2026-01-16T22:00:00.000Z` (recent / track-comparison epoch).
- Sublunar marker **on**. Lunar ground track **off** for the primary locus inspection (optionally enable briefly as a comparison, then leave it off). Solar analemma **off** so the two figures are not confused.
- Live dynamic feeds off (existing scenario isolation). Grid on. Substrate with good contrast (factory default unless inspection shows the locus is hidden; then pick a bundled family and document it).
- Development fixture only; production ignores `?scenario=`.

Epoch (and, if useful, representation mode) switching must happen at the **visual-scenario seed** in `src/dev/visualScenarios.ts`, not in production layers. Preferred: one catalog id plus a small DEV-only query parameter (for example `locusEpoch=`) parsed only in that DEV module, which changes paused `startIsoUtc`. A few temporary extra scenario ids are acceptable if a query param would complicate the resolver; delete extras at completion unless the verdict is **KEEP AS EXPERIMENT**.

Layers, the Canvas backend, and `RenderPlan` must not inspect the query string ([`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) §2).

Also inspect `baseline` (experiment absent) and `readability` (existing solar analemma) for comparison. Ordinary startup without `?scenario=` after scenario work, per the visual-verification procedure.

## Visual-verification loop

Required. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) in Cursor's built-in browser at canonical 1920×1080:

1. Implement the first mathematically honest locus.
2. Render it.
3. Inspect its shape.
4. Adjust only visualization parameters needed to interpret the geometry.
5. Compare raw geographic sampling against residual / compact representation.
6. Compare several epochs.
7. Capture observations.
8. Decide whether the concept deserves further work.

## Quantitative evidence

For each test epoch, record as useful (not a precision-astronomy validation):

- sampling cadence (ms and `hh:mm:ss`);
- number of samples;
- date span (first/last UTC);
- minimum / maximum sublunar latitude;
- residual-longitude range;
- whether the locus closes approximately;
- distance (angular) between first and final sample;
- any obvious discontinuities.

## Solar analemma comparison

Compare the lunar experiment against the existing solar analemma (`readability` plus Implementation notes on `solarAnalemmaLayer.ts`):

- compactness;
- map obstruction;
- recognizability;
- information density;
- visual elegance;
- whether the shape reads as an astronomical instrument rather than a route;
- whether it deserves persistent map real estate.

Do not require a figure-eight. The question is whether the Moon has its **own compact, meaningful signature**.

## Recommendation at completion

The work item ends with exactly one of:

- **PROMOTE TO PRODUCTION DESIGN** — create only a **proposed** follow-up work item. Do not self-approve it.
- **KEEP AS EXPERIMENT / NEEDS MORE STUDY** — leave DEV fixtures if they remain useful; still no production config.
- **DO NOT PURSUE** — delete temporary experiment fixtures unless a tiny documented remnant is needed to record the negative result.

Do not add a lunar analemma/locus to [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) as planned merely because this experiment ran. That file already lists speculative "analemma variants."

## Acceptance criteria

1. A development-only lunar-locus experiment exists.
2. Every sample uses `sublunarPoint` (same function as Moon marker and lunar ground track); reference sample equals `sublunarPoint(now)`.
3. Initial sampling spans approximately one lunar orbital cycle (~27–30 lunar-day samples).
4. Mean lunar-day cadence is explicitly derived from the existing model, verified, and documented (24 h 50 m is only the sanity-check approximation).
5. Raw geographic sampling is rendered and evaluated.
6. A mean-motion / residual-longitude representation is rendered and evaluated; mathematics recorded.
7. At least dots-only and dots-plus-light-line treatments are compared.
8. At least three fixed epochs are visually compared; monthly `|latDeg|` envelopes for standstill candidates are checked against this model.
9. Quantitative latitude / residual ranges are recorded per epoch.
10. Dateline / wrap handling is correct for raw samples and residuals; wrap convention documented.
11. Existing production lunar ground track remains unchanged in behaviour (unless a shared wrap helper is extracted without changing output).
12. Production bundles remain free of experiment-only machinery; no Layers-tab toggle; no durable config schema for the experiment.
13. Cursor Browser visual inspection is actually performed per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).
14. Completion record contains screenshots/observations as permitted by that procedure, plus answers to the evaluation questions below.
15. `npx tsc --noEmit` is clean.
16. `npm test` has zero failures.
17. `npm run build` succeeds (DEV scenario registry is imported from `main.tsx` in DEV; confirm production `dist/` omits experiment-only ids/modules).
18. Work item concludes with **PROMOTE TO PRODUCTION DESIGN**, **KEEP AS EXPERIMENT / NEEDS MORE STUDY**, or **DO NOT PURSUE**.
19. Any follow-up production item is only `proposed`, never self-approved.
20. Development state returns according to the ratchet.

## Evaluation questions

Answer all of these in the completion record. Answer (11) conservatively.

1. Does raw lunar-day sampling produce a compact pattern?
2. Does removing mean longitudinal progression produce a compact locus?
3. Does the result form recognizable loops or another stable geometry?
4. Is the shape substantially more interesting than the existing lunar ground track?
5. Does it obscure materially less map area?
6. Does it remain visually meaningful at several epochs?
7. Does the 18.6-year cycle visibly alter its vertical amplitude or overall shape?
8. Is the current Moon's position within the locus intuitively understandable?
9. Is the visualization useful without explanatory labels?
10. Would you leave it enabled on an ambient Libration display?
11. Is there enough value to justify a production feature?

## Verification plan

- Focused tests:
  - Deterministic sampling times for a fixed epoch; exact sample count; reference sample equals `sublunarPoint(now)`.
  - Residual-longitude normalization to (−180°, +180°]; no false dateline jumps on a synthetic wrap sequence.
  - Geographic vs residual outputs are deterministic for a fixed UTC.
  - Production exclusion: scenario/experiment registry still loaded only inside an `import.meta.env.DEV` branch (`src/main.tsx` / `src/dev/visualScenarios.test.ts` pattern).
  - Existing lunar ground-track tests still pass without weakening.
  - No `Date.now()` in the experiment sampler.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — DEV visual scenario / experiment wiring touches the application entry-adjacent DEV import. Confirm production `dist/` does not contain `lunar-locus` or experiment-only module names.
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md). Iterative loop as above. Canonical 1920×1080 in Cursor's built-in browser.

Do not write pixel/golden tests.

## Documentation impact

- This work item’s completion record (authoritative experiment result).
- `docs/STATE.md` and `docs/DEVELOPMENT_LOG.md` on completion.
- `docs/ROADMAP.md` — remove this item from **Approved, not started** on activation/completion as workflow requires. Do not rewrite strategic "derived astronomical overlays" into a production commitment.
- `docs/VISUAL_VERIFICATION.md` — add `lunar-locus` to the catalog only if the fixture is kept after the verdict; if deleted, do not leave a stale catalog row.
- `docs/IMPLEMENTATION.md` — brief current-behaviour note only if DEV experiment code remains after completion; if removed, no implementation change to record.
- `docs/FUTURE_FEATURES.md` — do not mark a lunar analemma as planned. A promoted follow-up is a new **proposed** work item.

Do not create shipped-feature documentation for an unproven overlay.

## Completion record

**Implementation summary**

DEV-only lunar-locus experiment samples `sublunarPoint` at the model mean lunar-day cadence (derived from GMST and `Lp` rates in `src/core/sublunarPoint.ts`, not a hard-coded 24h50m). N = 28 points (`k = 0…27`) from paused product UTC. Residual longitude is `shortLonDeltaDeg(lon_0, lon_k)`. Geographic, residual, and 1:1 glyph modes plot the same wrapped positions when the cadence is correct. Scenario `lunar-locus` installs an extra overlay builder; the shell appends a `resolvedRenderPlan` layer below the Moon marker. No SceneConfig row, Layers toggle, or persistence. Production `dist/` omits the experiment.

**Sampling definition (cadence, N, span, residual formula)**

- Cadence: `meanLunarDayMsFromModel()` = `360 / (GMST_rate − Lp_rate_per_day) × 86400000` ms = **89428328.66 ms = 24:50:28.3**. Public 24h50m approximation differs by ~28 s.
- Constants: `LUNAR_MODEL_GMST_RATE_DEG_PER_DAY = 360.98564736629`, `LUNAR_MODEL_MEAN_LONGITUDE_RATE_DEG_PER_JULIAN_CENTURY = 481267.88123421`, century = 36525 days.
- N = 28 (27 intervals ≈ 27.95 mean solar days, ~one sidereal month).
- Residual: `δlon_k = (((lon_k − lon_0) + 540) % 360) − 180` via existing `shortLonDeltaDeg`.
- Glyph/residual plot: `(wrap(lon_0 + δlon_k), lat_k)` at 1:1 degrees; sample 0 coincides with the Moon.

**Commands run**

- `npx vitest run src/dev/lunarLocusExperiment.test.ts src/dev/lunarLocusPlan.test.ts src/dev/visualScenarios.test.ts src/core/lunarGroundTrack.test.ts src/core/lunarGroundTrackAppearance.test.ts`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `rg -l 'lunar-locus|lunarLocusExperiment|lunarLocusPlan' dist`
- Cursor Browser: `?scenario=lunar-locus` (glyph dots; glyph dots-line; geographic dots-line), `locusEpoch=standstill`, `locusEpoch=minor`, `?scenario=lunar-track`, `?scenario=readability`, `?scenario=baseline`, `http://localhost:1420/` (no query). Viewport `Emulation.setDeviceMetricsOverride` 1920×1080; CDP `innerWidth`/`innerHeight` 1920×1080 on `lunar-locus`.

**Actual results**

- Focused tests: 5 files / 42 passed
- `npx tsc --noEmit`: exit 0 (clean)
- `npm test`: 169 files / 1545 passed / 0 failed
- `npm run build`: `tsc && vite build` succeeded (`dist/assets/index-BYIEsD5m.js`)
- Production `dist/` contains neither `lunar-locus` nor `lunarLocusExperiment` / `lunarLocusPlan`

**Visual verification**

- Scenario: lunar-locus (glyph, dots)
- Viewport: 1920×1080 (CDP; `innerWidth`/`innerHeight` 1920×1080)
- Browser: Cursor built-in browser
- Inspected: banner id/UTC; compact dotted locus; Moon at the southern vertex; chrome unharmed
- Result: PASS
- Observations: banner `scenario: lunar-locus · 2026-01-16T22:00:00.000Z · persistence isolated`. Cool dots form a compact vertical figure in the South Pacific near 170°W; Moon glyph sits on the southern vertex; no world-spanning weave.

- Scenario: lunar-locus (glyph, dots-line)
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: connecting line, loops, Moon coincidence
- Result: PASS
- Observations: faint line reveals a figure-eight / self-crossing sequence. Current Moon remains the southern vertex. No dateline-spanning segment.

- Scenario: lunar-locus (geographic, dots-line)
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: raw vs residual/glyph coincidence at this epoch
- Result: PASS
- Observations: geographic plot matches the glyph at 2026-01-16 — expected once mean motion is removed by the lunar-day cadence.

- Scenario: lunar-locus `locusEpoch=standstill` (`2025-03-08T12:00:00.000Z`)
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: banner UTC; monthly |lat| envelope vs recent
- Result: PASS
- Observations: banner shows standstill UTC. Model envelope max |lat| ≈ 28.5° (vs ≈ 18.3° at minor). Same compact character, larger vertical amplitude.

- Scenario: lunar-locus `locusEpoch=minor` (`2015-09-16T12:00:00.000Z`)
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: banner UTC; reduced vertical amplitude
- Result: PASS
- Observations: banner shows minor-standstill UTC. Envelope max |lat| ≈ 18.3°. Shape remains a compact meridian-local locus, not a weave.

- Scenario: lunar-track (same UTC as default lunar-locus)
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: 48 h ground-track weave vs compact locus
- Result: PASS
- Observations: banner `scenario: lunar-track · 2026-01-16T22:00:00.000Z`. Nearly-horizontal cool track wrapping the map. The locus occupies far less area and reads as an instrument figure rather than a route.

- Scenario: readability
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: existing solar analemma for comparison
- Result: PASS
- Observations: banner `scenario: readability · 2026-06-21T12:00:00.000Z`. Solar analemma remains the warm year-long figure-8. Lunar experiment is similar in *role* (compact meridian locus) without copying the solar sampling rule.

- Scenario: baseline
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: experiment absent
- Result: PASS
- Observations: banner `scenario: baseline · 2030-06-15T12:00:00.000Z`. No lunar-locus overlay. Ordinary city pins and overlays unchanged.

- Ordinary startup: `http://localhost:1420/` (no `?scenario=`)
- Viewport: same tab after scenario work
- Browser: Cursor built-in browser
- Inspected: no scenario banner
- Result: PASS
- Observations: `location.search` empty; `hasBanner: false`; `document.body.innerText` started with Config.

**Quantitative notes by epoch**

Cadence 24:50:28.3 (89428328.66 ms); N = 28 for all.

| Epoch | Span | lat min/max | residual lon min/max | first–last angular ° | closes | monthly \|lat\| max |
|-------|------|-------------|----------------------|----------------------|--------|---------------------|
| recent 2026-01-16T22:00:00Z | → 2026-02-13T20:42:44Z | −28.27 / 28.16 | −5.44 / 9.79 | 0.89 | yes | 28.23 |
| standstill 2025-03-08T12:00:00Z | → 2025-04-05T10:42:44Z | −28.50 / 28.38 | −15.26 / 2.18 | 2.58 | yes | 28.54 |
| minor 2015-09-16T12:00:00Z | → 2015-10-14T10:42:44Z | −18.27 / 18.28 | −3.65 / 12.61 | 2.19 | yes | 18.28 |
| baseline 2030-06-15T12:00:00Z | → 2030-07-13T10:42:44Z | −22.64 / 22.70 | −9.05 / 7.59 | 0.65 | yes | 22.65 |

No false dateline jumps in plan segments (`|Δx| < width/2`). When the Moon sits near ±180° (baseline epoch), wrapped plot longitudes appear on both map edges — a display issue, not a cadence failure.

**Evaluation answers (1–11)**

1. Yes. Lunar-day sampling is already compact near one meridian.
2. Yes. Residual longitude spans ~15°, not a globe march.
3. Yes. Dots-line shows a stable figure-eight / self-crossing loop.
4. Yes. Much more interesting than the nearly-horizontal 48 h ground track.
5. Yes. A narrow meridian band vs a world-wrapping weave.
6. Yes. Same character at recent, standstill, and minor epochs.
7. Yes. Vertical amplitude ~±28.5° near major standstill vs ~±18.3° near minor standstill.
8. Yes. Current Moon sits on the locus (southern vertex at the recent epoch).
9. Partially. Recognizable if you already know the solar analemma; otherwise a mysterious dotted loop. The faint line helps. No labels were added (out of scope).
10. Conservatively no as a default ambient overlay. It would compete with the solar analemma for the same kind of map real estate.
11. Conservatively **not yet**. The geometry is real and worth keeping as a DEV experiment; a production feature needs a separate product decision.

**Recommendation**

KEEP AS EXPERIMENT / NEEDS MORE STUDY

DEV fixtures retained (`lunar-locus`). No production configuration. No proposed production follow-up created.

**Not verified**

- Temporal fade treatment (optional; dots and dots-line were sufficient)
- Live demo-time advance of the locus (scenario clock is paused; sampler is a pure function of `TimeContext.now`)
- Pixel-perfect Moon/sample-0 coincidence (visual alignment plus `sublunarPoint(now)` equality tests)

**Discovered, not done**

- Geographic and residual/glyph 1:1 plots coincide when the cadence is correct; the valuable contrast is vs the 48 h ground track, not A vs B.
- Near-dateline Moon positions split the compact figure across the left and right map edges. A production glyph might need a local unwrapped frame; not done here.
- Optional fourth epoch (`baseline` 2030-06-15) was computed quantitatively; not a primary visual pass.
- No production follow-up item drafted.

