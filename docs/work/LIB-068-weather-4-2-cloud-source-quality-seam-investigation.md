# LIB-068 — Weather-4.2: Cloud source-quality / radiometric seam investigation

| Field | Value |
|-------|-------|
| ID | LIB-068 |
| Status | proposed |
| Created | 2026-08-21 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item.

Predecessor: [LIB-066](LIB-066-weather-4-cloud-mosaic-seam-investigation.md) (coverage vs signal) and [LIB-067](LIB-067-weather-4-1-cloud-coverage-mask-authority-replacement.md) (coverage-authority replacement). This item investigates the **remaining** hard GOES-East / Meteosat source boundary after that repair.

## Objective

Determine why the final cloud presentation still exhibits a geometrically regular, non-meteorological sector boundary after coverage authority was repaired. Quantify the roles of viewing-angle quality, extreme-limb degradation, provider radiometric/stretch differences, heterogeneous observation times, and hard winner policy. Design the next production composition model without sacrificing freshness-over-synchronization.

## Scope

**In scope**

- Repository reconnaissance of Clouds v3 after LIB-067 (coverage mask, cloud signal, paint order, IR lifts, DEV diagnostics).
- Live WMS capture of the North Atlantic / Europe canonical region and pixel-level diagnostics (raw, signal, coverage, quality, winner, blend).
- Structured survey in this work item. Proposed follow-on implementation scope only.

**Out of scope**

- Any production composition, transfer, opacity, source-priority, feathering, quality-weighting, visible/IR hybrid, or illumination change.
- Activating this item or creating an approved implementation LIB from this survey.
- Retuning smoothstep / cloud wash. Adding GeoColor. Restoring synchronized-time product behaviour.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-065](LIB-065-weather-3-high-cadence-best-current-cloud-composition.md)
- [LIB-066](LIB-066-weather-4-cloud-mosaic-seam-investigation.md)
- [LIB-067](LIB-067-weather-4-1-cloud-coverage-mask-authority-replacement.md)

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
- Visual verification: live Clouds in ordinary current-time mode plus DEV `?cloudsSectorDebug=1`. Diagnostic rasters inspected independently of production paint.

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md) — awaiting-human-decision pointer only

## Completion record

Leave empty until a human approves and this survey is formally closed, or until a later approved item supersedes it. The structured survey below is the investigation record.

---

# Structured survey

Recorded 2026-08-22. Diagnostic files lived only under `/tmp/libration-weather42-seam/` (not added to the repository). Production Clouds composition, transfer, opacity, and source priority were not modified.

Repository truth vs live-provider measurements are labeled **(repo)** and **(live)** below.

## 1. Verdict

**WEATHER-4.2 CLOUD SOURCE-QUALITY SEAM INVESTIGATION COMPLETE**

After LIB-067, the remaining hard North Atlantic seam is **not** ghost coverage. It is a **hard winner at Meteosat’s western coverage edge**, where Meteosat extreme-limb pixels (satellite zenith ≈ 85°) overwrite GOES-East mid-disk pixels (zenith ≈ 52°) because paint order is freshness-then-stable-order on coverage, with **no viewing-angle quality term**.

Primary cause: **F then B** — hard winner transitions inside valid dual-coverage, placed at the worse source’s geometric limb.

Secondary: **C + E** — GIBS vs EUMET display-stretch mismatch (already in raw PNGs) and provider enhancement. These make the limb handoff *legible* even where cloud geometry continues.

Tertiary: **D** — observation-time mismatch. Live Δt is only ~15–20 min. A near-time pair (East 03:10Z + MSG 03:30Z) still has seam ratio **5.71** vs **5.91** at Δt=110 min. Time is not required to produce the seam.

Not primary: **A** as coverage-vs-signal (fixed), **G** residual 1 px antialias. Ring is not in the Atlantic winner.

## 2. Repository state

`docs/STATE.md` was **AWAITING SCOPE** at start and remains so. This item is **proposed**. No implementation LIB was activated. Production Clouds math, transfer, opacity, source priority, and freshness doctrine were not changed.

## 3. Reproduced remaining seam

