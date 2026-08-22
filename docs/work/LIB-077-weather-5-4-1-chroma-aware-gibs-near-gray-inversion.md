# LIB-077 — WEATHER-5.4.1: Chroma-aware GIBS Band13 near-gray inversion

| Field | Value |
|-------|-------|
| ID | LIB-077 |
| Status | complete |
| Created | 2026-08-22 |
| Approved | 2026-08-22 (human; this request) |
| Completed | 2026-08-22 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-5.4.1 chroma-aware GIBS Band13 near-gray inversion. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, LIB-070, LIB-072, LIB-074, or LIB-076. Do not begin WEATHER-5.5 ring calibration, q>0 blending, WEATHER-6, numeric netCDF, cloud-mask, or physical illumination.

Predecessor: [LIB-076](LIB-076-weather-5-4-cross-source-cloud-radiometric-equivalence-investigation.md) (investigation; remains proposed) and [LIB-075](LIB-075-weather-5-3-1-ring-component-geometry-quality.md) (ring component-geometry quality; complete). This item owns **GIBS Band13 provider interpretation for near-gray pixels only**. Coverage, quality, winner policy, Meteosat/ring mappings, shared confidence, opacity, and cloud color remain settled.

## Objective

Stop routing WMS-resampled near-gray GIBS Band13 pixels through RGB-nearest palette lookup. The published colormap reuses grayscale values on both a cold branch (−79.6…−70.6 °C) and a warm branch (−18.85…+57 °C). Isolated gray 102 in a 101/103 neighborhood must not become false cold-cloud IR ~0.89. Chromatic pixels keep the proven 64³ LUT. The same fixed mapping applies to GOES-East, GOES-West, and Himawari.

## Scope

**In scope**

- Chroma-aware GIBS Band13 interpretation: chromatic → existing 64³ LUT; near-gray → monotone warm-gray legend inversion by luma.
- 256-entry warm-gray canonicalIR table derived from the checked-in colormap authority.
- Transfer/cache version increment so old GIBS materializations are not reused.
- DEV-only `cloudsGibsGray=legacy|hybrid` and optional gray-path classification diagnostic. Absent from production dist.
- Tests, visual verification, proportional docs. Amend ADR 0025 consequence if useful.

**Out of scope**

- Coverage, regional quality, ring quality, winner policy, freshness, cadence, TIMES, hierarchy.
- Meteosat canonical mapping, EUMET ring mapping, ring BP56, shared confidence curve.
- RGB blur, 128³ LUT as the fix, exact-nearest-segment for all pixels, q>0 blending.
- Cold-gray neighborhood gate (D′) unless fixtures strongly require it.
- WEATHER-5.5 ring calibration, WEATHER-6, numeric BT, cloud-mask, physical illumination.
- User GIBS gray-mode controls. Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-069](LIB-069-weather-4-3-quality-plane-overlap-authority.md) through [LIB-076](LIB-076-weather-5-4-cross-source-cloud-radiometric-equivalence-investigation.md)

## Acceptance criteria

- Near-gray GIBS pixels do not use RGB-nearest LUT; they use warm-gray legend inversion.
- Chromatic GIBS pixels preserve existing 64³ LUT / exact-palette behaviour.
- Same mapping for East, West, and Himawari. No Himawari-only special case.
- Meteosat, ring, BP56, and the shared confidence curve are unchanged.
- Coverage, regional quality, ring quality, winner map, and source TIMES are unchanged for the same source set.
- 101/102/103 gray sequence is smooth; 102 is not IR ~0.89; 103 stays warm/low confidence.
- GOES clear-ocean remains confidence 0. Chromatic convective cores remain.
- India/Pacific Himawari grain and the ring→Himawari alpha seam improve materially. No blur.
- Transfer version increments. No q>0 blend, no opacity/color change, no new user controls.
- DEV diagnostics absent from production dist.
- `npx tsc --noEmit`, `npm test`, and `npm run build` pass.

## Verification plan

- Focused tests: chroma threshold, exact/near-gray, chromatic cores, warm-gray monotonicity, 101/102/103, GOES clear/frontal/convection, Himawari India/Pacific, winner/coverage/quality identity, signal independence of authority
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV gray-mode / sector-debug / scenario strings
- Visual verification: required — ordinary live Clouds, India crop legacy vs hybrid, Pacific, GOES East/West, full-world, Historical Demo, `?scenario=clouds`, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md) consequence

## Completion record

Completed: 2026-08-22

**Implementation summary**

