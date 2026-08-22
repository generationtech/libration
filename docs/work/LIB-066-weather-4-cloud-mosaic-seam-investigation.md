# LIB-066 — Weather-4: cloud mosaic seam / footprint artifact investigation

| Field | Value |
|-------|-------|
| ID | LIB-066 |
| Status | proposed |
| Created | 2026-08-21 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item.

Follow-on: [LIB-067](LIB-067-weather-4-1-cloud-coverage-mask-authority-replacement.md) implemented the coverage-authority recommendation in §35. This investigation item remains **proposed**.

## Objective

Determine precisely why the current WEATHER-3 best-current cloud mosaic visibly exposes provider/satellite footprints, including whether broad seams come from hard source overwrite / radiometric differences and whether the narrow bright vertical stripe is a separate compositing bug. Distinguish source coverage authority from derived cloud opacity. Planning evidence only.

## Scope

**In scope**

- Repository reconnaissance of Clouds v3 composition, IR transfer, sector cache, WMS grids, `imageBlit`, DEV sector tint, and tests.
- Live WMS capture of the contributing observations and pixel-level diagnostics (raw, highlight, composite variants).
- Structured survey in this work item.

**Out of scope**

- Any production composition, transfer, opacity, source-priority, feathering, quality-weighting, visible/IR hybrid, or illumination change.
- Activating this item or creating an approved implementation LIB from this survey.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-065](LIB-065-weather-3-high-cadence-best-current-cloud-composition.md)

## Acceptance criteria

- Repository confirmed AWAITING SCOPE at start.
- Structured survey covering the requested sections.
- No production source changes.
- This item remains `proposed` unless a human approves it.
- `docs/STATE.md` stays AWAITING SCOPE.

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

Recorded 2026-08-22. Diagnostic files lived only under `/tmp/libration-weather4-seam/` (not added to the repository). Production Clouds composition, transfer, and opacity were not modified.

Repository truth vs live-provider measurements are labeled **(repo)** and **(live)** below.

## 1. Verdict

**WEATHER-4 CLOUD MOSAIC SEAM INVESTIGATION COMPLETE**

The mosaic exposes satellite footprints because composition treats **derived cloud-highlight alpha** as if it were **source coverage**. A later sector replaces a pixel only when highlight alpha > 0. Valid-clear observations (provider alpha 255, warm IR, highlight alpha 0) leave older ring/regional cloud in place. That is not Porter-Duff accumulation and not a duplicate-column bug.

The narrow bright vertical stripe is a **separate visual** with the **same family of causes**: geostationary disk-limb pixels are radiometrically extreme (often raw luma 199–255). After smoothstep 100→195 they become highlight alpha 255. Where a later source is valid-clear, those limb pixels of the earlier source remain as a 1–few pixel bright meridian. Meteosat’s western limb does the same in raw MSG imagery at mid-latitudes.

## 2. Repository state

`docs/STATE.md` was **AWAITING SCOPE** at start and remains so. No implementation LIB was activated. Production Clouds math, transfer, opacity, and source priority were not changed. This item stays **proposed**.

## 3. Reproduced visual defect

Live product (`http://localhost:1420/`, HUD ~9:59–10:00 PM local 21 Aug 2026 / ~02:00Z 22 Aug). Status **Clouds · observations 20–50 min old**. Weather topic: GOES-West 40 min, GOES-East 50 min, Meteosat 30 min, Himawari 20 min. Opacity control 0.42 (slider displayed 0.4). Ring not in status (all four regionals present).

Harness capture at **2026-08-22T01:51:10Z**:

| Sector | Observation | Age | Opaque ratio |
|--------|-------------|-----|--------------|
| EUMET ring | 00:00Z | 111 min | 0.875 |
| GOES-West | 00:40Z | 71 min | 0.371 |
| GOES-East | 00:40Z | 71 min | 0.371 |
| Meteosat | 01:30Z | 21 min | 0.326 |
| Himawari | 00:30Z | 81 min | 0.349 |

Paint order **(repo+live)**: ring → West → East → Himawari → Meteosat (Meteosat freshest; hysteresis ≥15 min).

