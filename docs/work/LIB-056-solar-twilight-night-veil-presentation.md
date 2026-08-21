# LIB-056 — Solar twilight / night-veil presentation refinement

| Field | Value |
|-------|-------|
| ID | LIB-056 |
| Status | complete |
| Created | 2026-08-20 |
| Approved | 2026-08-20 (human; this request) |
| Completed | 2026-08-20 |

Human-authorized follow-on to the prior diagnostic that concluded **NO DEFECT — SOLAR TWILIGHT DOMINATES**. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Keep solar altitude as the physical authority and experiment with the **visualization transfer** `solarAltitudeDeg → nightVeil01` so the equirectangular day/night transition reads as gradual twilight rather than a narrow dark stripe, without moving astronomy, adding blur, or exposing curve mathematics as user configuration.

## Scope

**In scope**

- Record the current smootherstep(+4° → −18°) baseline at the three previously investigated product times and at scientific twilight anchors.
- Implement candidate monotonic transfer functions behind DEV/diagnostic selection only; production stays on the current curve until this item selects otherwise.
- Quantitative comparison (alpha, slope, 20→80 / 20→120 spans, longitude spans, full-night alpha, temporal continuity, max-slope altitude).
- Visual comparison in Cursor Browser, including accelerated Demo playback.
- Moonlight composition regression without redesigning lunar policy; stop if a genuine composition defect appears.
- Lunar eclipse footprint independence regression (geometry, event-static behaviour, forecast, color/thickness, no fill, ON/OFF vs illumination).
- Select keep-current **or** one refined factory curve. If adopting: a small pure function, one coherent presentation, no user-facing curve editor.
- Tests, type-check, full suite, build, documentation of the outcome.

**Out of scope**

- Reopening settled astronomy (lunar-horizon, phase strength, raster registration, sampling origin, smoothing, eclipse geometry) unless measurements contradict the prior investigation.
- Raster blur, Gaussian filtering, lowering raster resolution, a second raster, screen-pixel feathering, moving the terminator, or changing projection.
- User configuration for curve type, gamma, twilight endpoints, control points, or arbitrary opacity curves.
- Redesigning moonlight, emissive lights, or eclipse illumination policy unless a real defect is found.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant; product semantics upstream of `RenderPlan`; backends do not decide product behaviour.
- [ADR 0002](../decisions/0002-single-upstream-planetary-illumination-rasterpatch.md) — one world-anchored illumination `rasterPatch`.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md) — `TimeContext.now` is the only clock.
- [ADR 0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) — moonlight transmission is physical illumination; footprint is informational overlay.
- [ADR 0012](../decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md) — solar eclipse transmission composes into remaining daylight (`1 − nightVeil`).
- Pipeline: `TimeContext.now` → solar geometry → solar altitude → night-veil transfer → existing solar/lunar composition → one `rasterPatch` → Canvas.
- No new ADR expected if this remains a presentation refinement under the existing illumination authority.

## Acceptance criteria

1. Current behaviour is reproduced and recorded at UTC `2026-08-21T00:57:00.000Z`, `2026-08-24T04:34:00.000Z`, and `2026-09-09T03:53:00.000Z` (Knoxville HUD times as specified), including alpha-vs-altitude and anchors +4° / 0° / −6° / −12° / −18°.
2. Candidates compared: current smootherstep; a more perceptually even monotonic smooth mapping; a C1 twilight-anchored piecewise curve; and one additional well-justified monotonic easing. No seams, no time buckets, no user-facing curve UI.
3. Quantitative comparison includes overlay alpha, slope, 20→80 and 20→120 spans, equator and Knoxville longitude spans, full-night alpha, temporal probe continuity, and altitude of maximum slope.
4. Visual comparison covers the three baseline dates, equinox-like and solstice-like geometry, high latitudes, quarter / gibbous-full / near-new Moon, lunar and solar eclipse, and at least one full-world view.
5. Moonlight gates are checked against each candidate; a trough made worse is documented and stops lunar-policy changes in this item.
6. Lunar eclipse footprint geometry hash, event-static behaviour, forecast horizon, color/thickness, line-only presentation, and illumination independence are unchanged.
7. This item either keeps the current curve with a recorded reason, or adopts one simple deterministic factory transfer. Existing high-level illumination configuration continues to work.
8. Accelerated in-browser Demo playback is visually continuous (no alpha pops).
9. Illumination-frame cost is not materially increased; no workers, extra clocks, or extra world rasters.
10. `npx tsc --noEmit` clean; `npm test` zero failures; `npm run build` succeeds with no DEV curve-selector leakage as user configuration.

## Verification plan

- Focused tests: night-veil transfer (endpoints, monotonicity, continuity, representative altitudes, temporal steps); illumination sampling (full-night alpha, day-side, moonlight, lunar transmission, solar eclipse); footprint independence; raster stability
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — DEV scenario / transfer override must not appear as production user configuration
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — if production transfer changes, or to record that it did not
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — if a DEV scenario is added
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — only if comparison shows legitimate multi-presentation user value
- ADR: none expected; confirm from architecture

## Completion record

**Implementation summary**

Adopted a twilight-anchored C1 monotone cubic as the factory `solarAltitudeDeg → nightVeil01` transfer. Solar altitude, terminator geometry, moonlight policy, eclipse illumination, footprint geography, and the single `rasterPatch` path are unchanged. The previous smootherstep(+4° → −18°) concentrated its steepest slope at −7° (~5.1° of altitude for overlay alpha 20→80). The factory curve samples veil 0 / 0.10 / 0.32 / 0.70 / 1 at +4° / 0° / −6° / −12° / −18°, peak slope ~0.0685/deg at −9.35°, alpha 20→80 span 8.15°. Overlay alpha remains `nightVeil01 × 0.62`. No user-facing curve configuration. No new ADR (presentation refinement under ADR 0002). DEV `?scenario=twilight-presentation` plus `nightVeilCurve=` remain diagnostic-only.

