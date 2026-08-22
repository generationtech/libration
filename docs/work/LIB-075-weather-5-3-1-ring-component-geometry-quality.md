# LIB-075 — WEATHER-5.3.1: Ring component-geometry quality

| Field | Value |
|-------|-------|
| ID | LIB-075 |
| Status | complete |
| Created | 2026-08-22 |
| Approved | 2026-08-22 (human; this request) |
| Completed | 2026-08-22 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-5.3.1 ring component-geometry quality. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, LIB-070, LIB-072, or LIB-074. Do not begin Himawari texture repair, ring black-point retune, later q>0 blending, WEATHER-6, numeric netCDF, cloud-mask, or physical illumination.

Predecessor: [LIB-074](LIB-074-weather-5-3-ring-artifact-provenance-and-cross-source-texture-investigation.md) (investigation; remains proposed) and [LIB-073](LIB-073-weather-5-2-ring-outranks-q0-regional-authority.md) (ring outranks q=0 regional; complete). This item owns **an independent ring quality plane inferred from documented GEO-ring component sub-satellite geometry**, and the authority refinement **good ring > q=0 regional > poor ring**. LIB-073’s usable-regional-over-ring rule remains. Coverage, regional quality, signal, and q>0 lexicographic regional winners are treated as settled.

## Objective

Stop treating every provider-alpha-valid EUMET ring pixel as equal observational quality. Give the ring the same three-plane split already used for regionals: coverage ≠ quality ≠ signal. Quality is static component-geometry, not image content. Usable regionals stay primary; good ring can replace extreme-limb regional coverage; poor ring can yield back to q=0 regional; poor ring still fills true gaps.

## Scope

**In scope**

- Centralize documented ring-component SSPs, reusing regional authorities and adding IODC 45.5°E.
- Cached Earth-fixed ring quality plane from the same GEO 55°/75° function as regionals: `ringQuality(P) = max(qualityFromSSP(component, P))` over documented ring components.
- Authority: usable regional > good ring (`coverage && q>0`) > q=0 regional > poor ring (`coverage && q==0`) > none.
- DEV diagnostics: ring quality, inferred component geometry, good vs poor ring vs q=0-because-poor-ring. Absent from production dist.
- Tests, visual verification, proportional docs. Amend ADR 0024 consequence.

**Out of scope**

- Regional coverage, regional q geometry, 55°/75° transfer, regional freshness, q>0 lexicographic winners.
- Canonical IR, GIBS/Meteosat/ring mappings, shared confidence curve, black-point 56, cloud RGB, factory opacity.
- Image-content / variance / confidence as quality. Blending, TIME sync, native reprojection.
- Himawari grain, LUT rewrite, visible/GeoColor, physical illumination, polar LEO fill.
- User ring-quality controls. Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-063](LIB-063-weather-1-global-clouds-v1.md) through [LIB-074](LIB-074-weather-5-3-ring-artifact-provenance-and-cross-source-texture-investigation.md)

## Acceptance criteria

- Ring has independent `ringCoverage` / `ringQuality` / `ringCloudSignal`. Quality is provenance geometry, not image content.
- Component SSPs centralized; IODC 45.5°E included; regional GOES/MSG/Himawari SSPs reused.
- `ringQuality == 0` does not imply no-data. Ring coverage remains provider alpha. Polar α=0 stays no-data.
- Usable q>0 regional beats any ring. Good ring beats q=0 regional. Poor ring loses to q=0 regional when available and still paints when no regional exists.
- Expired / no-data ring never paints. NATL / Pacific q>0 winners unchanged.
- Coverage masks, regional quality planes, canonical/cloudSignal arrays, confidence, opacity, and TIMES unchanged.
- No blending, no new user config, one composed PNG, one `imageBlit`.
- Ring age is included in status only when the ring owns pixels.
- DEV diagnostics absent from production dist.
- `npx tsc --noEmit`, `npm test`, and `npm run build` pass.

## Verification plan

- Focused tests: good ring vs q0, poor ring vs q0, poor ring only, q>0 vs any ring, expired ring, ring no-data, signal independence, India class sequence, SIO IODC q>0, polar poor ring, NATL/Pacific identity, status, coverage/regional-q/signal identity, historical Demo / illumination regressions already owned by existing suites
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV sector debug
- Visual verification: required — ordinary live Clouds, regional winner, ring-owned, ring quality, inferred component, q0-vs-poor-ring, India, SIO, Antarctic, NATL, Pacific, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md) consequence

## Completion record

Completed: 2026-08-22

**Implementation summary**

The EUMET ring now has independent coverage, quality, and signal. Ring quality is a cached Earth-fixed Uint8 plane: max of the shared GEO 55°/75° function over documented component SSPs (Meteosat 0°, IODC Meteosat-9 45.5°E, GOES-East, GOES-West, Himawari-9), version `wx53-ring-geo-q1`. It is inferred geometry, not EUMET per-pixel provenance. Authority is: usable regional > good ring > q=0 regional > poor ring > none. LIB-073’s q>0 regional primacy is unchanged. ADR 0024 amended. DEV `ringQuality` / `ringComponent` / good-vs-poor winner tints; absent from production dist.

