# LIB-078 — WEATHER-5.5 ring-GIBS mean cloud-confidence calibration investigation

| Field | Value |
|-------|-------|
| ID | LIB-078 |
| Status | proposed |
| Created | 2026-08-22 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item.

Predecessor: [LIB-076](LIB-076-weather-5-4-cross-source-cloud-radiometric-equivalence-investigation.md) (WEATHER-5.4 radiometric equivalence; remains proposed) and [LIB-077](LIB-077-weather-5-4-1-chroma-aware-gibs-near-gray-inversion.md) (chroma-aware GIBS near-gray inversion; complete). This item investigates whether the **EUMET ring canonical mapping** systematically understates cloud evidence relative to **corrected GIBS Band13** after LIB-077, and whether a **fixed monotone ring calibration** can improve same-coordinate equivalence without whitening clear ocean, Sahara, night surfaces, or Antarctica. Do not change source authority. Do not blend. Do not reopen LIB-077. Do not start WEATHER-6, numeric netCDF, cloud-mask, or physical illumination.

## Objective

Determine whether the production ring mapping `canonicalIR = clamp((luma − 56) / 199, 0, 1)` represents equivalent cloud evidence to the LIB-077 hybrid GIBS interpretation at the same coordinates, especially where provider-valid good-ring pixels fall below the shared 0.30 confidence floor while Himawari shows substantial cloud. Rank fixed monotone ring calibrations. Recommend one narrow implementation, or keep BP56, from evidence.

## Scope

**In scope**

- Repository reconnaissance of Clouds after LIB-077 (coverage ≠ quality ≠ signal, good-ring / q=0 / poor-ring authority, hybrid GIBS gray, ring BP56, shared confidence, DEV diagnostics).
- Live India / Mumbai / Bay-of-Bengal same-coordinate ring vs Himawari vs Meteosat comparison using production modules read-only.
- Ring luma / canonical / confidence distributions, component-conditioned ring response, clear-sky penalty, cloud-equivalence, seam re-measurement, and candidate BP / affine / piecewise mappings. Diagnostic only.
- Structured survey in this work item. Proposed follow-on implementation scope only.

**Out of scope**

- Any production authority, quality, ring hierarchy, GIBS gray interpretation, confidence curve, opacity, RGB, blend, fetch, TIME, visible, or illumination change.
- Activating this item or creating an approved implementation LIB from this survey.
- Per-frame histogram matching, live overlap learning, q>0 blending, WEATHER-6, numeric netCDF as a live default, cloud-mask, physical illumination, new user controls.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-069](LIB-069-weather-4-3-quality-plane-overlap-authority.md) through [LIB-077](LIB-077-weather-5-4-1-chroma-aware-gibs-near-gray-inversion.md)

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

Recorded 2026-08-22. Diagnostic files lived only under `/tmp/libration-weather55-ring-cal/` (not added to the repository). Production Clouds composition, authority, ring semantics, quality thresholds, GIBS gray interpretation, confidence curve, canonical mappings, blending, source fetch, opacity, visible imagery, and illumination were not modified.

Repository truth vs live-provider measurements are labeled **(repo)** and **(live)** below. Cloud-class labels A–E use corrected Himawari canonicalIR as a partition of same-coordinate samples, not as numeric weather authority. External satellite imagery was used only qualitatively.

## 1. Verdict

**WEATHER-5.5 RING-GIBS MEAN CALIBRATION INVESTIGATION COMPLETE**

After LIB-077, the India salt-and-pepper grain is materially reduced and the painted source line is a legitimate LIB-075 class edge (Meteosat | good-ring | Himawari θ=75°). The remaining mean-brightness discontinuity is a **ring canonical calibration** defect, not authority, not q=0, not ring-component quality, not GIBS gray-branch ambiguity, and not TIME.

The EUMET ring mapping **systematically understates** cloud evidence relative to corrected GIBS Band13 at the same coordinates. In the India crop, **70.4%** of provider-valid good-ring pixels sit below the shared IR 0.30 confidence floor (median ring IR **0.17**, confidence **0**). Dual-coverage Himawari sits **ΔIR p50 +0.19** / **Δconf p50 +0.12** above ring. Ordinary cloud (class C) is ring IR 0.29 / conf 0 vs Himawari 0.45 / 0.24. Deep convection remains a second, different mismatch: chromatic GIBS cores (e.g. 78°E 25°N IR 0.62 / conf 0.71) versus ring gray luma 124 (IR 0.34 / conf 0.05). Black-point changes cannot and should not force those encodings to match.

