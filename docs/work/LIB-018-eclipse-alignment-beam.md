# LIB-018 — Live eclipse alignment / beam presentation

| Field | Value |
|-------|-------|
| ID | LIB-018 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized fifth Eclipse System implementation slice (E5). Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not implement E6+ (config completeness, labels, event list, lunar forecast map).

## Objective

During an active eclipse, visually emphasize the actual Sun–Moon–Earth alignment using the existing Sun/Moon glyph language plus a configurable projected beam/alignment effect tied to authoritative eclipse geometry. The effect may be dramatic, but it remains a semantic geographic visualization, not a literal 3D ray and not eclipse truth.

## Scope

**In scope**

- Semantic `EclipseAlignmentPresentation` derived from the existing `EclipseFrame` plus ambient glyph positions.
- Solar: tapered alignment field from the Sun/Moon glyph area to the live E1 umbra (total) or antumbra (annular). Partial-only: no fabricated central target.
- Lunar: distinct Sun→Earth→Moon axis/field from E3 Earth-shadow state. Not a solar-style terrestrial path.
- Active-event only; product-time driven; independently disableable.
- Strength from authoritative live geometry, not reference-city magnitude.
- Minimal durable controls (master, solar, lunar, intensity).
- Focused tests, type-check, full suite, build, Cursor visual verification.

**Out of scope**

- E6 config completeness, labels, event list/browser, lunar forecast map, notifications.
- Glyph authority snapping, eclipse-induced solar-shading hacks, particles, audio, WebGL.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0008](../decisions/0008-bundled-nasa-solar-eclipse-authority.md), [ADR 0009](../decisions/0009-cached-solar-eclipse-event-corridor.md), [ADR 0010](../decisions/0010-eclipse-events-global-circumstances-derived.md).
- Intended structure: [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) §11, §18 E5.
- Predecessors: [LIB-014](LIB-014-solar-eclipse-live-footprint.md) through [LIB-017](LIB-017-reference-city-eclipse-circumstances.md).
- Do not reopen eclipse authority, event discovery, contact solving, or global/local semantics unless a genuine defect is found.

## Acceptance criteria

- Active solar and lunar eclipses gain an optional alignment presentation derived from existing authority geometry.
- Solar total targets live umbra; annular targets live antumbra; partial-only does not fabricate a central beam.
- Lunar communicates Sun→Earth→Moon, not a terrestrial eclipse path.
- Active-only; forecast-only events show no beam; product UTC drives geometry; pause freezes; jumps reconstruct.
- Reference city does not change beam geometry, strength, target, or event identity.
- Moon-over-Sun overlap rule remains global and intact.
- Beam disable leaves eclipse geography intact; eclipse-layer disable removes the corresponding beam.
- RenderPlan/Canvas remain astronomy-neutral.
- No E6+ behaviour.

## Verification plan

