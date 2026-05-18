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
- Keep selector attribution accurate: each family may set `attribution`, optional `licenseNote`, and up to two `sourceLinks` (`label` + http(s) `href`); the Layers map selector shows them in the **Source & license** block (`BaseMapStyleControl`). These fields are catalog-only and are not persisted in SceneConfig.

## Base-map `capabilities`: overlay readability (upstream)

Optional keys on base-map catalog entries influence **upstream** overlay lift scaling (`substrateOverlayReadabilityLiftScale01` on `OverlayReadabilityFrame`, derived in the shell from effective presentation + catalog row—see `src/core/substrateOverlayReadabilityLiftScale.ts`). **No raster sampling**; curators assign hints from substrate class.

**Intrinsic lift attenuation** (small bounded penalties at neutral presentation; combinable up to a fixed cap in code):

- `reliefShaded` — hypsometric / hillshade-style relief reads as strong local contrast.
- `boundaryDense` — dense linework (boundaries, scientific overlays).
- `chromaticDense` — strong thematic or false-color hue bands (e.g. geology, political fills).
- `bathymetryShaded` — shaded / hypsometric ocean-floor (bathymetry) reads as strong local contrast (often with land relief; e.g. Blue Marble **TB** family in the bundled catalog).
- `fineScaleTexture` — fine-scale photographic or sensor texture (clouds, land-cover grain) competes with thin vector overlays; distinct from relief hypsometry, dense linework, thematic hue bands, or bathymetry shading alone. Bundled catalog sets this on Blue Marble **BM** and **T** seasonal families.
- `sunGlintDense` — dense sun glint on open water in true-color / natural-color imagery reads as high-contrast specular sparkle competing with thin vector overlays; distinct from `bathymetryShaded` ocean-floor relief and from `fineScaleTexture` land/cloud micro-texture alone. Bundled catalog sets this on Blue Marble **BM** and **T** alongside `fineScaleTexture`.
- `labelDense` — dense cartographic typography (place names, formation labels) competes with overlay annotation and fine grid ticks; distinct from `boundaryDense` linework alone. Bundled catalog sets this on **`equirect-world-political-v1`** and **`equirect-world-geology-v1`**.
- `etchedReliefDense` — directional etched / scribed shaded relief competes with thin vector overlays. Bundled catalog sets this on **`equirect-world-legacy-v1`** (see legacy family section below).

**Presentation-penalty multipliers** (not separate intrinsic flags): `overlayOptimized`, `darkFriendly`.

When onboarding a family, align flags with visual intent and note significant choices in this document or [MAP_ASSET_STRATEGY.md](MAP_ASSET_STRATEGY.md).

## Current inventory to verify against catalog

The current active catalog should be treated as source of truth. Known family ids from recent documentation include:

- `equirect-world-legacy-v1`
- `equirect-world-political-v1`
- `equirect-world-geology-v1`
- `equirect-world-topography-ne-v1`
- `equirect-world-bathymetry-etopo-v1`
- `equirect-world-landcover-modis-v1`
- `equirect-world-blue-marble-bm-v1`
- `equirect-world-blue-marble-t-v1`
- `equirect-world-blue-marble-tb-v1`

If the catalog differs, update this document to match the catalog.

## equirect-world-night-lights-viirs-v1 (composition input)

Status: **implemented** — **onboarded** ship raster under `public/maps/composition/`; **validated** projection contract and decode path; **CI regression** locks JPEG SOF dimensions (**3600×1800**) and **SHA-256** of committed bytes; upstream **perceptual luma driver** via scene `presentation.driverExponent` (see processing notes below). `transitionalPlaceholder` is `false` in `src/assets/composition/emissive-composition-catalog.json`.

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
- Statistical spot-check: global mean luminance is very low with a **high upper tail** (urban cores to sensor saturation), consistent with night-lights products — downstream composition uses **sRGB-linear luma** then a bounded **perceptual lift** (`pow` with scene `presentation.driverExponent`, default aligned with `EMISSIVE_JPEG_LUMA_TO_COMPOSITION_DRIVER_EXPONENT` in `emissiveIlluminationRaster.ts`) so 8-bit JPEG mid-tones remain visible after policy gains; see `illuminationShading` emissive additive scale and `scene.illumination.emissiveNightLights.presentation`. CI decodes the same bytes with `jpeg-js` in `emissiveBlackMarbleDecodeAndSampling.integration.test.ts` (city vs ocean radiance and `sampleIlluminationRgba8` RGB delta).
- Non-emissive twilight and day/night sampling are **not** separate map products; constants-only tuning accrues in `illuminationShading.ts` (see `PLAN.md` / `ARCHITECTURE.md`).
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

