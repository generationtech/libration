# LIB-072 — WEATHER-5.2 residual cloud-boundary provenance investigation

| Field | Value |
|-------|-------|
| ID | LIB-072 |
| Status | proposed |
| Created | 2026-08-22 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item.

Predecessor: [LIB-070](LIB-070-weather-5-cloud-radiometry-and-presentation-investigation.md) (radiometry; remains proposed) and [LIB-071](LIB-071-weather-5-1-canonical-ir-cloud-confidence.md) (canonical IR + shared confidence; complete). This item investigates **remaining geometric cloud boundaries** after coverage, quality, and radiometric interpretation were corrected. WEATHER-4.3 authority and WEATHER-5.1 presentation are treated as settled inputs, not as defects to reopen without evidence.

## Objective

Determine exactly what causes each remaining large geometric cloud boundary in the current global Clouds render (India/Central Asia arc; southern Indian Ocean wedges; Antarctic arcs; any Pacific equivalent). Trace each visible shape through coverage, quality, winner, ring contribution, canonical IR, cloud confidence, provider alpha, GEO geometry, and WMS reprojection. Recommend one next production model without hiding an unknown problem with generic feathering.

## Scope

**In scope**

- Repository reconnaissance of Clouds after LIB-071 (coverage, quality, winner, canonical IR, shared confidence, ring backstop, DEV diagnostics, WMS, composition).
- Live full-world current-time reproduction comparable to the user screenshots.
- Pixel-level provenance for the India arc, southern Indian Ocean wedges, Antarctic arcs, and any obvious Pacific equivalent.
- Diagnostic-only variants: ring contribution, source-only, q=0-regional-vs-ring, narrow dual-coverage blend. Not production.
- Structured survey in this work item. Proposed follow-on implementation scope only.

**Out of scope**

- Any production authority, ring, quality, confidence, canonical, blend, fetch, opacity, visible, or illumination change.
- Activating this item or creating an approved implementation LIB from this survey.
- WEATHER-6, numeric netCDF, cloud-mask products, physical illumination.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-063](LIB-063-weather-1-global-clouds-v1.md) through [LIB-071](LIB-071-weather-5-1-canonical-ir-cloud-confidence.md)

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
- Visual verification: live Clouds in ordinary current-time mode plus DEV `?cloudsSectorDebug=` variants. Diagnostic rasters inspected independently of production paint.

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md) — awaiting-human-decision pointer only

## Completion record

Leave empty until a human approves and this survey is formally closed, or until a later approved item supersedes it. The structured survey below is the investigation record.

---

# Structured survey

Recorded 2026-08-22. Diagnostic files lived only under `/tmp/libration-weather52-boundaries/` (not added to the repository). Production Clouds composition, authority, ring semantics, quality thresholds, confidence curve, canonical mappings, blending, source fetch, opacity, visible imagery, and illumination were not modified.

Repository truth vs live-provider measurements are labeled **(repo)** and **(live)** below.

## 1. Verdict

**WEATHER-5.2 RESIDUAL CLOUD-BOUNDARY INVESTIGATION COMPLETE**

The remaining large geometric shapes are **source-authority envelopes**, not leftover Rec.601 wash and not ordinary meteorology.

The India/Central-Asia arc is a **hard winner edge that follows Meteosat provider-alpha coverage**, not a quality-equal crossover and not the EUMET ring. At the live slot Meteosat is ≥ one cadence newer than Himawari, so Meteosat owns the whole dual-coverage band even though **both sources are q=0 across India**. The visible line is where Meteosat WMS coverage ends (~75°E at 10°N → ~70°E at 50°N) and q=0 Himawari takes over. That WMS disk ends several degrees inside the theoretical GEO limb. Himawari GIBS false-color grain plus a remaining MSG↔Himawari canonical step (mean |ΔIR| 0.19 in dual coverage) make the coverage cut read as a painted circle.

The southern Indian Ocean wedges are **two GEO disk limbs plus a ring-filled gap**. North of ~50°S the same Meteosat coverage-east / Himawari handoff continues. From ~55°S a **triangular ring wedge** opens between the disks (`MSG → ring → Himawari`). Both regional skirts are q=0, yet they still suppress the ring (832,891 q=0 regional pixels where ring coverage exists but cannot win). Diagnostic “ring beats q=0” drops the southern seam ratio from **5.24 → 0.63**.

