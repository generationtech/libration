# Libration architecture

This document owns Libration's **durable architecture**: the boundaries, invariants, and structural commitments that implementation work is required to preserve.

It deliberately contains no status, no maturity assessment, no feature ledger, and no roadmap position.

- How the current code actually works: [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md)
- Why specific durable choices were made: [`docs/decisions/`](docs/decisions/)
- What the product is for: [`docs/PROJECT_STRATEGY.md`](docs/PROJECT_STRATEGY.md)

Each invariant below is stated as **boundary**, **rationale**, and **consequence**, because an invariant without its rationale is a rule people route around, and an invariant without its consequences is a rule people underestimate.

---

## 1. Architectural identity

Libration is a renderer-agnostic, longitude-first world time and global scene instrument.

Five commitments define the system:

1. Time is canonicalized as UTC instants.
2. Spatial structure is longitude-first, not timezone-first.
3. Product meaning is resolved upstream of rendering.
4. Rendering intent is expressed as a backend-neutral `RenderPlan`.
5. Backends execute resolved plans and do not own product semantics.

Everything else in this document follows from these.

---

## 2. The pipeline

All visual output follows one shape:

```mermaid
flowchart LR
    IN[Config, Time, Assets] --> RES[Resolvers]
    RES --> SEM[Semantic planning]
    SEM --> LAY[Layout]
    LAY --> ADA[Realization adapters]
    ADA --> RP[RenderPlan]
    RP --> EX[Executor]
    EX --> BE[Backend]
```

Upstream of `RenderPlan`, code may know about time, map families, chrome meaning, scene layers, fonts, glyph kinds, and user configuration.

Downstream of `RenderPlan`, code may know about surfaces, drawing APIs, caches, image resources, font registration, and primitive execution.

Nothing may know about both.

---

## 3. Time invariants

### 3.1 One authoritative UTC instant per frame

**Boundary.** Each frame resolves exactly one canonical product instant. Every downstream computation — geometry, astronomy, asset resolution, data selection, labels — derives from that single value.

**Rationale.** Libration is a time instrument before it is a map. If two parts of a frame can disagree about what time it is, the instrument is not merely imprecise, it is incoherent: the terminator, the tape, the pins, and the readout would each be telling a slightly different truth. A single instant makes every frame internally consistent by construction rather than by discipline.

**Consequence.** No code downstream of the frame's time resolution may call a wall clock. Anything needing time takes it from the frame's time context. Introducing a second clock is not a performance shortcut; it is a correctness regression.

See [ADR 0004](docs/decisions/0004-one-canonical-utc-instant-per-frame.md).

### 3.2 Display modes format; they do not mutate

**Boundary.** Display mode, reference civil zone, reference city, and label style change **presentation only**. They never change the canonical instant.

**Rationale.** Civil time is a projection of an instant, not a competing definition of it. Users switch between 12-hour, 24-hour, UTC-style, and reference-city framings to read the same moment differently. If any of those switches perturbed the underlying clock, the display would be self-referential.

**Consequence.** A formatting change must never feed back into time resolution. Chrome geometry that depends on civil time derives it from the canonical instant plus a zone, not from a formatted string. Reference city selection contributes a meridian for spatial registration, not a clock.

### 3.3 Demo time replaces the source; it does not add one

**Boundary.** Demo mode is the single sanctioned exception to real-time operation. It substitutes the time source and is otherwise indistinguishable downstream except for an explicit `simulated` flag.

**Rationale.** Deterministic and accelerated time is genuinely necessary — for demonstration, for reviewing seasonal and diurnal behaviour, and for reasoning about the illumination model. The way to provide it without violating 3.1 is substitution, not addition.

**Consequence.** Demo time is configured, not ad hoc. Nothing downstream branches on demo mode to alter product behaviour.

### 3.4 Current-only internet data requires live-enough product time

**Boundary.** Internet-backed observations that are current-only under their present implementations may be shown only when the product instant is close enough to wall-clock now. Product time remains the scene authority. Wall clock is a validity gate, not a second display clock.