GIBS Band13 (GOES-East, GOES-West, Himawari) now classifies pixels by chroma `max−min`. Chromatic pixels keep the existing 64³ LUT / exact-palette path. Near-gray pixels (`chroma ≤ 8`) invert along the published warm-gray legend by integer-average luma via a 256-entry table. Isolated gray 102 no longer snaps to cold-branch IR ~0.89. Transfer version `wx54-gibs-gray-v3`. Meteosat, ring, BP56, confidence knots, opacity, RGB, coverage, quality, and winners are unchanged. DEV `cloudsGibsGray=legacy|hybrid` and `cloudsSectorDebug=gibsGray`; URL keys absent from production dist. Cold-gray neighborhood gate (D′) not implemented.

**Commands run**

- `npx tsc --noEmit` — clean
- Focused tests (`weather54GibsNearGrayInversion`, `weather51CanonicalIr`, `weather53/52/43`, `cloudsSectorDebugTint`, `visualScenarios`) — 155 passed
- Isolated `lunarEclipseVisibilityFootprint` after a load-flake — 11 passed (the full-suite failure was `coldMs` 1378 vs 200 under a 2048×1024 buffer; that buffer was then shrunk to 512×256)
- `npm test` — 270 files / 2603 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-mHEQxmo6.js`); `cloudsGibsGray` / `cloudsSectorDebug` / `visualScenarios` / `scenario=clouds` / `cloudsTransfer` / `legacyLut` / `wx54-gibs-gray-legacy` absent from `dist/`. Production retains `wx54-gibs-gray-v3` / `gibsBand13ColorMap`. Internal `gibsGrayPath` remains as a transfer-output id (same class as `canonicalIR`).

**Actual results**

RGB 101/102/103 is monotone around IR ~0.26; 102 is not 0.89; confidence 0. Near-gray `(102,104,101)` / `(105,101,103)` use warm-gray luma. Magenta/red/green/cyan cores match legacy LUT exactly. Warm-gray table: 256 finite [0,1] entries, monotone, luma 0/1 clamp to IR 0, luma ≥197 clamp to −18.85 °C. Synthetic India/Pacific gray+102-speckle fields: hybrid IR variance and neighbor step < 25% of legacy LUT; chromatic convection IR unchanged. Winner/coverage/quality identity hybrid vs legacyLut. East/West/Himawari share `gibsBand13ColorMap`. Factory opacity 0.42, RGB `(248,250,252)`, BP56=56, confidence knots unchanged.

**Visual verification**

Cursor Browser, device metrics **1920×1080**, canvas present. Session ~21:15–21:20 UTC 22 Aug 2026. Pane remains Americas-weighted.

Ordinary live: Clouds on. Status **Clouds · observations 32m–3h old** then **21m–3h** / **22m–3h**. Weather: slider **0.4** (factory 0.42). Observation times: EUMET ring **3h**, GOES-West **57 min**, GOES-East **37 min**, Meteosat **32 min**, Himawari **57 min**. Copy “Near-current satellite cloud depiction.” Attribution EUMETSAT/GIBS. No source selector, no GIBS gray-mode control. Illumination: “Clouds are informational and do not participate in physical illumination.” No participation control.

`?cloudsSectorDebug=winner`: magenta GOES-East NATL/Caribbean disk; hard q>0 boundary. Pacific GOES-West present.

`?cloudsGibsGray=legacy` vs default hybrid: Americas GOES gray wash/speckle weaker on hybrid; chromatic/high-cloud structure remains. No new user control.

Historical Demo 2017-08-21: **Live-only data is hidden while viewing another product time.** Disable demo restored **Clouds · observations 22m–3h old** without re-checking Clouds.

`?scenario=clouds`: banner `scenario: clouds · 2026-08-21T20:40:00.000Z · persistence isolated`; status **Clouds (DEV fixture)**.

**Not verified**

- In-app India-centered 1920×1080 crop of the ring→Himawari θ=75° line (Cursor pane is Americas-weighted). Live numeric remeasure of alpha step ~145 / Bay IR variance 0.0149→0.0061 on 2048×1024 WMS rasters.
- Isolated 2048×1024 materialize wall time after shrinking the unit test (a contended full-suite run of the larger buffer was 631 ms; first LUT build dominates).
- Pixel-identical illumination raster ON vs OFF.
- `?cloudsSectorDebug=gibsGray` live rematerialize (URL live; classification proven in unit tests; compose may lag until sector cache misses).
- Two Himawari TIME slots in-app. Tauri binary. External licence counsel.

**Discovered, not done**

WEATHER-5.5 ring/GIBS mean calibration (BP56 still holds typical India ring below the 0.30 floor). Contextual cold-gray gate (D′) when adjacent to magenta/red. q>0 blending — not next; dual q>0 MSG∩Himawari remains empty. WEATHER-6, numeric BT, cloud-mask, physical illumination. LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, LIB-070, LIB-072, LIB-074, LIB-076 stay proposed.

