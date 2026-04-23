# Map Asset Sources

## equirect-world-topography-v1
- Variant mode: monthOfYear
- Family runtime directory: `public/maps/variants/equirect-world-topography-v1/`
- Files:
  - `base.jpg`
  - `01.jpg` … `12.jpg` (the registry’s `onboardedMonths` must list only months that are actually present in this directory; there is no runtime filesystem or HTTP check).
- Source family: NASA Blue Marble Next Generation — Base Map with Topography and Bathymetry
- Notes: Month-aware family resolved from product UTC month with backward calendar lookback and base fallback. Omitted `onboardedMonths` in types means “all twelve slots are shipped” as a static contract, not a probe of the public folder.
