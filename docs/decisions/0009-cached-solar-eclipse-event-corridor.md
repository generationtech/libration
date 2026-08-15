# 0009 — Cached solar eclipse event corridor distinct from live footprint

- **Status:** Accepted
- **Date:** 2026-08-15 (record written with [LIB-015](../work/LIB-015-solar-eclipse-forecast.md))

## Context

E1 ([LIB-014](../work/LIB-014-solar-eclipse-live-footprint.md)) evaluates NASA Besselian elements at the canonical product UTC and draws the **instantaneous** umbra/antumbra and penumbral footprint. At world-map scale that live umbra is a compact moving oval. The familiar NASA-style continental strip is a different quantity: the geographic corridor **swept** by the central eclipse over the whole event.

A natural implementation mistake is to treat that strip as a scaled-up live footprint, to recompute it every animation frame, or to bake static path polylines into the authority asset. Any of those would either fake the science or put event-long geometry on the per-frame path.

## Decision

**Event-path corridors are cached, time-independent event geometry derived from the same bundled authority as the live footprint, and they are not the live footprint.**

- Corridor construction samples authoritative Besselian geometry across the event interval, stitches left/right central-shadow limits into one or more lat/lon rings, and caches the result by event id, authority version, and algorithm id.
- Live E1 geometry remains a function of product UTC for the active event only.
- Forecast selection (which events participate) is a function of product UTC, forecast horizon, and authority coverage. It does not rebuild corridor geometry as time advances.
- Canvas and `RenderPlan` still see only generic `equirectRegionOverlay` fills and strokes.

Partial-only events have no central corridor. Their E2 forecast geography is a representative greatest-eclipse penumbral region, not a fabricated totality/annularity strip and not an event-long swept-penumbra union.

## Consequences

**Good.**

- Upcoming visualization can show the NASA-style path before first contact without implying that the umbra already covers that strip.
- During an active eclipse the corridor can remain as context while the live umbra moves along it.
- Large product-time jumps reuse the same cached corridor; only event selection and the live footprint change.
- A later authority or algorithm version is a cache key change, not a silent visual drift.

**Costs.**

- First corridor build for an event costs tens to low hundreds of milliseconds. That work belongs in the event service, not in Canvas.
- The representative greatest-eclipse partial region is not the full event-long partial-visibility envelope. A swept penumbral union would need polygon-union machinery that E2 deliberately does not add.
