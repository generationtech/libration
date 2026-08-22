# Weather and cloud participation — planning spec

## What this document is

A **planning-only** specification. It defines where weather and cloud data may sit architecturally, and what must be true before any weather product is implemented. It is not a record of what exists.

**LIB-065 / LIB-067 / Clouds v3 production note.** Clouds remains **Model B** (informational overlay): per-sector GEO IR + EUMET ring backstop → local white/gray highlight → one composed `imageBlit`. Freshness outranks temporal uniformity ([ADR 0023](../../decisions/0023-observational-composites-heterogeneous-observation-times.md)). Each source keeps a **coverage mask** (provider valid-data) distinct from **cloud signal** (derived highlight). Valid-clear coverage replaces older cloud; the ring is a backstop only where regional coverage is absent. Physical **Model A** participation is forced off because IR display luma is not cloud optical depth. Current implementation truth is [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md). This document remains useful for weather products that do **not** yet exist — radar, precipitation, wind, pressure, polar LEO fill — because the architectural questions it answers apply to each of them.

## Weather freshness-over-synchronization (durable)

Weather presents the freshest authoritative observations available, independently by source, domain, and geography.

- Do not require all visible weather data to share one observation timestamp.
- Do not delay fresh data merely to synchronize with older sectors or other Weather domains.
- Do not interpolate invented meteorology to create one nominal global timestamp.
- Radar, lightning, wind analysis, and tropical/severe products (when approved) refresh independently of Clouds and of one another.
- Stale data is never disguised as current. Status reports the visible observation-age range.

This document does not authorize skipping the lifecycle contract, and it does not schedule anything.

## Purpose

Libration is a precision time instrument with **upstream planetary illumination composition** (one illumination `rasterPatch` per frame) and a **RenderPlan execution boundary**. Weather and cloud data are desirable future scene participants, but they must not be bolted on as render-time fetches, backend blend modes, or isolated overlays that ignore canonical time and composition coherence.

This spec answers:

1. Where weather/cloud semantics **may** live relative to SceneConfig, resolvers, composition, layers, and backends.
2. What **must** be true before implementation.
3. What is **explicitly excluded**.

## Architectural anchors (non-negotiable)

From [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) and project rules:

| Rule | Implication for weather/cloud |
|------|-------------------------------|
| One canonical UTC instant per frame | All weather/cloud snapshots resolve against **product time** (and scrub/playback time when lifecycle exists)—not wall clock inside render. |
| SceneConfig is authoritative for scene content | Future enablement uses **durable semantic ids** and normalized scene subtrees—not ad hoc URLs or backend flags. |
| Composition policy is upstream | Attenuation, tint, and radiance participation are resolved before `RenderPlan`; backends execute primitives only. |
| No generalized compositor in the backend | No multi-pass Canvas compositor; no backend-owned weather policy. |
| Layers must not fetch during render | Acquisition, cache, stale/error, and versioned snapshots belong in the **dynamic data lifecycle**, prepared before layer state / RenderPlan build. |
| Base maps are substrates, not positional truth | Weather/cloud are **not** base-map families unless product explicitly scopes a static climatology **substrate**—distinct from live or forecast **participation**. |

## Participation models (future; choose per product slice)

Weather and cloud can appear in more than one architectural role. Implementation PRs should pick **one** vertical and document which model applies.

### Model A — Upstream planetary composition participation (preferred default direction)

**Intent:** Cloud cover and some weather phenomena modulate **how the existing illumination field reads on the substrate** (additional attenuation, tint, or bounded radiance), consistent with twilight/moonlight/emissive—still contributing to or modulating the **same** upstream illumination path where product warrants it.

**Characteristics:**

- Resolved in specialized upstream modules (same class as `illuminationShading.ts`), not in `canvasPaintBridge`.
- Deterministic given: product instant, resolved snapshot id/version, SceneConfig policy, and bundled or lifecycle-prepared raster/grid inputs.
- Output remains compatible with **one** planetary illumination `rasterPatch` unless a scoped product change intentionally splits patches (requires explicit architecture review).
- **Overlay readability** may need composition-aware extensions when cloud/weather strongly competes with grid/markers—reuse `OverlayReadabilityFrame` patterns; do not sample weather rasters inside readability unless explicitly scoped.

**Examples (illustrative, not committed):** global cloud-opacity field reducing solar transmittance; storm-system tint bands; optional coupling to existing twilight atmospheric tint (constants or snapshot-driven—separate PRs).

### Model B — Projection-space scene layer (data-driven overlay)

**Intent:** Vector or raster weather products drawn **above** the base map but **below** or **among** astronomical overlays per stack order—e.g. radar reflectivity, wind barbs, isobars.

**Characteristics:**

