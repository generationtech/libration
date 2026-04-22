# Scene View / Camera

## Purpose
Define how the scene is viewed.

## Current Mode
- Full-world view
- No zoom/pan

## Future Modes
- Zoom / pan
- Globe view
- Perspective

## Separation
Projection ≠ Camera

Projection defines mapping.
Camera defines what portion is visible.



---

# ADDITIONS (v2.1)

## Expanded Purpose

The Scene View (Camera) system defines **how the projected world is framed, scaled, and navigated** within the scene viewport.

It is intentionally separated from Projection to ensure:

- projection math remains stable
- viewing behavior can evolve independently
- future features (zoom, globe, perspective) do not require rewriting projection logic

---

## Core Principle (Added)

> Projection answers: "Where is something?"  
> Scene View answers: "What part of that world are we looking at, and how?"

These must NEVER be conflated.

---

## Formal Concept

The Scene View represents a **mapping from projected world space → viewport space**.

Conceptually:

project(lat, lon) → world coordinates  
sceneView(world coordinates) → screen coordinates

---

## Scene View Contract (Proposed)

```ts
type SceneView = {
  mode: SceneViewMode

  // Future-facing
  center?: { lat: number; lon: number }
  zoom?: number

  // View bounds in projected space
  bounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}
```

NOTE:
- Only `mode` is required in v1
- Remaining fields are reserved for future expansion

---

## Current Mode (Clarified)

`"fullWorldFixed"`

Behavior:

- entire projected world is visible
- no panning
- no zooming
- world is stretched to fit scene viewport
- aspect ratio is preserved by projection rules

---

## Invariants (Added)

1. Scene View does NOT modify projection math
2. Scene View operates on already projected coordinates
3. All layers share the same Scene View
4. Scene View must be deterministic per frame

---

## Anti-Patterns to Avoid (Added)

Future implementations MUST NOT:

- embed projection logic inside camera/view logic
- allow layers to override camera behavior
- mix geographic coordinates directly with view transformations
- treat zoom as modifying projection instead of view

---

## Future Modes (Expanded)

### zoomPan2d

- allows arbitrary zoom levels
- supports panning across projected surface
- introduces need for:
  - clipping
  - partial rendering
  - potential tiling

---

### orthographicGlobe

- renders one hemisphere
- introduces curvature illusion
- requires:
  - clipping outside visible hemisphere
  - edge fading or hard cutoff

---

### perspectiveGlobe

- camera in 3D space viewing globe
- requires:
  - perspective projection
  - depth ordering
  - potential 3D math pipeline

---

## Interaction Implications (Added)

Scene View enables:

- zoom controls
- pan gestures
- click → lat/lon (with projection inverse)
- viewport-relative interactions

---

## Performance Implications (Added)

Future Scene View modes will require:

- selective rendering (not full-world always)
- level-of-detail systems
- tile-based data loading
- culling of off-screen data

---

## Relationship to Other Systems

### Projection System
- provides coordinate mapping
- Scene View consumes projection output

### Scene System
- applies Scene View to all layers
- ensures consistent framing

### Layer System
- must remain agnostic of camera details

---

## Why This Matters (Added)

Without this separation:

- zoom/pan would require rewriting projection math
- globe views would break layer alignment
- tiling would become impossible to integrate cleanly

This system is foundational for all future visual capabilities.

---

## Summary

The Scene View / Camera system:

- defines how the world is framed and viewed
- operates strictly after projection
- enables future navigation and rendering modes
- must remain separate from both projection and layer logic

