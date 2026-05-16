# Libration Architecture

## Purpose

This document is the durable architectural reference for Libration.

It defines the system boundaries that future implementation work must preserve. More tactical status and sequencing lives in `PLAN.md` and `docs/ROADMAP.md`.

## Architectural identity

Libration is a renderer-agnostic, longitude-first world time and global scene instrument.

The product is built around five architectural commitments:

1. Time is canonicalized as UTC instants.
2. Spatial structure is longitude-first, not timezone-first.
3. Product meaning is resolved upstream of rendering.
4. Rendering intent is expressed as backend-neutral `RenderPlan`.
5. Backends execute resolved plans and do not own product semantics.

## System pipeline

All visual output follows this shape:

```mermaid
flowchart LR
    IN[Config, Time, Assets] --> RES[Resolvers]
    RES --> SEM[Semantic Planning]
    SEM --> LAY[Layout]
    LAY --> ADA[Realization Adapters]
    ADA --> RP[RenderPlan]
    RP --> EX[Executor]
    EX --> BE[Backend]
```

The RenderPlan boundary is hard.

Upstream systems may know about time, map families, chrome meaning, scene layers, fonts, glyph kinds, and user configuration.

Backends may know about surfaces, drawing APIs, caches, image resources, font registration, and primitive execution.

Backends must not decide product behavior.

## Top-level subsystems

### App shell

The app shell owns:

- UI state.
- config loading and saving.
- preset application when implemented.
- render-loop orchestration.
- editor surfaces.
- runtime wiring between time context, scene config, chrome config, and renderer.

The app shell must not become a home for low-level product rules that belong in config normalization, resolvers, planners, or specs.

### Core time model

The product uses one authoritative instant per frame.

Display modes format that instant and its derived civil presentation. They must not mutate the canonical instant.

The reference-frame model separates:

- canonical UTC instant.
- selected reference civil zone.
- read-point meridian.
- civil display projection.
- top-band label format.

Changing local 12 hour, local 24 hour, UTC style labels, or reference city presentation must not create a second product clock.

Demo mode is the intentional exception when it supplies a separate configured time source.

### Display chrome

Display chrome is screen-space instrument content.

Current top chrome includes:

- hour marker entries.
- tickmark tape.
- NATO structural zone row.
- reserved vertical layout above the scene viewport.

Display chrome is not a scene layer. It does not participate in map projection or scene layer ordering.

Top-band hour markers are configured through `chrome.layout.hourMarkers` only. Runtime behavior is derived by resolver, semantic planner, layout, and realization adapter.

### Scene system

The scene system owns projection-space content under the chrome.

SceneConfig is authoritative for:

- `projectionId`.
- `viewMode`.
- `baseMap`.
- ordered `layers[]`.

The scene system composes:

- foundational base map.
- static overlays.
- derived overlays.
- future dynamic and data-driven layers.

Scene composition is deterministic. Base map remains beneath overlays. Overlay order is user-controlled through layer order, with equal-order ties preserving document array order.

### Map asset system

Base-map inventory is declared in the bundled JSON catalog:

```text
src/assets/maps/base-map-catalog.json
```

The app does not scan `public/maps` at runtime and does not fetch a remote catalog.

Persisted config stores base-map family ids, not concrete raster paths. Month-aware families resolve concrete rasters from product time through the catalog-backed resolver. The catalog also includes a validated static global topography family (**`equirect-world-topography-ne-v1`**, Natural Earth–lineage raster); legacy ids **`equirect-world-topography-v1`** and **`equirect-world-topo-v1`** remain resolver aliases for the Blue Marble **T** month-aware family. **`equirect-world-political-v1`** is a shipped Natural Earth–lineage political substrate in the bundled catalog (not transitional). **`equirect-world-geology-v1`** remains `transitionalPlaceholder` in the bundled catalog and references a ship raster not yet committed at `public/maps/world-equirectangular-geology.jpg` until geology is sourced and validated (`docs/maps/MAP_ASSET_SOURCES.md`).

Map assets are geospatial substrates. They must satisfy the projection contract and must never define spatial truth.

