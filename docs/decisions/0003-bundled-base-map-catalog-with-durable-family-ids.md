# 0003 — Bundled base-map catalog with durable family ids

- **Status:** Accepted
- **Date:** 2026-08-14 (record written during documentation modernization; the decision is visible in `src/assets/maps/base-map-catalog.json`, `src/config/baseMapCatalog.ts`, and the month/asset resolvers)

## Context

Libration ships eleven base-map families, including three month-aware Blue Marble families whose concrete raster changes with the calendar month. Assets are large, curated, and carry licensing obligations. Some are corrected for dateline roll or resampled during onboarding.

Two tempting alternatives existed:

1. **Scan `public/maps` at runtime** and infer the available set from filenames.
2. **Persist the resolved raster path** in configuration, since that is what actually gets drawn.

Both are simpler in the short term.

## Decision

Base-map inventory is declared in a **bundled JSON catalog** (`src/assets/maps/base-map-catalog.json`). The application never scans asset directories at runtime and never fetches a remote catalog.

Configuration persists the **durable family id** (for example `equirect-world-climate-koppen-beck-v1`). Concrete rasters — including the month-specific raster for month-aware families — are resolved at runtime from the catalog and the canonical product instant.

Catalog entries own preview thumbnails, structured attribution, licence notes, source links, and the readability capability hints consumed upstream.

## Consequences

**Good.**

- A configuration saved in one month resolves correctly in another. Assets can be re-encoded, re-derived, or relocated without invalidating saved state or presets.
- Inventory carries semantics a directory listing cannot express: family identity, month-awareness, projection contract, licensing, and capability hints.
- The shipped set is deterministic. What the user sees does not depend on what happens to be in a folder.
- Attribution and licensing have exactly one home, which matters because several sources require it.

**Costs.**

- Adding a family is a curation step, not a file drop. Tooling exists (`npm run maps:prep -- --update-catalog`), but there is a real workflow to follow, and manual additions of `licenseNote` and `sourceLinks` are still needed.
- Legacy ids must be maintained as resolver aliases rather than deleted, because they may exist in persisted configurations. `equirect-world-topography-v1` and `equirect-world-topo-v1` are aliases for the Blue Marble topography family and, confusingly, *not* for the static Natural Earth topography family. Renaming a family is therefore expensive.

**Generalization.** The same principle applies beyond base maps: the emissive composition catalog and the dynamic-data source catalogs follow it. Persist the durable id; resolve the artefact.
