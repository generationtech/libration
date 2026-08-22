# LIB-071 — WEATHER-5.1: Canonical IR interpretation + conservative cloud-confidence transfer

| Field | Value |
|-------|-------|
| ID | LIB-071 |
| Status | complete |
| Created | 2026-08-22 |
| Approved | 2026-08-22 (human; this request) |
| Completed | 2026-08-22 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-5.1. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, or LIB-070. Do not begin WEATHER-5.2, WEATHER-6, numeric netCDF, cloud-mask, or physical illumination.

Predecessor: [LIB-070](LIB-070-weather-5-cloud-radiometry-and-presentation-investigation.md) (investigation; remains proposed) and [LIB-069](LIB-069-weather-4-3-quality-plane-overlap-authority.md) (quality-aware overlap; complete). This item owns **provider display interpretation → canonical cloud signal** only. WEATHER-4.3 source authority is treated as settled.

## Objective

Replace Rec.601-of-provider-RGB plus a shared luma smoothstep with a fixed per-provider display interpretation into a canonical IR-like scalar, then one conservative shared cloud-confidence transfer, so default Clouds read as meteorologically meaningful structure rather than a broad translucent wash. Do not change source authority.

## Scope

**In scope**

- Stop treating GIBS Band13 WMS Rec.601 luma as canonical IR.
- Fixed colormap-aware interpretation for the GIBS Band13 family (GOES-East, GOES-West, Himawari).
- Fixed grayscale interpretations for Meteosat `msg_fes:ir108` and the EUMET ring.
- Normalized `canonicalIR01` (0 = warm/surface-like, 1 = cold/high-cloud-like).
- One shared conservative cloud-confidence transfer; cache version `wx5-cloud-v2`.
- Remove superseded Rec.601 display lifts.
- DEV-only `cloudsTransfer=legacy|wx5` and optional canonical-IR diagnostic; absent from production dist.
- Tests for interpretation, clear/cloud mapping, authority/coverage/quality/time identity, illumination, Historical Demo, config.
- Visual verification and documentation.

**Out of scope**

- Coverage, quality, freshness, cadence, overlap winner, ring backstop, heterogeneous times.
- Overlap feathering / WEATHER-5.2.
- Visible/GeoColor, numeric netCDF, cloud-mask products, physical illumination.
- Factory opacity change (remains 0.42). Cloud RGB change unless readability forces a tiny adjustment.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-063](LIB-063-weather-1-global-clouds-v1.md) through [LIB-070](LIB-070-weather-5-cloud-radiometry-and-presentation-investigation.md)

## Acceptance criteria

- GIBS false-color is not interpreted by Rec.601 as canonical IR.
- GOES-East/West/Himawari share one GIBS colormap interpretation.
- Meteosat and ring each have a documented fixed interpretation.
- `canonicalIR01` and the shared transfer are documented with exact knots.
- Clear-ocean false cloud decreases materially; major frontal and deep-convection structure remains.
- Winner map, coverage masks, quality planes, and observation times are unchanged for the same inputs.
- No overlap blending, visible imagery, numeric netCDF, or cloud mask.
- Cloud RGB `(248,250,252)`, factory opacity 0.42, one `imageBlit`, informational only.
- Cache transfer version increments; Canvas remains provider-agnostic.
- DEV diagnostics absent from production dist.
- `npx tsc --noEmit`, `npm test`, and `npm run build` pass.

## Verification plan

- Focused tests: GIBS chromatic/clear/cold, MSG/ring, monotonicity, winner/coverage/quality/time identity, illumination, Historical Demo, config
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV transfer/canonical/sector debug
- Visual verification: required — ordinary live Clouds, North America wash, mid-Atlantic, frontal NATL, Europe/Africa, Pacific, clear ocean, night, high latitude, convection, opacity 0.42, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- New ADR if heterogeneous-display normalization is durable

## Completion record

Completed: 2026-08-22

**Commands run**

- `npx tsc --noEmit` — clean
- Focused Clouds tests (`weather51CanonicalIr`, `weather1/2/3/41/43`, `visualScenarios`, `cloudsSectorDebugTint`) — 147 passed (earlier this session)
- `npm test` — 267 files / 2538 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-CifutK86.js`); `cloudsTransfer` / `cloudsSectorDebug` / `visualScenarios` / `scenario=clouds` absent from `dist/`. Production retains `wx5-cloud-v2` / `gibsBand13ColorMap`.

**Actual results**

Provider RGB no longer becomes Rec.601 → `smoothstep(100,195)`. GIBS Band13 family uses checked-in NASA GIBS v1.3 colormap (`Clean_Longwave_Infrared_Window_Band.xml`, 238 entries, retrieved 2026-08-22) via RGB-Euclidean nearest-segment projection and a 64³ LUT. MSG identity grayscale; ring grayscale with black-point 56. Shared knots: IR `0.00/0.30/0.40/0.52/0.68/0.82/1.00` → confidence `0/0/0.12/0.45/0.82/0.97/1` with smoothstep between. Transfer version `wx5-cloud-v2`. Legacy +20/+12 lifts removed. RGB `(248,250,252)`, opacity 0.42 unchanged. Authority planes unchanged. ADR 0025.

Live same-observation pair (East `2026-08-22T14:40Z`, MSG `15:15Z`): winner map 2,097,152/2,097,152 identical; 45°N switch −55.13° (matches LIB-069 −55.11°). Point 35°N 35°W GIBS gray `(103,103,103)`: wx3 α=1 → wx5 α=0. NATL frontal East p90 0.87 → 0.78. East/MSG interior mean α 105.4 → 54.8 vs 42.9 → 34.3; |Δα| 62.5 → 20.5. California West gt05 51% → 7.6% (warm low cloud weakened). GIBS materialize ~50–60 ms / 2M px.

**Visual verification**

Cursor Browser, ~1920×1080 (canvas ~1919×1079). Ordinary live: **Clouds · observations 23–43 min old** (also 25–55 / 33–48 / 35–50 / 36–51 during the session). Weather slider 0.4 (factory 0.42); heterogeneous West/East/Meteosat/Himawari ages; copy “Near-current satellite cloud depiction”; no calibration UI. Illumination: “Clouds are informational and do not participate in physical illumination.” Winner debug: magenta East / yellow Meteosat / cyan West, hard boundaries. Historical Demo 2017-08-21: **Live-only data is hidden while viewing another product time.** Restore without re-checking Clouds: **36–51 min old**. `?scenario=clouds`: banner `2026-08-21T20:40:00.000Z · persistence isolated`; **Clouds (DEV fixture)**.

**Not verified**

Pixel-identical illumination raster ON vs OFF. Dedicated night-ocean p50/p95 box (night side inspected qualitatively). In-app pan to full Europe/Africa/Pacific disks (regionals listed and Himawari/West present). External licence counsel. Tauri binary. Literal mid-Atlantic “clear” box p95 ≤ 0.10 (that box is mixed weather; the known clear-ocean gray pixel is 0).

**Discovered, not done**

WEATHER-5.2 overlap feathering — residual geometric handoff can remain; radiometric step dropped materially with hard winners; do not start. WEATHER-6 visible/GeoColor. Numeric netCDF / cloud-mask products. Physical optical-depth illumination. High-latitude snow/ice vs cloud. LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, LIB-070 stay proposed.
