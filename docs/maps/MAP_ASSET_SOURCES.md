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

Status: catalog entry implemented; shipped raster **transitional** (see `transitionalPlaceholder` in `src/assets/composition/emissive-composition-catalog.json`).

Role: upstream emissive radiance field for planetary illumination composition (not a default base-map selector target).

Registry:

- bundled composition catalog: `src/assets/composition/emissive-composition-catalog.json`
- runtime resolution: `src/config/emissiveCompositionAssetResolve.ts` (`resolveEmissiveCompositionAsset`, canonical id fallback for unknown/blank `assetId`).

Expected contract:

- same equirectangular full-world assumptions as base maps (2:1, north-up, lon −180..180, lat −90..90, no padding).

Runtime asset (intended path once onboarded):

```text
public/maps/composition/equirect-world-night-lights-viirs-v1.jpg
```

Provenance:

- intended VIIRS-style or equivalent night-lights source once licensing, preprocessing, and validation are complete.

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
