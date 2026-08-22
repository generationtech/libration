# LIB-070 — WEATHER-5 cloud radiometry and presentation investigation

| Field | Value |
|-------|-------|
| ID | LIB-070 |
| Status | proposed |
| Created | 2026-08-22 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item.

Predecessor: [LIB-068](LIB-068-weather-4-2-cloud-source-quality-seam-investigation.md) (radiometric mismatch noted; remains proposed) and [LIB-069](LIB-069-weather-4-3-quality-plane-overlap-authority.md) (quality-aware overlap; complete). This item investigates **how** the authoritative observation should be interpreted visually. WEATHER-4.3 authority is treated as settled.

## Objective

Determine how heterogeneous IR visualization observations should be normalized and transformed so Clouds read as actual cloud structure rather than atmospheric wash, while remaining honest and stable across providers. Separate provider stretch mismatch, IR-to-cloud interpretation, source-handoff presentation, daytime visible potential, and scientifically stronger data sources. Recommend one next implementation LIB without reverting source authority.

## Scope

**In scope**

- Repository reconnaissance of Clouds v3 after LIB-069 (coverage, quality, signal, Rec.601 smoothstep, lifts, opacity, DEV diagnostics).
- Live WMS capture of all production sources and pixel-level radiometric / transfer / overlap diagnostics.
- Provider visualization semantics (GIBS Band13, MSG IR108, ring).
- Survey of numeric BT, cloud-mask/fraction, and visible/GeoColor options.
- Structured survey in this work item. Proposed follow-on implementation scope only.

**Out of scope**

- Any production transfer, opacity, source lift, RGB, blend, authority, visible imagery, illumination, or endpoint change.
- Activating this item or creating an approved implementation LIB from this survey.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-063](LIB-063-weather-1-global-clouds-v1.md) through [LIB-069](LIB-069-weather-4-3-quality-plane-overlap-authority.md)

## Acceptance criteria

- Repository confirmed AWAITING SCOPE at start.
- Structured survey covering the requested sections.
- No production source changes.
- This item remains `proposed` unless a human approves it.
- [`docs/STATE.md`](../STATE.md) stays AWAITING SCOPE.

## Verification plan

- Focused tests: none required (survey-only). Diagnostic harness may run production modules read-only.
- Full suite: no
- Type-check: no
- Build: no
- Visual verification: live Clouds in ordinary current-time mode. Diagnostic rasters inspected independently of production paint.

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md) — awaiting-human-decision pointer only

## Completion record

Leave empty until a human approves and this survey is formally closed, or until a later approved item supersedes it. The structured survey below is the investigation record.

---

# Structured survey

Recorded 2026-08-22. Diagnostic files lived only under `/tmp/libration-weather5-radiometry/` (not added to the repository). Production Clouds composition, transfer, opacity, source lifts, RGB, blend, and authority were not modified.

Repository truth vs live-provider measurements are labeled **(repo)** and **(live)** below.

## 1. Verdict

**WEATHER-5 CLOUD RADIOMETRY + PRESENTATION INVESTIGATION COMPLETE**

WEATHER-4.3 source authority is geometrically sensible. The remaining GOES wash and mid-Atlantic contrast are a **display-interpretation** problem.

Primary: NASA GIBS Band13 WMS default style is the **Clean Longwave Infrared Window Band visualization** (legend −92.0 °C to >57.0 °C), not a common calibrated brightness-temperature field. Typical GIBS clear-ocean gray sits at Rec.601 luma **~100–110**, which is the production `smoothstep` floor. Meteosat IR108 is true inverted grayscale with clear ocean/land near luma **20–40**. The shared 100→195 transfer therefore paints GIBS clear sky as cloud and MSG clear sky as clear.

Secondary: GIBS PNGs are **28% chromatic** (rainbow enhancement). Rec.601 luma of yellow/cyan/green is not monotonic with temperature. MSG and the EUMET ring are 100% gray.

Tertiary: IR surface emission (night and high latitude look more “cloudy” than tropical day) and factory opacity 0.42 make the wash *visible*. Reducing opacity hides desired structure in the same proportion.

Global luma lifts and overlap percentile matching **do not** remove the quality-equal Atlantic step. Do not solve appearance by reverting source selection. Do not jump to basin-wide blending.

## 2. Repository state

`docs/STATE.md` was **AWAITING SCOPE** at start and remains so. This item is **proposed**. No implementation LIB was activated. Production Clouds math, transfer, opacity, source lifts, RGB, blend, and overlap authority were not changed.

