# 0010 — Eclipse events are global; reference-city circumstances are derived

- **Status:** Accepted
- **Date:** 2026-08-15 (record written with [LIB-017](../work/LIB-017-reference-city-eclipse-circumstances.md))

## Context

Libration discovers and draws eclipses as world-map events. A natural product mistake is to treat the configured reference city as a filter: hide a solar path that the city cannot see, drop a lunar eclipse when the Moon is below the local horizon, or omit an `EclipseEvent` because the observer is in auto/fixed-longitude mode.

That would make the instrument provincial. The Eclipse System is global first. The reference city already exists as shared chrome state (top-band civil time, LIB-011 observer-oriented libration). E4 needs observer-specific contacts, magnitude, and altitude without creating a second observer or rewriting global event truth.

## Decision

**Eclipse events are global domain truth. Reference-city circumstances are a derived observer projection and never filter global event existence or geography.**

- `EclipseAuthority` / `EclipseEventService` resolve events from product UTC and the bundled NASA authority alone.
- Solar live footprint, solar forecast corridor, lunar Earth-shadow geometry, and lunar Moon-up visibility region do not take observer coordinates.
- `ReferenceCityEclipseCircumstances` is computed from an event + catalog-city lat/lon + product UTC. It is not persisted. It is absent when no catalog city is available.
- Presentation may say that an event is not visible from the city. It must not say that the event does not exist.

## Consequences

**Good.**

- A South American eclipse still appears when Knoxville cannot see it.
- Switching cities updates local contacts and chrome status without moving the path.
- Tests can assert identical global geometry objects across observers.

**Costs.**

- Two answers coexist: global type vs local type (a total eclipse is partial from most cities). UI copy must keep that distinction explicit.
- Circumstances need their own cache (event + observer), separate from corridor and live-footprint caches.
