# Project strategy

This document owns Libration's **product intent**: what the project is trying to become, what it is deliberately not trying to become, and how future feature work should be judged.

It contains no implementation status and no scheduling. For what exists today see [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md); for the boundaries that intent must respect see [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## Product thesis

Libration is a precision world time instrument evolving into a scientifically grounded planetary scene instrument, not a decorative map.

Its differentiating ideas:

- longitude-first structure;
- continuous global time visualization;
- one canonical UTC instant per frame;
- reference-frame civil presentation;
- renderer-agnostic architecture;
- a composable projection-space scene;
- planetary illumination and composition;
- local-first use;
- a public, inspectable, user-freedom-preserving implementation.

## Positioning

Libration should feel like an instrument: stable, legible, precise, calm, deliberate, and configurable without becoming chaotic.

The product may gain many scene layers and visual modes over time. The core display must remain understandable regardless.

## Independence and differentiation

Libration is independently developed and is not affiliated with any existing commercial time-map product.

The project should retain general world-time-map utility while differentiating its implementation, architecture, visual language, and feature set. Useful directions:

- renderer-agnostic internals;
- an open AGPL reference implementation;
- explicit scene configuration and composable layers;
- curated scientific and cartographic map families, onboarded through the bundled catalog;
- the reference-frame time model;
- a modern top-band chrome visual language;
- planetary illumination and atmospheric composition;
- data overlays and playback;
- local-first power-user workflows.

Avoid cloning the look or the exact interaction patterns of existing commercial products.

## Open-source strategy

Libration is intended to be a serious public reference implementation. The AGPL supports inspection, modification, sharing, downstream freedom, and network-use reciprocity.

Documentation and architecture should stay clear enough that future contributors and future AI sessions can work safely without external context.

## Design principles

### 1. Time clarity over cleverness

Never confuse the canonical instant, the selected reference frame, and the visual presentation mode.

### 2. Spatial truth is projection truth

Maps are visual substrates. Projection mathematics and geographic coordinates define placement.

### 3. Instrument first, layer platform second

Layer richness matters, but it must not undermine the core time instrument.

### 4. Curated, not random

Map families and overlays are selected, sourced, validated, and named intentionally. Availability is not a reason to include something.

### 5. Configurable without mode chaos

Expose powerful controls through coherent axes — time and reference frame, chrome display, scene and map selection, layer composition, presets — rather than accumulating independent switches.

### 6. Future backends must remain possible

Canvas is the current backend. The architecture should keep a future GPU or bare-metal renderer plausible without a product-side rewrite.

### 7. Scientific grounding over arbitrary effects

Atmospheric transitions, twilight, planetary illumination, moonlight, and emissive city-light composition should emerge from real solar geometry, lunar geometry, physically-inspired attenuation, and coherent upstream composition policy.

Avoid arbitrary glow effects, backend-specific visual tricks, disconnected visual layers, and composition logic implemented inside backend execution.

### 8. Planetary composition over isolated overlays

The scene system is a coherent upstream illumination composition path, not a pile of unrelated overlays. Future work should **extend** that subsystem — readability policy, atmosphere, weather and clouds, dynamic composition — rather than adding parallel effects that do not participate in it.

Systems that affect appearance should participate coherently in atmospheric attenuation, reflected illumination, emissive illumination, visibility and readability policy, and dynamic scene composition.

### 9. Ambient display over astronomy-diagram clutter

The default map should remain beautiful and usable as an ambient display.

Astronomical features belong in one of three roles: **ambient** (suitable for continuous display), **explanatory** (optional geometry or information that explains why the scene looks as it does), or **event** (effects justified because something unusual is approaching or occurring). Event effects may be more visually expressive, but they must still be geometrically grounded — principle 7 is not suspended for drama.

Do not add large map-spanning geometry merely because it can be calculated. Large geographic effects should earn their visual footprint by communicating important geographic information. Prefer small decorations on existing geometry when possible.

Family-specific application: [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md#visual-design-principle).

## How work should be shaped

Product intent is delivered through narrow, coherent slices.

A good slice has a clear objective, changes one architectural area, has exit criteria, adds or updates tests, updates the documentation that owns the changed truth, and leaves the codebase cleaner than it found it.

A bad slice mixes unrelated UI, runtime, configuration, and documentation changes; moves product semantics into the backend; adds duplicate configuration surfaces; silently changes persisted semantics; or implements future capability by hardcoding special cases.

Execution mechanics — how a work item is defined, approved, verified, and closed — are owned by [`docs/WORKFLOW.md`](WORKFLOW.md).

## Decision filter for new features

Before implementing a feature, answer:

1. Does it strengthen the core world time instrument?
2. Does it belong in chrome, scene, config, lifecycle, or backend?
3. Does it preserve the `RenderPlan` separation?
4. Does it preserve projection correctness?
5. Does it need durable configuration, or is it derived?
6. Does it need documentation and tests now?
7. Is it appropriately sized?

If the answer is unclear, write a planning document or an implementation intent before editing.