## 3. Current production cloud interpretation

**(repo)** Exact math in `cloudHighlightTransfer.ts` / `cloudCoverage.ts` / `cloudsComposite.ts`:

```
coverage     = providerAlpha > 0
rawLuma      = Rec.601(R,G,B) = 0.299R + 0.587G + 0.114B
liftedLuma   = clamp(rawLuma + providerLift, 0, 255)
                 GIBS East/West/Himawari: +0
                 MSG FES: +20
                 EUMET ring: +12
cloud01      = smoothstep(100, 195, liftedLuma)
cloudSignalA = round(cloud01 × providerAlpha)
output RGB   = (248, 250, 252)
painted      = cloudSignalA × layerOpacity     // factory 0.42
```

`smoothstep(e0,e1,x) = t²(3−2t)` with `t = clamp((x−e0)/(e1−e0), 0, 1)`.

Three independent planes ([ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)): `coverageMask`, `qualityWeight`, `cloudSignal`. Transfer version `wx3-ir-v1`. One composed PNG, one `imageBlit`. Clouds do not participate in physical illumination.

## 4. Reproduced visual problems

**(live)** Ordinary current-time Clouds on `http://127.0.0.1:1420/` (HUD **August 22 2026, 10:44 AM** local ≈ **14:44 UTC**). Clouds checkbox on. Weather topic: Cloud opacity **0.42**. Attribution EUMETSAT FES + ring and NASA GIBS Band 13. Grid, city pins, earthquakes, ISS, eclipse info coexist.

GOES-side Americas / western Atlantic: broad translucent white wash; subtropical ocean not visually clear. Meteosat-side Europe/Africa: higher-contrast, more binary cloud vs dark clear. A geometrically regular mid-Atlantic contrast step remains near **50–60°W**, matching the quality-equal winner (45°N switch **−55.11°**), **not** Meteosat’s western disk rim.

Off-process `composite-production.png` from the same observation slots shows the same GOES gray deck vs MSG black-clear contrast.

## 5. Canonical observation fixture

Product UTC at harness start: **2026-08-22T14:38:58Z**.

| Source | GetCapabilities default | Live GetMap TIME | Bytes | Opaque ratio |
|--------|-------------------------|------------------|-------|--------------|
| GOES-East | 12:40Z | **2026-08-22T14:00:00Z** | 1,259,888 | 0.371 |
| GOES-West | 12:40Z | **2026-08-22T14:20:00Z** | 1,337,586 | 0.371 |
| Himawari | 12:30Z | **2026-08-22T13:50:00Z** | 1,058,915 | 0.349 |
| Meteosat | 14:15Z | **2026-08-22T14:30:00Z** | 832,596 | 0.326 |
| EUMET ring | 12:00Z | **2026-08-22T12:00:00Z** | 1,854,775 | 0.880 |

East−MSG Δt = **−30 min** (MSG newer). Cadence max = 15 min, so freshness hysteresis can still prefer MSG when qualities are comparable. Ring does not contribute in dual regional coverage.

Temporal-stability pair: East **11:30Z** + MSG **11:30Z** (same TIME, Δt = 0).

## 6. Raw provider distributions

Valid coverage, Rec.601 luma (unlifted):

| Source | n | mean | std | p1 | p5 | p10 | p25 | p50 | p75 | p90 | p95 | p99 |
|--------|--:|-----:|----:|---:|---:|----:|----:|----:|----:|----:|----:|----:|
| GOES-East | 778426 | 127.6 | 42.5 | 23 | 53 | 78 | **100** | 125 | 158 | 182 | 193 | 224 |
| GOES-West | 778510 | 130.4 | 41.3 | 25 | 54 | 83 | 104 | 130 | 160 | 182 | 192 | 221 |
| Himawari | 732128 | 133.8 | 37.8 | 22 | 59 | 96 | 111 | 136 | 161 | 180 | 188 | 203 |
| Meteosat | 684335 | 84.6 | 71.7 | 1 | 1 | 5 | 26 | **61** | 135 | 197 | 229 | 255 |
| Ring | 1844978 | 107.0 | 39.8 | 34 | 62 | 67 | 76 | 98 | 131 | 162 | 182 | 222 |

GIBS family is similar (p50 125–136, tight). MSG is darker and more bimodal. Ring sits between.

