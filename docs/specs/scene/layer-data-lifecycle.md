# Layer Data Lifecycle Specification


## Current Relationship to Base Map Asset Loading

Month-aware base-map resolution and base-map image-load failure recovery are not the full dynamic data lifecycle system.

They are intentionally narrow static-asset resilience mechanisms:

- the bundled catalog declares available static/month-aware assets
- resolver chooses a concrete raster from product time
- backend may report concrete image-load failure
- resolver excludes known-failed URLs and chooses the next fallback

This does not introduce live feeds, polling, caching policy, lifecycle state machines, or external acquisition. Those remain future lifecycle work.

---

## Purpose

Define how scene layers acquire, update, cache, and expose data over time.

This document establishes a forward-compatible lifecycle model for:

- static assets
- derived layers
- gridded scientific datasets
- live feeds (weather, aircraft, etc.)

It ensures that data handling is **separate from rendering**, while remaining compatible with the existing:

Layer → LayerState → RenderPlan → Backend pipeline.

---

## Core Principle

> Data lifecycle is independent of rendering.

- Layers **do not fetch data directly during rendering**
- Layers consume **prepared, versioned data snapshots**
- Rendering remains deterministic and side-effect free

---

## Lifecycle Stages

Each layer’s data passes through:

1. **Source Definition**
2. **Acquisition**
3. **Normalization**
4. **Caching**
5. **State Exposure**
6. **Rendering**

---

## Lifecycle Model

```ts
type LayerDataLifecycle = {
  source: LayerSourceConfig

  acquisition: AcquisitionConfig
  cache: CachePolicy

  stateVersioning: StateVersioningPolicy
}
```

---

## Acquisition Config

```ts
type AcquisitionConfig =
  | { type: "static" }
  | { type: "derived" }
  | { type: "interval"; intervalMs: number }
  | { type: "eventDriven" }
```

### Semantics

- `static`
  - packaged assets, no updates
- `derived`
  - computed from time or internal models
- `interval`
  - polling external or internal sources
- `eventDriven`
  - updates triggered externally

---

## Cache Policy

```ts
type CachePolicy = {
  ttlMs?: number
  maxEntries?: number
  strategy?: "replace" | "merge" | "append"
}
```

### Semantics

- controls memory usage
- defines staleness tolerance
- prepares for live and forecast data

---

## State Versioning

```ts
type StateVersioningPolicy = {
  versioned: boolean
  keepHistory?: boolean
  maxHistoryEntries?: number
}
```

### Purpose

Supports:
- playback
- time scrubbing
- historical comparison

---

## Data States

A layer may have:

```ts
type LayerDataState =
  | { status: "loading" }
  | { status: "ready"; version: number; data: unknown }
  | { status: "stale"; version: number; data: unknown }
  | { status: "error"; error: string }
```

### Rendering Behavior

- `loading`: may render placeholder or nothing
- `ready`: render normally
- `stale`: render with optional indication
- `error`: suppress or fallback

---

## Update Flow

1. Source defined in SceneConfig
2. Lifecycle manager acquires data
3. Data normalized into internal format
4. Cached according to policy
5. LayerState consumes latest valid snapshot
6. RenderPlan built from LayerState

---

## Derived Layers

Derived layers use:

```ts
type DerivedSource = {
  kind: "derived"
  dependencies?: string[]
}
```

Examples:
- solar terminator
- eclipse paths
- analemma

### Characteristics

- deterministic
- driven by time context
- no external fetch required

---

## Gridded Dataset Layers

Examples:
- temperature
- precipitation
- cloud cover

### Characteristics

- structured data grids
- may be large
- often time-indexed

Future considerations:
- downsampling
- tiling
- level-of-detail

---

## Live Feed Layers

Examples:
- aircraft positions
- ship tracking

### Characteristics

- high update frequency
- partial-world coverage
- large dynamic datasets

Requires:
- efficient diffing
- pruning strategies
- bounded memory growth

---

## Failure Handling

Rules:

- never crash rendering pipeline
- fallback to last known valid state
- surface error state for UI/debug

---

## Performance Considerations

Future requirements:

- async acquisition
- background processing
- batching updates
- partial redraw triggers

---

## Relationship to SceneConfig

SceneConfig defines:
- what layer exists
- what source it uses

Lifecycle system defines:
- how that source produces data over time

---

## Non-Goals (v1)

- full networking implementation
- real-time streaming engine
- tile streaming
- GPU data pipelines

---

## Summary

The Layer Data Lifecycle system:

- separates data acquisition from rendering
- supports static, derived, and dynamic layers
- enables future features like live feeds and time playback
- ensures robustness and scalability

It is essential for evolving Libration into a real-time, data-driven global scene system.



---

# ADDITIONS (v2.1)

## Critical Invariants (Added)

The following MUST always hold:

1. Rendering must NEVER trigger data acquisition.
2. Data acquisition must NEVER block rendering.
3. LayerState must always represent a **fully resolved snapshot**, not a promise.
4. All data entering rendering must be normalized and validated.
5. Data lifecycle must be deterministic given the same inputs and time.

---

## Separation of Concerns (Strengthened)

Explicitly enforce:

| Responsibility | Owned By |
|------|--------|
| Data fetching | Lifecycle system |
| Data transformation | Lifecycle system |
| Data storage | Cache layer |
| Scene composition | Scene system |
| Rendering | RenderPlan + backend |

No layer should bypass this separation.

---

## Anti-Patterns to Avoid (Added)

Future implementations MUST NOT:

- fetch network data inside layer planners
- embed async logic inside RenderPlan generation
- mix raw/unvalidated data with normalized data
- allow unbounded growth of live datasets
- depend on timing side-effects for correctness

---

## Data Snapshot Model (Clarified)

Rendering consumes:

```ts
type DataSnapshot = {
  version: number
  timestamp: number
  data: unknown
}
```

Key properties:
- immutable once produced
- versioned
- safe to reuse across frames

---

## Staleness Handling (Added)

Explicit behavior for stale data:

- stale data is still renderable
- must be marked as stale internally
- UI may optionally reflect staleness (future)

Never discard last valid data unless explicitly invalidated.

---

## Backpressure & Rate Control (Added)

For high-frequency sources (e.g. aircraft):

System should support:

- throttling acquisition
- dropping intermediate updates
- prioritizing most recent state

Prevents:
- UI lag
- memory explosion

---

## Partial Data Handling (Added)

For partial-world datasets:

- must define geographic bounds
- rendering must clip appropriately
- missing regions must not produce artifacts

---

## Time Coupling (Added)

Lifecycle must be aware of global time context:

- derived layers depend directly on time
- gridded datasets may depend on model run time
- live feeds depend on wall-clock time

Time must be injected, not globally assumed.

---

## Error Isolation (Strengthened)

- failure in one layer must not affect others
- errors must be contained and observable
- system should degrade gracefully

---

## Debug / Observability Hooks (Recommended)

System should expose:

- current data version per layer
- last update timestamp
- data status (loading/ready/stale/error)
- acquisition latency metrics

These are essential for debugging dynamic layers.

---

## Why This Matters (Added)

Without a strict lifecycle model:

- rendering becomes nondeterministic
- performance degrades unpredictably
- dynamic layers become unstable
- debugging becomes extremely difficult

This system is what allows Libration to safely evolve into a **real-time, data-driven visualization platform**.