**Commands run**

- Focused: `npx vitest run src/core/nightVeilFromSolarAltitude.test.ts src/dev/visualScenarios.test.ts src/renderer/nightVeilPresentationRegression.test.ts` — 75 passed (later 29+7 after production switch)
- `npx tsc --noEmit` — clean
- `npm test` — 252 files / 2361 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-LnGe86DQ.js` 1,535.29 kB gzip 383.93 kB). `visualScenarios`, `twilight-presentation`, `nightVeilCurve`, and `?scenario=` absent from `dist/`

**Actual results**

Type-check clean. Full suite green. Production bundle has no DEV scenario registry. Factory transfer is `twilightAnchored`. Two existing tests that used smootherstep-era numeric floors (raster alpha ≥157 as “night”; April 2026 sublunar moonlight delta ≥22) were retargeted to solar-altitude night classification and to the weaker nautical/astro moonlight overlay gate; lunar policy was not changed. Deep-night Knoxville moonlight lift stayed in the historical band.

**Visual verification**

Cursor Browser, `http://localhost:1420/`. Viewport limitation: Cursor pane ~774×769 CSS (canvas ~744×770 CSS, dpr ~1.30), not 1920×1080.

Compared at identical UTCs:

- Case C `?scenario=twilight-presentation&twilightCase=c` (2026-09-09T03:53Z, HUD 8 Sep 11:53 PM Knoxville, near-new Moon): smootherstep showed a conspicuous dark curtain through the Americas; twilightAnchored widened and lightened that band; linearSmooth and cubic smoothstep still looked stripe-like at −7° (veil still 0.50 there).
- Equinox `?scenario=terminator`: vertical terminator readable on both limbs; twilightAnchored softer/wider than smootherstep; Australia more readable; day/night still distinct; no four-band artifact.
- Case A `twilightCase=a` (2026-08-21T00:57Z, 8:57 PM Knoxville) and case B `twilightCase=b` (2026-08-24T04:34Z, 12:34 AM): gradual evening transition; case B moonlight lifts Pacific night without a worse trough. Upcoming lunar-eclipse footprint geometry unchanged vs the solar band (event-union vs current night — legitimate).
- Solstice `?scenario=night`: tilted terminator, Antarctic daylight / Arctic night, gradual twilight.
- Full / quarter / new Moon (`moon-libration` epochs): moonlight lifts deep night when the Moon is up; near-new reduces to solar-only darkness.
- `lunar-eclipse-total`: static visibility footprint line independent of twilight; Earth-shadow on the Moon; attenuated moonlight.
- `solar-eclipse-2017` GE: umbra/corridor/beam coherent; eclipse darkening in daylight; night unchanged.
- Accelerated Demo: Data → Playback speed 21600× → Resume. HUD advanced Sep 8 11:53 PM → Sep 18 3:02 PM → Sep 23 10:32 PM; twilight followed the Sun with no alpha pops or time buckets.

**Not verified**

Exact 1920×1080 CSS viewport. Pixel-perfect screenshot diffs. Production `dist/` runtime (bundle inspection only). High-latitude close-ups beyond the full-world solstice scene. Performance counters (transfer remains a handful of arithmetic ops per sample).

**Discovered, not done**

The existing moonlight overlay still multiplies by `smoothstep(0.45, 0.95, nightVeil01)`. With the new curve that gate opens later in nautical twilight than under smootherstep, so moonlight lift near −12° is weaker while deep night is unchanged. Visual comparison did not make the trough more conspicuous. Lunar policy was left alone (Phase 5). Not a product-config follow-up.

## Answers

1. **What caused the original stripe?** The smootherstep(+4° → −18°) night-veil transfer. Max slope 0.085/deg at solar altitude −7°, with overlay alpha 20→80 spanning only 5.12° of altitude (~5.1° longitude at the equator, ~6.3° at Knoxville).
2. **Was anything astronomically wrong?** No. Geometry, terminator, twilight anchors, moonlight, and eclipses were already correct.
3. **Which curves were evaluated?** `smootherstep` (historical); `linearSmooth` (C1 quadratic caps, even middle); `twilightAnchored` (C1 monotone cubic at twilight samples); cubic `smoothstep`.
4. **Which curve was selected?** `twilightAnchored`. The others still put veil ≈ 0.50 at −7° (same darkness as the old peak). This one is 0.375 there and finishes settling through nautical/astronomical twilight.
5. **How much wider is the meaningful visual transition?** Alpha 20→80: 5.12° → 8.15° altitude (59% wider; equator 8.15° lon, Knoxville ~10.1°). Alpha 20→120: 8.26° → 12.22°.
6. **Where is its steepest gradient now?** ~−9.35° (nautical twilight), peak 0.0685/deg vs 0.0852/deg at −7°.
7. **Strong moonlight?** Lifts deep night; no worse trough. Overlay gate is weaker near −12° (see Discovered).
8. **Near new Moon?** Reduces to solar-only shading (case C and `librationEpoch=new`).
9. **Lunar eclipse footprint geometry?** Unchanged (hash independent of the transfer). Line-only; no fill.
10. **Eclipse illumination?** Unchanged composition: solar eclipse still darkens remaining daylight only; lunar transmission still attenuates moonlight; settled night not further darkened.
11. **Accelerated Demo?** Yes — 21600× in-browser, visually continuous.
12. **Deliberately left unchanged?** Solar/lunar geometry; NIGHT_DARKEN 0.62; atmospheric tint; moonlight policy table; eclipse astronomy; footprint; raster resolution/blur; projection; user illumination config; no new ADR.