**(live)** Ordinary current-time Clouds on `http://localhost:1420/` (HUD 11:59 PM 21 Aug / 12:03 AM 22 Aug 2026 local ≈ 03:59–04:03 UTC 22 Aug). Status **Clouds · observations 38–53 min old**. Weather topic: opacity **0.42**; GOES-West **43 min**; GOES-East **53 min**; Meteosat **38 min**; Himawari **53 min**. Ring not listed. Eclipse info, earthquakes, ISS, grid coexist.

A geometrically regular disk-edge cuts the North Atlantic: west of it GIBS-style bright/washy cloud; east of it MSG-style higher-contrast / darker clear ocean. A cyclone spanning the basin is bisected. This is the selected-source footprint, not ghost ring/East leftover.

DEV `?cloudsSectorDebug=1` was not re-run in this session (coverage-authority tint already exists from LIB-067). Winner rasters were generated off-process from the same composition functions.

## 4. Canonical North Atlantic fixture

Product UTC at harness start: **2026-08-22T03:51:28Z**.

| Source | GetCapabilities default | Live in-app age | Inferred live TIME | Freshness band |
|--------|-------------------------|-----------------|--------------------|----------------|
| GOES-East | 01:40Z | 53 min | **03:00Z or 03:10Z** | GIBS GEO fresh (≤2 h) |
| GOES-West | 01:40Z | 43 min | ~03:10–03:20Z | fresh |
| Meteosat | **03:30Z** | 38 min | **03:30Z** | MSG FES fresh (≤45 min) |
| Himawari | 01:40Z | 53 min | ~03:00–03:10Z | fresh |
| EUMET ring | 03:00Z | not in status | 03:00Z | not contributing |

GIBS GetCapabilities `default` **lags** the walk-back GetMap the app actually uses (`listCloudsObservationSearchTimesMs` from `floor(now)`). Probe: 03:30Z and 03:20Z GIBS East GetMap are empty (~112 B); **03:10Z is the latest full East raster** (1.27 MB, opaque ratio 0.371). MSG 03:30Z is present. Live Δt East−MSG ≈ **−20 min** (MSG newer). Diagnostic default-TIME pair was East 01:40Z / MSG 03:30Z (Δt −110 min); geometry/policy conclusions are the same; radiometry of the seam used both.

Ring UTC 03:00Z does not contribute in the canonical region (all four regionals present).

## 5. Current winner boundary

**(repo)** Paint: ring first, then regionals. If `|ageA−ageB| ≥ max(cadence)` the fresher paints later; else stable **West → East → Meteosat → Himawari**. Cadence max(East, MSG) = **15 min**. Live |53−38| = 15 min → Meteosat paints last.

**(live)** Dual-coverage pixels: **347,483**. Current winner share: **GOES-East 0 / Meteosat 347,483**. There is **no winner switch inside dual coverage**. `winnerBoundaryDualInterior` is empty.

The user-visible boundary is therefore the **Meteosat western coverage edge** (GOES-only | dual-coverage), not a quality crossover.

Measured MSG west-limb path (first opaque MSG column; East also covered; winner always `meteosat`):

| lat | lon | MSG zenith | East zenith | MSG signal α | East signal α |
|-----|-----|------------|-------------|--------------|---------------|
| 10°N | 75.36°W | 84.2° | 11.7° | 255 | 71 |
| 20°N | 74.83°W | 84.4° | 23.4° | 0 | 0 |
| 30°N | 73.95°W | 84.8° | 35.0° | 240 | 180 |
| 40°N | 72.55°W | 85.4° | 46.4° | 255 | 82 |
| **45°N** | **71.14°W** | **85.4°** | **51.9°** | **226** | **47** |
| 50°N | 69.91°W | 85.9° | 57.6° | 255 | 67 |
| 55°N | 67.80°W | 86.2° | 63.1° | 255 | 220 |
| 60°N | 64.98°W | 86.4° | 68.5° | 255 | 226 |
| 65°N | 60.59°W | 86.7° | 74.2° | 255 | 208 |

Stable order never gets a chance in this capture: MSG is ≥ one cadence fresher, so it owns the full disk including the western limb over GOES-East near-nadir. Even with equal ages, stable order still paints Meteosat after East, so MSG would still win dual coverage.

GOES-East eastern limb (~6°E at low latitudes) is **not** the current winner boundary: MSG coverage is valid there and wins. At 18°N 6.07°E, East α=0, MSG α=0, winner Meteosat (LIB-067 authority working).

## 6. GOES-East viewing geometry