Preview thumbnail:

```text
public/maps/previews/world-equirectangular-thumb.jpg
```

Notes:

- Original packaged world map asset.
- Useful as a dark-friendly stable fallback.
- Bundled catalog **`attribution`:** “Libration packaged reference map”; **`licenseNote`** documents that this is the original shaded-relief basemap shipped with Libration (not third-party licensed imagery).
- Bundled catalog sets **`capabilities.etchedReliefDense`** (with **`darkFriendly`**) for upstream overlay-readability lift—curator signal for directional etched / scribed shaded relief competing with thin vector overlays.
- Bundled catalog sets **`previewThumbnailSrc`** (800×400 JPEG thumb derived from the committed main raster).

## equirect-world-political-v1

Status: **implemented** — static full-world equirectangular raster in the bundled catalog; **`transitionalPlaceholder` is not set** (treated as a shipped substrate family).

Variant mode: static.

Role: political/reference substrate.

Runtime asset:

```text
public/maps/world-equirectangular-political.jpg
```

Preview thumbnail:

```text
public/maps/previews/world-equirectangular-political-thumb.jpg
```

Source family:

- Natural Earth 1:10m vector datasets exported through QGIS.

Known source ingredients:

- `ne_10m_admin_0_countries`
- `ne_10m_admin_0_boundary_lines_land`
- `ne_10m_coastline`

### Provenance and license