- `SceneConfig` layer row with durable source id, presentation, and ordering.
- Layer state built from **lifecycle-prepared** snapshot (grid or image), not live HTTP in `create*Layer` or RenderPlan builders.
- RenderPlan: `imageBlit`, paths, or future grid primitives—backend executes only.
- Does **not** replace solar/twilight geometry; may coexist with Model A when product needs both composition modulation and explicit weather graphics.

### Model C — Static or climatology **substrate** (Phase 8 map inventory)

**Intent:** Long-horizon cloud climatology or similar as a **base-map family** (catalog onboarding, `maps:prep`, attribution)—user selects substrate, not live weather.

**Characteristics:**

- Follows [`docs/maps/MAP_ASSET_STRATEGY.md`](../../maps/MAP_ASSET_STRATEGY.md) and bundled `base-map-catalog.json`.
- Uses existing overlay-readability catalog hints where curated (`fineScaleTexture`, etc.).
- **Out of scope** for live/forecast participation; no lifecycle required beyond static asset validation.

**Distinction:** Model C is map curation. Models A and B depend on the dynamic data lifecycle.

## Prerequisites (hard dependencies)

Implementation of live or forecast weather/cloud (Models A and B) depends on:

### 1. The dynamic data lifecycle

Contract in [`dynamic-data-lifecycle.md`](dynamic-data-lifecycle.md). At minimum it must provide:

- a lifecycle manager and acquisition modes (manual import, scheduled refresh, or other product-defined modes);
- cache policies and **versioned snapshots** bound to product time;
- loading, stale, and error surfaces **upstream** of render execution;
- readiness for scrubbed and simulated time, so moving time does not trigger a fetch in render.

### 2. Data contract for prepared snapshots

Before coding composition or layers, define per product slice:

- Spatial reference (equirectangular full-world until projection system expands).
- Temporal alignment (analysis time vs valid time vs display instant).
- Raster vs vector vs grid representation.
- Redistribution rights and attribution (catalog or sidecar metadata).
- Maximum resolution and update cadence for desktop local-first use.

### 3. SceneConfig shape (future PR; not this planning slice)

When implementation opens, add **narrow** normalized subtrees—for example under `scene.layers[]` for Model B or `scene.illumination.*` for Model A—via explicit schema migration tests. Do not infer behavior from chrome or display-mode fields.

## Sequencing (recommended shape for any weather product)

Once the lifecycle prerequisites hold, a new weather product should proceed as:

1. **One bounded vertical** — a single layer family **or** a single composition contribution, not both in one change.
2. **Overlay readability pass** — only if visual conflict with the default stack is actually demonstrated.
3. **Additional products** — precipitation, wind, and so on, each as its own catalog, lifecycle, and layer-or-composition slice.

Each new product is a product decision requiring explicit scope. The existence of a working seam is not scope.

## Relationship to existing subsystems

| Subsystem | Relationship |
|-----------|--------------|
| Planetary illumination (`illuminationShading.ts`, emissive path) | Model A extends or modulates the **existing** continuous field; preserve single-patch contract unless deliberately revised. |
| Overlay readability | May need veil/lift adjustments when weather reduces substrate legibility; no emissive-style policy-only shortcut for dense radar without product rules. |
| Base-map catalog | Model C only; live weather is not a base-map selector concern. |
| Emissive night lights | Separate composition catalog; do not conflate city radiance with cloud albedo. |
| Month-aware base maps | Independent; product time still drives month resolution when both exist. |

## Explicit non-goals (this planning slice and immediate follow-ons)

Do **not** implement any of the following as part of a first weather/cloud change without reopening planning:

- Backend composition policy or Canvas-specific weather blending.
- A generalized multi-pass compositor abstraction.
- Live HTTP fetch during `requestAnimationFrame`, layer constructors, or RenderPlan build.
- A public plugin or third-party feed registry.
- Radar, temperature, or wind **families** bundled without lifecycle and rights review.
- Replacing or re-deriving the existing twilight, moonlight, emissive, or substrate-readability models.

## Candidate future products (backlog pointer)

Retained in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md) — dynamic layers (radar, cloud cover, precipitation, wind, etc.). Each requires its own rights review, snapshot contract, and PR-sized vertical.

## Success criteria for **implementation** phases (not this doc PR)

- Product semantics resolved upstream; tests at resolver, composition, layer-state, or RenderPlan builder boundaries.
- Canonical UTC instant unchanged by display formatting; weather validity documented relative to product instant.
- Backend tests prove absence of SceneConfig inspection for weather behavior.
- Documentation updated in the document that owns the changed truth, per [`AGENTS.md`](../../../AGENTS.md).

## References

- [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) — illumination composition, layer engine, renderer invariants.
- [`dynamic-data-lifecycle.md`](dynamic-data-lifecycle.md) — the contract any live weather product must satisfy.
- [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md) — what the scene and illumination subsystems currently do.
- [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md) — candidate weather products.
