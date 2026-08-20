# Eclipse System — intended architecture

## What this document is

A **planning specification** produced by [LIB-012](../../work/LIB-012-eclipse-system-architecture.md) and extended by [LIB-013](../../work/LIB-013-eclipse-authority-evaluation.md). It records how Libration structures an Eclipse System, including the selected offline eclipse authority.

E1 (solar event truth and live geographic footprint) is **production** as of [LIB-014](../../work/LIB-014-solar-eclipse-live-footprint.md). E2 (solar forecast window and event-path corridor) is **production** as of [LIB-015](../../work/LIB-015-solar-eclipse-forecast.md). E3 (lunar event truth and terrestrial Moon-up visibility) is **production** as of [LIB-016](../../work/LIB-016-lunar-eclipse-truth-and-visibility.md). E4 (reference-city eclipse circumstances) is **production** as of [LIB-017](../../work/LIB-017-reference-city-eclipse-circumstances.md). E5 (live alignment / beam presentation) is **production** as of [LIB-018](../../work/LIB-018-eclipse-alignment-beam.md). E6 (configuration completeness, event information, and product polish) is **production** as of [LIB-019](../../work/LIB-019-eclipse-product-polish.md). Lunar forecasting and product-surface reconciliation are **production** as of [LIB-020](../../work/LIB-020-eclipse-reconciliation-and-lunar-forecast.md). [LIB-021](../../work/LIB-021-lunar-eclipse-visual-reconciliation.md) is a post-LIB-020 presentation reconciliation (map info panel, moonlight attenuation, spatial Earth-shadow, label glyph avoidance); it is not E7. [LIB-025](../../work/LIB-025-solar-eclipse-lifecycle-shading-reconciliation.md) is a solar presentation-lifecycle reconciliation (corridor continuity, forecast vs live partial ownership, beam/marker phasing); it is not E7 and does not change NASA authority. [LIB-027](../../work/LIB-027-continuous-solar-eclipse-obscuration-shading.md) is active-solar daylight attenuation from local obscuration in the illumination raster; it is not E7. [LIB-042](../../work/LIB-042-eclipse-presentation-semantics-and-label-placement.md) is a presentation-semantics reconciliation (shared HUD/placard/map-label projection; solar labels near the Sun/Moon cluster, opposite the path); it is not E7. [LIB-043](../../work/LIB-043-lunar-eclipse-presentation-illumination-reconciliation.md) is a lunar presentation/illumination reconciliation (glyph-anchored labels, Moon-visible semantics, one moonlight pipeline, Earth-shadow cue); it is not E7. Current behaviour lives in [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md). Remaining eclipse ideas stay unapproved in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md#eclipse-system). This file remains the intended architecture; it is not a work-item queue.

Product intent (why/what) remains in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md#eclipse-system). Durable invariants remain in [`ARCHITECTURE.md`](../../../ARCHITECTURE.md). Authority vendor, format, span, and precision posture are selected in [§22](#22-eclipse-authority-selected). E1 production notes that belong in the architecture (not a changelog) are in [§9](#9-solar-eclipse-map-architecture) and [§22.14](#2214-e1-inputs). E3 production notes are in [§10](#10-lunar-eclipse-map-architecture) and [§22.16](#2216-e3-inputs).

This document does not freeze configuration schema, UI, colors, cone shapes, animation, or exact numeric thresholds beyond the user-controlled forecast horizon.

---

## 1. Product intent mapping

Backlog intent is treated as requirements to accommodate, not to silently narrow.

| Intent | Architectural home |
|--------|-------------------|
| Solar total / partial / annular; hybrid later if justified | `EclipseEvent` subtype + solar geometry; hybrid is a type the authority may emit, not a first-slice obligation |
| Lunar total / partial; penumbral later if justified | Same event model, **different** geometry family |
| Global event existence independent of reference city | Event service; observer circumstances are a derived view |
| Configurable forecast horizon; future visualization before the event; live progression; completion | Forecast lifecycle on `EclipseFrame`, not on the renderer |
| Solar path / band / partial region / centerline / moving footprint | Solar geographic geometry → semantic map geometry → presentation |
| Active solar daylight attenuation | Local solar-disc obscuration → illumination `rasterPatch` ([ADR 0012](../../decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md)) |
| Lunar: no solar-style narrow terrestrial path; Earth-shadow vs Moon; event-whole visibility footprint | Lunar event geometry is Moon-local plus one static terrestrial visibility footprint (union of Moon-up locations over the event interval). Ordinary Moon-above-horizon astronomy is not painted as a moving hemisphere |
| Live Sun/Moon/Earth alignment emphasis (“Mars Attacks”) | Presentation layer over eclipse-authority geometry; independently disableable |
| Configuration richness | One Eclipse System config subtree feeding a service + presentation layers; schema not defined here |
| Reference-city circumstances | Existing chrome reference city (`resolveReferenceCityObserverLocation`); no second observer |

Related backlog that this architecture **must not absorb**:

- Lunar visibility / moonlight geometry as a standing ambient overlay ([FUTURE_FEATURES](../../FUTURE_FEATURES.md#lunar-visibility-and-moonlight-geometry)).
- Lunar nodes as explanatory decorations ([FUTURE_FEATURES](../../FUTURE_FEATURES.md#lunar-nodes-and-eclipse-relationships)).
- A generic Astronomical Events framework ([FUTURE_FEATURES](../../FUTURE_FEATURES.md#astronomical-events)).

Those remain separate. Eclipse work may **reuse** spherical Moon-above-horizon geometry internally without shipping the ambient lunar-horizon overlay.

---

## 2. Existing capability inventory

Repository search covered source, tests, configuration, docs, history, and assets for eclipse, umbra/penumbra/antumbra, occultation, obscuration, magnitude, solar/lunar eclipse, paths, annular/hybrid (as eclipse terms), shadow cones/axes, conjunction/syzygy, nodes, ecliptic, subsolar/sublunar, distances, angular radii, Earth/Moon/Sun radii, topocentric coordinates, reference city, horizon/altitude/azimuth, great-circle/spherical geometry, projection/seam, time forecast/scanning, and demo/product time.

**Before E1, no production module implemented eclipse events.** The word “annular” in unrelated source is chrome glyph geometry (`annularSectorPath2D` in `src/glyphs/glyphGeometry.ts`), not solar-eclipse type.

E1 ([LIB-014](../../work/LIB-014-solar-eclipse-live-footprint.md)) added `src/core/eclipse/`, the bundled solar authority JSON, `solarEclipseLayer.ts`, and generic `equirectRegionOverlay` presentation. Ambient Sun/Moon modules below are unchanged and remain **not** event authority.

### A. Existing and production-ready (reusable as named)

| Capability | Module | Responsibility | API / data | Frame | Time | Load-bearing | Eclipse reuse |
|------------|--------|----------------|------------|-------|------|--------------|---------------|
| Canonical product UTC | `src/core/time.ts`, `src/app/demoPlayback.ts`, ADR 0004 | One instant per frame; demo substitutes the source | `TimeContext.now` (unix ms), `simulated` | n/a | Product UTC, including paused/accelerated demo | Yes | **Reuse as-is.** All eclipse evaluation must take this instant, never `Date.now()` downstream. |
| Mean solar position / subsolar point | `src/core/subsolarPoint.ts` | Approximate subsolar lat/lon; `sunEclipticLongitudeDeg` | `{ latDeg, lonDeg }`, ecliptic longitude 0…360 | Geocentric mean equator/equinox → geographic via GMST; east lon positive | `utcMs` | Yes (illumination, Sun glyph, analemma, readability) | **Reuse for ambient Sun.** Not event authority. |
| Truncated lunar position / sublunar point | `src/core/sublunarPoint.ts` | Approximate sublunar lat/lon; ecliptic λ/β; mean Ω and F; equatorial RA/Dec + GMST | `{ latDeg, lonDeg }`; `moonEquatorialRaDecGmst` | Same geographic convention as Sun | `utcMs` | Yes (Moon glyph, moonlight, tracks, locus, libration) | **Reuse for ambient Moon.** Not event authority. |
| Lunar phase / elongation | `src/core/lunarPhase.ts` | Illuminated fraction from λMoon − λSun only (latitude ignored) | `illuminatedFraction`, `geocentricElongationDeg`, `waxing` | Geocentric ecliptic longitudes | `utcMs` | Yes (Moon disc, moonlight) | Screening analog only. Not eclipse magnitude. |
| Spherical solar altitude | `src/core/solarTwilight.ts`, illumination plan | `asin(dot)` from unit-sphere surface normal · subsolar direction | altitude degrees; twilight bands as semantic anchors | Spherical Earth; no refraction, parallax, or flattening | Product UTC via subsolar point | Yes | **Reuse** for observer Sun altitude and solar horizon tests. |
| Spherical lunar incidence | `src/renderer/renderPlan/sceneSolarShadingIlluminationPlan.ts` | Per-texel `lunarDot` same spherical formula as solar | scalar cosine of zenith angle to Moon | Spherical Earth | Product UTC via sublunar point | Yes (moonlight raster) | **Reusable pattern** for Moon-above-horizon ≈ `lunarDot ≥ 0`. Formula is duplicated, not a shared public API. |
| Reference city observer | `src/core/referenceCityObserver.ts`, `src/data/referenceCities.ts` | Catalog lat/lon from chrome `displayTime.topBandAnchor` | `{ cityId, latitudeDeg, longitudeDeg }` or null | Geographic | n/a | Yes (LIB-011) | **Reuse as-is.** Sole observer. |
| Equirectangular projection | `src/core/equirectangularProjection.ts` | lon ↔ x; IDL seam helpers | `mapXFromLongitudeDeg`, inverse | Equirect −180…+180, +90…−90 vertically in renderers | n/a | Yes | **Reuse as-is.** |
| Polyline seam/wrap | `src/renderer/renderPlan/equirectSeamPath.ts` | Unwrap short-arc longitudes; fold segments so ±180° does not span the world | `unwrappedLongitudes`, `adjustPairToShortStripPath` | Equirect | n/a | Yes (tracks, locus, analemma) | **Reuse** for centerlines and sampled paths. Polygon/region wrap is **not** solved here. |
| Scene layers + factory | `src/layers/*`, `sceneOverlayLayerFactory.ts`, `SCENE_STACK_LAYER_IDS` | Ordered overlays from `SceneConfig` | Layer state from `TimeContext` | n/a | `TimeContext.now` | Yes | **Extend** with presentation layers; do not put discovery in a layer. |
| `RenderPlan` primitives | `src/renderer/renderPlan/renderPlanTypes.ts` | Backend-neutral draw list | `line`, `path2d` (fill/stroke), `text`, gradients, `rasterPatch`, … | Screen / scene px | n/a | Yes | **Reuse.** Filled footprints can use `path2d`; no eclipse-specific primitive. |
| Overlay readability | `src/core/overlayReadabilityFrame.ts` | Derived veil/lift; never samples pixels | per-point veil | Spherical solar field | Product UTC | Yes | **Reuse** so eclipse strokes remain legible. |
| Config persistence | `LibrationConfigV2`, `commitWorkingV2Update`, normalization | Durable semantic ids; no resolved paths | scene layer rows + parameters | n/a | n/a | Yes | **Extend** with an Eclipse subtree later. Persist choices, not ephemeral geometry. |
| DEV visual scenarios | `src/dev/visualScenarios.ts` | Startup-only frozen product UTC + config | `?scenario=` | n/a | Paused demo UTC | Dev-only | **Pattern to reuse** for future eclipse scenes. Do not add scenarios in this item. |
| Local-first / offline | Application model | Bundled maps/fonts; fixtures for live feeds; no fetch in render path | n/a | n/a | n/a | Yes | Eclipse display must remain offline-capable. |

Precision of production astronomy, as stated in source:

- `subsolarPoint`: “Suitable for day/night visualization, not surveying.” Mean longitude + two-term equation of center.
- `sublunarPoint`: “Suitable for map markers, not surveying.” Few dominant Meeus-style periodic terms (five longitude, three latitude).
- `lunarPhase`: “No high-precision astronomy; adequate for UI.” Tests use loose almanac windows (full moon k > 0.85).
- Optical libration: Meeus ch. 53, **no physical libration**.
- Observer orientation: χ = C − q (Meeus 53 and 14); below-horizon geometry still computed.

### B. Existing but partial / specialized

| Capability | Module | What it is | Gap for eclipses |
|------------|--------|------------|------------------|
| Mean lunar node Ω and argument of latitude F | `moonMeanAscendingNodeLongitudeDeg`, `moonArgumentOfLatitudeDeg` | Linear mean elements from the truncated series | Supports **eclipse-season screening**, not contacts or type. Descending node is Ω+180°, not a separate API. |
| Moon equatorial RA/Dec + local hour angle | `moonEquatorialRaDecGmst`, `moonLocalHourAngleDeg` | Geocentric equatorial; hour angle at observer longitude | Sun RA/Dec is computed inside `subsolarPoint` but **not exported**. Topocentric correction / parallax absent. |
| Parallactic angle / sin(altitude) | `parallacticAngleDeg` | Uses `sinAlt` internally, returns q or 0 near zenith | Lunar **altitude is not a public API**. Derivable. |
| Moonlight altitude gating | `moonAltitudeStrength` in `lunarIllumination.ts` | Maps an altitude scalar to [0,1] | Does not compute altitude; illumination uses `lunarDot`, not this function, for incidence. |
| Time-window sampling caches | `lunarGroundTrack.ts`, `lunarLocus.ts` | Sample `sublunarPoint` around `now`; bucketed memoization | Analog for **not scanning every frame**. Not event detection. Windows are hours/days, not eclipse-season search. |
| ISS lookahead | `src/lifecycle/issOrbitalTrackAcquisition.ts` | SGP4 samples outside the render path | Pattern for off-frame generation. `satellite.js` is **not** a lunar/solar ephemeris. |
| Dynamic data lifecycle | `src/lifecycle/`, ADR 0005 | Acquire outside rAF; resolve by product time | Analog for **prepared views**. Eclipse truth should not be a live HTTP feed. |
| Illumination plan built inside Canvas backend | `canvasRenderBackend.ts` `drawIlluminationLayer` | Backend inspects shading payload and calls the plan builder | **Do not copy** for eclipses. Transitional resource-realization leak (Implementation §12). |
| `heatmap` `LayerType` | `src/layers/types.ts` | Declared type | No astronomy consumer; unused for this design. |

### C. Existing only in tests, DEV, history, or unused code

| Item | Where | Notes |
|------|-------|--------|
| Loose full/new moon instants | `src/core/celestialMath.test.ts` | Almanac comments; model called “low precision”. Not an eclipse fixture set. |
| Locus standstill/minor epochs | `LUNAR_LOCUS_EPOCH_UTC` | Nodal-cycle amplitude, not eclipses. |
| LIB-004 / LIB-006 out-of-scope lines | work items | Explicitly deferred “eclipse prediction”. |
| Chrome annular sectors | glyphs | Unrelated. |

There is **no** unused eclipse engine, Besselian-element parser, shadow-cone code, or eclipse catalog in the tree.

### D. Missing

**Astronomy.** Sun/Moon/Earth distances; Sun/Moon/Earth radii; apparent angular radii; lunar horizontal parallax; topocentric Sun/Moon; umbra/penumbra/antumbra; shadow axis; Earth-shadow at lunar distance; eclipse magnitude/obscuration; contact times; solar eclipse type discrimination; hybrid handling; lunar penumbral/partial/total discrimination.

**Event discovery.** Eclipse seasons as a product subsystem; scan or catalog query; identity of events; forecast-window resolution; cache invalidation on large time jumps.

**Geographic geometry.** Centerline; totality/annularity limits; partial footprint; Earth intersection of shadow cones; lunar visibility polygon; dateline-aware **filled** regions.

**Observer circumstances.** Local contacts; local maximum; local magnitude/obscuration; Sun/Moon altitude at contacts; visible/not visible for eclipses.

**Presentation.** Eclipse layers, payloads, RenderPlan eclipse content, alignment/beam decoration, forecast prominence, labels, configuration schema/UI, visual scenarios.

**Dependencies.** No astronomy library. Runtime deps are React, Tauri APIs (unused by `src/`), and `satellite.js` (ISS only).

---

## 3. Sun–Earth–Moon model audit

### Sun

| Quantity | Status |
|----------|--------|
| Apparent/geocentric position | Approximate ecliptic longitude; RA/Dec computed internally for the subsolar meridian, not exported |
| Subsolar point | Production; geographic lat/lon |
| Declination | Equals subsolar latitude in this model |
| Sun–Earth distance | **Missing** |
| Apparent solar radius/diameter | **Missing** |

### Moon

| Quantity | Status |
|----------|--------|
| Sublunar point | Production |
| Ecliptic λ, β | Production (truncated series) |
| Equatorial RA/Dec + GMST | Production export |
| Distance | **Missing** (series omitted Δ) |
| Phase / illumination | Production from longitudes only |
| Optical libration | Production; physical libration omitted |
| Mean lunar day | Production (`meanLunarDayMsFromModel`, ≈24 h 50 m 28.3 s) |
| Observer orientation | Production χ = C − q using reference city |

### Earth

| Quantity | Status |
|----------|--------|
| Shape | Implicit **unit sphere** in illumination and readability dots. No WGS84, no radius constant, no flattening |
| Map coordinates | Equirectangular; east longitude positive; −180…+180 |
| Geodetic vs geocentric | Not distinguished; lat/lon treated as spherical |

### Time

| Quantity | Status |
|----------|--------|
| Authoritative product UTC | `clockNowMs` once per frame → `TimeContext.now` |
| Real / demo / paused / accelerated | Demo **replaces** the source (`src/app/demoPlayback.ts`). Downstream sees `simulated` only |
| Evaluate astronomy at arbitrary UTC | **Yes** for existing functions: they take `utcMs` and do not read the clock |

Existing models are a sufficient **ambient visualization** foundation. They are **not** a sufficient **eclipse-event authority**. See [§5](#5-astronomy-authority-and-precision).

---

## 4. What an eclipse engine must know

Classification of each quantity: **Available** / **Derivable from current models** / **Requires new astronomy** / **Requires a precision decision**.

### Solar eclipses

| Need | Classification |
|------|----------------|
| Cheap new-moon + near-node screen | **Derivable** (elongation ≈ 0 and F ≈ 0°/180° or small β) — screening only |
| Whether an eclipse **occurs** (product truth) | **Precision decision** + **new astronomy** or catalog |
| Type: partial / total / annular / hybrid | **New astronomy** (angular diameters + umbra vs antumbra vs miss) |
| Contact times | **New astronomy** |
| Shadow axis | **New astronomy** (Sun–Moon line; not sublunarPoint) |
| Umbra / antumbra / penumbra geometry | **New astronomy** (distances + radii) |
| Earth intersection, central line, limits, partial footprint | **New astronomy** + spherical/ellipsoidal projection |
| Progression over time | Authority evaluated along product UTC (time source **available**) |
| Geographic path on the rotating Earth | Geometry at sampled UTC; GMST **available** in the lunar module |

### Lunar eclipses

| Need | Classification |
|------|----------------|
| Cheap full-moon + near-node screen | **Derivable** — screening only |
| Moon in Earth’s penumbra/umbra | **New astronomy** (Earth-shadow cones at lunar distance) |
| Type: penumbral / partial / total | **New astronomy** |
| Contact times, magnitude | **New astronomy** |
| Earth-shadow geometry at lunar distance | **New astronomy** |
| Phase through the event | Authority vs time; ambient `approximateLunarPhase` is the wrong quantity during eclipse |
| Terrestrial Moon-above-horizon region | **Derivable** to first order: spherical `lunarDot ≥ 0` around sublunar point. **Precision decision** if refraction/parallax/flattening are required |

Do not implement the missing mathematics in this item.

---

## 5. Astronomy authority and precision

### Verdict on current models

**Insufficient as eclipse-event authority.** Evidence:

1. Source comments and tests explicitly mark the models as visualization/UI grade.
2. No distances or radii ⇒ cannot compare apparent Sun/Moon size ⇒ cannot distinguish total vs annular, cannot size umbra/antumbra, cannot compute lunar umbral magnitude.
3. Lunar longitude uses a handful of terms; errors of tenths of a degree are plausible. A tenth of a degree is ~11 km on Earth and a large fraction of the Moon’s ~0.5° disc — enough to misplace a path of totality or invent/miss a grazing eclipse.
4. Phase ignores lunar latitude, so syzygy from elongation alone is not an eclipse test.
5. Spherical unit Earth is acceptable for ambient illumination, not for surveying-grade shadow tracks.

They **are** sufficient to keep: Sun/Moon glyphs, illumination, analemma, lunar track/locus, libration, and a cheap non-authoritative screen if a future engine wants one.

### Options

| Option | Meaning |
|--------|---------|
| **A** | Compute eclipses only from the current truncated model |
| **B** | Add a more precise internal eclipse-specific ephemeris (distances, radii, shadow geometry) |
| **C** | Consume an authoritative catalog/ephemeris; use Libration geometry mainly to render/interpolate |
| **D** | Hybrid: dedicated eclipse authority for event truth and geographic geometry; keep current models for ambient astronomy |

### Tradeoffs

| Concern | A | B | C | D |
|---------|---|---|---|---|
| Event existence accuracy | Poor | Can be good | Good if catalog is good | Good |
| Contact-time / path accuracy | Poor | Good if model is | Good at tabulated instants; interpolation must be specified | Good |
| Forecast horizon / arbitrary dates | Unlimited but wrong | Unlimited | Limited to catalog span | Span of the authority; B-like compute can fill gaps later |
| Offline | Yes | Yes | Yes **if bundled**; no if live-fetched | Yes if authority is bundled/computed |
| Reproducibility | Yes | Yes | Yes if data is versioned in-repo | Yes |
| Accelerated demo / time jumps | Cheap and wrong | Cost of the new model | Lookup + interpolate; cheap per frame if prepared | Same as C/B for the authority |
| Network in render path | None | None | Forbidden regardless; acquisition would be off-path | None |
| Licensing / provenance | n/a | Algorithm provenance | Catalog licence must be compatible | Same as chosen authority |
| Consistency with ambient Sun/Moon | Internally consistent, scientifically weak | Ambient vs eclipse models will differ unless ambient is replaced (out of scope) | Same tension | **Accepted and isolated**: ambient vs event authority |
| Complexity | Low | High | Medium (ingest + interpolate) | Medium |
| Product expectation | Instrument, not a toy path | Almanac-like | Almanac-like where catalog exists | Visualization-grade grounded in a real authority |

**Selection (LIB-013): D**, with a concrete NASA/Espenak–Meeus bundled authority. See [§22](#22-eclipse-authority-selected).

- Do **not** use option A for product truth.
- The authority is a **bundled, offline**, versioned asset so demo time, local-first use, and “no network in the render path” all hold.
- Do **not** replace `subsolarPoint` / `sublunarPoint` in this programme.
- Live alignment geometry follows the **eclipse authority**, not the ambient glyphs.
- Do **not** grow a B-class runtime ephemeris or bundle JPL kernels for eclipse truth.

Option A would violate design principle 7 (scientific grounding). A live network catalog as the only source would violate local-first posture and demo-time coverage.

---

## 6. Domain model and ownership

Names below are conceptual. Implementation may spell them differently.

```
product UTC + EclipseConfig
        │
        ▼
┌───────────────────────────┐
│ EclipseEventService       │  ← not a scene layer; not the Canvas backend
│ (discovery, cache, frame) │
└─────────────┬─────────────┘
              │ EclipseFrame
              ▼
┌───────────────────────────┐
│ Geometry at instant       │  solar vs lunar families
│ + observer circumstances  │  derived; never filters event existence
└─────────────┬─────────────┘
              │ semantic layer payloads
              ▼
┌───────────────────────────┐
│ Presentation layers       │  solarEclipse / lunarEclipse
│ → RenderPlan primitives   │
└───────────────────────────┘
```

### `EclipseEvent`

Owns **global event truth**. Independent of whether any visual layer is enabled.

- Stable identity (durable id, not a render-time object identity).
- `kind`: solar | lunar.
- `subtype`: as emitted by the authority (solar: partial / total / annular / hybrid-if-present; lunar: partial / total / penumbral-if-present).
- Global start / maximum / end and relevant contacts.
- Magnitude / obscuration where the authority provides them.
- Reference to authority metadata (source id, version) — not a resolved URL.

### `SolarEclipseGeometry` (time-parameterized)

Astronomical geometry at a UTC instant (or a sampled path over the event):

- Shadow-axis intersection with Earth (if any).
- Umbra / antumbra / penumbra Earth intersection.
- Central line; totality/annularity limits; partial footprint.

This is **not** style and **not** a RenderPlan.

### `LunarEclipseGeometry` (time-parameterized)

- Earth-shadow relationship to the Moon (penumbral/umbral penetration).
- Terrestrial region where the Moon is above the geometric horizon (and optionally where the eclipse is observable).

No centerline analog.

### `ReferenceCityEclipseCircumstances`

Derived from `EclipseEvent` + geometry + shared observer lat/lon.

- Must not be stored as the event.
- Missing observer (no `fixedCity`) ⇒ no circumstances, event still exists.

### `EclipseFrame`

Prepared, read-only view attached to the frame (same class of seam as `OverlayReadabilityFrame` and `dynamicDataLifecycle` on `TimeContext`):

- Events overlapping the forecast window relative to product UTC.
- Lifecycle classification for each (see [§8](#8-forecast-lifecycle)).
- Geometry samples needed by enabled presentation, or lazy geometry functions that are still **not** invoked from the Canvas backend.

**Proposed new durable boundary:** an Eclipse Event Service upstream of layers and `RenderPlan`. Candidate for an ADR when implementation is approved. Not added to `ARCHITECTURE.md` in this item.

---

## 7. Event discovery and forecasting

Rendering **never** searches for eclipses. Canvas **never** knows what an eclipse is.

### How discovery should work

1. **Authority query**, not per-frame numerical hunting through years of `sublunarPoint`.
2. Given product UTC `T` and horizon `H` (user-configured), resolve all events with global interval intersecting `(T, T+H]` for upcoming, plus the active event if `T` is inside a global interval, plus a short lookback only if presentation of “just completed” is in scope later.
3. Implementation of “query” is the authority’s problem: catalog index by time, or season windows (~saros/eclipse-season) feeding a precise generator. Current truncated models must not be the query engine.
4. **Cache** the resolved `EclipseFrame` keyed by something coarser than a frame: e.g. product-time bucket, horizon, enabled types, authority version. Geographic **live** geometry for an *active* event may update more often (seconds-to-minutes buckets, or every frame only for the cheap interpolation of an already-selected event).
5. **Product time jumps of years:** drop the cache and resolve again. Same path as demo seek. Do not interpolate across a jump.
6. **Accelerated demo:** still one product UTC per frame. Discovery stays on the cache bucket; only interpolation of the current event’s geometry tracks `T`. Do not run a year-scan inside `requestAnimationFrame`.
7. **Past / active / upcoming:** compare `T` to the event’s global contact interval. Presentation may add “imminent” as a style function of time-to-start vs `H`, not as a second astronomical truth.

### Intended data flow

```
product time
  → eclipse event discovery / resolution
  → current / upcoming EclipseEvent(s)
  → geographic / event geometry
  → semantic layer payload
  → RenderPlan
```

Not: Canvas renderer searches for eclipses.

If the authority is bundled data, treat it like a catalog asset (durable id, licence, version), not like USGS/GIBS acquisition. Dynamic-data lifecycle is the wrong owner unless a future product explicitly adds a live eclipse feed — not recommended.

---

## 8. Forecast lifecycle

Conceptual product states (thresholds except the user-controlled horizon stay unfrozen):

| State | Meaning |
|-------|---------|
| Outside forecast window | No eclipse visualization for that event |
| Upcoming | Global event starts within horizon; geography may already appear |
| Imminent | Optional presentation emphasis as start approaches |
| Active | Product UTC inside global contacts |
| Completed | After last global contact; drop from forecast display (event object may still exist in memory for the frame that classifies it) |

Visual prominence may depend on time-to-event. That is **presentation**, not event truth.

**`EclipseEvent` continues to exist whether or not the visual layer is enabled.** Disablement suppresses primitives; it does not delete the event. Master enable off ⇒ service may still skip work, but identity of “what eclipse is happening at T” must not be owned by a visibility flag.

---

## 9. Solar eclipse map architecture

Keep three layers of meaning separate.

The **live** umbra/antumbra at T is a compact moving footprint. The NASA-style continental strip is a different quantity: the **event corridor** swept by the central eclipse over the valid interval. E2 caches that corridor per event ([ADR 0009](../../decisions/0009-cached-solar-eclipse-event-corridor.md)). Do not substitute a scaled-up live oval for the corridor.

### Astronomical geometry

Shadow axis, umbra/antumbra/penumbra, contacts, type, magnitude. Owned by the eclipse authority + geometry module in `src/core/` (or a dedicated `src/core/eclipse/` tree). Evaluated at UTC.

### Semantic map geometry

Geographic polylines/polygons in lat/lon: centerline, totality/annularity band, partial footprint. Equirectangular **seam/dateline** is handled in the generic region plan builder (`equirectSeamRegion.ts`). Closed fill rings fold into their smallest longitude arc so a winding oval does not unwrap to 360° and fill the world. Polar caps (circular lon span > 270°) close through the nearer pole. World copies that would paint the same viewport pixels are not both emitted, so a translucent region cannot accidentally double its alpha. Canvas does not interpret eclipse semantics.

### Presentation / style

Stroke tokens, fills, labels, forecast vs live opacity, whether centerline/band/partial/alignment are on. Owned by scene-layer parameters and plan builders. Canvas draws `line` / `path2d` / `text` only.

Global vs local presentation roles ([LIB-042](../../work/LIB-042-eclipse-presentation-semantics-and-label-placement.md)) are a projection over `EclipseFrame` + E4 circumstances, not a second authority. The bottom HUD is local/reference-city. The lower-right placard may show both global event/lifecycle/current-shadow and local type/contacts. The map event label is global identity plus `upcoming`/`active` only. Solar map labels prefer the Sun/Moon glyph cluster and sit on the screen-space side opposite the nearest path/corridor sample; they are not printed on the corridor. Lunar labels stay Moon-glyph-aware and do not borrow the solar path-opposite rule.

Presentation lifecycle ([LIB-025](../../work/LIB-025-solar-eclipse-lifecycle-shading-reconciliation.md)) is derived from existing `EclipseFrame` fields (global start/end, live `centralPoint`, subtype). It is not a second authority. For central events: **upcoming** → **global-active pre-central** → **central-active** → **global-active post-central** → **completed**. The event corridor remains visible through the globally active phases when the forecast horizon is not live-only. The representative greatest-eclipse partial region is upcoming-only. Active broad partial darkening is physical illumination from local solar-disc obscuration ([LIB-027](../../work/LIB-027-continuous-solar-eclipse-obscuration-shading.md), [ADR 0012](../../decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md)). Targeted alignment and the live ground-position marker exist only while a terrestrial central intersection exists. Partial-only events use **global-active** with no fabricated corridor, marker, or targeted beam; the obscuration field is their geographic explanation.

Visual families ([LIB-026](../../work/LIB-026-solar-eclipse-visual-semantics-reconciliation.md)) keep overlay meanings distinct on the map: static violet/lilac **event path**; informational teal **forecast partial** (upcoming only); compact indigo/warm **live central** shadow; warm gold **alignment ribbon**; vermilion **ground marker**. Active partial darkness is not a competing teal overlay. Corridor limit strokes remain readable over the moving dark field. Dramatic alignment stays stronger in the core/axis while occupying less map area than a penumbral region.

Illumination raster is **not** the eclipse overlay. Compact umbra/antumbra remain overlay markers and are not encoded by hacking `sampleIlluminationRgba8`. Broad active obscuration *does* attenuate ordinary daylight availability in that same `rasterPatch`, independently of the Solar eclipses master, analogous to lunar moonlight attenuation. The obscuration grid is a stable full-world equirectangular field (288×145) of *physical* disc overlap; it is not clipped to the live penumbra-outline bbox ([LIB-028](../../work/LIB-028-solar-eclipse-obscuration-raster-boundary.md)) and is not a sun-above-horizon boolean mask ([LIB-029](../../work/LIB-029-solar-eclipse-horizon-illumination-reconciliation.md)). E4 local visibility may still report obscuration 0 below the geometric horizon; map illumination reuses the existing night-veil daylight curve so the terminator is not a compositing seam.

---

## 10. Lunar eclipse map architecture

A lunar eclipse is an Earth-shadow event on the Moon, visible from the night-side hemisphere where the Moon is up. It does **not** have a moving narrow terrestrial path of totality.

Semantic map geometry should include some combination of:

- Indication of Earth-shadow / lunar penetration (map-space decoration associated with the Moon / shadow axis, not a thin Earth track).
- **Event-static visibility footprint** ([LIB-054](../../work/LIB-054-static-lunar-eclipse-visibility-footprint.md)): the closed boundary of locations from which some part of the eclipse is geometrically visible at any time during `[globalStartMs, globalEndMs]`. Line only; appears with the lunar forecast horizon; invariant for the event id; gone after last contact. Stroke color is a presentation token (factory `#6a9aa8`, [LIB-055](../../work/LIB-055-configurable-lunar-eclipse-footprint-line-color.md)); it is not geometry. Not a solar-style path and not instantaneous Moon-visible geography.
- Ordinary Moon-above-horizon astronomy for illumination and local circumstances (not painted as a moving eclipse overlay).
- Reference-city circumstances when an observer exists.

### Relation to Lunar Visibility / Moon Horizon backlog

The spherical Moon-above-horizon contour is the same geometric object the backlog wants as an explanatory overlay. Lunar eclipse presentation no longer paints the *current-instant* contour ([LIB-046](../../work/LIB-046-remove-lunar-eclipse-moon-visible-geography.md)). [LIB-054](../../work/LIB-054-static-lunar-eclipse-visibility-footprint.md) paints a different product: the event-whole union of that contour over the authoritative contact interval. Ordinary moonlight and local circumstances still use Moon-above-horizon geometry internally. A standing ambient Lunar Visibility overlay remains a separate product decision.

**Recommendation:** do **not** require a separate Lunar Visibility LIB before lunar eclipse presentation. Shipping that contour as a continuous ambient overlay remains a separate product decision.

### Shipped presentation (LIB-021 / LIB-043)

The Moon glyph receives spatial Earth-shadow geometry (clipped penumbra/umbra circles in the same observer frame as libration), not whole-disc grey/dark/red state tints. Ordinary moonlight in the planetary illumination raster is `ordinaryMoonlight × lunarEclipseTransmission` even when lunar overlay presentation is off ([ADR 0011](../../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md)). Transmission is coverage-derived and continuous. Lunar eclipse map presentation paints one event-static visibility footprint line ([LIB-054](../../work/LIB-054-static-lunar-eclipse-visibility-footprint.md)). It does **not** paint a current-instant Moon-visible hemisphere or geometric lunar-horizon boundary ([LIB-046](../../work/LIB-046-remove-lunar-eclipse-moon-visible-geography.md)). That removed overlay was informational and moving; the new footprint is informational and event-static. Ordinary Moon-above-horizon astronomy remains for illumination (`lunarDot ≥ 0`), sublunar geometry, and local circumstances. Live event rows belong in the lower-right map information panel, not Layers. The lunar alignment control is an Earth-shadow directional cue on the Moon glyph, not a geographic beam.

---

## 11. Live alignment / beam (“Mars Attacks”)

E5 ([LIB-018](../../work/LIB-018-eclipse-alignment-beam.md)) implements this as presentation derived from authoritative eclipse geometry. See [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md).

Desired: dramatic, scientifically grounded alignment emphasis during an active eclipse, using existing Sun/Moon visual language, independently disableable.

### Upstream data the effect needs

**Solar:** live E1 central point (umbra or antumbra) plus ambient Sun/Moon glyph positions for visual anchoring. Conceptual chain: Sun → Moon → Earth footprint. Partial-only events have no central target; they receive a local alignment field only. Central events with no current terrestrial central intersection emit no beam; the event corridor remains independent context.

**Lunar:** E3 Earth-shadow offsets plus Moon glyph presentation. Conceptual chain: Earth’s anti-solar shadow axis relative to the Moon. Not a fake terrestrial “path” and not a beam emitted by the Moon.

### Where it lives

Presentation / style. Solar alignment still emits ordinary `equirectRegionOverlay` fills and strokes. Lunar Earth-shadow cue is a short Moon-glyph decoration, not map geography. Not a new backend blend mode. Not illumination. Not a literal laser. Not eclipse truth.

The user can disable this without disabling paths/regions or the event service (`scene.eclipseAlignment`).

Implemented decisions: active-only; product-time driven; strength from live geometry (not reference-city magnitude); solar total/annular/hybrid target the live umbra/antumbra while that intersection exists; partial-only does not fabricate a central beam; pre/post-central total/annular/hybrid emit no beam; lunar is a short Moon-local Earth-shadow directional cue (not a geographic beam); intensity `subtle` / `normal` / `dramatic`. Colors remain implementation tokens, not a user style editor.

---

## 12. Reference-city circumstances

LIB-011 already binds observer identity to chrome `displayTime.topBandAnchor` via `resolveReferenceCityObserverLocation`. Eclipse work must use that seam only.

**GLOBAL ECLIPSE TRUTH IS NEVER FILTERED BY REFERENCE CITY.**

E4 ([LIB-017](../../work/LIB-017-reference-city-eclipse-circumstances.md)) implements this as a derived `ReferenceCityEclipseCircumstances` projection. See [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md) and [ADR 0010](../../decisions/0010-eclipse-events-global-circumstances-derived.md).

| Solar (when observer exists) | Lunar |
|------------------------------|--------|
| Locally visible? (Sun up **and** inside partial/total/annular footprint as applicable) | Moon above horizon? |
| Local contacts, local maximum | Local contacts, maximum |
| Magnitude / obscuration | Magnitude where meaningful |
| Sun altitude | Moon altitude (derivable from existing hour-angle/declination formula; export rather than invent a second observer math stack) |

Global event existence **never** depends on these fields.

No separate eclipse lat/lon picker. Local circumstances belong in the lower-right eclipse information panel (gated by Event information and Reference-city eclipse details). Optional bottom-HUD status remains independent and is explicitly local. The map event label remains global even when the city cannot see the event.

---

## 13. Configuration direction

E6 shipped the product configuration without a second persistence mechanism. Schema and UI live in [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md).

Shipped dimensions: solar/lunar master enable (factory default **on**); presentation-only event-type filters; forecast horizon; solar path / partial region / centerline; lunar visibility region; labels; event information; live alignment; beam intensity and optional base colors; reference-city information; independent styling (color / thickness / opacity); active solar eclipse shading enable and Subtle/Normal/Dramatic intensity (physical illumination, default ON / Normal).

### Where it should live

Presentation remains on the existing `SceneConfig` rows (`solarEclipse`, `lunarEclipse`) plus `scene.eclipseAlignment`, `scene.eclipseCircumstances`, and `scene.eclipseInfo`. Discovery still belongs to `EclipseEventService`. A single shared Eclipse System persistence subtree was not required: the service already owns the frame, and E6 grouped the existing owners in the Layers UI.

### Structural options

| Structure | Pros | Cons |
|-----------|------|------|
| One Eclipse layer with subconfiguration | Fewer stack ids | Mixes solar and lunar map metaphors; ordering/readability become awkward |
| Separate Solar Eclipse / Lunar Eclipse layers only (no service) | Matches analemma vs locus | Discovery would leak into layers or be duplicated |
| **Event service + two presentation layers** | Discovery owned once; solar vs lunar geography stay distinct; independent visibility | One more runtime seam (like lifecycle attachment) |
| Generic Astronomical Events platform first | Attractive later | Explicitly out of scope; would delay visible eclipse value |

**Recommendation:** global `EclipseEventService` feeding **two** presentation layers (`solarEclipse`, `lunarEclipse`), with a shared config root for master enable, types, and horizon. Do not start a generic events framework.

E1 followed existing overlay patterns: `source.kind === "derived"` product `solarEclipseLiveFootprint`, presentation parameters on the row, factory dispatch by product. A `LayerEnableFlags.solarEclipse` compatibility flag exists (factory default **on** as of E6; named presets may still be explicitly off). E2 added `forecastHorizonDays` (default 7; `0` = live only) plus `showForecastCorridor` / `showForecastPartialRegion` on the same row. E6 added type filters, user style, labels, and event information on those owners rather than inventing a second config root.

---

## 14. Visual verification strategy

Production eclipse implementation must be inspected in Cursor’s in-editor Browser per [`docs/VISUAL_VERIFICATION.md`](../../VISUAL_VERIFICATION.md). Scenarios are DEV-only, startup/reload, paused demo UTC, persistence isolated, no scenario ids in layers/`RenderPlan`/Canvas.

**Do not add scenarios in this architecture item.** E1 added production-backed DEV scenes `solar-eclipse-total`, `solar-eclipse-annular`, `solar-eclipse-partial`, and `solar-eclipse-dateline`. E2 added `solar-eclipse-forecast`, `solar-eclipse-forecast-annular`, `solar-eclipse-forecast-partial`, and `solar-eclipse-forecast-multiple` (catalog in [`docs/VISUAL_VERIFICATION.md`](../../VISUAL_VERIFICATION.md)). Lunar scenes belong to later slices.

Future scenes will need **deterministic authority data** (fixed event id or bundled elements) plus ordinary config, not a parallel renderer. Suggested scene families and the data each needs:

| Future scene intent | Deterministic inputs |
|---------------------|----------------------|
| Upcoming total solar | UTC before first contact; event in horizon; solar path presentation on |
| Active total solar | UTC near maximum; umbral footprint on Earth |
| Active annular | UTC near maximum of a known annular event |
| Partial-only solar | Event with no umbra/antumbra on Earth |
| Upcoming / active total lunar | Matching UTC; lunar presentation on |
| Lunar visible from reference city | Observer city in the Moon-up hemisphere during the event |
| Lunar not visible from reference city | Observer in Moon-down hemisphere; **global** event still present |
| Dateline-crossing solar path | Event whose centerline/band crosses ±180° |

Each scenario should document the authority event id and UTC so a later model/catalog change is a fixture update, not an undocumented visual drift.

---

## 15. Testing strategy

Propose layers, not tests. Do not mint expected values from Libration’s own eclipse implementation when independent truth is required.

| Layer | What to test | Truth source |
|-------|----------------|--------------|
| Astronomy | Detection, subtype, contacts, magnitude | **Authoritative fixtures** (published contacts/paths), not self-consistency of the generator |
| Geography | Projection of limits/paths; dateline split; visibility hemisphere | Geometric invariants + a few known footprints |
| Reference city | Visible vs not; local contacts vs global | Same fixtures at catalog city coordinates |
| Time | Arbitrary `utcMs`; horizon clipping; upcoming → active → completed; demo jump | Synthetic events in a test double of the authority |
| Config | Defaults; persistence of semantic choices; independent presentation toggles | Normalization tests (existing pattern) |
| Rendering | Semantic geometry emitted; no primitives when disabled; backend has no eclipse names | Plan-builder tests (existing locus/track pattern) |

**Authoritative reference fixtures will be required** before claiming event-time or path accuracy. Screening tests against the current truncated model are not sufficient.

---

## 16. Architectural boundaries to preserve

- One authoritative product UTC per frame.
- Astronomy and event discovery upstream of rendering.
- No network fetch in the render path.
- `RenderPlan` remains the rendering boundary.
- Canvas has no eclipse semantics (unlike the current illumination realization leak).
- Durable config stores semantic choices, not resolved ephemeral geometry.
- Reference city remains shared application state.
- Map seam/wrap handled deliberately for lines and regions.
- Visual verification uses production semantics via DEV fixtures.
- Event discovery does not run wastefully at frame rate.

### Event playback (navigation, not authority)

Event playback ([LIB-047](../../work/LIB-047-eclipse-tour-demo-playback.md), [LIB-052](../../work/LIB-052-unified-demo-event-playback-and-milky-way-event-presentation.md), [LIB-053](../../work/LIB-053-multi-family-event-playback-and-mw-freeze-repair.md), [ADR 0015](../../decisions/0015-domain-tour-sequencer-drives-shared-demo-time.md), [ADR 0019](../../decisions/0019-domain-event-playback-belongs-to-data.md), [ADR 0020](../../decisions/0020-event-playback-merges-enabled-domain-sources.md)) is a Data → Event playback navigation tool. Enabled solar, lunar, and Milky Way sources merge into one chronological Demo-time stream. Eclipse enumeration uses the existing bundled solar/lunar catalogs and commands Demo time. It does **not** own eclipse astronomy, alter solar/lunar authority, override forecast horizons, or force presentation (layers, type filters, labels, alignment). Eligibility uses Data Solar/Lunar type checkboxes **and** existing subtype filters; layer masters do not gate the tour. Range intersection uses authoritative `[globalStart, globalEnd]`. Lead-in Immediate means event start, not greatest eclipse.

**New candidate boundary:** `EclipseEventService` / `EclipseFrame` on the frame context. If implementation is approved, record it as an ADR and, if it remains durable, a short pointer from `ARCHITECTURE.md`. Not done in LIB-012.

Eclipse geography is **event astronomy** (principle 9): large map-spanning bands are justified only while an event is in the forecast/live window, not as a permanent diagram.

---

## 17. Reuse versus new

| Capability | Current owner | Reuse as-is | Extend | New component | Rationale |
|------------|---------------|-------------|--------|---------------|-----------|
| Sun position | `subsolarPoint.ts` | Ambient glyph, illumination, analemma | Export RA/Dec if observer Sun altitude wants it | — | Visualization grade; not eclipse axis |
| Moon position | `sublunarPoint.ts` | Ambient glyph, moonlight, tracks, locus | — | — | Same |
| Product time | `TimeContext`, demo playback | Yes | Attach `EclipseFrame` | — | Discovery must bind to product UTC |
| Reference city | `referenceCityObserver.ts` | Yes | Circumstances view | — | Do not add a second observer |
| Lunar horizon | No overlay; `lunarDot` in illumination plan | Pattern only | Shared spherical contour helper in lunar-eclipse slice | Optional ambient overlay stays backlog | Not a blocker |
| Map projection | `equirectangularProjection.ts` | Yes | — | — | Spatial truth |
| Seam/wrap | `equirectSeamPath.ts` | Lines | Region split/copy | — | Footprints need more than polylines |
| Layer system | `SceneConfig`, factory, registry | Yes | Two presentation rows | — | Existing overlay contract |
| `RenderPlan` | `renderPlanTypes.ts` | Yes | — | No eclipse primitive | `path2d` / `line` / `text` suffice |
| Shading/illumination | `illuminationShading.ts` | Unchanged | — | Do not encode umbra here | Separate event overlay |
| Event discovery | None | — | — | **EclipseEventService** | Must not live in Canvas or per-frame layers |
| Eclipse geometry | None | — | — | **Authority + solar/lunar geometry modules** | Missing distances/radii/shadows |
| Forecast lifecycle | None | Cache analog from tracks/locus | — | Classification on `EclipseFrame` | Presentation vs truth split |
| Reference-city eclipse circumstances | None | Observer location | Altitude from existing spherical/hour-angle math | Circumstances module | Derived view |
| Live alignment presentation | None | Sun/Moon glyphs as visual language | — | Alignment plan builder | Independently disableable |

---

## 18. Proposed implementation sequence

Do **not** create these work items here. Finite vertical slices, derived from the inventory (no engine exists, so a “just turn on a layer” first slice is impossible; a long invisible foundation is also rejected).

### E1 — Solar event truth and live geographic footprint — **implemented (LIB-014)**

- **Goal:** Adopt the approved authority; resolve whether a solar eclipse is active at product UTC; emit centerline and/or umbral/partial footprint at `T` for that event; DEV scene at a known total solar eclipse.
- **Dependencies:** Authority selected in [§22](#22-eclipse-authority-selected). Human authorization of an E1 work item.
- **Status:** Production. See [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md).
- **User-visible:** On a frozen known instant, a scientifically grounded solar footprint/path on the map. Ambient Sun/Moon unchanged.
- **Principal risks:** Authority licence/coverage; dateline-crossing regions; disagreement with ambient Moon marker.
- **Completion evidence:** Independent fixture tests for that event; plan-builder tests; Cursor visual verification of the DEV scene.

### E2 — Solar forecast window and progression — **implemented (LIB-015)**

- **Goal:** Upcoming events inside the horizon show path/band before first contact; as `T` enters the event, geometry progresses; after last contact it clears.
- **Dependencies:** E1.
- **Status:** Production. See [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md).
- **User-visible:** Demo time approaching an eclipse reveals the event corridor, then live motion along it, then removal of the live footprint when the event ends.
- **Principal risks:** Cache vs acceleration; horizon config without a frozen schema explosion (minimal horizon control only).
- **Completion evidence:** Time-lifecycle tests; corridor tests vs NASA fixtures; visual upcoming → active → gone.

### E3 — Lunar event truth and visibility geometry — **implemented (LIB-016)**

- **Goal:** Lunar events from the same authority; Earth-shadow/Moon relationship; terrestrial Moon-up region; no solar-style thin path.
- **Dependencies:** E1’s service/authority; not E2 strictly, but sharing the frame is cheaper after E2.
- **Status:** Production. See [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md).
- **User-visible:** Known total lunar eclipse: Moon-up hemisphere (or equivalent) plus shadow-relationship decoration.
- **Principal risks:** Forcing a path metaphor; over-building ambient lunar horizon.
- **Completion evidence:** Type/contact fixtures; hemisphere tests; visual scene with/without Moon-up at the reference city.

### E4 — Reference-city circumstances — **implemented (LIB-017)**

- **Goal:** Local visibility, contacts, maximum, altitudes, magnitude/obscuration where the authority allows — solar and lunar — using the existing city.
- **Dependencies:** E1 (solar) and E3 (lunar).
- **Status:** Production. See [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md).
- **User-visible:** Observer information on the existing reference city (lower-right eclipse information panel + optional bottom-HUD status). No second location system.
- **Principal risks:** Letting city visibility filter global events; inventing UI surface area.
- **Completion evidence:** City-in vs city-out fixtures; global event still resolves when the city cannot see it.

**GLOBAL ECLIPSE TRUTH IS NEVER FILTERED BY REFERENCE CITY.**

### E5 — Live alignment / beam presentation — **implemented (LIB-018)**

- **Goal:** Independently disableable alignment decoration from eclipse-authority geometry.
- **Dependencies:** E1; lunar analog after E3 if both kinds get a beam.
- **Status:** Production. See [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md).
- **User-visible:** Dramatic but grounded live-event emphasis.
- **Principal risks:** Arbitrary glow; backend-specific tricks; coupling to illumination.
- **Completion evidence:** Plan tests with effect off (no extra primitives); visual on/off.

### E6 — Configuration completeness and integration polish — **implemented (LIB-019)**

- **Goal:** Remaining configurable dimensions, readability, labels, defaults that keep the ambient map calm.
- **Dependencies:** E1–E5 as shipped.
- **Status:** Production. See [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md).
- **User-visible:** Coherent Eclipse System controls, event information, restrained labels, type filters, independent styling, factory solar/lunar masters on, honest unsupported-range copy.
- **Principal risks:** Schema sprawl; legacy layer flags.
- **Completion evidence:** Normalization/persistence tests; visual default vs rich configuration; end-to-end solar/lunar workflows.

E1–E6 are production. The planned Eclipse System sequence is complete. Do not invent E7 here. [LIB-020](../../work/LIB-020-eclipse-reconciliation-and-lunar-forecast.md) added lunar forecasting on the same EclipseAuthority / EclipseEventService path as solar, with a separate lunar horizon (default 7 days). [LIB-046](../../work/LIB-046-remove-lunar-eclipse-moon-visible-geography.md) removed instantaneous Moon-visible map geography. [LIB-054](../../work/LIB-054-static-lunar-eclipse-visibility-footprint.md) adds a different product: an event-static visibility footprint line. Ordinary Moon-above-horizon mechanics remain. Intentionally deferred ideas (event browser/history, swept *solar* penumbra union, atmospheric/ambient eclipse shading, map click-inspect) remain in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md#eclipse-system). The NASA/Espenak–Meeus authority classifies hybrid solar and penumbral lunar events; E6 labels them honestly in ordinary UI.

---

## 19. Open human decisions required before implementation

Ordinary coding choices (file names, token values, Catmull-Rom vs polyline density) are **not** listed.

### D1 — Event authority — **decided (LIB-013)**

Hybrid option **D**: NASA/Espenak–Meeus Five Millennium Canon/Catalog as bundled offline authority; current models stay ambient. Details: [§22](#22-eclipse-authority-selected).

### D2 — Offline coverage — **decided (LIB-013)**

Bundled span **1900-01-01T00:00:00.000Z ≤ T < 2101-01-01T00:00:00.000Z**. Outside that interval: explicit unsupported/outside-authority-range; never invent paths from ambient astronomy.

### D3 — Precision posture — **decided (LIB-013)**

Scientifically grounded instrument matching NASA Canon maps at world-map scale, not a survey or lunar-limb product. Numeric tolerances in [§22.3](#223-precision-target).

### D4 — First-release types — **decided for E1 (LIB-014) and E3 (LIB-016)**

Solar total, annular, and partial are production. Hybrid is preserved as event subtype when the NASA data provides it; E1 live presentation uses the same central-event machinery with umbra vs antumbra from `L2′`, not a hybrid-specific renderer. Lunar total and partial are production. Penumbral events keep their subtype and may draw when active; they are not reclassified as partial and do not fabricate umbral geometry.

### D5 — First visible slice — **decided (LIB-014 / LIB-015 / LIB-016)**

E1 live solar footprint at known NASA events. E2 solar forecast window and cached event corridor. E3 live lunar Earth-shadow on the Moon glyph plus terrestrial Moon-up region. Lunar forecast remains later.

### D6 — Service vs layers — **decided (LIB-014 / LIB-016)**

- **Options:** One mega-layer; two layers without a service; service + two layers (recommended); generic events platform.
- **Recommend:** **EclipseEventService + solarEclipse + lunarEclipse layers.**
- **Consequence:** One new frame seam; no events framework.

### D7 — Lunar horizon sequencing — **decided (LIB-016)**

- **Options:** Separate Lunar Visibility LIB first; contour inside E3; skip hemisphere and only decorate the Moon glyph.
- **Recommend:** **Contour inside E3**; do not create the ambient overlay LIB as a blocker.
- **Consequence:** Backlog lunar-horizon feature remains independently approvable.

### D8 — Ambient vs authority consistency

- **Options:** Move glyphs onto eclipse axis during events; leave offset; hide ambient Moon during solar eclipse.
- **Recommend:** **Leave ambient models unchanged**; alignment/beam uses authority geometry. Do not hide the Moon unless a later product item says so.
- **Consequence:** LIB-013 measured ~0.006° Sun / ~0.03°–0.42° Moon vs NASA at selected instants (world-map ~1 px). Sublunar vs umbra (~20°) is geometry, not model error. Not treated as a rendering bug. See [§22.12](#2212-ambient-glyph-offset).

---

## 20. Intentionally not predetermined

- Numeric imminent thresholds beyond the restrained product-time relative countdown shipped in E6.
- Colors, opacities, gradients, cone/beam shape, animation beyond the E1–E6 production tokens and user style families.
- Map click-inspect for eclipse overlays (scene pointer inspection remains unapproved).
- Extracting a shared `surfaceDotProduct(lat, lon, subpoint)` helper (good cleanup, not an architecture decision).
- Adding Sun RA/Dec exports before they have a caller.
- Any change to illumination composition.

---

## 21. Documentation ownership

| Truth | Owner |
|-------|--------|
| Product intent (why/what) | [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md#eclipse-system) |
| Strategic pointer | [`docs/ROADMAP.md`](../../ROADMAP.md) |
| Intended structure | **This file** |
| Eclipse authority selection | **This file, [§22](#22-eclipse-authority-selected)**; solar production boundary [ADR 0008](../../decisions/0008-bundled-nasa-solar-eclipse-authority.md) |
| Current code behaviour | [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md) |
| Durable invariants | [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) |
| Architecture reconnaissance | [`docs/work/LIB-012-eclipse-system-architecture.md`](../../work/LIB-012-eclipse-system-architecture.md) |
| Authority evaluation | [`docs/work/LIB-013-eclipse-authority-evaluation.md`](../../work/LIB-013-eclipse-authority-evaluation.md) |
| E1 live solar footprint | [`docs/work/LIB-014-solar-eclipse-live-footprint.md`](../../work/LIB-014-solar-eclipse-live-footprint.md) |
| E2 solar forecast window | [`docs/work/LIB-015-solar-eclipse-forecast.md`](../../work/LIB-015-solar-eclipse-forecast.md) |
| E3 lunar truth and visibility | [`docs/work/LIB-016-lunar-eclipse-truth-and-visibility.md`](../../work/LIB-016-lunar-eclipse-truth-and-visibility.md) |
| E4 reference-city circumstances | [`docs/work/LIB-017-reference-city-eclipse-circumstances.md`](../../work/LIB-017-reference-city-eclipse-circumstances.md) |
| E5 live alignment / beam | [`docs/work/LIB-018-eclipse-alignment-beam.md`](../../work/LIB-018-eclipse-alignment-beam.md) |

---

## 22. Eclipse authority (selected)

Selected by [LIB-013](../../work/LIB-013-eclipse-authority-evaluation.md). E1 consumed the solar half ([ADR 0008](../../decisions/0008-bundled-nasa-solar-eclipse-authority.md)); E3 consumed the lunar catalog half. Both are in source behind one `EclipseAuthority` family.

### 22.1 Chosen approach

One versioned offline **`EclipseAuthority`** with **separate solar and lunar backing data**.

| Role | Source | What it supplies | Local math |
|------|--------|------------------|------------|
| Solar event truth + time-parameterized shadow | NASA GSFC Five Millennium Canon/Catalog of Solar Eclipses (Espenak & Meeus), VSOP87 + ELP-2000/82, bundled **Besselian polynomial elements** | Existence, type (P/A/T/H), greatest-eclipse TD, ΔT, gamma, magnitude, GE lat/lon, path width/duration, polynomial `x,y,d,l1,l2,μ,tan f1, tan f2`, `t0`, validity window | Evaluate polynomials at UTC; convert Besselian shadow to geographic centerline, umbra/antumbra footprint, penumbral limits, and Earth-contact times using the standard algorithm (Chauvenet 1891; *Explanatory Supplement* 1974; Meeus 1989). |
| Lunar event truth + shadow state | NASA GSFC Five Millennium Catalog of Lunar Eclipses (Espenak & Meeus), same ephemerides, **Danjon** shadow enlargement | Existence, type (N/P/T), greatest-eclipse TD, ΔT, gamma, penumbral/umbral magnitudes, phase durations (P4−P1, U4−U1, U3−U2), zenith lat/lon at greatest eclipse | Derive P1/U1/U2/greatest/U3/U4/P4 by symmetry about greatest eclipse from NASA durations; interpolate Moon–shadow-axis separation from gamma + durations; draw circular umbra/penumbra. Moon-up region uses existing spherical geometry (E3). |
| Ambient Sun/Moon | Current `subsolarPoint` / `sublunarPoint` | Glyphs, illumination, analemma, tracks, locus, libration | Unchanged. |
| Common boundary | `EclipseAuthority` → `EclipseEventService` | Lookup, metadata, outside-range state | No network in the render path. |

**Deliberately not used** as eclipse-event authority: Libration’s truncated Sun/Moon models; a runtime JPL DE440/DE441 kernel; VSOP87/ELP recomputed in the browser; USNO year-by-year Almanac pages; EclipseWise.com as a redistribution source; precomputed path polylines/KML as the source of truth (derived samples may be cached later).

Solar and lunar datasets differ. Consumers see one interface.

### 22.2 Provenance and licensing

Primary publications (NASA Technical Publications; reproduction freely granted with acknowledgment):

- Espenak, F. & Meeus, J., *Five Millennium Canon of Solar Eclipses: −1999 to +3000*, NASA/TP-2006-214141.
- Espenak, F. & Meeus, J., *Five Millennium Catalog of Solar Eclipses: −1999 to +3000*, NASA/TP-2009-214174.
- Espenak, F. & Meeus, J., *Five Millennium Canon of Lunar Eclipses: −1999 to +3000*, NASA/TP-2009-214172 (canon) / NASA/TP-2009-214173 (catalog).
- Host: [https://eclipse.gsfc.nasa.gov/](https://eclipse.gsfc.nasa.gov/). Besselian CSV listed from the solar catalog index (dated 2014 Apr 11 on that page). Copyright note: [https://eclipse.gsfc.nasa.gov/SEpubs/copyright.html](https://eclipse.gsfc.nasa.gov/SEpubs/copyright.html).

Ephemerides inside those reductions: VSOP87 (Bretagnon & Francou 1988, *Astron. Astrophys.* 202, 309); ELP-2000/82 (Chapront-Touzé & Chapront 1983, *Astron. Astrophys.* 124, 50) with lunar acceleration \(ṅ = -25.858''/\mathrm{cy}^2\) (Chapront, Chapront-Touzé & Francou 2002). ΔT: Morrison & Stephenson (2004) historically; observed 1955–publication; extrapolated afterward.

NASA states that NASA material is not protected by copyright unless noted, and **permission is freely granted to reproduce** the eclipse data with acknowledgment. Required credit (use both lines if space allows; the first is the catalog’s stated form):

> Eclipse Predictions by Fred Espenak and Jean Meeus (NASA's GSFC)

> Eclipse map/figure/table/predictions courtesy of Fred Espenak, NASA/Goddard Space Flight Center, from eclipse.gsfc.nasa.gov.

Do **not** copy tables from Meeus, *Elements of Solar Eclipses 1951–2200* (Willmann-Bell, 1989) — that book is a cited algorithm reference, not a redistributable dataset. Do **not** scrape EclipseWise.com as the import source; newer personal-site material may not carry the NASA TP reproduction grant. E1 must import from NASA GSFC / the NASA TPs (or a byte-for-byte copy of those files recorded with provenance).

Algorithm references (not bundled data): Chauvenet, *Manual of Spherical and Practical Astronomy*, vol. 1 (1891, public domain); *Explanatory Supplement to the Astronomical Ephemeris and the American Ephemeris and Nautical Almanac* (HMSO, 1974), the method NASA itself cites; Meeus 1989 as a worked restatement.

### 22.3 Precision target

Posture: **match the NASA Canon/Catalog at consumer world-map scale**, not replace IERS/USNO survey products or lunar-limb graze predictions. NASA path pages themselves omit centre-of-figure and lunar-limb profile.

Grounded tolerances for tests against **the same authority version** (not against a different ephemeris):

| Quantity | Target vs NASA Canon/Catalog | Why |
|----------|------------------------------|-----|
| Greatest-eclipse time | ≤ 5 s | Polynomial evaluation; catalog times are to 1 s. |
| Solar central-line position at mid-eclipse | ≤ 10 km | ~0.5 px on a 1920-px world map; umbral width is typically 50–250 km. |
| Solar central-line near sunrise/sunset limits | ≤ 25 km | Geometry is ill-conditioned at the terminator. |
| Path width at greatest eclipse | ≤ 5 km | Width is in the catalog; Besselian `L2` should reproduce it. |
| Solar local contacts (E4) | ≤ 15 s | Same elements; minute-class from LIB-012 is a floor, not the ceiling. |
| Lunar contact times | ≤ 1 min | NASA publishes durations to 0.1 min; contacts are derived by symmetry about greatest eclipse. |
| Lunar magnitudes | exact catalog values | Do not re-derive from ambient astronomy. |

A user comparing Libration’s path to NASA GSFC Canon maps at global scale should **not** see an obvious displacement. Lunar-limb and ΔT-update discrepancies of a few kilometres versus later EclipseWise/USNO bulletins are accepted and must not be treated as renderer bugs.

Modern ΔT (1955–present) is observational; 1 s of ΔT ≈ 0.46 km of longitude at the equator. The 2006/2009 Canon’s extrapolated ΔT for 2024 (74 s in the catalog dump vs 70.6 s on later NASA element pages) is a few kilometres — inside the table above. Pin catalog ΔT in authority v1; refreshing ΔT is a version bump.

### 22.4 Offline span and outside-span behaviour

**Bundled authority interval:** `1900-01-01T00:00:00.000Z` inclusive to `2101-01-01T00:00:00.000Z` exclusive.

Rationale: Gregorian throughout; ΔT observationally anchored for most of the window; ~454 solar + ~457 lunar events (NASA century totals 228+224 solar for 1901–2100 and 229+228 lunar, plus the 1900 events); data volume is small; covers historical 20th-century demos and the rest of the 21st century. Wider Canon coverage (−1999 to +3000, 11 898 solar + 12 064 lunar) is cheap in bytes but adds Julian-calendar rules and large ΔT gores (NASA plots longitude-uncertainty gores before year 1 and after 2300). 1800–2200 is a plausible later widening, not the v1 contract.

**Outside-span contract:** `EclipseAuthority` reports `supported: false` (or equivalent) for that UTC. `EclipseEventService` returns no events and an **explicit outside-authority-range** state. Presentation may later show a diagnostic. **Never** fall back to `subsolarPoint` / `sublunarPoint` / phase screening and draw a path as if it were authoritative.

### 22.5 Data volume and distribution

Estimates for the **1900–2100** derived asset (do not add files in this item):

| Content | Order of size |
|---------|----------------|
| Solar event metadata | ~50 KB |
| Solar Besselian polynomials | ~100–150 KB |
| Lunar event/contact/magnitude/gamma | ~50 KB |
| Combined derived JSON | ~150–250 KB uncompressed; well under 100 KB gzip |
| Full 5 000-year Besselian CSV (source, not necessarily shipped) | ~2–3 MB |

Prefer a **durable static asset** (catalog pattern of ADR 0003), not huge JS literals. Trivial next to base-map rasters; fine for Vite/npm bundle, startup, and offline. Do **not** ship DE440s (~31 MB) or DE441 (~3 GB) for this feature.

Precomputed path polylines (e.g. 180 samples × centerline+limits × ~450 solar events) are ~1–2 MB and **cannot** answer arbitrary-UTC footprints without a second time index. Besselian elements dominate that design.

### 22.6 Versioning and updates

Authority data is versioned **independently** of application semantics.

Conceptual workflow (not implemented here):

1. Record the NASA source files and retrieval date in provenance metadata.
2. A development-time generation script filters to the bundled span and emits a derived static asset plus a manifest (`authorityId`, `sourceVersion`, `generatedAt`, `supportedUtcRange`, license note).
3. Commit the derived asset, not an ad-hoc hand edit of coefficients.
4. Diagnostics/about may display authority id/version.
5. Tests pin `authorityVersion` and compare against published NASA numbers for the [verification fixtures](#2211-verification-fixtures).
6. If a later NASA/ΔT revision shifts a path, bump the authority version and update fixtures. Do not silently treat the shift as a renderer regression.

Runtime never fetches NASA. Regenerating is a development action.

### 22.7 Arbitrary product time

The catalog is a static, time-addressable table. Lookup does not depend on wall-clock scheduling or incremental stepping. Large year jumps, accelerated demo time, pause, and seeks into mid-eclipse all use the same function of product UTC: discover overlapping events, then evaluate geometry at `T`. Cache invalidation on large jumps follows LIB-012 §7.

### 22.8 Event discovery

`EclipseEventService` queries `EclipseAuthority` with product UTC `T` and horizon `H` (implemented, [LIB-015](../../work/LIB-015-solar-eclipse-forecast.md)):

- the event whose global interval contains `T` (active);
- the next event with `globalStart > T`;
- all events whose global interval intersects `(T, T+H]`;
- filters: solar / lunar / subtype.

Implementation: a **sorted array of events by `globalStart`**, binary search, plus stored `globalEnd` so intersection is a short linear scan from the insertion point (n ≈ 900; an interval tree is unnecessary). Deterministic; no per-frame season hunting.

Solar `globalStart`/`globalEnd` should be **derived at ingest** from Besselian Earth-penumbra contacts (or `tmin`/`tmax` as a conservative bound). Lunar contacts come from catalog durations about greatest eclipse.

### 22.9 Time-parameterized geometry

**Solar.** At any UTC in the element validity window (`t0 ± 3` hours in NASA’s least-squares fit; use `tmin`/`tmax` when present):

\[
a(t) = a_0 + a_1 t + a_2 t^2 + a_3 t^3,\quad t = t_1 - t_0\ \text{(hours of TDT)}
\]

for \(a \in \{x, y, d, l_1, l_2, \mu\}\). Then the standard Besselian reduction gives shadow-axis intersection, umbral/antumbral radius on the fundamental plane (`L2`; sign distinguishes umbra vs antumbra), penumbral radius (`L1`), cone angles (`f1`,`f2`), and geographic limits. That is the live footprint for E1 — not a single maximum-eclipse polyline.

**Lunar.** No solar-style terrestrial path. At UTC `T`, interpolate the Moon’s fundamental-plane offset from gamma at greatest eclipse and the contact timetable; compare to umbral/penumbral radii implied by NASA magnitudes (Danjon enlargement already in those magnitudes). Penetration state drives E3 decoration. Terrestrial Moon-up geometry is spherical `lunarDot` (existing pattern), not a Besselian footprint.

### 22.10 Reference-city extensibility

The same solar Besselian elements are the classical input to **local circumstances** (first/maximum/last contact, totality/annularity contacts, magnitude, obscuration, Sun altitude). E4 should reuse this authority; it must not introduce a second ephemeris.

Lunar local circumstances are simpler: global contacts are the same everywhere; visibility is Moon-above-horizon at the shared reference city (`resolveReferenceCityObserverLocation`). Altitude can use the existing spherical/hour-angle pattern. No second observer.

### 22.11 Verification fixtures

Recommended independent-truth anchors for later tests (NASA GSFC Canon/Catalog / element pages). Do not add fixtures in this item.

**Solar**

| Event | Type | Why |
|-------|------|-----|
| 2024 Apr 08 | Total | Recent well-known path; NASA Besselian + path table (GE 18:17:18.3 UT, 25°17.2′N 104°08.3′W on the later element page; catalog dump uses ΔT = 74 s). |
| 2017 Aug 21 | Total | Well-known US path; GE 18:26:40 TD, 37°N 88°W (catalog). |
| 2023 Oct 14 | Annular | Americas annular; GE 18:00:41 TD, 11°N 83°W. |
| 2022 Oct 25 | Partial | No umbra on Earth; GE 11:01:20 TD, 62°N 77°E. |
| 2021 Dec 04 | Total | Polar / high-γ (γ = −0.9526), 77°S 46°W. |
| 2016 Mar 09 | Total | Western Pacific (10°N 149°E); dateline-adjacent path for seam tests. |
| 2023 Apr 20 | Hybrid | Authority emits `H`; 10°S 126°E. |

**Lunar**

| Event | Type | Why |
|-------|------|-----|
| 2022 May 16 | Total | Deep umbral magnitude 1.4137; zenith 19°S 64°W. |
| 2018 Jan 31 | Total | Well-known; zenith 17°N 161°E. |
| 2008 Aug 16 | Partial | Umbral magnitude 0.8076; zenith 13°S 43°E. |
| 2021 May 26 | Total (grazing) | Umbral magnitude 1.0095; near-miss totality. |
| 2015 Apr 04 | Total | Zenith 5°S 179°W — dateline. |

Useful published truths: type, TD/UT of greatest eclipse, ΔT, gamma, magnitudes, durations/contacts, GE/zenith coordinates, solar path width and central duration, Besselian polynomials for solar events.

### 22.12 Ambient glyph offset

Compared at published greatest-eclipse instants using current production series vs NASA equatorial coordinates / lunar zenith points (research computation in LIB-013; models were not changed):

- **Sun:** ~0.006° (~0.7 km) vs NASA 2024 Apr 08 Sun RA/Dec — imperceptible.
- **Moon:** ~0.03°–0.42° (~4–46 km) vs NASA lunar-eclipse zenith points; ~0.20° (~23 km) vs NASA Moon RA/Dec at 2024 TSE.
- **Sun–Moon relative (2024 TSE):** Libration 0.43° vs NASA 0.35°. Residual misalignment ~0.08°.
- **Moon glyph vs umbral GE point:** ~20° on 2024 Apr 08. That is **geometry**, not model error: the umbra is where the Sun is ~70° up, not the sublunar/subsolar zenith.

On the current full-world map (~5 px/degree at 1920 px), lunar error is about a pixel. **Risk: small but acceptable; not a visually obvious wrong path.** Keep D8: do not authority-align glyphs in E1. A later product item may optionally snap glyphs to authority positions during an active eclipse if a beam makes the residual noticeable.

### 22.13 Authority contract (conceptual)

Minimal surface E1 may rely on. Names are conceptual.

**Metadata**

- `authorityId` (durable semantic id)
- `authorityVersion`
- `source` / `sourceVersion` (NASA TP ids + retrieval/generation date)
- `supportedUtcRange` `{ startMs, endMs }`
- `licenseNote` / attribution string

**Lookup**

- `isSupported(utcMs) → boolean`
- `getEvent(id)`
- `eventsIntersecting(startMs, endMs, filter?)`
- `activeEvent(utcMs, filter?)`
- `nextEventAfter(utcMs, filter?)`

**Solar event**

- identity: durable id, catalog number, Saros, kind=`solar`, subtype=`partial|annular|total|hybrid`
- `greatestEclipseTdtMs`, `deltaTSeconds`, `gamma`, `magnitude`
- `globalStartMs` / `globalEndMs` (Earth-penumbra contacts, derived)
- Besselian set: `t0TdtHours`, coefficients for `x,y,d,l1,l2,mu`, `tanF1`, `tanF2`, `tMin`, `tMax`
- `geometryAt(utcMs) →` shadow axis / central point (if any) / umbra or antumbra footprint / penumbral footprint / path limits, or empty if `T` is outside the element window

**Lunar event**

- identity: durable id, catalog number, Saros, kind=`lunar`, subtype=`penumbral|partial|total`
- `greatestEclipseTdtMs`, `deltaTSeconds`, `gamma`, `penumbralMagnitude`, `umbralMagnitude`
- contacts P1/U1/U2/U3/U4/P4 (U2/U3 omitted when not total; U1/U4 omitted when penumbral-only)
- zenith lat/lon at greatest eclipse
- `geometryAt(utcMs) →` umbral/penumbral penetration state (and radii) at the Moon

**Outside range**

- `isSupported` is false; lookups return empty plus an explicit unsupported-range indicator. No ambient fallback.

No presentation configuration lives here.

### 22.14 E1 inputs

E1 implemented solar event truth and a live geographic footprint without another research phase:

1. NASA GSFC solar catalog metadata + Besselian polynomials for 1900–2100 in versioned `EclipseAuthority` asset `nasa-espenak-meeus-5mcse-solar` v1.
2. Polynomial evaluation + Chauvenet/Explanatory Supplement Besselian→geographic geometry in `src/core/eclipse/`.
3. Active solar event at product UTC; centerline, umbral/antumbral band, and partial footprint at `T`. Partial-only events do not fabricate a central band.
4. Tests pin `authorityVersion` and the solar fixtures in [§22.11](#2211-verification-fixtures).
5. Ambient Sun/Moon unchanged; lunar consumption is E3.

On-disk encoding is JSON. Master Solar eclipses control defaults **off**; central line / band / partial default **on** when the layer is enabled.

### 22.15 Candidate comparison (summary)

| Criterion | A Precomputed paths/catalog only | B Besselian + local geometry | C JPL DE runtime | D Hybrid catalog + local geometry (**selected**) |
|-----------|----------------------------------|------------------------------|------------------|--------------------------------------------------|
| Authority quality | High at tabulated instants | High; same NASA reduction | Highest possible | High (NASA) + local time function |
| Solar path at arbitrary UTC | Weak unless densely sampled | Native | Native, expensive | Native via Besselian |
| Lunar | Catalog metadata | N/A as solar method | Native | Catalog + simple shadow |
| Offline / bundle size | Medium–large if sampled | ~100–250 KB | 31 MB–3 GB | ~150–250 KB |
| Browser / demo time | OK | OK | Heavy | OK |
| Implementation complexity | Low ingest, weak live geometry | Medium | High (SPK + Earth orientation + shadows) | Medium |
| Licensing | NASA OK if from GSFC; third-party KML often unclear | NASA OK | NAIF kernels redistributable unmodified; still overkill | NASA OK |
| Local circumstances later | Needs extra data | Same elements | Yes | Same elements |
| Winner | No — static max-eclipse paths fail E1 live footprint | Solar half of D | Overkill vs instrument posture | **Yes** |

Uncertainty: NASA GSFC site copies of the mysqldump CSV vs later per-event ELP2000-85 pages differ by a few seconds of ΔT; v1 pins the Canon/Catalog dump. Lunar contacts from duration symmetry vs unpublished lunar Besselian polynomials: difference expected ≪ 1 min; acceptable. JPL would beat Canon on absolute modern accuracy by kilometres at most — below world-map noticeability and above justified complexity.

### 22.16 E3 inputs

E3 implemented lunar event truth and circular Earth-shadow geometry at the Moon without another research phase:

1. NASA GSFC lunar catalog metadata + contact durations for 1900–2100 in versioned `EclipseAuthority` asset `nasa-espenak-meeus-5mcle-lunar` v1.
2. Duration-symmetry contacts and magnitude-recovered circular shadow radii in `src/core/eclipse/`.
3. Active lunar event at product UTC; Moon-glyph Earth-shadow overlay; Moon-above-horizon geometry from ambient `sublunarPoint` (geometric horizon, spherical Earth, no refraction) for illumination and local circumstances.
4. Tests pin `authorityVersion` and the lunar fixtures in [§22.11](#2211-verification-fixtures).
5. No solar-style terrestrial corridor. Map geography is the event-static visibility footprint line ([LIB-054](../../work/LIB-054-static-lunar-eclipse-visibility-footprint.md)), not a current-instant Moon-visible hemisphere ([LIB-046](../../work/LIB-046-remove-lunar-eclipse-moon-visible-geography.md)).

Master Lunar eclipses control defaults **on** as of E6. Moon Earth-shadow treatment defaults **on** when the layer is enabled. Lunar eclipse visibility footprint defaults **on**. A separate lunar forecast horizon defaults to 7 days.
