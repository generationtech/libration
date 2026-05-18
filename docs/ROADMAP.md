# Roadmap

## Purpose

This roadmap records completed phases and planned future phases.

It is intentionally phase-oriented rather than issue-oriented. Detailed current tasks live in `PLAN.md`.

## Phase 0: Initial public foundation

Status: complete.

Delivered:

- Tauri, React, TypeScript desktop app foundation.
- local-first app shell.
- initial world-time visualization.
- AGPL licensing.
- public-release documentation.
- baseline test infrastructure.

## Phase 1: RenderPlan architecture

Status: complete enough for current Canvas path.

Delivered:

- renderer-neutral render intent model.
- executor/backend separation.
- Canvas backend implementation.
- text, rect, line, path, gradient, raster patch, and image primitives.
- bridge modules for Canvas-specific realization.
- backend resource lifecycle reporting for raster image failures.

Remaining future work:

- reduce transitional backend-native path payloads.
- expand primitive coverage only when needed.
- prepare for GPU backend after product semantics are fully upstream.

## Phase 2: Structured chrome and top-band model

Status: complete for supported production path.

Delivered:

- top chrome as screen-space layout.
- reserved scene viewport below chrome.
- structured `chrome.layout.hourMarkers`.
- semantic hour-marker planner.
- hour-marker layout.
- text and procedural realization adapters.
- text, analog clock, radial line, and radial wedge realization families.
- top-band display formatting that does not move canonical time.
- hour-marker editor extraction and axis organization.
- removal of stale flat hour-marker persistence.

Remaining future work:

- polish appearance controls.
- add user-facing clarity for reference-frame and display-format modes.
- revisit accessibility and high-contrast controls.

## Phase 3: Font and glyph subsystem

Status: implemented and usable.

Delivered:

- font asset preprocessing.
- generated font asset database and manifest.
- runtime font registry.
- Canvas font loading and registration.
- typography role resolution.
- procedural glyph emission through RenderPlan-compatible primitives.

Remaining future work:

- font management UI polish.
- additional bundled font curation.
- optional user font import only if it can preserve durable identity and licensing clarity.

## Phase 4: SceneConfig foundation

Status: complete.

Delivered:

- authoritative `SceneConfig`.
- projection id.
- view mode.
- base map config.
- ordered layer stack.
- deterministic ordering.
- scene-authoritative runtime rebuild behavior.
- compatibility from older scene-relevant booleans where needed.

Remaining future work:

- keep legacy compatibility from creeping back into active authoring paths.
- continue strengthening tests around config normalization and migration.

## Phase 5: Curated base-map catalog

Status: complete enough for feature-forward map work.

Delivered:

- bundled JSON base-map catalog.
- family ids, labels, categories, paths, previews, capabilities, defaults, and attribution.
- structured selector attribution on all bundled families (`attribution`, optional `licenseNote`, up to two `sourceLinks`; **Source & license** block in `BaseMapStyleControl`—see Phase 8).
- month-aware selector polish: Blue Marble catalog copy, `variantMode` on selector options, active UTC civil month line when config is open (see Phase 8 / Slice 4).
- selector/editor integration.
- per-family base-map presentation controls.
- static and month-aware variant modes.
- product-time month resolution.
- missing month fallback.
- runtime image failure fallback.
- `maps:prep` onboarding workflow.

Current families include:

- legacy reference map (**`equirect-world-legacy-v1`**, bundled preview `world-equirectangular-thumb.jpg`).
- political map (**`equirect-world-political-v1`**, Natural Earth–lineage shipped raster; not transitional in the bundled catalog).
- geology / geologic provinces substrate (**`equirect-world-geology-v1`**, shipped raster in the bundled catalog; USGS public-domain lineage).
- global bathymetry / relief substrate (**`equirect-world-bathymetry-etopo-v1`**, shipped raster in the bundled catalog; NOAA NCEI ETOPO 2022 lineage).
- global land cover / vegetation substrate (**`equirect-world-landcover-modis-v1`**, shipped raster in the bundled catalog; NASA MODIS IGBP lineage).
- present-day Köppen–Geiger climate zones substrate (**`equirect-world-climate-koppen-beck-v1`**, shipped raster in the bundled catalog; Beck et al. 2018 / GloH2O lineage, CC BY 4.0).
- global population density substrate (**`equirect-world-population-gpw-v1`**, shipped raster in the bundled catalog; NASA SEDAC GPWv4 Rev. 11 lineage, CC BY 4.0).
- validated static Natural Earth–lineage global topography (**`equirect-world-topography-ne-v1`**, `world-equirectangular-topography.jpg`).
- Blue Marble / natural-color families (month-aware **BM**, **T**, **TB**; legacy ids **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** alias to **T** for compatibility).

Remaining future work:

- normalize family ids and labels while catalog is young.
- ensure all placeholder flags match real source status.
- document each source workflow cleanly.
- full-screen **source attribution panel** (Layers detail remains the **Source & license** block only—see `docs/FUTURE_FEATURES.md`).

## Phase 6: Static and derived overlays

Status: partially complete for the full static/derived overlay roadmap; **upstream planetary illumination composition (twilight, moonlight, emissive night lights, single `rasterPatch`) is delivered** and should be treated as a coherent subsystem (see `ARCHITECTURE.md`, `PLAN.md`). **Overlay readability** (v1 + v1.1 + **derived substrate lift** + **substrate heuristic increments** — sub-1 brightness dimming + optional catalog **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** — + **SceneConfig presentation scalars** + **per-layer pilots** for **default stack rows** — `perLayer.grid`, `perLayer.solarAnalemma`, `perLayer.subsolarMarker`, `perLayer.sublunarMarker`, `perLayer.cityPins`, `perLayer.staticEquirectOverlay`) is a **completed milestone** within this phase; broader overlay/editor and astronomical depth remain future work.

Delivered:

- static raster overlay path.
- source-driven overlay construction.
- generalized semantic participation for supported rows.
- derived layer source model.
- solar analemma ground-track overlay.
- subsolar marker.
- sublunar marker.
- solar shading / dark-side visualization.
- continuous attenuation-driven twilight transitions driven by surface solar altitude (civil, nautical, astronomical retained as semantic anchors), encoded in the same planetary illumination raster as day/night rather than a separate user-facing twilight layer.
- non-emissive atmospheric tint and attenuation composition replacing earlier glow-style twilight behavior.
- incremental upstream twilight transition tuning (cumulative constants-only passes in `src/renderer/illuminationShading.ts`, including **second** and **third** narrow passes doc-finalized in `PLAN.md` / Phase 7 here: wider anchor color coupling, cooler low-luminance anchor progression, bounded atmospheric tint cap, gentler day-side tint envelope, third-pass sigma/day-edge refinement)—still one planetary illumination `rasterPatch`, still non-emissive modulation.
- perceptually legible moonlight composition integrated into the same planetary illumination raster.
- bounded cool secondary lunar illumination field with phase, night-eligibility, and local incidence participation.
- scene-level `scene.illumination.moonlight.mode` (`off` / `natural` / `enhanced` / `illustrative`) adjusts composition policy only while preserving renderer/backend boundaries.
- scene-level `scene.illumination.emissiveNightLights` (`mode`, durable `assetId`, `presentation` intensity and driver exponent) for upstream emissive radiance (not a base-map selection); `assetId` canonicalizes through the bundled emissive composition catalog; greenfield default mode is **`illustrative`** (with illustrative moonlight; persisted explicit modes are preserved); Layers UI exposes **Off / Natural / Enhanced / Illustrative** plus night-light intensity and faint-light lift; validated NASA Black Marble 2016 1° JPEG is the shipped default asset (`docs/maps/MAP_ASSET_SOURCES.md`).
- physically-derived polar illumination behavior from seasonal solar geometry.
- astronomical scene participation integrated into the layered scene system.
- **Overlay readability (v1 + v1.1 + substrate + substrate heuristic increments + SceneConfig presentation + default-stack per-layer pilots):** solar night-veil–aligned hints on lat/lon grid, solar analemma polyline, subsolar/sublunar markers, city pins (per-pin combined veil), and static full-viewport equirect raster overlays (global combined veil → merged `imageBlit` cssFilter upstream, or pilots per defaulted row below); **one** `OverlayReadabilityFrame` per tick on `TimeContext` when the shell attaches it (`getOverlayReadabilityFrameOrCompute` in layers); v1.1 folds **emissive night-light policy** (mode + presentation) into the combined veil without emissive raster sampling; **substrate-aware** `substrateOverlayReadabilityLiftScale01` from effective base-map presentation + catalog `capabilities` modulates overlay lift upstream, including optional **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** intrinsic hints and **sub-1 effective brightness** dimming in penalty derivation; **persisted** `scene.overlayReadability.presentation` scales combined veil and substrate lift after the derived frame; optional **`perLayer`** keys **`grid`**, **`solarAnalemma`**, **`subsolarMarker`**, **`sublunarMarker`**, **`cityPins`**, **`staticEquirectOverlay`** apply the same scalars again for those layers only.
- **Catalog curation (substrate lift):** bundled `base-map-catalog.json` marks **`bathymetryShaded`** on **`equirect-world-blue-marble-tb-v1`** (with **`reliefShaded`**) as the curator signal for shaded bathymetry competing with overlays, **`fineScaleTexture`** and **`sunGlintDense`** on Blue Marble **BM**/**T** for fine-scale natural-color texture and dense open-ocean sun glint, **`chromaticDense`** and **`fineScaleTexture`** on **`equirect-world-landcover-modis-v1`** and **`equirect-world-climate-koppen-beck-v1`** for thematic class colors and boundary grain, **`chromaticDense`** and **`fineScaleTexture`** on **`equirect-world-population-gpw-v1`** for log-scaled density ramp and urban grain, **`labelDense`** on **`equirect-world-political-v1`** and **`equirect-world-geology-v1`** (alongside **`chromaticDense`** / boundary+chromatic hints) for dense cartographic typography, **`etchedReliefDense`** on **`equirect-world-legacy-v1`** for packaged etched shaded relief, and **`reliefShaded`** on **`equirect-world-topography-ne-v1`** for the static Natural Earth–lineage global topography raster—no runtime raster sampling.

Remaining future work:

- **Readability extensions (future):** `perLayer` pilots for scene stack rows **beyond** the **six** defaulted ids (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`) when additional rows ship with the same readability contract; **further** substrate heuristics beyond the shipped presentation + `overlayOptimized` / `darkFriendly` + **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** + sub-1 brightness dimming rules (still upstream, no backend policy).
- **further** atmospheric scattering and transition refinement beyond cumulative incremental twilight tuning in the existing continuous twilight field.
- weather/cloud **upstream participation** in planetary composition (ties to Phase 10 lifecycle when opened; **planning shipped** in [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md)).
- active solar-position synchronization along astronomical reference trajectories.
- richer derived astronomical overlays.
- overlay editor refinement.
- opacity and ordering UX.
- source and presentation separation in all new layer types.

## Phase 7: Documentation and AI co-engineering consolidation

Status: active.

Goals:

- consolidate docs.
- preserve future feature inventory.
- create project-level AI working rules.
- add Cursor project rules.
- keep future sessions from re-solving settled architecture.
- keep agent-facing and plan docs aligned with shipped subsystems (e.g. overlay readability …; **cumulative incremental twilight transition tuning** in `illuminationShading.ts`; **structured map selector attribution**; population density **`equirect-world-population-gpw-v1`**; **weather/cloud planning** in `docs/specs/scene/weather-cloud-composition-plan.md`; not stale “v1 only”, “substrate unreadable”, “no twilight tuning”, “weather/cloud planning not shipped”, “population density not shipped”, or “attribution presentation not shipped” phrasing).

Exit criteria:

- docs can onboard a future chat session.
- Cursor receives persistent project rules.
- roadmap and future-feature backlog are explicit.
- stale historical docs are clearly marked historical.

**Completed milestones (rolling):**

- **Atmospheric twilight refinement (incremental):** docs and maturity describe shipped upstream-only **cumulative** tuning in `illuminationShading.ts` (anchor coupling, tint cap, day-side envelope across narrow constants-only passes; **second pass** widened Gaussian sigma, deepened low-luminance anchor chroma, `TWILIGHT_ATMOSPHERIC_ALPHA_MAX` 0.172, day envelope to `dayClear`+1.28°; **third pass** sigma 4.5, day envelope to `dayClear`+1.38°); **further** scattering/haze and optional persisted softness remain future (`PLAN.md` Slice 2, Phase 6/9).
- **Overlay readability + substrate catalog (shipped baseline, doc-finalized):** docs describe `scene.overlayReadability.presentation`, default-stack `perLayer` keys (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`), and the **eight-intrinsic** substrate lift rules (`reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense`, sub-1 brightness dimming, `overlayOptimized` / `darkFriendly`). Curator notes live in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md) and [`docs/maps/MAP_ASSET_STRATEGY.md`](docs/maps/MAP_ASSET_STRATEGY.md). **Next** readability work is **additional** optional catalog/resolver substrate signals **beyond** that eight-flag intrinsic set (plus presentation multipliers) and **`perLayer` coverage for stack rows beyond the six defaults** when product-ready (Phase 6 “remaining” extensions).
- **Substrate intrinsic `labelDense` (Slice 2 shipped):** optional `capabilities.labelDense` on **`equirect-world-political-v1`** and **`equirect-world-geology-v1`** in the bundled catalog; intrinsic penalty in `src/core/substrateOverlayReadabilityLiftScale.ts`; tests in `src/core/substrateOverlayReadabilityLiftScale.test.ts`.
- **Substrate intrinsic `etchedReliefDense` (Slice 2 shipped):** optional `capabilities.etchedReliefDense` on **`equirect-world-legacy-v1`** in the bundled catalog; intrinsic penalty in `src/core/substrateOverlayReadabilityLiftScale.ts`; tests in `src/core/substrateOverlayReadabilityLiftScale.test.ts`.
- **Substrate intrinsic `sunGlintDense` (Slice 2 shipped):** optional `capabilities.sunGlintDense` on **`equirect-world-blue-marble-bm-v1`** and **`equirect-world-blue-marble-t-v1`** in the bundled catalog; intrinsic penalty in `src/core/substrateOverlayReadabilityLiftScale.ts`; tests in `src/core/substrateOverlayReadabilityLiftScale.test.ts`.
- **Eight-intrinsic substrate overlay-lift contract (doc-finalized):** product docs, map asset notes, and rules describe the **shipped** optional catalog intrinsics through **`sunGlintDense`** as the **complete** substrate-readability baseline; **Slice 2 queue B default cadence closed**—ninth+ axes reopen only with explicit product scope.
- **Slice 2 queue B — default substrate-increment cadence (closed):** standing ninth+ `BaseMapCapabilities` intrinsics are **not** the default next PR; see `PLAN.md` closed increment.
- **Slice 2 queue C — default twilight-increment cadence (closed):** standing fourth+ constants-only twilight passes are **not** the default next PR; cumulative tuning through the **third** pass is the complete incremental twilight baseline; see `PLAN.md` closed increment.
- **Phase 8 / Slice 3 topography preview (closed):** **`equirect-world-topography-ne-v1`** bundled preview (`world-equirectangular-topography-thumb.jpg`, catalog `previewThumbnailSrc`, tests); see `PLAN.md` closed increment.
- **Phase 8 / Slice 3 legacy preview (closed):** **`equirect-world-legacy-v1`** bundled preview (`world-equirectangular-thumb.jpg`, catalog `previewThumbnailSrc`, tests)—all bundled base-map families now have catalog previews; see `PLAN.md` closed increment.
- **Phase 8 / Slice 3 bathymetry (closed):** **`equirect-world-bathymetry-etopo-v1`** ship raster + preview + catalog + ETOPO dateline-roll provenance; registration regression in `src/config/bathymetryOnboardedAsset.test.ts`; see `PLAN.md` closed increment.
- **Phase 8 / Slice 3 land cover (closed):** **`equirect-world-landcover-modis-v1`** ship raster + preview + catalog + GIBS/MODIS IGBP provenance; registration regression in `src/config/landcoverOnboardedAsset.test.ts`; see `PLAN.md` closed increment.
- **Phase 8 / Slice 3 population density (closed):** **`equirect-world-population-gpw-v1`** ship raster + preview + catalog + GPWv4 provenance; registration regression in `src/config/populationOnboardedAsset.test.ts`; see `PLAN.md` closed increment.
- **Phase 8 / Slice 3 climate normals (closed):** **`equirect-world-climate-koppen-beck-v1`** ship raster + preview + catalog + Beck Köppen–Geiger provenance; registration regression in `src/config/climateNormalsOnboardedAsset.test.ts`; see `PLAN.md` closed increment.
- **Phase 8 / Slice 3 map inventory (queue A (2) closed):** all **eleven** bundled catalog families have `previewThumbnailSrc` (legacy + static scientific substrates + Blue Marble) and **structured attribution** in the selector (**Source & license** block; catalog `licenseNote` + `sourceLinks`)—**default next** **Phase 8 / queue A** when sourced substrate or explicit scope exists; **Slice 2 queues B/C closed** (`PLAN.md` handoff).
- **Phase 8 / Slice 4 month-aware selector (closed):** Blue Marble catalog copy, `variantMode` on selector options, active UTC civil month line in `BaseMapStyleControl`, `productInstantMs` from render loop when config is open; see `PLAN.md` closed increment.
- **Phase 8 / Slice 3–4 attribution presentation (closed):** richer attribution in `BaseMapStyleControl` + catalog fields on all **eleven** bundled families; see `PLAN.md` closed increment.
- **Slice 2 queue D — weather/cloud planning (closed):** [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md); implementation blocked on Phase 10 lifecycle; see `PLAN.md` closed increment.

## Phase 8: Map inventory and scientific substrate expansion

Status: planned (**in progress**; queue **A (2)** **closed** for current catalog). **Default next macro PR track:** **Phase 8 / queue A** (sourced static substrate or explicitly scoped polish) per `PLAN.md` handoff—**Slice 2 queues B/C closed** (composition baseline complete). **Structured attribution presentation** and **month-aware selector polish** **shipped** (queue **A** items **(1)** and **(2b)** closed). **Queue (2) shipped:** land cover **`equirect-world-landcover-modis-v1`**, bathymetry **`equirect-world-bathymetry-etopo-v1`**, climate normals **`equirect-world-climate-koppen-beck-v1`**, population density **`equirect-world-population-gpw-v1`**. **Preferred next backlog (when sourced):** temperature or precipitation climatology static family. Queue **D** weather/cloud **planning** **shipped**—implementation blocked on Phase 10.

**Rolling delivered (Slice 3 / Phase 8):**

- Default reference substrate **`equirect-world-legacy-v1`** (`public/maps/world-equirectangular.jpg`; preview `public/maps/previews/world-equirectangular-thumb.jpg`). See [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md).
- Validated static Natural Earth–lineage global topography base-map family **`equirect-world-topography-ne-v1`** (`public/maps/world-equirectangular-topography.jpg`; bundled catalog sets **`reliefShaded`** for upstream overlay lift; preview `public/maps/previews/world-equirectangular-topography-thumb.jpg`; legacy **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** scene ids remain resolver aliases for **`equirect-world-blue-marble-t-v1`**). See [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md).
- Shipped political/reference substrate **`equirect-world-political-v1`** (`public/maps/world-equirectangular-political.jpg`; bundled catalog **without** `transitionalPlaceholder`; Natural Earth attribution; preview `public/maps/previews/world-equirectangular-political-thumb.jpg`). See [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md).
- Shipped geology / geologic provinces substrate **`equirect-world-geology-v1`** (`public/maps/world-equirectangular-geology.jpg`; bundled catalog **without** `transitionalPlaceholder`; USGS public-domain attribution; preview `public/maps/previews/world-equirectangular-geology-thumb.jpg`). See [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md).
- Shipped bathymetry / global relief substrate **`equirect-world-bathymetry-etopo-v1`** (`public/maps/world-equirectangular-bathymetry.jpg`; bundled catalog **without** `transitionalPlaceholder`; NOAA NCEI ETOPO 2022 attribution; preview `public/maps/previews/world-equirectangular-bathymetry-thumb.jpg`; **`bathymetryShaded`** + **`reliefShaded`**). See [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md).
- Shipped land cover / vegetation substrate **`equirect-world-landcover-modis-v1`** (`public/maps/world-equirectangular-landcover.jpg`; bundled catalog **without** `transitionalPlaceholder`; NASA MODIS IGBP attribution; preview `public/maps/previews/world-equirectangular-landcover-thumb.jpg`; **`chromaticDense`** + **`fineScaleTexture`**). See [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md).
- Shipped Köppen–Geiger climate zones substrate **`equirect-world-climate-koppen-beck-v1`** (`public/maps/world-equirectangular-climate.jpg`; bundled catalog **without** `transitionalPlaceholder`; Beck et al. 2018 CC BY 4.0 attribution; preview `public/maps/previews/world-equirectangular-climate-thumb.jpg`; **`chromaticDense`** + **`fineScaleTexture`**). See [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md).
- Shipped GPWv4 population density substrate **`equirect-world-population-gpw-v1`** (`public/maps/world-equirectangular-population.jpg`; bundled catalog **without** `transitionalPlaceholder`; NASA SEDAC GPWv4 CC BY 4.0 attribution; preview `public/maps/previews/world-equirectangular-population-thumb.jpg`; **`chromaticDense`** + **`fineScaleTexture`**). See [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md).

Candidate deliverables:

- further map selector polish (labels, placeholder hygiene; month-aware copy and active UTC civil month indication **shipped** in Slice 4).
- broader map selector copy and placeholder hygiene across the young catalog.
- additional climate products (**shipped baseline:** **`equirect-world-climate-koppen-beck-v1`**; **future:** temperature/precipitation climatologies, alternate Köppen epochs).
- additional night-light or emissive-compatible **substrate** families (distinct from the composition-input Black Marble path).
- seasonal natural-color refinements.

## Phase 9: Planetary scene composition and illumination — incremental extensions

Status: planned (**extends** Phase 6 production baseline; **composition baseline closed** for standing Slice 2 **B**/**C** default cadence — **no** new rendering boundary).

