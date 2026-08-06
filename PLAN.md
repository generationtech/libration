# Project Plan

## Current phase

Libration is in a post-foundation consolidation and feature-expansion phase. **Default next track:** Phase 10 (dynamic data lifecycle); remaining Phase 8 map inventory and Phase 9 composition work are deferred until after Phase 10.

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

The current strategic objective is **twofold**: (1) **treat the delivered upstream planetary illumination and composition baseline as complete** for standing incremental work—the **eight-intrinsic** substrate lift contract, **third** narrow twilight pass, overlay readability closure, and weather/cloud **planning** are **shipped**; **Slice 2 queues B and C** (standing ninth+ catalog intrinsics and fourth+ constants-only twilight passes) are **closed** as default PR tracks and reopen only with **explicit product scope** (observed readability/terminator issue, new catalog axis, or visual rationale—not agent-invented taxonomy or unbounded tuning); and (2) **execute Phase 10 / Slice 5** via sequenced **`P10-*`** steps in [`docs/specs/scene/dynamic-data-lifecycle-plan.md`](docs/specs/scene/dynamic-data-lifecycle-plan.md) (next **`P10-1`**; lifecycle only—no user-facing dynamic overlay until post–Phase 10 **`DLC-*`**)—queue **A (2)** substrates (land cover, bathymetry, climate normals, **population density** **`equirect-world-population-gpw-v1`**) plus **attribution presentation** and **month-aware selector polish** are **shipped**; **remaining Phase 8 / Slice 3–4 map inventory** (next sourced static substrates, temperature/precipitation climatology, optional selector hygiene) and **Phase 9 composition extensions** are **deferred until after Phase 10**.

### Agent session handoff (planning prompts)

Use this subsection as the **scheduling tie-break** when a new session pastes the standard **planning/discovery starting prompt** and must choose a **single PR-sized** next slice without extra human steering.

**Scheduling snapshot (Phase 10 active — next step `P10-1`; Phase 8/9 remaining deferred; Slice 2 queues B/C closed; queue A (2) closed; queue D weather planning closed; DLC consumers after `P10-7`):**

| Role | Name | Meaning |
|------|------|---------|
| **Default macro PR track** | **Phase 10 / Slice 5** (dynamic data lifecycle) | **Next merged PR track.** Sequenced steps `P10-1`…`P10-7` in the lifecycle plan. **No** user-facing dynamic layer in Phase 10. Post–Phase 10 **DLC** consumers (first: global equirect clouds/IR). |
| **Primary active execution slice** | **Phase 10 / Slice 5** | Dynamic data lifecycle—not Phase 8 map inventory, not Phase 9 composition, not Slice 2 **B**/**C** unless the prompt supplies product scope. |
| **Single best next PR** | **Next pending Phase 10 step** (`P10-*`) | Implement the **first non-shipped** step in [`docs/specs/scene/dynamic-data-lifecycle-plan.md`](docs/specs/scene/dynamic-data-lifecycle-plan.md) (currently **`P10-1`**). One step per session. **Do not** ship user-facing dynamic overlays in Phase 10; **do not** default to Phase 8/9 or composition filler. |
| **Composition baseline (Slice 2)** | **Closed** (queues **B**/**C**) | **Eight-intrinsic** contract + **third** twilight pass + overlay readability + queue **D** planning **shipped**; ninth+ intrinsics / fourth+ twilight / deeper scattering reopen only with **explicit product scope**. |
| **Map inventory (queue A)** | **Phase 8 / Slice 3 — deferred post–Phase 10** | Queue **A (2) closed** for current catalog; **remaining** sourced substrates / Slice 4 polish **resume after Phase 10** (preferred backlog then: temperature or precipitation climatology). |
| **Phase 9 composition** | **Deferred post–Phase 10** | Readability/atmosphere extensions beyond the closed baseline—after Phase 10, or earlier only with **explicit product scope**. |

