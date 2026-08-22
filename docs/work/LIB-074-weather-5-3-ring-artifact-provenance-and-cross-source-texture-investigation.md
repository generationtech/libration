# LIB-074 — WEATHER-5.3 ring-artifact provenance and cross-source texture investigation

| Field | Value |
|-------|-------|
| ID | LIB-074 |
| Status | proposed |
| Created | 2026-08-22 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item.

Predecessor: [LIB-072](LIB-072-weather-5-2-residual-cloud-boundary-provenance-investigation.md) (WEATHER-5.2 residual boundaries; remains proposed) and [LIB-073](LIB-073-weather-5-2-ring-outranks-q0-regional-authority.md) (ring outranks q=0 regional; complete). This item investigates **surviving artifacts after the q=0 authority repair**: the southern Indian Ocean triangular/wedge geometry, and the remaining India / Bay of Bengal texture discontinuity. Do not assume the next solution is q>0 blending. Do not assume LIB-073 is wrong. Do not assume the ring is trustworthy merely because it has provider alpha.

## Objective

Determine the exact provenance of the surviving southern Indian Ocean triangular/wedge artifact and, separately, the remaining India/Bay-of-Bengal texture discontinuity. Trace both through raw provider pixels, alpha, canonical IR, confidence, quality, winner, ring contribution, and WMS projection. Recommend the smallest evidence-based implementation plan rather than hiding unknown provider geometry with generic blending.

## Scope

**In scope**

- Repository reconnaissance of Clouds after LIB-073 (ring-over-q0 authority, canonical IR, shared confidence, DEV diagnostics, WMS, composition).
- Live full-world current-time reproduction comparable to the user view.
- Pixel-level provenance for the southern wedge and the India/Bay texture step, diagnosed separately unless evidence proves a shared cause.
- Diagnostic-only variants: raw ring, ring-only stages, q=0-regional comparison, source-only India views, black-point / confidence / LUT / resolution / TIME slots. Not production.
- Structured survey in this work item. Proposed follow-on implementation scope only.

**Out of scope**

- Any production authority, ring, quality, confidence, canonical, blend, fetch, opacity, visible, or illumination change.
- Activating this item or creating an approved implementation LIB from this survey.
- WEATHER-6, numeric netCDF, cloud-mask products, physical illumination, new user controls.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-063](LIB-063-weather-1-global-clouds-v1.md) through [LIB-073](LIB-073-weather-5-2-ring-outranks-q0-regional-authority.md)

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

Recorded 2026-08-22. Diagnostic files lived only under `/tmp/libration-weather53-ring-texture/` (not added to the repository). Production Clouds composition, authority, ring semantics, quality thresholds, confidence curve, canonical mappings, blending, source fetch, opacity, visible imagery, and illumination were not modified.

Repository truth vs live-provider measurements are labeled **(repo)** and **(live)** below.

## 1. Verdict

**WEATHER-5.3 RING ARTIFACT + TEXTURE INVESTIGATION COMPLETE**

The two residuals are **different classes**. Do not merge them.

**Southern Indian Ocean.** After LIB-073 the old q=0 GEO-envelope is gone. What remains is a **θ=75° ring corridor** between Meteosat and Himawari usable disks, plus **ring-native polar-hole / IODC-limb geometry**. The large V is the intersection of two circular q>0 footprints; the interior is ring. Where ring canonical IR sits below the shared 0.30 confidence floor (luma ~100, black-point 56), the corridor paints **valid-clear** and reads as a dark geometric cutout even when q=0 MSG/Himawari still show cloud (e.g. 70°E 45°S: ring conf 0 vs MSG/Himawari conf ~0.39). Where ring is actually cold (70°E 55°S, 90°E 60°S) the interior is a **bright** IODC-like lobe. Polar no-data is already in the raw ring (α=0), geographically fixed across 09Z/12Z/15Z. Provider α is 255 on every opaque southern pixel sampled — alpha is coverage, not mosaic quality.