Narrow dual-coverage blend does **nothing** on these artifacts (India seam ratio unchanged at 2.37): they are coverage-edge / q=0-limb, not dual q>0 quality-crossover. NATL East↔MSG at 45°N **−55.11°** remains the quality-equal candidate for a later narrow blend.

Do not hide this with generic feathering. Next production change should be **ring outranks q=0 regional** while preserving freshness among q>0 views.

## 2. Repository state

`docs/STATE.md` was **AWAITING SCOPE** at start and remains so. This item is **proposed**. No implementation LIB was activated. Production Clouds authority, ring, quality, confidence, canonical mappings, blending, fetch, opacity, visible imagery, and illumination were not changed.

## 3. Reproduced full-world artifacts

**(live)** Ordinary current-time Clouds on `http://localhost:1420/`. HUD **August 22 2026, 12:16 PM** (Knoxville / UTC−4 ⇒ product **~16:16 UTC**). Clouds on. Weather opacity slider **0.4** (factory 0.42). Grid on. City pins on. Solar shading on. Status **Clouds · observations 32–57 min old**.

| Source | App age | Harness TIME | Harness age at 16:16Z |
|--------|---------|--------------|------------------------|
| GOES-West | 47 min | 2026-08-22T14:40Z | 96 min (caps default; app had a newer GIBS slot) |
| GOES-East | 47 min | 2026-08-22T14:40Z | 96 min |
| Meteosat | 32 min | 2026-08-22T15:45Z | 31 min |
| Himawari | 57 min | 2026-08-22T14:30Z | 106 min (app ~15:19Z) |
| EUMET ring | not listed | 2026-08-22T15:00Z | 76 min |

Ring is not in the visible age range: all four regionals are present, so the ring is backstop-only. MSG−Himawari Δt in the app is **25 min ≥ 15 min cadence** ⇒ freshness prefers Meteosat in dual q=0. The harness pair is the same freshness class.

In-app full-world view shows: (A) a large curved step through India / western China / the Arabian Sea; (B) arcs and a triangular gap south of Madagascar toward Antarctica; (C) a fainter mid-Atlantic East/MSG arc and Pacific disk edges. India and the southern ocean are on the night side at this instant; night veil makes white overlay more visible but is not the cause (artifacts exist in illumination-free composites).

## 4. India artifact diagnosis

**(live)** Crop lon 40–110°E, lat 5–50°N.

Winner map: yellow Meteosat west, green Himawari east, one hard curved boundary. Switch longitude equals **Meteosat provider coverage east edge** at every sampled latitude:

| lat | winner switch | MSG coverage east | MSG θ=75° | Himawari θ=75° west | Himawari coverage west |
|----:|--------------:|------------------:|----------:|--------------------:|-----------------------:|
| 10°N | 75.15°E | 75.50°E | 66.36°E | 74.62°E | 60.56°E |
| 20°N | 74.97°E | 74.97°E | 65.13°E | 75.85°E | 62.14°E |
| 25°N | 74.62°E | 74.62°E | 64.07°E | 76.73°E | 63.02°E |
| 30°N | 74.09°E | 74.09°E | 62.84°E | 78.13°E | 63.37°E |
| 40°N | 72.69°E | 72.69°E | 58.80°E | 82.00°E | 65.65°E |
| 50°N | 70.05°E | 70.05°E | 51.94°E | 89.03°E | 68.47°E |

Pixel proof at 25°N:

- 74.1°E: MSG coverage 255, q=0, θ=84.3°; Himawari coverage 255, q=0, θ=77.4°; ring coverage 255; **winner Meteosat** (fresher, both q=0).
- 74.6°E: MSG coverage **0**, θ=84.7° (still theoretically inside limb); Himawari coverage 255, q=0, θ=76.9°; **winner Himawari** (only remaining regional).

There is **no q>0 Meteosat↔Himawari overlap** over India at 10–50°N. The dual-coverage band is dual **q=0**. Ring does not participate (regional coverage present). The arc is not the theoretical GEO limb (MSG WMS coverage ends ~6–11° inside θ=90°; MSG `limbNoCov` = 77,185 px). Canonical IR already shows the step (MSG dark/clean vs Himawari brighter/grainy). Shared confidence preserves it (MSG p50 confidence 0 vs Himawari 0.086 in dual coverage).