### Layer engine

Layers describe what exists in the projection-space scene.

A layer may be static, derived, or future data-driven. It produces time-resolved layer state. RenderPlan builders convert that state into drawing intent.

Layers must not fetch live data during rendering. Future live feeds belong in a lifecycle system that prepares versioned data snapshots before render execution.

### Planetary illumination composition

Planetary illumination is a **coherent upstream subsystem**: dedicated modules resolve solar geometry, continuous twilight (attenuation and atmospheric tint), moonlight policy, and optional emissive night-light radiance from bundled catalogs into a **single** planetary illumination raster that becomes one `rasterPatch` in the RenderPlan for the Solar shading execution path.

Twilight coloring and non-emissive atmospheric tint live in upstream sampling (`src/renderer/illuminationShading.ts`); semantic civil/nautical/astronomical anchors inform a **continuous** field. **Shipped cumulative incremental tuning** (constants-only, more than one narrow refinement—including a **second narrow pass** doc-finalized in `PLAN.md` / `docs/ROADMAP.md`: wider Gaussian sigma, cooler civil–astro anchors, `TWILIGHT_ATMOSPHERIC_ALPHA_MAX` 0.172, day-side envelope to `dayClear`+1.28°) widens anchor color coupling, nudges the bounded atmospheric tint budget, and softens the day-side envelope below the shared +4° daylight-clear cutoff—without new SceneConfig axes, layers, or backend policy. **Further** scattering or user-facing softness remains future work (see `PLAN.md` Slice 2).

There is **no generalized compositor abstraction** and **no backend-owned composition policy**: composition remains specialized upstream code with deterministic tables and sampling; the Canvas backend only decodes images when executing primitives and does not interpret illumination modes or layer semantics.

### Overlay readability (composition-aware: v1 + v1.1 + derived substrate lift + SceneConfig presentation + per-layer pilots)

The app shell may attach **one** `OverlayReadabilityFrame` per tick on `TimeContext` so participating layers call `getOverlayReadabilityFrameOrCompute` instead of each recomputing coarse samples from `now`. The frame exposes **subsolar-only** `nightVeil01At` / `globalNightVeil01` (aligned with `illuminationNightVeil01FromSolarAltitudeDeg`) plus **v1.1** `readabilityVeil01At` / `globalReadabilityVeil01`: the same solar field, deterministically augmented by **emissive night-light policy** (`mode`, `presentation.intensity`, `presentation.driverExponent` from normalized SceneConfig) as `globalEmissiveLegibilityPressure01` — **no emissive raster sampling** in the readability path. **Substrate-aware lift (post–v1.1, derived):** `substrateOverlayReadabilityLiftScale01` (0.35–1) comes from **effective** base-map presentation (`resolveEffectiveBaseMapPresentation` + `scene.baseMap`) and optional catalog `capabilities`: `overlayOptimized` scales presentation-derived penalty; `darkFriendly` slightly relaxes it; `reliefShaded`, `boundaryDense`, `chromaticDense`, `bathymetryShaded`, `fineScaleTexture`, `labelDense`, `etchedReliefDense`, and `sunGlintDense` add small **intrinsic** attenuation at neutral presentation when curated in the catalog; brightness **below** default reduces presentation-derived penalty so dimmed bases retain overlay lift. No raster sampling. **Scene presentation scaling:** normalized `scene.overlayReadability.presentation` (`readabilityVeilScale01`, `overlayLiftMultiplier01`) post-processes the derived combined veil and substrate lift scale in the shell after `computeOverlayReadabilityFrameFromTimeMs` (defaults preserve v1 + v1.1 + substrate-only behavior). **Per-layer pilots:** optional `scene.overlayReadability.perLayer` keys **`grid`**, **`solarAnalemma`**, **`subsolarMarker`**, **`sublunarMarker`**, **`cityPins`**, and **`staticEquirectOverlay`** apply the same veil/lift scalars again in the corresponding layer constructors via `applySceneOverlayReadabilityPresentationToFrame` after the shell frame (identity values are omitted on normalize). Selected derived overlays attach **derived-only** `OverlayReadabilityHints` using the **combined** readability veil for `nightVeil01` plus optional `overlayReadabilityLiftScale01` from the frame. Reference and custom **city pins** carry the combined signal **per pin** (`readabilityNightVeil01` on each `CityPinEntry`) and payload-level `overlayReadabilityLiftScale01`. **Static full-viewport equirect raster overlays** attach the **global** combined veil on `EquirectangularRasterPayload.readability`; `buildBaseRasterMapRenderPlan` merges `overlayReadabilityCssFilterAppend` with presentation-derived `cssFilter` on the single `imageBlit`. RenderPlan builders adjust vector stroke widths and RGBA alphas using `effectiveOverlayReadabilityLiftVeil01` (veil × lift scale); the backend continues to execute primitives mechanically. Further optional readability axes (per-layer tuning for additional **custom** scene stack rows not yet covered by the default `perLayer` map; **further** substrate/catalog signals beyond the shipped presentation + dimming + `reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense` model) remain future work when product-ready (see `PLAN.md` Slice 2 and `docs/ROADMAP.md` Phase 6 / Phase 9).

