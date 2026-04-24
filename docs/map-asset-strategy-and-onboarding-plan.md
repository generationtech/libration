# Libration — Map Asset Strategy & Onboarding Plan

## Purpose

This document defines the product strategy, onboarding process, sourcing philosophy, validation expectations, and future architectural direction for map assets within Libration.

It exists to ensure:

* map onboarding remains disciplined and geometrically correct
* overlays remain spatially aligned and trustworthy
* future projections and scene systems remain possible
* future contributors and future chat sessions understand the intended direction
* map assets are treated as structured geospatial substrates rather than arbitrary images

This document complements:

* SceneConfig specification
* Projection System specification
* Map Asset Contract
* Scene System specification
* Layer Composition Rules

---

# 1. Product Philosophy

Libration does not treat maps as decorative background images.

Maps are:

* geospatial substrates
* projection-constrained assets
* compositional participants
* scientifically aligned reference surfaces

All overlays, markers, astronomical products, and future dynamic systems depend on the geometric correctness of the underlying map substrate.

Therefore:

> Map correctness is foundational infrastructure.

---

# 2. Core Architectural Principles

## 2.1 Projection Defines Spatial Truth

Projection math is authoritative.

Map assets must conform to the active projection contract.

Overlays must never be warped to fit an incorrect map asset.

Current runtime assumptions:

* equirectangular / Plate Carrée
* full-world extent
* north-up
* no padding or borders
* continuous dateline seam

Future projections may introduce:

* Mercator
* Robinson
* Winkel Tripel
* Orthographic globe
* Perspective globe

But current onboarding remains strictly equirectangular.

---

## 2.2 SceneConfig Is Authoritative

Base map selection must flow through:

* `scene.baseMap.id`
* `scene.baseMap.visible`
* `scene.baseMap.opacity`

Map selection must never bypass SceneConfig.

---

## 2.3 Base Maps Are Substrate

Base maps provide spatial and visual context.

They are not:

* positional truth
* overlay geometry
* dynamic data systems

Overlay geometry is always derived independently from geographic/projection math.

---

## 2.4 Composition Is Centralized

Map assets participate in scene composition.

They should not own:

* overlay policy
* lifecycle logic
* projection logic
* rendering backend behavior

Composition remains a scene-level responsibility.

---

# 3. Map Families

Libration should evolve toward curated map families rather than a random collection of unrelated assets.

---

## 3.0 Month-aware base map families (registry + resolver)

Some families ship **month-of-year** rasters (e.g. seasonal imagery). This is **explicit** in the base-map registry (`variantMode: "monthOfYear"`), not inferred from filenames at runtime.

* **Persistence** stays `scene.baseMap.id` only (one selector row per family). No month-specific paths are stored.
* **Runtime** resolves the concrete URL from the **effective product instant** (`TimeContext.now`, UTC civil month 1–12), via `resolveEquirectBaseMapImageSrc(id, { productInstantMs })` and the base map layer’s per-frame `getState`.
* **On-disk layout** (example `equirect-world-topography-v1`):

  * `public/maps/variants/<family-id>/base.jpg` — family default when no monthly asset applies.
  * `public/maps/variants/<family-id>/01.jpg` … `12.jpg` — explicit month rasters (paths listed in the registry).
* **Missing month**: try the current UTC month first, then walk **backward** month-by-month with natural year wrap (January → December). The first **onboarded** month in that order wins. Registry field `onboardedMonths` lists which of 1–12 are actually shipped (must match static files; **not** a runtime probe). A **non-empty** list is required for **partial** onboarding. **Omitting** `onboardedMonths` means the contract is “all twelve `01`…`12` files are present” (resolver treats 1…12 as onboarded); in production, listing `1…12` explicitly is recommended for clarity. An **empty** `[]` means no monthly rasters — use `base.jpg` only.
* **Further fallback**: if variant resolution yields nothing usable, the family’s legacy flat `src` URL is used, then the global default base map.

Future work: a **fixed-month override** (e.g. always show July for comparisons) would be a separate SceneConfig or product-setting extension; it is intentionally out of scope here.

---


## 3.0.1 Runtime image-load failure fallback

Registry metadata is the static contract, but deployed files may still be absent during development, packaging, or manual testing.