BP56 is **not** a documented brightness-temperature scale. It is visual/empirical tuning from LIB-071 so observed ring-clear luma ~73 would sit near MSG-clear canonicalIR after Rec.601-era GIBS wash. The wx5 0.30 floor already keeps typical ring-clear (luma ~63–73 → identity IR 0.25–0.29) at confidence 0. **The black-point is now obsolete for clear protection and is eating ordinary cloud.**

A stable **identity grayscale** mapping, the same rule already used for Meteosat, is the smallest safe fixed calibration:

```
canonicalIR = clamp(luma / 255, 0, 1)
```

Sahara, Arabian Sea, and MSG-clear Atlantic remain confidence 0. Ordinary-deck India seams close. Chromatic convective cores stay brighter than ring gray (IR-only / false-color limit). Do not blend. Do not histogram-match. Do not learn from live overlap. Do not change GIBS, confidence knots, authority, opacity, or color.

## 2. Repository state

`docs/STATE.md` was **AWAITING SCOPE** at start and remains so. This item is **proposed**. No implementation LIB was activated. Production Clouds authority (`wx53-ring-geo-q1`), GIBS gray (`wx54-gibs-gray-v3`, chroma ≤ 8 warm-gray), ring BP56, confidence knots, factory opacity 0.42, and RGB `(248,250,252)` were not changed.

## 3. Post-LIB-077 India baseline

**(live)** Product UTC **2026-08-22T21:41:56Z**. Crop 10–40°N, 55–95°E (2048×1024). Factory opacity 0.42. LIB-077 hybrid GIBS interpretation.

| Source | Observation TIME | Age vs product |
|--------|------------------|----------------|
| Meteosat `msg_fes:ir108` | **2026-08-22T21:15:00Z** | 27 min |
| EUMET ring | **2026-08-22T21:00:00Z** | 42 min |
| Himawari GIBS Band13 | **2026-08-22T19:30:00Z** | 132 min |
| GOES-West | 2026-08-22T19:40:00Z | 122 min |
| GOES-East | 2026-08-22T19:20:00Z | 142 min |

India winner counts: Himawari **16,970** / ring **14,492** / Meteosat **7,926**. West→east ownership: **Meteosat | good-ring | Himawari**. Dual q>0 MSG∩Himawari in the crop remains empty.

25°N ring→Himawari painted alpha step **76.5** (left 0, right 76.5). LIB-076 pre-LIB-077 was **~145** (left 27, right 172). GIBS gray inversion cut the Himawari-side highlight roughly in half. The leftover step is ring-below-floor versus real Himawari cloud, plus chromatic convection at this latitude.

## 4. Current ring canonical mapping

**(repo)** `canonicalIR01FromEumetRingIr108Gray`:

```
IR = clamp((luma − 56) / (255 − 56), 0, 1)
```

`EUMET_RING_CANONICAL_IR_BLACK = 56`. Shared knots unchanged: IR `0.00/0.30/0.40/0.52/0.68/0.82/1.00` → confidence `0/0/0.12/0.45/0.82/0.97/1`. Meteosat is identity `luma/255`. GIBS is LIB-077 hybrid.

Floor luma under BP56: IR 0.30 → **116**; 0.40 → **136**; 0.52 → **159**; 0.68 → **191**; 0.82 → **219**.

## 5. BP56 rationale

**(repo)** Code comment in `cloudIrInterpretation.ts`: ring clear ocean ~73, p50 ~98; subtract 56 so typical clear sits near Meteosat clear-ocean canonicalIR rather than the former GIBS Rec.601 wash floor. LIB-071 tests lock luma 73 and 98 at confidence 0, luma 220 high. LIB-070 recorded ring as a third grayscale stretch with **no documented Kelvin legend** on the WMS layer.

**(live)** WMS `Abstract` for `mumi:worldcloudmap_ir108` is **"A sample style for rasters"**. Product EO:EUM:DAT:0330 is a **visualization** of multi-GEO IR window brightness temperatures (SEVIRI IR10.8, ABI IR10.3, AHI IR10.4), not a numeric BT field and not a published 8-bit LUT. India ring-valid **min luma = 56** (p1=62); BP56 is essentially the observed PNG floor.

**Rationale is visual/empirical, not provider documentation.** After wx5’s 0.30 IR floor, that offset is no longer required to keep Sahara / Arabian Sea at confidence 0, and it holds ordinary cloud below the floor.

