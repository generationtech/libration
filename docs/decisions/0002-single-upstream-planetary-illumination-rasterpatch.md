# 0002 — Planetary illumination composes upstream into one `rasterPatch`

- **Status:** Accepted
- **Date:** 2026-08-14 (record written during documentation modernization; the decision is visible in `src/renderer/illuminationShading.ts`, `src/renderer/emissiveIlluminationRaster.ts`, and the solar shading layer)

## Context

Libration renders several physically distinct illumination effects over the same globe:

- day/night attenuation from solar geometry;
- continuous twilight, with civil, nautical, and astronomical altitudes as semantic anchors;
- non-emissive atmospheric tint through the terminator;
- moonlight, varying with phase, lunar altitude, and surface incidence;
- emissive human-made night lights, sampled from a bundled radiance raster;
- optional cloud participation modulating the field.

The conventional graphics answer is a multi-pass compositor: one pass per effect, combined by blend modes in the backend. That would have required the backend to understand what each pass means, in what order effects combine, and how they interact — for example that moonlight and night lights must coexist without double-counting, and that atmospheric tint is bounded rather than additive.

## Decision

All illumination effects are resolved **upstream, on the CPU, into a single RGBA field**, which is emitted as exactly one `rasterPatch` primitive.

There is no generalized compositor and no backend-owned blend policy. Modes such as `scene.illumination.moonlight.mode` and the emissive night-lights mode are resolved into deterministic policy tables before sampling. The backend receives pixels.

## Consequences

**Good.**

- The backend has no illumination concepts at all. Adding an effect never requires touching it.
- Interactions between effects are expressed as arithmetic in one place, where they can be reasoned about and tested, rather than as an emergent property of blend-mode ordering.
- Polar behaviour — midnight sun, polar night — falls out of real solar geometry and axial tilt rather than needing special-case rules.
- The whole field is a pure function of the canonical instant and configuration, so it is deterministic and reproducible.

**Costs.**

- Composition is per-texel CPU work inside the frame. This is the most performance-sensitive path in the application, and anything added to it is paid every frame.
- The tuning constants in `illuminationShading.ts` are interdependent and were arrived at through iterative visual review. There is no pixel baseline to catch a regression, so changes there require visual verification rather than only unit tests.
- Effects that would be trivial as a GPU blend must be expressed in the sampling model instead.

**Explicitly not decided.** This is not a rejection of GPU compositing for a future backend. It is a decision that *product* composition semantics live upstream. A future backend could execute the same resolved field differently; it still would not decide what the field means.