The subsystem **baseline is delivered** (`PLAN.md` Slice 2): readability v1 + v1.1 + **eight-intrinsic** substrate lift + presentation + **six** default-stack `perLayer` pilots + **third** twilight pass. **Further** substrate signals, atmosphere tuning, and clouds/weather reopen only with **explicit product scope** or Phase 10 prerequisites—not as standing default PRs.

Candidate deliverables:

- **Readability extensions:** `perLayer` readability for scene stack rows **beyond** those six defaulted ids when product-defined; finer semantics when multiple overlay rows share one pilot key (e.g. static equirect); **further** substrate heuristics beyond presentation + `overlayOptimized` / `darkFriendly` + **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** + sub-1 brightness dimming when product needs them.
- higher-fidelity atmospheric scattering, glow, and transition tuning on top of the existing continuous attenuation-driven twilight model (cumulative incremental non-emissive twilight tuning is already shipped in `illuminationShading.ts`; deeper fidelity remains).
- weather/cloud participation in planetary composition (after Phase 10 lifecycle; follows [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md)—**planning closed**).
- composition-aware day/night illumination nuances tied to overlays and substrate.
- blending modes, masking, and clipping **only when justified** by readability or data participation needs (not as an open-ended backend compositor).
- optional **additional** emissive or radiance contributors beyond the dedicated Black Marble path if product scope requires them.