## 6. Ring raw-luma distributions

**(live)** India crop, ring coverage ∧ ring q>0, n=**38,817**.

| | p1 | p5 | p10 | p25 | p50 | p75 | p90 | p95 | p99 | mean | stddev |
|--|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| all | 62 | 66 | 68 | 73 | **90** | 121 | 148 | 167 | 199 | 100.3 | 33.0 |

Min 56, max 220. Class-partitioned ring luma follows Himawari IR class: A ~73, B ~79, C ~114, D ~136, E ~170 (from IR back-solve). Clear-ish west India / Arabian Sea luma **70–74**. Himalaya **117**. Bay ring gray **122** under a chromatic GIBS core.

## 7. Ring canonical/confidence distributions

Same India good-ring set.

| | p1 | p5 | p10 | p25 | p50 | p75 | p90 | p95 | p99 | mean |
|--|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| IR | 0.03 | 0.05 | 0.06 | 0.09 | **0.17** | 0.33 | 0.46 | 0.56 | 0.72 | 0.223 |
| conf | 0 | 0 | 0 | 0 | **0** | 0.02 | 0.29 | 0.50 | 0.85 | 0.073 |

**70.4%** of these valid good-ring pixels have IR < 0.30 (confidence 0). IR=0 fraction is **0.005%** (the PNG floor, not a mass of clipped clear).

## 8. Corrected GIBS distributions

**(live)** Same India dual-coverage pixels, LIB-077 hybrid, n=**31,244**.

| | p1 | p5 | p10 | p25 | p50 | p75 | p90 | p95 | p99 | mean |
|--|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| IR | 0.28 | 0.32 | 0.33 | 0.36 | **0.41** | 0.50 | 0.61 | 0.69 | 0.88 | 0.442 |
| conf | 0 | 0.01 | 0.02 | 0.07 | **0.13** | 0.42 | 0.66 | 0.82 | 0.98 | 0.254 |

Post-LIB-077 Himawari is no longer a cold-gray spike field. Stripe 75°E 25°N Himawari is gray 122, IR **0.315**, conf **0.007** — not the old IR 0.89 alias. Chromatic cores still invert through the 64³ LUT (78°E 25°N RGB `(0,149,49)`, chroma 149, IR 0.623, conf 0.713).

## 9. Same-coordinate ring/Himawari comparison

Forced evaluation wherever both have provider coverage, regardless of winner. n=**31,244**.

Δ = Himawari − ring (production BP56).

| | p10 | p25 | p50 | p75 | p90 | mean | stddev |
|--|--:|--:|--:|--:|--:|--:|--:|
| ΔIR | 0.05 | 0.12 | **0.19** | 0.26 | 0.30 | 0.183 | 0.122 |
| Δconf | 0.01 | 0.05 | **0.12** | 0.26 | 0.44 | 0.163 | 0.208 |
| \|ΔIR\| | 0.07 | 0.13 | 0.19 | 0.26 | 0.30 | **0.196** | 0.100 |
| \|Δconf\| | 0.02 | 0.06 | 0.12 | 0.28 | 0.45 | **0.190** | 0.184 |

Selected points (ring q=255 at all India ring sites; times as §3):

| site | lon,lat | winner | ring L/IR/conf/A | Himawari RGB / IR/conf/A / q |
|------|---------|--------|------------------|------------------------------|
| Arabian Sea | 62°E 18°N | MSG | 70 / 0.07 / 0 / 0 | (31,31,31) / 0.08 / 0 / 0 / q=0 |
| Mumbai | 72.8°E 19.1°N | ring | 79 / 0.12 / 0 / 0 | (134,134,134) / 0.35 / 0.05 / 6 / q=0 |
| stripe 75°E | 75°E 25°N | ring | 74 / 0.09 / 0 / 0 | (122,122,122) / **0.32 / 0.01** / 1 / q=0 |
| Delhi | 77.2°E 28.6°N | ring | 89 / 0.17 / 0 / 0 | (131,131,131) / 0.34 / 0.04 / 4 / q=0 |
| seam | 78°E 25°N | **Himawari** | 124 / 0.34 / 0.05 / 5 | **(0,149,49)** chroma 149 / 0.62 / 0.71 / 76 / q=2 |
| Himalaya | 80°E 30°N | Himawari | 117 / 0.31 / 0.00 / 0 | (173,173,173) / 0.45 / 0.24 / 25 / q=5 |
| Bay deck | 88°E 16°N | Himawari | 122 / 0.33 / 0.03 / 3 | (10,157,45) / 0.63 / 0.72 / 77 / q=182 |