**Phase closure:** v1, v1.1, **derived substrate-aware overlay lift**, **SceneConfig presentation scaling** (`scene.overlayReadability.presentation`: `readabilityVeilScale01`, `overlayLiftMultiplier01`), and **per-layer pilots** for **default stack rows** (`perLayer.grid`, `perLayer.solarAnalemma`, `perLayer.subsolarMarker`, `perLayer.sublunarMarker`, `perLayer.cityPins`, `perLayer.staticEquirectOverlay` — same scalars after the shell frame) are **production-complete**; the shell supplies emissive policy, effective base-map presentation, catalog `capabilities`, and normalized presentation into `computeOverlayReadabilityFrameFromTimeMs` (presentation applied on the derived frame) each tick (`App.tsx` → `TimeContext.overlayReadabilityFrame`). **`getOverlayReadabilityFrameOrCompute` fallback** (no pre-attached frame): still subsolar-only for emissive/substrate/presentation inputs—production uses the shell-attached frame.

**Fully implemented for this phase:** persisted keys, normalization + clamps, Layers controls + reset, `sceneRuntimeAffectingEqual` / registry invalidation parity with other scene presentation deltas, `assertIsNormalizedLibrationConfig` coverage, pilot per-layer keys for all **default** readability stack rows above, and **substrate readability heuristic extensions**: sub-1 effective brightness reduces presentation-derived lift attenuation; optional catalog **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** add small intrinsic penalties at neutral presentation (`src/core/substrateOverlayReadabilityLiftScale.ts`, bundled catalog).

**Future (not partial):** per-layer readability for **custom** stack rows **outside** the defaulted `perLayer` product map; **distinct per-row readability** when multiple static equirect layers need different tuning than a single **`staticEquirectOverlay`** pilot affords; further catalog/resolver substrate heuristics **beyond** the shipped **eight-intrinsic** contract (`reliefShaded` … `sunGlintDense`) plus `overlayOptimized` / `darkFriendly` presentation multipliers and sub-1 brightness dimming; optional improvement so the `OrCompute` fallback could accept the same inputs as the shell (only if a real caller needs it).

### RenderPlan system

RenderPlan is the shared declarative rendering contract.

Current primitive categories include:

- text.
- rect.
- line.
- path.
- gradients.
- raster patches.
- image blits.

Path and clip payloads should move toward descriptor-backed intent. Backend-native objects are transitional only where still required.

### Backend system

The current backend is Canvas.

Canvas-specific code belongs behind bridges such as:

- `canvasTextFontBridge`.
- `canvasPaintBridge`.
- `canvasPathBridge`.
- Canvas font loading and registration helpers.

Future backends must consume the same upstream render intent and must not require product-specific branching inside the backend.

Backend resource lifecycle reporting is allowed only for concrete resource events. For example, the backend may report that a raster image URL failed to load. It must not decide which map family or fallback raster should be used.

## Configuration architecture

`LibrationConfigV2` is the authoritative persisted application config.