1. **Source of truth:** this `PLAN.md` file (**Current strategic objective**, **Agent session handoff**, **Slice 5** and deferred **Slice 3** near-term sections) plus `docs/ROADMAP.md` (Phase 10 in particular; Phases 8–9 deferred remaining work).
2. **Primary active execution slice — two roles (do not conflate):**
   - **Default macro PR track (next merged PR):** **Phase 10 / Slice 5** (dynamic data lifecycle)—see table above. **Queue A (2) closed**; remaining Phase 8 map inventory and Phase 9 composition extensions are **deferred until after Phase 10**. **Slice 2 queues B/C closed** as standing defaults (composition baseline complete). **All eleven** bundled catalog families have `previewThumbnailSrc`, **structured selector attribution**, and **month-aware selector polish** (legacy reference preview + attribution + active UTC month line **closed**).
   - **Composition baseline (not a standing PR queue):** **Slice 2 — Planetary illumination — delivered foundations** — **closed** for default incremental work (eight-intrinsic substrate lift, **third** twilight pass, overlay readability, queue **D** planning). Reopen ninth+ intrinsics, fourth+ twilight, or deeper atmosphere **only** when the session supplies **explicit product scope**—do not invent work to fill a cadence gap.
3. **Prioritized default queue for the *next* PR-sized slice** (inspect repo; pick the **first** item that is still a real, shippable gap; **one vertical per PR**):
   - **E. Phase 10 / Slice 5 (dynamic data lifecycle) — default next:** the **first pending** `P10-*` step in [`docs/specs/scene/dynamic-data-lifecycle-plan.md`](docs/specs/scene/dynamic-data-lifecycle-plan.md) (see Slice 5 **Active step**). One step per PR/session. **Do not** implement user-facing weather/cloud overlays during Phase 10; follow weather participation models only after lifecycle exit (`DLC-*`).
   - **A. Phase 8 / Slice 3 (map inventory) — deferred post–Phase 10:** one bounded map-inventory / substrate increment (use existing `maps:prep` / bundled catalog patterns). **Queue status:** **(1)** richer **attribution presentation** — **shipped**; **(2b)** **Slice 4** month-aware selector polish — **shipped**; **(2)** static bathymetry, land cover, climate normals, and **population density** — **shipped**. **Queue A (2) closed** for the current catalog. **Resume after Phase 10** when a **new sourced static substrate** (raster + rights; preferred backlog: temperature/precipitation climatology) or explicitly scoped Slice 4 polish is in scope—**not** the default next PR while Phase 10 is open. **Shipped (rolling on this track):** **`equirect-world-legacy-v1`**, **`equirect-world-topography-ne-v1`**, **`equirect-world-political-v1`**, **`equirect-world-geology-v1`**, **`equirect-world-bathymetry-etopo-v1`**, **`equirect-world-landcover-modis-v1`**, **`equirect-world-climate-koppen-beck-v1`**, **`equirect-world-population-gpw-v1`**, Blue Marble families; **structured attribution** on all **eleven** bundled families; **month-aware selector** copy + active month line in `BaseMapStyleControl`.
   - **B. Slice 2 — substrate (closed as default track):** ninth+ optional `BaseMapCapabilities` intrinsic — **closed** unless the session supplies **explicit product scope** (defensible flag name + target families); do not invent taxonomy in code alone.
   - **C. Slice 2 — atmosphere (closed as default track):** optional **fourth+** narrow constants-only twilight pass in `illuminationShading.ts` — **closed** unless the session supplies **explicit visual/product rationale**; **third pass shipped**; avoid unbounded subjective tuning loops.
   - **D. Precursor docs:** weather/cloud **planning** (lifecycle prerequisites; doc-focused) — **shipped** (see closed increment below). **Implementation** follows Phase 10.