LIB-076’s 75°E IR 0.89 example is gone. The painted 25°N step is now **chromatic convection vs ring gray**, not a false cold spike.

## 10. Same-coordinate ring/MSG comparison

**(live)** Dual ring∧MSG coverage, ring q>0, global, n=**603,515**. Δ = MSG − ring (BP56).

| | p10 | p25 | p50 | p75 | p90 | mean |
|--|--:|--:|--:|--:|--:|--:|
| ΔIR | 0.02 | 0.03 | **0.08** | 0.17 | 0.26 | 0.117 |
| Δconf | 0 | 0 | **0** | 0.22 | 0.49 | 0.137 |

Ring is also conservative versus MSG, but the gap is smaller than ring vs Himawari. Sahara 10°E 23°N: ring IR 0.035 / MSG 0.031, both conf 0. Equatorial Africa 20°E 0°: ring 0.44 / 0.20 vs MSG 0.48 / 0.36. Calibrating ring toward identity **aligns it with MSG’s rule**, not against it. MSG still wins q>0 Africa/Sahara, so painted Sahara does not depend on the ring mapping.

## 11. Three-way comparison

Where ring and MSG both cover (Himawari often q=0 here):

| lon,lat | ring IR/conf | MSG IR/conf | Himawari IR/conf / q |
|---------|-------------:|------------:|----------------------|
| 62°E 18°N | 0.07 / 0 | 0.12 / 0 | 0.08 / 0 / q=0 |
| 58°E 20°N | 0.07 / 0 | 0.09 / 0 | n/a |
| 65°E 25°N | 0.09 / 0 | 0.20 / 0 | 0.38 / 0.11 / q=0 |
| 10°E 23°N Sahara | 0.04 / 0 | 0.03 / 0 | n/a |
| 20°E 0° Africa | 0.44 / 0.20 | 0.48 / 0.36 | n/a |
| −10°E 20°N | 0.58 / 0.56 | 0.80 / 0.96 | n/a |

MSG and ring agree on clear. MSG is the higher of the two grayscales on cloud. Himawari, where present and gray, sits above both; chromatic Himawari sits much higher. **Ring is the conservative outlier among the three**, then MSG, then GIBS.

## 12. Clear-region findings

Production BP56 confidence:

| region | mean | p95 | frac>0.05 | frac>0.20 |
|--------|-----:|----:|----------:|----------:|
| Sahara (MSG-clear) | 0 | 0 | 0 | 0 |
| Arabian Sea (Himawari IR<0.32) | 0 | 0 | 0 | 0 |
| Atlantic (MSG-clear) | 0.000 | 0 | 0.000 | 0 |
| SIO box | 0.077 | 0.47 | 0.24 | 0.13 |
| Antarctic box | **0.619** | 0.97 | 1.00 | 0.95 |

Clear ocean and Sahara are already clean. Antarctic is already high under BP56 (cold surface / ice). SIO mean 0.077 includes the LIB-074 dark corridor (70°E 45°S ring luma 111, conf 0) where q=0 MSG/Himawari still show cloud (MSG conf 0.45, Himawari 0.31). That corridor is **under-confident ring**, not a clear-sky success.

Night India (21:42Z, ~3:12 IST): Mumbai luma 79, conf 0. No night-surface wash under BP56; the defect is missing cloud, not false cloud.

## 13. Cloud-region findings

India dual, partitioned by corrected Himawari IR:

| class | n | ring IR p50 | hima IR p50 | ring conf p50 | hima conf p50 | mean \|Δconf\| |
|-------|--:|------------:|------------:|--------------:|--------------:|---------------:|
| A clear (<0.30) | 553 | 0.10 | 0.27 | 0 | 0 | 0.10 |
| B weak (0.30–0.40) | 13,558 | 0.12 | 0.35 | **0** | 0.06 | 0.07 |
| C ordinary (0.40–0.52) | 10,815 | 0.29 | 0.45 | **0** | 0.24 | 0.22 |
| D strong (0.52–0.68) | 4,587 | 0.40 | 0.57 | 0.12 | 0.54 | 0.39 |
| E deep (≥0.68) | 1,731 | 0.57 | 0.75 | 0.54 | 0.90 | 0.39 |

Ordinary decks are the calibration target: ring sits at the floor, Himawari is already a painted cloud. Deep/chromatic cores are an encoding limit (rainbow LUT vs grayscale).