Sub-satellite point **(repo+live)**: **75.2°W, 0°** (GOES-16).

Spherical GEO model used throughout:

- Earth radius `R = 6378.137 km`
- GEO height `h = 35786 km`
- `r = (R+h)/R = 6.6107`
- Earth-central angle from SSP: **δ = arccos(cos φ · cos(λ − λ₀))**
- Satellite zenith at surface: **cos θ = (r cos δ − 1) / sqrt(1 + r² − 2 r cos δ)**
- Geometric limb: **δ_limb = arccos(1/r) = 81.30°**, **θ_limb = 90°**

At the current seam (45°N, 71.14°W): East **δ ≈ 45.2°, θ ≈ 51.9°** (usable). At East’s own eastern limb (40°N, 3.78°E): **θ = 90°, δ ≈ 81.6°, raw luma 239, signal α 255**.

## 7. Meteosat viewing geometry

Sub-satellite point **(repo+live)**: **0°, 0°** (MSG FES / Meteosat-0°). Same formulas.

At the current seam (45°N, 71.14°W): MSG **δ ≈ 76.8°, θ ≈ 85.4°** (extreme limb, 4° from geometric limb). At 45°N, 0°: **θ ≈ 51.8°** (MSG’s good disk, East’s limb).

There is **no near-nadir dual coverage** (both θ < 40°): n = 0. Dual coverage is always a quality tradeoff. Quality-equal longitude at 45°N is **~37.6°W** (midway 75.2°W and 0°), matching the diagnostic quality-winner switch at **37.55°W**.

## 8. Viewing-angle quality evidence

Mean raw luma / derived cloud α vs angular distance from SSP:

**GOES-East**

| δ bin | n | raw p50 | α p50 | sat luma≥250 |
|-------|---|---------|-------|----------------|
| 0–20° | 40828 | 110 | 8 | 0 |
| 20–40° | 125258 | 107 | 4 | 0 |
| 40–55° | 155476 | 117 | 22 | 0 |
| 55–65° | 138598 | 128 | 53 | 0 |
| 65–75° | 175060 | 135 | 78 | 0 |
| 75°+ | 143206 | 151 | 142 | 2.1% |

**Meteosat** (production +20 lift in α)

| δ bin | n | raw p50 | α p50 | sat luma≥250 |
|-------|---|---------|-------|----------------|
| 0–20° | 40840 | 42 | 0 | 0.06% |
| 20–40° | 125212 | 36 | 0 | 0.03% |
| 40–55° | 155544 | 45 | 0 | ~0 |
| 55–65° | 138576 | 86 | — | — |
| 65–75° | 175004 | 125 | 117 | 0.48% |
| 75°+ | 48929 | **178** | **255** | **3.1%** |

Extreme limb is materially worse: MSG 75°+ mean α **196** vs nadir **25**; East 75°+ mean α **131** vs nadir **47**. Texture collapses toward the limb (Worldview GOES-East-only over UK/France is stretched; our MSG west limb is a bright rim). A simple monotone **f(θ)** is sufficient to rank sources.

## 9. Limb artifact evidence

Selected-source artifact is **Meteosat’s western rim**, not leftover East (LIB-067 removed that class).

At 45°N, first 12 MSG columns (provider A=255 throughout):

| px inward | lon | raw luma | signal α | θ |
|-----------|-----|----------|----------|---|
| 0 | 71.14°W | 155 | 226 | 85.45° |
| 1 | 70.96°W | 155 | 226 | 85.33° |
| 2 | 70.79°W | 148 | 205 | 85.20° |
| 3–7 | … | 126→121 | 121→101 | 85.1→84.6° |
| 11 | 69.20°W | 92 | 11 | 84.10° |

Width: **~8 px ≈ 1.41° ≈ 111 km** at 45°N before α falls below ~50. Not 1 px antialias. Already in the **raw MSG PNG** (provider imagery / WMS resample of GEO limb). Alpha remains full (255) on the rim.

East’s own eastern limb at 40°N is luma 239→156 over 12 px at θ≈90–89°, but MSG coverage owns those pixels so it is **not currently painted**.

## 10. Observation-time contribution

Live Δt ≈ **20 min** (East 03:10Z, MSG 03:30Z). Capability-default diagnostic Δt = **110 min**.

Near-time compose with current winner logic (MSG last): seam ratio **5.71** vs **5.91**. The hard limb boundary remains.

