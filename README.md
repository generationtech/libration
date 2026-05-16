# Libration

Libration is a local-first, renderer-agnostic world time instrument.

It is a canonical reference implementation of a longitude-first global time visualization system. The product treats the world as a continuous 360 degree spatial structure, resolves one authoritative UTC instant per frame, and presents civil time through a selected reference frame without making political time zones the structural basis of the display.

![Libration application screenshot](docs/images/libration-hero.png)

## What Libration is

Libration is a precision-rendered desktop application for visualizing world time, map context, and future global scene layers.

Core product traits:

- Longitude-first structural model with 24 fixed 15 degree sectors.
- One authoritative UTC instant per frame.
- Reference-frame presentation for user-facing civil time.
- Screen-space display chrome separated from projection-space scene content.
- Renderer-agnostic `RenderPlan` pipeline.
- Curated, projection-valid map assets.
- SceneConfig-driven base map and layer composition.
- AGPL-3.0 user-freedom licensing.

Libration is independently developed and is not affiliated with any existing commercial time-map product.

## Current capabilities

Current implemented areas include:

- Tauri, React, TypeScript, Vite desktop app.
- Structured `LibrationConfigV2` persistence and normalization.
- Top-band display chrome with hour markers, tickmark tape, and NATO structural zone row.
- Structured hour-marker configuration under `chrome.layout.hourMarkers`.
- Text and procedural hour-marker realizations.
- Bundled font asset registry and Canvas font realization.
- Renderer-neutral `RenderPlan` primitives for text, rects, lines, paths, gradients, image blits, and raster patches.
- Canvas backend execution through bridge modules.
- SceneConfig-driven map scene.
- File-backed curated base-map catalog (optional **`capabilities`** for upstream overlay lift: **eight shipped** intrinsic hints **`reliefShaded`**, **`boundaryDense`**, **`chromaticDense`**, **`bathymetryShaded`**, **`fineScaleTexture`**, **`labelDense`**, **`etchedReliefDense`**, **`sunGlintDense`**, plus presentation multipliers **`overlayOptimized`** / **`darkFriendly`**).
- Categorized base-map selector UI with grouped substrate families and per-family **Source & license** attribution (catalog `attribution`, optional `licenseNote`, up to two `sourceLinks`).
- Default reference legacy world substrate (**`equirect-world-legacy-v1`**, bundled preview thumbnail; main raster `world-equirectangular.jpg`).
- Static and month-aware base-map families.
- Validated static global shaded-relief topography substrate (**`equirect-world-topography-ne-v1`**, Natural Earth–lineage raster in the bundled catalog with bundled preview thumbnail; historical ids **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** remain resolver aliases for the month-aware Blue Marble **T** family).
- Natural Earth–lineage political/reference substrate (**`equirect-world-political-v1`**, shipped raster in the bundled catalog with attribution and preview thumbnail; not a transitional placeholder).
- USGS public-domain geology / geologic provinces substrate (**`equirect-world-geology-v1`**, shipped raster in the bundled catalog with attribution and preview thumbnail; not a transitional placeholder).
- Per-family base-map presentation controls for brightness, contrast, gamma, and saturation.
- Shared family-level presentation persistence across seasonal/month-aware raster variants.
- Map preview and **Source & license** attribution block for selected base-map families (catalog `attribution`, optional `licenseNote`, and up to two `sourceLinks`).
- Month-aware base-map selector copy and **active UTC civil month** indication for Blue Marble families (follows instrument time via render clock; not stored in SceneConfig).
- Static and derived scene overlays.
- Solar analemma ground-track overlay.
- Coherent **upstream planetary illumination** subsystem: SceneConfig-resolved policy composes solar day/night, twilight, moonlight, and emissive inputs into **one** `rasterPatch` for the Solar shading path (no backend-side composition branching).
- Solar day/night shading on the “Solar shading” layer, implemented as a continuous, attenuation-driven solar-altitude illumination field using civil/nautical/astronomical thresholds as semantic anchors.
- Twilight composition integrated directly into the same upstream planetary illumination raster as day/night (not a separate user-facing twilight layer).
- Upstream twilight field: **shipped** cumulative incremental transition tuning in `src/renderer/illuminationShading.ts` (smoother anchor coupling, cooler terminator progression, gentler day-side atmospheric envelope; **second** narrow constants-only pass doc-finalized in `PLAN.md` / `docs/ROADMAP.md`; still one `rasterPatch`; non-emissive only).
- Non-emissive twilight behavior: atmospheric tint and attenuation modulate substrate visibility rather than adding artificial glow.
- Perceptually tuned lunar secondary illumination in the same upstream planetary illumination raster: moon phase, lunar altitude, and surface incidence gate a bounded cool additive field plus a secondary transmittance lift on the night mask, giving a broad directional moonlit read near high lunar incidence while daylight/early twilight stay strongly suppressed and new moon / moon-below-horizon stay effectively unchanged.
- Emissive night lights (NASA Black Marble–based composition raster) sampled upstream into that same planetary illumination raster, with presentation modes **Off / Natural / Enhanced / Illustrative** under Scene layers (default **Illustrative** alongside default **Illustrative** moonlight); durable `assetId` is catalog-backed and not surfaced as a base-map family. Layers also expose **intensity** and **faint-light lift** (driver exponent) tuning under `scene.illumination.emissiveNightLights.presentation`, persisted with the scene.
- Polar illumination behavior derived from real seasonal solar geometry and Earth axial tilt.
- **Derived overlay readability (v1 + v1.1 + substrate lift + persisted SceneConfig presentation + six default-stack `perLayer` pilots, production-complete):** lat/lon grid, solar analemma, subsolar/sublunar markers, and reference/custom **city pins** use `OverlayReadabilityHints` / per-pin `readabilityNightVeil01` from `OverlayReadabilityFrame` (subsolar night veil; **v1.1** folds emissive **policy** from `scene.illumination.emissiveNightLights` into `readabilityVeil01At` / `globalReadabilityVeil01`; no emissive texture sampling). **Substrate lift:** `substrateOverlayReadabilityLiftScale01` (0.35–1) from **effective** base-map presentation + catalog `capabilities`, computed in the shell each tick—attenuates merged `cssFilter` and vector stroke/alpha lift when the base map is already visually strong (no base-map pixel sampling); **below-default brightness** preserves more lift on dimmed bases; optional catalog **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** apply small neutral-presentation attenuation for relief-rich, linework-dense, strong thematic-hue, shaded-bathymetry, fine-scale sensor/photographic texture, dense cartographic typography, directional etched/scribed shaded-relief art, or dense open-ocean sun glint in natural-color imagery. **Scene presentation (persisted):** `scene.overlayReadability.presentation.readabilityVeilScale01` (0–1.5) and `overlayLiftMultiplier01` (0.65–1.35), defaults 1, normalize with the scene; Layers exposes sliders + reset. **`PerLayer` tuning:** `scene.overlayReadability.perLayer` keys **`grid`**, **`solarAnalemma`**, **`subsolarMarker`**, **`sublunarMarker`**, **`cityPins`**, and **`staticEquirectOverlay`** repeat the same veil/lift scalars for those stack rows only after the global presentation (Layers exposes pilot controls + reset per row; identity-only subtrees omitted on normalize). **Static equirect raster overlays** use the global combined veil + lift scale unless a static-equirect pilot is set; `buildBaseRasterMapRenderPlan` merges presentation `cssFilter` with the readability fragment. **One** `OverlayReadabilityFrame` per tick on `TimeContext`; layers use `getOverlayReadabilityFrameOrCompute` (fallback without a shell frame remains subsolar-only for policy/substrate/presentation—production attaches the frame).
- Canvas backend execution remains renderer-agnostic and only consumes the resulting `rasterPatch`.
- Runtime base-map image load failure fallback.