Lifted luma: GIBS unchanged; MSG p50 61→81; ring p50 98→110.

Chroma: East/West/Himawari grayRatio **0.72 / 0.67 / 0.77**, chromaMean **45 / 54 / 39**. MSG and ring grayRatio **1.00**.

## 7. Current cloud-alpha distributions

Production transfer, valid coverage:

| Source | mean α | p50 | p90 | >0.01 | >0.05 | >0.10 | >0.20 | >0.50 | >0.80 |
|--------|------:|----:|----:|------:|------:|------:|------:|------:|------:|
| GOES-East | 85.8 | 44 | 242 | 69.0% | **62.7%** | 56.7% | 47.2% | 32.5% | 19.2% |
| GOES-West | 92.3 | 60 | 242 | 73.2% | 67.4% | 61.0% | 52.0% | 35.3% | 19.7% |
| Himawari | 99.3 | 82 | 238 | 80.0% | 73.4% | 67.7% | 59.0% | 37.1% | 19.6% |
| Meteosat | 70.2 | **0** | 255 | 41.2% | **38.4%** | 36.3% | 33.4% | 27.2% | 21.5% |
| Ring | 62.2 | 8 | 223 | 54.4% | 47.6% | 42.2% | 35.5% | 22.8% | 12.5% |

North Atlantic: East α>0.05 **52.4%**; MSG **27.3%**. Same class as LIB-068 NATL 57.8% / 31.0%.

## 8. Clear-region behavior

Geographic boxes classified with GeoColor / conventional IR context (not numeric truth).

| Region | East raw p50 | East α mean / p95 / >0.05 | MSG raw p50 | MSG α mean / p95 / >0.05 |
|--------|-------------:|---------------------------|------------:|--------------------------|
| Mid-Atlantic ocean (~35°N, 35°W) | **103** | 10.4 / 53 / 18.2% | **28** | 1.1 / 0 / 1.3% |
| Tropical Atlantic box | 110 | 52.3 / 198 / 44.0% | 40 | 18.1 / 157 / 20.2% |
| US Southwest desert | 104 (West 95) | West α p50=1 | no coverage | — |
| Sahara (MSG-owned) | East box is limb-contaminated | — | **1** | **1.4 / 0 / ~0** |

Point sample 35°N 35°W: East RGB gray **(103,103,103)**; MSG **(32,32,32)**; ring **(73,73,73)**. GIBS clear ocean sits **on the transfer floor**. MSG clear is well below it even after +20 (52).

Night composed α p50=67 vs day p50=6. High-latitude p50=161 vs tropics p50=0. Cold surface is confused with cloud.

## 9. Cloud-region behavior

| Region | East α p50 / p90 / contrast(p90−p10) | MSG α p50 / p90 / contrast |
|--------|--------------------------------------|----------------------------|
| Frontal NATL box | 41 / 211 / 210 | 0 / 253 / 253 |
| ITCZ box | 5 / — / — ; α>0.05 43.5% | 0 ; α>0.05 24.0% |
| California stratus (West) | West α>0.05 **77%** | — |

MSG keeps a true zero p50 even in a “frontal” box that mixes cloud and clear; East p50=41 (wash plus cloud). Obvious cold tops still saturate both (p90 high). The transfer does not fail to detect deep convection; it fails to keep clear and thin/warm separate on GIBS.

## 10. GOES visualization semantics

**(GIBS capabilities + legend + live PNG)**

- Layers: `GOES-East_ABI_Band13_Clean_Infrared`, `GOES-West_ABI_Band13_Clean_Infrared`.
- Default WMS `Style` legend: `Clean_Longwave_Infrared_Window_Band_H.png`.
- Worldview colormap title **Infrared Brightness Temperature**, units **°C**, legend **MinLabel −92.0 / MaxLabel > 57.0** (181–330 K class).
- Palette is **not** inverted grayscale: magenta/white for coldest, rainbow for mid-cold, long gray ramp for warmer.
- WMS `STYLES=` (production) uses this **default visualization**. No alternate grayscale/numeric style in GetCapabilities.
- Live East PNG: **28%** of valid pixels have chroma > 8 (cyan 92k, green 47k, yellow 27k, blue 28k, red 20k). Mid-luma 90–130 is mostly gray (~12% colored) — that gray band is the wash. Luma 200–220 is highly chromatic (cold-top enhancement).
- Unique 4-bit-quantized colors: **7114** (WMS resampling blends colormap entries; inversion is approximate).
- GOES-East and GOES-West share the same legend. Stretch is a provider visualization, not ABI Kelvin.
- Underlying physical quantity of the **science product** is ABI Band 13 brightness temperature (CIMSS: 10.3 µm clean window). The **WMS PNG is not that field**.
- Grayscale inversion to BT is **not uniquely determined** after resampling and mixed gray/color segments.
- Stretch appears stable across this session’s 14:00Z and 11:30Z East slots (same family of histograms). Legend `Last-Modified: 2026-08-18`.