Himalaya named point is the matched ordinary-cloud example: ring luma 117 → conf 0 vs Himawari gray 173 → conf 0.24. External current imagery shows continuous Himalaya/Bay structure with no meridian cut.

## 14. Confidence-floor effect

Under BP56, confidence stays 0 until ring luma **116**. Observed:

- Arabian Sea / west India clear: luma **70–74** → treated as zero cloud (correct).
- Mumbai / Delhi mixed: luma **79–89** → zero (Himawari already weak cloud ~0.04–0.05).
- India ring p50 luma **90** → zero.
- Ordinary class-C luma ~**114** → still zero or 0.00x.
- Himalaya **117** → 0.002 (just at the floor).
- Bay ring gray **122** → 0.03 while GIBS paints a green core at 0.72.

The floor is doing the job it was designed for on true clear. Combined with BP56 it also zeroes **the entire ordinary-cloud body of the ring** in this fixture.

## 15. Fraction of valid ring suppressed below confidence floor

India good-ring: **70.4%** IR<0.30. IR=0: **0.005%**.

By Himawari class, among dual-coverage ring pixels: A 88%, B **92%**, C **52%**, D 21%, E 11% still below the floor. The B/C mass is the product defect.

Global by inferred ring component (all ring-valid pixels): MSG-0 79%, IODC 70%, GOES-East 74%, GOES-West 76%, Himawari 75%. Suppression is global, not an India-only tune.

## 16. Component-conditioned ring findings

Ring-valid luma p50 / IR p50 / conf mean:

| inferred component | n | luma p50 | IR p50 | conf mean | frac IR<0.30 |
|--------------------|--:|---------:|-------:|----------:|-------------:|
| MSG 0° | 322,264 | 82 | 0.13 | 0.048 | 0.79 |
| IODC 45.5°E | 235,178 | 94 | 0.19 | 0.076 | 0.70 |
| GOES-East | 301,186 | 89 | 0.17 | 0.057 | 0.74 |
| GOES-West | 275,964 | 91 | 0.18 | 0.052 | 0.76 |
| Himawari | 351,936 | 94 | 0.19 | 0.058 | 0.75 |

Spreads are modest (luma p50 82–94). No component is a different instrument family in this 8-bit display. Inferred component ≠ provider provenance (LIB-075).

## 17. Can one global ring calibration work?

**Yes.** Component histograms are the same stretch with slightly different weather. A single global mapping is adequate. Per-component calibration is not justified and would overfit inferred geometry.

## 18. Candidate BP mappings

Identity `luma/255` is BP0. All monotone. Clear boxes use MSG-clear / Himawari-warm predicates.

| mapping | India frac<0.30 | dual mean\|ΔIR\| | dual mean\|Δconf\| | ordinary \|Δconf\| | strong conf | Sahara >0.05 | Arab >0.05 | Atl >0.05 | SIO mean | 15°N step | 35°N step |
|---------|----------------:|-----------------:|-------------------:|-------------------:|------------:|-------------:|-----------:|----------:|---------:|----------:|----------:|
| BP56 | 0.704 | 0.196 | 0.190 | 0.225 | 0.52 | 0 | 0 | 0 | 0.077 | 27 | 15 |
| BP40 | 0.601 | 0.146 | 0.168 | 0.195 | 0.58 | 0 | 0 | 0 | 0.105 | 26 | 14 |
| BP32 | 0.558 | 0.125 | 0.156 | 0.178 | 0.60 | 0.001 | 0 | 0.002 | 0.122 | 23 | 10 |
| **BP0** | **0.343** | **0.071** | **0.130** | **0.148** | 0.69 | 0.027 | 0 | 0.037 | 0.210 | **11** | **−1** |

25°N convective seam stays ~70–76 under every BP (right-side alpha 76.5 is the green core). BP does not own that pixel.

BP0 Sahara mean conf **0.003**, p95 0.006, frac>0.20 **0.001**. Arabian Sea **0**. Typical clear luma 70–73 → identity IR 0.275–0.286, **still below 0.30**.

## 19. Candidate affine mapping

Least-squares on India dual pixels with Himawari IR≥0.35 and ring luma≥70 (n=23,827):

```
clamp(0.002298·luma + 0.2125)
```

High intercept maps Sahara luma 63 → IR 0.36 / conf 0.07. Sahara frac>0.05 = **0.93**. Arabian Sea mean 0.09, all pixels >0.05. **Reject.** Cloudy-only regression is exactly the wash we must not ship. Adaptive overlap learning is the same class of error.