Visible boundaries match user report: western Atlantic / eastern South America (Meteosat west limb ~75°W); narrow bright stripe along ~70–75°W through eastern North America / Caribbean; Greenwich / west Africa (~6°E, GOES-East east limb showing through clear Meteosat); curved GEO limbs into the South Atlantic.

## 4. Source-boundary map

Coverage winner (provider alpha > 0, later sector wins): cyan GOES-West, magenta GOES-East, yellow Meteosat, green Himawari, gray ring in polar/inter-disk gaps.

At this capture Meteosat paints last, so it owns its full disk including Africa and the eastern Atlantic. GOES-East owns the Americas west of Meteosat’s western limb except where West still shows west of East’s western limb (~154°W at 35°N). Ring is under everything and only *should* show in polar holes and missing regionals.

Highlight-alpha winner (what production actually paints) is **smaller than coverage**: warm/clear Meteosat Africa does not win, so GOES-East limb and ring remain visible there. Existing DEV `?cloudsSectorDebug=1` tints highlight-alpha winners, so it under-reports true footprints.

## 5. Narrow bright stripe diagnosis

**Not** double-painting, alpha addition, duplicate column, wrap copy, or premultiplied RGB leak.

Two stacked mechanisms, both measured:

1. **Provider limb saturation (already in raw PNGs).** At 45°N Meteosat’s first opaque column (x=619, lon −71.1°) has **raw luma 255** for several pixels inward; highlight alpha 255. GOES-East at the same pixels is luma ~122 / highlight 35. The stripe is already in `raw-meteosat.png` as a bright disk-edge rim. GIBS East’s eastern limb at 18°N is raw luma 199–214 with highlight alpha 255.

2. **Clear-sky non-replacement.** At 18°N, GOES-East last opaque column x=1058 (lon **6.06°E**): East highlight alpha 255, Meteosat coverage valid but highlight alpha 0 (raw luma 29). Production composite alpha **255**. Opaque-authority diagnostic alpha **0**. The Greenwich bright line is GOES-East’s cold limb left in place because Meteosat is treated as “not present” wherever derived cloud alpha is 0.

Caribbean/eastern North America stripe ≈ Meteosat western limb (~75°W, near-vertical at mid-latitudes) plus the same replace-if-highlight-alpha>0 rule. Duplicate adjacent columns in the composed raster: **0**.

## 6. Broad seam diagnosis

Primary: **coverage vs cloud-alpha conflation** + **hard replace-if-alpha>0** + **provider-disk footprints** (alpha > 0, not geographic boxes).

Secondary: **source radiometry**. East/Meteosat overlap raw mean luma 123.7 vs 90.1 (Δ 33.6). After MSG +20 lift still 123.7 vs 109.7. GIBS p50 ~125; MSG p50 72; ring p50 98. Meteosat highlight p50 is **0** in overlap (more “clear”); GIBS p50 highlight ~29–47 (more wash). Footprints read as patches even when cloud geometry continues.

Tertiary: **viewing-angle limb**. GIBS West at 80° from subpoint: mean raw luma 181 / highlight alpha 195 vs nadir 119 / 66.

Not primary: observation-time mismatch (East/West Δt = **0**, seam ratio still 2.36). Ring layering (no-ring Caribbean seam ratio 2.17 vs production 2.17). Luma lifts (no-lift 2.01 vs 2.17).

## 7. Current composition math

**(repo)** `applyCloudHighlightTransferInPlace`: if provider A=0, RGB→0 and skip; else Rec.601 luma, optional lift (+12 ring, +20 MSG, 0 GIBS), `smoothstep(100,195)`, output RGB (248,250,252), output A = round(cloud01 × providerA).

**(repo)** `compositeCloudHighlightLayers`: for each sector in paint order, for each pixel, **if srcA > 0: copy RGB and A over destination; if srcA == 0: leave destination**. This is **not** Porter-Duff source-over. Semi-transparent highlight fully replaces (no ring+regional sum). Valid-clear (A=0) does not replace.

Paint: ring baseline, then regionals. If |ageA−ageB| ≥ max(cadence), fresher last; else stable West → East → Meteosat → Himawari.

Encode PNG → blob URL → one `imageBlit` with `ctx.globalAlpha = layer.opacity` (0.42). `drawImageBlit` does not disable image smoothing.

