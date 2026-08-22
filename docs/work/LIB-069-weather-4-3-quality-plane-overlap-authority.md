# LIB-069 — Weather-4.3: Per-source quality plane + quality-aware overlap authority

| Field | Value |
|-------|-------|
| ID | LIB-069 |
| Status | complete |
| Created | 2026-08-22 |
| Approved | 2026-08-22 (human; this request) |
| Completed | 2026-08-22 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-4.3. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, or LIB-068. Do not begin WEATHER-5.

Predecessor: [LIB-068](LIB-068-weather-4-2-cloud-source-quality-seam-investigation.md) (investigation; remains proposed) and [LIB-067](LIB-067-weather-4-1-cloud-coverage-mask-authority-replacement.md) (coverage-authority replacement). This item implements quality-aware overlap authority. WEATHER-3 freshness-over-synchronization remains.

## Objective

Give each Clouds source an observational quality plane independent of coverage and derived cloud signal, then make regional overlap authority quality-aware so extreme geostationary limb observations cannot overwrite substantially better views from another satellite merely because they are modestly newer.

## Scope

**In scope**

- Per-source `qualityWeight` distinct from `coverageMask` and `cloudSignal`.
- Geostationary viewing-zenith quality from the WEATHER-4.2 geometry and 55°/75° transfer.
- Centralized sub-satellite-point metadata for GOES-East, GOES-West, Meteosat, and Himawari.
- Deterministic lexicographic overlap winner (coverage → usable-quality vs q=0 → freshness among usable → higher quality → stable order).
- q=0 remains valid coverage; ring stays a coverage backstop and must not reappear under valid regional coverage.
- Hard per-pixel winner; one composed PNG; one `imageBlit`.
- DEV diagnostics for coverage, quality, winner, and cloud signal.
- Tests, visual verification, proportional docs.

**Out of scope**

- Cloud presentation (Rec.601, smoothstep 100→195, RGB, factory opacity 0.42, ring/MSG lifts, IR wash, visible/IR hybrid, optical depth, illumination).
- Overlap feathering, quality-weighted blending, basin-wide interpolation.
- Common-TIME synchronization of GOES/Meteosat/Himawari.
- Polar LEO fill, numeric brightness temperature, GeoColor.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-065](LIB-065-weather-3-high-cadence-best-current-cloud-composition.md)
- [LIB-067](LIB-067-weather-4-1-cloud-coverage-mask-authority-replacement.md)
- [LIB-068](LIB-068-weather-4-2-cloud-source-quality-seam-investigation.md)

## Acceptance criteria

- Coverage, quality, and cloud signal are independent. Quality never turns valid coverage into no-data.
- A q=0 observation that is the only valid coverage still paints and still suppresses the ring.
- At ≈45°N / 71.14°W, GOES-East (good geometry) beats extreme-limb Meteosat when Meteosat is only modestly newer.
- The painted composition no longer follows Meteosat’s western disk rim through the North Atlantic where GOES-East provides substantially better valid coverage.
- Quality-equal handoff emerges from geometry (not a hardcoded longitude).
- Fresher usable-quality observations still win when the cadence rule requires it. Heterogeneous observation times remain.
- Winner is deterministic for identical input snapshots. No temporal hysteresis unless documented as necessary.
- Ring fills actual regional no-data only.
- Cloud presentation, factory opacity, illumination, and Historical Demo suppression are unchanged.
- DEV diagnostics exist for coverage, quality, winner, and signal; they do not ship in production dist.

## Verification plan

- Focused tests: coverage vs quality, North Atlantic regression, freshness, crossover, backstop, geometry (finite/dateline/high-latitude), WEATHER-3/4.1 regressions
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV quality/winner/sector debug
- Visual verification: required — ordinary live Clouds, North Atlantic / eastern North America / western Europe, quality and winner diagnostics, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

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
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md) consequence text if needed
- New ADR if three-plane authority is durable beyond an implementation curve

## Completion record

Completed: 2026-08-22

**Commands run**

- `npx tsc --noEmit` — clean
- Focused tests (`weather43CloudsQualityAuthority`, `cloudsSectorDebugTint`, `visualScenarios`) — 72 passed
- `npm test` — 266 files / 2520 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-Cqw8vNx2.js`); `cloudsSectorDebug` / `visualScenarios` / `scenario=clouds` absent from `dist/`
- Live East+MSG diagnostic (not in git): East `2026-08-22T04:10Z`, MSG `04:30Z`. NATL 45°N / 71.14°W: East q=255, MSG q=0; old winner Meteosat → new GOES-East. 45°N selected-source switch −71.10° → −55.11°. Seam ratio 8.27 → 3.23. Quality plane 2,097,152 bytes/sector. Compose 40 ms (old) / 28 ms (lex).

**Actual results**

Coverage, quality, and cloud signal are independent. q=0 remains coverage and still suppresses the ring. Lexicographic hard winner: usable q>0 beats q=0; both q=0 uses freshness/stable order; both usable and |age| ≥ max(cadence) → fresher; else higher U8 quality; ties West → East → Meteosat → Himawari. No blending, no TIME sync, no IR/opacity/illumination change. SSP metadata is sector-owned (GOES-16 −75.2°, GOES-18 −137.0°, Meteosat 0°, Himawari-9 140.7°). Quality 1 at zenith ≤55°, 0 at ≥75°, smoothstep between. ADR 0024.

**Visual verification**

Cursor Browser, device metrics **1920×1080**, canvas CSS 1920×1080 after `overflow:hidden` / `margin:0` (bitmap **1919×1079**). Session ~04:47–04:55 UTC 22 Aug 2026.

Ordinary live: Clouds on. Mid-Atlantic radiometric step ~50–60°W, not Meteosat’s western disk rim. **Clouds · observations 30m–60m old** then **32m–62m old**. Weather: slider **0.4** (factory 0.42); West **30 min**, East **50 min**, Meteosat **35 min**, Himawari **60 min** (ring not listed). Illumination: “Clouds are informational and do not participate in physical illumination.” No participation control.

`?cloudsSectorDebug=winner`: magenta East owns western North Atlantic including 71°W; yellow Meteosat farther east; cyan West; green Himawari. Hard boundaries, no basin blend. `?cloudsSectorDebug=quality`: same winner hues, nadir bright, limb dark.

Historical Demo 2017-08-21 paused: **Live-only data is hidden while viewing another product time.** Clouds checkbox stayed on. Disable demo restored **Clouds · observations 32m–62m old**.

`?scenario=clouds`: banner `2026-08-21T20:40:00.000Z`; status **Clouds (DEV fixture)** (not live).

**Not verified**

Pixel-identical illumination raster ON vs OFF. Tauri binary. Exact LIB-068 live seam 2.80 (this pair 3.23). Quality-plane construction isolated from test overhead. Pacific/dateline in the in-app 1920×1080 frame (Himawari/West tints sampled; full-disk Pacific not the primary screenshot). External licence counsel.

**Discovered, not done**

Radiometric/presentation mismatch at the quality handoff (WEATHER-5). Narrow overlap feather only after this authority is proven. Polar LEO fill. GeoColor / optical-depth illumination. Temporal hysteresis was not required. React StrictMode dispose dropped DEV tints until revive re-passed `tintCloudsComposite`. LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068 stay proposed. Do not begin WEATHER-5.