A *steep* affine anchored on clear-ocean 73 → IR 0.20 and class-C 114 → IR 0.45 (`0.0061·luma − 0.245`) keeps Sahara at conf 0 but drives Antarctic mean to 0.92 and SIO 0.23. Worse polar cost than BP0 for similar India gain.

## 20. Candidate piecewise mapping

Overlap-derived monotone LUT (bin median Himawari IR) maps luma 81 → IR 0.42 and therefore washes clear (Sahara 24% >0.05 in the first pass). **Reject overlap LUTs.**

Hand knots protecting luma≤64 at IR 0:

```
(0,0), (64,0), (72,0.10), (100,0.36), (130,0.52), (170,0.82), (220,0.97), (255,1)
```

Sahara/Arabian/Atlantic stay clean. India ordinary \|Δconf\| 0.183 (vs BP56 0.225, BP0 0.148). Antarctic mean 0.92. More complexity than BP0, worse polar, worse India ordinary than identity. **Not preferred.**

Compressed linear `clamp((luma−40)/(200−40))` is the same story: midtones rise, Antarctic 0.93, Himalaya overshoots (conf ~0.37 vs Himawari 0.24).

## 21. India alpha seam results

Painted ring→Himawari θ=75° line, highlight α = confidence × 0.42 × 255, 8 px either side.

| lat | lon | BP56 L / R / step | BP0 step | piecewise-clear-safe step |
|----:|----:|-------------------:|---------:|--------------------------:|
| 15°N | **75.67°E** | 0 / 27 / **27** | 11 | 14 |
| 25°N | **77.43°E** | 0 / 76.5 / **76.5** | 70 | 74 |
| 35°N | **80.42°E** | 0 / 15 / **15** | −1 | 2 |

MSG→ring: 15°N **65.30°E**, 25°N **63.54°E**, 35°N **60.56°E** (matches LIB-076). This slot both sides are α 0 (clear west). Authority geometry unchanged.

LIB-076 25°N step ~145 / ratio ~22. New baseline step **76.5**. Ratio vs within-source is not comparable when the ring side is uniformly 0; report **step**. LIB-077 did about half the Himawari-side work. Ring calibration owns the rest of the *ordinary-deck* step (15°N/35°N), not the convective-core step (25°N).

## 22. India texture seam status

Himawari Bay local IR variance **0.00514** vs ring mid **0.00062** (~8×). LIB-076 Bay variance was **0.0149** (~29× vs ring). Grain is improved and is **not** this item. Residual texture mismatch remains a GIBS visualization / WMS property. WEATHER-5.5 owns mean calibration. Do not blur.

## 23. Clear-sky penalty

Defined as ring confidence in Sahara / Arabian Sea / MSG-clear Atlantic: mean, p95, frac>0.05, frac>0.20.

**BP0** (recommended): Sahara 0.003 / 0.006 / 0.027 / 0.001; Arabian 0 / 0 / 0 / 0; Atlantic 0.005 / 0.038 / 0.037 / 0.001.

Overlap affine: Sahara 0.076 / 0.12 / **0.93** / 0.007 — disqualifying.

BP32: Sahara 0.0002, Arabian 0, Atlantic 0.0004 — even quieter, but leaves India p50 below the floor.

## 24. Cloud-equivalence improvement

India dual mean \|Δconf\|: BP56 **0.190** → BP32 0.156 → **BP0 0.130**. Ordinary class: 0.225 → 0.178 → **0.148**. Himalaya named: 0 vs 0.24 → BP0 **0.280 vs 0.236**. Strong-cloud mean ring conf: 0.52 → **0.69** (does not crush the top). 15°N seam 27 → 11; 35°N 15 → −1.

25°N green-core step is not an equivalence failure of BP0; ring luma 124 cannot become LUT IR 0.62 without inventing a second encoding.

## 25. SIO regression

70°E 45°S: ring luma 111, BP56 conf **0**, q=246 IODC. Himawari (q=0) conf 0.31; MSG (q=0) conf 0.45. BP0 ring conf **0.19**. That raises the LIB-074 dark corridor toward the other sources’ cloud, which is the intended correction, not a visual regression. SIO box mean 0.077 → 0.21; frac>0.20 0.13 → 0.35. 70°E 55°S cold lobe stays strong (BP56 0.50 → BP0 0.80). Do not treat filling a valid-clear hole over observed cloud as Sahara-class wash.

