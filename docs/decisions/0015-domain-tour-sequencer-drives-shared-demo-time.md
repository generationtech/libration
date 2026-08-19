# 0015 — Domain tour sequencer drives shared Demo time

- **Status:** Accepted
- **Date:** 2026-08-18 (record written with [LIB-047](../work/LIB-047-eclipse-tour-demo-playback.md))

## Context

Libration already has one product clock. Demo time substitutes the canonical UTC instant ([ADR 0004](0004-one-canonical-utc-instant-per-frame.md)); it does not add a parallel clock. Eclipse astronomy is a bundled offline authority ([ADR 0008](0008-bundled-nasa-solar-eclipse-authority.md)).

Eclipse Tour needs to visit catalog events across years without simulating the empty months between them. A second `EclipseClock` / `TourClock` / alternate `TimeContext` would split product time and fight Demo transport on the Data tab.

Data/Demo must stay domain-neutral so later time-driven features can reuse the same clock.

## Decision

**A domain tour sequencer commands the existing Demo-time controller. It does not own a clock.**

Eclipse Tour:

- enumerates bundled solar/lunar catalog events for a configured range and filters
- writes Demo `data.mode`, `data.demoTime.enabled`, and `data.demoTime.startIsoUtc` (current-event lead-in)
- posts the existing pause / resume / reset transport
- jumps between events instead of playing dead calendar time

Everything downstream continues to believe product time changed normally. Eclipse rendering, forecast horizons, layer masters, and live-only dynamic layers are unchanged.

Tour configuration lives under Layers → Eclipse, not on Data/Demo. Runtime tour phase is session-only and starts inactive.

## Consequences

**Good.**

- One product clock remains. Data/Demo and Eclipse Tour cannot drift: they share Demo start, speed, and pause.
- Eclipse astronomy stays in the existing authority. The tour is navigation, not a simulator.
- Later domains can follow the same pattern without a generic EventTour framework.

**Costs.**

- Data/Demo still exposes generic start/speed/pause. Manual Demo start edits and Demo becoming inactive deactivate the tour so two sequencers do not fight.
- Event jumps are visible calendar discontinuities. That is intentional.

**Explicitly not decided.** A generalized `EventTourFramework<T>` for non-eclipse domains.
