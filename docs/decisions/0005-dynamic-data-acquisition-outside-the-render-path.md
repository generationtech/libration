# 0005 — Dynamic data is acquired outside the render path and bound to product time

- **Status:** Accepted
- **Date:** 2026-08-14 (record written during documentation modernization; the decision is visible throughout `src/lifecycle/`)

## Context

Libration displays data that changes over time and originates outside the repository: cloud and infrared imagery, earthquake feeds, and satellite ground tracks. More such consumers are plausible.

The obvious implementation — a layer that fetches what it needs when it needs it — fails badly here for two independent reasons. It puts network latency and failure inside the paint path, and it implicitly binds data to *arrival* time rather than to the instant the frame is depicting. The second problem is subtle and only becomes visible during demo playback, when the rest of the scene moves through time and the data does not.

## Decision

Dynamic data is handled by a lifecycle subsystem that is entirely separate from rendering.

- **Acquisition** is asynchronous and periodic, on an injectable timer, never inside `requestAnimationFrame`, a layer constructor, or a `RenderPlan` builder. Cadence is per source.
- **Snapshots** are immutable and versioned, and carry explicit temporal metadata: `acquiredAtMs`, `validTimeMs`, and optionally `validUntilMs`.
- **Resolution** is a read-only lookup driven by the canonical product instant. It selects the snapshot whose valid time is nearest to that instant. It never triggers acquisition.
- **Materialization** — including image decode — happens outside the frame, producing prepared views that layers read synchronously.
- **Identity** is a durable `sourceId`. Feed URLs are never persisted in configuration.

## Consequences

**Good.**

- The frame stays a pure function of resolved state. A slow or failing feed cannot stall or tear a frame.
- Scrubbing and demo playback move data coherently with everything else, because snapshot selection uses the same instant as the illumination field and the tape.
- Offline operation is first-class. Every live adapter has a recorded real-format fixture fallback under the same durable id, so the scene's identity does not change when the network does.
- Failure policy is uniform (`stale-when-cached`: prefer the last good version over surfacing an error) rather than reinvented per source.

**Costs.**

- Adding a consumer is more work than a fetch: a catalog entry, an acquisition adapter, a materializer, a `SceneConfig` row, a layer, and tests at each boundary.
- Snapshots are held in a versioned store, which costs memory, and eviction policy is a real concern as sources grow.
- Fixture fallback means an offline session can silently display recorded data. This is deliberate and is documented in the catalogs, but it does mean "something is drawn" is not proof that a live feed worked.

**Non-obvious upside.** Because resolution is time-bound rather than latest-wins, the architecture already supports historical playback of dynamic data if snapshots are retained — that capability was not built for it, it falls out of the contract.
