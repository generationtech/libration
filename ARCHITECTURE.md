# Architecture

## Architectural Intent

libration is a precision-rendered world time instrument built on a **render-plan-driven architecture**.

All visual output is expressed as explicit render intent (RenderPlan) before backend execution.

Core goals:
- Renderer-agnostic rendering semantics
- Deterministic visual output
- Strict separation of concerns
- High perceptual fidelity
- Future multi-backend support (Canvas, GPU)

---

## Top-Level Subsystems

### 1. App Shell
Owns:
- UI state
- preset selection
- config lifecycle
- render loop orchestration

Produces:
- SceneRenderInput

---

### 2. Core Model
Pure domain logic:
- time context
- solar/lunar math
- projection

Renderer-agnostic and deterministic.

---

### 3. RenderPlan System (CORE)

All rendering flows through:

**Plan Builders → RenderPlan → Executor**

#### Responsibilities

| Layer | Responsibility |
|------|--------------|
| Plan Builders | Resolve geometry, styling, ordering |
| RenderPlan | Declarative render intent |
| Executor | Mechanical drawing only |

---

### RenderPlan Primitives

- rect
- line
- text (fill + optional stroke/shadow)
- path2d (+ optional clip: Path2D or descriptor payload)
- linearGradientRect
- radialGradientFill
- rasterPatch (generated RGBA)
- imageBlit (URL-backed image)

Key distinction:
- rasterPatch = computed pixels
- imageBlit = external asset reference

---

### 4. Renderer Backend

CanvasRenderBackend owns:
- DPR setup
- clearing
- layer dispatch
- image lifecycle (load/cache/repaint)

It MUST NOT:
- contain product semantics
- decide geometry or layout

---

### 5. Display Chrome (NON-LAYER)

- top instrument band
- lower overlay

Rendered via RenderPlan but orchestrated outside the layer system.

---

### 6. Layer System

Each layer:
- pure function of time + config
- produces renderable state
- feeds plan builders

---

## Rendering Flow

1. App builds SceneRenderInput
2. Layers resolve state
3. Plan builders emit RenderPlans
4. Executor renders primitives
5. Chrome rendered in second pass

---

## Boundary Rules

Strict separation:
- UI
- Layers
- RenderPlan builders
- Backend execution
- Resource lifecycle

---

## Architectural Status

Renderer-agnostic preparation is **COMPLETE**.

All major rendering categories:
- chrome
- vector overlays
- text overlays
- markers
- raster overlays
- base map

are now RenderPlan-driven.

Future work builds on this foundation.
