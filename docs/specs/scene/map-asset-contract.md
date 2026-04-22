# Map Asset Contract

## Purpose

Define the requirements, validation rules, and normalization process for map assets used in Libration.

Map assets are treated as **data with geometric meaning**, not just images.

This contract ensures that all base maps and raster overlays align perfectly with the active projection and all other scene layers.

---

## Core Principle

> Map assets must conform to the projection system.  
> They must never define spatial truth.

All spatial correctness comes from:
- geographic coordinates
- projection math

---

## Asset Identity

```ts
type MapAsset = {
  id: string
  projection: ProjectionId
  extent: GeographicExtent
  resolution: { width: number; height: number }
  orientation: "north-up"
  normalized: boolean

  metadata?: Record<string, unknown>
}
```

---

## Geographic Extent

```ts
type GeographicExtent = {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}
```

### v1 Requirement

For equirectangular base maps:

- minLat: -90
- maxLat: 90
- minLon: -180
- maxLon: 180

---

## Required Properties (v1)

All base map assets must:

- use `projection = "equirectangular"`
- cover full global extent
- have aspect ratio exactly 2:1
- be north-up
- contain no padding or borders
- align exactly with projection bounds

---

## Raster Alignment Rules

Given width and height:

```ts
x = (lon + 180) / 360 * width
y = (90 - lat) / 180 * height
```

The map must visually align with these mappings.

---

## Validation Checklist

Every map asset must be validated before inclusion:

### Required checks

- Equator is horizontally centered
- Prime meridian is vertically centered
- Poles map to top/bottom edges
- No empty borders or margins
- Correct aspect ratio (2:1)
- No rotation or skew

### Recommended checks

- Validate known cities:
  - New York
  - London
  - Tokyo
- Coastline alignment
- Grid overlay alignment

---

## Normalization Pipeline

All sourced maps must be normalized before use:

### Steps

1. **Acquire source**
   - Verify projection and metadata

2. **Reproject if needed**
   - Convert to equirectangular (Plate Carrée)

3. **Crop and align**
   - Ensure full-world coverage
   - Remove borders/padding

4. **Resize**
   - Enforce exact 2:1 aspect ratio

5. **Validate**
   - Run checklist

6. **Register**
   - Assign stable asset ID
   - Store metadata

---

## Accepted Source Types

Preferred sources:

- NASA Blue Marble
- Natural Earth datasets
- NOAA / USGS raster data
- GIS exports labeled "Plate Carrée"

Avoid:

- artistic maps
- stylized projections
- unknown projection images
- cropped or padded maps

---

## Asset Variants

Assets may support variants:

```ts
type MapVariant = {
  variantId: string
  description?: string
}
```

Examples:
- color styles
- labeled vs unlabeled
- simplified vs detailed

---

## Future Asset Types

The contract must expand to support:

### Partial Coverage Maps

- regional maps
- clipped datasets

### Tiled Maps

- multi-resolution tilesets
- zoom-based loading

### Non-Equirectangular Assets

- Mercator
- Robinson
- Orthographic

Each will require additional metadata and validation rules.

---

## Error Handling

If an asset fails validation:

- reject at ingestion time
- log validation errors
- do not attempt runtime correction

---

## Relationship to SceneConfig

- `baseMap.id` references MapAsset.id
- Layer sources may reference asset IDs
- Scene assumes assets are already normalized

---

## Non-Goals (v1)

- automatic reprojection at runtime
- mixed-projection scenes
- tile streaming
- partial-region blending

---

## Summary

The Map Asset Contract ensures:

- geometric correctness
- consistent alignment across layers
- reliable rendering behavior

It is critical to maintaining visual and scientific integrity of the system.




---

# ADDITIONS (v2.1)

## Explicit Invariants (Added)

The following MUST hold for all accepted map assets:

1. Pixel grid aligns exactly with projection mapping (no sub-pixel shifts).
2. Longitude increases left → right; latitude decreases top → bottom (north-up).
3. No implicit offsets (no half-pixel or padded borders).
4. The full declared extent maps to the full raster bounds.
5. All layers assume identical axis conventions.

---

## Pixel Semantics (Added)

Define pixel interpretation explicitly:

- Pixels represent **area**, not points (cell-centered model).
- Mapping uses cell centers:
  - centerX = (i + 0.5) / width
  - centerY = (j + 0.5) / height
- Avoid half-pixel drift by standardizing this across all assets and overlays.

---

## Edge / Seam Handling (Added)

For equirectangular assets:

- Longitude wraps at ±180°
- Left and right edges must be **seamless**
- No duplicated columns or gaps at the dateline
- Poles must not introduce vertical stretching artifacts beyond projection expectations

---

## Color & Alpha Requirements (Added)

- Color space should be **sRGB** unless explicitly declared
- Alpha channel (if present) must be:
  - **premultiplied or non-premultiplied consistently**
  - documented in metadata
- No unintended transparency in fully-opaque base maps

---

## NoData / Missing Data (Added)

If the asset contains missing regions:

- Must declare a **NoData value or mask**
- Rendering behavior must be defined:
  - transparent
  - filled
  - interpolated (future)

Do NOT silently encode missing data as arbitrary colors.

---

## Resampling Rules (Added)

During normalization:

- Use high-quality resampling (e.g., Lanczos or bicubic)
- Avoid nearest-neighbor except for categorical maps
- Preserve coastline fidelity where possible

---

## CRS / Metadata Requirements (Added)

Each asset should retain minimal CRS metadata:

- Projection name (e.g., "Plate Carrée")
- Datum (WGS84 assumed unless specified)
- Extent
- Resolution

Even if not used at runtime, this is critical for validation and future tooling.

---

## Attribution & Licensing (Added)

Each asset SHOULD include:

- source name
- license type
- attribution text

This is required for:
- OSS distribution
- UI display (future)
- legal compliance

---

## Anti-Patterns to Avoid (Added)

Future ingestion MUST NOT:

- accept “visually correct” but mathematically incorrect maps
- stretch non-equirectangular images to 2:1
- include decorative borders or labels baked into base maps (unless intentional)
- mix datasets with different datums or projections without normalization

---

## Debug / Verification Tools (Recommended)

System should support:

- overlay lat/lon grid for visual validation
- sample-point probe (click → lat/lon → pixel)
- seam visualization at dateline
- pole alignment checks

These are essential when onboarding new assets.

---

## Why This Matters (Added)

Map assets are the **visual substrate** of the entire system.

If they are even slightly incorrect:

- all overlays appear wrong
- debugging becomes misleading
- trust in the system degrades

Strict asset correctness is non-negotiable.