**India / Bay of Bengal.** Ring **does** participate after LIB-073 (24,209 / 73,245 crop pixels, 33%). The old MSG coverage-east arc is gone. The remaining cut is **MSG q>0 | ring | Himawari q>0** along Earth-fixed θ=75° contours (at 25°N: 63.5°E and 77.4°E). Speckle is **Himawari GIBS Band13**, including q=255 interiors (local IR variance ~5× MSG). Dual q>0 MSG∩Himawari over India is still **zero**. Night-side substrate amplifies in-app grain; overlay-only rasters already show the Himawari salt-and-pepper.

LIB-073 is still semantically correct. It removed the q=0 freshness envelope and exposed (a) quality-contour geometry, (b) ring valid-clear holes, (c) Himawari grain at the q>0 reclaim, (d) ring polar/IODC mosaic structure. Next work is **not** generic q>0 blending.

## 2. Repository state

`docs/STATE.md` was **AWAITING SCOPE** at start and remains so. This item is **proposed**. No implementation LIB was activated. Production Clouds authority, ring, quality, confidence, canonical mappings, blending, fetch, opacity, visible imagery, and illumination were not changed.

## 3. Reproduced current full-world view

**(live)** Ordinary current-time Clouds on `http://localhost:1420/`. Cursor Browser, device metrics **1920×1080**, canvas bitmap **1919×1079**. Clouds on. Grid on. City pins on. Solar shading on. Weather opacity slider **0.4** (factory 0.42). Status **Clouds · observations 29m–3h old**. Ring is listed because it owns pixels (LIB-073).

| Source | In-app age | Harness TIME | Harness age at 17:41Z |
|--------|------------|--------------|------------------------|
| GOES-West | 29 min | 2026-08-22T15:40Z | 122 min |
| GOES-East | 49 min | 2026-08-22T15:40Z | 122 min |
| Meteosat | 34 min | 2026-08-22T17:15Z | 27 min |
| Himawari | 59 min | 2026-08-22T15:30Z | 132 min |
| EUMET ring | 3 h | 2026-08-22T15:00Z | 162 min |

Harness used GetCapabilities defaults; the running app found newer GIBS slots. Same freshness class: MSG is the newest regional; ring is the oldest visible component. Product UTC for quantitative rasters: **2026-08-22T17:41:47Z**. Winner counts at 2048×1024: ring **452,353**; Meteosat 478,221; Himawari 338,479; West 338,205; East 236,206; none 253,688. LIB-072 ring wins were 35,390 — ring is now a major painted source.

## 4. Southern Indian Ocean artifact coordinates

**(live)** Crop lon 20–130°E, lat 20–90°S.

Treat as **three nested geometries**, not one triangle.

**A. θ=75° ring corridor (dominant after LIB-073).** Curved limbs of remaining q>0 regionals. Apex points **north** (gap narrowest near the equator); opening points **south**.

| lat | MSG→ring (θ≈75° MSG) | ring→Himawari (θ≈75° Him) | gap |
|----:|---------------------:|--------------------------:|----:|
| 20°N | 64.6°E | 76.4°E | 12° |
| 0° | 66.6°E | 74.1°E | 7.5° |
| 30°S | 62.1°E | 78.7°E | 17° |
| 40°S | 58.1°E | 82.7°E | 25° |
| 50°S | 51.1°E | 89.9°E | 39° |
| 55°S | 45.3°E | 95.5°E | 50° |
| 60°S | 36.0°E | 105.0°E | 69° |

**B. Dark interior / bright interior.** At 60°S 50–80°E ring conf often ~0 (dark cutout). At 60°S 90°E ring conf 0.71 (bright IODC-like lobe). Left bright circular mass south of Madagascar is **q>0 Meteosat**. Right grainy mass is **q>0 Himawari**.

**C. Antarctic / polar hole.** Ring α=0 south of the scalloped GEO-ring limit. At 75°S a V-notch 85.9–91.7°E (α 255→0→255). At 80°S 70°E: no ring, no regional. Residual opaque scrap ~121°E at 80°S. Polar hole geographically **fixed** at 09Z/12Z/15Z.

Approximate marks matching the user SIO screenshot: left edge ~ MSG θ=75°; right edge ~ Himawari θ=75°; apex ~ 70°E 0–20°S (narrow corridor) **or** the south-pointing dark V between the two disks (~70°E 50–60°S); Antarctic intersection = ring polar hole.