Ownership: **west = Meteosat, east = Himawari**. Ring not on either side of the conspicuous line.

## 5. Southern Indian Ocean artifact diagnosis

**(live)** Crop lon 20–130°E, lat 20°S–90°S. Treat as **three overlapping geometries**, not one.

**Wedge #1 — Meteosat eastern coverage limb (continues the India arc south).**

| lat | MSG → next | MSG coverage east |
|----:|------------|------------------:|
| 30°S | Himawari at 74.09°E | 74.09°E |
| 40°S | Himawari at 72.69°E | 72.69°E |
| 50°S | Himawari at 70.05°E | 70.05°E |

Same rule as India: MSG fresher, both q=0 in overlap, visible cut = MSG WMS disk edge. Himawari side is GIBS-grainy.

**Wedge #2 — ring gap between the two GEO disks (the triangular / V shape).**

| lat | transitions |
|----:|-------------|
| 55°S | MSG → **ring** 67.94°E, ring → Himawari 70.22°E |
| 60°S | MSG → ring 64.95°E, ring ↔ Himawari around 73.2–73.6°E (jagged limb) |
| 70°S | MSG → ring 53.88°E, ring → Himawari 82.53°E |

At 55°S / 67.9°E: MSG coverage 0, Himawari coverage 0, ring coverage 255, **winner ring**. At 55°S / 75°E: Himawari-only, q=0, θ=85°, **winner Himawari** (q=0 regional still beats ring). Regionals-only crop: the V-shaped **black hole** is exactly this gap. Ring-won mask: a white triangular peak filling that hole, sitting on a polar ring band.

**Wedge #3 — Himawari western/southern coverage limb**, mirrored, grainy, q=0.

Equirectangular projection turns circular GEO disks into polar tapers; the triangle is the **intersection of two circular limbs plus ring fill**, not a WMS triangle invented in isolation.

## 6. Antarctic artifact diagnosis

**(live)** South of ~65°S the regional disks are almost entirely q=0 wherever they still have coverage. At 70°S / 40°E Meteosat still paints (coverage 255, q=0, θ=83.5°) and suppresses ring. At 70°S / 70°E neither regional has coverage and **ring wins**. At 80°S no MSG/Himawari coverage remains on this transect.

The Antarctic **bright band** is mostly ring IR over / near ice; the **geometric scallops** are GEO limb envelopes plus the ring mosaic’s own multi-satellite seams (visible in ring-only). Polar no-data is true coverage gap (black in composites), distinct from bright ice on the base map. Off-process south crop is clouds on black: the wedges exist **without** Antarctic base-map brightness.

## 7. Artifact/source table

| Artifact | Approx path | Shape | Source A | Source B | Ring? | Coverage edge? | Quality crossover? | Winner edge? | Signal step? | Projection edge? | Likely root cause |
|----------|-------------|-------|----------|----------|-------|----------------|--------------------|--------------|--------------|------------------|-------------------|
| India arc | 75.1°E @10°N → 70.0°E @50°N | Circular, concave toward MSG SSP 0° | Meteosat | Himawari | no (present underneath) | **yes — MSG WMS α** | no (both q=0) | **yes** | yes (canonical + GIBS grain) | MSG disk short of limb | **G + H + A**: freshness-owned q=0 overlap ends at MSG coverage |
| SIO wedge #1 | same arc 30–50°S | MSG disk east | Meteosat | Himawari | no | **yes MSG α** | no | **yes** | yes | GEO→equirect taper | same as India |
| SIO wedge #2 | 55°S 68–70°E opening to 70°S 54–83°E | Triangle / V | Meteosat disk | Himawari disk | **yes, fills gap** | yes both disks | n/a | **yes MSG/ring and ring/Him** | ring vs q=0 limb | polar equirect | **G + D**: ring backstop between q=0 disks |
| Antarctic arc | 65–80°S, scalloped | Disk horns + ring band | q=0 GEO | ring | **yes** | yes | n/a (all q=0) | yes | ring IR vs limb | GEO limb + ring mosaic | **D + G + A**; some structure already in raw ring |
| NATL / mid-Atlantic | 45°N **−55.11°** | Quality-equal arc | GOES-East | Meteosat | no | no | **yes** | yes | modest after LIB-071 | no | **E** (residual); blend candidate |
| Pacific Himawari↔West | 0° 157°E; ±40° ~165°E | Disk handoff | Himawari | GOES-West | no | mixed | likely q-aware | yes | possible | dateline | **E** / coverage; fainter than India |
| GOES-East west limb | east Pacific | Disk arc | GOES-East | West/ring | sometimes | yes | limb q=0 | yes | | GEO disk | **D** at extreme limb |