## 26. Antarctic regression

Already high under BP56 (box mean 0.62, 75°S 0°E ring luma 203 conf 0.88). BP0 mean 0.80. Polar night / ice / cold surface is an IR-only limit. Identity does not *create* an Antarctic halo; it slightly brightens an existing cold-surface response. Do not add a polar special case in 5.5.1. Later cloud-mask / numeric BT, not this mapping.

## 27. Sahara regression

Winner is Meteosat (q=255). Ring luma 60–63. BP0 conf 0 at the named points; box frac>0.05 = 0.027 on the MSG-clear predicate. **No whitening.** Painted Sahara does not use the ring.

## 28. Atlantic regression

MSG-clear Atlantic box: BP0 mean 0.005, frac>0.20 0.001. Named −30°E 25°N and −40°E 25°N stay conf 0. Frontal cloud elsewhere in the raw Atlantic box is real weather, not wash.

## 29. Day/night regression

India 21:42Z is night. BP0 does not paint night land/ocean at Mumbai, Pakistan, or Sahara. Pacific 150°E 10°N (morning) ring luma 127 vs Himawari gray IR 0.41 / conf 0.13: BP56 ring conf 0.07 (under), BP0 0.42 (overshoot at this one point), BP32 0.16 (closest). One Pacific overshoot is not Sahara wash and does not justify overlap learning. Identity remains the global rule; note the overshoot in tests.

## 30. Temporal stability

Ring slots 21:00Z, 18:00Z, 15:00Z. Clear anchors stable: Arabian Sea luma 70/69/67, Sahara 63/62/64, all BP0 conf 0. Himalaya luma **117 on all three slots** (fixed high cloud / orography). Bay deck luma 122/177/183 — weather motion, not calibration pulsing. SIO 45°S 111/105/109. One fixed mapping is consistent across slots. No per-frame histogram.

## 31. External-reference assessment

Qualitative only: current external India/Himalaya/Bay imagery shows **continuous** cloud morphology with **no** meridian cut. Product still shows a mean step at Himawari θ=75°. Ring-zero-confidence areas west of that line (central India, Mumbai) plausibly contain the weak/ordinary cloud Himawari reports, not clear sky. Do not copy external styling or pixels.

## 32. Root-cause ranking

1. **Ring BP56 + 0.30 floor** holding typical/ordinary ring gray below display-cloud (primary).
2. **Heterogeneous encodings** (inverted grayscale vs GIBS false-color LUT) so chromatic convective cores will not match ring gray after any monotone stretch (secondary, do not overfit).
3. Shared-transfer amplification of the remaining ΔIR across 0.40–0.52 (amplifier, knots stay fixed this item).
4. Residual GIBS texture (LIB-077 improved; not this item).
5. Authority geometry at θ=75° (correct; not a defect).
6. Observation Δt (Himawari − ring = +90 min this slot) — rejected as author of a meridian-straight mean step.
7. q=0 / ring-component quality / GIBS gray branch — rechecked, not the remainder.

Which source is “right”? **Ring too conservative (A)** for ordinary decks vs both corrected GIBS *and* MSG. Himawari chromatic convection is still more aggressive (B) and should not become the calibration target. Both contribute at green-core seams (C), after ordinary-cloud calibration.

## 33. Ranked production models

| Rank | Model | Verdict |
|-----:|-------|---------|
| 1 | **B. lower/remove fixed black point — identity `luma/255` (BP0)** | Smallest safe fix. Clear-protected by the existing 0.30 floor. Ordinary-deck equivalence up. Same rule as MSG. |
| 2 | B′. BP32 | Quieter polar/Pacific; **fails** to lift India p50 over the floor. |
| 3 | D. hand piecewise clear-safe | Works, more knots, worse Antarctic, worse India ordinary than BP0. |
| 4 | C. steep anchored affine | Clear-safe possible; polar cost; extra constants without BP0’s MSG identity. |
| 5 | A. keep BP56 | Leaves 70% India good-ring display-clear. |
| 6 | C′. overlap-fit affine / LUT | Sahara wash. Reject. |
| 7 | E. component-conditioned | Unjustified; components agree. |
| 8 | F. adaptive overlap | Temporal/weather-dependent. Reject. |
| 9 | G. blend | Wrong next step. Dual q>0 India still empty. |

## 34. Recommended immediate implementation LIB

**WEATHER-5.5.1 — ring canonical identity grayscale (remove BP56)**

Exact narrow scope:

- Change only `canonicalIR01FromEumetRingIr108Gray` to `clamp(luma / 255, 0, 1)` (same as Meteosat).
- Bump cloud highlight transfer / cache version.
- Keep GIBS hybrid, confidence knots, opacity 0.42, RGB, coverage, quality, winners, TIMES, no blend.
- DEV-only `cloudsRingCalibration=production|identity` (or `bp56|bp0`) absent from production dist; optional canonical-IR / confidence / below-floor mask diagnostics.
- Tests listed in §37.
- Do not start blending, WEATHER-6, numeric BT, or cloud-mask.

Human must approve. Do not activate from this survey.

## 35. Recommended ring mapping

```
canonicalIR = clamp(luma / 255, 0, 1)
cloudConfidence = existing shared knots (unchanged)
```

Raw luma → IR → confidence (smoothstep between knots):

| luma | IR | conf |
|-----:|---:|-----:|
| 40 | 0.157 | 0 |
| 50 | 0.196 | 0 |
| 56 | 0.220 | 0 |
| 64 | 0.251 | 0 |
| 72 | 0.282 | 0 |
| 80 | 0.314 | 0.006 |
| 90 | 0.353 | 0.065 |
| 100 | 0.392 | 0.118 |
| 120 | 0.471 | 0.328 |
| 140 | 0.549 | 0.482 |
| 160 | 0.627 | 0.727 |
| 180 | 0.706 | 0.834 |
| 200 | 0.784 | 0.946 |
| 220 | 0.863 | 0.974 |

Monotone. Brighter ring display evidence never maps to weaker IR.

## 36. Performance implications

Ring mapping remains one multiply per opaque pixel. Diagnostic loop over 2,097,152 pixels including GIBS hybrid for Himawari: **529 ms** first materialize (LUT build dominates, already cached off-rAF). Identity vs BP56 is not a measurable add. No new network. Transfer version must change so old ring materializations are not reused.

## 37. Test recommendations

- Ring luma 63–73 (Sahara / Arabian Sea / MSG-clear Atlantic) stays confidence 0.
- Ring luma 117 Himalaya-class rises from ~0 to ~0.28 and is closer to corrected Himawari gray of the same point.
- Strong ring luma ≥200 still conf ≥0.94.
- India dual mean \|Δconf\| decreases vs BP56 fixture; 15°N/35°N alpha step decreases; 25°N green-core step need not vanish.
- SIO 70°E 45°S is no longer forced to conf 0 at luma ~110; do not require it to match MSG 0.45.
- Antarctic conf may rise slightly; no new false-cloud halo from *warm* polar ocean.
- Mapping monotone on luma 0–255.
- Winner / coverage / quality / TIMES identity vs production inputs.
- Two ring slots: Sahara/Arabian conf stays 0; Bay luma may move with weather.
- No authority dependence on the new IR.
- DEV calibration key absent from `dist/`.

## 38. Is q>0 blending still needed afterward?

**No as the next step.** Dual q>0 MSG∩Himawari over India is still empty. Ordinary-deck seams (15°N/35°N) largely close under identity. The leftover 25°N step is a chromatic convective core against ring gray at a barely-usable Himawari reclaim (q=2). That is encoding + meteorology, not a missing crossfade. Reassess blending only after 5.5.1 is painted; do not combine it with this calibration.

## 39. Is the IR cloud foundation nearing maturity?

**Yes, after WEATHER-5.5.1 — not before.** Live acquisition, heterogeneous freshness, coverage≠signal, quality, ring-over-q0, ring component geometry, GIBS false-color canonicalization, near-gray dual-branch repair, and (if 5.5.1 ships) ring/GIBS mean calibration form a complete IR overlay foundation. Remaining limits are inherent: warm low cloud, snow/ice, polar night, residual GIBS visualization speckle, hard winners at genuine convective intensity steps. Those are not a reason to keep stacking correction LIBs. **Do not start WEATHER-6 from this survey.** After 5.5.1, richer weather capabilities are the right pivot, not another seam polish.

## 40. Not verified

- In-app 1920×1080 India-centered canvas (Cursor pane remains Americas-weighted; India was measured on 2048×1024 WMS rasters and diagnostic crops).
- Pixel-identical illumination raster ON vs OFF.
- External licence counsel / copying of third-party styling.
- Numeric BT products (class unchanged from LIB-070; not re-downloaded).
- Seasonal transfer stability beyond three ring slots on one day.
- Tauri binary.

## 41. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item stays **proposed**.

