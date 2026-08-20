# 0018 — Milky Way Viewing Window is a reference-city event

- **Status:** Accepted
- **Date:** 2026-08-19 (record written with [LIB-051](../work/LIB-051-milky-way-viewing-window-events.md))

## Context

LIB-049 mapped IAU Galactic directions to terrestrial zenith ([ADR 0017](0017-offline-iau-galactic-zenith-projection-authority.md)). LIB-050 added Galactic-center altitude contours. Neither answers “when is the bright central Milky Way favorably placed from the configured city under dark-sky geometry?”

Galactic-center transit, culmination, or plane-overhead can occur in daylight or under a bright Moon. A single opaque visibility score would hide the astronomy and invite false certainty.

Eclipse events remain global ([ADR 0010](0010-eclipse-events-global-circumstances-derived.md)). This family is local by design: changing the reference city must change the windows.

## Decision

**A Milky Way Viewing Window is a bounded UTC interval during which the reference city satisfies an explicit intersection of Galactic-center altitude, solar altitude, and existing local physical moonlight.**

Policy version `milky-way-viewing-v1` (not user-facing):

| Level | GC geometry | Sun | Moonlight `localMoonlightContribution01` |
|-------|-------------|-----|------------------------------------------|
| Viewing | altitude ≥ 15° | ≤ −12° | no gate (may be moonlit) |
| Strong | altitude ≥ 20° and ≥ 75% of local nightly max | ≤ −18° | ≤ 0.22 |
| Prime | ≥ 90% of local nightly max, and altitude ≥ 15° | ≤ −18° | ≤ 0.08 |

Nightly maximum is `90° − |latitude − GC declination|`. Relative Prime is used only when that maximum is at least 15°. If the Galactic center never reaches 15°, there are no windows.

One family, partitioned by highest qualifying level (Prime > Strong > Viewing). Peak instant maximizes Galactic-center altitude inside the interval. Event ids are `milky-way:<city-id>:<startUtcMs>:<level>`.

Moon below the horizon is moonlight 0. Lunar-eclipse transmission participates through the existing physical moonlight model; it is not a special case. Clouds, weather, and light pollution are not inputs.

Evaluation is headless at product UTC (Demo time included). Rendering, contour pixels, and `RenderPlan` do not decide event truth. Navigation uses the existing Demo clock ([ADR 0015](0015-domain-tour-sequencer-drives-shared-demo-time.md)); there is no second clock and no Eclipse Tour insertion.

## Consequences

**Good.**

- Knoxville (~25° culmination) can still have Prime near its local best; Atacama-latitude sites get geometrically higher Prime windows.
- Copy can expose facts (GC altitude, percent of nightly maximum, darkness, moonlight) instead of a mystery score.
- Demo jumps reconstruct the same windows.

**Costs.**

- Thresholds are a product policy and may evolve; the version token keeps tests deterministic.
- High northern latitudes honestly have no Galactic-center windows. Whole-band (Cygnus/Cassiopeia) viewing is a separate future family.

**Explicitly not decided.** Observing-quality forecasts (clouds, light pollution), a whole-band viewing event, or a Milky Way Viewing Tour.
