# LIB-007 — Production lunar locus overlay

| Field | Value |
|-------|-------|
| ID | LIB-007 |
| Status | complete |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (human) |
| Completed | 2026-08-14 |

Human-authorized production promotion of the [LIB-006](LIB-006-experimental-lunar-locus.md) experiment. Authorized to create, approve, activate, and execute in the same request.

## Objective

Ship a production **Lunar locus** overlay: a compact, line-only figure traced by `sublunarPoint` once per mean lunar day across approximately one lunar orbital cycle. The existing Moon marker is the only artifact on that path. Visual construction should match the solar analemma family (weight, continuity) with a restrained dark lunar color, not the white lunar ground track.

## Scope

**In scope**

- Layers-tab **Lunar locus** toggle, default **off**, persisted via existing SceneConfig dual surface.
- Independent of Moon marker, lunar ground track, and solar analemma.
- Line-only rendering (no dots, ticks, labels, or sample markers).
- Same `sublunarPoint` model as Moon marker / ground track; LIB-006 mean lunar-day cadence promoted into `src/core/`.
- Cycle centered on product time (~half cycle before + now + half after), ~28 samples, closed within LIB-006 tolerance.
- Smooth interpolation of those samples (not a 27-day high-frequency ground track).
- Dateline/world-wrap with existing short-strip utilities plus wrapped copies so the figure stays associated with the Moon.
- Cache so paused time is stable and identical geometry is not rebuilt every animation frame.
- DEV `?scenario=lunar-locus` uses the **production** overlay; keep epoch query param for verification.
- Tests, Cursor Browser visual verification, IMPLEMENTATION / VISUAL_VERIFICATION / STATE / log updates.

**Out of scope**

- User controls for cadence, sample count, color, width, or standstill mode.
- Dots/ticks/labels; standstill envelopes; solar analemma redesign; lunar ground-track redesign; ephemeris change; renderer redesign.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one UTC instant; product semantics upstream; `RenderPlan` boundary; `SceneConfig` authority.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md).
- Cursor rules `010`, `020`, `060`.

```
TimeContext.now
→ sample sublunarPoint at mean lunar-day offsets (centered on now)
→ residual/geographic locus + closed smooth polyline (core)
→ layer payload
→ RenderPlan line primitives (solar-analemma weight, lunar stroke)
→ existing backend execution
```

Canvas backend must not learn lunar-day, standstill, or product-time semantics. No `Date.now()` in the sampler.

### Binding decisions

- **Cadence:** promote `meanLunarDayMsFromModel()` from LIB-006 (GMST − `Lp` rates in `sublunarPoint.ts`).
- **Samples:** N = 28, `k = −13 … +14` mean lunar days from `now` (current Moon is `k = 0`).
- **Plot:** geographic `sublunarPoint` samples; interpolate in residual (`δlon`, lat) so the dateline does not split the spline. 1:1 degrees; no unequal stretch.
- **Smoothing:** centripetal Catmull-Rom through residual samples, ~12 subdivisions per span, closed. Do not sample `sublunarPoint` more densely in time (that reintroduces the weave).
- **Stack:** `lunarLocus` immediately before `sublunarMarker` (Moon on top). Product `sublunarLocus`. Default off.
- **Style:** same stroke width formula as solar analemma (`1.2 + 0.95 * veil`); restrained slate-blue from the Moon glyph (`#5a7294` starting point, tune in browser). Not white, not analemma warm.
- **Cache:** 1-second product-time bucket (paused stability); current sample always live `sublunarPoint(now)`.
- **DEV:** `lunar-locus` enables the production layer. Remove experiment-only mode/treatment overlay. Keep `locusEpoch=`.

## Acceptance criteria

1. Production Lunar locus toggle in Layers; default off; persists; old configs normalize to off.
2. Independent of Moon marker, lunar ground track, and solar analemma.
3. Line only; Moon lies on the locus to model tolerance.
4. Mean lunar-day cadence derived from the model; ~one orbital cycle; standstill-era epochs differ in vertical extent without a standstill switch.
5. Dateline: no false world-spanning segment; Moon stays associated with the local figure.
6. Path looks smooth at 1920×1080; color readable on day and night substrates; distinct from solar analemma and lunar ground track.
7. Animates with product time; paused demo is stable; no redundant full rebuild every frame when `now` is unchanged.
8. Backend has no lunar-day/standstill logic; production bundle has no experiment selectors.
9. `npx tsc --noEmit` clean; `npm test` zero failures; `npm run build` succeeds.
10. Cursor Browser visual verification as specified in this item.

## Verification plan

- Focused tests: config default/normalize/round-trip/independence; sampler cadence/count/Moon coincidence/close/standstill envelopes/time identity; plan wrap (`|Δx| < width/2`); disabled emits nothing; factory product `sublunarLocus`.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — scene stack + DEV scenario wiring.
- Visual verification: required — recent, standstill, minor, dateline/baseline epoch, animation/pause, daylight, night, both analemmas, locus+ground track, disabled.

## Documentation impact

