# Layer Engine Specification

## Purpose

Define a uniform model for map and globe **scene** content in Libration.

Scene content rendered in projection space should be expressed as a layer wherever practical, including:
- base map
- day/night shading
- pins/locations
- satellite paths
- weather overlays
- future data-driven elements

**Fixed display chrome** (appliance-style header/footer bands, tick rails, non-map HUD) is intentionally **outside** this model: it is screen-anchored, not projection-anchored, and is composed in a **separate render pass** after the scene (`buildDisplayChromeState` / `renderDisplayChrome` in `src/renderer/displayChrome.ts`).

---

## Architectural Context (UPDATED)

The layer system does **not render directly**.

It participates in a larger rendering pipeline:

Layer → LayerState → RenderPlan Builder → RenderPlan → Executor → Backend

```mermaid
flowchart LR
    L[Layer] --> LS[LayerState]
    LS --> PB[RenderPlan Builder]
    PB --> RP[RenderPlan]
    RP --> EX[Executor]
    EX --> BE[Backend]

    classDef upstream fill:#1f2933,stroke:#6b8fb3,color:#e6edf3;
    classDef boundary fill:#0b1f2a,stroke:#00bcd4,stroke-width:3px,color:#e6edf3;
    classDef downstream fill:#1f2933,stroke:#4b5563,color:#cbd5e1;

    class L,LS,PB upstream;
    class RP boundary;
    class EX,BE downstream;
```

Layers feed render intent into the system; execution happens only after all semantics are resolved.

### Responsibilities

| Stage | Responsibility |
|------|---------------|
| Layer | Provides time-resolved scene data (LayerState) |
| RenderPlan Builder | Converts LayerState → explicit render intent |
| RenderPlan | Declarative list of primitives (no semantics) |
| Executor | Mechanical drawing of primitives |
| Backend | Surface setup, resource lifecycle, dispatch |

### Critical Rule

> Layers describe **what exists in the scene**, not **how it is drawn**.

> All rendering semantics must be resolved **before** execution (in RenderPlan builders).

The backend must never infer:
- layout
- geometry
- ordering semantics
- visual meaning

---

## Core Principles

1. All **scene / projection-space** visual features are layers (screen-fixed chrome excepted; see Purpose)
2. Layers are renderer-agnostic
3. Layers do not fetch external data directly
4. Layers describe *what exists*, not *how it is rendered*
5. Rendering semantics are resolved **outside the layer**, in plan builders

---

## Layer Definition

A layer is a structured object with:

- identity
- lifecycle state
- render data
- update behavior
- composition metadata

### Required Properties

```ts
type LayerId = string;

interface Layer {
  id: LayerId;
  name: string;

  enabled: boolean;

  zIndex: number;

  type: LayerType;

  updatePolicy: UpdatePolicy;

  getState(time: TimeContext): LayerState;
}
```

---

## Layer Types

As implemented in `src/layers/types.ts`:

```ts
type LayerType =
  | "raster"
  | "vector"
  | "points"
  | "tracks"
  | "heatmap"
  | "text"
  | "illumination";
```

- **illumination** — shading driven by solar geometry (not a texture)

---

## Time Context

```ts
interface TimeContext {
  now: number;
  deltaMs: number;
  simulated: boolean;
}
```

---

## Layer State

```ts
interface LayerState {
  visible: boolean;
  opacity: number;
  data: unknown;
  metadata?: Record<string, unknown>;
}
```

### Important

- Renderer must not call back into the layer
- Layer must provide all data required for rendering
- Data must be interpreted **only by plan builders**

---

## Update Policy

```ts
type UpdatePolicy =
  | { type: "perFrame" }
  | { type: "interval"; intervalMs: number }
  | { type: "onDemand" };
```

---

## Layer Lifecycle

```mermaid
flowchart LR
    C[Created] --> R[Registered]
    R --> E[Enabled Or Disabled]
    E --> U[Updated]
    U --> Q[Queried For State]

    classDef node fill:#16212b,stroke:#8aa4c8,color:#e6edf3;
    class C,R,E,U,Q node;
```

1. Created  
2. Registered  
3. Enabled / disabled  
4. Updated  
5. Queried for state  

---

## Layer Registry

Central manager for all layers.

Responsibilities:
- register/unregister layers
- maintain z-order
- filter enabled layers
- trigger updates
- provide ordered states

```ts
interface LayerRegistry {
  register(layer: Layer): void;
  unregister(id: LayerId): void;

  getLayers(): Layer[];

  getActiveLayers(): Layer[];

  update(time: TimeContext): void;

  getRenderableState(time: TimeContext): LayerState[];
}
```

---

## Composition Rules

- Layers sorted by `zIndex`
- Higher `zIndex` renders on top
- Disabled layers skipped
- Opacity applied per layer
- Blending handled during execution

---

## RenderPlan Integration (NEW)

The layer system feeds into RenderPlan builders.

### Key Point

> Layers do not produce render primitives.

Instead:

LayerState → RenderPlan Builder → RenderPlan primitives

```mermaid
flowchart LR
    LS[LayerState] --> PB[RenderPlan Builder]
    PB --> RP[RenderPlan Primitives]

    classDef upstream fill:#16212b,stroke:#8aa4c8,color:#e6edf3;
    classDef boundary fill:#0b1f2a,stroke:#00bcd4,stroke-width:3px,color:#e6edf3;

    class LS,PB upstream;
    class RP boundary;
```

### RenderPlan Primitive Types (reference)

- rect
- line
- text (fill + optional stroke/shadow)
- path2d (+ optional clip payload: Path2D or descriptor)
- linearGradientRect
- radialGradientFill
- rasterPatch (generated RGBA)
- imageBlit (external image)

### Important Distinction

| Type | Meaning |
|------|--------|
| rasterPatch | Generated pixel buffer |
| imageBlit | URL-backed image |

---

## Separation of Concerns

| Concern            | Responsibility        |
|-------------------|---------------------|
| Data retrieval     | data subsystem       |
| State calculation  | layer                |
| Render intent      | plan builder         |
| Drawing            | executor             |
| Ordering           | layer registry       |
| Resource lifecycle | backend              |

---

## Implemented Layer Set

- Raster — base map
- Illumination — solar shading
- Vector — lat/lon grid
- Points — city pins, solar/lunar markers
- Text — optional overlays

---

## Configuration

- Controlled via `AppConfig`
- Presets defined in `displayPresets.ts`
- Registry built via `createLayerRegistryFromConfig`

Layers remain unaware of:
- presets
- UI
- renderer details

---

## Non-Goals

- no cross-layer dependencies
- no inter-layer communication
- no renderer access from layers
- no animation logic inside layers

---

## Future Extensions

- streaming data layers
- GPU-driven layers
- adaptive updates

---

## Key Rule

If a **scene feature** cannot be expressed as a layer, it should be questioned.

Exception:
- screen-fixed chrome (instrument UI) lives outside the layer system

---

## Status

The layer system is **stable and aligned with the RenderPlan architecture**.

All active scene layers now:
- produce LayerState
- are transformed into RenderPlans
- are executed without backend interpretation