## 8. Ring-baseline behavior

Ring is painted first. Regionals overwrite only where their **highlight** alpha > 0. Ring remains under valid-clear regional pixels. Status omits ring age unless a regional is missing. No-ring diagnostic: Caribbean seam metric unchanged (2.17). Ring is not the Caribbean stripe. Ring **does** leak through clear GOES/Meteosat (see §9) and supplies polar fill.

## 9. Clear-sky authority behavior

**Yes.** Older ring (and earlier regionals) show through newer valid-clear observations.

**(live)** fraction of valid pixels with highlight A=0 **and** ring highlight A>0:

| Sector | leak / valid |
|--------|----------------|
| GOES-West | 13.4% |
| GOES-East | 12.4% |
| Himawari | 7.9% |
| Meteosat | 6.3% |

At 18°N lon 6.06°E, valid-clear Meteosat leaves GOES-East limb cloud (prod A=255, opaque-authority A=0). At 10°S/20°S Meteosat west edge, prod A=53/47 vs opaque A=0.

## 10. Coverage mask vs cloud alpha

**No separate coverage mask is carried.** Provider alpha is multiplied into derived cloud alpha at transfer time and discarded as an independent field. The composite cannot distinguish “authoritative clear” from “no data.” This is the missing abstraction.

## 11. Raw source comparison

Seams **are** already in raw provider imagery as disk edges and (for MSG) a saturated limb rim. They are **amplified** by the highlight transfer and by non-replacement of clear coverage. Raw MSG western limb at 45°N is luma 255 before any Libration transfer. Raw GIBS East eastern limb at 18°N is luma 199–214. East/West overlap raw means differ by only 0.77 luma (same TIME, same family). East/Meteosat overlap differs by 33.6.

All five rasters **2048×1024**.

## 12. Source normalization comparison

Confirmed production: Rec.601; smoothstep 100→195; ring +12; MSG +20; GIBS 0; RGB (248,250,252); overlay 0.42.

Lifts do **not** create the seams (no-lift seam ratio 2.01 vs 2.17). They do not fix MSG vs GIBS distribution shape: MSG is more binary (p50 highlight 0, p75 188); GIBS is washy.

## 13. Observation-time contribution

East/West overlap: Δt = 0, n=452994, seam ratio 2.36. Time mismatch is **not required**. East/Meteosat Δt = 50 min can shift storm edges but the Greenwich stripe and MSG limb rim are geometric, not advective. Cloud-feature displacement from 50 min was not tracked as motion vectors (not verified quantitatively).

## 14. Viewing-angle contribution

Yes, major at the limb. GEO disks in equirect are squircles. Angular-distance buckets for GOES-West: 0–10° mean highlight 66, 70–80° 119, 80°+ **195**. Limb quality is poor and bright in this IR display stretch. Future weighting by distance from subpoint is feasible (subpoints known: West −137.2, East −75.2, MSG 0, Himawari 140.7). Do not implement in this survey.

## 15. Provider alpha-edge behavior

| Source | Partial alpha fraction | Limb |
|--------|------------------------|------|
| Ring | 0 | Hard 255; full-world at equator |
| Meteosat | 0 | Hard 255; west edge x=594 at equator (−75.5°) |
| GOES-East | 0.16% | Last pixel often A=64–128 (1 px antialias); then 255 |
| GOES-West | 0.20% | Wraps dateline |
| Himawari | 0.89% | More antialiased edge; low-alpha RGB mean luma 0.85 (dark) |

Meteosat/ring: opaque to a hard edge. GIBS: nearly opaque with ~1 antialiased pixel.

## 16. Premultiplied-alpha findings

fast-png decode is straight RGBA. Transfer zeros RGB when provider A=0. Low-alpha (A=1..16) pixels: **nBrightLowAlpha = 0** on all sources. Mean luma of those pixels is ~0–15, not white. Premultiplied bright-RGB leak is **not** the stripe. Browser `drawImage` upsample/downsample can soften a native 1 px rim; it does not invent it.

## 17. Raster/grid alignment

