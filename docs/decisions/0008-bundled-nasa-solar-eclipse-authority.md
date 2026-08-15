# 0008 — Bundled NASA solar eclipse authority independent of ambient astronomy

- **Status:** Accepted
- **Date:** 2026-08-15 (record written with [LIB-014](../work/LIB-014-solar-eclipse-live-footprint.md); the decision is visible in `src/assets/eclipse/solar-eclipse-authority-v1.json`, `src/core/eclipse/`, and `tools/eclipse/generateSolarEclipseAuthority.ts`)

## Context

Libration already computes Sun and Moon positions for illumination, glyphs, tracks, and the analemma. Those series are visualization-grade. An eclipse overlay that asked them whether an eclipse was occurring, or that fitted a path to the glyphs, would look authoritative while being the wrong science.

A second temptation was to fetch NASA pages or a live almanac at runtime. That would put network I/O on the product-time path, make accelerated demo and offline use non-deterministic, and mix ephemeral HTML with event truth.

LIB-013 selected the authority class. LIB-014 put it in source: a versioned, provenance-bearing NASA/Espenak–Meeus Besselian asset, evaluated locally at the canonical product UTC.

## Decision

Solar eclipse **event truth** comes from a **bundled, versioned NASA-derived authority**, not from ambient Sun/Moon astronomy and not from a runtime network fetch.

The production asset (`src/assets/eclipse/solar-eclipse-authority-v1.json`) identifies `authorityId`, `authorityVersion`, NASA source identity, document/table references, SHA-256 of the ingest CSV, supported UTC interval, generation date, and attribution. Regeneration is an explicit development command (`npm run eclipse:prep`), not application startup.

Supported interval: `1900-01-01T00:00:00.000Z` inclusive to `2101-01-01T00:00:00.000Z` exclusive. Outside that span the authority reports **unsupported**. That state is not collapsed into “no eclipse.”

Ambient `subsolarPoint` / `sublunarPoint` remain the visualization-grade models for glyphs and illumination. They are not snapped to authority geometry.

## Consequences

**Good.**

- Demo time, pause, and direct UTC jumps evaluate the same offline polynomials. The render path never fetches eclipse data.
- Tests can pin `authorityVersion` and compare geography against the same NASA dump the asset was built from.
- A later NASA/ΔT revision is a version bump and fixture update, not a silent renderer regression.
- Canvas and `RenderPlan` stay free of Besselian, umbra, and NASA semantics.

**Costs.**

- Two Sun/Moon models coexist during an eclipse: authority geometry for the footprint, ambient series for glyphs. LIB-013 measured the residual as small at world-map scale; snapping glyphs is a later product decision.
- Adding years, refreshing ΔT, or changing the ingest source is a curation step with a SHA-256 pin, not a file drop.
- Lunar eclipse truth is selected in the Eclipse System spec but is not in this solar asset. E3 must ingest the lunar catalog separately behind the same support-span contract.

**Generalization.** Persist the durable authority id/version; resolve the artefact. The same rule already governs base-map families and dynamic-data source ids.
