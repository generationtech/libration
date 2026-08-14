# 0001 — `RenderPlan` as the hard renderer boundary

- **Status:** Accepted
- **Date:** 2026-08-14 (record written during documentation modernization; the decision itself predates it and is visible throughout `src/renderer/`)

## Context

Libration's visual output is elaborate and precision-sensitive: a phased civil hour tape, structural longitude columns, procedural glyphs, curved text, projected overlays, and a computed planetary illumination field. All of that is currently drawn with the Canvas 2D API.

Canvas 2D is not obviously the permanent choice. A WebGL or WebGPU backend would be a reasonable future direction, and the product is described as renderer-agnostic in its identity, not merely as a Canvas application.

The naive arrangement — product code calling drawing APIs directly — would have made the drawing surface and the product's meaning inseparable. Everything the instrument knows would have had to be re-derived inside any second backend.

## Decision

All rendering intent is expressed as a `RenderPlan`: an ordered, backend-neutral list of primitives (`src/renderer/renderPlan/renderPlanTypes.ts`). Nine primitive kinds cover the product's needs: `text`, `curvedText`, `rect`, `line`, `path2d`, `linearGradientRect`, `radialGradientFill`, `rasterPatch`, and `imageBlit`.

The plan is the **only** thing a backend receives. Backends execute primitives in array order and are forbidden from inspecting product configuration to decide product behaviour.

Backend-specific work is confined to narrow bridges (`canvasTextFontBridge`, `canvasPaintBridge`, `canvasPathBridge`, font loading, raster caching).

## Consequences

**Good.**

- Rendering intent is testable without a canvas. This is how the product's geometry is actually verified — plan-level tests assert exact primitive geometry, and `LoggingRenderBackend` records plans instead of drawing. A large share of the test suite depends on this being possible.
- A second backend inherits correct behaviour instead of reimplementing it.
- "Where does this belong?" has a mechanical answer: if a backend would need to know it, it belongs upstream.

**Costs.**

- Every new visual capability must be expressible in the primitive set, or the primitive set must be extended deliberately. This is slower than reaching for a Canvas call.
- Some payloads have been transitional. Backend-native path objects have been permitted where descriptor-backed intent was not yet available; the direction is toward descriptors.
- Ordering must be fully resolved upstream, because the executor does not sort.

**Boundary-preserving exception.** Backends may report concrete resource events — an image URL failed to load, a font failed to register — because those are facts about the drawing surface rather than product decisions. Choosing what to do instead remains upstream. This distinction is load-bearing and is easy to erode; a backend that picks a fallback raster has crossed the boundary even though it looks like error handling.
