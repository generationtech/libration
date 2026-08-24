# 0037 — Galactic Center and Anticenter tracking reuse existing Milky Way point identities

- **Status:** Accepted
- **Date:** 2026-08-24
- **Work item:** [LIB-093](../work/LIB-093-galactic-center-and-anticenter-tracking-targets.md)

## Context

[ADR 0032](0032-anchored-frames-target-a-trackable-map-object.md)–[ADR 0036](0036-city-and-planet-tracking-reuses-structured-target-identity.md) already define trackable identity, resolution, orthogonal Target+Mode, anchored frames, auto-cover, scene-space click-to-track, and structured city/planet identities. LIB-092 explicitly left Milky Way out because the overlay is not one canonical point.

The production Milky Way presentation is a galactic-plane band plus two tagged zenith subpoints already computed in `sampleMilkyWayGeometry`: Galactic Center `(l,b) = (0,0)` and Galactic Anticenter `(180,0)`. Those subpoints have stable identities, authoritative mapped lon/lat at `TimeContext.now`, and painted glyphs. Inventing a single `"milkyWay"` target, a band centroid, or a nearest-band-point would fabricate geography the product does not own.

Wrong generalizations remain: Milky-Way-specific frame or camera math; a second galactic-coordinate transform for tracking; tracking the band or path; earthquake tracking.

## Decision

1. **There is no synthetic Milky Way tracking target.** The two legitimate point targets are structured `{ kind: "milkyWayPoint", id: "galacticCenter" | "galacticAnticenter" }`. Identity is independent of coordinates and of visible labels. Semantic equality remains `trackableMapObjectIdEquals`.

2. **Positions come from the existing Milky Way payload.** Resolution uses `geometry.galacticCenter` / `geometry.galacticAnticenter` lon/lat from the same layer state used to paint. No second astronomy path. The points are dynamic Earth-relative subpoints even though celestial `(l,b)` is fixed.

3. **Availability follows the planet omit policy.** A galactic point is listed and trackable only when that tagged glyph is currently rendered (layer visible, payload supported, presentation flag on, finite mapped position). Factory: Center on, Anticenter off. Missing/disabled points are not listed disabled. If the selected point becomes unavailable, fall back to Earth-fixed, keep remembered mode, and reinitialize camera.

4. **After lon/lat is resolved, the stack does not branch.** Longitude-lock, position-lock, continuity, wrap, camera, and auto-cover remain generic. Same numeric anchor latitude produces the same cover scale as Moon/Sun/ISS/city/planet.

5. **Click-to-track reuses the LIB-091 scene-space hit seam.** Visible Galactic Center and Anticenter glyphs emit hit targets. The galactic-plane band does not. Wrapped copies share one id. Hit radius is `max(painted glyph radius + padding, minimum)`. Overlap: nearest center, then category+id (`moon`, `sun`, `iss`, planets, milky-way points, cities).

6. **Target chrome stays native `<optgroup>`.** Celestial is Moon, Sun, eligible planets, then Galactic Center and Galactic Anticenter when available. Native-select values `milkyway:galacticCenter` / `milkyway:galacticAnticenter` are UI encoding only.

## Consequences

**Good.**

- The requested map-object tracking set is complete for legitimate point semantics: Moon, Sun, ISS, cities, planets, Galactic Center, Galactic Anticenter.
- The band remains an extended feature, not a fake point.

**Costs.**

- Anticenter is factory-off, so it appears in Target only after the user enables that glyph.
- Combined UI kinds remain Moon/Sun/ISS-only compatibility aliases.

**Non-decisions.** Earthquake tracking; band/path picking; a generic target search UI; persistence or URL tracking state; new lock modes; additional galactic astronomy.