**Rationale.** The three production-optional live sources (Clouds, earthquakes, ISS TLE) describe wall-clock-now reality. Painting them onto a materially different product instant — a 2017 eclipse, an accelerated future Demo — would make the instrument temporally incoherent in the same way a stray `Date.now()` would.

**Consequence.** The frame may read wall-clock now once at the top (already required to distinguish real vs demo time) and pass it into the current-only gate. Downstream of that point, layers still consume only the product instant and prepared views. Durable enable preferences are not mutated by temporary suppression. Historical-capable sources may later declare a different time policy.

See [ADR 0013](docs/decisions/0013-current-only-internet-data-requires-live-enough-product-time.md).

### 3.5 Observational data distinguishes product, observation, and acquisition time

**Boundary.** Product time remains the single scene instant. Observational snapshots additionally record the instant the data represents (`validTimeMs`) and the instant Libration fetched the bytes (`acquiredAtMs`). Those three values are allowed to differ. Freshness for Clouds uses observation age, not fetch age.

**Rationale.** A near-current satellite mosaic is not “now” merely because the app just downloaded it. EUMETView worldcloudmap slots are 3 hours and GIBS Band13 slots are 10 minutes, but ingest can lag by hours. Stamping observation from wall clock, or omitting provider `TIME`, made status dishonest and invited empty-future mosaics.