## 8. Coverage findings

**(repo)** Coverage = provider α > 0. Quality does not punch holes. Ring paints only if no regional coverage.

**(live)** India and SIO wedge #1 **exactly follow Meteosat valid-data east**. Alpha drops 255→0 at the switch pixel while Himawari α stays 255. MSG WMS does not fill the theoretical limb (`limbNoCov` 77k). GIBS East/West slightly overshoot the model limb (~5k px `covBeyondLimb` — resampling). Himawari `limbNoCov` 29k.

## 9. Quality findings

**(repo)** q = 1 at θ≤55°, 0 at θ≥75°, smoothstep between. GEO limb central angle 81.3°.

**(live)** India: **both q=0** on both sides of the conspicuous arc. Representative 25°N 74.1°E: MSG θ=84.3° q=0, Himawari θ=77.4° q=0. Himawari only reaches q>0 east of ~76.7°N-equivalent — after MSG coverage has already ended. Southern 55°S 50°E: MSG θ=76.8° q=0 with coverage. 70°S: entire remaining MSG disk is q=0. The India line is **not** the 55–75° transfer and **not** a quality-equal crossover.

## 10. Winner findings

**(repo)** Lexicographic: coverage → q>0 beats q=0 → if both q=0, freshness/stable → if both q>0 and \|Δt\|≥max(cadence), fresher → else higher q → stable West→East→Meteosat→Himawari.

**(live)** India/SIO #1: **actual hard winner boundary**, Meteosat \| Himawari. Policy is behaving as designed: both q=0, MSG newer by ≥15 min, MSG takes the overlap until its coverage ends. SIO #2: winner is **ring** in the gap. NATL 45°N switch −55.11° matches LIB-069 quality-equal (East q>0 vs MSG). Winner counts at 2048×1024: ring 35,390; West 410,278; East 321,880; Meteosat 624,903; Himawari 451,013.

## 11. Canonical-IR findings

**(live)** Dual-coverage box 10–40°N, 60–90°E (n=11,293): MSG canonical p50 **0.204** / p95 0.616 / mean 0.268; Himawari p50 **0.365** / p95 0.894 / mean 0.416; mean \|ΔIR\| **0.192**. The geometric line **already exists in winner canonical IR** (MSG black-clear vs Himawari gray + salt-and-pepper). GIBS colormap-aware path does not make Himawari limb look like MSG IR108. Ring black-point 56 keeps ring clear-ocean near 0 in this transect (canonical 0.09 at 25°N 70°E).

## 12. Cloud-confidence findings

Same box: MSG confidence p50 **0** / mean 0.101; Himawari p50 **0.086** / mean 0.186; mean \|Δconf\| **0.176**. Shared knots do not invent the line; they **preserve** a modest Himawari grain against MSG zeros, and factory opacity 0.42 keeps it visible. Before/after: canonical gap 0.19 → confidence gap 0.18 (not a huge amplification, but enough on a hard cut). India blend diagnostic unchanged because blend never engaged.

## 13. Ring participation

**(live)** Ring wins **35,390** pixels, all `ringNoRegional`. `ringAndQ0Regional` = **0**. `q0RegionalNoRingWin` = **832,891**. India: ring coverage is 255 under the arc but never selected. Southern triangle: ring **is** one side of wedge #2. Current rule “regional coverage suppresses ring even if regional q=0” is exactly why q=0 disk skirts stay painted.

## 14. Ring-only diagnostic