For base-map rasters, Libration supports narrow runtime failure recovery:

- base-map raster payloads may opt into load-failure reporting
- the backend reports failed concrete image URLs without choosing product fallback behavior
- base-map asset resolution records failed URLs and excludes them from later choices
- month-aware families continue calendar lookback while skipping known-failed URLs
- fallback then proceeds to family `base.jpg`, the family legacy/static `src`, and finally the global default map

This is not a general lifecycle/data-feed system. It is static asset resilience for base maps only.


---

## 3.1 Reference Maps

Purpose:

* general use
* readable default substrate
* low visual noise
* compatible with many overlays

Examples:

* Classic World
* Political
* Coastline emphasis
* Ocean emphasis
* Minimal monochrome

Design priorities:

* readability
* compositional neutrality
* stable contrast
* overlay friendliness

---

## 3.2 Terrain / Physical Maps

Purpose:

* landform context
* weather interpretation
* aviation / geographic context

Examples:

* topography
* relief shading
* bathymetry
* physical geography

Design priorities:

* terrain legibility
* balanced contrast
* preserved coastline clarity

---

## 3.3 Scientific / Thematic Maps

Purpose:

* analytical/scientific use
* domain-specific interpretation

Examples:

* geology
* tectonic emphasis
* biome/ecoregion maps
* climate normals

Design priorities:

* semantic honesty
* thematic clarity
* scientific usefulness

---

## 3.4 Dark / Operations Maps

Purpose:

* overlay-heavy operation modes
* night viewing
* emissive overlay compatibility

Examples:

* dark monochrome
* low-distraction night map
* high-contrast operations substrate

Design priorities:

* overlay readability
* reduced visual clutter
* support for emissive systems

---

# 4. Initial Curated Map Set

The first onboarding wave should remain intentionally small.

The goal is validating the pipeline and architecture, not maximizing catalog size.

---

## 4.1 Classic World

ID:

`equirect-world-legacy-v1`

Role:

* compatibility/default reference map

Status:

* existing bundled asset

Category:

* reference

---

## 4.2 Political

ID:

`equirect-world-political-v1`

Role:

* country/border-oriented reference map

Category:

* political

Initial status:

* real generated political cartography asset onboarded from Natural Earth + QGIS export

---

## 4.3 Topography

ID:

`equirect-world-topography-v1`

Role:

* terrain and relief interpretation

Category:

* terrain

Initial status:

* real NASA Blue Marble month-aware topography/bathymetry family onboarded

---

## 4.4 Geology

ID:

`equirect-world-geology-v1`

Role:

* scientific/thematic substrate

Category:

* scientific

Initial status:

* transitional placeholder until real asset sourced

---

# 5. Recommended Onboarding Sequence

The onboarding sequence should prioritize:

* immediate product value
* validation of onboarding pipeline
* visual distinction between maps
* low architectural risk

---

## Phase A — Political

Reason:

* easiest visual validation
* broad usefulness
* immediately recognizable

---

## Phase B — Topography

Reason:

* validates physical/terrain substrate workflows
* useful for future weather and aviation overlays

---

## Phase C — Geology

Reason:

* validates scientific/thematic family onboarding
* more specialized visual semantics

---

# 6. Candidate Source Strategy

## 6.1 Preferred Source Characteristics

Preferred assets should be:

* scientifically or cartographically reputable
* projection-aware or reprojectable
* legally distributable
* visually clean at full-world scale
* suitable for static packaging

---

## 6.2 Recommended Source Families

Examples of likely-good source families:

### Political / Reference

* Natural Earth
* public-domain GIS exports
* simplified global boundary datasets

---

### Terrain / Physical

* NASA Blue Marble
* NOAA raster products
* relief-shaded GIS exports

---

### Scientific / Geology

* USGS-derived geology exports
* geological survey datasets
* tectonic/geological GIS layers flattened into raster products

---

# 7. Map Asset Contract Expectations

All onboarded maps must conform to the current runtime contract.

---

## Required

* equirectangular / Plate Carrée
* full-world extent
* north-up orientation
* no decorative borders
* no implicit padding
* seam-safe dateline handling
* overlay alignment correctness

---

## Strongly Preferred