## 5. Southern artifact winner provenance

Representative pixels (harness 17:41Z; ring TIME 15:00Z; MSG 17:15Z; Himawari 15:30Z):

| lon | lat | winner | ring α / luma / IR / conf | MSG cov/q/conf | Him cov/q/conf | final α (×0.42) |
|----:|----:|--------|---------------------------|----------------|----------------|-----------------|
| 45°E | 35°S | Meteosat | 255 / 81 / 0.13 / 0 | 255 / 178 / ~0 | 0 | 0 |
| 70°E | 45°S | **ring** | 255 / 102 / 0.23 / **0** | 255 / 0 / 0.39 | 255 / 0 / 0.41 | **0** |
| 70°E | 55°S | **ring** | 255 / 156 / 0.50 / 0.43 | 0 | 0 | 110 (0.18) |
| 70°E | 62°S | **ring** | 255 / 122 / 0.33 / 0.03 | 0 | 0 | 7 |
| 90°E | 60°S | **ring** | 255 / 180 / 0.62 / 0.71 | 0 | 255 / 0 / 0.84 | 182 (0.30) |
| 70°E | 70°S | **ring** | 255 / 157 / 0.51 / 0.44 | 0 | 0 | 112 |
| 70°E | 80°S | none | 0 | 0 | 0 | 0 |

70°E 45°S is the policy smoking gun: both regionals have q=0 **cloud**, ring has coverage and **canonical clear**, ring wins, final alpha 0. LIB-073 valid-clear ring over q=0 cloudy regional.

## 6. Raw ring result

**Wedge present in raw ring: yes, in part — polar hole and IODC-limb / mosaic contrast; no — the large θ=75° fan is not a hole in the raw PNG.**

Evidence:

- Raw ring 2048×1024 `mumi:worldcloudmap_ir108` TIME 15:00Z: continuous opaque mosaic from 20°E to 130°E at 30–70°S (α=255). Opaque ratio 0.877 (polar holes only).
- Polar V-notch and scalloped southern limit are in raw RGB/luma/alpha.
- Ring-confidence PNG shows a **bright geometric lobe** over the SIO/Antarctic edge that is weaker in raw luma — mapping amplifies it.
- Diagnostic IODC `msg_iodc:ir108` south crop (17:15Z) shows a bright disk/limb cut with a straight-looking diagonal in that bbox — the same family of GEO-limb geometry the ring mosaic can inherit (IODC SSP 45.5°E; documented component of EO:EUM:DAT:0330).
- Regionals-only south crop: two circular disks and a **black triangular gap**. LIB-073 fills that gap with ring. The fan shape in the final winner map is **our θ=75° mask**, not a triangle cut out of the provider PNG.

## 7. Ring alpha behavior

South crop 20–130°E, 20–90°S (250,173 px):

| α | count |
|---|------:|
| 0 | 42,924 (polar hole) |
| 1–64 | **0** |
| 65–254 | **0** |
| 255 | 207,249 |

No partial-alpha ramps on this grid. Provider alpha is binary coverage. The bright/dark wedge interiors that are opaque are fully “valid” according to alpha. Alpha does **not** encode mosaic quality, internal joins, or polar-edge trust.

## 8. Ring internal mosaic/seam evidence

**(docs)** EUMETSAT Navigator / WMO WIS EO:EUM:DAT:0330 *Geostationary Ring IR10.8 μm Image - Multimission*: 3-hourly visualization from Meteosat 0°, Meteosat IODC (SEVIRI IR10.8), GOES-16/18 (ABI IR10.3), Himawari-9 (AHI IR10.4). GetCapabilities: `ImageMosaic`, CRS **EPSG:4326** and **CRS:84** only, title as above, abstract empty, **no per-pixel component mask**, no satellite-id dimension. IODC prime is Meteosat-9 at **45.5°E** (layer abstract). Polar holes are expected (GEO ring is not polar).