All components 2048×1024. Meteosat disk midpoint x=1023.5 → lon 0. GOES-East disk midpoint ≈ pixel 597.5 → lon −75.3 (GOES-16 75.2°W). No half-pixel family offset detected at disk centers. `sampleEquirectRgbaAlpha` uses `(width−1)` in one helper; GetMap uses WIDTH=2048 over ±180. Residual 1 px disagreement at limbs is possible but not the primary stripe (MSG rim is several pixels of luma 255 at 45°N).

## 18. WMS alignment

**(repo)** GIBS WMS 1.1.1 `BBOX=-180,-90,180,90`. EUMET WMS 1.3.0 `BBOX=-90,-180,90,180`. After decode, disks center on the expected subpoints. Pixel-center equivalence is good enough that a 1 px gap between East and Meteosat does **not** exist: they overlap from ~−75° to ~+6°. No ring-only strip between them.

## 19. One-pixel / duplicate-column findings

`duplicateAdjacentCols = 0`. Dateline first/last column not identical (`wrapSame = false`, expected). No crop-edge column duplication. The “one pixel” look is a **saturated limb column (or few)** plus highlight-alpha non-replacement, not an off-by-one blit of the same column twice.

## 20. Diagnostic component views

Written under `/tmp/libration-weather4-seam/` (not in git): raw and highlight per sector; coverage masks; winner maps (coverage vs highlight-alpha); overlap maps; ring-leak map; production / no-ring / opaque-authority / no-lift / source-over composites; Caribbean and Greenwich crops. Existing in-app `?cloudsSectorDebug=1` tints highlight-alpha winners only.

## 21. Ring-off result

Broad East/Meteosat Caribbean seam metric **unchanged** (2.17). Stripe remains in no-ring composite. Ring is not the primary Atlantic seam. Ring **is** implicated in ghost clouds in clear regional interiors.

## 22. Opaque-authority replacement diagnostic

Where provider A>0, copy that sector’s highlight including A=0 (clear replaces). East/Meteosat Caribbean seam ratio **2.17 → 0.56**; Atlantic **3.48 → 0.25** (below within-source texture). Greenwich East-limb stripe at 6°E **disappears** (A 255→0). MSG western limb that is itself luma 255 **remains** (it is in the winning source). This is the correct first production repair, DEV-only in this survey.

## 23. No-normalization diagnostic

Remove +12/+20: Caribbean seam 2.01 vs 2.17. Lifts are not the seam.

## 24. Same-normalization diagnostic

Equivalent to no-lift for GIBS (already 0) plus dropping MSG/ring lifts. Residual seams are coverage-semantics + raw enhancement differences, not the additive lifts.

## 25. Seam metric

Mean |Δalpha| across coverage boundary vs within-source adjacent pixels.

| Boundary | Production ratio | Opaque-authority |
|----------|------------------|------------------|
| East/Meteosat Caribbean | 2.17 | 0.56 |
| East/Meteosat Atlantic | 3.48 | 0.25 |
| East/West N. America | 2.36 | (not remeasured) |
| Meteosat/Himawari | 2.65 | (not remeasured) |

## 26. Cloud-haze / atmospheric-wash evidence

Separate from seams. Valid pixels with derived alpha > 0.05 / 0.10 / 0.20 / 0.50:

| Source | >0.05 | >0.10 | >0.20 | >0.50 |
|--------|-------|-------|-------|-------|
| Himawari | 72% | 67% | 58% | 37% |
| GOES-West | 64% | 57% | 48% | 33% |
| GOES-East | 63% | 56% | 47% | 32% |
| Ring | 48% | 43% | 36% | 23% |
| Meteosat | 42% | 39% | 36% | 30% |

GIBS Band13 + smoothstep 100→195 paints a lot of non-storm as cloud. MSG is more binary. Do not retune the curve in the seam-fix LIB.

## 27. Root-cause classification

1. **A+B (primary):** no coverage mask; highlight alpha used as authority; valid-clear does not replace. Rank 1.
2. **J then D:** provider IR display stretch / limb saturation (MSG rim luma 255; GIBS limb ~200). Rank 2.
3. **E:** viewing-angle degradation at GEO limb. Rank 3.
4. **C:** feathering not needed until 1–2 are done; current “seams” are mostly wrong authority, not unsmoothed equal observations.
5. **F, G, H:** premultiply, grid, duplicate-column — **ruled out** as the stripe.