Peak-α along a latitude is a poor tracker (45°N “peaks” 26° apart = different storms). At 40°N the two sources’ α peaks differ by **1.23° / 7 px**; at 50°N **0**. Same-source East 01:40 vs 00:50 “displacement” of 5.45° is not a credible motion vector (too fast). Time mismatch can shift storm edges by a small amount; it does **not** create the geometric disk-edge seam.

Do not restore synchronized TIME. GIBS 03:20Z/03:30Z were empty; waiting for a common slot would drop the fresher MSG.

## 11. Raw radiometric comparison

Dual-coverage (n=347,483):

| | East raw | MSG raw |
|--|----------|---------|
| mean | 124.0 | 88.4 |
| std | 40.2 | 62.0 |
| p5 / p25 / p50 / p75 / p95 | 51 / 99 / 121 / 151 / 191 | 21 / 35 / 67 / 139 / 205 |

Clear (both α<20, n=107,089): East p50 **100** vs MSG p50 **31** (Δ 69). Cloudy (both α>80, n=53,730): East p50 175 vs MSG 162 (closer). MSG is more binary (clear almost black; cold tops saturated). GIBS is washy around 100–130 even in “clear.”

By geometry: both-mid (40°≤θ<65°, n=46,502): East p50 107 vs MSG 37. Near-limb MSG (θ≥70°, n=124,597): East 123 vs MSG 137 (MSG brighter at its limb). No both-nadir samples.

## 12. Normalized radiometric comparison

Shared Rec.601 smoothstep 100→195 after lifts. Dual-coverage derived α:

| | East α | MSG α (with +20) | MSG no-lift |
|--|--------|------------------|-------------|
| mean | 74.8 | 71.6 | 56.2 |
| p50 | 32 | **0** | 0 |
| p75 | 142 | 173 | 94 |

Lifts equalize *means* somewhat and leave **distribution shape** incompatible. East p50 α=32 (wash); MSG p50 α=0 (binary clear).

## 13. Source-lift contribution

**(repo)** GIBS 0, MSG +20, ring +12.

No-lift Atlantic seam ratio **5.75** vs production **5.91**. Percentile-matching MSG to East in dual coverage (scale 0.60 on p10–p90) still **5.78**. Constant lifts / global percentile match **do not remove** a limb-placed hard winner. They are not the first repair.

## 14. Provider stretch semantics

**Visual, not physical, in the production path.**

- NASA GIBS documents these layers as **visualizations**. Worldview legend for the same product: **−92.0 °C to >57.0 °C** (181–330 K) with a false-color client palette. WMS `STYLES=` PNG used by Libration is an inverted grayscale display stretch of that mapping, 8-bit, not Kelvin.
- EUMETView `msg_fes:ir108` abstract: “Rectified (level 1.5) … **image** data”; EUMETSAT states EUMETView is a visualisation WMS, **not original numerical Recommended Data**. IR10.8 display is a provider PNG stretch (darker median than GIBS).

PNG byte 155 at MSG limb is not a brightness temperature.

## 15. Numeric brightness-temperature availability

Available, but a different acquisition class:

| Product | Form | Notes |
|---------|------|--------|
| NOAA AWS `noaa-goes16` `ABI-L2-CMIPF` Band 13 | netCDF, BT Kelvin, full disk | Open; native GEO projection; tens–hundreds of MB per slot; needs reprojection |
| EUMETSAT Data Store HRSEVIRI / MTG FCI | native/netCDF | Account; not CORS WMS |
| GIBS numeric WMS style | **not** in the production GetCapabilities path | Catalog is visualization |

Complexity/bandwidth ≫ current 1.3+0.9 MB PNG pair. Do not switch providers in the seam-repair LIB. Keep as a later scientific-IR option.

## 16. Cloud parallax assessment

Two GEO viewpoints of a 10 km cloud top: at θ=60°, shift ~17 km ≈ 0.15° ≈ 1 px at 2048-wide equirect. At θ=80°, ~57 km ≈ 0.5° ≈ 3 px. High cirrus maybe ~5 px. Registration of the same α peak at 40–50°N is 0–7 px. Parallax is **real but small** at this grid. It argues against **wide** image blending of moving high cloud; it does **not** explain the 111 km limb rim or the disk-edge seam.