**(live)** Expected longitude midpoints: MSG/IODC ~22.8°E, IODC/Himawari ~93.1°E. Sharp luma edges at 40°S include 76.7°E (jump 34) — nearer MSG eastern theoretical limb / mosaic join than 93°E. Polar hole is disk-scallop, not a meridian cut. WMS GetFeatureInfo component provenance: **not exposed**.

## 9. Ring WMS reprojection result

**(repo)** Production: WMS 1.3.0 `CRS=EPSG:4326` BBOX `-90,-180,90,180`, 2048×1024, `TRANSPARENT=TRUE`.

**(live)** Ring layer does **not** advertise EPSG:3857; GeoServer still served it. South crop in 3857 still shows the polar hole and a bright high-latitude lobe (Mercator stretches the hole into a more triangular look). Geometry exists in **both** 4326 and 3857 at the same geography. Native satellite CRS: **not advertised**. Alternate CRS sample does not exonerate 4326 as the inventor of the wedge.

## 10. Ring resolution stability

2048×1024, 1024×512, and south BBOX 1× (626×398) / 2× (1252×796) keep the polar hole and SIO lobe in **geographic** place. 1024-wide has coarser luma jumps at 60°S; 2048 is smoother but the hole vertices stay. Shape scales in lon/lat, not in output-pixel triangles. Provider source geometry + GEO disk mapping, not a 2048-specific interpolation wedge.

## 11. Ring time stability

Slots 15:00Z, 12:00Z, 09:00Z (one cadence each). Polar hole at 70°E 80°S remains α=0 on all three. Luma at 70°E 55°S stays ~150–156 (fixed bright). Luma at 70°E 70°S 157 / 166 / **255** (intensity changes; location fixed). Cloud field inside the mosaic moves; **hole and join geography do not**. Mosaic/source geometry, not a travelling storm triangle.

## 12. Stage where wedge first appears

**Polar hole / IODC limb:** raw provider (α=0 hole; IODC disk in component / ring luma).

**θ=75° fan shape:** **final winner / final alpha** (not present as a cut in raw ring).

**Bright IODC-like lobe vs dark corridor:** weakly in raw luma, **stronger in canonicalIR and confidence** (black-point + knots).

Rank for the user-visible SIO triangle: **final authority geometry first**, then ring mapping, then raw polar/IODC structure.

## 13. Ring black-point contribution

Production `clamp((luma−56)/(255−56),0,1)`. Typical ring clear ~73 → IR 0.09, below the 0.30 floor (as designed).

At 70°E 45°S luma **102**: IR56=0.23 conf **0**; IR0=0.40 conf **0.12**. Black-point 56 **creates the dark hole** at that pixel. At 70°E 55°S luma 156: still cloudy under 56 (conf 0.43) vs 0.68 with no BP — BP reduces brightness, does not invent the lobe. Do not change production here; any later mapping pass should treat 56 as a **hole-maker in the mid-gray SIO**, not as proven ocean.

## 14. Shared confidence contribution

Knots: IR≤0.30 → 0, then a steep 0.40–0.52 rise. Ring-confidence vs canonical seam ratios on the polar-hole mask are similar (26.1 vs 26.8) — knots do not uniquely invent the hole. They **do** turn modest IODC-lobe IR (~0.50–0.62) into obvious alpha (0.43–0.71). Shared curve preserves a ring-internal contrast; it is an amplifier, not the geometric author.

## 15. Ring-only seam metrics

South box 40–110°E, 30–80°S. Polar-hole α boundary (nB=40):

| field | boundary | interior | ratio |
|-------|---------:|---------:|------:|
| raw luma | 104.8 | 2.86 | **36.6** |
| canonicalIR | 0.386 | 0.014 | **26.8** |
| confidence | 0.458 | 0.018 | **26.1** |

Winner-edge (ring vs not-ring) final alpha: boundary 81.2, interior 10.1, ratio **8.03** (nB=979). Ring-only polar-hole ratio is already huge — compositor is not required to *create* a polar seam. The θ=75° corridor ratio 8.0 is still well above interior texture.

## 16. q0 regional comparison

Regionals-only: two GEO disks, hard MSG|Himawari seam, **black triangle** where neither has coverage (opens ~55°S). That hole is exactly LIB-072 wedge #2.

