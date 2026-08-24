# 0032 — Anchored frames target a trackable map object

- **Status:** Accepted
- **Date:** 2026-08-24
- **Work item:** [LIB-088](../work/LIB-088-trackable-map-object-foundation.md)

## Context

[ADR 0030](0030-anchored-scene-frames-are-one-production-kind.md) unified Moon and Sun into one anchored production kind. Identity was still `anchorKind: "moon" | "sun"`: a celestial-body label attached to the frame. Physical derivation was an explicit Moon vs Sun branch at the application boundary.

That representation is too narrow for the next real target (ISS). The remaining assumption is that an anchored frame’s identity *is* a celestial body. What the product actually needs is: a **rendered map object** with a stable identity and an authoritative canonical lon/lat at the frame instant. Moon and Sun are the first two such objects, not a closed celestial taxonomy.

Wrong generalizations remain: a plugin/provider registry; encoding identity as current lon/lat; treating Earth-fixed as `target: "earth"`; branching transform/camera/cover on which object is tracked.

## Decision

1. **A trackable map object is a stable identity, not coordinates.** Production type `TrackableMapObjectId` is a closed union. LIB-088 ships only `"moon"` and `"sun"`. Identity does not change as the object moves. Do not use lon/lat as the identity. Do not add speculative values (ISS, cities, planets, Milky Way) until those objects are actually exposed.

2. **Target resolution is a separate seam from reference-frame math.** Object-specific knowledge (Moon → existing `sublunarPoint`, Sun → existing `subsolarPoint`) produces canonical lon/lat for the canonical UTC instant. The frame consumes already-resolved `continuousAnchorLonDeg` and `anchorLatDeg`. Resolution may stay at the application boundary. No service locator, registry, or provider framework.

3. **Anchored `SceneReferenceFrame` carries `target`, not a body-specific `anchorKind`.** Production model remains Earth-fixed vs anchored. Anchored frames are `{ target, lockMode, continuousAnchorLonDeg, anchorLatDeg }`. `lockMode` remains `"longitude" | "position"`. Earth-fixed is not a target.

4. **Coordinate math, raster dest, camera vertical extent, longitude continuity, and automatic cover must not branch on `target`.** Target identity is metadata (UI, diagnostics, tests, later selection). The same numeric anchor + same lock mode must produce the same transform and the same cover scale for any target.

5. **Trackability contract.** A future rendered object may become a target only if it has: stable identity; authoritative canonical lon/lat; coordinates for the same canonical instant as rendering; longitude that can be followed continuously through ±180° if it moves; meaningful north-up position-lock as map translation; displayed map position matching the resolver’s coordinates. Targets may be dynamic (Moon, Sun, later ISS) or static (later city pins). The frame does not require motion. Clickable selection is not implemented. Earthquakes remain out of tracking scope.

6. **User-visible set is unchanged.** Five Scene frame choices still map to Earth-fixed or `target + lockMode`. No generic picker in this decision.

This record **supersedes the identity representation** of ADR 0030 (`anchorKind` as a celestial-body field, and “extend `SceneFrameAnchorKind`” as the third-anchor seam). ADR 0030’s one-kind model, closed lock modes, and “math must not branch on body” remain. ADR 0031’s cover policy remains target-agnostic.

## Consequences

**Good.**

- ISS (and later planets/cities) can be added by defining an identity, resolving canonical lon/lat, and exposing UI — without another transform/camera refactor.
- Frame and camera layers stay object-agnostic.
- Moon and Sun keep their existing authorities; astronomy is not duplicated.

**Costs.**

- Historical ADRs 0027–0030 still say `anchorKind`. This record is the identity model going forward.
- UI still has five explicit Moon/Sun choices; a picker waits until more objects are actually tracked.
- ISS still needs a product decision for unavailable/stale position, live-enough gating, and UI — not a new frame theory.

**Non-decisions.** ISS/city/planet/Milky Way/earthquake tracking, clickable selection, registries, new lock modes, heading lock, map rotation, and persistence are not authorized here.
