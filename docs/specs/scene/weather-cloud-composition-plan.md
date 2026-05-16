# Weather and cloud participation — planning spec

## Status

**Planning artifact (Slice 2 queue D) — shipped; doc-finalized.** This document records boundaries, prerequisites, and sequencing for future weather and cloud participation in Libration. It does **not** authorize runtime implementation, new SceneConfig axes, or backend composition policy. **Default next PR** remains Phase 8 queue **A(2)** substrate onboarding when raster + rights exist; Slice 2 **B**/**C** when **A** is blocked; weather/cloud **code** waits on Phase 10.

**Authoritative scheduling:** [`PLAN.md`](../../../PLAN.md) (Agent session handoff, Slice 2), [`docs/ROADMAP.md`](../../ROADMAP.md) (Phases 6, 9, 10).

## Purpose

Libration is a precision time instrument with **upstream planetary illumination composition** (one illumination `rasterPatch` per frame) and a **RenderPlan execution boundary**. Weather and cloud data are desirable future scene participants, but they must not be bolted on as render-time fetches, backend blend modes, or isolated overlays that ignore canonical time and composition coherence.

This spec answers:

1. Where weather/cloud semantics **may** live relative to SceneConfig, resolvers, composition, layers, and backends.
2. What **must** ship before implementation (Phase 10 lifecycle).
3. What this planning slice **explicitly excludes**.

## Architectural anchors (non-negotiable)

From [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) and project rules:

| Rule | Implication for weather/cloud |
|------|-------------------------------|
| One canonical UTC instant per frame | All weather/cloud snapshots resolve against **product time** (and scrub/playback time when lifecycle exists)—not wall clock inside render. |
| SceneConfig is authoritative for scene content | Future enablement uses **durable semantic ids** and normalized scene subtrees—not ad hoc URLs or backend flags. |
| Composition policy is upstream | Attenuation, tint, and radiance participation are resolved before `RenderPlan`; backends execute primitives only. |
| No generalized compositor in the backend | No multi-pass Canvas compositor; no backend-owned weather policy. |
| Layers must not fetch during render | Acquisition, cache, stale/error, and versioned snapshots belong in **Phase 10 lifecycle**, prepared before layer state / RenderPlan build. |
| Base maps are substrates, not positional truth | Weather/cloud are **not** base-map families unless product explicitly scopes a static climatology **substrate** (Phase 8 pattern)—distinct from live or forecast **participation**. |

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

**Distinction:** Model C is Phase 8 queue **A**; Models A and B depend on Phase 10.

## Prerequisites (hard dependencies)

Implementation PRs for live or forecast weather/cloud (Models A and B) **must not** start until:

### 1. Phase 10 — Dynamic layer lifecycle foundation

[`PLAN.md`](../../../PLAN.md) Slice 5 / [`docs/ROADMAP.md`](../../ROADMAP.md) Phase 10 deliver at minimum:

- Lifecycle manager and acquisition modes (manual import, scheduled refresh, or other product-defined modes).
- Cache policies and **versioned state snapshots** bound to product time (and playback head when applicable).
- Loading, stale, and error surfaces **upstream** of render execution.
- Playback and scrubbed-time readiness so time scrub does not trigger fetch-in-render.

### 2. Data contract for prepared snapshots

Before coding composition or layers, define per product slice:

- Spatial reference (equirectangular full-world until projection system expands).
- Temporal alignment (analysis time vs valid time vs display instant).
- Raster vs vector vs grid representation.
- Redistribution rights and attribution (catalog or sidecar metadata).
- Maximum resolution and update cadence for desktop local-first use.

### 3. SceneConfig shape (future PR; not this planning slice)

When implementation opens, add **narrow** normalized subtrees—for example under `scene.layers[]` for Model B or `scene.illumination.*` for Model A—via explicit schema migration tests. Do not infer behavior from chrome or display-mode fields.

## Sequencing (recommended implementation order)

After this planning doc and Phase 10 foundations:

1. **Lifecycle MVP** — snapshot attach, stale/error, no network in render loop.
2. **One bounded layer or composition vertical** — e.g. single global cloud-opacity field **or** one radar layer family—not both in one PR.
3. **Overlay readability pass** — only if visual conflict with default stack is demonstrated.
4. **Additional products** — precipitation, wind, etc., each as catalog/lifecycle + layer or composition slice.

**Default macro PR track remains Phase 8** when queue **A** has a shippable substrate gap; weather/cloud **code** does not jump ahead of lifecycle unless session-scoped.

## Relationship to existing subsystems

| Subsystem | Relationship |
|-----------|--------------|
| Planetary illumination (`illuminationShading.ts`, emissive path) | Model A extends or modulates the **existing** continuous field; preserve single-patch contract unless deliberately revised. |
| Overlay readability | May need veil/lift adjustments when weather reduces substrate legibility; no emissive-style policy-only shortcut for dense radar without product rules. |
| Base-map catalog | Model C only; live weather is not a base-map selector concern. |
| Emissive night lights | Separate composition catalog; do not conflate city radiance with cloud albedo. |
| Month-aware base maps | Independent; product time still drives month resolution when both exist. |

## Explicit non-goals (this planning slice and immediate follow-ons)

Do **not** implement as part of queue **D** or the first weather/cloud code PR without reopening planning:

- SceneConfig keys for weather/cloud in this doc-only PR.
- Backend composition policy or Canvas-specific weather blending.
- Generalized multi-pass compositor abstraction.
- Live HTTP fetch during `requestAnimationFrame`, layer constructors, or RenderPlan build.
- Public plugin or third-party feed registry.
- Radar/temperature/wind **families** bundled without lifecycle and rights review.
- Replacing or re-deriving baseline twilight, moonlight, emissive, or eight-intrinsic substrate readability.

## Candidate future products (backlog pointer)

Retained in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md) — dynamic layers (radar, cloud cover, precipitation, wind, etc.). Each requires its own rights review, snapshot contract, and PR-sized vertical.

## Success criteria for **implementation** phases (not this doc PR)

- Product semantics resolved upstream; tests at resolver, composition, layer-state, or RenderPlan builder boundaries.
- Canonical UTC instant unchanged by display formatting; weather validity documented relative to product instant.
- Backend tests prove absence of SceneConfig inspection for weather behavior.
- Docs updated per [`.cursor/rules/050-docs-and-roadmap.mdc`](../../../.cursor/rules/050-docs-and-roadmap.mdc).

## References

- [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) — Planetary illumination composition; layer engine; renderer invariants.
- [`PLAN.md`](../../../PLAN.md) — Slice 2 (composition program), Slice 5 (lifecycle), handoff queue **D**.
- [`docs/ROADMAP.md`](../../ROADMAP.md) — Phases 6, 9, 10.
- [`docs/AI_COENGINEERING.md`](../../AI_COENGINEERING.md) — anti-pattern: live weather inside render.
