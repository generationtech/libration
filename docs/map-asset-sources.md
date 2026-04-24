# Map Asset Sources

## equirect-world-topography-v1
- Variant mode: monthOfYear
- Family runtime directory: `public/maps/variants/equirect-world-topography-v1/`
- Files:
  - `base.jpg`
  - `01.jpg` … `12.jpg` (the registry’s `onboardedMonths` must list only months that are actually present in this directory; there is no runtime filesystem or HTTP check).
- Source family: NASA Blue Marble Next Generation — Base Map with Topography and Bathymetry
- Notes: Month-aware family resolved from product UTC month with backward calendar lookback and base fallback. Omitted `onboardedMonths` in types means “all twelve slots are shipped” as a static contract, not a probe of the public folder.

## equirect-world-political-v1
- Variant mode: static
- Runtime asset: `public/maps/world-equirectangular-political.jpg`
- Preview: `public/maps/previews/world-equirectangular-political-thumb.jpg`
- Source family: Natural Earth 1:10m vector datasets exported through QGIS.
- Source ingredients:
  - `ne_10m_admin_0_countries`
  - `ne_10m_admin_0_boundary_lines_land`
  - `ne_10m_coastline`
- Notes: Generated as an overlay-friendly political/reference substrate: muted ocean, calm land fill, restrained borders, stronger coastline, no labels, full-world equirectangular export.

## Base map failure fallback behavior
- Month-aware families are registry-declared, but runtime may encounter missing files in local/dev/build outputs.
- Base-map raster payloads opt into image-load failure reporting.
- Failed concrete URLs are recorded and excluded from later base-map resolution.
- Month-aware families then continue the backward calendar lookback chain, followed by family base and global default fallback.