With LIB-073: hole fills with ring. Cost: (1) q=0 skirts that used to show limb cloud are replaced by ring, including ring-clear; (2) remaining q>0 disks keep circular limbs at θ=75°.

At 70°E 45°S, q=0 MSG/Himawari **look cloudier** than ring (conf 0.39 vs 0). Simple `ring > q0` is defensible for *geometry* (avoid limb envelopes) and not always defensible for *appearance*. Do not use confidence as authority. Diagnostic only.

## 17. Is LIB-073 still semantically correct?

**Yes.** Usable regional still beats ring (NATL/Pacific q>0 identity not reopened). q=0 remains coverage. Ring no longer loses to unusable limbs. India MSG coverage-east freshness arc is gone. Status includes ring age because ring owns pixels.

A correct authority rule can expose deeper provider/mapping defects. Do **not** revert.

## 18. Need for ring quality concept

**Yes, as a later plane, not as a revert.** Coverage (α>0) is too coarse: IODC limb, polar mosaic edge, and nadir IODC are all α=255. Ring has no SSP today (`getCloudsQualityPlane` returns null). A ring **quality** distinct from coverage is the honest analogue of regional θ. It is not required to keep LIB-073; it is required if we want poor ring to lose to q=0 regional without image-content scoring.

## 19. Possible ring quality authority

Preferred order:

1. **Provider component masks** — not in WMS/GetCapabilities. Absent.
2. **Known internal source geometry** — documented SSPs: MSG 0°, IODC 45.5°E, GOES-16 −75.2°, GOES-18 −137°, Himawari 140.7°E. Ring quality ≈ quality of the **nearest** component SSP (same 55°/75° curve). Polar beyond all limbs → 0 (already α=0 for true holes).
3. **Precomputed static seam/edge mask** — if (2) is too crude for IODC/Himawari join.
4. **None** — stay with LIB-073.

Do **not** use local variance / “looks cloudy” as quality.

## 20. India artifact winner provenance

**(live)** Crop 60–110°E, 5–50°N. Winner west→east: **yellow Meteosat | purple ring | green Himawari**.

| lat | MSG→ring | ring→Himawari | MSG cov east | Him q>0 west |
|----:|----------:|--------------:|-------------:|-------------:|
| 10°N | 65.8°E | 75.2°E | 75.3°E | 74.9°E |
| 25°N | 63.5°E | 77.4°E | 74.4°E | 77.2°E |
| 40°N | (MSG q>0 west of crop) | 82.7°E | 72.5°E | 82.6°E |

Speckled side = **Himawari** (east, Bay / SE Asia / eastern India). Darker/smoother side = **ring** (central India) and **MSG** (far west). Apparent transition at 25°N **77.4°E** is Himawari θ=75° reclaim, not MSG WMS coverage.

At 25°N 70°E: winner ring, ring conf 0, MSG q=0 conf 0.03, Himawari q=0 conf 0.05. At 25°N 78°E: winner Himawari q=3, conf 0.52, grainy.

## 21. India ring participation

**Yes.** 33% of the India crop is ring-owned. Remaining India issue is still ring-related **and** Himawari-related. It is no longer the LIB-072 MSG coverage-east arc.

## 22. Himawari texture findings

India/Bay box ~85–100°E, 10–22°N (n=4988, all coverage):

- mean local IR variance **0.0167** (p50 0.015, p95 0.039)
- frac conf>0.05 **0.86**; conf p50 **0.39**, p95 0.98
- q=255 subset still fracConf **0.68** — grain is **not** only a limb problem
- 1024×512 request: variance **higher** (0.024), not lower → not a 2048-only resample spike
- 1px RGB box-filter **before** colormap **increased** variance (0.017→0.029) and raised IR p50 (0.45→0.55). Do not smooth GIBS RGB into a rainbow LUT.

## 23. Meteosat texture findings

Comparable western-India MSG box: mean var **0.0032** (~5× calmer), conf p50 **0**, fracConf **0.20**, IR p50 0.22. MSG is smoother and more conservative, not “wrongly empty” in nadir Africa (q=255 IR p50 0.11, fracConf 0.20). Both are plausible IR; they are **different provider display interpretations**.

