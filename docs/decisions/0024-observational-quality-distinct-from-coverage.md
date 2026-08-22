# 0024 — Observational quality is distinct from coverage and may lose to better geometry

- **Status:** Accepted
- **Date:** 2026-08-22 (record written with [LIB-069](../work/LIB-069-weather-4-3-quality-plane-overlap-authority.md); ring-over-q0 consequence amended with [LIB-073](../work/LIB-073-weather-5-2-ring-outranks-q0-regional-authority.md))

## Context

[ADR 0023](0023-observational-composites-heterogeneous-observation-times.md) allows a single observational composite to combine heterogeneous observation times. [LIB-067](../work/LIB-067-weather-4-1-cloud-coverage-mask-authority-replacement.md) then separated **coverage** (provider valid-data) from **derived signal** (display alpha).

After that repair, Clouds overlap among regional GEO disks was still decided by freshness and stable source order alone. [LIB-068](../work/LIB-068-weather-4-2-cloud-source-quality-seam-investigation.md) showed that this lets an extreme-limb Meteosat pixel (viewing zenith ≈ 85°) replace a much better GOES-East observation (zenith ≈ 52°) in the North Atlantic merely because Meteosat is one cadence newer. That is not a coverage failure and not a reason to synchronize TIME.

Viewing geometry is Earth-fixed for a given satellite. It is not presentation, not coverage, and not a substitute for freshness among comparable views.

## Decision

For observational Clouds composites (and other current-only raster composites that reuse this model):

- Each contributing source keeps three independent planes: **coverage**, **quality**, and **signal**.
- **Coverage** remains provider valid-data. Quality must not turn valid coverage into no-data. A quality=0 observation that is the only coverage at a pixel still paints. When a valid global backstop also covers that pixel, the backstop is preferred; quality=0 does not suppress it. Any usable (quality>0) regional still beats the backstop, including valid-clear.
- **Quality** ranks how geometrically desirable a valid observation is at that pixel. It is presentation-independent.
- **Signal** is appearance only. It does not decide coverage or overlap authority.
- In dual coverage, **freshness dominates among observations of comparable useful quality**. An extreme-limb observation must not displace a modestly older, substantially better view merely because it is one source cadence newer. Freshness is applied within a meaningful authority class: it must not make one unusable (quality=0) GEO limb beat another in order to suppress a better global backstop.
- Overlap authority is an explainable lexicographic hard winner per pixel. Do not replace it with an opaque weighted score, and do not blend overlapping observations, unless a later decision reopens that question.
- Preferred authority when every covering regional is quality=0 and a paintable global backstop has provider coverage: **the backstop wins**. This does not redefine coverage.
- Do not synchronize heterogeneous observation times to improve visual continuity ([ADR 0023](0023-observational-composites-heterogeneous-observation-times.md) stands).

The exact 55°/75° geostationary transfer curve is an implementation choice, not this decision.

## Consequences

**Good.**

- GEO disk edges stop being the selected-source boundary where a better overlapping view exists.
- Coverage-authority repair from LIB-067 is preserved: valid-clear **usable** observations still own the pixel. Quality=0 remains coverage and still paints when no backstop is available.
- A valid q=0 regional observation may lose to a global backstop while remaining observational coverage. That is preferred-authority, not a coverage hole.
- Quality planes are Earth-fixed and can be cached outside the render path.

**Costs.**

- Residual source-handoff contrast can remain after a correct geometric winner. [ADR 0025](0025-heterogeneous-display-normalized-before-shared-presentation.md) requires provider display rasters to be normalized into a canonical domain before shared cloud-confidence presentation; it does not authorize blending to hide leftover mismatch.
- Overlap policy is more than freshness. Status and diagnostics must be able to show coverage, quality, winner, and signal separately in DEV.

**Explicitly not decided.** Exact zenith cutoffs, overlap feathering, quality-weighted blending, numeric brightness-temperature products, and visible/IR hybrid presentation remain later work.