4. **Anti-stall / tie-break:** prefer **E** (Phase 10 lifecycle) as the default next vertical. Queue **D** planning **shipped**—do not repeat planning PRs. **Do not** fall through to Phase 8 queue **A**, Phase 9, or Slice 2 **B**/**C** as default next work while Phase 10 is the active track—those reopen after Phase 10 or with **explicit product scope**. If the session has **no** Phase 10 scope and only asks for filler, state that briefly and stop.

**Closed and doc-finalized (Slice 2 substrate increment):** optional catalog intrinsic **`sunGlintDense`** (`BaseMapCapabilities`, bounded penalty in `intrinsicSubstrateReadabilityCatalogPenalty01`, bundled curation on Blue Marble **BM**/**T**) — the **eight-intrinsic** upstream overlay-lift contract is now the **active shipped baseline** (not partial). **Queue B (ninth+ default cadence) closed**—see closed increment below; do not reopen BM/T glint coverage without explicit product scope (weather/cloud **planning** closed in queue **D**).

**Closed and doc-finalized (Slice 2 queue B — default substrate-increment cadence):** standing **ninth+** optional `BaseMapCapabilities` intrinsics are **not** the default next PR. The **eight-intrinsic** contract (`reliefShaded` … `sunGlintDense`) is the **complete** substrate-readability baseline for the current product. **Re-opens** only when a session supplies **explicit product scope** (observed overlay/substrate conflict + defensible flag name + target families)—not agent-invented taxonomy.

**Closed and doc-finalized (Slice 2 atmospheric increment — second pass):** **second** narrow cumulative twilight tuning pass in [`src/renderer/illuminationShading.ts`](src/renderer/illuminationShading.ts) (Gaussian sigma, civil–astro anchor chroma, `TWILIGHT_ATMOSPHERIC_ALPHA_MAX`, day-side envelope)—still one `rasterPatch`, still no SceneConfig axis; tests [`src/renderer/illuminationShading.test.ts`](src/renderer/illuminationShading.test.ts).

**Closed and doc-finalized (Slice 2 atmospheric increment — third pass):** **third** narrow constants-only twilight pass in [`src/renderer/illuminationShading.ts`](src/renderer/illuminationShading.ts) (`TWILIGHT_COLOR_SIGMA_DEG` 4.35→4.5, day-side tint clear edge +1.28→+1.38)—smoother anchor coupling after chromatic scientific substrates shipped; still one `rasterPatch`, still no SceneConfig axis; tests [`src/renderer/illuminationShading.test.ts`](src/renderer/illuminationShading.test.ts). **Queue C (fourth+ default cadence) closed**—see closed increment below; do not reopen passes one–three as missing work.

**Closed and doc-finalized (Slice 2 queue C — default twilight-increment cadence):** standing **fourth+** narrow constants-only twilight passes are **not** the default next PR. Cumulative tuning through the **third** pass is the **complete** incremental twilight baseline for the current product. **Re-opens** only with **explicit visual/product rationale** (observed terminator issue)—not filler composition PRs; deeper scattering/haze remains future when product-scoped.

**Closed and doc-finalized (Phase 8 / Slice 3 land cover increment):** **`equirect-world-landcover-modis-v1`** — committed `public/maps/world-equirectangular-landcover.jpg` (5400×2700, −180…+180° equirect from NASA GIBS MODIS IGBP land cover 2019 epoch), `public/maps/previews/world-equirectangular-landcover-thumb.jpg`, catalog `attribution` + `licenseNote` + `sourceLinks` + `previewThumbnailSrc`, **`capabilities.chromaticDense`** + **`fineScaleTexture`**, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts), [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts), and [`src/config/landcoverOnboardedAsset.test.ts`](src/config/landcoverOnboardedAsset.test.ts) (SOF, SHA-256, decoded Amazon / Sahara / Pacific heuristics).


