# LIB-076 — WEATHER-5.4 cross-source cloud radiometric equivalence investigation

| Field | Value |
|-------|-------|
| ID | LIB-076 |
| Status | proposed |
| Created | 2026-08-22 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item.

Predecessor: [LIB-074](LIB-074-weather-5-3-ring-artifact-provenance-and-cross-source-texture-investigation.md) (WEATHER-5.3 ring artifact + texture; remains proposed) and [LIB-075](LIB-075-weather-5-3-1-ring-component-geometry-quality.md) (ring component-geometry quality; complete). This item investigates the remaining **cross-source presentation discontinuity** after authority is mature: why Meteosat, ring, and Himawari observations of substantially the same atmosphere become radically different visual cloud signals. Canonical laboratory: India / Mumbai / Bay of Bengal. Do not change source authority. Do not solve by generic blur. Do not start q>0 blending, ring black-point retune, WEATHER-6, numeric netCDF, cloud-mask, or physical illumination.

## Objective

Determine where in the processing pipeline (raw provider pixels → source interpretation → canonicalIR → cloud confidence → final alpha) Meteosat, ring, and Himawari become visually non-equivalent at the same Earth coordinates. Rank root causes for grain, mean radiometric step, and the straight visual seam. Recommend the smallest evidence-based production correction that makes source changes visually unobtrusive without changing authority or hiding the problem with blur or broad blending.

## Scope

**In scope**

- Repository reconnaissance of Clouds after LIB-075 (coverage ≠ quality ≠ signal, good-ring / q=0 / poor-ring authority, canonical IR, shared confidence, 64³ GIBS LUT, DEV diagnostics).
- Live India/Mumbai current-time reproduction and forced same-coordinate source comparison.
- Diagnostic-only palette projection, hybrid near-gray, larger LUT, exact colormap, forced-winner, near-time, Pacific, and GOES variants. Not production.
- Structured survey in this work item. Proposed follow-on implementation scope only.

**Out of scope**

- Any production authority, quality, ring hierarchy, confidence, canonical, blend, fetch, opacity, visible, or illumination change.
- Activating this item or creating an approved implementation LIB from this survey.
- WEATHER-5.5 ring calibration, BP56 retune, WEATHER-6, numeric netCDF as a live default, cloud-mask, physical illumination, new user controls.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-069](LIB-069-weather-4-3-quality-plane-overlap-authority.md) through [LIB-075](LIB-075-weather-5-3-1-ring-component-geometry-quality.md)

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
- Visual verification: live Clouds in ordinary current-time mode plus diagnostic rasters inspected independently of production paint.

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md) — awaiting-human-decision pointer only

## Completion record

Leave empty until a human approves and this survey is formally closed, or until a later approved item supersedes it. The structured survey below is the investigation record.

---

# Structured survey

Recorded 2026-08-22. Diagnostic files lived only under `/tmp/libration-weather54-equivalence/` (not added to the repository). Production Clouds composition, authority, ring semantics, quality thresholds, confidence curve, canonical mappings, blending, source fetch, opacity, visible imagery, and illumination were not modified.

Repository truth vs live-provider measurements are labeled **(repo)** and **(live)** below.

## 1. Verdict

**WEATHER-5.4 CROSS-SOURCE CLOUD EQUIVALENCE INVESTIGATION COMPLETE**

The India/Mumbai straight boundary is a **legitimate LIB-075 class edge** (Meteosat | good-ring | Himawari θ=75°) whose **appearance** is not meteorological. The same atmosphere is being turned into unequal display signals.

Two separable defects:

1. **Himawari/GIBS grain (texture).** NASA GIBS Band13 reuses the RGB gray diagonal for two legend branches (cold −79.6…−70.6 °C after magenta, and warm −18.85…+57 °C after cyan). RGB nearest-segment / 64³ LUT cannot tell them apart. Exact palette colors 102 and 103 are 1 RGB unit apart and map to canonicalIR **0.89 vs 0.26**. Naive “exact ordered-colormap projection” **makes this worse** and would destroy WEATHER-5.1 GOES clear-ocean. A **chroma-aware warm-gray inversion** is the root GIBS correction.
2. **Mean radiometric step at the painted seam (ring → Himawari).** Even on matched cloudy decks, Himawari canonicalIR sits ~0.05–0.12 above ring. At the q≈0 reclaim, GIBS often paints chromatic convection or cold-gray aliases while ring sits below the 0.30 confidence floor. Shared transfer then amplifies. That remainder is **ring/GIBS calibration**, not authority, and should not be bundled into the GIBS gray LIB.