Important config domains:

- chrome layout and top-band controls.
- structured hour-marker configuration.
- scene config (including `scene.illumination` and `scene.overlayReadability` — global `presentation` plus optional **`perLayer` pilots (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`)** — for overlay legibility scaling upstream of RenderPlan hints).
- map presentation overrides.
- future preset and partial-patch systems.

Normalization must preserve user intent, backfill defaults, clamp unsupported values, and avoid reintroducing removed compatibility surfaces.

Config stores durable semantic ids, not transient file paths or derived runtime values.

## Scene architecture invariants

These rules are non-negotiable:

1. Projection defines spatial truth.
2. Base maps do not define spatial truth.
3. All scene geometry is defined in geographic or projection-aware coordinates before rendering.
4. Scene view and projection are separate concepts.
5. Base map families are selected by durable catalog ids.
6. Month-aware map switching is asset resolution, not camera behavior.
7. Layer ordering is deterministic.
8. Composition belongs upstream of backend execution.

## Chrome architecture invariants

These rules are non-negotiable:

1. Chrome is screen-space, not projection-space.
2. Chrome reserves layout before scene viewport resolution.
3. Display modes format presentation and must not mutate canonical time.
4. Hour-marker persisted state lives under `chrome.layout.hourMarkers`.
5. Runtime content and behavior are derived, not duplicated into parallel persisted axes.
6. Text and procedural glyph realizations flow through the same RenderPlan boundary.

## Renderer invariants

These rules are non-negotiable:

1. Backend receives resolved render intent.
2. Backend does not inspect SceneConfig to decide product behavior.
3. Backend does not implement month-aware map policy.
4. Backend does not decide fonts, glyph kinds, layer semantics, or layout.
5. Backend bridges translate shared intent into backend-native calls only.
6. Resource failure reporting is event reporting, not product fallback policy.

## Current implementation maturity

Stable enough for feature-forward work:

- RenderPlan boundary.
- Canvas backend execution.
- top-band semantic hour-marker path.
- SceneConfig authority.
- curated base-map catalog.
- static and month-aware base maps.
- shipped Natural Earth–lineage political base map **`equirect-world-political-v1`** in the bundled catalog (non-transitional; geology family still placeholder until ship raster).
- static overlays.
- derived solar analemma overlay.
- solar shading: a continuous, attenuation-driven solar-altitude illumination field (with civil, nautical, and astronomical thresholds retained as semantic anchors) is encoded into the same upstream planetary illumination raster as day/night; twilight is not a separate user-facing layer; composition is **non-emissive** (attenuation + atmospheric tint, not glow); the backend only executes the resulting `rasterPatch` without twilight-specific semantics.
- **cumulative incremental twilight transition tuning** (upstream only, `illuminationShading.ts`): constants-only refinements across narrow passes—smoother Gaussian coupling between anchor colors, cooler low-luminance terminator progression, capped atmospheric tint modulation, gentler day-side fade below +4° daylight clear—still one `rasterPatch`; no persisted twilight-softness controls in this slice (second pass doc-finalized; see `PLAN.md` Slice 2).
- perceptually tuned lunar secondary illumination: moon phase, lunar altitude, and surface incidence contribute a bounded directional night-side field (cool additive RGB in the raster plus a secondary transmittance lift on the darken mask) inside the same upstream planetary illumination raster, without backend moonlight semantics or additional render-layer kind. Presentation strength is selected by `scene.illumination.moonlight.mode` (`off`, `natural`, `enhanced`, `illustrative`), resolved into a deterministic upstream policy table before sampling; the RenderPlan stays a single `rasterPatch` and the backend remains unaware of the mode.
- emissive night lights (human-made radiance) are **implemented** as upstream planetary composition inputs, not as a generic overlay or backend blend mode. Configuration lives under `scene.illumination.emissiveNightLights` (`mode`, durable `assetId`, and normalized `presentation` with **intensity** and **driverExponent** for user-facing tuning resolved upstream). `assetId` is canonicalized against a **bundled emissive composition catalog** (separate from the base-map catalog); unknown or blank ids resolve to the catalog default id. The Scene **Layers** UI exposes **Off / Natural / Enhanced / Illustrative** for `mode` plus intensity and faint-light lift controls; new scenes default **`illustrative`** for emissive night lights (with **`illustrative`** moonlight). When mode is not `off` and the resolved raster decodes, `sampleIlluminationRgba8` samples emissive luma per texel (with configurable luma lift), applies `computeEmissiveNightLightsContributionLinear01` (solar-altitude gate, moonlight coexistence, mode policy, presentation intensity), and adds bounded warm RGB on top of the existing twilight/moonlight field—still one planetary illumination `rasterPatch`; no separate RenderPlan primitive and no Canvas-specific night-light semantics beyond mechanical image decode for the composition input.
- polar illumination behavior emerges from real solar geometry and seasonal axial tilt rather than special-case rendering rules.
- map presentation controls.
- map onboarding tooling.
- derived overlay readability (**v1 + v1.1 + substrate lift + persisted `scene.overlayReadability.presentation` + default-stack `perLayer` pilots**, **milestone complete**): grid, analemma, subsolar/sublunar markers, city pins, and static equirect raster overlays (global combined veil → merged `imageBlit` cssFilter, or `perLayer` pass per defaulted row below) scale resolved draw intent upstream (no backend composition policy). v1.1 adds emissive **policy** pressure only (no emissive texture sampling in the readability frame). **Substrate-aware lift scale** derives from effective base-map presentation, **sub-1 brightness dimming** (more lift when the base is dimmed), and catalog `capabilities`: **`overlayOptimized`** / **`darkFriendly`** multiply presentation-derived penalty; **eight** optional intrinsic hints (`reliefShaded`, `boundaryDense`, `chromaticDense`, `bathymetryShaded`, `fineScaleTexture`, `labelDense`, `etchedReliefDense`, `sunGlintDense`) add bounded neutral-presentation penalties (combined intrinsic cap in `substrateOverlayReadabilityLiftScale.ts`). **Presentation** scales the derived combined veil and substrate lift in the shell (Layers tab). **`PerLayer` entries** (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`) optionally apply the same veil/lift scalars again after the shell frame when non-identity. Production path: **one** `OverlayReadabilityFrame` per tick on `TimeContext` when the shell attaches it; layers call `getOverlayReadabilityFrameOrCompute` (fallback computes from `now` if omitted).

Still future or partial:

- full dynamic data lifecycle.
- **Phase 8 base-map catalog:** **`equirect-world-geology-v1`** remains `transitionalPlaceholder: true`; bundled `src` targets **`public/maps/world-equirectangular-geology.jpg`**, which is **not** committed in the default checkout until geology is sourced and onboarded (`PLAN.md` Slice 3, `docs/maps/MAP_ASSET_SOURCES.md`).
- live feeds.
- gridded scientific datasets.
- **extended** composition-aware overlay readability: **`perLayer` pilots beyond the defaulted six ids** when new stack rows ship; **further** substrate modeling beyond the shipped presentation + dimming + intrinsic catalog flags (`overlayOptimized`, `darkFriendly`, `reliefShaded`, `boundaryDense`, `chromaticDense`, `bathymetryShaded`, `fineScaleTexture`, `labelDense`, `etchedReliefDense`, `sunGlintDense`) and future capability axes; **still** without backend policy.
- cloud and weather participation in upstream planetary composition (planning and lifecycle prerequisites).
- **further** atmospheric transition, scattering, or haze refinement beyond **cumulative shipped** twilight tuning in `illuminationShading.ts` on the same continuous field (optional future SceneConfig “twilight softness” only if product warrants it).
- advanced blending, masking, and **additional** emissive or radiance contributors beyond the dedicated night-lights path (only if product scope justifies them; not a generic multi-pass compositor in the backend).
- further tuning of emissive radiance encoding (true linear radiance vs display-encoded JPEG) and optional higher-resolution Black Marble variants.
- alternate projections.
- zoom, pan, tiling, globe view, and camera interaction.
- broad preset system.
- public extension/plugin model.
