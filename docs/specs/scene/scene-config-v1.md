# SceneConfig v1


## Current Base Map Semantics Update

`baseMap.id` is a stable product-level **base-map family id**, not necessarily a direct image filename.

Current implemented examples include:

- `equirect-world-legacy-v1`
- `equirect-world-political-v1`
- `equirect-world-topography-v1`
- `equirect-world-geology-v1`

Base-map families may be static or month-aware. For month-aware families, the persisted config still stores only `baseMap.id`; concrete month-specific raster URLs are resolved at runtime from the base-map registry using product time.

Current base-map persistence includes:

```ts
scene.baseMap.id
scene.baseMap.visible
scene.baseMap.opacity
scene.baseMap.presentation? // optional in saved JSON; normalized to defaults at load
```

`presentation` holds **visual-only** display tuning for the selected base-map family (brightness, contrast, gamma, saturation). It applies to the family as a whole, including every monthly raster in a `monthOfYear` family, and does not change map assets, projection, or the map asset contract. Brightness, contrast, and saturation are realized as a CSS `filter` on the base-map blit; gamma uses a per-RGB power curve in the canvas image pass when γ ≠ 1 (α preserved), not a CSS filter.

No month-specific file path is persisted in SceneConfig.

---

## Purpose

SceneConfig defines the authoritative persisted structure for composing the user-facing scene in Libration.

It replaces the current boolean-based layer model with a structured, extensible system that supports:

- explicit base map selection
- user-controlled ordered layer stacking
- per-layer source and presentation configuration
- future dynamic data, alternate projections, scene-view evolution, and richer composition behavior

This document is intentionally **self-explanatory and context-rich** so that future development sessions (human or AI) can understand both *what* the system does and *why it is structured this way* without needing prior chat history.

---

## Key Clarification (Added)

This document is BOTH:
- a **data contract (spec)**
- a **design explanation (intent preservation)**

Neither should be removed in future revisions.

---

## Top-Level Structure (No Change, clarified intent)

```ts
type SceneConfig = {
  version: 1

  projectionId: string
  viewMode: SceneViewMode

  baseMap: BaseMapConfig

  layers: SceneLayerInstance[]

  orderingMode?: "user"

  metadata?: Record<string, unknown>
}
```

### Clarification

- `projectionId` MUST be treated as authoritative, even if only one exists today
- `viewMode` MUST NOT be assumed fixed by implementation
- These fields exist specifically to prevent future architectural rewrites

---

## IMPORTANT ADDITION: Explicit Invariants

The following MUST remain true across all implementations:

1. All layers share the same projection
2. All layer geometry is defined in lat/lon space
3. Projection is applied AFTER data definition, not embedded in data
4. Scene ordering is deterministic and user-controlled
5. Base map NEVER defines spatial truth

---

## Layer Instance (Expanded Clarification Only)

```ts
type SceneLayerInstance = {
  id: string

  family: SceneLayerFamily
  type: SceneLayerType

  enabled: boolean
  opacity?: number
  order: number

  source: LayerSourceConfig
  presentation?: LayerPresentationConfig

  blendingMode?: LayerBlendingMode
  updatePolicy?: UpdatePolicyConfig
  timeMode?: LayerTimeMode

  metadata?: Record<string, unknown>
}
```

### IMPORTANT NOTE (Added)

Future implementations MUST NOT collapse:
- source
- presentation
- behavior

into a single structure.

That separation is critical for:
- presets
- reuse
- rendering independence

---

## NEW SECTION: Layer Identity Philosophy

A layer is defined by THREE independent axes:

1. **What it represents** → `family`
2. **How it behaves/render-shapes** → `type`
3. **Where data comes from** → `source`

This separation is intentional and must be preserved.

---

## NEW SECTION: Why Source Model Is Complex

The source model appears complex because:

Different future layers fundamentally differ:

| Layer Type | Nature |
|------|--------|
| Base map | static raster |
| Weather | gridded scientific data |
| Aircraft | live feed |
| Eclipse | derived math |

A single "source" model would break under this diversity.

---

## MINOR ADDITIONS: Validation Strengthening

### Additional Validation Rule

- Layer `order` must not produce collisions without deterministic tie-breaking
- If duplicate orders exist → preserve array order

---

## NEW SECTION: Future Risk Warning

If this structure is simplified incorrectly later, the following will break:

- dynamic data layers
- projection switching
- presets
- composability

Future developers MUST treat this structure as intentional, not over-engineered.

---

## EVERYTHING BELOW UNCHANGED (Original content preserved intentionally)

