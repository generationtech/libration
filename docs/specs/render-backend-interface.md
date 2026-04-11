# Render Backend Interface Specification

## Purpose

Define the contract between the libration rendering pipeline and the rendering backend.

The backend is responsible for executing a fully-resolved render plan and producing a composed frame. It must not own layer logic, render semantics, or scene modeling.

This specification exists to keep rendering replaceable.

---

## Core Principles (UPDATED)

1. The backend consumes **RenderPlans**, not raw layer semantics
2. The backend does not query external data sources
3. The backend does not interpret layer data
4. The backend is replaceable
5. The backend is responsible for surface management, compositing, and frame output

---

## Architectural Role (UPDATED)

The rendering pipeline is:

Layer → LayerState → RenderPlan Builders → RenderPlan → Executor → Backend

The backend receives:
- frame timing information
- viewport information
- ordered render plans (derived from layers + chrome)
- scene-level visual context

The backend produces:
- a fully composed frame

The application shell is responsible for invoking `render` on a steady cadence.

---

## Responsibilities

The backend is responsible for:

- initializing rendering resources
- managing render surface size
- clearing and preparing each frame
- executing RenderPlan primitives (via executor)
- applying opacity/blending/compositing
- managing renderer-specific resource lifecycle (e.g. images)

The backend must NOT:
- resolve layout
- decide geometry
- interpret layer semantics
- implement product behavior

---

## Frame Context

```ts
interface FrameContext {
  frameNumber: number;
  now: number;
  deltaMs: number;
}
```

---

## Viewport

```ts
interface Viewport {
  width: number;
  height: number;
  devicePixelRatio: number;
}
```

---

## Scene Render Input (UPDATED ROLE)

```ts
interface SceneRenderInput {
  frame: FrameContext;
  viewport: Viewport;
  layers: RenderableLayerState[];
  scene: SceneVisualContext;
}
```

### Important

`SceneRenderInput` feeds **plan builders**, not the backend directly.

RenderableLayerState is NOT drawn directly by the backend.

---

## Renderable Layer State

```ts
type LayerId = string;

type LayerType =
  | "raster"
  | "vector"
  | "points"
  | "tracks"
  | "heatmap"
  | "text"
  | "illumination";

interface RenderableLayerState {
  id: LayerId;
  name: string;
  type: LayerType;
  zIndex: number;
  visible: boolean;
  opacity: number;
  data: unknown;
  metadata?: Record<string, unknown>;
}
```

### Clarification

This structure exists only to:
- provide data to plan builders
- preserve ordering and visibility

It must not be interpreted directly by the backend.

---

## RenderPlan (NEW CORE CONCEPT)

A RenderPlan is a declarative list of primitives.

Examples:
- rect
- line
- text
- path2d
- gradients
- rasterPatch (generated pixels)
- imageBlit (external images)

The backend executes these primitives mechanically.

---

## Executor Role

The executor:
- consumes RenderPlan
- maps primitives to drawing operations
- contains no product semantics

The backend calls the executor but does not augment behavior.

---

## Renderer Interface

```ts
interface RenderBackend {
  initialize(viewport: Viewport): Promise<void>;
  resize(viewport: Viewport): void;
  render(input: SceneRenderInput): void;
  dispose(): void;
}
```

---

## Lifecycle

1. create backend
2. initialize
3. render frames (caller-driven)
4. resize
5. dispose

---

## Error Handling

- fail fast on initialization
- log per-layer failures where possible
- avoid full app crash for recoverable issues

---

## Rendering Order

- determined upstream (layer zIndex + chrome order)
- backend executes in given order
- applies opacity/blending only

---

## Performance Rules

Backend should support:
- continuous rendering
- large displays
- smooth animation

Optimization is backend-specific and must not change plan semantics.

---

## Current Backend

Implemented: CanvasRenderBackend

Responsibilities:
- DPR transform
- clearing
- resource lifecycle (image loading)
- invoking executor

All scene semantics are resolved upstream.

Chrome remains a separate pass (intentional product boundary).

---

## Future Backends

Possible:
- WebGL
- WebGPU
- native GPU

All must consume RenderPlan without semantic divergence.

---

## Boundary Rule

The backend executes rendering.

It must never become the place where product behavior is defined.
