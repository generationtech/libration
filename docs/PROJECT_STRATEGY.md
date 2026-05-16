# Project Strategy

## Purpose

This document captures the product and project strategy for Libration.

It explains what the project is trying to become, what it is not trying to become, and how future feature work should be judged.

## Product thesis

Libration is a precision world time instrument evolving into a scientifically grounded planetary scene instrument, not merely a decorative map.

Its differentiating ideas are:

- longitude-first structure.
- continuous global time visualization.
- canonical UTC instant per frame.
- reference-frame civil presentation.
- renderer-agnostic architecture.
- composable projection-space scene.
- planetary illumination and composition.
- local-first desktop use.
- public, inspectable, user-freedom-preserving implementation.

## Product positioning

Libration should feel like an instrument:

- stable.
- legible.
- precise.
- calm.
- deliberate.
- configurable without becoming chaotic.

The product may gain many scene layers and visual modes over time, but the core display must remain understandable.

## Independence and differentiation

Libration is independently developed.

The project should retain general world-time-map utility while differentiating its implementation, architecture, visual language, and feature set.

Useful differentiation directions:

- renderer-agnostic internals.
- open AGPL reference implementation.
- explicit SceneConfig and composable layers.
- curated scientific and cartographic map families.
- reference-frame time model.
- modern top-band chrome visual language.
- planetary illumination and atmospheric composition.
- future data overlays and playback features.
- local-first power-user workflows.

Avoid cloning the look or exact interaction patterns of existing commercial products.

## Open source strategy

Libration is intended to be a serious public reference implementation.

The AGPL license supports:

- user inspection.
- modification.
- sharing.
- downstream freedom.
- network-use reciprocity.

The project should keep docs, rules, and architecture clear enough that future contributors and future AI sessions can work safely.

## Product design principles

### 1. Time clarity over cleverness

The product must never confuse the canonical instant, the selected reference frame, and the visual presentation mode.

### 2. Spatial truth is projection truth

Maps are visual substrates. Projection math and geographic coordinates define placement.

### 3. Instrument first, layer platform second

Layer richness matters, but it must not undermine the core time instrument.

### 4. Curated, not random

Map families and overlays should be selected, sourced, validated, and named intentionally.

### 5. Configurable without mode chaos

Expose powerful controls through coherent axes:

- time and reference frame.
- chrome display.
- scene and map selection.
- layer composition.
- presets when implemented.

### 6. Future backends must remain possible

Canvas is the current backend. The architecture should keep a future GPU or bare-metal renderer plausible.

### 7. Scientific grounding over arbitrary effects

Atmospheric transitions, twilight behavior, planetary illumination, **moonlight, and emissive city-light composition** should emerge from:

- real solar geometry.
- lunar geometry.
- physically-inspired attenuation.
- coherent upstream composition policy.

Further refinement (**readability extensions after** shipped v1 + v1.1 + derived substrate lift + **substrate heuristic increments** (catalog `reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense`, sub-1 brightness dimming) + presentation scalars + **six default-stack `perLayer` pilots**, clouds/weather, scattering) **extends** this upstream model rather than replacing it with backend-owned effects.

Avoid:

- arbitrary glow effects.
- backend-specific visual tricks.
- disconnected visual layers.
- composition logic implemented inside backend execution.

### 8. Planetary composition over isolated overlays

The scene system includes a **coherent upstream planetary illumination composition path** (solar, twilight, moonlight, optional emissive night lights → one `rasterPatch`), not merely a pile of unrelated overlays.

Future work **extends** that subsystem for readability policy **beyond the shipped global presentation + six default `perLayer` keys + substrate heuristic increments** (`reliefShaded`, `boundaryDense`, `chromaticDense`, `bathymetryShaded`, `fineScaleTexture`, `labelDense`, `etchedReliefDense`, `sunGlintDense`, presentation dimming in lift), atmosphere, and (when lifecycle exists) weather and clouds. Systems should participate coherently in:

- atmospheric attenuation.
- reflected illumination.
- emissive illumination.
- visibility/readability policy.
- weather/cloud participation.
- dynamic scene composition.

## Development strategy

The project should evolve through phase-scoped slices.

A good phase:

- has a clear objective.
- updates one architectural area at a time.
- has exit criteria.
- adds or updates tests.
- updates docs.
- leaves the codebase cleaner than it found it.

A bad phase:

- mixes unrelated UI, runtime, config, and docs changes.
- moves product semantics into the backend.
- adds duplicate config surfaces.
- silently changes persisted semantics.
- implements future capability by hardcoding special cases.

## Current strategic position

The project has passed the initial foundation threshold.

Foundational systems now exist:

- RenderPlan pipeline.
- Canvas backend boundary.
- structured chrome.
- SceneConfig.
- curated map catalog.
- map onboarding.
- static and derived overlays.
- month-aware map families.
- coherent upstream planetary illumination composition (twilight—including **shipped cumulative incremental transition tuning** in `illuminationShading.ts`—moonlight, emissive night lights; single illumination `rasterPatch`).
- composition-aware **overlay readability** (v1 + v1.1 + derived substrate lift + **substrate heuristic increments** (`reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense`, sub-1 effective brightness dimming in lift) + SceneConfig presentation scalars + **default-stack `perLayer` pilots** (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`): night veil + emissive policy + presentation/catalog lift + user veil/lift multipliers on selected overlays; optional **second** veil/lift pass per pilot layer via `scene.overlayReadability.perLayer`; one `OverlayReadabilityFrame` per tick on `TimeContext` when the shell attaches it).

The next strategic need is not another large hidden architecture migration. It is disciplined **incremental** work: readability extensions beyond the shipped **global presentation**, **six default-stack `scene.overlayReadability.perLayer` pilots** (canonical list: `SCENE_OVERLAY_READABILITY_PER_LAYER_PILOT_KEYS` in [`src/config/v2/sceneConfig.ts`](src/config/v2/sceneConfig.ts)), and **beyond** the **shipped eight-intrinsic** substrate catalog contract (`reliefShaded` … `sunGlintDense`, plus presentation/dimming via `overlayOptimized` / `darkFriendly` and sub-1 brightness in lift)—e.g. **`perLayer` tuning for stack rows beyond those six defaults**, **additional** optional catalog or resolver-only substrate signals (ninth+ intrinsic axes when product-defined), **further** atmospheric refinement **beyond** cumulative shipped twilight tuning in `illuminationShading.ts`, and (with lifecycle) cloud/weather participation—each scoped, tested, and documented.

## Strategic next frontiers

Likely next frontiers:

1. Documentation, rules, and co-engineering reliability (Phase 7 rolling hygiene; keep shipped vs future language aligned—for example the **eight-intrinsic** substrate overlay-lift contract through **`sunGlintDense`** is **shipped and doc-finalized**, not hypothetical; cumulative twilight tuning through the **second** narrow `illuminationShading.ts` pass is likewise **doc-finalized**).
2. Map inventory curation and selector polish.
3. Geology or other scientific substrate onboarding.
4. **Readability and composition extensions** (`perLayer` beyond the **six shipped** default-stack keys where product defines new rows; **further** substrate/catalog signals beyond `reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense` + dimming; **further** atmospheric refinement on the **existing** upstream illumination stack **after** cumulative shipped twilight tuning in `illuminationShading.ts`), and cloud/weather **planning** until dynamic lifecycle opens.
5. Dynamic data lifecycle.
6. Advanced scene view and projection work.
7. Preset system.
8. GPU backend exploration.

## Decision filter for new features

Before implementing a feature, answer:

1. Does it strengthen the core world time instrument?
2. Does it belong in chrome, scene, config, lifecycle, or backend?
3. Does it preserve RenderPlan separation?
4. Does it preserve projection correctness?
5. Does it need durable config, or is it derived?
6. Does it need docs and tests now?
7. Is it phase-sized?

If the answer is unclear, write a planning doc or implementation intent before editing.
