# Future Features

## Purpose

This document preserves the future-feature inventory that has accumulated during Libration development.

It is not a commitment to implement everything. It is a retention and planning document so good ideas are not lost when a phase intentionally defers them.

## Feature status vocabulary

- Candidate: worth considering later.
- Planned: likely future work, but not current.
- Blocked: depends on another architecture phase.
- Rejected: intentionally not desired.
- Implemented: available in the product.

## Implemented map UI foundations

The current map configuration UI already includes:

- categorized base-map selector groups.
- curated substrate taxonomy.
- map preview card for the selected base-map family.
- attribution display for the selected base-map family (**Source & license** block: credit line, optional `licenseNote`, up to two external `sourceLinks` from the bundled catalog).
- month-aware family catalog copy and **active UTC civil month** indication for Blue Marble families in `BaseMapStyleControl` (render-clock `productInstantMs`; not persisted in SceneConfig).
- per-family base-map presentation controls.
- shared presentation persistence across seasonal/month-aware raster variants.
- bundled catalog **`capabilities`** consumed upstream for overlay lift (optional intrinsics include **`reliefShaded`**, **`boundaryDense`**, **`chromaticDense`**, **`bathymetryShaded`**, **`fineScaleTexture`**, **`labelDense`**, **`etchedReliefDense`**, **`sunGlintDense`**—curator metadata; e.g. Blue Marble TB sets **`bathymetryShaded`** with **`reliefShaded`**; Blue Marble **BM**/**T** set **`fineScaleTexture`** and **`sunGlintDense`**; **`equirect-world-political-v1`** and **`equirect-world-geology-v1`** set **`labelDense`** alongside chromatic/boundary hints (shipped non-transitional families); legacy world sets **`etchedReliefDense`** for packaged etched shaded relief; static Natural Earth–lineage topography **`equirect-world-topography-ne-v1`** sets **`reliefShaded`**).

Future map and scene UX work should extend these foundations rather than replacing them.

## Implemented astronomical and illumination foundations

The current scene system already includes:

- solar shading / dark-side visualization with a continuous attenuation-driven twilight illumination field in the same planetary illumination raster (civil/nautical/astronomical thresholds retained as semantic anchors, not rendered boundaries; backend execution remains a plain raster blit with no twilight-specific semantics).
- **incremental twilight transition tuning** (upstream-only constants in `src/renderer/illuminationShading.ts`): cumulative narrow passes (first + **second** doc-finalized pass)—smoother anchor color coupling, bounded non-emissive atmospheric tint cap, gentler day-side tint envelope below +4° daylight clear—still no separate twilight layer, still one `rasterPatch`.
- non-emissive atmospheric twilight composition using attenuation and tint modulation rather than additive glow.
- **moonlight** in the same raster: presentation modes (`off` / `natural` / `enhanced` / `illustrative`) resolved upstream; Layers UI integration.
- emissive night lights as a **composition input** (catalog-backed `assetId`, policy-driven sampling into the same illumination raster, Layers **Off / Natural / Enhanced / Illustrative** for `mode`, plus **presentation** intensity and luma-lift exponent / perceptual driver; shipped NASA Black Marble 2016 reference asset). Future refinements: optional asset picker, intensity curves, alternate resolutions or years—without moving semantics into the backend.
- **Overlay readability (v1 + v1.1 + derived substrate lift + SceneConfig presentation + default-stack per-layer pilots):** `OverlayReadabilityFrame` on `TimeContext` (one per tick from the shell): **v1** subsolar night veil on grid, analemma, subsolar/sublunar markers, city pins, and static equirect rasters; **v1.1** adds deterministic emissive **policy-only** legibility pressure from `scene.illumination.emissiveNightLights` into `readabilityVeil01At` / `globalReadabilityVeil01` (no emissive texture sampling in the readability path); **substrate lift scale** on the same frame (`substrateOverlayReadabilityLiftScale01`) from effective base-map presentation + catalog `capabilities` (`overlayOptimized`, `darkFriendly`, optional **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`**, plus **sub-1 effective brightness** reducing presentation-derived attenuation); **`scene.overlayReadability.presentation`** scales combined veil and lift in the shell before hints; **`perLayer` keys (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`)** optionally repeat those scalars per layer (**identity subtrees omitted** on normalize); vector stroke/alpha scaling resolved upstream.
- seasonal polar illumination behavior emerging from solar geometry and axial tilt.
- subsolar marker.
- sublunar marker.
- solar analemma overlay.
- semantic astronomical scene participation through the layer system.

Future work should extend these systems with **further substrate readability heuristics** (additional catalog/resolver signals beyond **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`**, sub-1 brightness dimming, and presentation + `overlayOptimized` / `darkFriendly`), **further atmospheric refinement** (scattering, haze, optional SceneConfig twilight softness, or **optional third+** narrow constants-only passes) beyond the shipped cumulative incremental tuning in `illuminationShading.ts`, and (when Phase 10 lifecycle exists) weather/cloud **implementation** per [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md)—**planning closed** (`PLAN.md` Slice 2 queue **D**)—not by re-deriving baseline twilight/moonlight/emissive or the settled overlay readability **`perLayer` defaults** for `grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, and `staticEquirectOverlay`.

## Maps and base-map families

### Candidate curated map families

- **Implemented baseline (geology):** global geologic provinces **`equirect-world-geology-v1`** (see [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md)). **Future:** alternate geology styles, higher-resolution scientific linework.
- **Implemented baseline (static terrain):** global shaded-relief / elevation emphasis **`equirect-world-topography-ne-v1`** (see [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md)). **Future:** higher-resolution or alternate-source terrain, month-aware DEM families, neutral terrain-only palettes.
- **Implemented baseline (bathymetry):** global relief / ocean-floor depth **`equirect-world-bathymetry-etopo-v1`** (NOAA ETOPO 2022 lineage; see [`docs/maps/MAP_ASSET_SOURCES.md`](docs/maps/MAP_ASSET_SOURCES.md)). **Future:** alternate bathymetry products (e.g. GEBCO-only styling), higher-resolution grids, additional hypsometric palettes.
- natural-color seasonal imagery.
- Blue Marble variants.
- **Implemented baseline (political/reference):** **`equirect-world-political-v1`** (Natural Earth–lineage shipped raster in the bundled catalog). **Future:** alternate political styles, borders-only overlay-friendly variants.
- borders-only overlay-friendly maps.
- population density.
- vegetation / land cover.
- biome / ecology.
- climate zones.
- Koppen-Geiger climate.
- precipitation.
- temperature normals.
- cloud climatology.
- additional night-light or light-pollution **map substrate** products beyond the bundled Black Marble composition input.
- light pollution.
- shaded relief.
- terrain-only neutral substrate.
- antique or paper-style reference map if visually differentiated.
- high-contrast accessibility map.
- dark-friendly overlay substrate.

### Map asset quality improvements

- stronger source provenance in catalog (beyond per-family `licenseNote` / `sourceLinks` already in the bundled catalog).
- clear placeholder versus sourced status.
- map source processing notes.
- validation checklists per family.
- ~~month-aware family explanation in UI.~~ **Shipped:** Blue Marble catalog `shortDescription` copy and `variantMode` on selector options.
- ~~active displayed-month indication for seasonal families.~~ **Shipped:** `Displaying: <month> (UTC civil month N)` in `BaseMapStyleControl` when a month-aware family is selected (`productInstantMs` from render loop).
- fixed-month override for comparison or demonstration.
- presentation presets per map role.

## Scene layers

### Static overlays

- borders overlay.
- graticule overlay.
- time-zone boundary overlay as informational layer, not structural model.
- city labels.
- reference cities.
- custom pins.
- user-defined routes.
- shipping lanes.
- flight routes.
- satellite ground-track static references.
- tectonic plates.
- ocean currents.
- climate bands.
- daylight terminator reference lines.

### Derived overlays

- solar shading / dark-side visualization (continuous solar-altitude twilight gradient encoded in the same upstream illumination raster, with civil/nautical/astronomical thresholds retained as semantic anchors, not a separate twilight layer).
- solar subpoint.
- lunar subpoint.
- moon phase and ground track.
- analemma variants.
- equinox and solstice reference overlays.
- eclipse path overlays.
- great-circle paths.
- antipode markers.
- local noon/midnight curves.
- reference-city meridian line.
- read-point alignment marker.
- UTC meridian reference.

### Dynamic and live layers

Blocked until dynamic data lifecycle exists (Phase 10). Participation boundaries and sequencing: [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md).

Candidates:

- weather radar.
- cloud cover.
- precipitation forecast.
- temperature forecast.
- wind fields.
- pressure systems.
- hurricane tracks.
- aurora forecast.
- earthquake feed.
- volcano activity.
- aircraft ADS-B feed.
- marine AIS feed.
- satellite live positions.
- ISS and selected spacecraft.
- lightning feed.
- wildfire smoke.
- air quality.

## Composition and visual systems

Baseline planetary illumination (solar + continuous twilight + moonlight + optional emissive night lights → **one** upstream `rasterPatch`) is **implemented**. Upstream overlay **substrate lift** consumes bundled catalog **`capabilities`**: **eight** optional intrinsic hints through **`sunGlintDense`** (see `docs/maps/MAP_ASSET_SOURCES.md` and `src/core/substrateOverlayReadabilityLiftScale.ts`), plus `overlayOptimized` / `darkFriendly` presentation multipliers—**implemented**, not speculative. **Doc-finalized:** BM/T **`sunGlintDense`** curation closes the “open-ocean glint vs overlays” slice; cumulative non-emissive twilight tuning through a **second** narrow constants-only pass in `illuminationShading.ts` is likewise **shipped and doc-finalized** (`PLAN.md` / `docs/ROADMAP.md`). Backlog items below target **ninth+** optional intrinsics, **third+** twilight passes, deeper scattering/haze, or other extensions—not re-litigating those baselines.

### Planned or candidate composition features

- layer blending modes.
- multiply, screen, additive, normal.
- alpha masks.
- geometric clipping.
- viewport clipping.
- composition-aware day/night illumination.
- atmospheric scattering and haze refinement, or **optional third+** narrow constants-only twilight passes (cumulative incremental upstream tuning through **second** pass is **shipped** in `src/renderer/illuminationShading.ts`; deeper work remains open).
- shadow and glow effects expressed upstream as RenderPlan intent.
- **Overlay readability extensions beyond** v1 + v1.1 + substrate lift + presentation + six default-stack `perLayer` pilots + the **shipped** eight-intrinsic substrate heuristic set (`reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense`, sub-1 brightness dimming): `perLayer` contracts for additional stack rows where justified; finer multi-row semantics (e.g. separate pilots per static-raster row); **additional** optional catalog or resolver heuristics (ninth+ intrinsic axes or presentation rules when product-defined).
- active solar-position synchronization along analemma trajectories.
- per-layer contrast/brightness/saturation/gamma where appropriate.
- high-contrast accessibility mode.

### Day/night product ideas

- scientifically grounded day/night and twilight attenuation.
- configurable twilight softness (not persisted under cumulative shipped constants-only tuning; future SceneConfig axis if product adds it).
- optional **additional** night-light data products layered as future composition or substrate inputs (beyond current Black Marble path).
- stronger emissive **readability** presets tied to overlay density or zoom when those modes exist.
- seasonal illumination effects.
- solar altitude shading.
- reference-time comparison modes.

## Scene view and projection

Blocked until scene view work is opened.

Candidates:

- zoom.
- pan.
- full-world fixed view with preserved aspect rules.
- orthographic globe.
- perspective globe.
- Mercator.
- Robinson.
- Winkel Tripel.
- projection switcher.
- inverse projection for pointer hover.
- click-to-inspect lat/lon/time.
- viewport clipping.
- tile preparation.
- high-resolution map assets.

## Time and reference-frame features

Candidates:

- reference city selector refinement.
- saved reference cities.
- custom reference meridian.
- read-point visualization.
- local 12 hour and local 24 hour display modes.
- UTC-style display mode clarity.
- demo mode timeline.
- time scrubber.
- historical time playback.
- future time preview.
- compare two reference cities.
- meeting-planning mode.
- sunrise/sunset for selected city.
- civil-date boundary visualization.
- date-line explanation aids.
- leap second and time standard notes if ever needed.

## Display chrome

Candidates:

- top-band layout presets.
- accessibility size controls.
- high-contrast top chrome.
- alternate hour-marker visual families.
- analog clock polish.
- radial line polish.
- radial wedge polish.
- text font curation.
- NATO row visibility and styling controls.
- tickmark density controls.
- bottom information bar expansion.
- status readouts.
- current reference city readout.
- selected map/source readout.
- layer legend area.

## Presets and configuration

Planned direction:

- named partial config presets.
- composable preset stacks.
- explicit application order.
- last-write-wins conflicts.
- scene presets.
- chrome presets.
- map/layer presets.
- accessibility presets.
- export/import user presets.
- reset selected domain to defaults.
- compare current config to preset.
- preset migration support.

## Quality of life

Candidates:

- improved settings organization.
- search/filter in settings.
- map selector with thumbnails.
- source attribution panel.
- layer stack drag-and-drop.
- visibility and opacity quick controls.
- undo/redo for config edits.
- reset individual setting groups.
- onboarding wizard.
- diagnostics panel.
- failed raster diagnostics.
- asset validation report.
- performance overlay.
- screenshot/export frame.
- portable config export/import.

## Development and contributor experience

Candidates:

- stronger Cursor rules.
- local architecture decision records.
- docs freshness checklist.
- source validation scripts.
- map catalog validation command.
- visual regression tests where practical.
- RenderPlan inspection tools.
- scene debug overlays.
- config diff tooling.
- typed schema export.
- test fixtures for map catalogs.
- release checklist.
- public contribution guide.

## Product-category expansion ideas

These are larger future directions, not near-term tasks:

- wallboard or appliance mode.
- presentation mode.
- browser version.
- hosted dashboard mode only if AGPL/network implications are intentional.
- local network display endpoint.
- OBS/streaming background mode.
- kiosk mode.
- educational mode explaining longitude, time, seasons, and projection.
- mission-control style scene packs.
- personal travel/world-clock dashboard.
