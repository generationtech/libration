# 0025 — Heterogeneous observational display rasters are normalized before shared presentation

- **Status:** Accepted
- **Date:** 2026-08-22 (record written with [LIB-071](../work/LIB-071-weather-5-1-canonical-ir-cloud-confidence.md))

## Context

[ADR 0024](0024-observational-quality-distinct-from-coverage.md) separates coverage, viewing quality, and derived signal, and keeps overlap as a hard per-pixel winner. After that authority repair, Clouds still treated every provider PNG as if Rec.601 luma were a common infrared axis.

[LIB-070](../work/LIB-070-weather-5-cloud-radiometry-and-presentation-investigation.md) showed that NASA GIBS Band13 WMS is a false-color visualization (legend −92 °C to >57 °C), Meteosat `msg_fes:ir108` is a darker inverted grayscale, and the EUMET ring is a third grayscale stretch. Rec.601 of those encodings is not physically comparable. A shared `smoothstep(100,195)` therefore painted typical GIBS clear-ocean gray as cloud while MSG clear stayed clear. Global luma lifts did not fix the mismatch. Source authority was not the remaining defect.

Exact numeric brightness-temperature inversion of resampled WMS RGB is not guaranteed. Cloud-mask products are not yet available consistently across all four regional sources on the current browser WMS path.

## Decision

For observational Clouds (and other current-only raster overlays that reuse this model):

- Heterogeneous **provider display rasters** are converted through a **fixed, provider-specific interpretation** into a **canonical display-IR scalar** (`canonicalIR01`: 0 = warm/surface-like, 1 = cold/high-cloud-like) before any shared appearance curve runs.
- Shared presentation semantics (cloud-confidence → white/gray overlay) apply **only after** that canonicalization. Provider differences belong in interpretation, not in per-source final curves.
- The canonical scalar is a **display-IR** coordinate derived from published visualization metadata or a documented grayscale stretch. It is **not** brightness temperature unless a later product inverts a numeric field.
- Interpretation is **fixed** (no per-frame histogram equalization, no adaptive scene stretch, no user-facing calibration).
- **Source authority does not depend on cloud confidence.** Coverage, quality, freshness, and overlap winner remain independent of the canonical scalar ([ADR 0024](0024-observational-quality-distinct-from-coverage.md)).
- Default Clouds favor **meteorologically meaningful structure** over exhaustive detection of every thin or warm cloud.

Exact colormap knots, LUT size, near-gray chroma threshold, and confidence-curve coordinates are implementation choices, not this decision. [LIB-077](../work/LIB-077-weather-5-4-1-chroma-aware-gibs-near-gray-inversion.md) is a provider-specific canonicalization refinement of this decision, not a new one.

## Consequences

**Good.**

- GIBS false-color Band13 is no longer reduced to misleading Rec.601 luma.
- Clear ocean and warm land can sit below the shared confidence floor once they occupy the warm end of canonical IR.
- A later change to the shared curve does not require re-deriving per-provider lifts.
- GIBS Band13’s dual gray-branch RGB reuse is not inverted by RGB-nearest lookup. Near-gray WMS pixels follow the warm-gray legend; chromatic convective cores keep the 64³ LUT ([LIB-077](../work/LIB-077-weather-5-4-1-chroma-aware-gibs-near-gray-inversion.md)). A larger LUT, exact nearest-segment for every pixel, and RGB blur were rejected: they do not resolve the collision, destroy GOES clear-ocean, or hide real cells.
- The EUMET ring uses the same identity grayscale as Meteosat ([LIB-079](../work/LIB-079-weather-5-5-1-ring-canonical-identity-grayscale.md)). The former BP56 offset is not production.

**Costs.**

- Residual source-handoff contrast can remain where observations genuinely differ or where IR cannot separate cold surface from cloud. That is evaluated after this normalization; it is not a reason to blend coverage. [LIB-079](../work/LIB-079-weather-5-5-1-ring-canonical-identity-grayscale.md) removed the EUMET-ring BP56 offset; ring and Meteosat now share identity grayscale. Remaining ring↔GIBS steps at chromatic convective cores, polar ice, and provider texture are inherent display-IR limits, not a missing black-point.
- Isolated legitimate cold-gray legend colors without chromatic neighbors are treated as warm-gray. A later contextual cold-gray gate is not this decision.
- IR-only default Clouds cannot discriminate snow/ice from cloud at high latitude, and some warm low cloud / thin cirrus is intentionally weaker.

**Explicitly not decided.** Overlap feathering, visible/GeoColor hybrids, numeric netCDF brightness temperature as the live default, classified cloud-mask authority, and physical optical-depth illumination remain later work.
