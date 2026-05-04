# Map Asset Sources

## Purpose

This document records current and planned map asset sources for Libration.

The authoritative runtime inventory is the bundled catalog:

```text
src/assets/maps/base-map-catalog.json
```

This document explains provenance, processing state, and notes that should not be buried only in JSON.

## Catalog rules

- Do not add families only under `public/maps`.
- Runtime does not scan `public/maps`.
- Runtime does not fetch a remote catalog.
- Use `npm run maps:prep -- --update-catalog` for curated source TIFF onboarding.
- Review catalog diffs before committing.
- Keep placeholder or transitional status accurate.

## Current inventory to verify against catalog

The current active catalog should be treated as source of truth. Known family ids from recent documentation include:

- `equirect-world-legacy-v1`
- `equirect-world-political-v1`
- `equirect-world-geology-v1`
- `equirect-world-blue-marble-bm-v1`
- `equirect-world-blue-marble-t-v1`
- `equirect-world-blue-marble-tb-v1`

If the catalog differs, update this document to match the catalog.

## equirect-world-night-lights-viirs-v1 (composition input)

Status: **implemented** (validated onboarded raster; `transitionalPlaceholder` is `false` in `src/assets/composition/emissive-composition-catalog.json`).

Role: upstream emissive radiance field for planetary illumination composition (not a default base-map selector target).

Registry:

- bundled composition catalog: `src/assets/composition/emissive-composition-catalog.json`
- runtime resolution: `src/config/emissiveCompositionAssetResolve.ts` (`resolveEmissiveCompositionAsset`, canonical id fallback for unknown/blank `assetId`).

Expected contract:

- same equirectangular full-world assumptions as base maps (2:1, north-up, lon −180..180, lat −90..90, no padding).

Runtime asset:

```text
public/maps/composition/equirect-world-night-lights-viirs-v1.jpg
```

### Provenance and license

- **Source:** NASA Earth Observatory / Visible Earth — **VIIRS Black Marble 2016**, flat map product “Earth at Night / Black Marble: Flat Maps” (grayscale, 1° / 3600×1800 JPEG).
- **Upstream file retrieved (repo onboarding):** `BlackMarble_2016_01deg_gray.jpg` from NASA Science assets (`assets.science.nasa.gov`, `imagerecords/144000/144897/` path as published for that product).
- **License / usage:** NASA imagery is generally **U.S. government work** and reusable under the [NASA Media Use Policy](https://www.nasa.gov/nasa-brand-center/images-and-media-use-policy/). Retain attribution in product and docs; do not imply NASA endorsement of the application.

### Processing notes

- Stored **as delivered** (baseline JPEG, single-channel luminance encoded in JPEG grayscale).
- No reprojection applied in-repo: product is already **equirectangular Plate Carrée**, full world, **3600×1800** (exact **2:1** width:height).
- Filename and catalog id remain the durable semantic id `equirect-world-night-lights-viirs-v1` (product is Black Marble 2016–based; not a raw VIIRS L1 swath archive).

### Validation performed (onboarding)

- Raster dimensions **3600×1800** (2:1); **8-bit grayscale** JPEG; file decodes in browser tooling used by the app (`Image` + canvas `getImageData`).
- Statistical spot-check: global mean luminance is very low with a **high upper tail** (urban cores to sensor saturation), consistent with night-lights products — downstream composition uses **log-like sRGB→linear luma** and **policy gains** tuned for this histogram (see `emissiveNightLightsPolicy` and `illuminationShading` emissive additive constants).
- CI regression: `src/renderer/emissiveBlackMarbleOnboardedAsset.test.ts` (Node) parses JPEG SOF for **3600×1800** and locks **SHA-256** of the shipped file; update the expected digest when intentionally replacing the bytes.

### Known limitations

- Single annual composite (2016); no seasonal or diurnal variation in the shipped asset.
- 8-bit JPEG grayscale: not a calibrated linear radiance archive; upstream composition treats decoded sRGB-like bytes as a **bounded display-encoded field** and maps luma through a standard transfer before policy gains (see `emissiveIlluminationRaster` / `emissiveNightLightsPolicy`).
- 1° (~111 km) native sampling: fine urban texture is aggregated; instrument modes scale contribution for readability, not physical resolution.
- Ocean noise and sensor artifacts can appear at very high emissive presentation gains; modes stay intentionally capped upstream.

## equirect-world-legacy-v1

Status: implemented.

Variant mode: static.

Role: stable reference substrate and fallback.

Runtime asset:

```text
public/maps/world-equirectangular.jpg
```

Notes:

- Original packaged world map asset.
- Useful as a dark-friendly stable fallback.

## equirect-world-political-v1

Status: implemented or transitional depending on active catalog flag.

Variant mode: static.

Role: political/reference substrate.

Source family:

- Natural Earth 1:10m vector datasets exported through QGIS.

Known source ingredients:

- `ne_10m_admin_0_countries`
- `ne_10m_admin_0_boundary_lines_land`
- `ne_10m_coastline`

Notes:

- Intended as muted, overlay-friendly political/reference substrate.
- If the asset has been accepted as real, remove transitional placeholder status in the catalog.

## equirect-world-geology-v1

Status: planned, placeholder, or newly onboarded depending on active catalog and asset reality.

Variant mode: static unless catalog says otherwise.

Role: scientific substrate.

Required before treating as validated:

- finalized source.
- license/provenance.
- processing workflow.
- runtime asset.
- preview.
- validation against projection contract.
- catalog metadata update.

Notes:

- Do not treat as sourced and validated until all requirements are met.

## Blue Marble / natural-color families

Known recent family ids:

- `equirect-world-blue-marble-bm-v1`
- `equirect-world-blue-marble-t-v1`
- `equirect-world-blue-marble-tb-v1`

Status: implemented according to recent docs.

Variant mode: static or `monthOfYear` depending on catalog entry.

Role: natural-color or seasonal visual substrates.

Notes:

- Month-aware families resolve concrete month rasters from product time.
- Persist only the family id.
- Keep attribution and source processing notes explicit.
- Ensure all monthly rasters are dimensionally and spatially identical.

## Topography family

Recent docs refer to a real topography family and month-aware topography support, but active family id should be verified against the catalog.

Status: implemented if present in catalog.

Role: terrain/topography substrate.

Notes:

- Verify current id and labels before documenting in release material.
- Ensure legacy aliases, if any, are handled in TypeScript resolver tests rather than user-facing docs.

## Future source candidates

Candidate datasets should be evaluated for redistribution rights, projection suitability, and visual fit.

Possible categories:

- Natural Earth.
- NASA Blue Marble.
- NASA Earth Observatory derivatives.
- NOAA climate normals and weather datasets.
- USGS or global geology datasets.
- GEBCO bathymetry.
- Copernicus land cover.
- VIIRS night lights.
- public domain or suitably licensed scientific rasters.

## Source acceptance checklist

For each map family, record:

- source name.
- license or terms.
- original format.
- source projection.
- export projection.
- export dimensions.
- processing tool and command/workflow.
- runtime output path.
- preview path.
- catalog id.
- attribution text.
- validation date.
- known limitations.
