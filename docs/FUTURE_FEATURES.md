# Future features

## Purpose

This document preserves the future-feature inventory that has accumulated during Libration development.

It is not a commitment to implement anything. It is a retention document so that good ideas are not lost when they are deliberately deferred.

**It is not a status surface.** For what the product does today see [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md). Nothing here should be read as approved or scheduled work; an idea reaching this list means only that it was worth keeping.

The Eclipse System (E1–E6) is production. Remaining ideas in [Moon, Sun-Moon-Earth, and observer astronomy](#moon-sun-moon-earth-and-observer-astronomy) are unapproved. The strongest remaining candidate in that family is [lunar visibility and moonlight geometry](#lunar-visibility-and-moonlight-geometry). It is not approved.

## Status vocabulary

- **Candidate** — worth considering later.
- **Planned** — a likely direction, not current work.
- **Blocked** — depends on architecture that does not exist yet.
- **Rejected** — intentionally not desired.

Several sections describe extensions to subsystems that already exist. Those subsystems are described in [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md), and work in those areas should **extend** them rather than introduce parallel mechanisms — see design principles 7–9 in [`docs/PROJECT_STRATEGY.md`](PROJECT_STRATEGY.md).

## Moon, Sun-Moon-Earth, and observer astronomy

This family is the retained product intent from the post-[LIB-011](work/LIB-011-observer-oriented-lunar-libration.md) architecture discussion. Moon visual development through LIB-011 is complete. The Eclipse System through E6 is production ([LIB-012](work/LIB-012-eclipse-system-architecture.md) through [LIB-019](work/LIB-019-eclipse-product-polish.md)). Ranking below is future-work preference only: it is not permission to start implementation, and it is not an E7.

Strategic pointer: [`docs/ROADMAP.md`](ROADMAP.md). Current development state: [`docs/STATE.md`](STATE.md). What already exists: [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md).

### Ranking

| Rank | Role | Entry |
|------|------|--------|
| 1 | Preferred remaining direction | [Lunar visibility and moonlight geometry](#lunar-visibility-and-moonlight-geometry) |
| 2 | High-value follow-on | [Reference-city Moon altitude and azimuth](#reference-city-moon-altitude-and-azimuth) |
| 3 | High-value follow-on | [Lunar nodes and eclipse relationships](#lunar-nodes-and-eclipse-relationships) |
| 4 | Later Moon enhancement | [Earth-Moon distance, perigee, and apogee](#earth-moon-distance-perigee-and-apogee) |
| 5 | Later Moon enhancement | [Symbolic lunar surface and face orientation](#symbolic-lunar-surface-and-face-orientation) |
| 6 | Longer-term product direction | [Astronomical Events](#astronomical-events) |
| 7 | Longer-term product direction | [Accessible versus technical terminology](#accessible-versus-technical-terminology) |

### Visual-design principle

Apply design principle 9 in [`docs/PROJECT_STRATEGY.md`](PROJECT_STRATEGY.md): the default map should remain beautiful and usable as an ambient display. Do not add large map-spanning geometry merely because it can be calculated. Large geographic effects should earn their visual footprint by communicating important geographic information. Prefer small decorations on existing geometry when possible.

For this family, distinguish three roles:

| Role | Suitable for continuous display? | Examples in this family |
|------|----------------------------------|-------------------------|
| **Ambient astronomy** | Yes | Sun and Moon glyphs, phase, libration, lunar locus, solar analemma, illumination |
| **Explanatory astronomy** | Optional | Lunar horizon, nodes, altitude/azimuth, distance information |
| **Event astronomy** | Only when something unusual is approaching or occurring | Eclipse forecast bands, live eclipse alignment, dramatic beam/shadow visualization |

The point is to keep Libration an instrument, not a cluttered astronomy diagram.

### Eclipse System

**Production** through E6 ([LIB-012](work/LIB-012-eclipse-system-architecture.md) through [LIB-019](work/LIB-019-eclipse-product-polish.md); [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md)). Architecture and authority: [`docs/specs/scene/eclipse-system.md`](specs/scene/eclipse-system.md). There is no approved E7.

Shipped: offline NASA/Espenak–Meeus authority; global solar forecast and live footprint; lunar Earth-shadow on the Moon glyph; lunar advance forecast (separate 7-day horizon); reference-city circumstances that never filter global truth; live alignment/beam; grouped configuration; event information; restrained labels; type filters; independent styling; factory solar/lunar masters on; honest unsupported-range copy. Lunar eclipse map presentation no longer paints a terrestrial Moon-visible hemisphere ([LIB-046](work/LIB-046-remove-lunar-eclipse-moon-visible-geography.md)). [LIB-047](work/LIB-047-eclipse-tour-demo-playback.md) adds Eclipse Tour under Layers → Eclipse as Demo-time navigation (not a second clock, not eclipse authority). [LIB-020](work/LIB-020-eclipse-reconciliation-and-lunar-forecast.md) is a post-E6 reconciliation, not E7. [LIB-021](work/LIB-021-lunar-eclipse-visual-reconciliation.md) is a later presentation reconciliation (map info panel, moonlight attenuation, spatial Earth-shadow, label avoidance), also not E7. [LIB-042](work/LIB-042-eclipse-presentation-semantics-and-label-placement.md) reconciles HUD/placard/map-label copy and moves solar event labels off the path onto the Sun/Moon cluster; it is not E7.

The following remain **unapproved** recoverable extras, not a continuation of the planned sequence:

- past/future active-corridor split
- swept penumbra union (E2 uses a representative greatest-eclipse partial outline)
- event browser / history / search-by-date catalog
- map click-inspect of eclipse overlays (scene pointer inspection remains Phase 11)
- atmospheric eclipse color (horizon shifts, corona, Purkinje, sky color); map illumination attenuation from local obscuration is production ([LIB-027](work/LIB-027-continuous-solar-eclipse-obscuration-shading.md))
- advanced style options beyond the E6 color / thickness / opacity families
- About-page authority provenance (identity remains durable internally)
- notifications

Do not treat those extras as approved work. Related inventory pointer: the [derived overlays](#derived-overlays) list below points here rather than keeping a separate one-liner.

### Lunar visibility and moonlight geometry

**Candidate.** Strong follow-on / enabling feature. Related to, but not the same as, the Eclipse System. Lunar eclipse presentation no longer paints the geometric Moon-above-horizon contour ([LIB-046](work/LIB-046-remove-lunar-eclipse-moon-visible-geography.md)); illumination still uses that geometry internally (`lunarDot ≥ 0`). A standing ambient Lunar Visibility overlay remains unapproved.

Expose the geometry behind Moon visibility and the existing moonlight / solar-shading behaviour, rather than inventing an unrelated night-side effect. Current moonlight already participates in the upstream illumination raster; see [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md).

Related but distinct concepts:

- **Lunar horizon boundary.** A precise geographic boundary separating locations where the Moon is above the horizon from those where it is below. Attractive because it is geometrically meaningful, visually lightweight, conceptually related to the solar terminator, and useful for understanding Moon visibility.
- **Moonlight participation.** Optionally expose the geometry that determines where the existing moonlight contribution can actually participate. Integrate with current solar shading / moonlight behaviour.
- **Lunar illumination / intensity contours.** Configurable boundaries for meaningful moonlight intensity or illumination thresholds. Not assumed to be required in a first realization.

Preserve an expectation of **options**, without freezing controls: off; boundary line; line plus subtle region; illumination contours; styling choices.

This is explanatory astronomy. A default ambient map should not be forced to show it.

### Reference-city Moon altitude and azimuth

**Candidate.** High-value follow-on. Observer information for the existing reference-city concept — the same city already used by chrome time presentation and by LIB-011 observer-oriented libration. Do not create a separate Moon observer location.

At minimum, preserve: Moon altitude; Moon azimuth; compass direction; above/below horizon state.

Possible later extensions: Moon rise time; Moon set time; rise/set direction; additional observer circumstances. The existing [sunrise/sunset for selected city](#time-and-reference-frame-features) idea remains a sibling, not a replacement.

Two independently configurable presentation modes are desired:

- **Inspectable / detail presentation.** A richer Moon information surface, tooltip, or inspection view. Possible contents, not a frozen list: altitude; azimuth; above/below horizon; phase; illumination percentage; distance; rise/set information.
- **Persistent chrome presentation.** Optional compact always-visible status associated with the reference city. Conceptual example only, not syntax or placement: `☾ +38° · SE`. Related chrome inventory: [status readouts](#display-chrome) and [current reference city readout](#display-chrome).

A possible later sibling is equivalent **Sun** altitude/azimuth information. That is not a complete solar-observer design and should not expand this item into one.

### Lunar nodes and eclipse relationships

**Candidate.** High-value follow-on. Nodes should help explain **why** eclipse conditions arise, not merely add orbital trivia.

The explanatory relationship to preserve:

```
lunar locus
    → nodal crossing
    → Sun/Moon phase alignment near a node
    → eclipse possibility
```

The lunar locus is a natural candidate surface on which node crossings could eventually be represented. The ~18.6-year nodal regression is already visually apparent through changes in lunar-locus geometry (major versus minor standstill amplitude); node decorations should be able to speak to that cycle.

Potential configurable decorations, without freezing glyphs or rendering: off/on; ascending node; descending node; symbols; labels; node-related annotations; proximity-to-node emphasis; eclipse-relevance emphasis.

Prefer restrained decorations over additional large map-spanning lines. This is explanatory astronomy that may become more prominent when eclipse-relevant.

Lunar **standstill envelopes** remain a separate unapproved derived-overlay idea, related to the same nodal cycle, not absorbed into the Eclipse System.

### Earth-Moon distance, perigee, and apogee

**Candidate.** Later Moon enhancement.

Potential information: current Earth–Moon distance; apparent angular diameter; approaching/receding state; perigee; apogee; timing relative to the nearest perigee/apogee; position within the anomalistic cycle.

**Do not** automatically resize the production Moon glyph according to physical distance. The existing user-selected Moon glyph size is a presentation control with clear semantics. Distance variation should be communicated through information and/or optional event decoration.

Default future product presentation should favor familiar terminology such as **Supermoon** and **Micromoon** where appropriate, while keeping precise astronomical values available. Colloquial labels such as “supermoon” may not have a single universally binding astronomical threshold; Libration must eventually define and document whatever classification it uses rather than treating the term as a fundamental celestial state.

A product-wide accessible-versus-technical terminology preference, if ever introduced, should apply here; see [Accessible versus technical terminology](#accessible-versus-technical-terminology).

### Symbolic lunar surface and face orientation

**Candidate.** Later Moon enhancement. This refines the earlier “apparent lunar orientation / lunar north rotation” backlog idea. LIB-011 shipped map-versus-observer **libration-marker** orientation; that marker-frame rotation is **not** this item.

Preferred first realization: a **symbolic** lunar surface, not a photographic texture. Conceptually a small number of recognizable simplified maria / surface features so that actual apparent movement of the lunar face becomes visible.

The purpose is not lunar cartography. The purpose is to let the observer perceive libration rocking, apparent face orientation, and lunar-north / sky orientation.

Preserve independence among:

1. phase;
2. libration indicator (ring / crosshair / off);
3. symbolic lunar surface detail.

A future user should be able to use these together or independently. Complements, and must not replace, the existing optical-libration mark.

Reuse the observer-frame foundation established by LIB-011 rather than creating a competing orientation model.

Prefer an experimental / DEV visual exploration before committing to production surface detail.

### Astronomical Events

**Candidate.** Longer-term architectural / product direction. Not a framework, not an implementation plan, and **not** a reason to generalize the Eclipse System into an events platform on the way in.

Conceptual purpose: determine what noteworthy astronomical events are approaching, active, or recently passed at Libration’s authoritative / simulated **product time**.

Directional examples, not committed scope: solar eclipses; lunar eclipses; notable perigee / full-Moon combinations; solstices / equinoxes; conjunctions; meteor-shower peaks; other future astronomical events.

**Events must follow product time.** If the user accelerates demo time by months or years, future event behaviour should eventually arrive, activate, and pass according to simulated time. Do not tie event detection to wall-clock time. See the time model in [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md) and [ADR 0004](decisions/0004-one-canonical-utc-instant-per-frame.md).

### Accessible versus technical terminology

**Candidate.** Longer-term product-wide presentation preference. Recorded here because distance / perigee / apogee and eclipse language will need it; not a complete terminology-system design.

Conceptually two styles:

- **Accessible / familiar** — the normal / default experience (for example Supermoon, Micromoon, everyday eclipse wording).
- **Technical / precision-oriented** — more exact terminology, quantities, units, and distinctions.

Do not settle the preference name, schema, or complete consequences now.

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
- **Symbolic lunar surface / apparent face orientation** — see [Symbolic lunar surface and face orientation](#symbolic-lunar-surface-and-face-orientation). Replaces the earlier “apparent lunar orientation / lunar north rotation” one-liner. LIB-011 marker-frame rotation is not this item.
- analemma variants.
- equinox and solstice reference overlays.
- **Eclipse System** — see [Eclipse System](#eclipse-system). Replaces the earlier “eclipse path overlays” one-liner. E1–E6 are production. Deferred extras remain unapproved. Architecture in [`docs/specs/scene/eclipse-system.md`](specs/scene/eclipse-system.md).
- lunar horizon / moonlight-participation / illumination-contour geometry — see [Lunar visibility and moonlight geometry](#lunar-visibility-and-moonlight-geometry).
- lunar standstill envelopes (related to the nodal cycle already visible as lunar-locus amplitude change; not a production control today). See also [Lunar nodes and eclipse relationships](#lunar-nodes-and-eclipse-relationships).
- lunar nodes on or near the lunar locus — see [Lunar nodes and eclipse relationships](#lunar-nodes-and-eclipse-relationships).
- Earth-Moon distance / perigee / apogee presentation — see [Earth-Moon distance, perigee, and apogee](#earth-moon-distance-perigee-and-apogee). Do not auto-resize the Moon glyph.
- great-circle paths.
- antipode markers.
- local noon/midnight curves.
- reference-city meridian line.
- read-point alignment marker.
- UTC meridian reference.

### Dynamic and live layers

New consumers reuse the existing lifecycle subsystem; its contract, and the sources already wired, are in [`docs/specs/scene/dynamic-data-lifecycle.md`](specs/scene/dynamic-data-lifecycle.md). Weather participation models are explored in [`docs/specs/scene/weather-cloud-composition-plan.md`](specs/scene/weather-cloud-composition-plan.md).

Adding any of these is a product decision requiring explicit scope, not a consequence of the seam supporting it. Prefer free-for-personal-use sources; paid sources are acceptable when the benefit is clear.

ISS **current-position** (SGP4 at the product instant, not the future track tip) is production as of [LIB-035](work/LIB-035-dynamic-live-time-integrity-and-iss-position.md). ISS live provenance, TLE freshness (≤18 h live / 18–48 h degraded / >48 h hidden), and hide-on-live-TLE-failure are production as of [LIB-036](work/LIB-036-iss-live-provenance-freshness-and-fallback.md). Immediate-on-enable acquisition, 2-hour TLE refresh, 8 s timeout, and ordered CelesTrak → Where the ISS at failover are production as of [LIB-040](work/LIB-040-iss-acquisition-reliability-fast-first-paint.md) / [ADR 0014](decisions/0014-iss-live-tle-ordered-provider-failover.md). Layers → **Space objects** is the ISS presentation home as of [LIB-038](work/LIB-038-space-objects-iss-presentation.md) (orbit track, past/future segments, glyph). Multi-orbit past/future horizons derived from TLE mean motion, local SGP4 window expansion, orbit-distance fading, and ISS silhouette glyph-color are production as of [LIB-041](work/LIB-041-iss-multi-orbit-track-horizons.md). It is the intended configuration home for future satellites and spacecraft; those objects are not implemented. Current-only live layers are also suppressed when product time is not live-enough. The following **hardening** remains unapproved and must not be treated as started:

- production fixture-on-live-failure policy for clouds/IR and earthquakes (ISS already hides when no live TLE can be acquired)
- stale/error UX for clouds/IR and earthquakes (ISS has concise Layers loading/unavailable/degraded hints)
- persistent snapshot cache
- retry/backoff/timeouts for clouds/IR and earthquakes
- GIBS historical `TIME`
- earthquake magnitude/age filters
- API-key / proxy / desktop `fetchFn`
- historical USGS / TLE-history providers

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
- shadow and glow effects expressed upstream as RenderPlan intent. Dramatic eclipse alignment / beam decoration is a separate event-astronomy idea; see [Eclipse System](#eclipse-system).
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
- click-to-inspect lat/lon/time. A richer Moon inspection surface is a separate idea; see [Reference-city Moon altitude and azimuth](#reference-city-moon-altitude-and-azimuth).
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
- sunrise/sunset for selected city. See also [Reference-city Moon altitude and azimuth](#reference-city-moon-altitude-and-azimuth) for Moon altitude, azimuth, and possible later rise/set information using the same reference city.
- Moon altitude / azimuth / compact chrome status for the reference city — see [Reference-city Moon altitude and azimuth](#reference-city-moon-altitude-and-azimuth).
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
- status readouts. A compact always-visible Moon altitude/azimuth chip associated with the reference city is one candidate; see [Reference-city Moon altitude and azimuth](#reference-city-moon-altitude-and-azimuth).
- current reference city readout. Reuse the same authoritative city; do not add a second observer location for Moon or eclipse information.
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

- **Improved settings organization** — Layers ([LIB-030](work/LIB-030-config-panel-layers-subpanels.md), [LIB-031](work/LIB-031-sticky-layers-topic-navigation.md)) and Chrome ([LIB-032](work/LIB-032-chrome-tab-topic-organization.md)) topic subpanels are production. Remaining organization (search, other-tab grouping) is still a candidate.
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
- educational mode explaining longitude, time, seasons, and projection. Explanatory astronomical overlays should still follow the [visual-design principle](#visual-design-principle).
- astronomical events following product time — see [Astronomical Events](#astronomical-events). Longer-term direction, not a framework to build before or instead of the Eclipse System.
- mission-control style scene packs.
- personal travel/world-clock dashboard.
