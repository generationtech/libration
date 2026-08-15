# Future features

## Purpose

This document preserves the future-feature inventory that has accumulated during Libration development.

It is not a commitment to implement anything. It is a retention document so that good ideas are not lost when they are deliberately deferred.

**It is not a status surface.** For what the product does today see [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md). Nothing here should be read as approved or scheduled work; an idea reaching this list means only that it was worth keeping.

## Status vocabulary

- **Candidate** — worth considering later.
- **Planned** — a likely direction, not current work.
- **Blocked** — depends on architecture that does not exist yet.
- **Rejected** — intentionally not desired.

Several sections describe extensions to subsystems that already exist. Those subsystems are described in [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md), and work in those areas should **extend** them rather than introduce parallel mechanisms — see design principles 7 and 8 in [`docs/PROJECT_STRATEGY.md`](PROJECT_STRATEGY.md).

## Maps and base-map families

### Candidate curated map families

Families already in the bundled catalog are listed in [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md#10-map-and-substrate-model); the entries below are extensions beyond them.

- geology: alternate styles, higher-resolution scientific linework.
- terrain: higher-resolution or alternate-source terrain, month-aware DEM families, neutral terrain-only palettes.
- bathymetry: alternate products such as GEBCO-only styling, higher-resolution grids, additional hypsometric palettes.
- natural-color seasonal imagery.
- further Blue Marble variants.
- political: alternate styles, borders-only overlay-friendly variants.
- borders-only overlay-friendly maps.
- population density: alternate GPW epochs, WorldPop grids.
- land cover: Copernicus 100 m discrete map, alternate MODIS epochs, higher-resolution products.
- biome / ecology.
- climate: temperature and precipitation climatologies, alternate Köppen epochs (Beck V3), Köppen border-only variants.
- precipitation.
- temperature normals (distinct raster products).
- cloud climatology.
- additional night-light or light-pollution **map substrate** products beyond the bundled Black Marble composition input.
- light pollution.
- shaded relief.
- terrain-only neutral substrate.
- antique or paper-style reference map if visually differentiated.
- high-contrast accessibility map.
- dark-friendly overlay substrate.

### Map asset quality improvements

- stronger source provenance in the catalog, beyond per-family `licenseNote` and `sourceLinks`.
- clear placeholder versus sourced status.
- map source processing notes.
- validation checklists per family.
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
- moon phase beyond the existing sublunar-marker phase representation.
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

New consumers reuse the existing lifecycle subsystem; its contract, and the sources already wired, are in [`docs/specs/scene/dynamic-data-lifecycle.md`](specs/scene/dynamic-data-lifecycle.md). Weather participation models are explored in [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md).

Adding any of these is a product decision requiring explicit scope, not a consequence of the seam supporting it. Prefer free-for-personal-use sources; paid sources are acceptable when the benefit is clear.

- weather radar.
- precipitation forecast.
- temperature forecast.
- wind fields.
- pressure systems.
- hurricane tracks.
- aurora forecast.
- volcano activity.
- aircraft ADS-B feed.
- marine AIS feed.
- satellite live positions.
- spacecraft beyond the ISS.
- lightning feed.
- wildfire smoke.
- air quality.

## Composition and visual systems

Planetary illumination and overlay readability are existing upstream subsystems; see [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md#6-scene-and-layer-architecture). Everything below extends them and requires explicit product scope. None of it is standing work, and none of it should be read as reopening a settled baseline.

### Planned or candidate composition features

- layer blending modes.
- multiply, screen, additive, normal.
- alpha masks.
- geometric clipping.
- viewport clipping.
- composition-aware day/night illumination.
- atmospheric scattering and haze, or further narrow tuning passes in `src/renderer/illuminationShading.ts` beyond the current constants.
- shadow and glow effects expressed upstream as RenderPlan intent.
- overlay-readability extensions beyond the current model: per-layer readability contracts for stack rows that do not have one; finer multi-row semantics, such as separate tuning per static-raster row; additional catalog or resolver substrate heuristics beyond the current intrinsic hints.
- per-layer contrast/brightness/saturation/gamma where appropriate.
- high-contrast accessibility mode.

### Day/night product ideas

- scientifically grounded day/night and twilight attenuation.
- configurable twilight softness as a persisted scene axis, if the product ever warrants exposing it.
- additional night-light data products as composition or substrate inputs.
- emissive readability presets tied to overlay density or zoom, once those modes exist.
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
- packaged desktop distribution through the Tauri shell.
- hosted dashboard mode only if AGPL/network implications are intentional.
- local network display endpoint.
- OBS/streaming background mode.
- kiosk mode.
- educational mode explaining longitude, time, seasons, and projection.
- mission-control style scene packs.
- personal travel/world-clock dashboard.