## 11. Himawari visualization semantics

Same GIBS default style and **same legend file** as GOES Band13. Live Himawari 13:50Z: grayRatio 0.77, chromaMean 39, raw p50 136 — GIBS family, slightly tighter/brighter than East. Not a separate physical encoding. AHI Band 13 is analogous 10.4 µm; the PNG is still a visualization.

## 12. Meteosat visualization semantics

EUMETView `msg_fes:ir108`, title **High Rate SEVIRI IR 10.8 µm Image**. Abstract: rectified **level 1.5 image data**, not Recommended numerical data. Style name `raster` (“A simple default style”). Live PNG is **pure grayscale** (chromaMean 0.005). Polarity: cold bright / warm dark (Sahara raw p50=1, frontal tops to 255). Stretch is a provider 8-bit display, darker and more binary than GIBS. No documented Kelvin legend on the WMS layer. Numeric BT cannot be recovered reliably from the PNG without an unpublished display LUT.

## 13. Ring visualization semantics

`mumi:worldcloudmap_ir108`, title **Geostationary Ring IR10.8 µm Image - Multimission**. Empty abstract. Live PNG **pure grayscale**, p50 raw 98 (after +12 → 110). Darker than GIBS, less binary than MSG FES (clear not as black as FES Sahara). Separately enhanced composite, **not** identical to FES. Visual consistency still matters where it backstops missing regionals (poles / gaps).

## 14. Are provider lumas physically comparable?

**No.**

GIBS East/West/Himawari share one false-color visualization family. MSG FES is a different grayscale stretch. The ring is a third grayscale stretch. Rec.601(GIBS RGB) is not brightness temperature and is not on the same axis as Rec.601(MSG gray). Constant lifts cannot make them physically comparable.

## 15. Current source-lift effectiveness

**(repo)** GIBS +0, MSG +20, ring +12. Rationale: match median density; keep Sahara below 100.

**(live)** MSG +20 moves clear ocean 28→48, still below the floor. It does **not** pull GIBS clear ocean (103) out of the transfer. Dual-coverage affine (usable geometry): `MSG ≈ 0.85·East − 44`, RMSE **37**. Overlap percentile LUT applied to MSG, then production transfer, only moves Atlantic seam ratio **7.49 → 6.03**.

Lifts equalize *some* means and leave **shape** incompatible. They were aimed at making MSG look more like GIBS. For “where the clouds actually are,” the useful direction is the opposite: make GIBS clear behave like MSG clear.

## 16. Root cause of GOES wash

Ranked:

1. **GIBS visualization stretch** places typical clear gray at luma ~100–110 (East all-valid p25=100; mid-ocean sample 103).
2. **Transfer floor 100** therefore treats GIBS clear as the start of cloud.
3. **GIBS false-color** (28% chromatic): Rec.601 of yellow/cyan/green inflates alpha; luma is not monotonic with BT.
4. **IR surface emission**, worse at night (composed p50 67 vs day 6) and high latitude (p50 161 vs tropics 0).
5. **Factory opacity 0.42** makes residual α visible; it does not create the α field.
6. **Real low/warm cloud** is present (California stratus, some tropical) but does not explain mid-ocean luma 103 vs MSG 32.

Not primary: source authority / limb winner (repaired). Not primary: MSG +20.

## 17. Root cause of remaining mid-Atlantic contrast

Winner boundary at 45°N: **−55.11°** (quality-equal; West of it GOES-East, east of it Meteosat). LIB-069 geometry stands.

Ranked:

1. **Radiometric / stretch mismatch** on the selected-source step (GIBS wash vs MSG binary). Dual mean |Δα| = **77**.
2. **Shared Rec.601 transfer** applied to incomparable encodings.
3. **Hard winner** (correct for authority) makes the mismatch a line.
4. **Observation Δt = 30 min** (morphology / parallax secondary; same-class seam existed at near-zero Δt in LIB-068).
5. Not limb coverage, not ring leak, not 1 px antialias.

