# 0020 — Event playback merges enabled domain sources

- **Status:** Accepted. MW Viewing / Strong / Prime playback level filters superseded by [0021](0021-one-primary-milky-way-viewing-event.md).
- **Date:** 2026-08-19 (record written with [LIB-053](../work/LIB-053-multi-family-event-playback-and-mw-freeze-repair.md))

## Context

[ADR 0019](0019-domain-event-playback-belongs-to-data.md) placed event playback under Data. LIB-052 implemented that as a **selected event family** (`Eclipses` or `Milky Way`): only one family could sequence at a time.

That submode is the wrong product model. The user chooses which kinds of events belong to one timeline. Solar eclipses, lunar eclipses, and Milky Way viewing windows can all be enabled together. The sequencer should always advance to the next eligible event by UTC, regardless of family.

Separately, Milky Way Start froze the UI because playback enumerated every nightly window from the configured start through the ephemeris maximum (2499). Eclipse catalogs are small; MW windows are not.

## Decision

**Event playback is one chronological Demo-time stream over a set of enabled domain sources.**

There is no Event family selector. Durable prefs are a shared range, shared loop/lead-in/post-wait, and per-type enable flags (`solarEnabled`, `lunarEnabled`, `milkyWayEnabled`) plus MW level filters.

At each cursor the runtime asks each enabled source for its next (or previous) eligible event and chooses the earliest (or latest) by a deterministic order:

1. effective event start UTC
2. canonical peak / greatest-eclipse UTC
3. source rank (solar, lunar, Milky Way)
4. stable event id

Sources keep their own astronomy. This is a navigation seam only: `findNext` / `findPrevious`. Milky Way discovery is incremental (bounded search chunks) and must not enumerate centuries of nights to find the first event. Eclipse lookup uses the sorted catalog.

Forward playback never moves product time backward except Previous, Reset, loop wrap to the range start, or an explicit user date change. Overlapping events from different families may be active in the scene at the same UTC; the sequencer only chooses the navigation event and never rewinds to play both independently.

LIB-052 `{ family, eclipse, milkyWay }` configs migrate so the previously selected family remains the enabled set. Fresh configs may enable all three types.

This record supersedes ADR 0019 **only** for single-family selection. Data vs Layers ownership and the shared Demo clock are unchanged.

## Consequences

**Good.**

- Any combination of solar, lunar, and Milky Way events is one timeline.
- Next/Previous and automatic transitions cross families.
- Start remains responsive because MW search is incremental.

**Costs.**

- Full matching counts across centuries are not shown. Status uses `Event N` without `of M`.
- A reference-city change deactivates playback only when the Milky Way source is enabled.

**Explicitly not decided.** A generic astronomical event engine; per-family lead-in; multi-event status dashboard.
