# 0019 — Domain event playback belongs to Data

- **Status:** Accepted; single-family selection superseded by [0020](0020-event-playback-merges-enabled-domain-sources.md)
- **Date:** 2026-08-19 (record written with [LIB-052](../work/LIB-052-unified-demo-event-playback-and-milky-way-event-presentation.md))

## Context

[ADR 0015](0015-domain-tour-sequencer-drives-shared-demo-time.md) established that a domain tour sequencer commands the existing Demo-time controller and must not own a second clock. That clock decision remains.

LIB-047 placed Eclipse Tour controls under Layers → Eclipse so Data/Demo could stay domain-neutral. LIB-051 then added Milky Way Viewing Window status and **Go to next Prime** under Layers → Space objects → Milky Way. Three related time-navigation surfaces now existed: generic Demo under Data, Eclipse Tour under Layers, and Milky Way seek under Layers.

Domain-specific time travel under Layers topics mixes **what is rendered** with **when the product is viewed**.

## Decision

**Layers answers what is rendered. Data answers when the product is viewed.**

All event-playback and Demo-navigation controls live under Data:

- Data → Time: generic Demo (mode, arbitrary instant, shared speed, Start/Resume, Pause, Reset, Use current time)
- Data → Event playback: enabled event sources (solar eclipses, lunar eclipses, Milky Way viewing windows) that merge into one chronological stream by commanding the same Demo controller

Layers retain domain visibility, rendering, and presentation filters (including Milky Way viewing-event labels and eclipse map labels). Layers do not seek product time.

Event playback:

- persists durable preferences under `data.eventPlayback` (enabled types, shared range, MW levels, loop, lead-in, post-wait)
- reuses `data.demoTime.speedMultiplier` — no second speed field
- starts inactive; runtime index/phase is session-only
- does not require Layers presentation masters to be on
- does not redefine eclipse astronomy or Milky Way Viewing Window authority ([ADR 0018](0018-milky-way-viewing-window-is-a-reference-city-event.md))

This record supersedes ADR 0015 **only** for control placement (Layers → Eclipse). The shared-Demo-clock decision in ADR 0015 is unchanged. Single-family selection is superseded by [ADR 0020](0020-event-playback-merges-enabled-domain-sources.md).

## Consequences

**Good.**

- One product clock remains. Generic Demo, Eclipse playback, and Milky Way playback cannot drift.
- Layers panels stay about appearance. Data stays about product time.
- Later event families can add a Data adapter without a generic `EventTour<T>` engine.

**Costs.**

- Data hosts domain-specific filter rows (Solar/Lunar; Viewing/Strong/Prime). Those rows are navigation eligibility, not rendering.
- Eclipse subtype filters remain presentation-coupled for this item (LIB-047 behaviour preserved).

**Explicitly not decided.** A generalized astronomical event framework; Milky Way placard; Milky Way HUD status.