## 18. Transfer candidates tested

Same captured rasters; diagnostic only.

| Id | Mapping | East α>0.05 | MSG α>0.05 | NATL East/MSG >0.05 | Clear trop East mean α | Frontal East p90 |
|----|---------|------------:|-----------:|---------------------|------------------------|-----------------:|
| A production | smoothstep 100→195 | 62.7% | 38.4% | 52.4 / 27.3 | 52.3 | 211 |
| B higher | 120→205 | 43.6% | 32.2% | 32.8 / 19.9 | 29.0 | 161 |
| C narrow high | 150→220 | 24.1% | 23.9% | 14.4 / 12.3 | 5.1 | **51** |
| D piecewise | 0&lt;115; weak 115–150; strong 150–215 | 47.2% | 33.4% | 36.5 / 21.3 | 18.7 | 93 |
| E sigmoid | logistic mid 158, k=16 | 64.4% | 39.2% | 54.5 / 28.1 | 42.6 | 173 |
| F HE | per-frame histogram eq then 100→195 | — | — | — | **0.29** (clear inflated) | — |
| G btApprox | invert linear −92…57 °C then smoothstep 0→−50 °C | 65.4% | 39.5% | 55.7 / 28.4 | 64.8 | 239 |

## 19. Best fixed-transfer diagnostic

**D piecewise** or **B 120→205**. Both cut GIBS wash without collapsing MSG. C matches provider fractions but **deletes** East frontal texture (p90 51). E and G are as wash-y as production. F (histogram eq) is rejected for pulsing.

None of these fix GIBS chroma. A later production curve should run **after** a GIBS visualization→canonical-IR step, not as a global Rec.601 retune alone.

## 20. Per-provider calibration diagnostic

Usable dual coverage (both q>0, zenith &lt;70°, n=124,794):

- Affine: `MSG_raw = 0.850·East_raw − 44.3`, RMSE **37.5**
- Percentile LUT East→MSG applied inversely to MSG, then production transfer: seam **6.03** vs 7.49
- Piecewise + that LUT: boundary mean |Δα| 65 vs 96; ratio still **6.71** because interior texture also fell

A durable **gray-only** GIBS mapping plus MSG identity (or MSG→canonical IR) is plausible. A single affine on Rec.601 including colored pixels is **not** tight enough to be the whole product.

## 21. Temporal stability of calibration

Epoch 2 (both 11:30Z): affine `MSG = 0.888·East − 50.0`, RMSE 36.6. Epoch-1 LUT applied to epoch-2: RMSE **29.0** (n=166,572). Coefficients are in the same family (slope ~0.85–0.89, intercept ~−44 to −50) but RMSE stays large. Stretch family is stable enough for a **fixed** mapping; it is not stable/tight enough to treat Rec.601 as BT. Do not learn a new LUT every frame.

## 22. Clear-area metric

Defined: mean and p95 derived alpha in reference-classified clear boxes.

| Box | East mean / p95 | MSG mean / p95 |
|-----|----------------:|---------------:|
| Mid-ocean | **10.4 / 53** | **1.1 / 0** |
| Sahara (MSG) | n/a (East limb) | **1.4 / 0** |
| US SW (East/West gray sample) | luma 96, α ~0 at the point | — |

Useful production gate later: mid-ocean and desert **p95 α below ~0.10** after the new transfer, without requiring zero (thin cirrus).

## 23. Cloud-retention metric

Frontal NATL East production: mean 73.9, p50 41, p90 211, contrast 210. Piecewise: mean 29.5, p90 93, contrast 93. Narrow-high: p90 **51** — too little retained structure.

Target: keep cold-top p90 high (MSG already 253) while dropping clear p95. Do not optimize only global histograms.

## 24. Thin-cloud tradeoff

Higher floor / narrower curve: cleaner map, risk of losing warm marine stratocumulus and thin cirrus (California stratus is real; ITCZ East α>0.05 43.5% includes both convection and haze). Lower floor: sensitivity + wash. Default Libration should prefer **obvious meteorological structure** over exhaustive thin-cirrus detection. Piecewise (very low α for warm IR, progressive for colder) is the right *shape*; exact knots after GIBS canonicalization.

## 25. Numeric brightness-temperature feasibility