**Closed and doc-finalized (Phase 8 / Slice 3 population density increment):** **`equirect-world-population-gpw-v1`** — committed `public/maps/world-equirectangular-population.jpg` (5400×2700, −180…+180° equirect from NASA SEDAC GPWv4 Rev. 11 2020 30 arc-second density, log₁₀ hypsometric display, CC BY 4.0), `public/maps/previews/world-equirectangular-population-thumb.jpg`, catalog `attribution` + `licenseNote` + `sourceLinks` + `previewThumbnailSrc`, **`capabilities.chromaticDense`** + **`fineScaleTexture`**, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts), [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts), and [`src/config/populationOnboardedAsset.test.ts`](src/config/populationOnboardedAsset.test.ts) (SOF, SHA-256, decoded Delhi / Sahara / Pacific heuristics). **Queue A remaining** (next sourced substrate / polish) **deferred until after Phase 10**—queues **B**/**C** **closed**.

**Closed and doc-finalized (Phase 8 / Slice 3 climate normals increment):** **`equirect-world-climate-koppen-beck-v1`** — committed `public/maps/world-equirectangular-climate.jpg` (5400×2700, −180…+180° equirect from Beck et al. 2018 present Köppen–Geiger `Beck_KG_V1_present_0p083.tif`, CC BY 4.0), `public/maps/previews/world-equirectangular-climate-thumb.jpg`, catalog `attribution` + `licenseNote` + `sourceLinks` + `previewThumbnailSrc`, **`capabilities.chromaticDense`** + **`fineScaleTexture`**, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts), [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts), and [`src/config/climateNormalsOnboardedAsset.test.ts`](src/config/climateNormalsOnboardedAsset.test.ts) (SOF, SHA-256, decoded Amazon Af / Sahara BWh / Antarctica EF heuristics). **Queue A remaining deferred post–Phase 10**—queues **B**/**C** **closed**.

**Closed and doc-finalized (Phase 8 / Slice 3 bathymetry increment):** **`equirect-world-bathymetry-etopo-v1`** — committed `public/maps/world-equirectangular-bathymetry.jpg` (5400×2700, −180…+180° equirect contract after ETOPO 0…360° dateline roll), `public/maps/previews/world-equirectangular-bathymetry-thumb.jpg`, catalog `attribution` + `licenseNote` + `sourceLinks` + `previewThumbnailSrc`, **`capabilities.bathymetryShaded`** + **`reliefShaded`**, provenance + GDAL/dateline-roll steps in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts), [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts), and [`src/config/bathymetryOnboardedAsset.test.ts`](src/config/bathymetryOnboardedAsset.test.ts) (SOF, SHA-256, decoded west-Pacific hypsometry heuristic). **Remaining in same family (future refinement, not blocking):** alternate products (e.g. GEBCO styling), higher-resolution grids.

**Closed and doc-finalized (Phase 8 / Slice 3 geology increment):** **`equirect-world-geology-v1`** — committed `public/maps/world-equirectangular-geology.jpg` (5400×2700), `public/maps/previews/world-equirectangular-geology-thumb.jpg`, catalog `attribution` + `previewThumbnailSrc`, **`transitionalPlaceholder` cleared**, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts). **Remaining in same family (future refinement, not blocking):** higher-resolution USGS/CGMW source if curated later.

**Closed and doc-finalized (Phase 8 / Slice 3 topography preview increment):** **`equirect-world-topography-ne-v1`** — committed `public/maps/previews/world-equirectangular-topography-thumb.jpg` (800×400), catalog `previewThumbnailSrc`, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts).

**Closed and doc-finalized (Phase 8 / Slice 3 legacy preview increment):** **`equirect-world-legacy-v1`** — committed `public/maps/previews/world-equirectangular-thumb.jpg` (800×400), catalog `previewThumbnailSrc`, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts).

**Closed and doc-finalized (Phase 8 / Slice 3–4 attribution presentation increment):** richer **attribution presentation** in the map selector — catalog optional `licenseNote` and `sourceLinks` (≤2 http(s) links per family) on all **eleven** bundled families; **Source & license** block in [`src/components/config/BaseMapStyleControl.tsx`](src/components/config/BaseMapStyleControl.tsx); tests in [`src/components/config/BaseMapStyleControl.test.tsx`](src/components/config/BaseMapStyleControl.test.tsx) and [`src/config/baseMapCatalog.test.ts`](src/config/baseMapCatalog.test.ts).