**Consequence.** Clouds GetMap always sends explicit `TIME`. Status may say mosaic HH:MM UTC or observed Nh ago; it must not claim live-now for a lagging mosaic. Do not add a second display clock or a parallel Weather store to hold these fields. A composed observational product may carry several observation times; that is [§3.7](#37-observational-composites-may-combine-heterogeneous-observation-times).

See [ADR 0022](docs/decisions/0022-observational-data-three-clocks.md).

### 3.6 Layers answers what is rendered; Data answers when it is viewed

**Boundary.** Scene presentation — visibility, rendering, and appearance filters — lives under Layers. Product-time navigation — generic Demo and domain event playback — lives under Data. Domain event authorities remain upstream of both and may serve both. Event playback commands the existing Demo-time controller; it does not own a clock.

**Rationale.** Mixing time travel into Layers topics made Eclipse Tour and Milky Way “Go to next” look like rendering features. The instrument already has one product instant. Navigation belongs with that instant. Rendering belongs with the scene.

**Consequence.** Layers must not seek `TimeContext.now`. Data must not grow domain rendering controls. Enabled event types merge into one chronological Demo-time stream; adding another source means a Data playback adapter plus, if needed, Layers presentation — not a second clock, not a family submode, and not a generic astronomical engine.

See [ADR 0015](docs/decisions/0015-domain-tour-sequencer-drives-shared-demo-time.md) (shared Demo clock), [ADR 0019](docs/decisions/0019-domain-event-playback-belongs-to-data.md) (Data vs Layers ownership), and [ADR 0020](docs/decisions/0020-event-playback-merges-enabled-domain-sources.md) (merged event sources).

### 3.7 Observational composites may combine heterogeneous observation times

**Boundary.** Fresh authoritative observations are not delayed solely to share one timestamp with other sources, domains, or geographies. A single rendered Weather product may contain multiple observation times. Each component keeps its own observation time, acquisition time, freshness, coverage, and provenance. Product time remains the single scene instant.

**Rationale.** Geostationary disks and future radar/lightning/wind/advisory products update on independent cadences. Forcing `min(latest sources)` as a common mosaic time, or waiting for the slowest sector, makes the instrument older than the observations it already has. Temporal interpolation would invent meteorology. That is the wrong trade for a current-weather instrument.

**Consequence.** Clouds compose the freshest valid GOES-East, GOES-West, Meteosat, and Himawari observations independently, with the EUMET geostationary ring as coverage backstop. Observational **coverage** (the provider has valid data at a pixel) is distinct from derived **cloud signal** (IR highlight). A valid-clear **usable** (q>0) observation still owns its footprint and suppresses older ring or regional cloud; transparent highlight is not no-data. Freshness applies within a meaningful authority class: it does not let an unusable q=0 GEO limb suppress a valid global backstop. Status reports the visible observation-age range. Unused source ages do not pollute that range. Seams between disks may show real temporal disagreement. There is no user sync-mode toggle. Weather domains must not wait on one another. Do not interpolate, motion-warp, or nowcast. Viewing-quality overlap is [§3.8](#38-observational-quality-is-distinct-from-coverage).

See [ADR 0023](docs/decisions/0023-observational-composites-heterogeneous-observation-times.md).

### 3.8 Observational quality is distinct from coverage

**Boundary.** Observational composites distinguish coverage, viewing quality, and derived signal as independent planes. Quality never converts valid coverage into no-data. In dual coverage, freshness dominates among comparable useful quality; an extreme-limb observation may lose to a modestly older substantially better view. When every covering regional observation is quality=0, a geometrically usable global backstop is preferred; a geometrically unusable backstop yields to quality=0 regional coverage when that regional exists. Overlap is a hard per-pixel winner.

**Rationale.** Provider valid-data answers whether a source observed a pixel. Viewing geometry answers whether that observation should be preferred in overlap. Derived highlight answers only how clouds look. Conflating those three either punches holes in coverage or lets a worse disk edge overwrite a better view because it is one cadence newer. Treating quality=0 as preferred authority over a coherent global backstop lets GEO limb footprints define the map.

**Consequence.** Clouds keep a per-source `coverageMask`, `qualityWeight`, and `cloudSignal`. Authority is: usable regional (`coverage && q>0`), then good ring (`coverage && ring q>0`), then extreme-geometry regional (`coverage && q==0`), then poor ring (`coverage && ring q==0`), then no data. Ring quality is inferred from documented geostationary-ring component sub-satellite geometry because the provider WMS does not expose per-pixel source provenance; it is not image content. The ring cannot reappear under usable q>0 regional coverage, including valid-clear. Quality=0 remains coverage and still paints when no better class exists. Residual source-handoff contrast after a correct geometric winner is a presentation problem, not an authority defect. Do not blend overlapping observations to hide that mismatch. Provider display interpretation is [§3.9](#39-heterogeneous-display-rasters-are-normalized-before-shared-presentation).

See [ADR 0024](docs/decisions/0024-observational-quality-distinct-from-coverage.md).

### 3.9 Heterogeneous display rasters are normalized before shared presentation

**Boundary.** Observational provider rasters that are display visualizations, not a common physical field, are converted through a fixed per-provider interpretation into a canonical scalar before shared appearance semantics run. Source authority does not depend on that scalar.

**Rationale.** Geostationary IR products Libration consumes are not one grayscale. GIBS Band13 WMS is a false-color visualization; Meteosat and the EUMET ring are different inverted stretches. Rec.601 luma of those encodings is not comparable, so a shared luma transfer paints some providers’ clear sky as cloud. Lifts and blending do not create a common physical axis.

**Consequence.** Clouds interpret GIBS Band13 through the published colormap into canonical display IR. Meteosat IR108 and the EUMET ring both use identity grayscale (`luma / 255`). Chromatic GIBS pixels use a 64³ LUT of nearest-segment projections; near-gray GIBS pixels invert along the warm-gray legend by luma because that visualization reuses grayscale on two thermal branches and RGB-nearest lookup would turn WMS-resampled gray into false cold cloud. One conservative cloud-confidence curve then produces the white/gray overlay. Valid-clear remains coverage with confidence 0. Canvas still receives one composed RGBA. Do not treat the canonical scalar as brightness temperature or optical depth. Do not expose per-provider calibration in the UI. Polar cold-surface IR, warm/low-cloud ambiguity, and GIBS false-color convective cores versus ring gray remain inherent display-IR limits, not a reason to blend coverage.

See [ADR 0025](docs/decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md).

---

## 4. Rendering invariants

### 4.1 `RenderPlan` is a hard boundary

**Boundary.** `RenderPlan` is the complete, backend-neutral description of what to draw: an ordered list of primitives. It is the only thing a backend receives.

**Rationale.** The product's rendering intent is elaborate and its drawing surface is replaceable. Keeping intent in a declarative structure means the meaning of a frame can be inspected, tested, and reasoned about without a canvas, and a future backend inherits correct behaviour rather than reimplementing it.

**Consequence.** A plan is fully testable without rendering — plan-level tests are the primary way geometry is verified. A second backend requires no product-side changes. Conversely, any product decision that reaches a backend has escaped the boundary and must be moved upstream.

See [ADR 0001](docs/decisions/0001-renderplan-as-the-renderer-boundary.md).

### 4.2 Backends execute; they do not decide

**Boundary.** A backend receives resolved intent. It must not inspect `SceneConfig` or any product configuration to decide product behaviour. It must not implement asset-resolution policy, decide fonts, glyph kinds, or layer semantics, and must not own layout.

**Rationale.** Every product rule that leaks into a backend is a rule that must be reimplemented, identically, in every future backend — and that will silently diverge.

**Consequence.** Backend bridges translate shared intent into backend-native calls and nothing more. Backends may report **concrete resource events** (an image URL failed to load, a font failed to register), because those are facts about the drawing surface. They may not choose a replacement. Fallback is policy, and policy is upstream.

### 4.3 Draw order is resolved upstream

**Boundary.** `RenderPlan` items are drawn in array order. There is no z-sorting or compositing in the executor.

**Rationale.** Ordering is a product decision — which overlay occludes which — and belongs where the product is modelled. A sorting executor would create a second, weaker place to express ordering.

**Consequence.** Scene composition resolves the full order before plan construction. Ties preserve document order, so layer ordering is deterministic and reproducible.

### 4.4 Composition happens upstream, not in the backend

**Boundary.** There is no generalized compositor and no backend-owned blend policy. Where multiple physical effects contribute to one visual result, they are combined upstream into a single primitive.

**Rationale.** A general compositor would be a second, weaker place to express product meaning, and it would push physically-motivated decisions into a layer that cannot reason about them.

**Consequence.** Planetary illumination — solar geometry, twilight, moonlight, emissive night lights, optional cloud participation — resolves to **one** `rasterPatch`. The backend decodes images and blits pixels; it has no illumination concepts at all.

See [ADR 0002](docs/decisions/0002-single-upstream-planetary-illumination-rasterpatch.md). Lunar-eclipse suppression of ordinary moonlight is part of that same raster: a coverage-derived transmission scalar multiplies phase moonlight independently of informational eclipse overlays ([ADR 0011](docs/decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md)). Active solar-eclipse local obscuration likewise attenuates remaining daylight in that raster, independently of informational solar eclipse overlays ([ADR 0012](docs/decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md)).

---

## 5. Chrome invariants

### 5.1 Chrome is screen-space

**Boundary.** Display chrome is instrument content in screen space. It is not a scene layer, does not participate in map projection, and does not enter scene layer ordering.

**Rationale.** Chrome is the instrument's frame of reference. Making it a scene layer would subject the reading surface to projection, camera, and layer-ordering concerns that have nothing to do with reading time.

**Consequence.** Chrome and scene are separate rendering passes over the same surface. Chrome elements are positioned in CSS pixels, even when their position is *derived* from longitude. A scene camera (zoom, pan) transforms scene-strip content only. It must not scale, translate, or rotate chrome. Structural meridians register with the map at the identity camera (the 2.0.0 full-world view); when the camera is not identity, chrome remains a full-world instrument ruler.

### 5.2 Chrome reserves layout before the scene viewport is resolved

**Boundary.** Chrome computes its reserved height first. The scene viewport is the full viewport minus that reservation.

**Rationale.** Chrome height is content-dependent — it varies with typography, marker size, and configured rows. The scene must be laid out against a known reservation, and the map is shortened rather than occluded so that the full longitude span stays visible.

**Consequence.** The frame order is fixed: chrome state, then scene input, then scene render, then chrome render. Chrome cannot depend on scene layout, because the dependency runs the other way.

### 5.3 Structural longitude and civil time are separate coordinate models

**Boundary.** The fixed 15° structural columns and the time-phased civil hour tape are distinct coordinate systems that coexist in the top band. They must not be unified.

**Rationale.** This is the longitude-first thesis made visible. Structural columns are geography and register exactly with the map. The phased tape is civil time and slides continuously against an anchored read point. Civil offsets are not multiples of 15° and political zones do not follow meridians, so any attempt to make one grid serve both purposes must falsify one of them.

**Consequence.** Two independent x-derivations exist by design. See [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md#5-chrome-coordinate-model) before modifying top-band geometry. Do not “fix” zoomed-map misregistration by driving chrome from the scene camera.

### 5.4 Persisted chrome state is single-sourced and derived at runtime

**Boundary.** Hour-marker persisted state lives under `chrome.layout.hourMarkers` and nowhere else. Runtime content and behaviour are derived from it, not duplicated into parallel persisted axes.

**Rationale.** Parallel persisted representations of the same concept drift, and reconciling them becomes indefinite work.

**Consequence.** Text and procedural glyph realizations both flow through the same resolver → semantic plan → layout → adapter → `RenderPlan` path. Adding a realization means adding an adapter, not a persistence axis.

---

## 6. Scene and spatial invariants

### 6.1 Projection defines spatial truth; base maps do not

**Boundary.** Geographic position is defined by the projection. A base map is a substrate that must satisfy the projection contract.

**Rationale.** Overlays, markers, pins, and derived tracks must be correct relative to each other and to geography. If the raster defined truth, every overlay would inherit that raster's registration errors, and swapping substrates would silently move everything.

**Consequence.** All scene geometry is expressed in geographic or projection-aware coordinates before rendering. A substrate whose registration cannot be corrected to the projection contract is not eligible for inclusion, regardless of how good it looks.

### 6.2 Scene view and projection are separate concepts

**Boundary.** What is being projected and how the viewer is looking at it are distinct. Projection maps reference-frame coordinates into projected map space. The scene camera maps that projected space into the scene strip (scale and translation). `scene.viewMode` is a persisted framing family (`fullWorldFixed` in 2.0.0), not the camera.

**Rationale.** Keeping them separate is what allows viewing behaviour to change without redefining spatial truth. Zoom and pan are looks at the projected world. They are not a new projection and not a new astronomical model.

**Consequence.** Month-aware base-map switching is **asset resolution**, not camera behaviour. Camera-like features affect the view, not the projection contract. Do not implement zoom by changing equirectangular parameters, by scaling the backend drawing context (which would scale strokes and type), or by mutating entity coordinates. Intended camera insertion: [`docs/specs/scene/camera-and-reference-frame.md`](docs/specs/scene/camera-and-reference-frame.md). See [ADR 0026](docs/decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

### 6.3 `SceneConfig` is authoritative for scene content

**Boundary.** `SceneConfig` owns projection, view mode, base map, and the ordered layer list. Nothing else may define scene composition.

**Rationale.** One authoritative model makes composition deterministic and reproducible, and makes presets meaningful.

**Consequence.** Runtime structures such as the layer registry are **derived** from `SceneConfig`. When it changes in a composition-relevant way, the derived structure is rebuilt rather than patched.

### 6.4 Durable semantic ids, never resolved paths

**Boundary.** Configuration persists durable semantic identifiers — base-map family ids, composition asset ids, dynamic source ids. It never persists resolved raster paths, month-specific filenames, feed URLs, or derived runtime values.

**Rationale.** Resolved values are a function of time, catalog contents, and the asset pipeline, all of which change. A persisted path is a saved configuration that breaks when any of them does.

**Consequence.** A configuration saved in one month resolves correctly in another. Assets can be re-derived, re-encoded, or relocated without invalidating user state. Month-aware families resolve concrete rasters from the canonical product instant at runtime.

### 6.5 Asset inventory is catalog-driven

**Boundary.** Base-map inventory is declared in a bundled catalog. The application does not scan asset directories at runtime and does not fetch a remote catalog.

**Rationale.** Inventory carries semantics that a directory listing cannot express: family identity, month-awareness, projection contract, attribution, licensing, and readability capabilities. Scanning would infer a weaker model from filenames and make the shipped set non-deterministic.

**Consequence.** Adding a family is a curation step producing a catalog entry, not a file drop. Provenance and licensing have a definite home.

See [ADR 0003](docs/decisions/0003-bundled-base-map-catalog-with-durable-family-ids.md). The same posture applies to the bundled solar eclipse authority: versioned NASA-derived JSON, no runtime fetch, independent of ambient Sun/Moon astronomy ([ADR 0008](docs/decisions/0008-bundled-nasa-solar-eclipse-authority.md)). Apparent planetary positions for Mercury–Neptune plus Pluto use a bundled offline ephemeris at the canonical product UTC ([ADR 0016](docs/decisions/0016-offline-planetary-ephemeris-authority.md)), independent of both ambient Sun/Moon series and eclipse catalogs. The Milky Way overlay is an extended celestial structure, not a planetary point: IAU 1958 Galactic directions projected to terrestrial zenith at the same product UTC ([ADR 0017](docs/decisions/0017-offline-iau-galactic-zenith-projection-authority.md)). A Milky Way Viewing Window is a derived **reference-city** event from that Galactic center plus astronomical darkness and existing physical moonlight ([ADR 0018](docs/decisions/0018-milky-way-viewing-window-is-a-reference-city-event.md), [ADR 0021](docs/decisions/0021-one-primary-milky-way-viewing-event.md)); it is local, not global eclipse geography, and not a visibility score.

### 6.6 Scene camera does not mutate physical or product state

**Boundary.** Zoom, pan, and other scene-camera parameters change only how the projected world is shown in the scene strip. They must not change the canonical UTC instant, astronomical calculations, entity geographic positions, lifecycle snapshots, illumination policy, or durable `SceneConfig` composition.

**Rationale.** Libration is a time and world instrument. If viewing the map also moved the Moon, the terminator, or product time, the display would no longer be an instrument. Camera state is a look, not a second world.

**Consequence.** Camera state is runtime view state unless a later decision explicitly persists it. Identity camera is the 2.0.0 full-world presentation for Earth-fixed and longitude-lock. Anchored position-lock’s product default is automatic scene-cover zoom ([ADR 0031](docs/decisions/0031-position-lock-default-camera-is-automatic-scene-cover-zoom.md)): a camera-policy scale, not a mutation of the frame or of `centerV`. Pointer hit-testing must invert the same mapping used to draw. Screen-space styling (marker size, stroke width, chrome) is allowed to remain stable while geographic geometry scales.

See [ADR 0026](docs/decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

### 6.7 Scene reference frame is independent of camera

**Boundary.** The scene/map reference frame is the coordinate frame in which world state is presented to projection. Earth-fixed is identity and is the default (2.0.0). A later entity-fixed frame (Moon, Sun, or a generic position-bearing entity) is a transform **before** projection. It is not camera-follow.

This is distinct from **civil time** reference (display mode, IANA zone, reference city), which already exists and is unchanged.

**Rationale.** If entity tracking continuously overwrites camera centre, the user cannot pan or zoom relative to that frame, and the camera becomes a hidden second clock for geography. Keeping the transform off the camera lets Moon-fixed (or any anchor) coexist with user view control.

**Consequence.** Do not implement entity-fixed mode by assigning camera centre to an entity each frame. Do not special-case the Moon, the Sun, or the ISS in the camera. World wrapping for moving frames is a reference-frame concern: use continuous/unwrapped longitude rather than treating 180° → −179° as a new world. Latitude is not periodic and is not wrapped. Earth-fixed identity remains the default production frame ([LIB-082](docs/work/LIB-082-scene-reference-frame-foundation.md)). Production frames are Earth-fixed or **anchored** ([LIB-086](docs/work/LIB-086-generalize-anchored-scene-reference-frames.md), [ADR 0030](docs/decisions/0030-anchored-scene-frames-are-one-production-kind.md), [LIB-088](docs/work/LIB-088-trackable-map-object-foundation.md), [ADR 0032](docs/decisions/0032-anchored-frames-target-a-trackable-map-object.md), [LIB-089](docs/work/LIB-089-iss-tracking-target.md), [ADR 0033](docs/decisions/0033-iss-tracking-reuses-anchored-frame-target-architecture.md)): an anchored frame targets a **trackable map object** (`target: TrackableMapObjectId` — `"moon" | "sun" | "iss"` or structured `{ kind: "city", id }` / `{ kind: "planet", id }`) with shared `lockMode` (`longitude` or `position`). Target resolution (canonical lon/lat) is separate from frame math. User-facing tracking is Tracking target + Tracking mode mapping into that model ([LIB-090](docs/work/LIB-090-tracking-target-and-mode-ux-foundation.md), [ADR 0034](docs/decisions/0034-tracking-ui-is-orthogonal-target-and-mode.md), [LIB-092](docs/work/LIB-092-city-and-planet-tracking-targets.md), [ADR 0036](docs/decisions/0036-city-and-planet-tracking-reuses-structured-target-identity.md)); Earth-fixed is the no-target state. Clicking a rendered Moon, Sun, ISS, city-pin, or current-planet glyph sets Tracking target through the same `setTrackingTarget` seam ([LIB-091](docs/work/LIB-091-direct-click-to-track-for-map-objects.md), [ADR 0035](docs/decisions/0035-click-to-track-uses-scene-space-semantic-hit-targets.md), [LIB-092](docs/work/LIB-092-city-and-planet-tracking-targets.md)); remembered mode is retained; the click does not construct frames or move the camera. Milky Way is not click-to-track (band plus Galactic Center/Anticenter tags; no single canonical point). Moon longitude-lock ([LIB-083](docs/work/LIB-083-moon-longitude-locked-scene-frame.md)) and Moon position-lock ([LIB-084](docs/work/LIB-084-moon-position-locked-scene-frame.md)) and Sun longitude-lock / position-lock ([LIB-085](docs/work/LIB-085-sun-anchored-scene-frames.md), [ADR 0029](docs/decisions/0029-sun-anchoring-reuses-moon-axis-lock.md)) and ISS longitude-lock / position-lock ([LIB-089](docs/work/LIB-089-iss-tracking-target.md)) are configurations of that model, not sibling transform kinds. Scene-frame latitude may leave geographic ±90°. Position-lock automatic scene-cover zoom ([LIB-087](docs/work/LIB-087-automatic-scene-cover-zoom-for-position-locked-frames.md), [ADR 0031](docs/decisions/0031-position-lock-default-camera-is-automatic-scene-cover-zoom.md)) is a camera-policy default over that frame: it updates scale only, must not write the anchor into `centerV`, and must not branch on target identity. ISS tracking requires a valid authoritative ISS position at the canonical instant ([ADR 0033](docs/decisions/0033-iss-tracking-reuses-anchored-frame-target-architecture.md)). Missing/invalid city or planet targets fall back to Earth-fixed, keep remembered mode, and reinitialize camera policy. Earthquakes remain hover-only. Milky Way tracking remains later. North-up / no map rotation remains the posture of the current development phase; rotation would be a later camera question, not a reference-frame shortcut.

See [ADR 0026](docs/decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md), [ADR 0027](docs/decisions/0027-moon-longitude-lock-is-a-scene-reference-frame.md), [ADR 0028](docs/decisions/0028-moon-position-lock-translates-scene-frame-latitude.md), [ADR 0029](docs/decisions/0029-sun-anchoring-reuses-moon-axis-lock.md), [ADR 0030](docs/decisions/0030-anchored-scene-frames-are-one-production-kind.md), [ADR 0031](docs/decisions/0031-position-lock-default-camera-is-automatic-scene-cover-zoom.md), [ADR 0032](docs/decisions/0032-anchored-frames-target-a-trackable-map-object.md), [ADR 0033](docs/decisions/0033-iss-tracking-reuses-anchored-frame-target-architecture.md), [ADR 0034](docs/decisions/0034-tracking-ui-is-orthogonal-target-and-mode.md), [ADR 0035](docs/decisions/0035-click-to-track-uses-scene-space-semantic-hit-targets.md), [ADR 0036](docs/decisions/0036-city-and-planet-tracking-reuses-structured-target-identity.md), and [`docs/specs/scene/camera-and-reference-frame.md`](docs/specs/scene/camera-and-reference-frame.md).

---

## 7. Data invariants

### 7.1 No network access in the render path

**Boundary.** No fetch, decode, or I/O occurs inside the animation frame, layer construction, or `RenderPlan` building.

**Rationale.** A frame must be a pure function of resolved state. Latency or failure inside the paint path produces stalls, torn frames, and non-deterministic output, and makes rendering untestable.

**Consequence.** Acquisition is a separate, periodic, asynchronous concern. Decoding happens during materialization. Layers read prepared views synchronously and contribute nothing when no view exists.

### 7.2 Dynamic data binds to product time

**Boundary.** Snapshot selection is driven by the canonical product instant, not by wall clock and not by arrival order.

**Rationale.** Otherwise time-travel and demo playback would show data from the wrong moment while the rest of the frame showed the right one — reintroducing the incoherence that 3.1 exists to prevent.

**Consequence.** Snapshots are versioned and carry an explicit valid time. Changing product time re-selects among cached versions and never triggers acquisition from the attach/resolver path. Current-only sources are additionally gated by live-enough product time ([ADR 0013](docs/decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)): when the gate flips, acquisition is stopped or re-armed **outside** the paint path, not from `requestAnimationFrame`.

See [ADR 0005](docs/decisions/0005-dynamic-data-acquisition-outside-the-render-path.md).

### 7.3 Readability is derived, never sampled

**Boundary.** Overlay legibility adjustments are computed upstream from known state — solar geometry, illumination policy, substrate presentation and declared capabilities. The rendered image is never read back to decide them.

**Rationale.** Sampling the framebuffer would make presentation depend on the backend, create a feedback loop between drawing and deciding what to draw, and impose a readback cost per frame. Deriving from policy keeps the decision in the same place as the rest of product meaning, and keeps it testable without rendering.

**Consequence.** Substrates declare capability hints in the catalog rather than being measured. Layers receive derived hints and adjust resolved draw intent. The backend remains unaware that readability exists.

See [ADR 0007](docs/decisions/0007-overlay-readability-derived-not-sampled.md).

---

## 8. Configuration invariants

### 8.1 One authoritative persisted document

**Boundary.** `LibrationConfigV2` is the authoritative persisted application configuration. Runtime configuration views are derived from it and are never a second source of truth.

**Rationale.** Two writable representations of the same state diverge.

**Consequence.** All mutation flows through one commit path. Derived views are recomputed, never edited.

### 8.2 Normalization is total and idempotent

**Boundary.** Every persisted document is normalized: defaults backfilled, unsupported values clamped, durable ids canonicalized against their catalogs, identity-valued optional entries dropped. Normalizing a normalized document changes nothing.

**Rationale.** Configuration arrives from older versions, from presets, from user edits, and from partially-written storage. Downstream code should never have to ask whether a field is present or plausible.

**Consequence.** Normalization must preserve user intent wherever it is representable — it corrects, it does not overwrite. It must not reintroduce compatibility surfaces that were deliberately removed.

---

## 9. Platform posture

Libration's application architecture is currently **browser-first**: React, TypeScript, Vite, Canvas 2D, and browser `localStorage`. A configured Tauri shell exists in the repository for desktop packaging and integration, but the application does not depend on Tauri APIs for any behaviour.

This is a description of the current architecture, not a commitment about the future. Whether the shell becomes load-bearing is an open product question. Nothing in this document should be read as deprecating desktop packaging.

See [ADR 0006](docs/decisions/0006-browser-first-spa-with-non-load-bearing-tauri-shell.md) and [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md#1-application-and-platform-model).

---

## 10. Applying these invariants

When a change appears to require violating an invariant, the usual cause is that a product decision is being made at the wrong layer. The productive question is not "may I make an exception" but "where does this decision belong."

Two useful checks:

- **If a backend needs to know it, it is in the wrong place.** Move the decision upstream and let the backend receive a resolved primitive.
- **If it must be persisted, persist the semantic id, not the resolved value.**

Changes that genuinely alter a boundary are architecture changes. They belong in an ADR under [`docs/decisions/`](docs/decisions/), with this document updated in the same change.