Do not blur. Do not blend q>0. Do not change winners. Do not replace 64³ with exact nearest-segment.

## 2. Repository state

`docs/STATE.md` was **AWAITING SCOPE** at start and remains so. This item is **proposed**. No implementation LIB was activated. Production Clouds authority, ring, quality, confidence, canonical mappings, blending, fetch, opacity, visible imagery, and illumination were not changed. Transfer remains `wx5-cloud-v2`. Authority remains `wx53-ring-geo-q1`.

## 3. Canonical India fixture

**(live)** Product UTC **2026-08-22T20:37:56Z**. Crop 10–40°N, 55–95°E (2048×1024 pixels 1336–1564, 284–455).

| Source | Observation TIME | Age vs product |
|--------|------------------|----------------|
| Meteosat `msg_fes:ir108` | **2026-08-22T20:15:00Z** | 23 min |
| Himawari GIBS Band13 | **2026-08-22T18:30:00Z** | 128 min |
| EUMET ring | **2026-08-22T18:00:00Z** | 158 min |
| GOES-East | 2026-08-22T18:40:00Z | 118 min |
| GOES-West | 2026-08-22T18:40:00Z | 118 min |

Cursor Browser `?cloudsSectorDebug=winner` on `http://localhost:1420/` at ~20:43Z: Clouds on, winner tints visible, India seam through Mumbai confirmed.

## 4. Visible seam longitude/path

The conspicuous **straight N/S line** is **ring → Himawari** at Himawari θ=75°, not MSG → ring and not a grid line.

| lat | MSG → ring | ring → Himawari (visible line) |
|----:|-----------:|-------------------------------:|
| 15°N | 65.25°E | **75.75°E** |
| 25°N | 63.50°E | **77.50°E** (pixel x=1464, **77.43°E**) |
| 35°N | 60.50°E | **80.50°E** |

User crop “western/central India, east/right side brighter and stippled” matches **77.4°E at 25°N** (east of Mumbai 72.8°E, which is still ring). MSG→ring at 63.5°E is a milder second edge (Pakistan/western India).

## 5. Source ownership on each side

West→east: **Meteosat (yellow) | good-ring (violet) | Himawari (green)**. Dual q>0 MSG∩Himawari in the crop: **0**. At 25°N 77.4°E: ring **q=255**, Himawari **q=2** (just usable). Legitimate class transition: good-ring | usable Himawari.

## 6. Same-coordinate source comparison

Forced evaluation even where the source does not win. Factory opacity 0.42.

| site | lon,lat | winner | MSG RGBA / q / IR / conf / A | ring RGBA / q / IR / conf / A | Himawari RGBA / q / IR / conf / A |
|------|---------|--------|------------------------------|-------------------------------|----------------------------------|
| Pakistan/west | 67°E 25°N | ring | 54 gray / 0 / 0.21 / 0 / 0 | 73 gray / 255 / 0.09 / 0 / 0 | 136 gray / 0 / 0.35 / 0.06 / 7 |
| Mumbai | 72.8°E 19.1°N | ring | 69 gray / 0 / 0.27 / 0 / 0 | 74 gray / 255 / 0.09 / 0 / 0 | 138 gray / 0 / 0.36 / 0.07 / 7 |
| Delhi | 77.2°E 28.6°N | ring | α=0 | 103 gray / 255 / 0.24 / 0 / 0 | 143 gray / 0 / 0.37 / 0.09 / 10 |
| central India seam | 78°E 25°N | **Himawari** | α=0 | 130 gray / 255 / 0.37 / 0.10 / 10 | **(3,162,42) chroma 159 / q=2 / 0.63 / 0.73 / 78** |
| 25°N 75°E (stripe) | 75°E 25°N | ring | α=0 | IR 0.11 conf 0 | **IR 0.89 conf 0.98** (q=0, not painted) |

