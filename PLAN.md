# Project Plan

## Current phase

Libration is in a post-foundation consolidation and feature-expansion phase.

The major runtime foundations are implemented well enough to support disciplined feature-forward work:

- renderer-agnostic RenderPlan pipeline.
- structured chrome model.
- top-band hour-marker semantic path.
- SceneConfig authority.
- curated base-map catalog.
- categorized map selector with **Source & license** attribution block (`BaseMapStyleControl`; catalog `attribution`, optional `licenseNote`, `sourceLinks`), **month-aware selector copy** and **active UTC civil month** indication for Blue Marble families (render-clock `productInstantMs`; not persisted in SceneConfig), and per-family base-map presentation UI.
- map onboarding tooling.
- static and month-aware base-map families (including default reference **`equirect-world-legacy-v1`** with bundled preview, **validated** static global topography **`equirect-world-topography-ne-v1`**, shipped Natural Earth–lineage political **`equirect-world-political-v1`**, shipped USGS public-domain–lineage geology **`equirect-world-geology-v1`**, shipped NOAA ETOPO 2022–lineage bathymetry **`equirect-world-bathymetry-etopo-v1`**, shipped NASA MODIS IGBP land cover **`equirect-world-landcover-modis-v1`**, shipped Beck Köppen–Geiger present-day climate zones **`equirect-world-climate-koppen-beck-v1`**, and shipped NASA SEDAC GPWv4 population density **`equirect-world-population-gpw-v1`**—non-transitional catalog entries with **structured attribution** (`attribution`, optional `licenseNote`, `sourceLinks`) and bundled previews on all **eleven** bundled families—in the bundled catalog; legacy **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** ids remain resolver aliases for Blue Marble **T** month-aware topography).
- static and derived overlays.
- astronomical scene overlays and markers.
- solar shading / dark-side visualization.
- continuous attenuation-driven planetary illumination composition with semantic twilight anchors.
- non-emissive twilight attenuation and atmospheric tint modulation, including **shipped cumulative incremental twilight transition tuning** in `src/renderer/illuminationShading.ts` (**second** and **third** narrow constants-only passes doc-finalized; still one `rasterPatch`).
- physically-derived polar illumination behavior from seasonal solar geometry.
- perceptually legible moonlight composition with configurable presentation modes.
- emissive night-light upstream composition (catalog-backed asset, policy, perceptual luma driver, Layers presentation controls, illustrative defaults).
- derived overlay readability v1 + v1.1 + **substrate-aware lift scale** (including **shipped** sub-1 brightness dimming + catalog **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** intrinsic hints) + **persisted SceneConfig presentation** (`scene.overlayReadability.presentation`) + **`perLayer` pilots for six default-stack rows** (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`; identity-only subtrees omitted on normalize) applying the same veil/lift scalars after the shell frame where set (subsolar veil + emissive **policy** lift + presentation/catalog substrate attenuation → RenderPlan hints; **one** `OverlayReadabilityFrame` per tick on `TimeContext` in production).
- Canvas backend execution.
- AI co-engineering rules and Cursor project rules.

The current strategic objective is **twofold**: (1) **treat the delivered upstream planetary illumination and composition baseline as complete** for standing incremental work—the **eight-intrinsic** substrate lift contract, **third** narrow twilight pass, overlay readability closure, and weather/cloud **planning** are **shipped**; **Slice 2 queues B and C** (standing ninth+ catalog intrinsics and fourth+ constants-only twilight passes) are **closed** as default PR tracks and reopen only with **explicit product scope** (observed readability/terminator issue, new catalog axis, or visual rationale—not agent-invented taxonomy or unbounded tuning); weather/cloud **implementation** remains after Phase 10; and (2) **resume Phase 8 / Slice 3** map inventory when a **new sourced static substrate** (raster + rights) or explicitly scoped catalog polish appears—queue **A (2)** substrates (land cover, bathymetry, climate normals, **population density** **`equirect-world-population-gpw-v1`**) plus **attribution presentation** and **month-aware selector polish** are **shipped** (**queue A (2) closed** until the next sourced family or explicit Slice 4 scope).

### Agent session handoff (planning prompts)

Use this subsection as the **scheduling tie-break** when a new session pastes the standard **planning/discovery starting prompt** and must choose a **single PR-sized** next slice without extra human steering.

**Scheduling snapshot (post–Slice 2 queues B/C closed; queue A (2) closed including population GPW; queue D planning closed):**

| Role | Name | Meaning |
|------|------|---------|
| **Default macro PR track** | **Phase 8 / queue A** (sourced substrate) | **Next merged PR** when raster + rights exist for a new static family, or when the session **explicitly scopes** map-inventory / Slice 4 polish. **No** standing default composition-increment PR. |
| **Primary active execution slice** | **Phase 8 / Slice 3** (when sourced) or **explicit scope** | Map inventory onboarding or human-scoped polish/bugs/features—not Slice 2 **B**/**C** unless the prompt supplies product scope. |
| **Single best next PR** | **Next sourced static substrate** (queue **A**) **or** explicitly scoped work | **Preferred first backlog** when raster + rights exist: **temperature or precipitation climatology** static family (extends climate line; see `docs/maps/MAP_ASSET_STRATEGY.md`). **If no sourced raster in session and no explicit scope:** stop—queues **B**/**C** are **closed** (do not recommend composition filler). |
| **Composition baseline (Slice 2)** | **Closed** (queues **B**/**C**) | **Eight-intrinsic** contract + **third** twilight pass + overlay readability + queue **D** planning **shipped**; ninth+ intrinsics / fourth+ twilight / deeper scattering reopen only with **explicit product scope**. |
| **Map inventory (queue A)** | **Phase 8 / Slice 3** | Re-opens for next **sourced** static substrate; optional Slice 4 polish when explicitly scoped. |

1. **Source of truth:** this `PLAN.md` file (**Current strategic objective**, **Agent session handoff**, **Slice 2** and **Slice 3** near-term sections) plus `docs/ROADMAP.md` (Phases 5–9 and Phase 8 in particular).
2. **Primary active execution slice — two roles (do not conflate):**
   - **Default macro PR track (next merged PR):** **Phase 8 / queue A** when a **sourced static substrate** (raster + rights) or **explicitly scoped** map-inventory / Slice 4 polish is in the session—see table above. **Queue A (2) closed** until the next sourced family. **Slice 2 queues B/C closed** as standing defaults (composition baseline complete). **All eleven** bundled catalog families have `previewThumbnailSrc`, **structured selector attribution**, and **month-aware selector polish** (legacy reference preview + attribution + active UTC month line **closed**).
   - **Composition baseline (not a standing PR queue):** **Slice 2 — Planetary illumination — delivered foundations** — **closed** for default incremental work (eight-intrinsic substrate lift, **third** twilight pass, overlay readability, queue **D** planning). Reopen ninth+ intrinsics, fourth+ twilight, or deeper atmosphere **only** when the session supplies **explicit product scope**—do not invent work to fill a cadence gap.
3. **Prioritized default queue for the *next* PR-sized slice** (inspect repo + catalog; pick the **first** item that is still a real, shippable gap; **one vertical per PR**):
   - **A. Phase 8 / Slice 3 (map inventory and scientific substrate expansion):** one bounded map-inventory / substrate increment aligned with `docs/ROADMAP.md` Phase 8 and **Slice 3** below (use existing `maps:prep` / bundled catalog patterns; do not invent new architecture). **Queue status:** **(1)** richer **attribution presentation** in the map selector — **shipped**; **(2b)** **Slice 4** month-aware selector polish — **shipped**; **(2)** static bathymetry, land cover, climate normals, and **population density** — **shipped** (`**equirect-world-bathymetry-etopo-v1**`, `**equirect-world-landcover-modis-v1**`, `**equirect-world-climate-koppen-beck-v1**`, `**equirect-world-population-gpw-v1**`). **Queue A (2) closed** for the current catalog—**re-opens** only when a **new sourced static substrate** (raster + rights) or explicitly scoped Slice 4 polish is in scope. **Shipped (rolling on this track):** **`equirect-world-legacy-v1`** (default reference; bundled preview `world-equirectangular-thumb.jpg`); **`equirect-world-topography-ne-v1`** (`world-equirectangular-topography.jpg`; **`reliefShaded`**; bundled preview `world-equirectangular-topography-thumb.jpg`); **`equirect-world-political-v1`**, **`equirect-world-geology-v1`**, **`equirect-world-bathymetry-etopo-v1`**, **`equirect-world-landcover-modis-v1`**, **`equirect-world-climate-koppen-beck-v1`**, and **`equirect-world-population-gpw-v1`** (non-transitional; bundled previews; bathymetry ETOPO −180…+180° equirect contract; land cover MODIS IGBP 2019 epoch; climate Beck Köppen–Geiger 1980–2016 present; population GPWv4 2020 log-scaled density); **structured attribution** on all **eleven** bundled families; **month-aware selector** copy + active month line in `BaseMapStyleControl`.
   - **B. Slice 2 — substrate (closed as default track):** ninth+ optional `BaseMapCapabilities` intrinsic — **closed** unless the session supplies **explicit product scope** (defensible flag name + target families); do not invent taxonomy in code alone.
   - **C. Slice 2 — atmosphere (closed as default track):** optional **fourth+** narrow constants-only twilight pass in `illuminationShading.ts` — **closed** unless the session supplies **explicit visual/product rationale**; **third pass shipped**; avoid unbounded subjective tuning loops.
   - **D. Precursor docs:** weather/cloud **planning** (lifecycle prerequisites; doc-focused) when Phase 10 is not yet opened — **shipped** (see closed increment below).
4. **Anti-stall / tie-break:** if **A** is a genuine shippable gap, prefer **A**. When **A** lists both a **missing committed ship raster** (for a catalog family that still declares a target `src` without bytes) and polish-only work, prefer the **missing raster** vertical first. Queue **(2b)** month-aware selector polish is **shipped**—do not re-open unless product scope changes. Queue **D** planning **shipped**—do not repeat planning PRs. **Do not** fall through to Slice 2 **B**/**C** as default next work—queues **B**/**C** are **closed**; optional Slice 4 label/copy hygiene only if explicitly scoped. If queue **A** has **no** shippable increment and the session has **no** explicit scope, state that briefly and stop—do not recommend ninth+ intrinsics or fourth+ twilight as filler PRs.

**Closed and doc-finalized (Slice 2 substrate increment):** optional catalog intrinsic **`sunGlintDense`** (`BaseMapCapabilities`, bounded penalty in `intrinsicSubstrateReadabilityCatalogPenalty01`, bundled curation on Blue Marble **BM**/**T**) — the **eight-intrinsic** upstream overlay-lift contract is now the **active shipped baseline** (not partial). **Queue B (ninth+ default cadence) closed**—see closed increment below; do not reopen BM/T glint coverage without explicit product scope (weather/cloud **planning** closed in queue **D**).

**Closed and doc-finalized (Slice 2 queue B — default substrate-increment cadence):** standing **ninth+** optional `BaseMapCapabilities` intrinsics are **not** the default next PR. The **eight-intrinsic** contract (`reliefShaded` … `sunGlintDense`) is the **complete** substrate-readability baseline for the current product. **Re-opens** only when a session supplies **explicit product scope** (observed overlay/substrate conflict + defensible flag name + target families)—not agent-invented taxonomy.

**Closed and doc-finalized (Slice 2 atmospheric increment — second pass):** **second** narrow cumulative twilight tuning pass in [`src/renderer/illuminationShading.ts`](src/renderer/illuminationShading.ts) (Gaussian sigma, civil–astro anchor chroma, `TWILIGHT_ATMOSPHERIC_ALPHA_MAX`, day-side envelope)—still one `rasterPatch`, still no SceneConfig axis; tests [`src/renderer/illuminationShading.test.ts`](src/renderer/illuminationShading.test.ts).

**Closed and doc-finalized (Slice 2 atmospheric increment — third pass):** **third** narrow constants-only twilight pass in [`src/renderer/illuminationShading.ts`](src/renderer/illuminationShading.ts) (`TWILIGHT_COLOR_SIGMA_DEG` 4.35→4.5, day-side tint clear edge +1.28→+1.38)—smoother anchor coupling after chromatic scientific substrates shipped; still one `rasterPatch`, still no SceneConfig axis; tests [`src/renderer/illuminationShading.test.ts`](src/renderer/illuminationShading.test.ts). **Queue C (fourth+ default cadence) closed**—see closed increment below; do not reopen passes one–three as missing work.

**Closed and doc-finalized (Slice 2 queue C — default twilight-increment cadence):** standing **fourth+** narrow constants-only twilight passes are **not** the default next PR. Cumulative tuning through the **third** pass is the **complete** incremental twilight baseline for the current product. **Re-opens** only with **explicit visual/product rationale** (observed terminator issue)—not filler composition PRs; deeper scattering/haze remains future when product-scoped.

**Closed and doc-finalized (Phase 8 / Slice 3 land cover increment):** **`equirect-world-landcover-modis-v1`** — committed `public/maps/world-equirectangular-landcover.jpg` (5400×2700, −180…+180° equirect from NASA GIBS MODIS IGBP land cover 2019 epoch), `public/maps/previews/world-equirectangular-landcover-thumb.jpg`, catalog `attribution` + `licenseNote` + `sourceLinks` + `previewThumbnailSrc`, **`capabilities.chromaticDense`** + **`fineScaleTexture`**, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts), [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts), and [`src/config/landcoverOnboardedAsset.test.ts`](src/config/landcoverOnboardedAsset.test.ts) (SOF, SHA-256, decoded Amazon / Sahara / Pacific heuristics).


**Closed and doc-finalized (Phase 8 / Slice 3 population density increment):** **`equirect-world-population-gpw-v1`** — committed `public/maps/world-equirectangular-population.jpg` (5400×2700, −180…+180° equirect from NASA SEDAC GPWv4 Rev. 11 2020 30 arc-second density, log₁₀ hypsometric display, CC BY 4.0), `public/maps/previews/world-equirectangular-population-thumb.jpg`, catalog `attribution` + `licenseNote` + `sourceLinks` + `previewThumbnailSrc`, **`capabilities.chromaticDense`** + **`fineScaleTexture`**, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts), [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts), and [`src/config/populationOnboardedAsset.test.ts`](src/config/populationOnboardedAsset.test.ts) (SOF, SHA-256, decoded Delhi / Sahara / Pacific heuristics). **Next** on queue **A:** next sourced substrate when raster + rights exist, or explicitly scoped polish—queues **B**/**C** **closed**.

**Closed and doc-finalized (Phase 8 / Slice 3 climate normals increment):** **`equirect-world-climate-koppen-beck-v1`** — committed `public/maps/world-equirectangular-climate.jpg` (5400×2700, −180…+180° equirect from Beck et al. 2018 present Köppen–Geiger `Beck_KG_V1_present_0p083.tif`, CC BY 4.0), `public/maps/previews/world-equirectangular-climate-thumb.jpg`, catalog `attribution` + `licenseNote` + `sourceLinks` + `previewThumbnailSrc`, **`capabilities.chromaticDense`** + **`fineScaleTexture`**, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts), [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts), and [`src/config/climateNormalsOnboardedAsset.test.ts`](src/config/climateNormalsOnboardedAsset.test.ts) (SOF, SHA-256, decoded Amazon Af / Sahara BWh / Antarctica EF heuristics). **Next** on queue **A:** next sourced substrate when raster + rights exist, or explicitly scoped polish—queues **B**/**C** **closed**.

**Closed and doc-finalized (Phase 8 / Slice 3 bathymetry increment):** **`equirect-world-bathymetry-etopo-v1`** — committed `public/maps/world-equirectangular-bathymetry.jpg` (5400×2700, −180…+180° equirect contract after ETOPO 0…360° dateline roll), `public/maps/previews/world-equirectangular-bathymetry-thumb.jpg`, catalog `attribution` + `licenseNote` + `sourceLinks` + `previewThumbnailSrc`, **`capabilities.bathymetryShaded`** + **`reliefShaded`**, provenance + GDAL/dateline-roll steps in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts), [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts), and [`src/config/bathymetryOnboardedAsset.test.ts`](src/config/bathymetryOnboardedAsset.test.ts) (SOF, SHA-256, decoded west-Pacific hypsometry heuristic). **Remaining in same family (future refinement, not blocking):** alternate products (e.g. GEBCO styling), higher-resolution grids.

**Closed and doc-finalized (Phase 8 / Slice 3 geology increment):** **`equirect-world-geology-v1`** — committed `public/maps/world-equirectangular-geology.jpg` (5400×2700), `public/maps/previews/world-equirectangular-geology-thumb.jpg`, catalog `attribution` + `previewThumbnailSrc`, **`transitionalPlaceholder` cleared**, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts). **Remaining in same family (future refinement, not blocking):** higher-resolution USGS/CGMW source if curated later.

**Closed and doc-finalized (Phase 8 / Slice 3 topography preview increment):** **`equirect-world-topography-ne-v1`** — committed `public/maps/previews/world-equirectangular-topography-thumb.jpg` (800×400), catalog `previewThumbnailSrc`, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts).

**Closed and doc-finalized (Phase 8 / Slice 3 legacy preview increment):** **`equirect-world-legacy-v1`** — committed `public/maps/previews/world-equirectangular-thumb.jpg` (800×400), catalog `previewThumbnailSrc`, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts).

**Closed and doc-finalized (Phase 8 / Slice 3–4 attribution presentation increment):** richer **attribution presentation** in the map selector — catalog optional `licenseNote` and `sourceLinks` (≤2 http(s) links per family) on all **eleven** bundled families; **Source & license** block in [`src/components/config/BaseMapStyleControl.tsx`](src/components/config/BaseMapStyleControl.tsx); tests in [`src/components/config/BaseMapStyleControl.test.tsx`](src/components/config/BaseMapStyleControl.test.tsx) and [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts).

**Closed and doc-finalized (Phase 8 / Slice 4 month-aware selector increment):** month-aware catalog copy for Blue Marble **BM**/**T**/**TB**; `variantMode` on selector options; active **UTC civil month** line in [`BaseMapStyleControl`](src/components/config/BaseMapStyleControl.tsx) when a month-aware family is selected (`formatActiveUtcCivilMonthLabel` in [`src/config/baseMapMonthResolve.ts`](src/config/baseMapMonthResolve.ts)); `productInstantMs` threaded from the render loop when the config panel is open ([`App.tsx`](src/App.tsx) → [`ConfigShell`](src/components/config/ConfigShell.tsx) → [`LayersTab`](src/components/config/LayersTab.tsx)); tests in [`BaseMapStyleControl.test.tsx`](src/components/config/BaseMapStyleControl.test.tsx) and [`baseMapMonthResolve.test.ts`](src/config/baseMapMonthResolve.test.ts). **Next** on queue **A:** next sourced **(2)** substrate when raster + rights exist—see item **3** above.

**Closed and doc-finalized (Slice 2 queue D — weather/cloud planning increment):** [`docs/specs/scene/weather-cloud-composition-plan.md`](docs/specs/scene/weather-cloud-composition-plan.md) — participation models (upstream composition vs projection-space layer vs static climatology substrate), Phase 10 lifecycle prerequisites, canonical-time and RenderPlan boundaries, explicit non-goals. **No runtime or SceneConfig changes.** **Next** on queue **D:** none until Phase 10 opens; implementation follows that spec.

**Handoff when queue A continues (next sourced substrate):** one PR — source raster + rights → `npm run maps:prep` (or GDAL/static export pipeline) → committed raster under `public/maps/` + preview → `base-map-catalog.json` row (`licenseNote` / `sourceLinks` as needed) → [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md) provenance → catalog/resolver + onboarded-asset tests. **Queue (2) shipped:** land cover **`equirect-world-landcover-modis-v1`**, bathymetry **`equirect-world-bathymetry-etopo-v1`**, climate normals **`equirect-world-climate-koppen-beck-v1`**, population density **`equirect-world-population-gpw-v1`**. **Preferred next backlog** (when sourced): temperature or precipitation climatology static family—see `docs/maps/MAP_ASSET_STRATEGY.md`. **When no sourced substrate in session:** queues **B**/**C** are **closed**—do not default to composition increments; optional Slice 4 label hygiene only if explicitly scoped, or stop until explicit scope exists.

## Current goals

1. Keep architecture and docs aligned with actual runtime behavior.
2. Preserve AI co-engineering consistency through repo rules and implementation patterns.
3. Continue disciplined map and scene expansion.
4. Preserve future-feature inventory without prematurely implementing it.
5. Avoid reopening settled foundations unless a real architectural mismatch exists.
6. Preserve the **delivered** planetary composition baseline (twilight through **third** pass, moonlight, emissive, **eight-intrinsic** substrate lift, overlay readability closure); reopen composition increments (**ninth+** intrinsics, **fourth+** twilight, deeper scattering) only with **explicit product scope**; pursue **sourced map inventory** (queue **A**) or other explicitly scoped work as the default PR direction; weather/cloud **implementation** after Phase 10 per the **shipped** planning spec—not standing filler composition PRs.

## Near-term execution slices

### Overlay readability — **phase closed** (v1 + v1.1 + substrate lift + presentation + six default-stack `perLayer` pilots)

**Status:** shipped in production. This phase is **closed**; treat as a settled foundation alongside planetary illumination composition (subsolar veil, emissive policy lift, presentation/catalog–based substrate lift, **persisted** `scene.overlayReadability.presentation` scaling in the shell, and optional per-layer pilots for every **default-stack** readability row (`perLayer.grid`, `perLayer.solarAnalemma`, `perLayer.subsolarMarker`, `perLayer.sublunarMarker`, `perLayer.cityPins`, `perLayer.staticEquirectOverlay`)).

**v1 (subsolar-only veil):** derived solar night-veil hints on lat/lon grid, solar analemma, subsolar/sublunar markers, **city pins** (per-pin veil scalar), and **static equirect raster overlays** (global scalar → merged `imageBlit` `cssFilter` upstream). The app shell attaches **one** `OverlayReadabilityFrame` per tick on `TimeContext`; layers use `getOverlayReadabilityFrameOrCompute`.

**v1.1 (emissive policy lift):** `computeOverlayReadabilityFrameFromTimeMs` accepts normalized **emissive night-light policy** from `scene.illumination.emissiveNightLights` (`mode`, `presentation.intensity`, `presentation.driverExponent`); the shell passes those inputs each tick. `globalReadabilityVeil01` / `readabilityVeil01At` combine subsolar veil with bounded **policy-only** emissive legibility pressure (**no emissive texture sampling** in the readability path). Payload keys remain `OverlayReadabilityHints.nightVeil01` / pin `readabilityNightVeil01` but carry the **combined** scalar for frame-backed overlays.

**Scene presentation scaling (shipped):** normalized `scene.overlayReadability.presentation` (`readabilityVeilScale01` 0–1.5, `overlayLiftMultiplier01` 0.65–1.35, defaults 1) post-processes the derived frame in the shell; Layers tab exposes controls and reset.

**Not in this closed stack (future):** readability pilots for stack rows **beyond** those six defaults (unless new scene rows adopt the same `perLayer.<rowId>` contract); **further** substrate-only heuristics beyond the **shipped** presentation + `overlayOptimized` / `darkFriendly` + **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** + sub-1 brightness dimming model.

**Derived substrate lift (implemented):** `substrateOverlayReadabilityLiftScale01` on `OverlayReadabilityFrame` from effective base-map presentation + catalog `capabilities` (no raster sampling). Presentation **below** default brightness reduces attenuation so overlays keep lift on dimmed bases. Catalog may set optional **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** for small intrinsic attenuation at neutral presentation; hints, static rasters, and city pins carry `overlayReadabilityLiftScale01` into RenderPlan builders.

### Substrate overlay readability heuristics — **shipped** (Slice 2)

**Phase status (narrow increment):** the **eight-intrinsic** catalog contract (including **`etchedReliefDense`** on **`equirect-world-legacy-v1`** and **`sunGlintDense`** on Blue Marble **BM**/**T**) is **shipped** and **closed** for standing incremental work (queue **B** **closed**); treat **further** optional `BaseMapCapabilities` axes as **explicitly scoped** product work only—not a partial rollout or default PR cadence.

**Status:** **shipped** upstream-only lift derivation in `deriveSubstrateOverlayReadabilityLiftScale01` (`src/core/substrateOverlayReadabilityLiftScale.ts`). Sub-1 **effective** brightness scales presentation-derived penalty; **`overlayOptimized`** / **`darkFriendly`** multiply presentation penalty; **eight** optional catalog intrinsics on `BaseMapCapabilities` each add a **bounded** intrinsic penalty at neutral presentation (combined intrinsic penalties capped before merging with presentation penalty): **`reliefShaded`**, **`boundaryDense`**, **`chromaticDense`**, **`bathymetryShaded`**, **`fineScaleTexture`**, **`labelDense`**, **`etchedReliefDense`**, **`sunGlintDense`**. Curator examples: Blue Marble **BM**/**T** → **`fineScaleTexture`** + **`sunGlintDense`**; **TB** → **`reliefShaded`** + **`bathymetryShaded`**; political → **`chromaticDense`** + **`labelDense`**; geology → **`boundaryDense`** + **`chromaticDense`** + **`labelDense`**; legacy world → **`etchedReliefDense`** (with **`darkFriendly`**); static Natural Earth topography **`equirect-world-topography-ne-v1`** → **`reliefShaded`**; bathymetry **`equirect-world-bathymetry-etopo-v1`** → **`bathymetryShaded`** + **`reliefShaded`**; land cover **`equirect-world-landcover-modis-v1`** and climate **`equirect-world-climate-koppen-beck-v1`** → **`chromaticDense`** + **`fineScaleTexture`**. No raster sampling. Tests: `src/core/substrateOverlayReadabilityLiftScale.test.ts`.

**Phase closure (runtime + docs aligned):** treat the **eight** intrinsics above plus `overlayOptimized` / `darkFriendly` multipliers and sub-1 brightness dimming as the **current shipped** substrate-readability catalog contract for overlay lift—not hypothetical.

**Not in this closed baseline (explicit scope only):** additional optional `BaseMapCapabilities` axes **beyond** the shipped **eight**-intrinsic set (`reliefShaded` … `sunGlintDense`) when a session supplies **explicit product scope**—queue **B** default cadence **closed**; **still** no raster sampling unless explicitly scoped.

**Closed increment (documented):** optional catalog **`labelDense`** (dense typography; intrinsic penalty in `intrinsicSubstrateReadabilityCatalogPenalty01`) with bundled curation on **`equirect-world-political-v1`** and **`equirect-world-geology-v1`**; regression coverage in `src/core/substrateOverlayReadabilityLiftScale.test.ts`. Treat as part of the settled substrate contract—not a partial rollout.

**Closed increment — etched relief (documented):** optional catalog **`etchedReliefDense`** (directional etched / scribed shaded relief; intrinsic penalty in `intrinsicSubstrateReadabilityCatalogPenalty01`) with bundled curation on **`equirect-world-legacy-v1`**; regression coverage in `src/core/substrateOverlayReadabilityLiftScale.test.ts`. Treat as part of the settled substrate contract—not a partial rollout.

**Closed increment — sun glint (documented):** optional catalog **`sunGlintDense`** (dense sun glint on open water in natural-color imagery; intrinsic penalty in `intrinsicSubstrateReadabilityCatalogPenalty01`) with bundled curation on **`equirect-world-blue-marble-bm-v1`** and **`equirect-world-blue-marble-t-v1`**; regression coverage in `src/core/substrateOverlayReadabilityLiftScale.test.ts`. Treat as part of the settled substrate contract—not a partial rollout.

### Atmospheric twilight refinement — **shipped; doc-finalized** (Slice 2)

**Status:** **shipped** in runtime and **doc-finalized** for **second** and **third** narrow cumulative passes (Slice 2). Upstream-only tuning in [`src/renderer/illuminationShading.ts`](src/renderer/illuminationShading.ts): wider Gaussian coupling between semantic twilight anchor colors, cooler low-luminance anchor progression (horizon through astronomical anchors), bounded non-emissive atmospheric tint (`TWILIGHT_ATMOSPHERIC_ALPHA_MAX` 0.172), gentler day-side envelope below the shared +4° daylight-clear cutoff, **third pass** sigma 4.35→4.5 and day-side clear edge +1.28→+1.38°. Still **one** planetary illumination `rasterPatch`; **no** new SceneConfig surface or backend composition policy. Tests: [`src/renderer/illuminationShading.test.ts`](src/renderer/illuminationShading.test.ts).

**Not in this closed baseline (explicit scope only):** optional **fourth+** narrow constants-only passes, deeper scattering/haze, or persisted “twilight softness”—queue **C** default cadence **closed**; reopen only with **explicit visual/product rationale**.

### Slice 1: Documentation alignment with source reality

Status: complete (ongoing hygiene only).

Baseline verified: overlay readability **v1 + v1.1 + derived substrate lift + substrate heuristic increments (`reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense`, sub-1 brightness dimming) + persisted presentation scalars + six default-stack `perLayer` pilots**, **cumulative incremental twilight transition tuning** in `illuminationShading.ts` (**second** and **third** narrow passes doc-finalized), **Slice 2 queues B/C closed** (no standing default ninth+ intrinsic or fourth+ twilight PRs), **weather/cloud participation planning** ([`docs/specs/scene/weather-cloud-composition-plan.md`](docs/specs/scene/weather-cloud-composition-plan.md); **no runtime**), **static scientific substrates** **`equirect-world-topography-ne-v1`** / **`equirect-world-political-v1`** / **`equirect-world-geology-v1`** / **`equirect-world-bathymetry-etopo-v1`** / **`equirect-world-landcover-modis-v1`** / **`equirect-world-climate-koppen-beck-v1`** / **`equirect-world-population-gpw-v1`** (non-transitional catalog + structured attribution + bundled previews where applicable), **legacy reference** **`equirect-world-legacy-v1`** bundled preview, **structured selector attribution** on all **eleven** bundled families (**Source & license** block), **month-aware selector polish** (Blue Marble catalog copy, active UTC civil month line, render-clock `productInstantMs` in config UI), and **closed** topography + legacy preview + bathymetry + land cover + climate normals + **population density** + attribution + month-aware selector + queue **D** planning + **third** twilight pass increments are documented as **shipped** across `README.md`, `ARCHITECTURE.md`, `PLAN.md`, `docs/ROADMAP.md`, `docs/FUTURE_FEATURES.md`, `docs/PROJECT_STRATEGY.md`, `docs/DEVELOPMENT_STRATEGY.md`, `docs/AI_COENGINEERING.md`, `AGENTS.md`, `docs/maps/MAP_ASSET_SOURCES.md`, `docs/maps/MAP_ASSET_STRATEGY.md`, and `.cursor/rules/050-docs-and-roadmap.mdc` — not hypothetical; avoid “grid-only pilot”, “v1 only”, “substrate unreadable”, “no twilight tuning”, “only second twilight pass”, “queue B/C still default next”, “ninth intrinsic still required”, “weather/cloud planning not shipped”, “climate normals not shipped”, “population density not shipped”, “climate still next on queue A”, “topography preview missing”, “legacy preview missing”, “bathymetry not shipped”, “land cover not shipped”, “political/geology still transitional placeholder”, “attribution presentation not shipped”, or “month-aware selector not shipped” drift where docs or runtime match source.

### Slice 2: Planetary illumination — extensions on delivered foundations

Status: **baseline closed** for standing incremental work (queues **B**/**C** **closed**—see handoff table). **Delivered foundations** below are settled; **re-open** composition code only with **explicit product scope** (not as default filler PRs). **Default macro track** is **Phase 8 / queue A** or other explicitly scoped work.

**Implemented foundations (treat as settled; extend, do not reopen):**

- solar shading / dark-side visualization.
- coherent upstream planetary illumination composition: **one** illumination `rasterPatch`, SceneConfig-authoritative policy, renderer-agnostic execution.
- continuous attenuation-driven twilight with civil/nautical/astronomical **semantic** anchors (not separate user-facing twilight layers); non-emissive atmospheric tint and attenuation; **cumulative incremental twilight transition tuning** shipped in `illuminationShading.ts` (**second** and **third** narrow passes doc-finalized; see subsection above).
- physically-derived polar illumination behavior from seasonal solar geometry.
- perceptually legible **moonlight** in the same illumination raster, with presentation modes (`off` / `natural` / `enhanced` / `illustrative`) and Layers UI wiring.
- **Emissive city / night lights:** bundled emissive composition catalog, id canonicalization, upstream per-texel sampling, `computeEmissiveNightLightsContributionLinear01` policy, perceptual luma driver (`presentation.driverExponent`), intensity control, Layers **Off / Natural / Enhanced / Illustrative**, illustrative defaults paired with moonlight; validated Black Marble ship asset (see `docs/maps/MAP_ASSET_SOURCES.md`).
- subsolar marker, sublunar marker, solar analemma overlay, and derived astronomical overlays in the layer stack.
- **Overlay readability (v1 + v1.1 + substrate + **substrate heuristic increments** + persisted SceneConfig presentation + six default-stack `perLayer` pilots, derived — closed foundation):** `OverlayReadabilityFrame` from `computeOverlayReadabilityFrameFromTimeMs` (emissive policy + **substrate** inputs: effective base-map presentation + catalog `capabilities`, including optional **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** and sub-1 brightness dimming in lift derivation), then `scene.overlayReadability.presentation` scaling, attached each tick via `TimeContext.overlayReadabilityFrame` and `getOverlayReadabilityFrameOrCompute` in layers; **`perLayer` pilots** for **`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`** optionally repeat the same scalars again for those rows (identity omitted on normalize); `OverlayReadabilityHints` on grid/analemma/marker payloads (`overlayReadabilityLiftScale01` from frame); per-pin `readabilityNightVeil01` on city pins + payload-level lift scale; static equirect raster `readability` + merged `cssFilter` in `buildBaseRasterMapRenderPlan`; vector stroke/alpha via `effectiveOverlayReadabilityLiftVeil01` (no emissive raster sampling in the readability path).
- **Weather/cloud participation (planning — closed foundation, no runtime):** [`docs/specs/scene/weather-cloud-composition-plan.md`](docs/specs/scene/weather-cloud-composition-plan.md) records upstream vs layer vs lifecycle boundaries, Phase 10 prerequisites, and sequencing for future **implementation**; queue **D** doc slice is **shipped**.

**Composition increments (explicit product scope only; queues B/C closed):**

**Scheduling tie-break:** use **`PLAN.md` → “Agent session handoff (planning prompts)”** first. **Do not** default to queue **B** or **C**. **Default next PR** is **queue A** (sourced static substrate) or **explicitly scoped** map polish / other work. Weather/cloud **implementation** waits on Phase 10—follow the **shipped** planning spec; do not reopen queue **D**.

When a session **explicitly scopes** composition work (not as filler), allowed narrow verticals include:

- **Substrate/readability (queue B re-open):** one new optional `BaseMapCapabilities` intrinsic + catalog curation—**requires** defensible flag name + target families in the prompt.
- **Atmosphere (queue C re-open):** one **fourth+** narrow constants-only twilight pass in `illuminationShading.ts`—**requires** explicit visual/product rationale.
- **Deeper atmosphere / scattering:** product-scoped; not a standing default pass.

**Shipped pilots:** `scene.overlayReadability.perLayer` supports the six stack ids above (veil + lift scalars each) after the global frame in `createLatLonGridLayer`, `createSolarAnalemmaLayer`, `createSubsolarMarkerLayer`, `createSublunarMarkerLayer`, `createCityPinsLayer`, and `createStaticEquirectRasterOverlayLayer`; normalized config omits identity-only per-layer subtrees.

**Remaining frontier work (incremental; sequence as dependencies allow):**

- weather / cloud **upstream participation** (depends on Phase 10 lifecycle and [`docs/specs/scene/weather-cloud-composition-plan.md`](docs/specs/scene/weather-cloud-composition-plan.md); **planning closed** in queue **D**).
- **further** atmospheric transition rendering and scattering refinement beyond cumulative shipped twilight tuning on the existing continuous field (not a rewrite of the illumination boundary).
- composition-aware day/night illumination nuances tied to overlays and readability.
- masking, clipping, and blend modes **only when justified** by product scope and readability needs (not as a generic backend compositor).
- active solar-position synchronization along analemma trajectories.

Architectural constraints:

- composition policy remains upstream.
- RenderPlan remains the rendering boundary.
- backend remains product-semantics-free.
- avoid backend-specific composition behavior.
- avoid treating emissive lighting as a generic overlay hack.
- preserve deterministic composition semantics.
- do not introduce a generalized compositor abstraction or backend-owned composition logic.

Exit criteria:

- each extension ships with defined upstream rules, tests at resolver/composition/RenderPlan boundaries, and doc updates.
- atmospheric transitions remain coherent (continuous field preserved unless intentionally replaced with a scoped change).
- astronomical overlays remain correct in scene composition.
- backend remains product-semantics-free.

### Slice 3: Scientific substrate expansion

Status: **default macro track** when a **new sourced static substrate** (raster + rights) or explicitly scoped Slice 4 polish is in scope—queue **A (2) closed** for the current catalog until then (queues **B**/**C** **closed**—see handoff table). **Shipped** reference + static scientific substrates: **`equirect-world-legacy-v1`** (default reference; bundled preview), **`equirect-world-topography-ne-v1`**, **`equirect-world-political-v1`**, **`equirect-world-geology-v1`**, **`equirect-world-bathymetry-etopo-v1`**, **`equirect-world-landcover-modis-v1`**, **`equirect-world-climate-koppen-beck-v1`**, and **`equirect-world-population-gpw-v1`** (non-transitional where applicable; structured attribution + bundled previews on all **eleven** bundled families). **Attribution presentation (Slice 3–4 overlap):** **closed**. **Month-aware selector polish (Slice 4):** **closed** (see closed month-aware increment). **Static trio preview polish:** **closed**. **Legacy reference preview:** **closed**. Legacy **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** ids remain resolver aliases for **`equirect-world-blue-marble-t-v1`**. **Remaining** toward the same slice: next **sourced** static substrates (preferred backlog: temperature/precipitation climatologies), emissive-compatible **substrate** families (distinct from Black Marble composition input), optional selector label hygiene—see `docs/ROADMAP.md` Phase 8. **When queue A has no shippable increment:** queues **B**/**C** remain **closed**—stop or wait for explicit scope; do not default to composition increments.

Candidate work:

- broader inventory polish (selector labels, placeholder hygiene across the young catalog; **month-aware copy and active UTC month line shipped**).
- further terrain refinement (**shipped baseline:** **`equirect-world-topography-ne-v1`**; **future:** higher-resolution DEMs, alternate relief palettes, month-aware terrain families when product-scoped).
- additional climate products (**shipped baseline:** **`equirect-world-climate-koppen-beck-v1`** Köppen–Geiger present; **future:** temperature/precipitation climatologies, Beck V3 epochs).
- emissive-compatible substrate planning.

Exit criteria:

- at least one additional scientifically grounded substrate family is validated and integrated cleanly (**met and extending:** **`equirect-world-topography-ne-v1`**, **`equirect-world-political-v1`**, **`equirect-world-geology-v1`**, **`equirect-world-bathymetry-etopo-v1`**, **`equirect-world-landcover-modis-v1`**, **`equirect-world-climate-koppen-beck-v1`**, **`equirect-world-population-gpw-v1`**; other sourced families still count toward the same Phase 8 bar).

### Slice 4: Map inventory and selector polish

Status: **baseline shipped (overlaps Phase 8 queue A)**—**attribution presentation** and **month-aware selector polish** are **closed** for the current scope. **Re-opens** for optional label/placeholder hygiene when explicitly scoped, or when a **sourced static substrate** becomes available (same default macro track as queue **A**—see handoff table).

Candidate work:

- improve selector copy for month-aware map families — **baseline shipped** (Blue Marble descriptions + active month line); further copy passes optional.
- active displayed-month indication for seasonal families — **shipped** (`Displaying: <month> (UTC civil month N)` in `BaseMapStyleControl`).
- normalize family ids, labels, and categories while catalog is still young.
- finalize placeholder versus validated family states.
- validate all preview thumbnails and metadata (**all bundled families: shipped**).

Exit criteria:

- map inventory feels curated and intentional.
- catalog semantics are stable enough for long-term persistence.
- existing categorized selector and presentation controls scale cleanly as more families are added.

### Slice 5: Dynamic layer lifecycle foundation

Status: future.

Candidate work:

- lifecycle manager.
- acquisition modes.
- cache policies.
- versioned state snapshots.
- stale/error/loading states.
- playback and scrubbed-time readiness.

Exit criteria:

- live or forecast layers can be integrated without fetching during render execution.

## Active architectural guardrails

Do not break these while implementing future work:

- Product time is canonical UTC instant plus selected reference presentation.
- Display formatting must not move canonical time.
- SceneConfig is authoritative for scene content.
- Base-map family ids are persisted, not concrete raster URLs.
- Map catalog is bundled data, not runtime folder scanning.
- Projection defines spatial truth.
- Chrome is screen-space and reserves layout.
- Scene is projection-space and starts below chrome.
- RenderPlan is the rendering boundary.
- Backends execute only.
- Planetary composition semantics remain upstream.

## Recommended next prompt pattern

Use this shape for future implementation prompts:

```text
We are continuing Libration development.

Before editing, read:
- README.md
- ARCHITECTURE.md
- PLAN.md
- AGENTS.md
- docs/ROADMAP.md
- docs/FUTURE_FEATURES.md
- docs/PROJECT_STRATEGY.md
- docs/AI_COENGINEERING.md
- docs/DEVELOPMENT_STRATEGY.md

Task:
<single phase-scoped objective>

Constraints:
- preserve RenderPlan boundary
- keep SceneConfig authoritative
- avoid backend product semantics
- update tests
- update docs if behavior changes

Return:
- files changed
- implementation summary
- tests run
- risks or follow-up work
```

## Current non-goals

Do not start these until their phase is intentionally opened:

- alternate projections.
- zoom/pan camera implementation.
- live data feeds.
- public plugin system.
- GPU backend.
- broad preset UI.
- total UI redesign.
- uncontrolled map ingestion pipelines.