## 17. Current seam metric

Mean |Δα| across the NATL coverage-class boundary vs within-source neighbors (LIB-066 method, post-authority):

| Composite | boundary mean \|Δα\| | ratio vs texture |
|-----------|----------------------|------------------|
| Production (MSG last) | 110.5 | **5.91** |
| No-lift | 102.9 | 5.75 |
| Percentile-matched MSG | 106.1 | 5.78 |
| Near-time East 03:10 + MSG 03:30 | 106.6 | **5.71** |
| Quality hard-winner (smoothstep θ) | 62.7 | **3.35** |
| Quality × freshness (110 min Δt) | 53.5 | 2.86 |
| Lexicographic (θ≥75 reject) | 52.4 | 2.80 |
| Quality-weighted blend | 26.4 | **1.41** |

Within-East texture 30.0; within-MSG 7.4 (MSG is smoother/binary). Production discontinuity is ~6× natural East texture. Quality hard-winner halves it; blend approaches texture but see §22.

## 18. Same/near-time diagnostic

East 03:10Z (latest non-empty GIBS) + MSG 03:30Z, current policy: seam **persists** (ratio 5.71). GIBS cannot match MSG 03:30Z yet. Radiometric/quality/selection is primary. Do not sync TIME.

## 19. Quality hard-winner diagnostic

`quality01 = 1` for θ≤55°, `0` for θ≥75°, smoothstep between (form C). Per dual pixel, higher quality wins; single-coverage remains that source; ring still backstop.

At 45°N switch **37.55°W** (near the geometric midpoint). Dual share: East **190,425** / MSG **157,058**. MSG extreme limb is no longer selected where East is valid. Residual seam is a **quality-equal longitude**, not a disk edge. Still a hard step (ratio 3.35) because radiometry still differs.

## 20. Quality/freshness combined diagnostic

Score `quality01 × 1/(1+age/cadence)` with **live** ages 53 / 38 min: switch **41.6°W** (slightly west of midpoint; MSG’s freshness nudges ownership east of the limb but not to the limb). With the exaggerated 110 min diagnostic gap the score over-weights MSG (switch 47.9°W). A multiplicative score is **sensitive to GIBS ingest lag** and can walk the boundary as slots arrive.

Lexicographic with live ages (reject θ≥75° if the other is usable, else freshness ≥15 min, else quality): switch **55.7°W**. More conservative toward East in the west Atlantic.

## 21. Weighted-blend diagnostic

In dual coverage, `t = qE/(qE+qM)`, blend cloud-signal RGBA. Seam ratio 1.41. Visually the cyclone still changes character across a vertical-ish zone (stretch mismatch), but the bright MSG rim is diluted. Single-coverage and no-data edges were not blended.

## 22. Blend ghosting assessment

Dual pixels: **54.6%** have \|αE−αM\| > 40 (radiometric, not edges). **15.5%** both cloudy (α>80). Opposite horizontal α-gradient (both \|g\|>30 and opposite sign): **1.24%**. Doubled-edge ghosting is uncommon at 2048×1024, but blending 20 min-apart fronts still **softens/misplaces** the cyclone and invents intermediate α in clear/cloudy disagreement. Prefer **hard winner** with a *narrow* optional transition where qualities are similar — not a basin-wide blend.

## 23. Proposed quality model

Keep **coverage ≠ quality**.

```
δ = arccos(cos φ · cos(λ − λ₀))
θ = arccos((r cos δ − 1) / sqrt(1 + r² − 2 r cos δ))   // θ=90° if δ≥δ_limb

quality01(θ) = 1                         if θ ≤ 55°
             = 1 − smoothstep(55, 75, θ) if 55° < θ < 75°
             = 0                         if θ ≥ 75°
```

Store as `Uint8` `round(quality01×255)` per sector. Cosine and cosine² also rank correctly; smoothstep is the most interpretable cutoff. Evidence supports **θ=75°** as “unusable for selection when overlap exists” (MSG 75°+ α p50=255; East 75°+ washed). Coverage remains valid to provider α>0.

## 24. Proposed freshness-quality relationship

Principle: **freshness dominates among comparable-quality observations; extreme limb must not displace a modestly older much-higher-quality observation.**

Lexicographic (preferred over opaque scores):