At the painted seam a GIBS **chromatic convective** pixel (green) becomes conf 0.73 while ring gray 130 is conf 0.10. One degree west, unpainted Himawari is a **cold-gray alias** (IR 0.89) against ring-clear.

## 7. Observation-time contribution

Himawari − MSG = **−105 min**. Ring − MSG = **−135 min**. Himawari − ring = **+30 min**.

Near-time control: MSG GetMap at Himawari TIME 18:30Z. Dual-coverage |ΔIR| **0.178** vs current-default **0.166**. Mismatch **does not shrink** when TIME is aligned. A 30–105 min Δt cannot draw a meridian-straight style boundary. Radiometric/interpretation confirmed. Do not synchronize production.

## 8. Raw Himawari result

India crop opaque 31,612. RGB means 129 / 150 / 140. Luma p50 **146**. Chroma p50 **0**, mean 40 (tail from rainbow cores). **75.4% exact gray (chroma 0)**; 24.6% chromatic. Rainbow convection is in the raw PNG. Gray field is already stippled at 2048×1024.

## 9. Raw Meteosat result

Opaque 19,069 (east of coverage is α=0). **100% gray** (chroma 0). Luma p50 **45**, mean 58, max 255. Smooth, conservative, darker than GIBS gray. Limb in this crop.

## 10. Raw ring result

Opaque 39,388, **100% gray**. Luma p50 **89**, mean 100, min 54 (at the black-point). Smoother than Himawari, brighter than MSG. Visually closer to **MSG family** (inverted grayscale) than to GIBS rainbow. Internal mosaic join is not the 77.4°E line (that line is our θ=75° mask).

## 11. Is Himawari grain present in raw provider imagery?

**Yes.** Salt-and-pepper is already visible in the raw GIBS PNG gray field and in rainbow cores. Pipeline inversion **adds** a second grain: gray-branch aliasing that turns some near-gray pixels into IR≥0.8 / conf≈1.

## 12. GIBS palette semantics

**(repo)** `Clean_Longwave_Infrared_Window_Band.xml`, 238 entries, −92.0 to >57.0 °C. Order: white → magenta/pink → **cold gray (−79.6…−70.6 °C, 10 knots)** → red/yellow/green/cyan → **warm gray (−18.85…+57 °C, 153 knots)**. Both gray branches lie on the same RGB diagonal. Display pixels are **not** numerically comparable to MSG/ring grayscale. GIBS GetCapabilities: `image/png` only, style `default`. `image/png8` / gif: HTTP 400.

## 13. 64³ LUT error

India Himawari vs `projectRgbOntoGibsBand13Colormap` (nearest segment):

| subset | n | mean \|ΔIR\| | p50 | p90 | p95 | max |
|--------|--:|-------------:|----:|----:|----:|----:|
| all | 31612 | **0.356** | 0.479 | 0.563 | 0.576 | 0.846 |
| chromatic chroma>8 | 7772 | **0.0014** | 0.0002 | 0.0005 | 0.0005 | 0.830 |
| near-gray chroma≤8 | 23840 | **0.472** | 0.509 | 0.570 | 0.581 | 0.846 |

LUT is excellent on chromatic legend colors. The 0.30-class error from WEATHER-5.3 is **entirely near-gray**, and “exact” is not the ground truth (see §16).

Synthetic RGB vs exact: 64³ mean 0.0079, 128³ mean 0.0068, **max still 0.85**. Higher LUT resolution does not remove gray-branch collision. Build: 64³ 755 ms / 1 MiB; 128³ 6.0 s / 8 MiB.

## 14. Near-gray ambiguity

Definition used: `max(R,G,B)−min(R,G,B) ≤ T` for T∈{0,8,16}. India is bimodal: chroma 0 (23831) or chroma≥17 (7678); T=8 vs 16 almost identical.