- **Source lineage:** [Natural Earth](https://www.naturalearthdata.com/) 1:10m-scale geographic data (raster or vector derivatives), exported for Libration as a single global Plate Carrée JPEG (same pipeline class as `equirect-world-topography-ne-v1`).
- **License / usage:** Natural Earth cartographic data are **public domain**; retain “Natural Earth” attribution in product and docs per their credit guidance.

### Processing notes

- Full-world equirectangular, **north-up**, **5400×2700** JPEG (**2:1** width:height), **RGB**.
- No reprojection applied in-repo beyond export to the world extent contract (lon −180..180, lat −90..90, no padding).

### Catalog notes

- Intended as muted, overlay-friendly political/reference substrate.
- Bundled catalog sets **`capabilities.labelDense`** (with **`chromaticDense`**) for upstream overlay-readability lift—curator signal for dense place-name / country-label typography.

## equirect-world-bathymetry-etopo-v1

Status: **implemented** — static full-world equirectangular raster in the bundled catalog; not transitional.

Variant mode: static.

Role: scientific bathymetry / global relief substrate (ocean-floor depth and land elevation hypsometry).

Runtime asset:

```text
public/maps/world-equirectangular-bathymetry.jpg
```

Preview thumbnail:

```text
public/maps/previews/world-equirectangular-bathymetry-thumb.jpg
```

### Provenance and license

- **Source lineage:** [NOAA NCEI ETOPO 2022](https://www.ncei.noaa.gov/products/etopo-global-relief-model) 15 arc-second global relief model (ice-surface elevation), subset via NOAA ERDDAP (`ETOPO_2022_v1_15s`) and hypsometric styling in-repo.
- **License / usage:** U.S. Government work (public domain). **Not for navigation or safety-at-sea.** Retain NOAA/NCEI attribution; do not imply NOAA endorsement of the application.

### Processing notes

- ERDDAP decimated global grid (`z[0:16:43199][0:16:86399]`) from NOAA `ETOPO_2022_v1_15s` (longitude **0..360°** in the NetCDF).
- `gdal_translate -b 1` → GeoTIFF; assign **`EPSG:4326`** with **`-a_ullr 0 90 360 -90`** (explicit 0..360° east).
- **Dateline roll to Libration contract:** swap raster halves so **−180°** is the left edge and **+180°** the right (`out[:, 0:W/2] = in[:, W/2:W]`, `out[:, W/2:W] = in[:, 0:W/2]`); write GeoTIFF with geotransform origin **(−180, 90)**. (A naive `gdalwarp -te -180 90 180 -90` on 0..360° source alone left the western hemisphere nodata/gray in the shipped JPEG—do not skip the roll.)
- `gdaldem color-relief` with restrained bathymetric blue ramp → **5400×2700** RGB JPEG (**2:1**), **north-up**, lon −180..180, lat −90..90.
- Restrained bathymetric blue ramp for ocean depths; muted land tones for elevation context (distinct from month-aware Blue Marble **TB** natural-color + bathymetry).
- Preview thumbnail **800×400** from the ship JPEG (same pattern as other static families).
- Regression: [`src/config/bathymetryOnboardedAsset.test.ts`](../../src/config/bathymetryOnboardedAsset.test.ts) (SOF geometry, SHA-256, decoded west-Pacific hypsometry heuristic).

### Validation performed (onboarding)

- Raster dimensions **5400×2700** (2:1); **8-bit sRGB** JPEG.

### Catalog notes

- Bundled catalog sets **`capabilities.bathymetryShaded`** and **`capabilities.reliefShaded`** for upstream overlay-readability lift—curator signals for shaded ocean-floor relief and land hypsometry competing with thin vector overlays (see `substrateOverlayReadabilityLiftScale.ts`); no runtime raster sampling.

## equirect-world-landcover-modis-v1

Status: **implemented** — static full-world equirectangular raster in the bundled catalog; not transitional.

Variant mode: static.

Role: scientific substrate (global land cover / vegetation classification).

Runtime asset:

```text
public/maps/world-equirectangular-landcover.jpg
```

Preview thumbnail:

```text
public/maps/previews/world-equirectangular-landcover-thumb.jpg
```

### Provenance and license

- **Source lineage:** [NASA GIBS](https://gibs.earthdata.nasa.gov/) `MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual` (MODIS/Terra+Aqua IGBP land cover type, annual composite), **2019-01-01** epoch, exported at **5400×2700** via WMS GetMap (EPSG:4326, BBOX −180…+180°, −90…+90°).
- **Product reference:** [MODIS Land Cover Type Yearly L3 Global 0.05Deg CMG (MCD12C1)](https://lpdaac.usgs.gov/products/mcd12c1v061/) (upstream science product family).
- **License / usage:** NASA imagery is generally **U.S. government work** and reusable under the [NASA Media Use Policy](https://www.nasa.gov/nasa-brand-center/images-and-media-use-policy/). Retain NASA attribution in product and docs; do not imply NASA endorsement of the application.

### Processing notes

- GIBS WMS GetMap PNG (RGBA) flattened to **8-bit sRGB JPEG** at quality 92; **5400×2700** (**2:1**), **north-up**, lon −180..+180, lat −90..+90 (full world extent).
- Preview thumbnail **800×400** from the ship JPEG (same pattern as other static families).
- Regression: [`src/config/landcoverOnboardedAsset.test.ts`](../../src/config/landcoverOnboardedAsset.test.ts) (SOF geometry, SHA-256, decoded Amazon / Sahara / Pacific color heuristics).

### Validation performed (onboarding)

- Raster dimensions **5400×2700** (2:1); **8-bit sRGB** JPEG.

### Catalog notes

- Bundled catalog sets **`capabilities.chromaticDense`** and **`capabilities.fineScaleTexture`** for upstream overlay-readability lift—curator signals for IGBP thematic class colors and class-boundary grain competing with thin vector overlays (see `substrateOverlayReadabilityLiftScale.ts`); no runtime raster sampling.

### Future refinements (same family)

- Higher-resolution Copernicus Global Land Cover 100m discrete map when curated with dateline-roll provenance (see queue **A** climate/vegetation notes in `PLAN.md`).
- Alternate MODIS epochs or legend styles if product-scoped.

## equirect-world-geology-v1

Status: **implemented** — static full-world equirectangular raster in the bundled catalog; not transitional.

Variant mode: static.

Role: scientific substrate (geologic provinces / plate-boundary context).

Runtime asset:

```text
public/maps/world-equirectangular-geology.jpg
```

Preview thumbnail:

```text
public/maps/previews/world-equirectangular-geology-thumb.jpg
```

### Provenance and license

- **Source lineage:** USGS global crust / geologic provinces reference graphic, mirrored for onboarding from Wikimedia Commons [**File:World geologic provinces.jpg**](https://commons.wikimedia.org/wiki/File:World_geologic_provinces.jpg) (credit links on that file page point to archived USGS `earthquake.usgs.gov/data/crust/maps.php` material).
- **License / usage:** **Public domain** (US government work) per Commons metadata; retain “USGS” attribution in product and docs.

### Processing notes

- Upstream Commons JPEG was **1200×637** sRGB; resampled in-repo with ImageMagick to full-world Plate Carrée contract **5400×2700** (**2:1** width:height), **RGB**, **north-up**, center-crop extent to the world contract (lon −180..180, lat −90..90, no padding).
- Preview thumbnail **800×400** from the ship JPEG (same pattern as other static families).

### Validation performed (onboarding)

- Raster dimensions **5400×2700** (2:1); **8-bit sRGB** JPEG; matches other shipped static world substrates (`world-equirectangular-political.jpg`, `world-equirectangular-topography.jpg`).

### Catalog notes

- Bundled catalog sets **`capabilities.boundaryDense`**, **`chromaticDense`**, and **`labelDense`** for upstream overlay-readability lift—curator signals for dense scientific linework, thematic hue bands, and formation / province labels (see `substrateOverlayReadabilityLiftScale.ts`); no runtime raster sampling.

### Future refinements (same family)

- Higher-resolution or alternate USGS/CGMW geology source if curated later (current ship asset is upscaled from a ~1200px-wide public-domain reference).

## Blue Marble / natural-color families

Known recent family ids:

- `equirect-world-blue-marble-bm-v1`
- `equirect-world-blue-marble-t-v1`
- `equirect-world-blue-marble-tb-v1`

Status: implemented according to recent docs.

Variant mode: static or `monthOfYear` depending on catalog entry.

Role: natural-color or seasonal visual substrates.

Notes:

- Month-aware families resolve concrete month rasters from product time (UTC civil month via `baseMapMonthResolve` / `baseMapAssetResolve`; same instant as the render clock).
- Persist only the family id (no stored month in SceneConfig).
- **Layers map selector (shipped):** when a month-aware family is selected, `BaseMapStyleControl` shows catalog `shortDescription` plus an active month line (`Displaying: <month> (UTC civil month N)`) driven by render-clock `productInstantMs` while the config panel is open—display-only; does not change resolution policy.
- Keep attribution and source processing notes explicit.
- Ensure all monthly rasters are dimensionally and spatially identical.
- **`equirect-world-blue-marble-bm-v1`** / **`equirect-world-blue-marble-t-v1`:** bundled catalog sets **`capabilities.fineScaleTexture`** and **`capabilities.sunGlintDense`** for upstream overlay-readability lift—curator signals for fine-scale natural-color texture and dense open-ocean sun glint; no runtime raster sampling.
- **`equirect-world-blue-marble-tb-v1`:** bundled catalog sets **`capabilities.bathymetryShaded`** (with **`reliefShaded`**) for upstream overlay-readability lift—curator signal for shaded bathymetry; no runtime raster sampling (see overlay-readability `capabilities` section above).

## equirect-world-topography-ne-v1

Status: **implemented** — static full-world equirectangular raster in the bundled catalog; not transitional.

Variant mode: static.

Role: terrain / shaded relief substrate (land elevation emphasis).

Runtime asset:

```text
public/maps/world-equirectangular-topography.jpg
```

Preview thumbnail:

```text
public/maps/previews/world-equirectangular-topography-thumb.jpg
```

### Provenance and license

- **Source lineage:** [Natural Earth](https://www.naturalearthdata.com/) 1:10m-scale geographic data (raster or vector derivatives), exported for Libration as a single global Plate Carrée JPEG (same pipeline class as `equirect-world-political-v1`).
- **License / usage:** Natural Earth cartographic data are **public domain**; retain “Natural Earth” attribution in product and docs per their credit guidance.

### Processing notes

- Full-world equirectangular, **north-up**, **5400×2700** JPEG (**2:1** width:height), **RGB** (hypsometric-style relief coloring).
- No reprojection applied in-repo beyond export to the world extent contract (lon −180..180, lat −90..90, no padding).
- Preview thumbnail **800×400** from the ship JPEG (same pattern as other static families).

### Catalog notes

- Bundled catalog sets **`capabilities.reliefShaded`** for upstream overlay-readability lift—curator signal for strong local relief contrast competing with thin vector overlays (see `substrateOverlayReadabilityLiftScale.ts`); no runtime raster sampling.
- Bundled catalog sets **`previewThumbnailSrc`** for the map selector (same pattern as political and geology static families).

### Legacy ids (resolver aliases)

Historical scene ids **`equirect-world-topography-v1`** and **`equirect-world-topo-v1`** still **alias to** the month-aware Blue Marble topography family **`equirect-world-blue-marble-t-v1`** for backward compatibility. They are **not** aliases for this static Natural Earth–lineage family. New scenes should persist **`equirect-world-topography-ne-v1`** when selecting this raster.

## Future source candidates

Candidate datasets should be evaluated for redistribution rights, projection suitability, and visual fit.

**Queue A (2) preferred onboarding order** (when raster + rights exist): **vegetation/land cover** (**shipped:** **`equirect-world-landcover-modis-v1`** with GIBS/MODIS IGBP provenance and `landcoverOnboardedAsset.test.ts`), then **climate normals** (bathymetry **shipped:** **`equirect-world-bathymetry-etopo-v1`**) — see `PLAN.md` handoff and workflow there. Live or forecast weather/cloud participation is **not** base-map onboarding; see [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md).

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
