# Projection System Specification


## Base Map Families and Projection Compatibility

Base-map families, including month-aware families, remain subject to the active projection contract.

For the current implementation:

- all static and month-aware base-map rasters must be equirectangular full-world assets
- all monthly variants in a family must share the same projection, extent, dimensions, and alignment expectations
- temporal variation changes visual content only; it must not alter spatial mapping

Projection remains spatial truth. Month-aware map switching is asset selection within the same projection, not a projection or scene-view change.

---

## Purpose

Define the projection system for Libration as a first-class, explicit architectural component.

The projection system is responsible for transforming geographic coordinates (latitude, longitude) into scene-space coordinates used for rendering.

This document establishes:
- the projection contract
- current supported behavior
- constraints on all scene layers
- forward compatibility with additional projections and view modes

---

## Core Principle

> Projection defines spatial truth.  
> All scene elements must conform to the active projection.

Maps, overlays, and annotations do not define position — the projection does.

---

## Projection Contract

A projection implementation must provide:

### Forward mapping

```ts
project(lat: number, lon: number): { x: number; y: number }
```

- Converts geographic coordinates to normalized scene coordinates
- Output coordinates are relative to the active scene view

---

### Optional inverse mapping

```ts
unproject(x: number, y: number): { lat: number; lon: number }
```

- Used for interaction features (hover, click, inspection)
- Not required for v1 but should be anticipated

---

### Bounds definition

```ts
getBounds(): {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}
```

Defines valid geographic coverage for the projection.

---

### Projection identity

```ts
type ProjectionId = string
```

Examples:
- "equirectangular"
- "mercator"
- "robinson"
- "winkelTripel"
- "orthographic"

---

## Current Implementation (v1)

### Supported projection

- `equirectangular` (Plate Carrée)

### Characteristics

- linear mapping of longitude to x
- linear mapping of latitude to y
- full-world rectangular coverage
- simple, distortion-prone but computationally stable

---

## Scene Integration

The projection is used by:

- all layer plan builders
- all coordinate transformations
- scene alignment logic

Projection must be injected into:
- layer rendering logic (not hardcoded)
- coordinate conversion utilities

---

## Invariants

All layers must:

- define geometry in geographic coordinates
- use the active projection for mapping
- assume consistent projection across all layers

Violation of these invariants will cause:
- misalignment
- distortion mismatch
- visual artifacts

---

## Map Asset Compatibility

All base maps must:

- match the active projection
- align exactly with projection bounds
- use consistent orientation (north-up)
- cover expected geographic extent

For v1:
- all base maps must be equirectangular full-world assets

---

## Future Projection Support

The system must support adding projections without architectural rewrites.

### Planned projections

- Mercator
- Robinson
- Winkel Tripel
- Orthographic

Each projection may introduce:
- distortion differences
- clipping behavior
- edge handling differences

---

## Projection vs Scene View

Projection defines:
- how coordinates map to space

Scene View defines:
- what portion of that space is visible

These must remain separate concepts.

---

## Edge Handling

Future projections may require:

- longitude wrapping rules
- polar clipping behavior
- discontinuity handling (e.g., dateline)

These are not required in v1 but must not be blocked by current design.

---

## Performance Considerations

Projection functions must be:

- deterministic
- fast (called frequently per frame)
- stateless or minimally stateful

Future:
- vectorized computation
- GPU acceleration

---

## Interaction Considerations (future)

Inverse projection enables:

- click → lat/lon
- hover inspection
- selection tools

This should be planned even if not implemented immediately.

---

## Non-Goals (v1)

- runtime projection switching
- globe rendering
- perspective distortion
- projection blending

---

## Summary

The Projection System:

- defines spatial truth for the entire scene
- ensures all layers align consistently
- abstracts coordinate transformation logic
- enables future support for multiple projections without rewriting core systems

It is a foundational system that must remain clean, centralized, and strictly separated from rendering logic.


# ADDITIONS (v2.1)

## Clarifying Invariants (Added)

The following must always hold:

1. A single active projection is applied to all scene layers.
2. All layer geometry is defined in geographic coordinates (lat/lon), never pre-projected.
3. Projection is applied centrally, not re-implemented in individual planners.
4. Map assets must be validated against the active projection and never override it.

---

## Anti-Patterns to Avoid (Added)

Future implementations MUST NOT:

- Inline projection math inside individual layer planners
- Allow layers to apply their own projection logic
- Accept map assets that “almost align” visually
- Mix projected and unprojected coordinate systems

These patterns will lead to subtle but compounding alignment errors.

---

## Projection Injection Requirement (Strengthened)

All systems that require coordinate mapping must receive projection through:

- dependency injection
- context propagation
- or a shared projection service

Hardcoding projection logic anywhere is considered a defect.

---

## Future Expansion Guidance (Added)

When adding new projections:

Each implementation must explicitly define:

- distortion characteristics
- valid geographic domain
- edge behavior (wrap, clip, discontinuity)
- compatibility with SceneView modes

Do NOT assume:
- all projections are rectangular
- all projections support full-world visibility
- lat/lon mapping remains linear

---

## Debug / Validation Hooks (Recommended)

Future system should support:

- debug overlay grid (lat/lon)
- projection visualizer layer
- known-point validation (cities, poles, meridians)

These are critical for verifying new projections.

---

## Why This Matters (Added)

Projection is the **single point of spatial truth**.

If this contract is violated:

- overlays will drift
- layers will misalign
- visual correctness will degrade silently

This system must remain **centralized, explicit, and enforced**.

---