Architectural direction:

- atmospheric attenuation, reflected illumination, and emissive illumination already participate in one coherent upstream planetary composition model; Phase 9 **deepens and widens** that model.
- composition semantics remain upstream.
- RenderPlan remains the rendering boundary.
- backend remains unaware of planetary composition policy.
- future weather/cloud systems should participate in scene composition rather than acting as isolated overlays.

Delivered in Phase 6 (emissive MVP and integration **complete** for current scope):

- typed emissive presentation modes, deterministic solar-altitude visibility gate, moonlight coexistence scaling, and `scene.illumination.emissiveNightLights` normalization.
- bundled emissive composition catalog plus resolver (`resolveEmissiveCompositionAssetIdToCanonicalId`); unknown or blank `assetId` values canonicalize to the catalog default.
- emissive radiance sampled into the same upstream planetary illumination raster as solar/twilight/moonlight when mode is not `off` and the resolved raster decodes; otherwise contribution is zero; Layers tab mode control; onboarded asset validation (dimensions + SHA-256) in CI; perceptual luma driver via `presentation.driverExponent`.

Remaining under Phase 9 (**composition expansion**, not baseline emissive or settled overlay readability **v1 + v1.1 + substrate lift + substrate heuristic increments + presentation scalars + six default-stack `perLayer` pilots** delivery):

