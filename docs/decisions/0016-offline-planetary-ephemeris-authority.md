# 0016 — Offline planetary apparent-position authority

- **Status:** Accepted
- **Date:** 2026-08-19 (record written with [LIB-048](../work/LIB-048-planetary-space-objects-ground-tracks-and-loci.md))

## Context

Libration already has visualization-grade Sun and Moon series (`subsolarPoint`, `sublunarPoint`) and a bundled NASA/Espenak–Meeus eclipse authority ([ADR 0008](0008-bundled-nasa-solar-eclipse-authority.md)). Neither covers Mercury through Neptune or Pluto.

Planetary sub-object points, ground tracks, and daily same-time loci need geocentric apparent coordinates at arbitrary product UTC, including historical and future Demo time. A runtime JPL/Horizons fetch would violate the no-network render path, make Demo non-deterministic, and classify planets as current-only live data.

The repository had no planetary ephemeris library. Building VSOP87/Pluto mechanics from scratch would duplicate a solved, tested model.

## Decision

**Apparent geocentric planetary positions come from the bundled `astronomy-engine` library (v2.1.19), evaluated locally at the canonical product UTC.**

- Mercury–Neptune: truncated VSOP87 series (library claim: about ±1 arcminute versus NOVAS C 3.1 / DE405-class checks).
- Pluto: the library’s dedicated Pluto model (not VSOP87; verified by the library author against NOVAS and TOP2013). Pluto is a supported body in this product; it is not omitted for taxonomy.
- Light-time is always applied. Aberration is applied. Equator-of-date uses the library’s EQJ→EQD rotation (precession and nutation). Greenwich apparent sidereal time comes from the same library so RA and Earth rotation stay consistent.
- Geographic sub-object longitude uses the same east-positive ±180° wrap as Sun/Moon: `lon = wrap180(RA_deg − GAST_deg)`, `lat = declination`. Spherical Earth, not a second ellipsoid convention.
- Product support span is **1600-01-01T00:00:00.000Z inclusive to 2500-01-01T00:00:00.000Z exclusive**. The library will return numbers outside that span; Libration treats those dates as **unsupported** and does not paint planetary features. This range is wider than eclipse 1900–2100 and is not claimed as observatory-grade over millennia.
- Authority identity is `astronomy-engine-vsop87` / package version `2.1.19`. Ambient Sun/Moon series and eclipse catalogs stay independent.

## Consequences

**Good.**

- Demo time, pause, and UTC jumps evaluate the same offline series. The render path never fetches ephemerides.
- One compact MIT dependency (~135 KB minified / ~49 KB gzip for the full package; production payload depends on bundler tree-shaking) rather than a multi-megabyte DE kernel.
- Tests can pin authority version and compare RA/Dec and subpoints deterministically.

**Costs.**

- Visualization-grade: about 1 arcminute, not JPL DE440 astrometry. World-map subpoints are geographically credible; they are not survey control.
- Pluto’s model is not VSOP87. Accuracy is the library’s Pluto series, not a claim of DE-quality outer-solar-system dynamics.
- A later `astronomy-engine` upgrade is an authority-version bump and a fixture review.

**Generalization.** Durable planetary truth is a named offline authority, not ambient Sun/Moon math and not a network almanac. Eclipse event truth remains ADR 0008.