- `docs/IMPLEMENTATION.md` — overlay in the stack, sampling, wrap, cache.
- `docs/VISUAL_VERIFICATION.md` — `lunar-locus` as production overlay fixture.
- `docs/STATE.md`, `docs/DEVELOPMENT_LOG.md`, this completion record.
- `docs/ROADMAP.md` — no production-commitment rewrite of speculative analemma variants.

## Completion record

**Implementation summary**

Promoted LIB-006 mean-lunar-day sampling into `src/core/lunarLocus.ts` and shipped a production Layers overlay **Lunar locus** (default off). Scene product `sublunarLocus` sits immediately under the Moon marker. Rendering is line-only: residual Catmull-Rom polyline → `RenderPlan` lines with solar-analemma stroke weight and lunar stroke `#6e849e`, plus ±360° wrapped copies. DEV `?scenario=lunar-locus` enables the production layer; experiment dots/modes/extra-overlay builder were removed.

**Geometry / cadence**

- Cadence: `meanLunarDayMsFromModel()` = 360 / (GMST_rate − Lp_rate_per_day) × 86400000 ms ≈ **89428328.66 ms** (24 h 50 m 28.3 s). Not a hard-coded 24h50m.
- Samples: N = 28, `k = −13 … +14` mean lunar days from `TimeContext.now` (current Moon is `k = 0`).
- Span: 27 cadence steps ≈ 27.95 days (~one sidereal month). First–last closes within 8°.
- Plot: residual `(δlon, lat)` relative to the live Moon, interpolated closed centripetal Catmull-Rom (12 subdivisions/span → 336 points), drawn as unwrapped `lon0 + δlon`.
- Cache: non-current samples per 1-second product-time bucket; `k = 0` always live `sublunarPoint(now)`.

**Final line style and color**

- Width: `1.2 + 0.95 * veil` (same formula as the solar analemma). Default butt caps (same as analemma).
- Alpha: `min(0.92 * op, 0.5 * op + 0.32 * veil * op)` (same as analemma).
- Color: `#6e849e` (rgb 110, 132, 158). Started at `#5a7294`; lightened after night-ocean inspection. Not white, not analemma warm, not ground-track `#aacdf0`.

**Standstill comparison (same sampler, no standstill switch)**

| Epoch | lat min/max | extent |
| recent 2026-01-16T22:00:00Z | −28.26 / 28.16 | 56.42° |
| standstill 2025-03-08T12:00:00Z | −28.58 / 28.55 | 57.13° |
| minor 2015-09-16T12:00:00Z | −18.27 / 18.17 | 36.44° |
| baseline 2030-06-15T12:00:00Z | −22.64 / 22.79 | 45.43° |

**Commands run**

- `npx tsc --noEmit`
- `npx vitest run` (focused lunar-locus files, then full `npm test`)
- `npm run build`
- `rg lunar-locus|lunarLocusExperiment|locusMode|locusTreatment|locusEpoch dist`

**Actual results**

- `npx tsc --noEmit`: exit 0
- `npm test`: 170 files / 1560 passed / 0 failed
- `npm run build`: succeeded (`tsc && vite build`, 269 modules)
- Production `dist/` contains none of `lunar-locus`, `lunarLocusExperiment`, `locusMode`, `locusTreatment`, `locusEpoch`

**Visual verification**

Cursor Browser, `Emulation.setDeviceMetricsOverride` 1920×1080; CDP `innerWidth`/`innerHeight` 1920×1080 on `lunar-locus`.

- Scenario: lunar-locus (recent) — compact figure-eight in South Pacific; Moon on southern vertex; line-only slate stroke; no dots.
- Scenario: lunar-locus `locusEpoch=standstill` — taller vertical excursion (~±28.5°).
- Scenario: lunar-locus `locusEpoch=minor` — contracted (~±18°); initially too faint on night ocean at `#5a7294`.
- Color correction → `#6e849e`; reinspect recent: still restrained, readable on daylight ocean.
- Scenario: lunar-locus `locusEpoch=baseline` (Moon ~176°E) — compact figure at the dateline wrap copy; no world-spanning segment. Plan tests assert `|Δx| < width/2`.
- Layers: **Lunar locus** checkbox present and checked in the scenario; independent of Moon / ground track / analemma.
- Coexistence: solar analemma (warm) + lunar ground track (light `#aacdf0` ticks) + locus (dark slate) all on; distinguishable; clutter acceptable.
- Animation: Data tab resume at 86400×; Moon moved from southern vertex onto the northern part of the figure; Pause left geometry stable.
- Disabled: unchecking Lunar locus removed the compact figure; Moon and other overlays remained.
- Scenario: night + Lunar locus enabled — figure readable on dark ocean (veil lift); not electric cyan.
- Ordinary `http://localhost:1420/` — no scenario banner.

**Not verified**

- Unpaused wall-clock real-time mode (demo pause/resume only).
- Continuous 18.6-year nodal animation (epoch snapshots used).
- Simultaneous visual confirmation of both dateline edge copies in one screenshot (geometry + wrap tests cover no spanning segment).

**Discovered, not done**

- Solar ground track; standstill envelopes; user-facing cadence/color/width controls.
- Automatic collision avoidance when solar analemma and lunar locus overlap.
- The unused generic DEV extra-overlay hook remains in `visualScenarioRuntime.ts` (no builder installed).