| Product | Authority | Units | Cadence | Native | Size (measured/stated) | Browser |
|---------|-----------|-------|---------|--------|------------------------|---------|
| NOAA AWS `ABI-L2-CMIPF` Band13 | NOAA GOES-R | K | 10 min FD | GEO | **23.9 MB**/slot (G16 2025-001 C13) | no CORS WMS; netCDF parse + reproject |
| NOAA AWS `ABI-L2-ACMF` | NOAA ECM | mask | 10 min FD | GEO | **21.5 MB**/slot | same class |
| EUMETSAT HRSEVIRI / Data Store | EUMETSAT | radiance/BT | 15 min | GEOS | tens of MB; account | not CORS WMS |
| GIBS numeric style | — | — | — | — | **not** in production GetCapabilities | visualization only |

Latency: GIBS ingest already ~40–70 min; NOAA AWS is often faster for GOES but unusable directly from the browser without a new acquisition class. Payload ≫ current 8.4 MB/snapshot PNG set. Parsing/resampling cost high; license public for NOAA AWS, EUMETSAT Data Store has conditions.

**Could Libration eventually derive a physically consistent cloud signal from actual BT?** Yes, as a later scientific path. Not as the next default: bandwidth and browser feasibility fail the live product test.

## 26. Cloud-mask/fraction feasibility

Promising:

- **GOES ACMF / ECM** (AWS netCDF): 4-level mask + cloud probability, day+night, 2 km, 10 min. **21.5 MB**/slot. No GIBS WMS. GOES-19 ACMF present for 2026-234.
- **MSG CLM** (EUMETSAT): clear-land / clear-water / cloud, 15 min, GRIB ~3.45 MB stated; Data Store / EUMETCast. A 128×64 GetMap to `msg_fes:clm` returned a classified-looking PNG (white/green vs transparent) — visualization *may* exist, but the name was **not** in the capabilities snippet used by production. Do not treat it as a production endpoint yet.
- **MTG CLM**: 10 min, 2 km, netCDF/GRIB from 2025. Not in the current Clouds WMS set.
- Himawari: no GIBS cloud-mask layer found. JMA scientific products are a different acquisition class.
- Optical thickness / CTH / phase: GOES `CODF`/`ACHAF`/`ACTPF` exist on AWS; same netCDF problem.

A real mask is a better *semantic* default than BT thresholding, but **not globally practical in the current browser WMS class**.

## 27. Day/night cloud-mask feasibility

**Yes, in scientific products:** GOES ECM/ACMF is explicitly day and night (NCEI: local zenith to 90°, day and night). MSG CLM is image-based scenes analysis, day and night. Those would be excellent default opacity authorities **if** all four regional sources can be acquired in-browser at Clouds cadence. Today they cannot.

## 28. Visible-source feasibility

| Source | Probe | Notes |
|--------|-------|-------|
| GIBS `GOES-East_ABI_GeoColor` | 512×256 PNG 95 KB, real disk, terminator | 10 min; CORS `*` on GIBS GET; night is dark |
| GIBS `GOES-West_ABI_GeoColor` | 128×64 8.6 KB | same family |
| `Himawari_AHI_True_Color` | 459 B empty/exception | **not** a usable layer id in this WMS |
| `GOES-East_ABI_Band2_Red_Visible_1km` | 5.1 KB small probe | daytime only |
| EUMET `msg_fes:vis006` | 4.6 KB 128×64, present | 15 min; night black |
| `msg_fes:naturalcolor` | 444 B empty this TIME | not reliable this slot |

Visible/GeoColor is CORS-practical for GOES and MSG VIS. Himawari true-color WMS id is unresolved. Night behaviour is the blocker for a 24h default.

## 29. Visible+IR future feasibility

**Feasible as a later phase, not immediate.** Day: GeoColor/VIS texture is what users mean by “clouds.” Night: IR or mask. Twilight: solar-altitude blend (candidate Sun ≥ +3° VIS, ≤ −6° IR, smooth between) needs evidence before freezing. Complexity is high (extra fetches, terminator, provider inconsistency, Himawari gap). Do not implement in WEATHER-5.1.

## 30. Default Clouds semantic recommendation

Default user-facing Clouds should mean:

**D + A. Intuitive cloud-opacity-like appearance of meteorologically meaningful structure** — where a person looking at Earth would say clouds are — not exhaustive thin-cirrus detection, not a binary mask, not scientific CTT.

Others as future optional layers: scientific IR / CTT; cloud mask/fraction; visible satellite.