**(live)** Ring-only south crop already shows multi-GEO scallops, a V-notch near the polar mosaic join, and a bright Antarctic band. Some Antarctic geometry is **in the raw ring product**, not only in our compositor. India does not show the user arc in ring-only (ring is continuous there). Africa/Pacific ring is a full mosaic without the India coverage cut.

## 15. Regionals-only diagnostic

**(live)** Regionals-only south crop: two circular disks, hard MSG/Himawari seam, **black triangular gap** (no ring). The user triangle **appears as a hole** without the ring and as a filled gray wedge with the ring. India arc **remains** without the ring ⇒ regional overlap/coverage, not ring/backstop, for artifact A.

## 16. Raw-provider findings

**(live)** Raw MSG PNG: circular FES disk, transparent outside, clean grayscale, coverage ends inside theoretical limb. Raw Himawari PNG: GIBS Band13 false-color, **salt-and-pepper** on the disk including the western limb; the disk edge is a GEO oval in equirect. Raw ring: global mosaic with polar holes and its own sector joins. The India cut is **not** a compositor invention: it is MSG α=0 against Himawari α>0. Grain is in Himawari **before** canonicalization.

## 17. WMS reprojection findings

**(repo)** GIBS WMS 1.1.1 `SRS=EPSG:4326` BBOX −180,-90,180,90. EUMET WMS 1.3.0 `CRS=EPSG:4326` BBOX −90,-180,90,180 (lat,lon axis order). Both requested at 2048×1024.

**(live)** MSG `covBeyondLimb=0` and `limbNoCov=77185` ⇒ EUMETView FES reprojection **clips inside** the spherical limb we model. Himawari closer to the model. GIBS East/West a few thousand pixels past the model (bilinear fringe). Southern “triangle” is **expected equirect mapping of circular GEO disks**, not a distinct native-projection bug. Native-projection GetMap was not fetched (investigation-only; no production native path). Himawari limb grain is consistent with server resampling of a rainbow colormap into EPSG:4326.

## 18. India MSG/Himawari overlap geometry

See §4 table. At 10–50°N the q>0 footprints **do not overlap**. Dual coverage is dual q=0. Crossover longitude = MSG coverage east, not quality-equal. App Δt MSG newer by 25 min (harness 75 min); both ≥ cadence ⇒ freshness, not stable-order, selects MSG. Cadence threshold 15 min. If \|Δt\| dropped below 15 min, stable order would give the overlap to **Himawari** and the painted arc would jump west to Himawari’s western coverage (~63°E at 25°N) — an Earth-fixed coverage geometry still, but a **freshness-flipping seam**.

## 19. Southern GEO geometry

At 40°S 70°E both satellites still theoretically see the point (θ≈83–84°, q=0). At 60°S 70°E **neither** is inside the limb (gap). At 70°S MSG limb east ~54°E observed coverage, Himawari west ~83°E; ring owns ~54–83°E. At 80°S regional coverage on the Indian-ocean transect is gone. Multiple GEO overlap exists in a narrowing band around 70°E until ~50°S, then a gap.

## 20. q=0 regional behavior

WEATHER-4.3 is operating: q=0 coverage still paints and still suppresses ring. That is **the** southern-ocean mechanism and the India east-of-MSG-disk mechanism (Himawari q=0). It is internally correct and visually a satellite footprint.

## 21. q=0 regional vs ring diagnostic

DEV-only: if regional q=0 and ring has coverage, copy ring.

**(live)** Southern seam ratio along the old winner edges: **5.24 → 0.63** (below interior texture). Ring substitution removes the ugly q=0 disk skirts and fills them with the global mosaic. Cost: over India it would replace the dual-q=0 overlap with a **ring stripe between MSG θ=75° (~64°E at 25°N) and Himawari θ=75° (~77°E)** — two Earth-fixed quality contours instead of one freshness-owned coverage cut. Transect at 25°N 70°E: ring confidence 0, MSG confidence 0, Himawari 0.03–0.18, so MSG↔ring would be fainter than MSG↔Himawari grain. Thresholds q<0.1 / q<0.25 were rendered; they pull the regional/ring join further toward nadir and start eating usable structure — **q=0-only is the conservative diagnostic**.

## 22. Need for ring quality