## 24. GIBS LUT / palette findings

64³ LUT vs exact nearest-segment on Himawari India pixels: nDifferent 4414/4988, mean |ΔIR| **0.30**, max 0.82. Chromatic legend colors match; **near-grays disagree wildly** (e.g. RGB 103,103,103: LUT 0.26 vs exact 0.89) because Band13 rainbow reuses gray. WMS resampling produces lots of near-gray. LUT is **not** equivalent to exact projection on those pixels and can add salt-and-pepper. Diagnostic only; production unchanged. Weather-5.1 tests checked chromatic mid-palette (~0.04), not gray aliasing.

## 25. WMS resampling findings

Himawari speckle persists at 1024 and 2048. Ring wedge geography persists at 1×/2× south crops. No evidence that 2048×1024 uniquely creates the SIO triangle. Himawari grain is provider style + rainbow colormap + server resample, stable enough to treat as source interpretation.

## 26. CanonicalIR consistency — India

Dual coverage 60–90°E, 10–40°N: **dual q>0 = 0**, dual q=0 n=9682. MSG IR p50 **0.24**, Himawari **0.38**, mean |ΔIR| **0.18**. Same class as LIB-072. After LIB-073 that dual-q=0 band is **ring**, so the painted seam is ring IR (often ~0.10, conf 0) vs Himawari IR ~0.40–0.56.

## 27. Confidence consistency — India

Same dual-q=0 box: MSG conf p50 **0**, Himawari **0.11**, mean |Δconf| **0.19**. Himawari q>0 reclaim at 78°E 25°N conf 0.52 against ring conf 0. Shared knots preserve a hard step; they do not draw the θ=75° curve.

## 28. External reference comparison

IODC IR108 south crop (same EUMETView family, 17:15Z): bright GEO disk, limb geometry, no Earth-fixed θ=75° fan, no MSG|Himawari q>0 circular pair. JMA/Worldview true-color is night over the SIO at this instant — not used. No external image shows a meteorological cloud mass shaped like the θ=75° triangle. Polar scallops match expected GEO-ring holes (EO:EUM:DAT:0330). A real cyclone-like spiral in ring luma is weather; the **straight/circular envelope** is not.

## 29. Illumination/base-map contribution

Off-process composites (black, no substrate, no night veil) already show SIO winner fan, polar hole, and Himawari grain. In-app India at this UTC is on the **night** side; city lights / Himalaya / night veil make overlay grain look worse. Solar shading off was not toggled in-app; illumination-free rasters suffice to reject “shading created the triangle.”

## 30. Artifact temporal stability

Ring polar hole and 70°E 80°S no-data: fixed across three 3 h slots. India θ=75° winner edges: Earth-fixed (quality cache), will not walk with freshness. Himawari grain stays on the Himawari side of θ=75°. Cloud interior luma moves with weather. Two in-app Clouds poll cycles (~8 min) were **not** waited; predicted from policy + three ring slots.

## 31. Root cause — southern wedge

1. **LIB-073 θ=75° ring corridor** framed by remaining q>0 MSG and Himawari disks (authority geometry).
2. **Ring valid-clear + black-point 56** punching dark holes where q=0 regionals still have cloud.
3. **Ring-native polar hole and IODC-limb / mosaic contrast** (α=255 on joins; α=0 on poles).
4. Shared confidence amplifying the IODC-like bright lobe.
5. Equirect mapping of circular GEO limbs (expected).
6. Not a 2048-only WMS triangle; not leftover Rec.601 wash.

## 32. Root cause — India texture

1. **Himawari GIBS Band13 grain** (even q=255).
2. **Ring stripe** between MSG θ=75° and Himawari θ=75° (LIB-073 predicted cost), often ring-clear vs Himawari cloud.
3. Residual MSG vs GIBS canonical step (mean |ΔIR| 0.18 in dual q=0, now hidden under ring).
4. Rainbow LUT gray aliasing (amplifier).
5. Night-side substrate (in-app amplifier only).
6. Not the old MSG coverage-east freshness arc.

## 33. Candidate production models ranked

