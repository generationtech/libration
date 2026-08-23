# 0027 — Moon longitude-lock is a scene reference frame, not camera-follow

- **Status:** Accepted
- **Date:** 2026-08-23
- **Work item:** [LIB-083](../work/LIB-083-moon-longitude-locked-scene-frame.md)

## Context

[ADR 0026](0026-scene-camera-independent-of-projection-and-reference-frame.md) separated scene camera from projection, physical state, and the scene/map reference frame. [LIB-082](../work/LIB-082-scene-reference-frame-foundation.md) implemented Earth-fixed identity and longitude-continuity primitives. The first non-Earth-fixed production experiment is a Moon-anchored frame that locks **longitude only**.

A naive implementation would write the Moon’s longitude into `SceneCamera.centerU` each frame. That fights pan, hides the frame in the camera, and still jumps 360° when canonical lunar longitude wraps at ±180°. A nearest-equivalent relative longitude for each point independently also has a branch cut ~180° from the anchor: whole-Earth geography near that antipodal meridian would tear unless periodic copies represent equivalent scene longitudes.

## Decision

1. **Moon longitude-lock is a `SceneReferenceFrame` kind** (`moonAnchored`, `longitudeLocked: true`, `latitudeLocked: false`). It is not a camera mode, not `viewMode`, and not civil-time reference.

2. **Anchor derivation.** Each frame uses the canonical UTC instant’s authoritative sublunar geographic longitude (`sublunarPoint`). Canonical lunar longitude is never mutated. The scene-frame origin is the Moon meridian (`sceneLon = 0`).

3. **Continuous / unwrapped anchor.** The live anchor follows `continuousLongitudeFollowingCanonicalDeg` so `178 → 179 → 180 → −179 → −178` (canonical) becomes `178 → 179 → 180 → 181 → 182`. Do not canonicalize the anchor every frame. Prolonged animation may rebase by exact 360° turns; that is visually exact with periodic copies.

4. **Forward transform.** `sceneLon = nearestEquivalent(canonicalLon, λMoon_continuous) − λMoon_continuous`. Latitude is identity: `sceneLat = canonicalLat`. Positive scene longitude is east of the Moon. As the sublunar point travels west, terrestrial features drift east in the scene.

5. **Inverse transform.** Add the continuous anchor, then canonicalize longitude where geographic identity is required. Latitude inverse is identity.

6. **Whole-Earth continuity.** Rasters (base map, illumination, Clouds) shift by `−λMoon_continuous / 360 × width` in identity-world space, then use the existing periodic dest copies. Vectors transform into scene-frame longitude, then reuse seam unwrap and camera wrap copies. Canonical antimeridian, Moon-frame antipodal seam, and camera display wrap are related but distinct.

7. **Epoch policy.** While Moon longitude-lock stays active, time jumps follow the nearest equivalent of the new canonical longitude. A new scene/frame epoch reinitializes from canonical longitude (no multi-turn carry): first entry into the mode, reload, and switching back from Earth-fixed. Demo start/reset while already in the mode is a time jump, not a new frame epoch.

8. **Camera.** Switching Earth-fixed ↔ Moon longitude-lock resets the camera to identity. Reset view resets the camera only and does not change the frame. Time updates must not write `centerU` from the Moon.

9. **Default and persistence.** Earth-fixed remains the load default. The selected frame is runtime-only in this milestone (not URL/storage/`SceneConfig`).

10. **Axis-lock, not duplicate modes.** Latitude lock / full Moon position-lock is a later widening of the same `moonAnchored` kind (`latitudeLocked: true`), not a second ad-hoc Moon mode. Sun-fixed and generic entity pickers remain later.

## Consequences

**Good.**

- The Moon stays on a fixed scene-frame meridian while the user still zooms and pans.
- Canonical astronomy, lifecycle payloads, and `SceneCamera` stay unentangled.
- Whole-Earth geography can move continuously through the lunar antimeridian.

**Costs.**

- Every geographic plan builder must receive the live frame (shared mapping helpers; rasters use dest shift).
- Three seam concerns (canonical dateline, Moon-frame antipode, camera wrap) must stay aligned.
- Chrome structural meridians remain a full-world Earth-fixed ruler and will not track the Moon-relative map.

**Non-decisions.** Moon latitude lock, Sun-fixed frames, generic anchors, frame persistence, map rotation, and heading lock are not authorized here.