**(repo)** No RGB triple appears twice in the table, but **the gray diagonal is a line occupied by both branches**. `projectRgbOntoGibsBand13Colormap` uses first-min `d2`; ties keep the **earlier (cold) segment**.

| RGB | production LUT (exact palette hit) | nearest-segment “exact” | hybrid warm-luma |
|-----|-----------------------------------:|------------------------:|-----------------:|
| 102,102,102 | **0.886** (cold −74.6 °C) | 0.886 | 0.265 |
| 103,103,103 | **0.265** (warm +17.65 °C) | **0.886** | 0.265 |
| 128,128,128 | 0.332 (warm) | 0.892 | 0.332 |

Warm legend skips 102 (103 then 101). Isolated **102 in a 101/103 ocean field is quantization, not −74 °C**.

India chroma-0 occupancy: exact warm-gray **81.4%**, exact cold-gray **3.4%** (816 px), other gray 15.1%. Of exact cold-gray hits, **82% are isolated in a gray neighborhood** (not next to magenta/red). IR histogram of chroma-0 is gapped: 0.3–0.6 or **0.8–1.0** (1922 px); nothing in 0.6–0.8.

## 15. WMS resampling contribution

India Himawari local IR variance vs request size (same bbox):

| tag | size | IR local-var mean |
|-----|------|------------------:|
| production-equivalent | 228×171 | 0.0145 |
| 2× | 456×342 | 0.0082 |
| hi | 800×600 | **0.00056** |

Coarse GetMap **amplifies** gray-branch hopping. Grain is not 2048-only unique geometry, but downsampling makes it worse. No PNG8/indexed path. No evidence to change the production endpoint in this LIB.

## 16. Exact palette diagnostic

Nearest-segment “exact” on India reduces Bay local IR variance 0.0149 → 0.0094 but maps GOES-East **clear-ocean** pixels that production treats as conf 0 to conf **p50 0.979**. Unshippable. It prefers the cold gray branch on the diagonal. Compute: **2129 ms** / 2048×1024 vs LUT **22 ms**.

## 17. Hybrid near-gray diagnostic

Rule: chroma≤8 → canonicalIR from **warm-gray legend luma**; else production LUT.

- India Bay IR local-var **0.0149 → 0.0061** (2.4×).
- GOES-East clear conf stays **~0** (matches production; exact would be 0.98).
- Chromatic convection unchanged (LUT already exact).
- Cost **237 ms** / 2048×1024 (cacheable off-rAF). Can be a 256-entry luma LUT.

Do not ship from this survey. This is the evidence-supported production model.

## 18. Larger-LUT diagnostic

128³ does not resolve structural gray reuse (max error 0.85). Memory ×8, build ×8, grain class unchanged. **Not the answer.**

## 19. CanonicalIR equivalence

Matched pixels with conf>0.2 in ≥2 sources:

| feature | ring IR p50 | Himawari IR p50 | MSG IR p50 |
|---------|------------:|----------------:|-----------:|
| Himalaya belt | 0.57 | 0.61 | n/a |
| Bay of Bengal deck | 0.58 | 0.62 | n/a |
| N/central India mass | 0.55 | 0.67 | 0.54 |

Cloudy decks **roughly agree** (Himawari a bit high). The painted seam is often **ring-below-floor vs Himawari-cloud**, not two calibrated cloudy values. Provider calibration remains imperfect; gray aliasing makes Himawari look much colder than it is on mixed gray.

## 20. Confidence equivalence

Same features: Himalaya ring conf p50 0.53 vs Himawari 0.68; Bay 0.58 vs 0.70; central India 0.49 vs 0.82. Divergence is larger in confidence than in IR on the India mass because of the steep 0.40–0.52 knot.

## 21. Shared-transfer amplification

Dual MSG∩Himawari coverage (all q=0): mean |ΔIR| 0.166, mean |Δconf| 0.166, median amp **0.74**, p90 **2.24**, p95 2.69. Transfer is a **selective amplifier** at the 0.40–0.52 rise, not the author of the θ=75° line. At 78°E 25°N: ΔIR 0.26 → Δconf 0.63 (amp ~2.4).

