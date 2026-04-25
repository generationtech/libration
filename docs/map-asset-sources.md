# Map Asset Sources

**Inventory for the base map selector:** `src/assets/maps/base-map-catalog.json`.

The catalog is bundled at build time. Do not add families only under `public/maps/` without a catalog entry. Runtime does not scan `public/maps` and does not fetch a catalog over HTTP.

Use `npm run maps:prep` for new curated map families. For source TIFF sets, prefer:

```bash
npm run maps:prep -- \
  --variant-mode monthOfYear \
  --family-id <family-id> \
  --source-dir <source-dir> \
  --label <label> \
  --category <category> \
  --attribution <attribution> \
  --update-catalog
```

The tool creates runtime assets and preview thumbnails, then adds or replaces the matching catalog entry when `--update-catalog` is used. Review the resulting git diff.

---

## Current catalog inventory

As of the current catalog, the base-map inventory is:

- `equirect-world-legacy-v1`
- `equirect-world-political-v1`
- `equirect-world-geology-v1`
- `equirect-world-blue-marble-bm-v1`
- `equirect-world-blue-marble-t-v1`
- `equirect-world-blue-marble-tb-v1`

The currently configured default is:

```text
equirect-world-legacy-v1
```

---

## equirect-world-legacy-v1

- Variant mode: static
- Label: World (legacy, shaded)
- Category: reference
- Runtime asset: `public/maps/world-equirectangular.jpg`
- Source family: original Libration packaged world map asset.
- Notes: This is the current default equirectangular reference basemap. It remains useful as a dark-friendly, stable fallback substrate.

---

## equirect-world-political-v1

- Variant mode: static
- Label: World political
- Category: political
- Catalog state: currently marked `transitionalPlaceholder: true`.
- Runtime asset: `public/maps/world-equirectangular-political.jpg`
- Preview: `public/maps/previews/world-equirectangular-political-thumb.jpg`
- Source family: Natural Earth 1:10m vector datasets exported through QGIS.
- Source ingredients:
  - `ne_10m_admin_0_countries`
  - `ne_10m_admin_0_boundary_lines_land`
  - `ne_10m_coastline`
- Notes: Generated as an overlay-friendly political/reference substrate: muted ocean, calm land fill, restrained borders, stronger coastline, no labels, full-world equirectangular export. If the catalog entry is still marked transitional after this asset is accepted as real, remove `transitionalPlaceholder` in the catalog.

---

## equirect-world-geology-v1

- Variant mode: static
- Label: World geology
- Category: scientific
- Catalog state: `transitionalPlaceholder: true`.
- Runtime asset path in catalog: `public/maps/world-equirectangular-geology.jpg`
- Source family: not yet finalized.
- Notes: This is currently a planned/placeholder family. Do not treat it as a sourced, validated geology map until the source, processing workflow, runtime asset, preview, and provenance are completed.

---

## equirect-world-blue-marble-bm-v1

- Variant mode: monthOfYear
- Label: Blue Marble - BM
- Category: terrain
- Attribution: NASA Blue Marble Next Generation
- Family runtime directory: `public/maps/variants/equirect-world-blue-marble-bm-v1/`
- Files:
  - `base.jpg`
  - `01.jpg` … `12.jpg`
- Preview: `public/maps/previews/equirect-world-blue-marble-bm-v1-thumb.jpg`
- Source family: NASA Blue Marble Next Generation — Base Map.
- Notes: Natural-color Earth imagery with seasonal surface variation. This is the base Blue Marble visual composition without the additional topography/bathymetry emphasis used by the other onboarded Blue Marble variants.

---

## equirect-world-blue-marble-t-v1

- Variant mode: monthOfYear
- Label: Blue Marble - T
- Category: terrain
- Attribution: NASA Blue Marble Next Generation
- Family runtime directory: `public/maps/variants/equirect-world-blue-marble-t-v1/`
- Files:
  - `base.jpg`
  - `01.jpg` … `12.jpg`
- Preview: `public/maps/previews/equirect-world-blue-marble-t-v1-thumb.jpg`
- Source family: NASA Blue Marble Next Generation — Base Map with Topography.
- Notes: Natural-color Earth imagery with seasonal surface variation and topographic visual emphasis.

---

## equirect-world-blue-marble-tb-v1

- Variant mode: monthOfYear
- Label: Blue Marble - TB
- Category: terrain
- Attribution: NASA Blue Marble Next Generation
- Family runtime directory: `public/maps/variants/equirect-world-blue-marble-tb-v1/`
- Files:
  - `base.jpg`
  - `01.jpg` … `12.jpg`
- Preview: `public/maps/previews/equirect-world-blue-marble-tb-v1-thumb.jpg`
- Source family: NASA Blue Marble Next Generation — Base Map with Topography and Bathymetry.
- Notes: Natural-color Earth imagery with seasonal surface variation, topographic emphasis, and bathymetric ocean-floor emphasis.

---

## Month-aware family behavior

Month-aware families are catalog-declared through `variantMode: "monthOfYear"`.

For each month-aware family:

- `src` points to the family fallback file: `public/maps/variants/<family-id>/base.jpg`.
- `monthOfYear.familyBaseSrc` points to the same fallback file.
- `monthOfYear.monthAssetSrcs` lists `01.jpg` through `12.jpg` paths.
- `monthOfYear.onboardedMonths` must list only months that are actually present in the family runtime directory.

Runtime resolution uses product UTC month:

1. Try the current product month.
2. Walk backward month-by-month.
3. Wrap naturally across the year boundary.
4. Use the first onboarded month found.
5. Fall back to `base.jpg`.
6. Fall back to optional legacy static source if configured.
7. Fall back to the global default base map.

There is no runtime filesystem probe. The catalog is the declaration of what the app expects to exist.

---

## Base map failure fallback behavior

Month-aware families are catalog-declared, but runtime may encounter missing files in local/dev/build outputs.

- Base-map raster payloads opt into image-load failure reporting.
- Failed concrete URLs are recorded and excluded from later base-map resolution.
- Month-aware families then continue the normal fallback chain: current month → prior onboarded month with year rollover → family base → optional legacy static source → global default.
- The backend reports failed concrete URLs only; fallback policy remains upstream in base-map asset resolution.

---

## Catalog edit guidance

Safe curation edits include:

- `label`
- `shortDescription`
- `category`
- `attribution`
- `previewThumbnailSrc`
- `defaultPresentation`
- `capabilities`
- `recommendedRoles`

Be careful editing:

- `id` — this is the persisted semantic key. Renaming it orphans existing config/preset references unless alias/migration support is added.
- `src`, `monthOfYear.familyBaseSrc`, `monthOfYear.monthAssetSrcs`, and `onboardedMonths` — these must match shipped files.
- `transitionalPlaceholder` — only keep this for families that should still be treated as provisional in the selector/product catalog.

The `id` should be treated like a durable semantic asset identifier, not a display name. Use `label` for user-facing naming.

---

## Notes on removed/stale entries

Older documentation may refer to:

- `equirect-world-topography-v1`
- `equirect-world-blue-marble-v1`

Those ids are not present in the current catalog snapshot provided here. The currently cataloged Blue Marble families are:

- `equirect-world-blue-marble-bm-v1`
- `equirect-world-blue-marble-t-v1`
- `equirect-world-blue-marble-tb-v1`

Keep future documentation aligned with `src/assets/maps/base-map-catalog.json` as the source of inventory truth.