Not required for the first repair. A special-case rule “q=0 regional loses to ring coverage” preserves the backstop doctrine for all q>0 views without inventing an SSP for a multi-satellite mosaic. A later constant backstop quality (e.g. just above 0) could fold the same rule into the existing lexicographic order; do not let ring compete with nadir GEO.

## 23. Ring canonical consistency

Ring uses `clamp((luma−56)/(255−56),0,1)`. In the India overlap ring sits near confidence 0, similar to MSG clear, unlike Himawari limb. Ring vs MSG in the southern gap is a style change but more coherent than q=0 GEO limb. Ring vs Himawari still inherits mosaic seams already in the ring product.

## 24. Observation-time contribution

Timing is **secondary**. The arc’s *shape* is MSG WMS coverage (Earth-fixed). Timing decides *who owns the dual q=0 overlap* (MSG today because it is ≥15 min newer). A near-time pair was not fetched this session; weather-4.2 overnight rasters also had MSG much newer and the same coverage-edge class. Do not synchronize TIME.

## 25. Temporal stability of artifacts

Not observed across two live poll cycles in this session. Predicted: while MSG stays ≥15 min newer, the India arc stays on MSG coverage east (stable geographically). When ages fall inside hysteresis, Himawari stable-order would jump the seam ~10° west. Southern ring gap is footprint-stable. **MODEL B would freeze remaining boundaries on θ=75° contours (Earth-fixed) instead of freshness-owned coverage rims.**

## 26. Illumination/base-map contribution

Off-process production composites (no substrate, no night veil) already show India and southern geometry. In-app, India/SIO are on the **night** side at 16:16 UTC, so the night veil raises contrast of white overlay. Antarctic ice brightens ring cloud but is not required to see the wedges. Solar shading off was not toggled in-app; illumination-free rasters suffice to reject “illumination created the shape.”

## 27. Current seam metrics

Mean \|Δα\| on winner edges vs interior, 8-bit confidence:

| Region | boundary | interior | ratio |
|--------|----------:|---------:|------:|
| India | 74.08 | 31.23 | **2.37** |
| Southern IO | 116.85 | 22.29 | **5.24** |
| Antarctic | 123.29 | 14.95 | **8.24** |
| India + narrow blend | 74.08 | 31.23 | 2.37 (no change) |
| South + ring-beats-q0 | 11.66 | 18.62 | **0.63** |

Southern/Antarctic boundaries are far above within-source texture. Ring-beats-q0 brings them below texture. India remains a real step until q=0 Himawari grain is not the selected source.

## 28. Narrow-blend diagnostic

Constraints applied DEV-only: dual coverage, both q>0, \|Δq\|<0.25, \|Δt\|<15 min, neighbor winner differs. **India never qualified** (q=0 and/or coverage 0 on one side). Seam metrics identical. NATL East/MSG at −55° is the intended later candidate, not this artifact set.

## 29. Blend ghosting/parallax

At 25°N 74°E both view zeniths are ~77–85°. 10 km cloud-top parallax is ~6–10 px on this 2048-wide grid, **opposite directions** (MSG looks east, Himawari west). Blending this seam would ghost fronts. NATL quality-equal at θ≈52–55° is a much better blend geography. Do not blend q=0 limb or coverage/no-data.

## 30. Root-cause ranking by artifact

**India arc:** G (freshness-owned q=0 overlap) + C (MSG WMS coverage edge) + H (MSG vs Himawari canonical/grain) + I (hard winner makes a modest gap a line). Not K. Rank: G > C > H > I.

**SIO wedge #1:** same as India.

**SIO wedge #2 / triangle:** G (q=0 disks suppress ring until coverage ends) + C (two coverage limbs) + ring fill. Rank: G > C > D.

**Antarctic arcs:** D (q=0 GEO polar cap) + G + A (ring mosaic / disk). Base map J is amplifier only.

**Pacific / NATL:** E (quality-equal or disk handoff); NATL already the LIB-069 geometry.

## 31. WEATHER-3 doctrine regression

**Freshness-over-synchronization remains recommended** among **q>0** observations. Do not force a common TIME. Do not wait for Himawari to match MSG. Do not freeze a permanent geographic partition. The defect is using freshness to choose among **unusable (q=0)** views that then hide a better global backstop.