1. Valid coverage (unchanged).
2. If one source has `quality01=0` (θ≥75°) and the other has `quality01>0`, the usable source wins. If both are 0, keep current freshness/stable rule (limb still better than no-data / ring).
3. If `|ageA−ageB| ≥ max(cadenceA, cadenceB)` **and** both are usable, fresher wins (existing WEATHER-3 hysteresis).
4. Else higher `quality01` wins.
5. Else stable West → East → Meteosat → Himawari.

Worked live case: East 53 min, θ=52°, q=1 vs MSG 38 min, θ=85°, q=0 → **East wins** (step 2). At ~38°W both q≈0.5, Δt=15 min → **MSG wins** (step 3). That is the intended Atlantic handoff.

How much age to give up for nadir: **one regional cadence (~15 min) is already the hysteresis**. Prefer 20 min older nadir over extreme limb: **yes**. 40 min: **yes** while the older source is still in its fresh/stale paint band. 90 min: **yes if still paintable** (GIBS stale max 4 h); do not paint excessively-stale nadir over fresh usable MSG. Do not sacrifice a *major* freshness class (fresh vs excessively-stale) for cosmetics.

## 25. Need for quality plane

**Yes.** Coverage answers “provider has data.” Quality answers “should we prefer this observation in overlap.” Do not encode quality by punching coverage holes: a limb pixel is still valid data and must suppress ring if it is the only regional.

Cost: one `Uint8Array` per cached sector = **2,097,152 bytes** (same as coverage). Five sectors ≈ 10 MB. Deterministic from lon/lat + known SSP; can be computed once per sector raster (Earth-fixed) off rAF.

Three-plane model: `coverageMask` (exists) + `cloudSignal` (exists) + `qualityWeight` (new). Clean extension of WEATHER-4.1.

## 26. Need for radiometric normalization

**Yes, later, not in the immediate seam LIB.** After the winner leaves the limb, a residual GIBS-vs-MSG step remains at mid-overlap (clear p50 100 vs 31). Global +20 is inadequate near limb and only partly helps at mid-angle. Angle-dependent affine or overlap percentile match belongs in a **normalization** item after quality authority. Do not retune smoothstep 100→195 here (wash / WEATHER-5).

## 27. Need for overlap blending

**Not as the first production model.** Hard quality/lex winner removes the disk-edge seam. Blend ratio looks better numerically but risks softened fronts and intermediate α. If a later item adds a transition, restrict it to where **both** have coverage **and** `|qA−qB|` is small.

## 28. Recommended transition semantics

If blending is ever added:

- Width from actual overlap: quality goes from 1 to 0 between θ=55° and 75°, which at 45°N is **several degrees of longitude** (~15–20° between East-good and MSG-good). A **quality-difference threshold** (e.g. blend only if `|qE−qM| < 0.25`) is better than a 100 px constant.
- Candidate: ~3–6° around the qE=qM meridian (~38°W at 45°N), or purely `|Δq|<0.25`.
- Never feather into no-data.

Immediate LIB: **hard lex winner, no blend**.

## 29. No-data boundary behavior

Unchanged: valid coverage is authoritative including clear. Ring only where no selected regional coverage. Blending, if any, only in dual coverage. A quality=0 limb pixel that is the **only** coverage still paints (do not punch no-data).

## 30. WEATHER-3 doctrine regression

**None recommended.** Heterogeneous times remain. Live fixture already has East 03:10 / MSG 03:30. Status age range 38–53 min is honest. Near-time diagnostic proves sync would not remove the seam and would wait on empty GIBS slots. [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md) stands.

## 31. Cloud-wash evidence

Separate from the seam. Valid pixels with derived α:

| | >0.05 | >0.10 | >0.20 | >0.50 |
|--|-------|-------|-------|-------|
| East all | 63.6% | 57.1% | 47.7% | 32.2% |
| MSG all | 41.1% | 38.8% | 35.5% | 28.9% |
| East NATL | 57.8% | 51.2% | 42.4% | 27.9% |
| MSG NATL | 31.0% | 28.4% | 25.4% | 20.2% |
| Dual NATL East | 55.7% | 48.7% | 39.2% | 25.5% |
| Dual NATL MSG | 30.8% | 28.7% | 26.0% | 21.1% |