## 31. Scientific IR/CTT future recommendation

Keep as a **later optional analytical layer**, not the default. Current GIBS rainbow is already a CTT visualization and is the wrong default. A true CTT layer should use numeric BT or a documented colormap displayed as temperature, never Rec.601→white wash. Do not add it now.

## 32. Remaining handoff after normalization

Quality-aware production seam (this fixture): boundary mean |Δα| **96.4**, ratio vs interior texture **7.49** (East interior 19.7, MSG 6.1). After MSG percentile→East + hard winner: **79.0 / 6.03**. Piecewise+LUT: **64.5 / 6.71**. Narrow quality blend: **61.7 / 6.35** (72,710 blend pixels).

Normalization **reduces** the step and does **not** make it texture-like. GIBS-as-colormap + MSG-like clear floor is the missing piece; remeasure after that before adding blend.

## 33. Need for narrow overlap transition

**Not as the immediate production model.** Hard winner remains. After WEATHER-5.1 radiometry, if a residual quality-crossover line is still more conspicuous than weather, consider a **narrow** dual-coverage blend. Do not basin-wide feather. Do not blend into no-data.

## 34. Recommended transition constraints

If later blending is added:

- Both valid coverage, both usable quality (q>0).
- `|qA−qB| < ~0.25` (quality-crossover only). Candidate; remeasure.
- Observation |Δt| preferably ≤ **one cadence to 30 min**. Do not impose 15 min without evidence (GIBS ingest often lags MSG by that much). Prohibit blend when Δt is a full freshness class.
- Width: high-cloud parallax at 2048×1024 is **1–7 px** (LIB-068). Safe visual transition ≲ **3–6 px** (~0.5–1°) or purely `|Δq|`. Wider blends double fronts.
- Never blend into no-data; never use cloudSignal=0 as no coverage.

## 35. Cloud-confidence model recommendation

Staged:

1. **WEATHER-5.1:** `cloudSignal` remains presentation. Internally treat it as **display cloud confidence 0–1** from canonical IR (GIBS colormap-aware + MSG gray), not Rec.601 of mixed RGB.
2. Later: optional mask/probability as the confidence authority where every sector can fetch it.
3. Do not mix viewing quality into alpha. Do not zero coverage when confidence is 0 ([ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)).

## 36. Physical illumination boundary

**Still deferred.** Display cloud confidence is not optical depth. Do not feed it into sunlight/moonlight. Model A stays off until a defensible OD/mask field exists.

## 37. Performance implications

| Model | Extra cost vs current | rAF | Output |
|-------|----------------------|-----|--------|
| Fixed per-provider LUT / piecewise | one pass per sector decode (already) | none | one imageBlit |
| GIBS colormap invert | LUT 256³ or chroma branch; still O(pixels) once | none | one imageBlit |
| Narrow blend | dual pixels only (~0.3M) | none | one imageBlit |
| Numeric BT / ACMF parse | tens of MB decode + GEO→equirect | none if cached; heavy | still one blit if composed off-thread |

Favor cached per-observation transforms outside rAF. Quality plane already cached.

## 38. Bandwidth implications

Current live snapshot: **8.4 MB** raw PNGs (five sources). Poll 8 min ≈ **~60 MB/h** upper bound if every source refetches (ring is skipped internally for 30 min).

One GOES ACMF slot **21.5 MB**; CMIPF C13 **23.9 MB**. Full-disk numeric/mask for four GEOs would be **hundreds of MB/h**. Do not recommend numerical BT as the default live product on elegance grounds.

## 39. Provider/auth/licensing risks

| Path | Access | CORS | Auth | Attribution |
|------|--------|------|------|-------------|
| Current GIBS WMS PNG | public | `Access-Control-Allow-Origin: *` | none | NASA Earthdata |
| Current EUMETView WMS PNG | public | works in production fetch | none | EUMETSAT modified-data notice |
| NOAA AWS netCDF | public bucket | **not** a browser WMS | none | NOAA |
| EUMETSAT Data Store | account / policy | not WMS | yes | EUMETSAT |
| `msg_fes:clm` visualization | uncertain endpoint | unproven | — | do not wire without capabilities |

No new API key in the recommended next LIB.

## 40. Ranked future product models

