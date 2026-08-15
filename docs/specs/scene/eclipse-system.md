# Eclipse System — intended architecture

## What this document is

A **planning specification** produced by [LIB-012](../../work/LIB-012-eclipse-system-architecture.md). It records how Libration currently intends to structure an Eclipse System, after a repository inventory of existing solar/lunar capability.

It is **not** approval to implement. It is **not** a record of what the product does today. Current behaviour remains in [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md). Product intent (why/what) remains in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md#eclipse-system). Durable invariants remain in [`ARCHITECTURE.md`](../../../ARCHITECTURE.md).

Human review of the [open decisions](#15-human-decisions-required-before-implementation) is required before any implementation slice is authorized.

This document does not freeze configuration schema, UI, colors, cone shapes, animation, catalog vendor, or exact numeric thresholds beyond the user-controlled forecast horizon.

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
| Lunar: no solar-style narrow terrestrial path; Earth-shadow vs Moon; Moon-visible region | Lunar geographic geometry; visibility hemisphere is not a path of totality |
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

**No production, test, config, asset, or history module implements eclipse events, eclipse geometry, or eclipse presentation.** The word “annular” in source is chrome glyph geometry (`annularSectorPath2D` in `src/glyphs/glyphGeometry.ts`), not solar-eclipse type. History mentions eclipse only as out-of-scope notes on lunar-track/locus work items.

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

**Recommendation: D**, with these constraints:

- Do **not** use option A for product truth.
- Prefer a **bundled, offline** eclipse authority (computed Besselian-style elements, or a versioned event/element catalog stored in the repo) so demo time, local-first use, and “no network in the render path” all hold.
- Do **not** replace `subsolarPoint` / `sublunarPoint` in this programme.
- Live alignment geometry follows the **eclipse authority**, not the ambient glyphs, so a dramatic beam is tied to the footprint even if the visualization-grade Moon marker is slightly offset.
- Exact catalog format, vendor, date span, and whether Libration later grows a B-class generator remain [human decisions](#15-human-decisions-required-before-implementation). Later research (outside this item) must cover licence, provenance, and a declared coverage window.

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

### Astronomical geometry

Shadow axis, umbra/antumbra/penumbra, contacts, type, magnitude. Owned by the eclipse authority + geometry module in `src/core/` (or a dedicated `src/core/eclipse/` tree). Evaluated at UTC.

### Semantic map geometry

Geographic polylines/polygons in lat/lon: centerline, totality/annularity band, partial footprint, optional contact markers. Equirectangular **seam/dateline** is handled here or in the plan builder using `equirectSeamPath` for lines. Filled regions that cross ±180° need an explicit split/copy strategy from the first implementation that draws a footprint — do not discover this at paint time.

### Presentation / style

Stroke tokens, fills, labels, forecast vs live opacity, whether centerline/band/partial/alignment are on. Owned by scene-layer parameters and plan builders. Canvas draws `line` / `path2d` / `text` only.

Configurable combinations (schema later): centerline; totality/annularity band; partial footprint; contact/progression; forecast vs live; alignment/beam.

Illumination raster is **not** the solar eclipse overlay. Do not encode the umbra by hacking `sampleIlluminationRgba8`.

---

## 10. Lunar eclipse map architecture

A lunar eclipse is an Earth-shadow event on the Moon, visible from the night-side hemisphere where the Moon is up. It does **not** have a moving narrow terrestrial path of totality.

Semantic map geometry should include some combination of:

- Indication of Earth-shadow / lunar penetration (map-space decoration associated with the Moon / shadow axis, not a thin Earth track).
- Terrestrial region where the Moon is above the horizon (spherical first cut: complement of the lunar terminator).
- Optional subset where the eclipse is in progress and the Moon is up.
- Reference-city circumstances when an observer exists.

### Relation to Lunar Visibility / Moon Horizon backlog

The spherical Moon-above-horizon contour is the same geometric object the backlog wants as an explanatory overlay. For eclipses it is **event-gated**.

**Recommendation:** do **not** require a separate Lunar Visibility LIB before lunar eclipse presentation. Implement the contour as part of lunar-eclipse geometry (or a small shared helper introduced in that slice). Shipping it as a continuous ambient overlay remains a separate product decision.

---

## 11. Live alignment / beam (“Mars Attacks”)

Desired: dramatic, scientifically grounded alignment emphasis during an active eclipse, using existing Sun/Moon visual language, independently disableable.

### Upstream data the effect needs

**Solar:** authority shadow axis; umbral/antumbral Earth footprint (or axis intersection); Sun and Moon directions at T (authority, not ambient glyphs). Conceptual chain: Sun → Moon → Earth footprint.

**Lunar:** Sun → Earth → Moon shadow axis; Earth-shadow / Moon relationship; not a fake terrestrial “path.”

### Where it lives

Presentation / style. A plan builder emits ordinary primitives (`path2d`, gradients, lines) from semantic alignment geometry. Not a new backend blend mode. Not illumination. Not a literal laser.

The user must be able to disable this without disabling paths/regions or the event service.

Colors, opacity, cone shape, and animation remain **open**.

---

## 12. Reference-city circumstances

LIB-011 already binds observer identity to chrome `displayTime.topBandAnchor` via `resolveReferenceCityObserverLocation`. Eclipse work must use that seam only.

| Solar (when observer exists) | Lunar |
|------------------------------|--------|
| Locally visible? (Sun up **and** inside partial/total/annular footprint as applicable) | Moon above horizon? |
| Local contacts, local maximum | Local contacts, maximum |
| Magnitude / obscuration | Magnitude where meaningful |
| Sun altitude | Moon altitude (derivable from existing hour-angle/declination formula; export rather than invent a second observer math stack) |

Global event existence **never** depends on these fields.

No separate eclipse lat/lon picker. No frozen UI (chrome chip vs inspectable panel is backlog-adjacent, not this architecture’s schema).

---

## 13. Configuration direction

Do **not** define the schema in this item.

Expected future dimensions: master enable; event categories/types; forecast horizon; solar path / partial region / centerline; lunar visibility region; labels; forecast prominence; live alignment; beam effect; reference-city information; styling.

### Where it should live

One **Eclipse System** subtree on the persisted document (scene-adjacent), because enablement, horizon, and types are shared event-service inputs. Presentation rows in `SceneConfig.layers` for what is drawn.

### Structural options

| Structure | Pros | Cons |
|-----------|------|------|
| One Eclipse layer with subconfiguration | Fewer stack ids | Mixes solar and lunar map metaphors; ordering/readability become awkward |
| Separate Solar Eclipse / Lunar Eclipse layers only (no service) | Matches analemma vs locus | Discovery would leak into layers or be duplicated |
| **Event service + two presentation layers** | Discovery owned once; solar vs lunar geography stay distinct; independent visibility | One more runtime seam (like lifecycle attachment) |
| Generic Astronomical Events platform first | Attractive later | Explicitly out of scope; would delay visible eclipse value |

**Recommendation:** global `EclipseEventService` feeding **two** presentation layers (`solarEclipse`, `lunarEclipse`), with a shared config root for master enable, types, and horizon. Do not start a generic events framework.

Follow existing overlay patterns: `source.kind === "derived"` (or a dedicated derived product id), parameters for presentation, factory dispatch by source rather than a one-off bootstrap switch. New stack ids require `SCENE_STACK_LAYER_IDS` and rebuild-predicate care if constructors capture config.

Do not extend the legacy `LayerEnableFlags` product surface; treat it as derived if a compatibility flag is unavoidable.

---

## 14. Visual verification strategy

Production eclipse implementation must be inspected in Cursor’s in-editor Browser per [`docs/VISUAL_VERIFICATION.md`](../../VISUAL_VERIFICATION.md). Scenarios are DEV-only, startup/reload, paused demo UTC, persistence isolated, no scenario ids in layers/`RenderPlan`/Canvas.

**Do not add scenarios in this architecture item.**

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

### E1 — Solar event truth and live geographic footprint

- **Goal:** Adopt the approved authority; resolve whether a solar eclipse is active at product UTC; emit centerline and/or umbral/partial footprint at `T` for that event; DEV scene at a known total solar eclipse.
- **Dependencies:** Human decisions on authority, offline span, and precision posture.
- **User-visible:** On a frozen known instant, a scientifically grounded solar footprint/path on the map. Ambient Sun/Moon unchanged.
- **Principal risks:** Authority licence/coverage; dateline-crossing regions; disagreement with ambient Moon marker.
- **Completion evidence:** Independent fixture tests for that event; plan-builder tests; Cursor visual verification of the DEV scene.

### E2 — Solar forecast window and progression

- **Goal:** Upcoming events inside the horizon show path/band before first contact; as `T` enters the event, geometry progresses; after last contact it clears.
- **Dependencies:** E1.
- **User-visible:** Demo time approaching an eclipse reveals the path, then live motion, then removal.
- **Principal risks:** Cache vs acceleration; horizon config without a frozen schema explosion (minimal horizon control only).
- **Completion evidence:** Time-lifecycle tests; visual upcoming → active → gone.

### E3 — Lunar event truth and visibility geometry

- **Goal:** Lunar events from the same authority; Earth-shadow/Moon relationship; terrestrial Moon-up region; no solar-style thin path.
- **Dependencies:** E1’s service/authority; not E2 strictly, but sharing the frame is cheaper after E2.
- **User-visible:** Known total lunar eclipse: Moon-up hemisphere (or equivalent) plus shadow-relationship decoration.
- **Principal risks:** Forcing a path metaphor; over-building ambient lunar horizon.
- **Completion evidence:** Type/contact fixtures; hemisphere tests; visual scene with/without Moon-up at the reference city.

### E4 — Reference-city circumstances

- **Goal:** Local visibility, contacts, maximum, altitudes, magnitude/obscuration where the authority allows — solar and lunar — using the existing city.
- **Dependencies:** E1 (solar) and E3 (lunar).
- **User-visible:** Observer information without a second location system. Exact chrome/UI still scoped in the implementing item.
- **Principal risks:** Letting city visibility filter global events; inventing UI surface area.
- **Completion evidence:** City-in vs city-out fixtures; global event still resolves when the city cannot see it.

### E5 — Live alignment / beam presentation

- **Goal:** Independently disableable alignment decoration from eclipse-authority geometry.
- **Dependencies:** E1; lunar analog after E3 if both kinds get a beam.
- **User-visible:** Dramatic but grounded live-event emphasis.
- **Principal risks:** Arbitrary glow; backend-specific tricks; coupling to illumination.
- **Completion evidence:** Plan tests with effect off (no extra primitives); visual on/off.

### E6 — Configuration completeness and integration polish

- **Goal:** Remaining configurable dimensions, readability, labels, defaults that keep the ambient map calm.
- **Dependencies:** E1–E5 as shipped.
- **User-visible:** Coherent Eclipse System controls without mode chaos.
- **Principal risks:** Schema sprawl; legacy layer flags.
- **Completion evidence:** Normalization/persistence tests; visual default vs rich configuration.

E1 is the recommended first implementation slice after human review. Penumbral lunar and hybrid-as-first-class remain accommodated in the model but are not required to complete E1–E3 unless the authority emits them cheaply.

---

## 19. Open human decisions required before implementation

Ordinary coding choices (file names, token values, Catmull-Rom vs polyline density) are **not** listed.

### D1 — Event authority

- **Options:** A current models; B new internal ephemeris; C catalog/elements only; D hybrid (recommended).
- **Recommend:** **D**, bundled offline authority for event/geometry truth; current models stay ambient.
- **Consequence:** First slice includes an ingest or generator boundary. Ambient Sun/Moon may not sit exactly on the eclipse axis.

### D2 — Offline coverage

- **Options:** Offline-only bundled span; network catalog with fixture fallback; compute-any-date internal model.
- **Recommend:** **Offline bundled span** as the product minimum (local-first, demo time, no render-path fetch). Document behaviour **outside** the span (no events, visible degraded state — exact UX later).
- **Consequence:** Later research must pick span and licence. Demo years outside the span will not invent eclipses.

### D3 — Precision posture

- **Options:** Toy visualization; scientifically grounded instrument (city generally right side of totality band, contacts ~minute-class); almanac/survey replacement.
- **Recommend:** **Scientifically grounded instrument**, not a survey product. State this in the implementing item’s docs.
- **Consequence:** Independent fixtures are mandatory; pixel-perfect NASA path overlays are not.

### D4 — First-release types

- **Options:** Solar total-only; solar total+annular+partial; include hybrid; lunar total+partial; include penumbral.
- **Recommend:** **Solar total, annular, and partial** in E1–E2; **lunar total and partial** in E3; hybrid and penumbral accommodated if the authority already classifies them, otherwise later.
- **Consequence:** Matches backlog without blocking E1 on hybrid/penumbral modelling.

### D5 — First visible slice

- **Options:** Invisible kernel-only; E1 live solar footprint; forecast-only before live.
- **Recommend:** **E1** (live solar footprint at a known event) so value is visible immediately after the authority lands.
- **Consequence:** Forecast (E2) follows rather than preceding any pixels.

### D6 — Service vs layers

- **Options:** One mega-layer; two layers without a service; service + two layers (recommended); generic events platform.
- **Recommend:** **EclipseEventService + solarEclipse + lunarEclipse layers.**
- **Consequence:** One new frame seam; no events framework.

### D7 — Lunar horizon sequencing

- **Options:** Separate Lunar Visibility LIB first; contour inside E3; skip hemisphere and only decorate the Moon glyph.
- **Recommend:** **Contour inside E3**; do not create the ambient overlay LIB as a blocker.
- **Consequence:** Backlog lunar-horizon feature remains independently approvable.

### D8 — Ambient vs authority consistency

- **Options:** Move glyphs onto eclipse axis during events; leave offset; hide ambient Moon during solar eclipse.
- **Recommend:** **Leave ambient models unchanged**; alignment/beam uses authority geometry. Do not hide the Moon unless a later product item says so.
- **Consequence:** Possible small glyph/footprint disagreement; documented, not treated as a rendering bug.

---

## 20. Intentionally not predetermined

- Exact configuration schema and control layout.
- Catalog vendor, file format, and year coverage.
- Besselian vs other element representations (authority adapter hides this).
- Numeric imminent thresholds.
- Colors, opacities, gradients, cone/beam shape, animation.
- Whether hybrid is a stored subtype or inferred per instant along the path.
- Whether lunar penumbral events are shown in E3.
- Chrome vs inspectable-panel placement for observer circumstances.
- Extracting a shared `surfaceDotProduct(lat, lon, subpoint)` helper (good cleanup, not an architecture decision).
- Adding Sun RA/Dec exports before they have a caller.
- Any change to illumination composition.

---

## 21. Documentation ownership

| Truth | Owner |
|-------|--------|
| Product intent (why/what) | [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md#eclipse-system) |
| Strategic pointer | [`docs/ROADMAP.md`](../../ROADMAP.md) |
| Intended structure (how, pending review) | **This file** |
| Current code behaviour | [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md) |
| Durable invariants | [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) |
| This reconnaissance item | [`docs/work/LIB-012-eclipse-system-architecture.md`](../../work/LIB-012-eclipse-system-architecture.md) |
