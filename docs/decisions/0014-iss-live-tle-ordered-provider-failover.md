# 0014 — ISS live TLE uses ordered provider failover

- **Status:** Accepted
- **Date:** 2026-08-17 (record written with [LIB-040](../work/LIB-040-iss-acquisition-reliability-fast-first-paint.md))

## Context

ISS presentation is local SGP4 of an acquired TLE at product UTC ([ADR 0004](0004-one-canonical-utc-instant-per-frame.md), [ADR 0005](0005-dynamic-data-acquisition-outside-the-render-path.md)). The live element set is not generated in-process. CelesTrak GP is the historical primary feed, but from a browser client it is operationally unreliable: HTTP 403, TCP timeout, and IP firewall blocks after overly frequent downloads. CelesTrak’s own usage policy (2026) asks for one download per 2-hour GP update and says machine clients must stop querying on non-200 responses.

A 1-minute TLE poll therefore both violates provider terms and can make first paint hang indefinitely, because the live HTTP seam had no timeout and Layers hid the loading state. Fixture-as-live is forbidden ([LIB-036](../work/LIB-036-iss-live-provenance-freshness-and-fallback.md)).

Where the ISS at publishes a structured TLE endpoint (`/v1/satellites/25544/tles`) with CORS `Access-Control-Allow-Origin: *`, a documented rate limit, and 3LE/JSON text — orbital elements, not scraped lat/lon.

## Decision

**ISS live TLE acquisition is an ordered, same-cycle failover of two live element sources. It is not a generic multi-provider framework.**

- Primary: CelesTrak GP TLE for NORAD 25544.
- Secondary: Where the ISS at TLE for NORAD 25544.
- On enable (and while live-enough): fetch immediately. Do not wait for the periodic interval.
- Each attempt is bounded (8 s). Timeout, network failure, 403/429/5xx, or invalid TLE fails that attempt; the next provider in the chain runs in the same acquisition cycle.
- Parent abort (disable / host dispose) does not fail over.
- After all live providers fail: ISS is unavailable; no fixture. Retry once after 5 minutes if still enabled, then the 2-hour cadence.
- While enabled and live-enough, TLE refresh is 2 hours (CelesTrak GP update cycle). Marker motion remains local SGP4(product UTC).
- Prepared ISS state records which live provider supplied the TLE. Origin remains live/cached-live/fixture; fixture never paints as the current ISS.
- NASA Space-Track and other authenticated ephemerides are not adopted here.

## Consequences

**Good.**

- First enable can succeed from the secondary within one bounded cycle when CelesTrak is blocked.
- TLE download cadence matches CelesTrak’s published update cycle instead of 60 requests/hour.
- Provenance can name the actual provider.

**Costs.**

- When the primary hangs until timeout, first paint includes that timeout before failover (~8 s plus secondary latency).
- Two live authorities can differ slightly in TLE epoch; SGP4 still uses whichever set was stored.
- Where the ISS at is rate-limited (~350 requests / 5 minutes); the 2-hour cadence stays well under that.

**Explicitly not decided.** Durable last-good TLE cache, TLE history, user-selectable providers, and a generic multi-source acquisition framework remain later work.