- readability extensions (`perLayer` beyond the shipped six defaults where needed; finer multi-row static-raster semantics; **further** substrate modeling beyond the shipped presentation + dimming + `reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense` + `overlayOptimized` / `darkFriendly` model).
- **further** weather/cloud **implementation** (planning in [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md)), **further** atmospheric refinement beyond cumulative shipped twilight tuning, and optional higher-resolution or alternate-year emissive assets when curated.

## Phase 10: Dynamic data lifecycle

Status: future.

Candidate deliverables:

- lifecycle manager.
- acquisition modes.
- cache policies.
- versioned snapshots.
- loading/stale/error states.
- playback/scrubbing readiness.
- live and forecast data preparation.

Candidate future layers:

- weather.
- clouds.
- radar.
- aircraft.
- shipping.
- earthquakes or volcanoes.
- aurora forecasts.
- satellite paths.

## Phase 11: Scene view and projection expansion

Status: future.

Candidate deliverables:

- zoom and pan.
- viewport clipping.
- tile readiness.
- alternate projections.
- globe or perspective view.
- scene interaction.
- inverse projection for hover/click inspection.

## Phase 12: Preset system

Status: future.

Candidate deliverables:

- named partial config presets.
- explicit preset application order.
- last-write-wins semantics.
- preset stacks.
- narrow appearance presets.
- scene/layer presets.
- export/import of presets.

## Phase 13: Renderer expansion

Status: future.

Candidate deliverables:

- GPU renderer feasibility study.
- backend capability matrix.
- performance instrumentation.
- renderer-independent visual tests where practical.
- bare-metal NVIDIA path only after upstream contracts are stable.