## 28. Recommended production composition model

Per source, keep `coverageMask` (provider A>0, or A≥ threshold), `cloudSignal` (current highlight), `observationTime`, optional later `qualityWeight`.

Composite:

- Ring fills only where no regional coverageMask is set.
- Where a regional coverageMask is set, **that regional’s cloudSignal is authoritative**, including zero (clear).
- Overlaps among regionals: keep freshness-with-hysteresis then stable order **on coverage**, not on highlight alpha.
- Do not interpret transparent cloud-highlight as “no authority.”
- No nowcast. No forced common TIME.

## 29. Need for separate coverage mask

**Yes.** Without it, clear regional observations cannot suppress older cloud.

## 30. Need for feathering

**Not as the first fix.** After authority replacement, residual MSG-vs-GIBS radiometric steps in **dual-coverage** overlaps may want a few-degree feather. Do not feather at coverage/no-data limbs (that would invent coverage). Width TBD after the authority LIB’s visual/metric pass.

## 31. Need for radiometric normalization

**Yes, later**, after authority. Shared smoothstep on unlike display stretches is globally “calibrated” and locally incompatible (MSG p50 72 vs GIBS 125). Limb-max clipping (reject luma 255 rim / space-adjacent) should be considered with authority, not as eye-tuned curve changes.

## 32. Need for viewing-angle weighting

**Later.** Feasible. Prefer more nadir source in dual-coverage overlaps; do not paint extreme limb over slightly older nadir if quality is clearly worse. Freshness remains important. Not the first LIB.

## 33. WEATHER-3 doctrine regression

**Keep.** East/West same-time seams prove synchronization would not remove footprints. Freshness-over-synchronization ([ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)) stays. Better composition, not older TIME.

## 34. Performance implications

Coverage mask is one `Uint8Array` per cached sector (2 MB at 2048×1024) or can be recovered from stored raw/provider A if raw is kept. Authority replacement is the same O(pixels) loop already used off rAF. Feathering/quality weights add a second pass still off rAF. Still **one** encoded PNG and **one** `imageBlit`. No per-frame giant blend.

## 35. Recommended immediate next LIB

Proposed implementation (human-approved later), suggested title:

**LIB-067 — Weather-4.1: Clouds coverage-mask authority replacement**

In scope: separate coverage mask from cloud-highlight alpha; regional valid-clear replaces ring and earlier regionals; keep paint-order / freshness hysteresis on coverage; limb saturated-pixel handling if cheap; tests in §37; visual verification; no curve/opacity/source-priority/feathering/visible-IR changes.

## 36. Recommended later cloud-presentation LIB

Separate: IR confidence / wash (smoothstep 100→195 puts 63–72% of GIBS valid pixels above alpha 0.05); optional GeoColor/visible+IR; optical-depth illumination. Do not mix with seam repair.

## 37. Test coverage recommendations

Why tests missed this: `weather3CloudsComposition.test.ts` checks selection, TIME independence, and “transparent pixels do not invent coverage.” It never asserts that **opaque-but-clear** coverage suppresses older cloud, never measures a seam metric, never fixtures a limb column.

Add: valid-clear regional zeros older ring; coverage independent of cloud alpha; no additive source-over in overlap; seam ratio below threshold after authority; no 1 px bright boundary from earlier-source limb under later-source clear; grid 2048×1024; heterogeneous times retained; provider A=0 does not bleed RGB.

## 38. Not verified

Canonical 1920×1080. In-app `?cloudsSectorDebug=1` tint was not obviously colored in the Browser screenshot (tint uses highlight-alpha; may have been subtle over the map, or acquire timing). MSG GetMap at a TIME equal to GIBS 00:40Z (age-sync of East/Meteosat). Quantitative storm-edge displacement over 50 min. External Worldview/STAR screenshot pixel comparison. Tauri binary. Canvas `drawImage` half-pixel positioning in the live viewport. Himawari/Meteosat dual-coverage motion. Legal/licence beyond current attribution.

## 39. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item remains **proposed**.