| Rank | Model | Notes |
|-----:|-------|-------|
| 1 | **A. ring-specific quality from component SSPs** | Nearest of {0°, 45.5°E, −75.2°, −137°, 140.7°E}; polar/join poor ring can lose to q=0 regional. No image heuristics. |
| 2 | **B. ring canonical / black-point refinement** | Only if quality is not enough to stop mid-gray holes. Fixed, not adaptive. |
| 3 | **E. Himawari source-local grain mitigation** | Separate from SIO. Not RGB blur into the LUT. |
| 4 | **D. ring vs q0 conditional competition** | Fold into A if quality exists; do not special-case pixels by cloud appearance. |
| 5 | **C. ring provider/source replacement** | No better IR ring layer in `mumi:*`. IODC as a **fifth regional** is an architecture option, not a drop-in ring swap. ISCCP-NG L1g is not a live WMS. |
| 6 | **G. WMS CRS change** | Ring has no native satellite CRS; 3857 does not remove the hole. |
| 7 | **F. narrow q>0 blend** | Still NATL/Pacific; India dual q>0 is empty; SIO edges are q≈0/q=1 not dual high-q. |
| 8 | **H. no change** | Accept quality-contour envelopes as honest. Valid if the human prefers footprints to holes-from-mapping. |

## 34. Recommended immediate implementation LIB

**LIB-075 — WEATHER-5.3.1: ring component-geometry quality (static SSPs)** — proposed only; human must approve.

In scope: a cached Earth-fixed ring quality plane from documented GEO-ring component SSPs (include IODC 45.5°E); overlap rule **good ring > q=0 regional > poor ring**; keep q>0 regional on top; polar α=0 unchanged; tests that NATL q>0 identity holds; DEV quality/winner; no blend; no confidence/canonical retune unless a measured mid-gray hole remains after quality.

Out of scope: Himawari grain, LUT rewrite, q>0 blend, TIME sync, WEATHER-6, visible, illumination, user controls.

## 35. Whether one or two follow-up LIBs are needed

**Two.** SIO → ring quality / mapping (LIB-075). India texture → Himawari GIBS grain + optional LUT gray handling (later LIB). Do not force one LIB to solve both.

## 36. Later q>0 blending recommendation

Unchanged: only dual **q>0**, small |Δq|, modest |Δt|, ~3–6 px, never into no-data. NATL East/MSG at ~45°N −55° remains the candidate. These artifacts are coverage/quality-contour / grain. Blending them would ghost GEO parallax at 75–85° zenith. Reassess after LIB-075, not before.

## 37. Performance implications

Static ring quality: one 2048×1024 `Uint8` cache, same as regional quality, off-rAF, one extra byte load per pixel in compose (already O(2M)). Alternate provider: extra GetMap, concurrency already 2. Source-local Himawari filter: off-rAF on one sector. Exact colormap without LUT: ~colormap segments × 2M — too heavy unless sparse/exact-only for near-grays. Keep one composed PNG, one `imageBlit`, no rAF work.

## 38. Test recommendations

- Ring-native polar-hole fixture stays α=0 and does not count as coverage.
- Static ring quality: IODC-nadir-like SIO pixel ranks above MSG/Himawari q=0; polar/join ranks below.
- Valid-clear **q>0** still suppresses ring.
- q>0 NATL East/MSG identity vs WEATHER-4.3.
- No authority dependence on cloud confidence / local variance.
- Status ages include ring iff ring owns pixels.
- India: MSG|ring|Himawari order along 25°N; no MSG coverage-east winner arc.
- LUT exact-vs-fast: document gray aliasing; do not silently treat them as equal.
- Himawari grain regression is presentation, not authority.

## 39. Not verified

- Two in-app Clouds refresh cycles of winner-edge motion (predicted Earth-fixed).
- App GIBS TIME vs harness defaults (app newer; same class).
- In-app solar shading OFF pixel-identical to ON.
- Native geostationary CRS GetMap (not advertised).
- GetFeatureInfo satellite-id (not in capabilities).
- IODC as a production fifth regional (one diagnostic crop only; first south-pole BBOX 502’d).
- External licence counsel. Tauri binary. Daytime true-color SIO (night at this UTC).

## 40. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item stays **proposed**.