| Rank | Model | Intuitive | Day/night | Freshness | Global | Scientific | Complexity | Bandwidth | Reliability |
|------|-------|-----------|-----------|-----------|--------|------------|------------|-----------|-------------|
| 1 | **B. visual PNG + per-provider fixed calibration + shared cloud-confidence transfer** (GIBS colormap-aware) | high if GIBS clear drops | IR both | current | current WMS | display-honest | medium | current | current |
| 2 | A. visual PNG + improved global transfer only | medium | IR both | current | current | weak | low | current | current |
| 3 | E. visible-day / IR-night hybrid | high by day | needs IR night | extra layers | Himawari VIS gap | mixed | high | +VIS | GIBS GeoColor OK |
| 4 | C. cloud-mask/fraction authority | high | yes | GOES AWS faster; MSG TBD | GOES+MSG yes; Himawari hard | high | high | ≫ PNG | split stack |
| 5 | D. numerical BT + shared transfer | medium (still not a mask) | yes | AWS | GOES yes; MSG account | high for CTT | high | ≫ PNG | split stack |
| 6 | F. VIS + mask + IR combined | highest | yes | mixed | hardest | highest | very high | highest | fragile |

A without GIBS canonicalization only polishes the wrong encoding. C/D/F are right scientifically and wrong as the next browser increment.

## 41. Recommended immediate implementation LIB

**WEATHER-5.1 / suggested LIB-071 — Clouds IR display interpretation: GIBS colormap-aware canonical IR + conservative shared cloud-confidence transfer**

**In scope**

- Stop treating GIBS RGB Rec.601 as if it were MSG-style grayscale IR.
- Per-provider **fixed** display→canonical-IR mapping in source/normalization metadata (not UI, not per-frame HE): GIBS gray ramp + chroma/cold-top branch using the published colormap; MSG/ring grayscale with documented polarity.
- Shared cloud-confidence curve of piecewise/high-floor shape (exact knots from this fixture + tests), version **`wx5-cloud-v2`** in the sector cache key.
- Keep coverage, quality, hard winner, heterogeneous times, ring backstop, one imageBlit, factory opacity, RGB (248,250,252), no illumination.
- DEV-only `cloudsTransfer=` comparison on captured observations; absent from production dist.
- Tests: clear-ocean / desert p95; frontal retention; GIBS chroma path; NATL seam metric; cache version isolation; WEATHER-4.3 winner regressions.

**Out of scope**

- Overlap blending, TIME sync, numeric netCDF, GeoColor, opacity default change (reassess after signal), physical OD.

Do not choose “only raise smoothstep to 120” if GIBS colored pixels still vote via Rec.601. Do not lift MSG toward GIBS wash.

## 42. Recommended second phase

**WEATHER-5.2 — residual quality-crossover presentation** only after 5.1 is measured. Narrow dual-coverage blend under §34 if the Atlantic step remains non-meteorological. Still no basin-wide feather.

## 43. Recommended later visible+IR phase

**WEATHER-6 (later):** daytime GeoColor/VIS texture, solar-altitude twilight blend, IR or mask at night. Requires Himawari visible source resolution. Separate from 5.1. Optional scientific CTT / mask layers can proceed independently once acquisition exists.

## 44. Test recommendations

- GIBS valid gray ocean (luma ~100–110 class) → low cloud confidence after canonicalization.
- MSG Sahara / clear ocean remain ~0.
- Frontal / convective p90 not collapsed to narrow-high levels.
- Colored GIBS pixels are not interpreted by Rec.601.
- Winner geometry unchanged (45°N switch still quality-equal, not MSG west limb).
- `wx5-cloud-v2` does not reuse `wx3-ir-v1` cached bytes.
- Heterogeneous times retained (this fixture East 14:00 / MSG 14:30 class).
- Per-frame histogram equalization is not production.
- DEV transfer switch compiled out of `dist/`.

## 45. Not verified

Canonical 1920×1080 CSS viewport (Cursor browser pane, not device-metrics procedure). In-app Weather status age range string this session (a11y tree still showed the enable-copy; clouds were painted). Worldview/NESDIS pixel-matched to 14:00Z (GeoColor 512×256 used qualitatively). Full colormap RGB→°C invert LUT. `msg_fes:clm` as a production WMS layer (probe PNG only). Himawari true-color correct layer id. EUMETSAT Data Store download. Tauri. Legal counsel. CMIPF size on GOES-19 2026 (G16 2025 C13 23.9 MB used). Seasonal transfer stability beyond two slots on one day.

## 46. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item remains **proposed**.