# SceneConfig v1 (Refined v2 Specification)

## Purpose

SceneConfig defines the authoritative persisted structure for composing the user-facing scene in Libration.

It replaces the current boolean-based layer model with a structured, extensible system that supports:

- explicit base map selection
- user-controlled ordered layer stacking
- per-layer source and presentation configuration
- future dynamic data, alternate projections, scene-view evolution, and richer composition behavior

This document is designed to be durable and easily consumable in future chat sessions. It should give a later assistant enough context to continue the work without needing to rediscover the product direction from scattered conversation history.

---

## Product Intent

Libration is evolving from a fixed world-map scene into a **projection-aware, time-aware, composable global scene system**.

The scene is rendered beneath fixed display chrome and may eventually include:

- curated base cartography
- environmental overlays
- astronomical overlays
- mobility / live-position overlays
- annotations and reference layers
- future dynamic and forecasted datasets

The scene system must be structured now so that future support for the following remains architecturally natural:

- alternate map projections
- globe or perspective-like views
- zoom / pan
- tiling
- live feeds
- playback / scrubbed time
- layer blending and richer composition rules

These futures are **not** part of SceneConfig v1 implementation scope, but they must be accommodated structurally.

---

## Design Principles

1. **Scene is authoritative**
   - The scene is a first-class config domain, not a collection of unrelated booleans.

2. **Projection defines spatial truth**
   - Maps do not define where things are.
   - Geographic coordinates projected through the active projection define placement.

3. **Layers describe scene content, not backend behavior**
   - Layers express what exists in the scene.
   - Rendering remains downstream through LayerState → RenderPlan → Executor → Backend.

4. **Base map selection is explicit**
   - The scene always knows which base cartographic substrate is selected, even if hidden.

5. **Structure must be forward-compatible**
   - The model must support richer future capabilities without requiring conceptual rewrites.

6. **Ordering is user-visible and meaningful**
   - User-controlled stacking is part of the product, not an accidental implementation detail.

---

## Top-Level Structure

```ts
type SceneConfig = {
  version: 1

  projectionId: string
  viewMode: SceneViewMode

  baseMap: BaseMapConfig

  layers: SceneLayerInstance[]

  orderingMode?: "user"

  metadata?: Record<string, unknown>
}
```

### Notes

- `projectionId` exists now even though only one projection is expected initially.
  - This makes projection an explicit product concept rather than a hidden assumption.
- `viewMode` exists now for the same reason.
  - Initial implementation may support only `"fullWorldFixed"`.
- `orderingMode` is explicitly user-driven in v1.
  - Future constrained or assisted modes can be added later without reshaping the model.

---

## Scene View Mode

```ts
type SceneViewMode =
  | "fullWorldFixed"
```

### Purpose

`viewMode` makes current viewing assumptions explicit and future-friendly.

In v1:
- the world is shown as a full-width global strip
- there is no zoom or pan
- the scene fits the available scene viewport under chrome

Future modes may include:
- `"zoomPan2d"`
- `"orthographicGlobe"`
- `"perspectiveGlobe"`

These future modes are not implemented in v1, but the config model should not imply that `"fullWorldFixed"` is the only possible worldview forever.

---

## Base Map Configuration

```ts
type BaseMapConfig = {
  id: string
  visible: boolean
  opacity?: number

  styleVariant?: string

  metadata?: Record<string, unknown>
}
```

### Semantics

- `id` is a stable product-level map asset identifier, such as:
  - `"political-v1"`
  - `"terrain-v1"`
  - `"geology-v1"`
- `visible` allows the base map to be hidden entirely if desired.
- `opacity` defaults to `1.0`.
- `styleVariant` is reserved for curated variants of the same underlying map family.

### Notes

- Only one base map is active in SceneConfig v1.
- The base map is modeled separately from general scene layers because it is foundational and always conceptually present, even when hidden.
- Base maps must satisfy the active map asset contract for the active projection.

---

## Scene Layer Instance

```ts
type SceneLayerInstance = {
  id: string

  family: SceneLayerFamily
  type: SceneLayerType

  enabled: boolean
  opacity?: number
  order: number

  source: LayerSourceConfig
  presentation?: LayerPresentationConfig

  blendingMode?: LayerBlendingMode
  updatePolicy?: UpdatePolicyConfig
  timeMode?: LayerTimeMode

  metadata?: Record<string, unknown>
}
```

### Philosophy

A scene layer instance represents one composable, ordered participant in the scene.

It intentionally separates:

- **family**: broad semantic grouping
- **type**: concrete product-level layer behavior category
- **source**: where the layer's content comes from
- **presentation**: how that layer is visually configured within the scene
- **future lifecycle fields**: blending, update, time

This prevents the model from collapsing into either:
- a purely rendering-driven taxonomy, or
- an unstructured bag of feature-specific knobs

---

## Layer Family

```ts
type SceneLayerFamily =
  | "environment"
  | "astronomy"
  | "mobility"
  | "annotation"
  | "reference"
  | "custom"
```

### Purpose

Layer family is a broad semantic grouping used for:

- UI grouping
- future presets
- future filtering
- future composition guidance
- conceptual clarity in future chat sessions

### Family meanings

- `environment`
  - weather, temperature, precipitation, cloud, wind-related layers
- `astronomy`
  - terminator, analemma, eclipse paths, sun/moon-derived overlays
- `mobility`
  - aircraft, ships, satellites, moving-position overlays
- `annotation`
  - labels, user pins, paths, highlights, user-authored overlays
- `reference`
  - grids, boundaries, cartographic helper layers, non-primary reference structures
- `custom`
  - escape hatch for future or external experimental work

---

## Layer Type Taxonomy

```ts
type SceneLayerType =
  | "environmentRaster"
  | "environmentVector"
  | "astronomyRaster"
  | "astronomyVector"
  | "mobilityPoints"
  | "mobilityTracks"
  | "annotationPoints"
  | "annotationPaths"
  | "annotationLabels"
  | "referenceGrid"
  | "referenceBoundaries"
  | "custom"
```

### Why both `family` and `type` exist

`family` answers:
- "What broad class of thing is this?"

`type` answers:
- "What kind of layer behavior / payload shape is this likely to embody?"

This dual structure prevents overloading one field with too many responsibilities.

### Type guidance

#### `environmentRaster`
Examples:
- surface temperature raster
- sea surface temperature raster
- precipitation intensity raster
- cloud cover raster
- weather model scalar fields

#### `environmentVector`
Examples:
- wind barbs
- isobars
- fronts
- contour overlays

#### `astronomyRaster`
Examples:
- eclipse visibility intensity fields
- future astronomical heatmaps
- sky-condition-derived global fields

#### `astronomyVector`
Examples:
- terminator line
- analemma curves
- eclipse centerlines
- visibility bands as paths / polygons

#### `mobilityPoints`
Examples:
- aircraft positions
- ship positions
- satellite instantaneous positions

#### `mobilityTracks`
Examples:
- trajectories
- recent trails
- predicted routes
- orbital ground tracks

#### `annotationPoints`
Examples:
- user pins
- highlighted cities
- sampled points of interest

#### `annotationPaths`
Examples:
- user routes
- highlighted paths
- hand-authored geographic outlines

#### `annotationLabels`
Examples:
- names
- text callouts
- explanatory labels

#### `referenceGrid`
Examples:
- latitude/longitude grid
- projection helper grid
- structural world reference lines

#### `referenceBoundaries`
Examples:
- political boundary overlays
- tectonic plate outlines
- named region boundaries
- coastlines as a reference overlay distinct from the selected base map

---

## Layer Source Configuration

```ts
type LayerSourceConfig =
  | StaticRasterLayerSource
  | StaticVectorLayerSource
  | DerivedLayerSource
  | LiveFeedLayerSource
  | GriddedDatasetLayerSource
  | TiledRasterLayerSource
  | CustomLayerSource
```

### Philosophy

The source model should answer:

- what kind of source is driving the layer?
- how should later runtime systems acquire or derive the content?
- what information is stable product config vs later runtime state?

This lets the product distinguish between:
- a static curated raster asset
- a derived astronomical product
- a live mobility feed
- a scientific gridded dataset
- a future tiled source

That distinction matters for future lifecycle, caching, update, and sourcing work.

---

## Source Variants

### StaticRasterLayerSource

```ts
type StaticRasterLayerSource = {
  kind: "staticRaster"
  assetId: string
  variantId?: string
  metadata?: Record<string, unknown>
}
```

Use for:
- curated packaged raster overlays
- static global datasets pre-normalized into product assets

Examples:
- a packaged cloud climatology raster
- a static geology transparency layer

---

### StaticVectorLayerSource

```ts
type StaticVectorLayerSource = {
  kind: "staticVector"
  assetId: string
  variantId?: string
  metadata?: Record<string, unknown>
}
```

Use for:
- packaged vector datasets
- fixed geographic lines/polygons packaged with the app

