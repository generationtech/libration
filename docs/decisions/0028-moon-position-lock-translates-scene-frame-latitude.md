# 0028 — Moon position-lock translates scene-frame latitude; it is not camera-follow

- **Status:** Accepted
- **Date:** 2026-08-23
- **Work item:** [LIB-084](../work/LIB-084-moon-position-locked-scene-frame.md)

## Context

[ADR 0027](0027-moon-longitude-lock-is-a-scene-reference-frame.md) made Moon longitude-lock a `moonAnchored` scene reference frame with latitude identity. The next production widening is locking **both** axes to the sublunar point so the Moon stays at scene-frame origin while Earth geography moves in longitude **and** latitude.

Two wrong implementations were available: writing Moon latitude into `SceneCamera.centerV` each frame (camera-follow; fights vertical pan), or treating translated scene-frame latitude as geographic latitude and clamping it to ±90° (corrupts presentation once the Moon is away from the equator). Equirectangular helpers historically described geographic ±90° even though the mapping is linear. Vertical wrapping of the Earth raster would fabricate geography beyond the poles.

## Decision

1. **Same kind, second axis configuration.** Position-lock is `moonAnchored` with `longitudeLocked: true` and `latitudeLocked: true`. It is not a second Moon architecture, not a camera mode, and not `viewMode`. Longitude-lock (`latitudeLocked: false`) remains a distinct, tested configuration.

2. **Forward transform.** Longitude follows ADR 0027. Latitude is `sceneLat = canonicalLat − moonAnchorLat`. The Moon maps to scene `(0°, 0°)`. Canonical entity state is not mutated.

3. **Scene-frame latitude is not geographic latitude.** After subtraction, scene-frame latitude may leave ±90° (for example canonical −80° with anchor +28° → −108°). That value is valid presentation coordinate. Do not clamp, wrap, or reject it while operating in scene space. Geographic ±90° validation applies only after the inverse transform, when a canonical geographic latitude is required.

4. **Latitude is not periodic.** There is no vertical analogue of longitude continuity, nearest-equivalent, or world copies. Do not reuse longitude seam helpers for latitude.

5. **Inverse transform.** `canonicalLat = sceneLat + moonAnchorLat`, then clamp to geographic ±90° if the result is used as physical latitude. Longitude inverse remains ADR 0027.

6. **Anchor.** Continuous longitude follows ADR 0027. Latitude is the current authoritative sublunar latitude for the canonical UTC instant. No latitude continuity state.

7. **Rasters.** Reuse the existing full-world equirectangular strip. Shift dest X as in LIB-083 and dest Y by `−moonAnchorLat / 180 × height`. Base map, illumination, and Clouds share that dest. Do not wrap, mirror, or stretch vertically. Regions outside the translated Earth strip are the normal scene background.

8. **Projection.** `mapYFromLatitudeDeg` / `latitudeDegFromMapY` map scene-frame latitude linearly, including values outside geographic ±90°. They do not encode physical-latitude validation.

9. **Camera.** Identity remains `scale = 1`, `centerU = 0.5`, `centerV = 0.5` and means the default **scene-frame** view (Moon at the defined centre in position-lock). Time updates must not write `centerV` from the Moon. At scale 1, vertical pan stays a no-op (`centerV = 0.5`); blank beyond the translated Earth is accepted. At scale > 1, user pan/zoom clamp against the scene-frame Earth extent (`south = −90 − moonAnchorLat`, `north = +90 − moonAnchorLat` in scene latitude), not hard-coded geographic `[0, 1]` placement. That clamp runs on interaction, not on every time tick.

10. **Switch and persistence.** Switching among Earth-fixed, Moon longitude-lock, and Moon position-lock resets the camera to identity. Reset view resets the camera only. Earth-fixed remains the load default. Frame selection is runtime-only.

11. **Later generalization.** A later entity-fixed milestone should reuse anchor + locked-axis semantics rather than invent independent special modes. Sun-fixed and generic anchors are not authorized here.

## Consequences

**Good.**

- The Moon stays fixed in both scene-frame axes while the user still zooms and pans.
- Longitude-lock remains available and is not redefined as position-lock.
- Polar clipping is honest: no fabricated geography beyond terrestrial latitude.

**Costs.**

- Every geographic plan builder must apply the same latitude transform as longitude (shared helpers; rasters use dest shift).
- Identity camera in position-lock can show blank beyond the translated Earth strip; that is the defined default view, not a defect.
- Chrome structural meridians remain a full-world Earth-fixed ruler.

**Non-decisions.** Sun-fixed frames, generic entity pickers, frame persistence, map rotation, heading lock, vertical world wrapping, and polar mirroring are not authorized here.
