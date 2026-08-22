# LIB-073 — WEATHER-5.2: Ring outranks q=0 regional authority

| Field | Value |
|-------|-------|
| ID | LIB-073 |
| Status | complete |
| Created | 2026-08-22 |
| Approved | 2026-08-22 (human; this request) |
| Completed | 2026-08-22 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-5.2 ring-over-q0 authority. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, LIB-070, or LIB-072. Do not begin later q>0 blending, WEATHER-6, numeric netCDF, cloud-mask, or physical illumination.

Predecessor: [LIB-072](LIB-072-weather-5-2-residual-cloud-boundary-provenance-investigation.md) (investigation; remains proposed) and [LIB-071](LIB-071-weather-5-1-canonical-ir-cloud-confidence.md) (canonical IR + shared confidence; complete). This item owns **overlap authority when every covering regional is q=0**. Coverage, quality formula, signal, and q>0 lexicographic regional winners are treated as settled.

## Objective

Prevent extreme-limb q=0 regional observations from suppressing a valid EUMET ring observation. The ring outranks q=0 regional coverage only when no q>0 regional covers the pixel. This should remove large India / southern-ocean / Antarctic source-footprint geometries without altering usable regional authority.

## Scope

**In scope**

- Per-pixel authority: usable regionals (`coverage && q>0`) keep the existing WEATHER-4.3 lexicographic rule; otherwise a paintable ring with provider coverage wins; otherwise q=0 regionals still paint via the existing freshness/stable rule.
- Status age range includes the ring only when it actually owns geographic pixels.
- DEV winner / ring-contribution / optional q=0-vs-ring diagnostics; absent from production dist.
- Tests, visual verification, proportional docs. Amend ADR 0024 consequence if the backstop rule is durably extended.

**Out of scope**

- Coverage definition (provider alpha > 0). Punching holes in regional coverage. Treating q=0 as no-data.
- GEO quality formula, SSPs, 55°/75° thresholds, quality cache.
- Canonical IR, GIBS/Meteosat/ring mappings, shared confidence curve, cloud RGB, factory opacity.
- Blending, feathering, common-TIME synchronization, native reprojection, synthetic ring quality.
- Himawari grain retune, MSG WMS disk-edge repair, visible/GeoColor, physical illumination.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-063](LIB-063-weather-1-global-clouds-v1.md) through [LIB-072](LIB-072-weather-5-2-residual-cloud-boundary-provenance-investigation.md)

## Acceptance criteria

- q=0 remains valid coverage and still paints when the ring is absent or not paintable.
- Any covering q>0 regional beats the ring, including valid-clear (cloudSignal 0).
- q>0 regional lexicographic winners are identical to WEATHER-4.3 for the same inputs.
- Dual or sole q=0 regional + paintable ring coverage → ring. Valid-clear q=0 + ring → ring (intentional).
- Expired / no-data ring does not displace q=0 regional.
- India, southern Indian Ocean, and Antarctic q=0 GEO footprint artifacts materially improve. NATL / Pacific q>0 overlaps unchanged.
- Coverage masks, quality planes, cloud signals, canonical mappings, confidence, opacity, and TIMES unchanged.
- No blending, no new user config, one composed PNG, one `imageBlit`.
- Ring age is included in status only when the ring owns pixels.
- DEV diagnostics absent from production dist.
- `npx tsc --noEmit`, `npm test`, and `npm run build` pass.

## Verification plan

- Focused tests: dual/sole q=0 + ring, sole q=0 no ring, q>0 + ring, multiple q>0 identity, valid-clear q>0 and q=0, ring stale / no-data, India-like and southern fixtures, NATL identity, status age, coverage/quality/signal identity
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV sector debug
- Visual verification: required — ordinary live Clouds, India, southern Indian Ocean, Antarctica, NATL, Pacific, Europe/Africa, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

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