## 22. Ring↔Himawari contribution

**The visible line is ring → Himawari**, not MSG → ring. 25°N alpha step: MSG→ring **9.1** (ratio 2.2); ring→Himawari **144.8** (ratio **22**). 15°N ring→Himawari alpha step 94.8, ratio 24. After a GIBS gray fix, a residual ring/GIBS mean step is expected (WEATHER-5.5). Do not retune BP56 here.

## 23. Texture seam metric

Himawari Bay IR local-var **0.0149** vs MSG west **0.00035** (~42×) vs ring mid **0.00052** (~29×). Neighbor |ΔIR| Himawari 0.085 vs MSG 0.007. Hybrid cuts Himawari var to 0.006 still above MSG. Texture seam ≫ within-source change. (The summed-source textureRatio on the winner edge is a weaker diagnostic than these box variances.)

## 24. Alpha seam metric

25°N ring→Himawari: left mean highlight α **27**, right **172**, step **145**, within-source step 6.6, ratio **22**. MSG→ring step 9. Modest alpha seam west, huge alpha seam east.

## 25. Cloud morphology retention

Chromatic cores (green/yellow/red) already invert correctly through the LUT (mean |ΔIR| 0.001). Hybrid leaves those pixels on the LUT. Do not box-blur GIBS RGB (WEATHER-5.3: blur **increased** variance). Small convective cells must stay; only gray-branch speckles should leave.

## 26. External-reference assessment

Qualitative only, as requested: a current external satellite view of India/Himalaya/Bay shows a **continuous** cloud field with **no** meridian cut. Our straight line is source-class geometry plus unequal display encoding, not a weather front. Do not copy external styling.

## 27. GOES regression implications

Any GIBS mapping change applies to **East, West, and Himawari**. Exact nearest-segment would paint NATL clear ocean as conf≈1 and undo WEATHER-5.1. Hybrid warm-gray keeps clear conf 0. Future tests must include East/West clear-ocean and frontal retention.

## 28. Pacific generalization

Himawari 140–170°E, 0–25°N: LUT vs exact mean |ΔIR| **0.41**; IR local-var **0.024** (worse than India Bay). Grain is a **GIBS Band13** property, not an India-only tune.

## 29. Numeric-source alternatives

Unchanged from [LIB-070](LIB-070-weather-5-cloud-radiometry-and-presentation-investigation.md): NOAA AWS CMIPF ~24 MB/slot, no CORS WMS; EUMETSAT Data Store not browser WMS; GIBS has **no** numeric style; Himawari scientific BT is the same class (NICT/JAXA/AWS, not live WMS). Feasible later fallback if display inversion fails; **not** the next LIB. Ring has no numeric WMS.

## 30. Root-cause ranking

**Grain**

1. GIBS dual gray-branch RGB ambiguity (A)
2. 64³ LUT snapping non-exact near-gray to cold 102 (B; amplifier of A)
3. WMS coarse resampling (C; amplifier)
4. Provider intrinsic GIBS visualization speckle (D)
5. Shared-transfer amplification of IR hops across 0.40 (F)
6. Observation time (G) — rejected as author
7. True weather (I) — real cells exist; the speckle pattern is not them

**Mean radiometric step**

1. Provider display products not comparable (D/E): rainbow BT viz vs two grayscale stretches
2. Ring black-point 56 holding typical India ring below the 0.30 floor (E; do not retune here)
3. GIBS chromatic convection mapping colder than ring gray of the same feature (E)
4. Transfer amplification (F)
5. Residual gray aliases on Himawari (A)

**Visible straight seam**

1. Source authority geometry: Himawari θ=75° reclaim (H) — **correct**, not a bug
2. Appearance of that line from grain + mean step (A+E)
3. Not MSG coverage-east, not a grid line, not θ drawn in the provider PNG

## 31. Ranked production models

