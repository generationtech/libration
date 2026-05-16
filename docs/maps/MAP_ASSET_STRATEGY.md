# Map Asset Strategy

## Purpose

This document defines how Libration chooses, validates, onboards, and maintains map assets.

Map assets are not decorative backgrounds. They are geospatial substrates that must align with projection-space scene content.

## Core rule

Projection defines spatial truth.

Map assets must conform to the projection contract. Overlays must not be warped to fit an incorrect map.

## Current runtime assumptions

Current supported map asset contract:

- equirectangular / Plate Carree.
- full-world extent.
- north-up.
- 2:1 aspect ratio.
- no padding.
- no borders.
- continuous dateline seam.
- longitude range from -180 to 180.
- latitude range from -90 to 90.

Future projections may be added later, but current onboarding must remain equirectangular unless the projection system is intentionally expanded.

## Base-map catalog

Authoritative base-map inventory lives in:

```text
src/assets/maps/base-map-catalog.json
```

The catalog owns:

- family ids.
- labels.
- categories.
- runtime paths.
- preview paths.
- attribution.
- variant mode.
- onboarded months.
- default presentation.
- capabilities (including optional **overlay-readability** hints such as `reliefShaded`, `boundaryDense`, `chromaticDense`, `bathymetryShaded`, `fineScaleTexture`, `labelDense`, `etchedReliefDense`, and `sunGlintDense`, alongside `overlayOptimized` and `darkFriendly`, for upstream overlay lift scaling without raster sampling).
- recommended roles.
- placeholder or transitional status where applicable.

TypeScript owns:

- validation.
- alias handling (for example legacy **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** → Blue Marble **T**; distinct catalog family **`equirect-world-topography-ne-v1`** for the static Natural Earth–lineage topography raster—see `docs/maps/MAP_ASSET_SOURCES.md`).
- fallback semantics.
- month-aware resolution.
- presentation merging.
- resolver APIs.

Runtime does not scan `public/maps`.

## Planetary composition inputs (non-base-map rasters)

Some rasters are **composition inputs**: they inform upstream planetary illumination and tone (for example emissive night-light radiance fields), not the geographic substrate selected as `scene.baseMap.id`.

Rules (aligned with base maps):

- persist **durable semantic family ids** only (no concrete month paths or ad hoc URLs in config).
- satisfy the same equirectangular world contract as base maps until projection support expands.
- resolve through a **bundled catalog** (`src/assets/composition/emissive-composition-catalog.json` for emissive inputs), not runtime directory scans.
- non-emissive twilight and day/night sampling are upstream **constants-only** tuning in `illuminationShading.ts` (cumulative narrow passes; see `PLAN.md`), not additional catalog rasters.

Emissive night-light families are **not** exposed as selectable base maps; they are sampled inside the planetary illumination pipeline and emitted through the same single illumination `rasterPatch` contract as solar and lunar composition. The first validated ship asset is **NASA Black Marble 2016** (1° grayscale JPEG) at `public/maps/composition/equirect-world-night-lights-viirs-v1.jpg`, documented under `docs/maps/MAP_ASSET_SOURCES.md`.

Authoritative **emissive composition** inventory (family ids and resolver-owned `src` paths) lives in:

```text
src/assets/composition/emissive-composition-catalog.json
```

TypeScript owns validation, id canonicalization, and `resolveEmissiveCompositionAsset` / `resolveEmissiveCompositionAssetIdToCanonicalId`. Runtime does not scan `public/maps` for composition inputs.

## Persistence rule

Persist the selected family id:

```ts
scene.baseMap.id
```

Do not persist concrete raster paths, including month-specific paths.

Per-family presentation overrides should be keyed by family id:

```ts
scene.baseMap.presentationByMapId[scene.baseMap.id]
```

## Variant modes

Current variant modes:

```ts
type BaseMapVariantMode = "static" | "monthOfYear"
```

### Static families

A static family resolves to one concrete raster.

### Month-aware families

A month-aware family stores one selected family id in config but resolves a concrete monthly raster from product time.

Rules:

- monthly rasters live under `public/maps/variants/<family-id>/`.
- monthly files use `01.jpg` through `12.jpg`.
- `base.jpg` is the family fallback.
- all monthly rasters must share projection, extent, dimensions, and alignment.
- missing month fallback walks backward by calendar month.
- backend image failure may exclude a concrete URL, but resolver owns fallback choice.

## Onboarding workflow

Use the map prep tool for curated source TIFF sets:

```bash
npm run maps:prep --   --variant-mode monthOfYear   --family-id <family-id>   --source-dir <source-dir>   --label <label>   --category <category>   --attribution <attribution>   --update-catalog
```

Review the resulting git diff.

Do not hand-add files under `public/maps` without a catalog entry.

## Source standards

Prefer sources that are:

- public or permissibly redistributable.
- authoritative.
- well documented.
- projection-aware.
- high enough resolution for product use.
- stable enough to cite.
- compatible with AGPL distribution.

For each sourced family, retain:

- source name.
- source URL or dataset name.
- license or usage terms.
- processing workflow.
- projection/export settings.
- validation notes.
- known limitations.

## Validation checklist

Before accepting a map family:

- aspect ratio is exactly 2:1.
- full world extent is present.
- no border or padding.
- north is up.
- equator is centered.
- prime meridian is centered.
- poles map to top and bottom edges.
- known cities align.
- coastlines align against a trusted reference.
- all monthly variants share identical dimensions and alignment.
- preview exists.
- attribution exists.
- catalog metadata is correct.

## Map family naming

Family ids should be durable semantic identifiers.

Change labels freely during curation. Rename ids only when intentionally breaking persisted references or when family lineage changes.

Recommended id pattern:

```text
equirect-world-<family>-<variant>-v1
```

Examples:

```text
equirect-world-legacy-v1
equirect-world-political-v1
equirect-world-topography-ne-v1
equirect-world-geology-v1
equirect-world-blue-marble-bm-v1
```

## Future map directions

Candidate future families (beyond shipped static topography **`equirect-world-topography-ne-v1`**, political **`equirect-world-political-v1`**, geology **`equirect-world-geology-v1`**, Blue Marble month-aware families, and legacy reference **`equirect-world-legacy-v1`** with bundled preview):
- bathymetry.
- climate.
- vegetation.
- population.
- night lights.
- high-contrast accessibility.
- paper/neutral styling.
- dark-friendly overlays.
- ocean current substrates.

Each should be treated as a curated geospatial product, not just an image.
