# 0017 — Offline IAU Galactic zenith-projection authority

- **Status:** Accepted
- **Date:** 2026-08-19 (record written with [LIB-049](../work/LIB-049-milky-way-terrestrial-visibility-geometry.md))

## Context

The Milky Way is an extended celestial structure. Painting it as a star field, photographic texture, or another world-map shading raster would either invent photometry Libration does not own or duplicate planetary illumination ([ADR 0002](0002-single-upstream-planetary-illumination-rasterpatch.md)).

A single “Milky Way subpoint” would also be false: different Galactic longitudes are at zenith at different terrestrial locations at the same instant.

The product needs a deterministic, offline mapping from IAU Galactic coordinates onto the terrestrial map at the canonical UTC instant, including Demo time across 1600–2500.

## Decision

**Milky Way map geometry is the terrestrial zenith projection of IAU 1958 Galactic directions, evaluated offline at `TimeContext.now`.**

- Galactic longitude/latitude use astronomy-engine’s GAL frame (IAU 1958 definition) via the constant `Rotation_GAL_EQJ` matrix into J2000 mean equator (EQJ).
- Equator-of-date uses the same library `Rotation_EQJ_EQD` (precession and nutation) as planetary positions ([ADR 0016](0016-offline-planetary-ephemeris-authority.md)).
- Geographic wrap is the existing east-positive ±180° identity: `lat = Dec`, `lon = wrap180(RA − GAST)`.
- The Galactic plane is `b = 0°`. The approximate Milky Way band is a conservative constant Galactic-latitude envelope (±5° / ±10° / ±15°), not a stellar-density model.
- Galactic center is `l = 0°, b = 0°`; anticenter is `l = 180°, b = 0°`. Each is a zenith subpoint, not a visibility region.
- Night-side emphasis tags those zenith samples with the existing subsolar geometric horizon. It is not a second illumination raster and is not an observing-quality forecast.
- Product support span is the same **1600–2500** window as ADR 0016. Outside that span, Milky Way features hide.

The Milky Way is a separate derived overlay (`milkyWay`), not a planetary body. The planetary-object abstraction is not extended to host it.

## Consequences

**Good.**

- Demo time, pause, and UTC jumps evaluate the same offline transforms. The render path never fetches catalogs or imagery.
- Zenith-projection semantics stay testable without a canvas.
- A later observing-quality model can consume these celestial directions without rewriting the ribbon.

**Costs.**

- Visualization-grade IAU 1958 GAL in EQJ, then equator-of-date. Not ICRS/Gaia astrometry.
- The band envelope is angularly simple. It does not claim the actual visible width at every Galactic longitude.
- The ribbon is **not** “where the Milky Way is visible.” Above-horizon visibility is a much larger hemisphere per direction and is not this overlay.

**Generalization.** Durable Galactic truth is a named offline coordinate authority composed with Earth rotation. Illumination remains ADR 0002. Planetary ephemerides remain ADR 0016.