| Rank | Model | Visual eq. | Scientific | Perf | BW | Complexity | Stability |
|-----:|-------|------------|------------|------|----|------------|-----------|
| 1 | **D. hybrid: chromatic 64³ LUT + near-gray ordered warm-gray inversion** | best for grain without GOES wash | legend order, not RGB nearest | 0.24 s cacheable | same PNG | low | fixed mapping |
| 2 | D′ + neighborhood gate allowing cold-gray only beside magenta/red | slightly more conservative | matches legend topology | same | same | low+ | fixed |
| 3 | E. alternate GIBS format | n/a | none exists (png8 400) | — | — | — | — |
| 4 | C. exact ordered-colormap for every pixel | grain down, **GOES clear destroyed** | tie-breaks to cold branch | 2.1 s | same | low | bad |
| 5 | B. 128³ LUT | no | no | 8 MiB | same | low | no |
| 6 | A. keep 64³ | status quo | incomplete | 22 ms | same | none | yes |
| 7 | F. numeric BT | true eq. | yes | high | tens of MB | high | later |
| 8 | G. source-local smoothing | hides cells | no | cheap | same | low | **reject** |

## 32. Recommended immediate implementation LIB

**LIB-077 — WEATHER-5.4.1: chroma-aware GIBS Band13 near-gray inversion** — proposed only; human must approve.

In scope: for GIBS East/West/Himawari, pixels with chroma ≤ a documented threshold (investigate 4–8 in implementation tests) invert canonicalIR along the **warm-gray legend** by luma; chromatic pixels keep the production 64³ LUT; bump transfer version; cache per observation as today; tests for 103 gray conf 0, GOES East/West clear-ocean identity, Himawari India/Pacific grain drop, chromatic convection retention, **winner-map identity**, no authority dependence on signal.

Out of scope: overlap authority, ring BP56, blending, TIME sync, exact-segment-for-all, RGB blur, WEATHER-6, numeric netCDF, user controls.

## 33. Whether ring calibration is also required

**Yes, separately (WEATHER-5.5).** After GIBS gray inversion, ring↔Himawari cloudy-deck medians are close-ish but the stripe still tends to sit below the confidence floor where Himawari shows cloud, and chromatic GIBS cores still out-rank ring gray. Do not bundle BP56 or ring stretch into 5.4.1.

## 34. Need for q>0 blending after normalization

**No as the next step.** Dual q>0 MSG∩Himawari is still empty. The seam is good-ring | barely-usable Himawari. Test normalization first. A tiny blend is a diagnostic control only; it is not the solution.

## 35. Performance implications

2048×1024 Himawari pixels: LUT 22 ms, hybrid 237 ms, exact 2129 ms. Hybrid belongs in the **existing per-observation cache**, not rAF. Optional 256-entry warm-gray luma table makes hybrid ~LUT-class. Memory unchanged if 64³ stays for chromatic. One composed PNG, one `imageBlit`.

## 36. Test recommendations

- Near-gray: 103,103,103 stays conf 0; 102 in a 101/103 neighborhood does **not** become IR 0.89.
- Chromatic legend order unchanged (magenta/red/yellow/cyan).
- Production LUT vs exact on chroma>8: mean |ΔIR| bound ~0.04 (already true).
- Matched-feature ring vs Himawari IR medians do not regress by more than the current ~0.1.
- GOES-East NATL clear-ocean conf remains 0 (WEATHER-5.1).
- Convective GIBS cores retain high confidence.
- Winner identity vs LIB-075 (India 25°N still meteosat | good-ring | himawari).
- No authority dependence on canonicalIR/confidence.
- Two Himawari slots: mapping does not pulse mean IR (18:30 vs 18:10 India mean IR 0.473 vs 0.475 already stable).
- Pacific Himawari grain metric drops with the same mapping.
- East and West included in every GIBS mapping test.

## 37. Not verified

- In-app solar shading OFF pixel-identical to ON.
- Full 1920×1080 India-centered canvas export (Cursor pane is Americas-weighted; India seam still visible at world scale with winner debug).
- External licence counsel / copying of third-party styling.
- Himawari numeric BT CORS in 2026 (class unchanged from LIB-070; not re-downloaded).
- Hybrid on a re-composed full-world winner (Himawari-only crops + GOES box + metrics only).
- Tauri binary.

## 38. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item stays **proposed**.
