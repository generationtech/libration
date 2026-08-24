# 0033 — ISS tracking reuses the anchored-frame target architecture

- **Status:** Accepted
- **Date:** 2026-08-24
- **Work item:** [LIB-089](../work/LIB-089-iss-tracking-target.md)

## Context

[ADR 0032](0032-anchored-frames-target-a-trackable-map-object.md) made anchored frames target a `TrackableMapObjectId` with resolution separate from transform math. LIB-088 shipped only `"moon"` and `"sun"`. ISS already has an authoritative geographic current position (SGP4 at the canonical product instant, the same sample the ISS glyph paints) and therefore satisfies the trackability contract without a new reference-frame kind.

Open product questions were: what happens when that position is missing or unpaintable; whether ISS needs its own wrap/cover/camera path; and how continuous-anchor history behaves when switching among three targets.

Wrong generalizations remain: a second ISS propagator; ISS-specific longitude wrap; hard-coded 51.6° cover; camera-follow; treating fixture or excessively stale TLE as a tracking coordinate; a redesigned target+mode picker before ISS has proven the architecture.

## Decision

1. **ISS is a third production `TrackableMapObjectId` (`"iss"`).** It is not a new `SceneReferenceFrame` kind. Longitude-lock and position-lock are the existing `lockMode` values on the shared anchored type. Earth-fixed remains a non-target identity. Cities, planets, Milky Way, and earthquakes are still not targets.

2. **ISS resolution consumes existing authoritative ISS state.** `resolveAuthoritativeIssCanonicalPosition` applies the same paint-eligibility rules as the ISS overlay (`issTrackShouldPaint`: live/cached-live TLE that is fresh or degraded, never fixture, never excessively stale) and the same current sample (`resolveIssCurrentSample` at the canonical product UTC). Tracking does not recompute orbital mechanics in `trackableMapObject.ts`. The ISS anchor and the rendered glyph represent the same physical position at the same canonical instant.

3. **ISS tracking is available only when that authoritative position exists.** The Scene frame selector always lists ISS longitude-lock and ISS position-lock, but those options are disabled when no valid position is available. If an ISS kind is already active and the position becomes unavailable, the shell falls back to Earth-fixed and reinitializes camera policy. The application never constructs an ISS-anchored frame from missing or invalid coordinates. Degraded-but-paintable TLE may still be tracked; that is the same authority used to render ISS, not a new freshness threshold.

4. **Continuity is tracking-session-local.** Switching Scene frame kind (including Moon ↔ Sun ↔ ISS) clears the previous continuous longitude and reinitializes from the new target’s current canonical longitude. While the same kind remains active, the generic nearest-equivalent helper follows, including ISS antimeridian crossings. There is no per-target historical cache.

5. **The seven-choice Scene frame selector is transitional.** It maps onto Earth-fixed or `target + lockMode`. A later split into Tracking target + Tracking mode, and later click-to-track, are not authorized here.

6. **No ISS-specific transform, camera, wrap, or cover.** Longitude continuity, raster dest, world copies, inverse mapping, and position-lock automatic cover remain target-agnostic. Cover scale is derived from the resolved ISS latitude via the existing formula. Manual override, Reset, pan, and camera independence are unchanged.

## Consequences

**Good.**

- ISS proves that a new dynamic target is identity + authoritative resolution + UI, not a new frame theory.
- Availability follows existing ISS validity rather than inventing a tracking-only freshness policy.
- Session-local continuity prevents Moon/Sun multi-turn longitude from contaminating ISS, and vice versa.

**Costs.**

- The seven-option selector is denser than the previous five. That is accepted until a later UX item.
- ISS options are disabled on scenarios without a paintable ISS view (`baseline` factory ISS off; historical product time that is not live-enough).

**Non-decisions.** City/planet/Milky Way/earthquake tracking, generic pickers, click-to-track, persistence, URL state, heading-up, and a redesigned selector are not authorized here.