## Architecture in one sentence

Libration resolves product meaning upstream through configuration, resolvers, semantic planners, layout, and realization adapters, then emits backend-neutral render plans that the backend executes mechanically.

```mermaid
flowchart LR
    CFG[Config and Time Context] --> RES[Resolvers]
    RES --> SEM[Semantic Planning]
    SEM --> LAY[Layout]
    LAY --> ADA[Adapters]
    ADA --> RP[RenderPlan]
    RP --> EX[Executor]
    EX --> BE[Backend]
```

## Documentation map

Start here:

- [ARCHITECTURE.md](ARCHITECTURE.md) - stable system architecture.
- [PLAN.md](PLAN.md) - current phase, immediate priorities, and next execution slices.
- [AGENTS.md](AGENTS.md) - persistent AI co-engineering rules for ChatGPT and Cursor.
- [docs/PROJECT_STRATEGY.md](docs/PROJECT_STRATEGY.md) - product and project strategy.
- [docs/DEVELOPMENT_STRATEGY.md](docs/DEVELOPMENT_STRATEGY.md) - implementation criteria and engineering rules.
- [docs/ROADMAP.md](docs/ROADMAP.md) - completed and planned phases.
- [docs/FUTURE_FEATURES.md](docs/FUTURE_FEATURES.md) - retained feature backlog.
- [docs/AI_COENGINEERING.md](docs/AI_COENGINEERING.md) - how this project uses ChatGPT and Cursor.
- [docs/maps/MAP_ASSET_STRATEGY.md](docs/maps/MAP_ASSET_STRATEGY.md) - map sourcing, onboarding strategy, and catalog **`capabilities`** roles (including overlay-readability hints).
- [docs/maps/MAP_ASSET_SOURCES.md](docs/maps/MAP_ASSET_SOURCES.md) - map source inventory and base-map **capabilities** notes (including overlay-readability catalog hints).

Note:

- The prior large spec archive was intentionally retired during documentation consolidation.
- Durable architecture intent now lives primarily in `ARCHITECTURE.md`, `PLAN.md`, the roadmap, and the focused strategy documents.
- **AI planning / discovery sessions:** after the docs above, read **`PLAN.md` → “Agent session handoff (planning prompts)”** for the repo’s **default macro PR track** (**Phase 8 / Slice 3**, queue **A**), **primary active execution slice** (same), and **single best next PR** (next **A**-class substrate when sourced). **Structured attribution** and **month-aware selector polish** (active UTC civil month for Blue Marble families) are **shipped**. **Slice 2** is the composition *program* when queue **A** has no shippable increment or the session scopes composition only.
- New specs should only be reintroduced when they provide durable contract value rather than duplicating implementation detail.

## Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Prepare map assets:

```bash
npm run maps:prep -- --help
```

Prepare font assets:

```bash
npm run fonts:prep
```

## Licensing

Libration is licensed under the GNU Affero General Public License v3.0.

The AGPL preserves the freedom to inspect, study, modify, share, and benefit from improvements to the software, including when the software is used over a network.
