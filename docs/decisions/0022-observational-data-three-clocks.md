# 0022 — Observational data distinguishes product time, observation time, and acquisition time

- **Status:** Accepted
- **Date:** 2026-08-21 (record written with [LIB-063](../work/LIB-063-weather-1-global-clouds-v1.md))

## Context

Libration already has one canonical **product** UTC instant per frame ([ADR 0004](0004-one-canonical-utc-instant-per-frame.md)). Dynamic snapshots already carry `validTimeMs` and `acquiredAtMs` ([ADR 0005](0005-dynamic-data-acquisition-outside-the-render-path.md)).

Clouds v1 made the three clocks operationally distinct. The NASA GIBS Band13 mosaic represents a provider observation slot that can lag wall clock by hours. Fetch time is when Libration obtained the PNG. Product time is still the scene instant. Collapsing any two of those — in particular stamping `validTimeMs` from wall clock or treating fetch time as “live now” — produced dishonest status and the empty-future class of GIBS failure.

This is not a Clouds-specific WMS detail. Any observational Weather (and other current-only internet) consumer that reuses the dynamic-data lifecycle needs the same three-way distinction.

## Decision

For observational dynamic data:

- **Product time** is `TimeContext.now`. It is the scene instant. Display modes and Demo substitute this clock; they do not add another.
- **Observation time** is the instant the data represents. For Clouds that is the explicit WMS mosaic `TIME` (EUMETView PT3H or GIBS 10-minute slot). It is stored as `snapshot.validTimeMs`.
- **Acquisition time** is when Libration fetched the bytes. It is stored as `snapshot.acquiredAtMs`.

Freshness, stale-last-good, and suppress bands for Clouds v1 use **observation age** (`productUtcMs − validTimeMs`), not fetch age. Status copy may say mosaic time or “observed Nh ago”; it must not claim “live · now” when the mosaic is hours old.

GetMap requests for Clouds v1 always include explicit `TIME`. The provider default is never GetMap authority.

This does **not** introduce a second display clock. Wall clock remains only the live-enough gate ([ADR 0013](0013-current-only-internet-data-requires-live-enough-product-time.md)) and the acquisition timestamp.

## Consequences

**Good.**

- Status can be honest about mosaic lag without mutating product time.
- Latest-usable TIME search can walk back provider slots without pretending the fetch clock is the observation.
- Future radar consumers can reuse the same three fields without a Weather snapshot store.

**Costs.**

- Adapters must discover and stamp a real observation instant. Wall-clock `Date.now()` is not a valid `validTimeMs` for observational rasters.
- Chrome copy has to speak mosaic / observed / recent rather than an unqualified “live”.

**Explicitly not decided.** Historical GIBS `TIME` querying, a second clock, a Weather-specific store, and physical cloud optical-depth participation remain later work.
