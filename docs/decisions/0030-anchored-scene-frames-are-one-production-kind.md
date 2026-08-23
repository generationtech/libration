# 0030 — Anchored scene frames are one production kind

- **Status:** Accepted
- **Date:** 2026-08-23
- **Work item:** [LIB-086](../work/LIB-086-generalize-anchored-scene-reference-frames.md)

## Context

[ADR 0027](0027-moon-longitude-lock-is-a-scene-reference-frame.md)–[ADR 0029](0029-sun-anchoring-reuses-moon-axis-lock.md) proved Moon and Sun longitude-lock and position-lock with identical axis-lock math, shared raster dest shift, shared camera vertical extent, and shared longitude continuity. LIB-085 kept `moonAnchored` and `sunAnchored` as sibling production kinds so the second real anchor could be judged before a generic entity type. That sibling split is now leftover representation: transform, raster, camera, and continuity do not differ by body.

Two wrong generalizations were available: unconstrained booleans (`longitudeLocked` × `latitudeLocked`) that admit unproven combinations (latitude-only lock; unlocked anchored frames), or a generic `EntityReferenceFrame<T>` / provider registry that would hide explicit Moon/Sun physical derivation.

## Decision

1. **Production `SceneReferenceFrame` is Earth-fixed or anchored.** Discriminator `kind` is `"earthFixed" | "anchored"`. Moon and Sun are `anchorKind` on the anchored variant, not sibling transform kinds.

2. **Lock mode is a closed union, not two free booleans.** `lockMode` is `"longitude"` (longitude locked, latitude identity) or `"position"` (both axes locked). Latitude-only and fully unlocked anchored frames are not constructible. Convenience constructors (`moonLongitudeLockedSceneReferenceFrame`, …) delegate to `anchoredSceneReferenceFrame`.

3. **Transform, raster dest, and camera extent branch on Earth-fixed vs anchored and on `lockMode`.** They must not branch on `anchorKind`. Anchor identity is metadata for UI and for choosing which physical point to derive; it is not a reason for different coordinate math.

4. **Physical derivation stays at the application boundary.** Canonical UTC instant → authoritative sublunar point (Moon) or subsolar point (Sun). The frame consumes `anchorKind`, continuous longitude, latitude, and lock mode. No generic anchor-provider layer.

5. **Longitude continuity is anchor-agnostic.** Nearest-equivalent follow, unwrapped continuous longitude, frame-epoch reinitialize, and exact-360° rebase depend on longitude values, not body type. Runtime policy lives in `sceneFrameAnchor.ts`.

6. **User-visible set is unchanged.** Five runtime Scene frame choices remain Earth-fixed, Moon longitude-lock, Moon position-lock, Sun longitude-lock, Sun position-lock. UI kinds map into the common production type. Labels may stay Moon/Sun specific. No persistence, no URL state, no new picker.

7. **A third anchor is not authorized.** Extending `SceneFrameAnchorKind` is the intended seam *if* a future entity satisfies the geographic-subpoint contract below. ISS-fixed, storm-fixed, aircraft-fixed, ship-fixed, heading lock, and a generic picker are not this decision.

### Future-anchor contract (assessment only)

A later kind may join this model only if it has:

- an authoritative canonical geographic lon/lat at the frame instant (a subpoint, not an attitude);
- longitude that is meaningful to follow continuously across ±180°;
- position-lock that is meaningful as translating Earth in latitude while remaining north-up (no heading/rotation);
- presentation that fits the existing equirectangular dest-shift (horizontal copies; no vertical copies).

Moon/Sun assumptions that may not apply: slow apparent motion; a well-defined celestial subpoint; no vehicle heading; users accepting a translated Earth rather than a heading-up chase view. ISS has a sub-satellite point, so the *coordinate* math could fit; whether position-lock is the right product is a separate decision. This architecture does not need another transform refactor for a third geographic subpoint. It does need a new product decision, and it is not ready for heading-lock or a generic entity selector.

## Consequences

**Good.**

- Production types match the math that LIB-083–085 already shared.
- Invalid lock combinations are excluded at construction.
- Plan builders and camera code ask about frame semantics, not Moon vs Sun.

**Costs.**

- Historical ADRs 0027–0029 still describe sibling kinds; this record supersedes that representation, not their axis-lock or camera-independence semantics.
- UI still has five explicit choices; that is intentional, not a leftover transform split.

**Non-decisions.** Additional anchor kinds, generic pickers, provider frameworks, camera-follow, frame persistence, map rotation, and heading lock are not authorized here.
