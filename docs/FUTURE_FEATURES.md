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
- attribution display for the selected base-map family.
- per-family base-map presentation controls.
- shared presentation persistence across seasonal/month-aware raster variants.

Future map and scene UX work should extend these foundations rather than replacing them.

## Implemented astronomical and illumination foundations

The current scene system already includes:

- solar shading / dark-side visualization with twilight band transitions in the same illumination raster (not a separate user-facing twilight layer; backend execution is still a plain raster blit).
- subsolar marker.
- sublunar marker.
- solar analemma overlay.
- semantic astronomical scene participation through the layer system.

Future work should extend these systems into a more coherent atmospheric and composition-aware rendering model.

## Maps and base-map families

### Candidate curated map families

- geology.
- topography refinement.
- bathymetry.
- ocean floor / seafloor relief.
- natural-color seasonal imagery.
- Blue Marble variants.
- political reference maps.
- borders-only overlay-friendly maps.
- population density.
- vegetation / land cover.
- biome / ecology.
- climate zones.
- Koppen-Geiger climate.
- precipitation.
- temperature normals.
- cloud climatology.
- night lights.
- light pollution.
- shaded relief.
- terrain-only neutral substrate.
- antique or paper-style reference map if visually differentiated.
- high-contrast accessibility map.
- dark-friendly overlay substrate.

### Map asset quality improvements

- stronger source provenance in catalog.
- richer attribution display.
- preview thumbnails for all families.
- clear placeholder versus sourced status.
- map source processing notes.
- validation checklists per family.
- month-aware family explanation in UI.
- active displayed-month indication for seasonal families.
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

- solar shading / dark-side visualization (civil, nautical, and astronomical twilight encoded in the same upstream illumination raster, not a separate twilight layer).
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

Blocked until dynamic data lifecycle exists.

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

### Planned or candidate composition features

- layer blending modes.
- multiply, screen, additive, normal.
- alpha masks.
- geometric clipping.
- viewport clipping.
- composition-aware day/night illumination.
- emissive night-lights composition.
- atmospheric glow transitions.
- shadow and glow effects expressed upstream as RenderPlan intent.
- overlay readability tuning.
- active solar-position synchronization along analemma trajectories.
- per-layer contrast/brightness/saturation/gamma where appropriate.
- high-contrast accessibility mode.

### Day/night product ideas

- scientifically grounded day/night shading.
- configurable twilight softness.
- optional night lights.
- emissive city lights.
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
