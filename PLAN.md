# Project Plan

## Current phase

Libration is in a post-foundation consolidation and feature-expansion phase.

The major runtime foundations are implemented well enough to support disciplined feature-forward work:

- renderer-agnostic RenderPlan pipeline.
- structured chrome model.
- top-band hour-marker semantic path.
- SceneConfig authority.
- curated base-map catalog.
- categorized map selector and base-map presentation UI.
- map onboarding tooling.
- static and month-aware base-map families (including **validated** static global topography **`equirect-world-topography-ne-v1`**, shipped Natural Earth–lineage political **`equirect-world-political-v1`**, and shipped USGS public-domain–lineage geology **`equirect-world-geology-v1`**—non-transitional catalog entries with attribution and previews where catalog lists them—in the bundled catalog; legacy **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** ids remain resolver aliases for Blue Marble **T** month-aware topography).
- static and derived overlays.
- astronomical scene overlays and markers.
- solar shading / dark-side visualization.
- continuous attenuation-driven planetary illumination composition with semantic twilight anchors.
- non-emissive twilight attenuation and atmospheric tint modulation, including **shipped cumulative incremental twilight transition tuning** in `src/renderer/illuminationShading.ts` (constants-only refinements over more than one narrow pass; still one `rasterPatch`).
- physically-derived polar illumination behavior from seasonal solar geometry.
- perceptually legible moonlight composition with configurable presentation modes.
- emissive night-light upstream composition (catalog-backed asset, policy, perceptual luma driver, Layers presentation controls, illustrative defaults).
- derived overlay readability v1 + v1.1 + **substrate-aware lift scale** (including **shipped** sub-1 brightness dimming + catalog **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** intrinsic hints) + **persisted SceneConfig presentation** (`scene.overlayReadability.presentation`) + **`perLayer` pilots for six default-stack rows** (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`; identity-only subtrees omitted on normalize) applying the same veil/lift scalars after the shell frame where set (subsolar veil + emissive **policy** lift + presentation/catalog substrate attenuation → RenderPlan hints; **one** `OverlayReadabilityFrame` per tick on `TimeContext` in production).
- Canvas backend execution.
- AI co-engineering rules and Cursor project rules.

The current strategic objective is **twofold**: (1) continue **Phase 8 / Slice 3** curated map inventory where shippable gaps remain (see **Agent session handoff** queue **A** below—the **default next merged PR** when a real gap exists; **primary track after geology onboarding:** queue **A** = **narrow inventory polish**, default first vertical **add bundled preview for `equirect-world-topography-ne-v1`**—inspect catalog: political and geology already have `previewThumbnailSrc`; topography ship raster exists but catalog preview is still missing—or the next sourced **A**-class substrate onboarding when rights and raster are ready); and (2) **extend** the delivered upstream planetary illumination and composition system (**Slice 2** program: ninth+ optional catalog substrate signals, optional **third+** narrow twilight constants pass, weather/cloud **planning**) without destabilizing RenderPlan, SceneConfig authority, or execution-only backends. When queue **A** has no remaining shippable increment for the session (or is blocked), fall through to **B** / **C** / **D** in order unless the session explicitly scopes Slice 2 composition work.

### Agent session handoff (planning prompts)

Use this subsection as the **scheduling tie-break** when a new session pastes the standard **planning/discovery starting prompt** and must choose a **single PR-sized** next slice without extra human steering.

1. **Source of truth:** this `PLAN.md` file (**Current strategic objective**, **Agent session handoff**, **Slice 2** and **Slice 3** near-term sections) plus `docs/ROADMAP.md` (Phases 5–9 and Phase 8 in particular).
2. **Primary active execution slice (composition *program*):** **Slice 2 — Planetary illumination — extensions on delivered foundations** (see near-term execution slices below)—the dominant medium-term **illumination + overlay-readability extension** program. Recent **doc-finalized** closures: overlay readability six-default `perLayer` stack, eight-intrinsic substrate lift contract, **second** narrow cumulative twilight pass in `illuminationShading.ts`. **This names the program, not every merged PR:** the **default next merged PR** is still queue **A** (Phase 8 / Slice 3) when the repo shows a shippable catalog gap—see item **3**.
3. **Prioritized default queue for the *next* PR-sized slice** (inspect repo + catalog; pick the **first** item that is still a real, shippable gap; **one vertical per PR**):
   - **A. Phase 8 / Slice 3 (map inventory and scientific substrate expansion):** one bounded map-inventory / substrate increment aligned with `docs/ROADMAP.md` Phase 8 and **Slice 3** below (use existing `maps:prep` / bundled catalog patterns; do not invent new architecture). **Default next PR-sized slice (inspect `base-map-catalog.json` + `public/maps/previews/`):** **narrow inventory polish — add `previewThumbnailSrc` + preview JPEG for `equirect-world-topography-ne-v1`** (ship raster already at `public/maps/world-equirectangular-topography.jpg`; political and geology already have bundled previews). **Second** queue **A** option when polish is done or out of scope: next **A**-class substrate onboarding (climate, bathymetry, vegetation, etc.) when a sourced raster and rights are ready. **Shipped (rolling on this track):** **`equirect-world-topography-ne-v1`** (`world-equirectangular-topography.jpg`; **`reliefShaded`**; preview still missing in catalog); **`equirect-world-political-v1`** (`world-equirectangular-political.jpg`; Natural Earth attribution; non-transitional; bundled preview); **`equirect-world-geology-v1`** (`world-equirectangular-geology.jpg`; USGS public-domain lineage; non-transitional; bundled preview).
   - **B. Slice 2 — substrate:** ninth+ optional `BaseMapCapabilities` intrinsic + bounded penalty + tests + bundled catalog curation (**requires** a product-defensible flag name and target families in the session prompt or an existing written product note—do not invent taxonomy in code alone).
   - **C. Slice 2 — atmosphere:** optional **third+** narrow constants-only twilight pass in `illuminationShading.ts` (**requires** explicit rationale in the session prompt—avoid unbounded subjective tuning loops).
   - **D. Precursor docs:** weather/cloud **planning** (lifecycle prerequisites; doc-focused) when Phase 10 is not yet opened.
4. **Anti-stall / tie-break:** if **A** is a genuine shippable gap, prefer **A** over another **C** session unless the user prompt explicitly requests composition atmosphere tuning. When **A** lists both a **missing committed ship raster** (for a catalog family that still declares a target `src` without bytes) and polish-only work, prefer the **missing raster** vertical first. If **A** is blocked (missing sources, legal, or tooling) or has **no** remaining shippable increment for this session, state that briefly and fall through to **B**, **C**, or **D** in order.

**Closed and doc-finalized (Slice 2 substrate increment):** optional catalog intrinsic **`sunGlintDense`** (`BaseMapCapabilities`, bounded penalty in `intrinsicSubstrateReadabilityCatalogPenalty01`, bundled curation on Blue Marble **BM**/**T**) — the **eight-intrinsic** upstream overlay-lift contract is now the **active shipped baseline** (not partial). Next product slices in this vein are **ninth+** optional intrinsics (when justified), **optional third+** narrow twilight constants-only passes in `illuminationShading.ts` when visually justified, or weather/cloud **planning** per Slice 2 below—not reopening BM/T glint coverage.

**Closed and doc-finalized (Slice 2 atmospheric increment):** **second** narrow cumulative twilight tuning pass in [`src/renderer/illuminationShading.ts`](src/renderer/illuminationShading.ts) (Gaussian sigma, civil–astro anchor chroma, `TWILIGHT_ATMOSPHERIC_ALPHA_MAX`, day-side envelope)—still one `rasterPatch`, still no SceneConfig axis; tests [`src/renderer/illuminationShading.test.ts`](src/renderer/illuminationShading.test.ts). **Next** in this vein: deeper scattering/haze or **optional third+** constants-only passes—not reopening this second pass as missing work.

**Closed and doc-finalized (Phase 8 / Slice 3 geology increment):** **`equirect-world-geology-v1`** — committed `public/maps/world-equirectangular-geology.jpg` (5400×2700), `public/maps/previews/world-equirectangular-geology-thumb.jpg`, catalog `attribution` + `previewThumbnailSrc`, **`transitionalPlaceholder` cleared**, provenance in [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md); tests in [`src/config/v2/sceneConfig.test.ts`](src/config/v2/sceneConfig.test.ts). **Remaining in same family (future refinement, not blocking):** higher-resolution USGS/CGMW source if curated later. **Next** on queue **A** after this closure: narrow inventory polish (default first vertical: topography preview in catalog)—see item **3** above.

## Current goals

1. Keep architecture and docs aligned with actual runtime behavior.
2. Preserve AI co-engineering consistency through repo rules and implementation patterns.
3. Continue disciplined map and scene expansion.
4. Preserve future-feature inventory without prematurely implementing it.
5. Avoid reopening settled foundations unless a real architectural mismatch exists.
6. Extend planetary composition on top of the **delivered** twilight baseline (including **shipped cumulative incremental twilight tuning** in `illuminationShading`), moonlight, emissive, and **overlay readability** stacks (v1 + v1.1 + derived substrate lift + **catalog/dimming substrate heuristics** (intrinsic: `reliefShaded`, `boundaryDense`, `chromaticDense`, `bathymetryShaded`, `fineScaleTexture`, `labelDense`, `etchedReliefDense`, `sunGlintDense`; sub-1 effective brightness) + SceneConfig presentation scalars + **full default-stack `perLayer` pilots** — canonical keys `SCENE_OVERLAY_READABILITY_PER_LAYER_PILOT_KEYS` in [`src/config/v2/sceneConfig.ts`](src/config/v2/sceneConfig.ts)): **further** substrate-only signals, **further** atmospheric refinement when justified, then clouds/weather planning—incremental slices, not a new compositor layer.

## Near-term execution slices

### Overlay readability — **phase closed** (v1 + v1.1 + substrate lift + presentation + six default-stack `perLayer` pilots)

**Status:** shipped in production. This phase is **closed**; treat as a settled foundation alongside planetary illumination composition (subsolar veil, emissive policy lift, presentation/catalog–based substrate lift, **persisted** `scene.overlayReadability.presentation` scaling in the shell, and optional per-layer pilots for every **default-stack** readability row (`perLayer.grid`, `perLayer.solarAnalemma`, `perLayer.subsolarMarker`, `perLayer.sublunarMarker`, `perLayer.cityPins`, `perLayer.staticEquirectOverlay`)).

**v1 (subsolar-only veil):** derived solar night-veil hints on lat/lon grid, solar analemma, subsolar/sublunar markers, **city pins** (per-pin veil scalar), and **static equirect raster overlays** (global scalar → merged `imageBlit` `cssFilter` upstream). The app shell attaches **one** `OverlayReadabilityFrame` per tick on `TimeContext`; layers use `getOverlayReadabilityFrameOrCompute`.

**v1.1 (emissive policy lift):** `computeOverlayReadabilityFrameFromTimeMs` accepts normalized **emissive night-light policy** from `scene.illumination.emissiveNightLights` (`mode`, `presentation.intensity`, `presentation.driverExponent`); the shell passes those inputs each tick. `globalReadabilityVeil01` / `readabilityVeil01At` combine subsolar veil with bounded **policy-only** emissive legibility pressure (**no emissive texture sampling** in the readability path). Payload keys remain `OverlayReadabilityHints.nightVeil01` / pin `readabilityNightVeil01` but carry the **combined** scalar for frame-backed overlays.

**Scene presentation scaling (shipped):** normalized `scene.overlayReadability.presentation` (`readabilityVeilScale01` 0–1.5, `overlayLiftMultiplier01` 0.65–1.35, defaults 1) post-processes the derived frame in the shell; Layers tab exposes controls and reset.

**Not in this closed stack (future):** readability pilots for stack rows **beyond** those six defaults (unless new scene rows adopt the same `perLayer.<rowId>` contract); **further** substrate-only heuristics beyond the **shipped** presentation + `overlayOptimized` / `darkFriendly` + **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** + sub-1 brightness dimming model.

**Derived substrate lift (implemented):** `substrateOverlayReadabilityLiftScale01` on `OverlayReadabilityFrame` from effective base-map presentation + catalog `capabilities` (no raster sampling). Presentation **below** default brightness reduces attenuation so overlays keep lift on dimmed bases. Catalog may set optional **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** for small intrinsic attenuation at neutral presentation; hints, static rasters, and city pins carry `overlayReadabilityLiftScale01` into RenderPlan builders.

### Substrate overlay readability heuristics — **shipped** (Slice 2)

**Phase status (narrow increment):** the **eight-intrinsic** catalog contract (including **`etchedReliefDense`** on **`equirect-world-legacy-v1`** and **`sunGlintDense`** on Blue Marble **BM**/**T**) is **shipped** in runtime and docs; treat **further** optional `BaseMapCapabilities` axes as **new** Slice 2 increments, not a partial rollout of this contract.

**Status:** **shipped** upstream-only lift derivation in `deriveSubstrateOverlayReadabilityLiftScale01` (`src/core/substrateOverlayReadabilityLiftScale.ts`). Sub-1 **effective** brightness scales presentation-derived penalty; **`overlayOptimized`** / **`darkFriendly`** multiply presentation penalty; **eight** optional catalog intrinsics on `BaseMapCapabilities` each add a **bounded** intrinsic penalty at neutral presentation (combined intrinsic penalties capped before merging with presentation penalty): **`reliefShaded`**, **`boundaryDense`**, **`chromaticDense`**, **`bathymetryShaded`**, **`fineScaleTexture`**, **`labelDense`**, **`etchedReliefDense`**, **`sunGlintDense`**. Curator examples: Blue Marble **BM**/**T** → **`fineScaleTexture`** + **`sunGlintDense`**; **TB** → **`reliefShaded`** + **`bathymetryShaded`**; political → **`chromaticDense`** + **`labelDense`**; geology → **`boundaryDense`** + **`chromaticDense`** + **`labelDense`**; legacy world → **`etchedReliefDense`** (with **`darkFriendly`**); static Natural Earth topography **`equirect-world-topography-ne-v1`** → **`reliefShaded`**. No raster sampling. Tests: `src/core/substrateOverlayReadabilityLiftScale.test.ts`.

**Phase closure (runtime + docs aligned):** treat the **eight** intrinsics above plus `overlayOptimized` / `darkFriendly` multipliers and sub-1 brightness dimming as the **current shipped** substrate-readability catalog contract for overlay lift—not hypothetical.

**Next frontier (same subsystem, Slice 2):** additional optional `BaseMapCapabilities` axes or resolver-only signals **beyond** the shipped **eight**-intrinsic set (`reliefShaded` … `sunGlintDense`) when product-justified; **still** no raster sampling unless explicitly scoped.

**Closed increment (documented):** optional catalog **`labelDense`** (dense typography; intrinsic penalty in `intrinsicSubstrateReadabilityCatalogPenalty01`) with bundled curation on **`equirect-world-political-v1`** and **`equirect-world-geology-v1`**; regression coverage in `src/core/substrateOverlayReadabilityLiftScale.test.ts`. Treat as part of the settled substrate contract—not a partial rollout.

**Closed increment — etched relief (documented):** optional catalog **`etchedReliefDense`** (directional etched / scribed shaded relief; intrinsic penalty in `intrinsicSubstrateReadabilityCatalogPenalty01`) with bundled curation on **`equirect-world-legacy-v1`**; regression coverage in `src/core/substrateOverlayReadabilityLiftScale.test.ts`. Treat as part of the settled substrate contract—not a partial rollout.

**Closed increment — sun glint (documented):** optional catalog **`sunGlintDense`** (dense sun glint on open water in natural-color imagery; intrinsic penalty in `intrinsicSubstrateReadabilityCatalogPenalty01`) with bundled curation on **`equirect-world-blue-marble-bm-v1`** and **`equirect-world-blue-marble-t-v1`**; regression coverage in `src/core/substrateOverlayReadabilityLiftScale.test.ts`. Treat as part of the settled substrate contract—not a partial rollout.

### Atmospheric twilight refinement — **shipped; doc-finalized** (Slice 2)

**Status:** **shipped** in runtime and **doc-finalized** for the **second** narrow cumulative pass (Slice 2). Upstream-only tuning in [`src/renderer/illuminationShading.ts`](src/renderer/illuminationShading.ts): wider Gaussian coupling between semantic twilight anchor colors, cooler low-luminance anchor progression (horizon through astronomical anchors), bounded non-emissive atmospheric tint (`TWILIGHT_ATMOSPHERIC_ALPHA_MAX` 0.172), and a gentler day-side atmospheric envelope as altitude approaches the shared +4° daylight-clear sampling cutoff from below (tint is still zero at and above that cutoff). Still **one** planetary illumination `rasterPatch`; **no** new SceneConfig surface or backend composition policy. Tests: [`src/renderer/illuminationShading.test.ts`](src/renderer/illuminationShading.test.ts).

**Next frontier (same subsystem):** optional **third+** narrow constants-only passes when product warrants; deeper scattering or haze modeling; optional persisted “twilight softness” only when product warrants a config axis.

### Slice 1: Documentation alignment with source reality

Status: complete (ongoing hygiene only).

Baseline verified: overlay readability **v1 + v1.1 + derived substrate lift + substrate heuristic increments (`reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense`, sub-1 brightness dimming) + persisted presentation scalars + six default-stack `perLayer` pilots**, **cumulative incremental twilight transition tuning** in `illuminationShading.ts`, **validated static topography catalog family `equirect-world-topography-ne-v1`** (Phase 8 / Slice 3), **shipped political `equirect-world-political-v1`**, and **shipped geology `equirect-world-geology-v1`** (non-transitional catalog + attribution + preview) are documented as **shipped** across `README.md`, `ARCHITECTURE.md`, `PLAN.md`, `docs/ROADMAP.md`, `docs/FUTURE_FEATURES.md`, `docs/PROJECT_STRATEGY.md`, `docs/DEVELOPMENT_STRATEGY.md`, `docs/AI_COENGINEERING.md`, `AGENTS.md`, `docs/maps/MAP_ASSET_SOURCES.md`, `docs/maps/MAP_ASSET_STRATEGY.md`, and `.cursor/rules/050-docs-and-roadmap.mdc` — not hypothetical; avoid “grid-only pilot”, “v1 only”, “substrate unreadable”, “no twilight tuning”, “no static topography family in catalog”, “political/geology still transitional placeholder”, or “geology ship raster missing” drift where the runtime matches source.

### Slice 2: Planetary illumination — extensions on delivered foundations

Status: **primary active execution slice**.

**Implemented foundations (treat as settled; extend, do not reopen):**

- solar shading / dark-side visualization.
- coherent upstream planetary illumination composition: **one** illumination `rasterPatch`, SceneConfig-authoritative policy, renderer-agnostic execution.
- continuous attenuation-driven twilight with civil/nautical/astronomical **semantic** anchors (not separate user-facing twilight layers); non-emissive atmospheric tint and attenuation; **cumulative incremental twilight transition tuning** shipped in `illuminationShading.ts` (**second** narrow pass doc-finalized; see subsection above).
- physically-derived polar illumination behavior from seasonal solar geometry.
- perceptually legible **moonlight** in the same illumination raster, with presentation modes (`off` / `natural` / `enhanced` / `illustrative`) and Layers UI wiring.
- **Emissive city / night lights:** bundled emissive composition catalog, id canonicalization, upstream per-texel sampling, `computeEmissiveNightLightsContributionLinear01` policy, perceptual luma driver (`presentation.driverExponent`), intensity control, Layers **Off / Natural / Enhanced / Illustrative**, illustrative defaults paired with moonlight; validated Black Marble ship asset (see `docs/maps/MAP_ASSET_SOURCES.md`).
- subsolar marker, sublunar marker, solar analemma overlay, and derived astronomical overlays in the layer stack.
- **Overlay readability (v1 + v1.1 + substrate + **substrate heuristic increments** + persisted SceneConfig presentation + six default-stack `perLayer` pilots, derived — closed foundation):** `OverlayReadabilityFrame` from `computeOverlayReadabilityFrameFromTimeMs` (emissive policy + **substrate** inputs: effective base-map presentation + catalog `capabilities`, including optional **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** and sub-1 brightness dimming in lift derivation), then `scene.overlayReadability.presentation` scaling, attached each tick via `TimeContext.overlayReadabilityFrame` and `getOverlayReadabilityFrameOrCompute` in layers; **`perLayer` pilots** for **`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`** optionally repeat the same scalars again for those rows (identity omitted on normalize); `OverlayReadabilityHints` on grid/analemma/marker payloads (`overlayReadabilityLiftScale01` from frame); per-pin `readabilityNightVeil01` on city pins + payload-level lift scale; static equirect raster `readability` + merged `cssFilter` in `buildBaseRasterMapRenderPlan`; vector stroke/alpha via `effectiveOverlayReadabilityLiftVeil01` (no emissive raster sampling in the readability path).

**Likely next implementation slice (composition code; pick one narrow vertical per PR):**

**Scheduling tie-break:** use **`PLAN.md` → “Agent session handoff (planning prompts)”** first. **Default next PR** is still **queue A** (Phase 8 / Slice 3) when a catalog or inventory gap remains (see item **3** above). The list below applies when **A** is empty or blocked for the session, the session explicitly scopes **Slice 2** composition work, or the prompt requests composition-only work.

With atmospheric **second pass** doc-finalized, the **most likely Slice 2 code slices** (after **A** is satisfied or out of scope) are: **(1)** one new optional `BaseMapCapabilities` intrinsic + bundled catalog curation when a substrate conflict is product-identified; **(2)** an optional **third+** narrow constants-only twilight pass in `illuminationShading.ts`; or **(3)** weather/cloud **planning** (docs/design) ahead of lifecycle—**one vertical per PR**.

**Primary product choices (same slice; do not mix in one PR):**

- **Further substrate/readability signals:** extend catalog/resolver-only hints and presentation-derived rules beyond the **shipped** eight intrinsics **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** plus sub-1 brightness dimming and `overlayOptimized` / `darkFriendly` multipliers (still upstream; no raster sampling unless explicitly scoped).
- **Further atmospheric refinement:** optional **third+** narrow constants-only pass and/or deeper scattering / transition tuning on top of the **existing** continuous twilight field and cumulative shipped tuning in `illuminationShading.ts` (still one illumination `rasterPatch`; no backend composition policy; optional future SceneConfig axis for user-facing softness only if needed).

**Shipped pilots:** `scene.overlayReadability.perLayer` supports the six stack ids above (veil + lift scalars each) after the global frame in `createLatLonGridLayer`, `createSolarAnalemmaLayer`, `createSubsolarMarkerLayer`, `createSublunarMarkerLayer`, `createCityPinsLayer`, and `createStaticEquirectRasterOverlayLayer`; normalized config omits identity-only per-layer subtrees.

**Remaining frontier work (incremental; sequence as dependencies allow):**

- weather / cloud participation **planning** and later upstream participation (depends on lifecycle and data model when opened).
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

Status: **active (Phase 8)**—**default macro PR track** when handoff queue **A** applies (**default next merged PR** after geology closure: **narrow inventory polish**—first vertical: topography bundled preview; see handoff item **3**). **Shipped** static substrates: **`equirect-world-topography-ne-v1`** (`world-equirectangular-topography.jpg`; **`reliefShaded`**; catalog preview **not yet** listed); **`equirect-world-political-v1`** and **`equirect-world-geology-v1`** (non-transitional; attribution + bundled previews). Legacy **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** ids remain resolver aliases for **`equirect-world-blue-marble-t-v1`**. **Remaining** toward the same slice: narrow inventory polish, further sourced substrates (climate, bathymetry, vegetation), emissive-compatible **substrate** families (distinct from Black Marble composition input)—see `docs/ROADMAP.md` Phase 8.

Candidate work:

- **default next:** bundled preview for **`equirect-world-topography-ne-v1`** (Slice 4 overlap; one vertical).
- broader inventory polish (attribution presentation, selector copy, placeholder hygiene across the young catalog).
- further terrain refinement (**shipped baseline:** **`equirect-world-topography-ne-v1`**; **future:** higher-resolution DEMs, alternate relief palettes, month-aware terrain families when product-scoped).
- climate or vegetation substrate exploration.
- emissive-compatible substrate planning.

Exit criteria:

- at least one additional scientifically grounded substrate family is validated and integrated cleanly (**met and extending:** **`equirect-world-topography-ne-v1`**, **`equirect-world-political-v1`**, **`equirect-world-geology-v1`**; further families still count toward the same Phase 8 bar).

### Slice 4: Map inventory and selector polish

Status: planned.

Candidate work:

- normalize family ids, labels, and categories while catalog is still young.
- improve selector copy for month-aware map families.
- strengthen attribution presentation.
- consider active displayed-month indication for seasonal families.
- finalize placeholder versus validated family states.
- validate all preview thumbnails and metadata.

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
