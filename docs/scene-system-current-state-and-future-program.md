# Scene System — Current State and Future Program

## Purpose

This document exists to bridge the gap between:

* architectural/specification documents
* actual implemented runtime state
* long-term intended product direction

The existing specification documents define:

* contracts
* boundaries
* invariants
* future-safe structure

This document instead defines:

* what is ACTUALLY implemented now
* what architectural capabilities now exist
* what major future programs remain
* recommended sequencing for future development chat sessions

This document should be treated as the authoritative high-level execution guide for future scene-system work.

It intentionally focuses on:

* implementation maturity
* strategic direction
* execution ordering
* scope boundaries

rather than low-level API contracts.

---

# Current Architectural Position

Libration is no longer:

* a fixed world-map renderer
* a hardcoded map scene
* a small overlay system

It is now evolving into:

> A renderer-agnostic, projection-aware, time-aware, composable global scene platform.

The architecture now supports:

* explicit SceneConfig authority
* projection-aware scene composition
* curated base-map families
* ordered scene stacking
* static raster overlays
* derived overlays
* temporal raster-family resolution
* runtime raster-failure resilience
* future dynamic data expansion

The scene architecture is now considered structurally stable enough to support substantial future capability expansion.

---

# What Is Fully Implemented

## 1. SceneConfig Authority

Implemented:

* `SceneConfig` exists as the authoritative scene model
* runtime scene behavior is scene-driven
* ordered layer stack exists
* base map selection is scene-driven
* deterministic ordering exists
* legacy compatibility path remains but is no longer authoritative

Implemented concepts:

* `projectionId`
* `viewMode`
* `baseMap`
* `layers[]`
* user-controlled ordering

Status:

* COMPLETE

---

## 2. Base Map Registry and Selector System

Implemented:

* multiple curated base maps
* selector/editor integration
* preview support
* attribution support
* category support
* persistence
* runtime resolution

Implemented curated families:

* legacy/reference
* political
* topography

The selector now operates on:

* map families
* not hardcoded raster constants

Status:

* COMPLETE

---

## 3. Static Overlay System

Implemented:

* static raster overlays
* source-driven overlay construction
* overlay composition integration
* opacity support
* deterministic stacking

The overlay system now participates in:

* SceneConfig
* composition planning
* runtime layer realization

Status:

* COMPLETE

---

## 4. Derived Overlay System

Implemented:

* derived layer source model
* source-driven derived factory path
* deterministic derived overlays
* solar analemma ground-track layer

Derived overlays are:

* time-aware
* deterministic
* renderer-agnostic

NOT yet implemented:

* lifecycle manager
* live feed acquisition
* cache/versioning systems

Status:

* PARTIALLY COMPLETE

---

## 5. Temporal Base Map Families

Implemented:

* explicit `variantMode`

  * `static`
  * `monthOfYear`
* product-time-driven month resolution
* backward calendar lookback
* year rollover behavior
* family fallback assets
* explicit onboarded month metadata
* real month-aware topography family

Implemented runtime behavior:

* current month first
* backward month search
* wrap across year boundary
* family base fallback
* global default fallback

Status:

* COMPLETE

---

## 6. Runtime Raster Failure Recovery

Implemented:

* runtime failed-image exclusion tracking
* automatic fallback to prior valid month
* backend failure reporting without backend product ownership
* deterministic retry avoidance

Purpose:

* protect against missing shipped assets
* avoid permanent blank-map states
* preserve declarative resolver semantics

Status:

* COMPLETE

---

# What Is Intentionally Deferred

The following capabilities are intentionally NOT implemented yet.

This is deliberate.

---

## 1. Dynamic Lifecycle System

Planned:

* acquisition manager
* polling
* caching
* stale/ready/error states
* versioning/history
* external feed integration

Potential future datasets:

* weather
* aircraft
* satellite feeds
* earthquake feeds
* cloud cover
* gridded climate datasets

Status:

* SPECIFICATION ONLY

---

## 2. Advanced Projection System

Planned:

* Mercator
* Robinson
* Winkel Tripel
* Orthographic
* globe/perspective rendering

The architecture already preserves:

* projection authority
* projection/view separation

Runtime support does not yet exist.

Status:

* NOT STARTED

---

## 3. Scene View / Camera Evolution

Planned:

* zoom/pan
* clipping
* partial rendering
* tiling
* globe views
* camera navigation

Current mode:

* `fullWorldFixed`

Status:

* NOT STARTED

---

## 4. Advanced Composition

Planned:

* multiply blending
* screen blending
* additive blending
* masking
* clipping
* compositing constraints

Current behavior:

* deterministic ordering
* alpha compositing only

Status:

* NOT STARTED

---

# Major Future Product Programs

The following represent the major long-term feature programs established during scene-system planning.

These are intentionally grouped by strategic domain rather than by implementation file.

---

# Program A — Curated Scene Richness

This is now the recommended primary development direction.

Purpose:

* increase scene richness safely
* expand curated cartographic capability
* avoid premature lifecycle complexity

Potential additions:

* geology maps
* climate maps
* ocean current maps
* vegetation maps
* night-light maps
* atmospheric maps
* emissive/night substrate blending
* scientific overlays
* eclipse overlays
* solar/lunar path overlays

Recommended priority:

* HIGH

Risk level:

* LOW/MEDIUM

---

# Program B — Dynamic Data Infrastructure

Purpose:

* support continuously updating datasets
* support live feeds
* support large scientific datasets

Potential additions:

* weather
* aircraft
* AIS shipping
* radar
* cloud fields
* forecast playback

Requires:

* lifecycle manager
* acquisition policies
* caching/versioning
* time synchronization
* update scheduling

Recommended priority:

* MEDIUM

Risk level:

* HIGH

---

# Program C — Projection and Camera Evolution

Purpose:

* expand beyond fixed equirectangular world-strip rendering

Potential additions:

* alternate projections
* zoom/pan
* tiled rendering
* orthographic globe
* perspective globe

This is expected to become the most invasive future scene-system program.

Recommended priority:

* LOW for near-term

Risk level:

* VERY HIGH

---

# Program D — Atmospheric and Astronomical Composition

Purpose:

* deepen the “living planet” character of the scene

Potential additions:

* day/night substrate blending
* dynamic cloud illumination
* eclipse projection overlays
* twilight gradients
* aurora overlays
* seasonal environmental layers

This program is expected to strongly benefit from:

* temporal raster-family support
* future blending modes

Recommended priority:

* HIGH

Risk level:

* MEDIUM

---

# Current Recommended Development Order

The recommended future sequence is:

1. Curated scene richness
2. Atmospheric/emissive composition
3. Additional derived overlays
4. Dynamic lifecycle infrastructure
5. Projection/camera evolution

The reasoning is:

* current substrate architecture is now stable
* curated expansion delivers strong visible product value
* lifecycle/projection work remains substantially more dangerous

---

# Important Architectural Invariants

The following principles are now considered foundational and MUST be preserved.

---

## Projection Defines Spatial Truth

Maps do not define coordinates.

Projection math defines:

* spatial alignment
* coordinate placement
* overlay agreement

All layers must conform to the active projection.

---

## SceneConfig Is Authoritative

Runtime scene behavior must continue to flow from:

* SceneConfig
* normalized configuration
* ordered layer composition

Hardcoded scene assumptions must not return.

---

## Rendering Must Remain Renderer-Agnostic

Backends:

* execute resolved intent
* do not own product semantics
* do not choose behavior

Scene semantics belong upstream.

---

## Base Maps Are Data Families, Not Just Images

Base maps are now treated as:

* structured scene substrates
* curated map families
* potentially temporal assets

This must remain explicit.

---

## Lifecycle Must Remain Separate From Rendering

Rendering must remain:

* deterministic
* side-effect free
* declarative

Future acquisition systems must not leak into rendering execution.

---

# Important Realizations From This Development Phase

The following architectural realizations emerged during implementation and should not be forgotten.

---

## 1. Curated substrate quality matters enormously

Low-noise, overlay-friendly cartography is preferable to decorative maps.

Libration’s visual identity is converging toward:

* instrumentation
* scientific visualization
* compositional restraint

rather than:

* atlas aesthetics
* decorative cartography

---

## 2. Terrain and political maps are fundamentally different pipelines

Terrain:

* sourced raster/scientific imagery

Political:

* generated cartography/styled exports

These should continue to be treated as different onboarding workflows.

---

## 3. Temporal map families are a major capability multiplier

Temporal raster-family support now enables future:

* seasonal maps
* snow coverage
* vegetation cycles
* environmental transitions
* climate datasets

without changing SceneConfig semantics.

---

## 4. Runtime resilience matters

Registry declarations alone are insufficient.

The product must tolerate:

* missing assets
* partial deployments
* broken image paths

without collapsing scene rendering.

The raster exclusion fallback mechanism now addresses this.

---

# Recommended Near-Term Development Targets

The strongest near-term targets are now:

1. Geology map onboarding
2. Additional curated map families
3. Night/emissive substrate experimentation
4. Atmospheric overlays
5. Additional astronomical overlays
6. Overlay readability refinement
7. Derived environmental layers

These can substantially improve the product while staying within the now-stable scene architecture.

---

# Deliberate Non-Goals For Near-Term Work

Avoid near-term expansion into:

* projection switching
* zoom/pan
* tiling
* live feed infrastructure
* complex acquisition systems
* backend specialization

until curated-scene maturity is stronger.

---

# Final Current Position

Libration now possesses:

* a stable scene architecture
* renderer-agnostic scene composition
* projection-aware design boundaries
* curated map-family infrastructure
* temporal raster-family capability
* deterministic overlay composition
* robust base-map runtime resolution

The project is now positioned to evolve from:

> “a configurable world-time visualization”

into:

> “a composable, time-aware, projection-aware global scene platform.”