Examples:
- tectonic plate boundaries
- packaged political outlines
- packaged coastline reference layer

---

### DerivedLayerSource

```ts
type DerivedLayerSource = {
  kind: "derived"
  product: string
  parameters?: Record<string, unknown>
  metadata?: Record<string, unknown>
}
```

Use for:
- layers computed by Libration from time, ephemeris, or internal math

Examples:
- solar terminator
- sun analemma
- moon analemma
- near-term eclipse paths

This source type is especially important because many future astronomical layers should not be treated as if they are external assets.

---

### LiveFeedLayerSource

```ts
type LiveFeedLayerSource = {
  kind: "liveFeed"
  providerId: string
  dataset: string
  query?: Record<string, unknown>
  metadata?: Record<string, unknown>
}
```

Use for:
- live aircraft feeds
- ship tracking feeds
- rapidly updating mobility or measurement sources

Examples:
- ADS-B aircraft
- AIS vessel traffic
- future live event streams

This is not implemented in v1 runtime behavior, but it is important to reserve structurally now.

---

### GriddedDatasetLayerSource

```ts
type GriddedDatasetLayerSource = {
  kind: "griddedDataset"
  providerId: string
  dataset: string
  field: string
  level?: string
  modelRun?: string
  metadata?: Record<string, unknown>
}
```

Use for:
- weather model grids
- scientific raster-like global fields
- forecast products that are better thought of as structured data than as image assets

Examples:
- GFS surface temperature
- sea surface temperature
- precipitation forecast
- cloud cover probability

This source type matters because many future raster layers should be derived from gridded science data, not stored as arbitrary fixed images.

---

### TiledRasterLayerSource

```ts
type TiledRasterLayerSource = {
  kind: "tiledRaster"
  providerId: string
  tilesetId: string
  metadata?: Record<string, unknown>
}
```

Use for:
- future tiled map sources
- zoom-aware raster delivery
- future regional or multi-resolution map content

This is reserved for future capabilities and is not part of v1 implementation.

---

### CustomLayerSource

```ts
type CustomLayerSource = {
  kind: "custom"
  config: Record<string, unknown>
}
```

Use for:
- experimental product work
- future extension points
- external/custom integrations

This should remain an escape hatch, not the primary path for core product work.

---

## Layer Presentation Configuration

```ts
type LayerPresentationConfig = {
  visibleInLegend?: boolean
  colorVariantId?: string
  labelMode?: string
  pointStyleId?: string
  lineStyleId?: string
  fillStyleId?: string

  metadata?: Record<string, unknown>
}
```

### Purpose

`presentation` holds user-facing visual preferences that are not the same thing as source identity.

This separation is important because:
- the same source may be presented differently
- source should not become polluted with view-only styling choices
- future presets may want to change presentation without changing the source

In SceneConfig v1, most of these fields are structural reserves, not required runtime work.

---

## Blending Mode

```ts
type LayerBlendingMode =
  | "normal"
  | "multiply"
  | "screen"
  | "additive"
```

### Status

Reserved for future composition work.

Even though blending modes are not a v1 implementation goal, they are important enough to preserve in the shape of the config now because they will eventually matter for:
- weather over terrain
- intensity overlays
- scientific raster compositing
- cartographic readability

---

## Update Policy

```ts
type UpdatePolicyConfig =
  | { type: "perFrame" }
  | { type: "interval"; intervalMs: number }
  | { type: "onDemand" }
```

### Status

Reserved for future dynamic or derived lifecycle work.

Notes:
- The existing codebase has update-policy concepts, but the future scene system will need a more complete lifecycle interpretation.
- Including this field now helps preserve a truthful path for future dynamic layers.

---

## Layer Time Mode

```ts
type LayerTimeMode =
  | "live"
  | "fixed"
  | "scrubbed"
```

### Purpose

This field reserves the future ability for layers to interpret time differently.

Examples:
- live weather
- fixed historical snapshot
- user-scrubbed timeline for eclipse preview or forecast playback

Not implemented in SceneConfig v1 runtime, but important to preserve conceptually now.

---

## Ordering Model

### Rule

- Lower `order` renders first (lower in the stack)
- Higher `order` renders later (higher in the stack)

### Product intent

This is explicitly **Option B**:
- user-controlled stacking
- most clearly viewable layer may be placed on top by user choice

### Notes

- Base map is conceptually foundational but still modeled explicitly.
- In implementation, the base map may still be handled as a specialized lowest participant unless hidden.
- Future UI may offer drag-and-drop ordering.
- Future helper rules may warn about visually nonsensical orderings, but v1 preserves user agency.

