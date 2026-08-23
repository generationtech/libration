# 0029 — Sun anchoring reuses Moon axis-lock; it is not a second frame theory

- **Status:** Accepted; sibling-kind representation superseded by [0030](0030-anchored-scene-frames-are-one-production-kind.md)
- **Date:** 2026-08-23
- **Work item:** [LIB-085](../work/LIB-085-sun-anchored-scene-frames.md)

## Context

[ADR 0027](0027-moon-longitude-lock-is-a-scene-reference-frame.md) and [ADR 0028](0028-moon-position-lock-translates-scene-frame-latitude.md) proved Moon longitude-lock and Moon position-lock as `moonAnchored` axis configurations: continuous longitude relative to an unwrapped sublunar anchor; latitude identity or `canonicalLat − anchorLat`; camera independent of the frame. The next production widening is a **second real anchor** — the Sun — using the same rules, so the architecture can be judged before a generic entity-frame type is introduced.

Two wrong implementations were available: writing the subsolar point into `SceneCamera` each frame (camera-follow), or inventing a Sun-specific transform that diverges from the Moon formulas. Illumination is a third trap: special-casing night shading so it “looks fixed” in a Sun frame would mix physical sampling with presentation.

## Decision

1. **Sun is a sibling production kind, not a generic entity type.** Production frames are `earthFixed`, `moonAnchored`, and `sunAnchored`. Moon and Sun each carry `continuousAnchorLonDeg`, `anchorLatDeg`, `longitudeLocked`, and `latitudeLocked`. Shared axis-lock helpers exist; `EntityReferenceFrame<T>` does not.

2. **Same axis-lock semantics as the Moon.** Longitude-lock: `sceneLon` is continuous-anchor-relative; `sceneLat = canonicalLat`. Position-lock: the same longitude transform plus `sceneLat = canonicalLat − sunAnchorLat`. Scene-frame latitude may leave ±90°. Latitude is not periodic.

3. **Anchor derivation.** Each frame uses the canonical UTC instant’s authoritative subsolar point (`subsolarPoint`). Astronomy is not recomputed on a second clock. Canonical Sun state is not mutated.

4. **Continuous solar longitude.** The live anchor follows the same nearest-equivalent + exact-360° rebase policy as the Moon. A new frame epoch reinitializes from canonical solar longitude. While the Sun frame stays active, time jumps follow.

5. **Solar noon interpretation.** Scene longitude zero in Sun longitude-lock is the current **subsolar meridian**. Geographic regions passing through that meridian are passing the Sun-relative central meridian. This is not civil clock noon; equation-of-time and time-zone semantics remain civil-time display.

6. **Illumination.** Day/night samples remain canonical geographic/time physics. The illumination raster’s destination moves through the same scene-frame dest as the base map and Clouds. Do not special-case shading to look stationary.

7. **Camera.** Switching among the five production configurations resets the camera to identity. Reset view resets the camera only. Time must not write `centerU` / `centerV` from the Sun. Position-lock vertical extent reuses the shared translated-Earth helper (`south = −90 − anchorLat`, `north = +90 − anchorLat`).

8. **Default and persistence.** Earth-fixed remains the load default. Frame selection is runtime-only. Reload returns to Earth-fixed.

9. **Generalization is deferred.** Moon + Sun are evidence for a later common production model. ISS, storms, and a generic picker are not authorized here.

## Consequences

**Good.**

- The Sun stays fixed in the locked scene-frame axes while the user still zooms and pans.
- Moon frames remain distinct and are not redefined by Sun work.
- Illumination stays physically correct and registered with geography.

**Costs.**

- Moon and Sun kinds still duplicate some constructor/type surface; that is accepted until a later generalization slice.
- Chrome structural meridians remain a full-world Earth-fixed ruler.

**Non-decisions.** Generic entity-fixed, ISS-fixed, frame persistence, map rotation, heading lock, camera-follow, and civil-time changes are not authorized here.