## 32. Recommended production semantics

**MODEL H, with B as the immediate semantic change:**

1. Keep coverage, quality, signal independent. Keep hard winners among **usable** regionals. Keep heterogeneous times.
2. **Ring outranks a regional observation at a pixel when every regional that has coverage there has q=0, and the ring has coverage.** Equivalently: q=0 regional coverage remains valid data in the coverage plane, but is not preferred over ring for *authority*.
3. If any regional has coverage **and** q>0, that regional still beats the ring (backstop doctrine unchanged for usable views).
4. Dual q>0 overlap: existing lexicographic rule unchanged (freshness among usable, else higher q, else stable order).
5. Do **not** punch coverage holes. Do **not** blend q=0 limb. Do **not** introduce visible/IR hybrid. Do **not** retune the shared confidence curve as the primary fix.
6. Later, not this LIB: narrow blend only for dual q>0, both q>0, small \|Δq\|, modest \|Δt\|, ~3–6 px, never into no-data (NATL / Pacific). Himawari GIBS limb grain and MSG WMS short-disk are provider/WMS; only chase them if B leaves a residual.

Fourth concept `usableForPreferredRegionalAuthority` ≡ **q>0**. Do not add a new persisted field; use existing quality plane.

## 33. Recommended immediate implementation LIB

**LIB-073 — WEATHER-5.2: ring outranks q=0 regional authority** (proposed only; human must approve).

In scope: overlap rule in `cloudsComposite.ts`; tests that q>0 East/MSG NATL winners are unchanged; tests that dual q=0 India-like pixels prefer ring when ring covers; tests that sole q=0 regional with no ring still paints; status ages still exclude unused ring except when ring is actually visible; DEV winner/ring-contribution diagnostics; visual verification of India, SIO, Antarctic, NATL; docs/ADR 0024 consequence note if the backstop rule is durably extended.

Out of scope: confidence retune, canonical retune, blending, TIME sync, visible/GeoColor, opacity, illumination, native reprojection.

## 34. Recommended later work

- Narrow dual-q>0 quality-crossover blend (NATL −55°, Pacific Himawari/West) after B is in.
- Himawari GIBS false-color limb grain (colormap resampling); possibly suppress q≈0 GIBS presentation rather than retuning the shared curve.
- MSG FES WMS disk short of theoretical limb — provider/reprojection, only if still objectionable after B.
- Optional constant ring quality folded into lexicographic order (MODEL C) if the special case feels unlike the rest of the rule.
- Reject stable geographic partitions unless B is declined.

## 35. Test recommendations

- q=0 regional vs ring: ring wins when ring covers; sole q=0 regional without ring still paints.
- India-like dual q=0 + ring coverage → ring, not freshness-owned MSG.
- Southern gap: ring remains in true no-regional coverage.
- NATL 45°N quality-equal East/MSG **unchanged** for a LIB-069-like pair.
- No blend into no-data; no blend when either q=0.
- Heterogeneous times retained; no common-TIME.
- Winner/coverage/quality planes still separable in DEV.
- Source-authority regression: valid-clear q>0 still owns and still suppresses ring.

## 36. Performance implications

Ring RGBA is already materialized. The extra per-pixel test (regional q==0 ∧ ring coverage) is O(1) on the existing 2M-px compose (~30 ms class). No second blit, no rAF work, no extra GetMap. A ring quality plane would be one more cached 2 MB buffer, still off-rAF. Native reprojection would be a large later cost — not justified by this evidence.

## 37. Not verified

- Two live poll cycles of India switch motion (predicted from policy only).
- App Himawari TIME vs harness caps default (same freshness class; absolute slots differed).
- In-app viewport locked at exactly 1920×1080 after winner-debug reload (off-process 2048×1024 rasters are the quantitative evidence).
- Pixel-identical illumination ON vs OFF in-app.
- Native GEO-projection GetMap vs EPSG:4326 (inference from coverage-vs-limb counts only).
- q<0.1 / q<0.25 ring substitution qualitative beyond the q=0 seam metric.
- Pacific seam metrics at the dateline (switch longitudes only).
- Tauri binary. External licence counsel.

## 38. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item stays **proposed**.