GIBS paints a majority of valid NATL pixels as some cloud; MSG is closer to a mask. External Worldview GOES-East IR (colormap, 03:10Z) shows a real cyclone and clear-ish subtropical ocean; our East overlay still greys much of that ocean. **Do not retune the curve in the seam LIB.**

## 32. Performance implications

- Coverage plane: already 2 MB/sector.
- Quality `Uint8`: +2 MB/sector; 5× ≈ +10 MB vs current coverage-only extras.
- Quality `Float32`: 8 MB/sector; unnecessary.
- Per-pixel lex winner: same O(pixels) loop as `compositeCloudHighlightLayers` (measured **36.5 ms** compose). Adding a quality compare is cheap.
- Dual-only blend: 347k pixels extra; still off rAF.
- Still **one** encoded PNG and **one** `imageBlit`. Quality is Earth-fixed for a given grid: cache with the sector snapshot.

## 33. Ranked production models

| Rank | Model | Visual | Scientific | Complexity | Bandwidth | Perf | Extensibility |
|------|-------|--------|------------|------------|-----------|------|----------------|
| 1 | **C. freshness + quality lexicographic winner** | Removes limb seam; keeps freshness | Defensible θ cutoff | Small | None | ~current | Quality plane reused later |
| 2 | B. viewing-angle quality hard winner | Similar; weaker on 15 min fresher mid-disk MSG | Ignores cadence | Small | None | ~current | |
| 3 | E. normalized signal + quality winner | Best residual step | Stretch still display-space | Medium | None | +1 pass | Leads to BT later |
| 4 | D. quality-weighted blend in dual | Lowest seam metric | Ghost/soften risk | Medium | None | +dual pass | |
| 5 | F. numeric BT + quality winner | Best radiometry | Right physics | High | ≫ PNG | High | Scientific IR mode |
| 6 | A. existing freshness winner + hard footprint | Current defect | Policy-complete, geometry-blind | Zero | None | Current | |

## 34. Recommended immediate next LIB

**WEATHER-4.3 / suggested LIB-069 — Clouds viewing-angle quality plane + lexicographic overlap authority**

In scope: per-source `qualityWeight` from the §23 formula; lex rule in §24; DEV quality/winner diagnostics; tests in §36; visual NATL verification; no curve/opacity/TIME/sync/feather/visible-IR change.

Out of scope: radiometric retune, blend, numeric BT, wash, GeoColor.

## 35. Recommended later cloud-presentation work

Keep separate:

1. **IR wash / cloud confidence** (smoothstep 100→195; GIBS majority-α). Possible WEATHER-5 investigation.
2. **Display-space overlap normalization** after quality authority (affine/percentile in dual coverage; maybe θ-dependent). Not wash redesign.
3. **Visible+IR / GeoColor hybrid.**
4. **Scientific brightness-temperature mode** (CMIPF / HRSEVIRI), optional.

## 36. Test recommendations

- Near-nadir (θ<55°) beats extreme limb (θ≥75°) when the limb source is one cadence fresher.
- Significantly fresher *usable* observation still wins when qualities are comparable (mid-overlap, Δt ≥ hysteresis).
- No blending into no-data; quality=0 limb that is the only coverage still paints and still suppresses ring.
- Winner does not thrash: Earth-fixed pixel near q-crossover keeps hysteresis; new slot ±10 min does not flip the basin.
- Heterogeneous times retained (East 03:10 / MSG 03:30 class).
- NATL seam ratio bounded below a documented threshold after quality authority.
- Selected-source MSG western rim not used where East coverage is usable.
- Ring remains backstop for missing regionals only.
- Observation age range still from visible components.
- Coverage plane unchanged: provider A>0 is coverage regardless of quality.

## 37. Not verified

Canonical 1920×1080 live viewport (Cursor pane screenshot was the global map, not a NATL crop). In-app `?cloudsSectorDebug=1` this session. MSG GetMap exactly equal to GIBS 03:10Z (15 min slots; 03:15 unsupported). Quantitative optical-flow storm-edge displacement. Worldview Meteosat IR overlay (GOES-East-only Worldview used). EUMETSAT Data Store numeric sample download. Himawari/Meteosat dual-coverage quality. Tauri binary. Legal counsel beyond current attribution. `bothHighEdge` in the first harness pass (follow-up opposite-gradient 1.24% used instead). Canvas `drawImage` upsample of the 8 px rim in the live viewport.

## 38. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item remains **proposed**.