Clouds overlap authority is now: usable regional (`coverage && q>0`) keeps the WEATHER-4.3 lexicographic rule; otherwise a paintable EUMET ring with provider coverage wins; otherwise q=0 regionals still paint via freshness/stable order. Coverage, quality formula, signal, confidence, and opacity are unchanged. q=0 remains valid coverage and does not become no-data. Status includes ring age only when the ring owns composed pixels. DEV `winner` / `ring` / `q0ring` diagnostics; absent from production dist. ADR 0024 amended.

**Commands run**

- `npx tsc --noEmit` — clean
- Focused tests (`weather52CloudsRingOverQ0Authority`, `weather43CloudsQualityAuthority`, `weather41CloudsCoverageAuthority`, `weather3CloudsComposition`, `weather51CanonicalIr`, `cloudsSectorDebugTint`, `visualScenarios`) — 152 passed
- `npm test` — 268 files / 2564 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-J_-n2fhy.js`); `cloudsSectorDebug` / `visualScenarios` / `cloudsTransfer` / `q0ring` absent from `dist/`

**Actual results**

Dual/sole q=0 + ring → ring. Sole q=0 without ring coverage or with expired ring → regional, no hole. q>0 regional identity vs WEATHER-4.3 including NATL East/MSG and Pacific West/Himawari. Valid-clear q>0 still suppresses ring; valid-clear q=0 yields ring when available. India-like dual q=0 coverage-edge winner arc removed (all ring). Southern q=0 skirt/gap fixture: 2 high-contrast winner edges → 0. Status with all four regionals includes ring only when `ringOwnsPixels`. Transfer `wx5-cloud-v2`, RGB `(248,250,252)`, opacity 0.42, no blending.

**Visual verification**

Cursor Browser, device metrics **1920×1080**, canvas CSS 1920×1080 (bitmap **1919×1079** then **1888×1079** after config). Session ~16:45–17:00 UTC 22 Aug 2026.

Ordinary live: Clouds on. Status **Clouds · observations 31m–2h old** then **33m–2h** / **30m–2h**. Weather: slider **0.4** (factory 0.42). Observation times: EUMET ring **2h**, GOES-West **46 min**, GOES-East **46 min**, Meteosat **31 min**, Himawari **36 min**. Illumination: “Clouds are informational and do not participate in physical illumination.” No participation control.

`?cloudsSectorDebug=winner`: magenta East owns western NATL including ~71°W; cyan West over the eastern Pacific/western NA; yellow Meteosat over Europe/Africa; green Himawari east of ~80°E. India ~74°E sampled purple-blue (ring), ~80°E green (Himawari q>0 reclaim). SIO ~70°E 60°S and Antarctic ~40°E 75°S ring-like. Hard q>0 boundaries, no basin blend.

`?cloudsSectorDebug=ring`: ring diagnostic present (DEV). Status still 30m–2h with ring listed.

`?scenario=clouds`: banner `2026-08-21T20:40:00.000Z`; status **Clouds (DEV fixture)**; **Live-only data is hidden while viewing another product time.**

**Not verified**

Pixel-identical illumination raster ON vs OFF. Tauri binary. Exact live seam ratios 2.37 / 5.24 / 8.24 re-measured on 2048×1024 WMS rasters this session (synthetic fixtures and winner samples used instead). Ordinary 2017-08-21 Demo playback transport buttons were not in the Time topic snapshot; scenario-clouds historical suppression was verified. In-app pane screenshot did not show the full 1920 India crop (canvas samples used). External licence counsel.

**Discovered, not done**

NATL East/MSG and Pacific West/Himawari q>0 quality-equal handoffs remain; they are the remaining candidates for a later narrow blend. Himawari GIBS limb grain and MSG WMS disk short of theoretical limb remain provider/WMS issues. Polar LEO fill. GeoColor / optical-depth illumination. LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, LIB-070, LIB-072 stay proposed. Do not begin later q>0 blending or WEATHER-6.
