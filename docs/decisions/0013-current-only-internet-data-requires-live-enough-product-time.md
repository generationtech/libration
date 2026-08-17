# 0013 — Current-only internet data requires live-enough product time

- **Status:** Accepted
- **Date:** 2026-08-16 (record written with [LIB-035](../work/LIB-035-dynamic-live-time-integrity-and-iss-position.md))

## Context

Libration’s scene meaning is one canonical product UTC instant per frame ([ADR 0004](0004-one-canonical-utc-instant-per-frame.md)). Dynamic snapshots are selected by that instant, outside the render path ([ADR 0005](0005-dynamic-data-acquisition-outside-the-render-path.md)).

The three production-optional live sources — NASA GIBS clouds/IR, USGS earthquakes, and CelesTrak ISS TLE — are **current-only** under their present implementations. They observe wall-clock-now reality (latest mosaic, past-day quakes, current TLE). Showing them on a 2017 eclipse scene or an accelerated future Demo would mix a historical/future product instant with 2026 internet observations.

Wall-clock comparison is one of the few places a second clock is legitimate: not as display authority, but as a validity gate for current-only feeds.

## Decision

**Current-only internet data may be displayed only when product time is sufficiently close to wall-clock now.**

- Product time (`TimeContext.now`) remains the scene and display authority.
- Wall-clock now is read once at the top of the frame (the same `Date.now()` already used to compute real vs demo time) and is used **only** to decide whether a current-only observation may coexist with that instant.
- The reusable test is `isProductTimeLiveEnough(productUtcMs, wallClockUtcMs)` in `src/core/liveProductTimePolicy.ts`. The inclusive tolerance is ±5 minutes and is not user-configurable.
- Catalog entries declare `timePolicy: "wallClockCurrent"` so the three sources are classified once, not inferred independently in each consumer.
- When product time is outside the window: presentation is suppressed (including cloud illumination participation); periodic acquisition stops; fixture data is not painted as a substitute; the user’s durable enabled preference is not mutated.
- Returning inside the window re-arms acquisition and restores presentation without requiring the user to toggle the layer again.
- Historical-capable sources may later declare a different `timePolicy`. That is a later item, not a license to treat the current three feeds as time-travelable.

## Consequences

**Good.**

- Demo 2017/2030 and accelerated playback stay temporally coherent: 2026 clouds, quakes, and ISS cannot ride along.
- Ordinary current-time use, and paused Demo still within ±5 minutes of wall now, continue to show live layers.
- Tests inject wall-clock and product instants; they do not depend on real `Date.now()`.

**Costs.**

- The frame loop must thread wall-clock now into the lifecycle attachment and into consumer arming. That is a narrow, named exception to “no wall clock downstream of time resolution,” not a second display clock.
- Current TLE cannot be propagated years away from epoch as a historical ISS reconstruction.

**Explicitly not decided.** Historical USGS querying, GIBS `TIME`, TLE history, production fixture-on-failure policy, retries/backoff, and a diagnostics framework remain later work.