**Commands run**

- `npx tsc --noEmit` — clean
- Focused tests (`weather53CloudsRingComponentQuality`, `weather52CloudsRingOverQ0Authority`, `weather43CloudsQualityAuthority`, `cloudsSectorDebugTint`, `visualScenarios`) — 123 passed
- `npm test` — 269 files / 2588 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-ChFHxolR.js`); `cloudsSectorDebug` / `visualScenarios` / `q0ring` / `ringQuality` / `ringComponent` / `cloudsTransfer` absent from `dist/`
- Diagnostic recomposition of LIB-074 2048×1024 WMS rasters (product UTC 2026-08-22T17:41:47Z) through production compose

**Actual results**

Good ring + q=0 regional → ring. Poor ring + q=0 regional → regional. Poor ring only → ring. q>0 regional + any ring → regional. Expired / α=0 ring excluded. Signal independence. NATL/Pacific usable mismatch 0. India 25°N class sequence `meteosat > good-ring > himawari` (switches 63.50°E / 77.50°E). SIO 70°E 45°S IODC θ≈57.3° q=246; MSG/Himawari q=0. 70°E 80°S polar α=0 none. 90°E 60°S poor ring yields to q=0 Himawari.

Winner counts vs LIB-073: ring 452,353 → **129,882**; Meteosat 478,221 → 559,016; Himawari 338,479 → 422,408; West 338,205 → 410,278; East 236,206 → 321,880; none **253,688 unchanged**. Ring-coverage q=0 fraction 0.192; q>0 0.808; p25/p50/p75 = 37/255/255. IODC share of ring coverage 0.128. Seam ratios on the same rasters: SIO 1.31 (LIB-073 winner-edge ~8.03; LIB-072 ~5.24); Antarctic 1.03 (was ~8.24); India 0.77. Ring quality plane 815 ms / 2,097,152 bytes; compose 84 ms.

Transfer `wx5-cloud-v2`, RGB `(248,250,252)`, opacity 0.42, no blending, black-point 56 unchanged.

**Visual verification**

Cursor Browser, device metrics **1920×1080**, canvas CSS 1920×1080 (bitmap **1919×1079** then **1888×1079**). Session ~18:17–18:25 UTC 22 Aug 2026.

Ordinary live: Clouds on. Status **Clouds · observations 33m–3h old** then **34m–3h** / **30m–3h** / restore **23m–3h**. Weather: slider **0.4** (factory 0.42). Observation times: EUMET ring **3h**, GOES-West **39 min**, GOES-East **49 min**, Meteosat **34 min**, Himawari **49 min**. Attribution EUMETSAT/GIBS. No source selector. Illumination: “Clouds are informational and do not participate in physical illumination.” No participation control.

`?cloudsSectorDebug=winner`: colored GEO disks (East magenta NATL, West cyan Pacific, Meteosat yellow Africa, Himawari green, ring violet). Hard q>0 boundaries. Pane screenshot is Americas-centered; full-world geometry from harness rasters.

`?cloudsSectorDebug=ringQuality` with Clouds on (**25m–3h old**): diagnostic URL live; Cursor pane remains Americas-cropped, so IODC/SIO grayscale is not in that viewport. Full-world ring-q distribution from the 2048×1024 harness.

`?cloudsSectorDebug=ringComponent` with Clouds on (**26m–3h old**): inferred-component diagnostic URL live. Same pane crop; component fractions from the harness.

`?scenario=clouds`: banner `scenario: clouds · 2026-08-21T20:40:00.000Z · persistence isolated`; status **Clouds (DEV fixture)**.

Historical Demo 2017-08-21: **Live-only data is hidden while viewing another product time.** Clouds checkbox stayed on. Disable demo restored **Clouds · observations 23m–3h old**.

**Not verified**

Pixel-identical illumination raster ON vs OFF. Tauri binary. Exact in-app 2048×1024 live GetMap winner counts this session (harness used the LIB-074 17:41Z slots). Cursor pane screenshot is not a full-world 1920 canvas export. External licence counsel. EUMET internal per-pixel component provenance (WMS still has none).

**Discovered, not done**

70°E 45°S remains good-ring (IODC q=246) and can still paint ring-clear over q=0 cloudy regionals — black-point 56 / mapping, not authority. India Himawari grain and LUT gray aliasing remain presentation. NATL East/MSG and Pacific West/Himawari q>0 handoffs remain later blend candidates only. Polar LEO fill. GeoColor / optical-depth illumination. LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, LIB-070, LIB-072, LIB-074 stay proposed. Do not begin Himawari texture repair, ring black-point retune, later q>0 blending, or WEATHER-6.