**Closed and doc-finalized (Phase 8 / Slice 4 month-aware selector increment):** month-aware catalog copy for Blue Marble **BM**/**T**/**TB**; `variantMode` on selector options; active **UTC civil month** line in [`BaseMapStyleControl`](src/components/config/BaseMapStyleControl.tsx) when a month-aware family is selected (`formatActiveUtcCivilMonthLabel` in [`src/config/baseMapMonthResolve.ts`](src/config/baseMapMonthResolve.ts)); `productInstantMs` threaded from the render loop when the config panel is open ([`App.tsx`](src/App.tsx) → [`ConfigShell`](src/components/config/ConfigShell.tsx) → [`LayersTab`](src/components/config/LayersTab.tsx)); tests in [`BaseMapStyleControl.test.tsx`](src/components/config/BaseMapStyleControl.test.tsx) and [`baseMapMonthResolve.test.ts`](src/config/baseMapMonthResolve.test.ts). **Queue A remaining deferred post–Phase 10**—see item **3** above.

**Closed and doc-finalized (Slice 2 queue D — weather/cloud planning increment):** [`docs/specs/scene/weather-cloud-composition-plan.md`](docs/specs/scene/weather-cloud-composition-plan.md) — participation models (upstream composition vs projection-space layer vs static climatology substrate), Phase 10 lifecycle prerequisites, canonical-time and RenderPlan boundaries, explicit non-goals. **No runtime or SceneConfig changes.** **Phase 10 is now the default macro track**; implementation follows that spec once lifecycle foundations exist.

**Handoff when Phase 10 continues:** one session/PR = **one** pending `P10-*` step from [`docs/specs/scene/dynamic-data-lifecycle-plan.md`](docs/specs/scene/dynamic-data-lifecycle-plan.md); update step status + Slice 5 **Active step**; do not fetch inside render; do not ship user-facing dynamic overlays until post–Phase 10 `DLC-*`. See **Slice 5** and `docs/ROADMAP.md` Phase 10.

**Handoff when queue A resumes (post–Phase 10; next sourced substrate):** one PR — source raster + rights → `npm run maps:prep` (or GDAL/static export pipeline) → committed raster under `public/maps/` + preview → `base-map-catalog.json` row (`licenseNote` / `sourceLinks` as needed) → [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md) provenance → catalog/resolver + onboarded-asset tests. **Queue (2) shipped:** land cover **`equirect-world-landcover-modis-v1`**, bathymetry **`equirect-world-bathymetry-etopo-v1`**, climate normals **`equirect-world-climate-koppen-letter-v1`**, population density **`equirect-world-population-gpw-v1`**. **Preferred backlog after Phase 10** (when sourced): temperature or precipitation climatology static family—see `docs/maps/MAP_ASSET_STRATEGY.md`. Queues **B**/**C** remain **closed** as standing defaults.

## Current goals

1. Keep architecture and docs aligned with actual runtime behavior.
2. Preserve AI co-engineering consistency through repo rules and implementation patterns.
3. Advance **Phase 10 / Slice 5** via sequenced `P10-*` steps in the lifecycle plan (currently **`P10-1`**).
4. Preserve future-feature inventory without prematurely implementing it; **defer** remaining Phase 8 map inventory and Phase 9 composition extensions until after Phase 10 (unless explicitly scoped).
5. Avoid reopening settled foundations unless a real architectural mismatch exists.
6. Preserve the **delivered** planetary composition baseline; reopen composition increments only with **explicit product scope**; ship **no** user-facing dynamic overlays until post–Phase 10 `DLC-*`; not standing filler composition or map-inventory PRs while Phase 10 `P10-*` steps remain.

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

Status: **baseline closed** for standing incremental work (queues **B**/**C** **closed**—see handoff table). **Delivered foundations** below are settled; **re-open** composition code only with **explicit product scope** (not as default filler PRs). **Default macro track** is **Phase 10 / Slice 5** (dynamic data lifecycle). Remaining Phase 8 / Phase 9 work is **deferred until after Phase 10** (or earlier only with explicit product scope).

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