- Focused tests: alignment builder, solar/lunar semantics, strength, config/persistence, global/local independence, glyph order, product time, layer emission
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — presentation, config, scenarios, production containment
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) for total/annular/partial solar, total/partial lunar, dateline, intensity, time progression

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/ROADMAP.md`](../ROADMAP.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: evaluate whether “alignment is presentation, not truth” needs a record beyond the spec.

## Completion record

**Implementation summary**

Semantic `buildEclipseAlignmentPresentation` sits downstream of `EclipseFrame` and ambient glyph positions, upstream of existing solar/lunar `equirectRegionOverlay` fills/strokes. Canvas stays astronomy-neutral. Solar total/annular: tapered warm ribbon from the Sun/Moon glyph cluster to the live umbra/antumbra. Partial-only: local glyph bloom, no fabricated terrestrial target. Lunar: cool Sun→Earth→Moon axis toward the Moon glyph from E3 Earth-shadow state, not a terrestrial path. Active-only; product-time driven; strength from live geometry (`alignmentStrength01` / lunar phase+magnitudes), never reference-city magnitude. Durable `scene.eclipseAlignment`: master / solar / lunar default on, intensity `normal`. No new ADR — spec §11 already owns “alignment is presentation, not truth.” No E6+.

**Commands run**

- `npx tsc --noEmit` — clean (exit 0)
- Focused alignment/config/layer tests — green during implementation
- `npm test` — 191 files / 1777 passed / 0 failed (27.06s)
- `npm run build` — succeeded (`dist/assets/index-WGXh1LID.js` 1,306.87 kB). `visualScenarios`, `solar-eclipse-total`, `lunar-eclipse-total`, and `observerCity` absent from `dist/`
- `npx vitest run src/core/eclipse/eclipseAlignmentPresentation.test.ts` — 22 passed; performance loop 40 rebuilds in 7 ms (~0.18 ms/build)
- Cursor Browser visual verification of total/annular/partial solar, dateline, forecast-only, total/partial lunar, Tokyo vs Knoxville, intensity, 7200× demo progression, ordinary startup

**Actual results**

Partial-only solar semantics (chosen, honest): omit a converging central beam; emit `solar-partial-field` bloom around the Sun/Moon pair with `target: null` and no axis stroke. Partial geography remains primary.

Performance (this machine): alignment presentation rebuild from already-resolved live geometry ~0.18 ms mean over 40 iterations; does not resample the E2 forecast corridor.

**Visual verification**

Viewport: `Emulation.setDeviceMetricsOverride` 1920×1080. Cursor Browser panel crops the physical canvas (Americas-heavy). Full-page CDP captures were used where the crop hid Europe/Asia/Pacific edges.

```text
URL: http://localhost:1420/?scenario=solar-eclipse-total
Viewport: requested 1920×1080
Scenario banner: solar-eclipse-total · 2024-04-08T18:17:15.000Z · persistence isolated
Inspected: Mexico/US/Canada corridor, live umbra, beam, Moon-over-Sun
Result: PASS
Observations: warm tapered amber ribbon from overlapping Sun/Moon glyphs (Moon above Sun) to the live Pacific/Mexico umbra. Corridor and partial region remain readable. Map visible through the beam. Not a neon laser.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-annular
Inspected: antumbra target; same visual family; not totality styling
Result: PASS
Observations: 2023-10-14T17:59:27.300Z. Same warm ribbon family aimed at the live antumbra. Amber E1 footprint and white corridor remain distinct. No false totality styling.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-partial
Inspected: no fabricated central beam
Result: PASS
Observations: 2022-10-25T11:00:06.900Z. Americas crop hides Europe/Asia glyphs. Full 1920×1080 capture: no world-spanning central ribbon. Builder emits solar-partial-field only. Partial region remains primary geography.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-dateline
Inspected: wrap; no false world-spanning beam
Result: PASS
Observations: 2016-03-09T01:57:09.400Z. Thin corridor in the Pacific; no giant amber beam crossing the Americas. Local beam sits with the short-arc umbra/glyph cluster near 149°E (edge/wrap), not a wrong-side crossing.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-forecast
Inspected: forecast-only has no beam
Result: PASS
Observations: 2024-04-03T18:00:00.000Z. Purple/white corridor Mexico→US→Canada; Sun and Moon glyphs separate; no alignment ribbon.
```

```text
URL: http://localhost:1420/?scenario=lunar-eclipse-total
Inspected: totality Moon, visibility region, lunar axis, libration
Result: PASS
Observations: 2022-05-16T04:11:29.000Z. Moon over southern South America with reddish-brown Earth-shadow and light libration ring. Cool charcoal/blue-gray tapered axis toward the Moon (not a terrestrial path). Americas visibility region and city pins remain readable.
```

```text
URL: http://localhost:1420/?scenario=lunar-eclipse-partial
Inspected: weaker axis; no false totality
Result: PASS
Observations: 2008-08-16T21:10:06.000Z. Sun glyph on the day side (Pacific). Lunar axis on the night/Atlantic side: layered cool core, no red totality wash. Visibility limit remains. Weaker than the 2022 total axis.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-total&observerCity=tokyo
     then ?observerCity=knoxville
Inspected: reference-city independence
Result: PASS
Observations: identical amber-pixel count (280) and mean RGB (214,188,157) at the same UTC. Beam still targets the live umbra. Only local chrome/details are allowed to differ.
```

```text
Interaction: Layers — Alignment intensity Subtle / Dramatic; Eclipse alignment effects off
Inspected: intensity usefulness; beam disable vs geography
Result: PASS
Observations: Dramatic remains readable (layered amber, map and corridor visible). Master off removed the beam while Solar eclipses stayed on (DOM checkbox before=false). Intensity select persists in the panel (Subtle / Normal / Dramatic).
```

```text
Interaction: Data tab — demo start 11:50:15 AM Knoxville, reset; resume 7200×; pause
Inspected: appear at active start, move with footprint, freeze, disappear after event
Result: PASS
Observations: Direct jump to 11:50 AM reconstructed a weaker early beam (glyphs over northern South America). Resume changed the control to Pause (product-time playback, no independent animation clock). After accelerated playback the live ribbon was gone while ordinary night/shading remained. Forecast-only scenario already showed no beam.
```

```text
URL: http://localhost:1420/
Inspected: ordinary startup; no scenario leakage
Result: PASS
Observations: body text is Config only — no scenario banner. Terminator + city pins; no eclipse beam.
```

**Not verified**

- Dedicated named visual scenario for a penumbral-only lunar event (automated strength mapping covered; no extra DEV scenario added).
- Dedicated named visual scenario for 2021-12-04 polar (automated short-arc wrap test covered).
- Pixel-perfect intensity Subtle vs Normal vs Dramatic side-by-side on an uncropped physical 1920×1080 display. Cursor panel crops the canvas.
- Continuous wall-clock watch of every minute of the 2024 event (accelerated 7200× plus jumps used instead).

**Discovered, not done**

- E6 still owns labels, event list/browser, full style editor, and configuration completeness.
- Eclipse-induced ambient solar-shading / atmospheric light remains future, not E5.