---

## Opacity

### Rule

- `opacity` is per-layer and defaults to `1.0`

### Intent

Opacity is considered core enough to the stacking model that it belongs in v1 structure now.

Opacity must not change:
- source identity
- data precision
- geographic meaning

It is a presentation/composition property only.

---

## Normalization Rules

SceneConfig must be normalized before runtime use.

### Required normalization behavior

- fill missing `opacity` values with `1.0`
- fill missing `orderingMode` with `"user"`
- sort `layers` by `order`
- preserve unknown fields when feasible
- reject or flag invalid `family` / `type` / `source.kind` combinations
- apply base map defaults if missing
- apply default `projectionId` and `viewMode` if not authored

### Initial default assumptions

For the initial supported runtime:
- `projectionId = "equirectangular"`
- `viewMode = "fullWorldFixed"`

These defaults should be explicit normalization behavior rather than hidden runtime assumptions.

---

## Validation Guidance

### Layer family and type consistency

The model should encourage truthful combinations.

Examples of good combinations:
- `family: "astronomy"` + `type: "astronomyVector"`
- `family: "mobility"` + `type: "mobilityPoints"`
- `family: "reference"` + `type: "referenceGrid"`

Examples of suspicious combinations that should at least be warned on:
- `family: "mobility"` + `type: "referenceGrid"`
- `family: "annotation"` + `type: "environmentRaster"`

This does not require over-engineering in v1, but the schema should acknowledge that not every combination is equally truthful.

---

## Relationship to Existing Libration Config

SceneConfig is intended to become a new structured domain within `LibrationConfigV2`.

Conceptually:

```ts
type LibrationConfigV2 = {
  // existing domains...
  scene: SceneConfig
}
```

### Migration strategy direction

Existing layer booleans can seed the first scene config:

- existing base map flag → `baseMap.visible`
- existing grid flag → create a `referenceGrid` layer instance
- existing solar shading / illumination flag → create an astronomy-oriented layer instance, or remain in transition until the new taxonomy is fully adopted
- existing pins / markers → create annotation layer instances

This migration should be done truthfully rather than pretending the old booleans already expressed the full new scene concept.

---

## Relationship to Presets

SceneConfig is intended to integrate naturally with the broader preset direction already established in the repo.

Why this matters:
- scene composition is exactly the kind of product area users will want to save and reapply
- presets should be able to affect:
  - base map selection
  - enabled layer sets
  - ordering
  - presentation
  - opacity
  - later time modes and blending preferences

SceneConfig therefore should be designed as a structured patch-friendly subtree rather than a flat bag of disconnected fields.

---

## Current Non-Goals of SceneConfig v1 Runtime

The following are **not** implementation goals for the first scene-system slice, even though the structure should support them later:

- alternate projections beyond the initial supported projection
- zoom / pan
- perspective or globe rendering
- multiple simultaneous base maps
- live feed runtime pipelines
- tiled raster runtime
- layer blending implementation
- per-layer legends and inspection UIs
- historical time scrub or per-layer playback
- advanced performance/LOD systems

This document intentionally distinguishes between:
- **structural readiness now**
- **runtime implementation later**

---

## Why This Structure Was Chosen

This structure is designed to solve several problems at once:

### Problem 1: current layer booleans are too small
They can only answer "on or off," not "what is this layer, where does it come from, and how should it compose?"

### Problem 2: future datasets are not all the same kind of thing
A static geology transparency, a computed eclipse path, and a live aircraft feed should not all be forced through one ambiguous source shape.

### Problem 3: projection/view assumptions should not stay hidden
Making `projectionId` and `viewMode` explicit helps future-proof the system without forcing immediate implementation of alternate modes.

### Problem 4: user-controlled stacking is a product feature
The model must preserve intentional layer ordering rather than relying on hardcoded internal z-order assumptions.

### Problem 5: future chat sessions need durable context
This document is meant to make the future architecture obvious to a later assistant or implementation session.

---

## Summary

SceneConfig v1 refined establishes:

- Scene as a first-class config domain
- explicit projection and view concepts
- explicit base map selection
- ordered, user-controlled scene layer stacking
- a two-level semantic taxonomy (`family` and `type`)
- a multi-variant source model capable of representing:
  - static assets
  - vector assets
  - derived products
  - live feeds
  - gridded datasets
  - future tiled sources
- reserved hooks for:
  - blending
  - update policy
  - time behavior
  - presentation refinements

This is the intended structural foundation for Libration to evolve into a full composable scene system without conceptual rewrites.