* high-resolution source assets
* neutral color grading
* low visual clutter
* readable coastlines

---

## Explicitly Avoid

* arbitrary Internet images
* maps with unknown projection
* maps with labels baked into decorative borders
* cropped maps
* stretched projections pretending to be equirectangular

---

# 8. Map Normalization Pipeline

All sourced maps should pass through a normalization process before onboarding.

---

## Step 1 — Source Acquisition

Record:

* source URL/location
* attribution
* license
* original projection
* original dimensions

---

## Step 2 — Projection Verification

Verify:

* projection type
* geographic extent
* orientation

If necessary:

* reproject into Plate Carrée

---

## Step 3 — Extent Normalization

Ensure:

* exact full-world coverage
* no borders/padding
* correct dateline continuity

---

## Step 4 — Raster Preparation

Normalize:

* dimensions
* color space
* alpha handling
* compression strategy

---

## Step 5 — Alignment Validation

Validate against known reference points:

* equator
* prime meridian
* poles
* major cities
* overlay alignment

---

## Step 6 — Product Packaging

Add:

* registry metadata
* attribution
* category
* preview thumbnail (optional initially)

---

# 9. Validation Checklist

Every onboarded map should pass the following checklist.

---

## Metadata

* [ ] canonical id assigned
* [ ] label assigned
* [ ] category assigned
* [ ] attribution recorded
* [ ] source provenance documented

---

## Projection / Geometry

* [ ] equirectangular verified
* [ ] full-world extent verified
* [ ] north-up verified
* [ ] no padding/borders
* [ ] dateline seam verified

---

## Visual Validation

* [ ] overlay alignment verified
* [ ] coastline sanity checked
* [ ] poles visually correct
* [ ] composition readability acceptable

---

## Product Validation

* [ ] selector preview acceptable
* [ ] opacity behaves correctly
* [ ] overlays remain readable
* [ ] no regressions in scene composition

---

# 10. Future Composition Direction

The current architecture already supports future evolution toward more advanced compositing.

This is intentionally not implemented yet, but the direction should remain understood.

---

## 10.1 Reflective vs Emissive Layers

Future scene systems may distinguish:

### Reflective Layers

Visible primarily under illumination.

Examples:

* terrain
* political
* geology

---

### Emissive Layers

Visible primarily in darkness.

Examples:

* city lights
* power-grid maps
* aurora systems

---

## 10.2 Day/Night Dynamic Composition

Future composition may support:

* daytime terrain map
* nighttime emissive map
* solar illumination mask
* twilight blending
* moving terminator transition

This should be implemented as:

* layered composition
* masking/blending
* astronomical derived inputs

NOT as:

* switching between separate maps

---

## 10.3 Future Composition Features

Potential future capabilities:

* blend modes
* layer masking
* twilight gradients
* emissive glow
* atmospheric scattering
* cloud/night interactions
* moonlight-driven illumination

These remain future work and should not be prematurely implemented.

---

# 11. What Should Not Happen Yet

The project should avoid:

* huge uncontrolled map catalogs
* uncontrolled user asset ingestion
* arbitrary Internet map scraping
* projection diversification before the current contract matures
* blending base-map semantics with overlay semantics
* premature lifecycle/dynamic systems tied to map assets

---

# 12. Recommended Near-Term Roadmap

## Immediate

1. Finalize onboarding checklist
2. Source Political map candidate
3. Source Topography map candidate
4. Validate onboarding workflow
5. Replace placeholders incrementally

---

## Near Future

1. Add curated thumbnails
2. Improve attribution display
3. Add low-distraction/dark map variants
4. Add scientific/thematic map families

---

## Later Future

1. Projection-specific asset registries
2. Globe-compatible texture systems
3. Tile-based map systems
4. Dynamic/emissive compositing
5. Advanced blend/masking operators

---

# 13. Summary

Libration’s map system should evolve as:

* a disciplined geospatial substrate system
* projection-aware and scientifically aligned
* compositional rather than decorative
* extensible without chaos

The immediate focus should remain:

* small curated map families
* rigorous onboarding
* geometric correctness
* overlay compatibility
* incremental replacement of placeholders with validated real assets

The current architecture already supports this direction well.