**Scheduling tie-break:** use **`PLAN.md` → “Agent session handoff (planning prompts)”** first. **Do not** default to queue **B** or **C**. **Default next PR** is **Phase 10 / Slice 5** (lifecycle foundation). Remaining Phase 8 queue **A** and Phase 9 composition are **deferred post–Phase 10**. Weather/cloud **implementation** follows Phase 10—follow the **shipped** planning spec; do not reopen queue **D**.

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

Status: **deferred until after Phase 10** — queue **A (2) closed** for the current catalog; remaining sourced substrates / polish are **not** the default next PR while Phase 10 is open (queues **B**/**C** **closed**—see handoff table). **Shipped** reference + static scientific substrates: **`equirect-world-legacy-v1`** (default reference; bundled preview), **`equirect-world-topography-ne-v1`**, **`equirect-world-political-v1`**, **`equirect-world-geology-v1`**, **`equirect-world-bathymetry-etopo-v1`**, **`equirect-world-landcover-modis-v1`**, **`equirect-world-climate-koppen-letter-v1`**, and **`equirect-world-population-gpw-v1`** (non-transitional where applicable; structured attribution + bundled previews on all **eleven** bundled families). **Attribution presentation (Slice 3–4 overlap):** **closed**. **Month-aware selector polish (Slice 4):** **closed** (see closed month-aware increment). **Static trio preview polish:** **closed**. **Legacy reference preview:** **closed**. Legacy **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** ids remain resolver aliases for **`equirect-world-blue-marble-t-v1`**. **Remaining** (resume post–Phase 10): next **sourced** static substrates (preferred backlog: temperature/precipitation climatologies), emissive-compatible **substrate** families (distinct from Black Marble composition input), optional selector label hygiene—see `docs/ROADMAP.md` Phase 8.

Candidate work:

- broader inventory polish (selector labels, placeholder hygiene across the young catalog; **month-aware copy and active UTC month line shipped**).
- further terrain refinement (**shipped baseline:** **`equirect-world-topography-ne-v1`**; **future:** higher-resolution DEMs, alternate relief palettes, month-aware terrain families when product-scoped).
- additional climate products (**shipped baseline:** **`equirect-world-climate-koppen-beck-v1`** Köppen–Geiger present; **future:** temperature/precipitation climatologies, Beck V3 epochs).
- emissive-compatible substrate planning.

Exit criteria:

- at least one additional scientifically grounded substrate family is validated and integrated cleanly (**met and extending:** **`equirect-world-topography-ne-v1`**, **`equirect-world-political-v1`**, **`equirect-world-geology-v1`**, **`equirect-world-bathymetry-etopo-v1`**, **`equirect-world-landcover-modis-v1`**, **`equirect-world-climate-koppen-beck-v1`**, **`equirect-world-population-gpw-v1`**; other sourced families still count toward the same Phase 8 bar).

### Slice 4: Map inventory and selector polish

Status: **baseline shipped (overlaps Phase 8 queue A)**—**attribution presentation** and **month-aware selector polish** are **closed** for the current scope. **Remaining polish / next substrates deferred until after Phase 10**. **Re-opens** post–Phase 10 for optional label/placeholder hygiene when explicitly scoped, or when a **sourced static substrate** becomes available (see handoff table).

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

Status: **default macro track / in progress** (Phase 10). Authoritative step list: [`docs/specs/scene/dynamic-data-lifecycle-plan.md`](docs/specs/scene/dynamic-data-lifecycle-plan.md). Weather/cloud *participation* models: [`docs/specs/scene/weather-cloud-composition-plan.md`](docs/specs/scene/weather-cloud-composition-plan.md).

**Product lock (Phase 10):**

- Exit when lifecycle API + cache + product-time binding exist with tests.
- **No** user-facing dynamic layer in Phase 10 (consumers are post–Phase 10 / DLC track).
- Design **three** snapshot kinds: equirect raster, point features, tracks.
- Prefer **in-app async** periodic acquisition; buddy/sidecar only if in-app conversion is impractical.
- Prefer free-for-personal-use sources; paid OK when clearly valuable.
- Snapshots resolve to **canonical product UTC** (including scrub); cold-start cache refresh OK.
- First post–Phase 10 consumer bias: **global equirect raster** (clouds / satellite IR).

**Active step:** `P10-1` (first pending step in the lifecycle plan table). Sessions implement **one** step only, then mark it shipped and advance this pointer.

**Development steps (summary — statuses live in the lifecycle plan):**

| Step | Id | Focus |
|------|-----|--------|
| 0 | `P10-0` | Planning/docs (**shipped**) |
| 1 | `P10-1` | Core types & contracts |
| 2 | `P10-2` | Versioned snapshot store / cache |
| 3 | `P10-3` | Lifecycle manager state machine |
| 4 | `P10-4` | Product-time resolver |
| 5 | `P10-5` | Acquisition adapter + periodic refresh |
| 6 | `P10-6` | App shell seam (no dynamic overlay UI) |
| 7 | `P10-7` | Phase 10 closure + handoff to DLC consumers |

**After Phase 10:** Dynamic layer consumers (`DLC-1`…)—first `DLC-1` global equirect raster (clouds/IR). See lifecycle plan “Post–Phase 10” table and `docs/ROADMAP.md`.

Exit criteria (Phase 10):

- Steps `P10-1`…`P10-7` shipped; live/forecast **consumers** can integrate without fetching during render; no user-facing dynamic overlay required for exit.

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

### Phase 10 step sequencing (preferred)

Paste this in a **new agent session** to advance Phase 10 one step:

```text
APPROVAL HEADER:
You are approved to make coordinated multi-file edits for this phase.
You are approved to create lifecycle/support files needed by this phase.
You are approved to split files when that improves architecture or maintainability.
Do not ask for confirmation before making those edits.

We are continuing Libration Phase 10 (dynamic data lifecycle).

Before editing, read:
- README.md
- ARCHITECTURE.md
- PLAN.md (Agent session handoff + Slice 5)
- AGENTS.md
- docs/ROADMAP.md (Phase 10)
- docs/specs/scene/dynamic-data-lifecycle-plan.md
- docs/specs/scene/weather-cloud-composition-plan.md
- docs/FUTURE_FEATURES.md
- docs/PROJECT_STRATEGY.md
- docs/AI_COENGINEERING.md
- docs/DEVELOPMENT_STRATEGY.md

Task:
Implement exactly one Phase 10 development step — the first step in
docs/specs/scene/dynamic-data-lifecycle-plan.md whose Status is not "shipped".
Do not implement later steps in this session.

Constraints:
- Phase 10 ships lifecycle only — no user-facing dynamic weather/overlay layer
- No network/fetch inside requestAnimationFrame, layer constructors, or RenderPlan build
- Preserve RenderPlan boundary; keep SceneConfig authoritative
- Prefer in-app async acquisition; buddy/sidecar only if the step docs require it
- Prefer real-format fixtures / free sources over cosmetic fake product layers
- Add or update tests for the step boundary
- When done: mark the step shipped in the lifecycle plan table, append Progress log,
  set PLAN.md Slice 5 "Active step" to the next pending id, sync ROADMAP/AGENTS if needed

Return:
- files changed
- implementation summary
- tests run
- which step id is now shipped and what the next Active step id is
- risks or follow-up work
```

### Generic implementation prompt (non–Phase-10 work)

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

Do not start these until their phase or step is intentionally opened:

- user-facing dynamic weather/cloud/radar overlays (post–Phase 10 `DLC-*`, after `P10-7`).
- alternate projections / zoom/pan (Phase 11).
- remaining Phase 8 sourced substrates and Phase 9 composition extensions (deferred until after Phase 10 unless explicitly scoped).
- public plugin system.
- GPU backend.
- broad preset UI.
- total UI redesign.
- uncontrolled map ingestion pipelines.
- buddy/sidecar converters as the default acquisition path (in-app async is preferred).
