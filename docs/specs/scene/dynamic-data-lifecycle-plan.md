# Dynamic data lifecycle — Phase 10 plan

## Status

**Planning artifact — opened for Phase 10 execution.** This document is the authoritative step list and contract for the dynamic data lifecycle foundation. Implementation proceeds **one development step at a time**. Agents must update the **Development steps** status table when a step ships.

**Authoritative scheduling:** [`PLAN.md`](../../../PLAN.md) (Agent session handoff, Slice 5), [`docs/ROADMAP.md`](../../ROADMAP.md) (Phase 10).

**Related:** weather/cloud *participation* models remain in [`weather-cloud-composition-plan.md`](weather-cloud-composition-plan.md). That doc does **not** replace this lifecycle plan. User-facing weather/cloud **layers** are **out of scope for Phase 10**; they are the first **post–Phase 10** consumer track.

## Product intent (locked for this phase)

| Decision | Choice |
|----------|--------|
| Phase 10 exit | Lifecycle API + cache + product-time binding + tests. **No** user-facing dynamic layer ships in Phase 10. |
| Flexibility | Subsystem is **source- and product-agnostic**—weather is one future consumer among many. |
| First post–Phase 10 consumer bias | **Global equirect raster** (clouds / satellite IR)—contracts must not block points or tracks. |
| Snapshot kinds (designed in Phase 10) | **All three:** equirect raster, point features, tracks. |
| Data realism | Prefer **real free data** pipelines. No cosmetic fake weather as a product layer. Test fixtures may use **recorded real-format samples** from free sources. |
| Cost | Prefer free-for-personal-use sources; **paid services allowed** when benefit is clearly valuable. |
| Acquisition topology | **In-app async** (existing Tauri/app primitives). Buddy/sidecar converter **only if** in-app conversion is genuinely impractical. |
| Refresh model | **Periodic** in-app refresh (not per-frame). Cadence is source-defined; “as up to date as practical” without instantaneous loops. |
| Time alignment | Snapshots resolve against **canonical product UTC instant** (including scrub/demo). Display formatting must not change which snapshot is selected. |
| Persistence | Dynamic layer **enablement and durable source ids** belong in SceneConfig / presets when consumers ship. Cold-start **full refresh** of caches is acceptable. Phase 10 designs the seam; **does not** ship Layers UI or live overlays. |

## Architectural anchors (non-negotiable)

| Rule | Implication |
|------|-------------|
| One canonical UTC instant per frame | Lifecycle resolves snapshots for **product time**, not wall clock inside render. |
| No fetch in render | Acquisition runs outside `requestAnimationFrame`, layer constructors, and RenderPlan builders. |
| SceneConfig authority | Future consumers persist durable **source ids** and presentation—not ad hoc URLs in the backend. |
| RenderPlan boundary | Lifecycle prepares data; layers emit primitives; backends execute only. |
| Local-first desktop | Cache on disk; startup may re-acquire; offline/stale behavior is first-class. |

## Snapshot kinds (Phase 10 contract surface)

All three kinds are **designed and typed** in Phase 10. Runtime store/resolver must accept all three even if early acquisition adapters only exercise one kind in tests.

### 1. `equirectRaster`

- Full-world (or documented regional) equirectangular raster blob + metadata.
- Spatial contract: prefer −180…+180° longitude, documented if otherwise.
- Unlocks: clouds, satellite IR, radar mosaics, smoke, AQI rasters, etc.

### 2. `pointFeatures`

- Time-valid point (or small-geometry) feature collection + metadata.
- Unlocks: earthquakes, volcanoes, lightning, etc.

### 3. `tracks`

- Time-tagged positions / trajectories + metadata.
- Unlocks: aircraft, ships, satellites/ISS, etc.

### Shared temporal metadata (all kinds)

Each snapshot version must carry at least:

- `sourceId` — durable semantic id (not a raw CDN URL).
- `kind` — one of the three kinds above.
- `versionId` — opaque monotonic or content-addressed version.
- `acquiredAtMs` — when the app obtained the bytes.
- `validTimeMs` — instant the product represents (analysis/valid time as defined per source).
- Optional `validUntilMs` / coverage interval for forecast/stale rules.
- `attribution` / rights notes as sidecar or catalog fields (consumer track fills real catalogs).

## Product-time binding

Resolver API (conceptual):

`resolveSnapshot(sourceId, productInstantMs) → { status, snapshot | null, freshness }`

Rules:

- Selection is driven by **product instant**, including scrubbed/demo time.
- Prefer the snapshot whose **valid time** is nearest to `productInstantMs` within source policy (exact rules per source later; Phase 10 implements a clear default: nearest `validTimeMs`, with optional `validUntilMs` window).
- **Freshness** exposes loading / ready / stale / error / missing for chrome or future UI—not for backend policy.
- Scrubbing must **not** trigger fetch-inside-render; acquisition is scheduled separately; resolver only reads the cache/store.

## Acquisition modes (Phase 10)

1. **Periodic in-app refresh (default path)** — async fetch/convert on a timer or explicit schedule; write versioned snapshots into the cache; never from the paint path.
2. **Manual / file import** — user or test harness supplies a prepared snapshot file (real-format sample OK).
3. **Buddy/sidecar (escape hatch only)** — documented as future option if a source cannot be converted in-app; **not** the default Phase 10 design.

Paid HTTP APIs are allowed later when valuable; they still enter through the same acquisition → cache → resolve path.

## Explicit non-goals (Phase 10)

- User-facing dynamic weather, radar, cloud, or other live overlays.
- SceneConfig Layers UI for dynamic sources (design notes OK; shipping keys deferred to first consumer unless a step explicitly adds inert schema).
- Backend composition policy or Canvas weather blending.
- Generalized multi-pass compositor.
- Fetch inside rAF / layer construction / RenderPlan build.
- Public plugin / third-party feed registry.
- Fake cosmetic weather as a shipped product layer.
- Replacing baseline illumination or overlay-readability contracts.

## Development steps (sequence through these)

**Rule:** Each agent session implements **exactly one** step—the first whose status is not `shipped`. Update this table and `PLAN.md` Slice 5 when the step completes. Do not skip ahead without explicit human scope.

| Step | Id | Status | Objective |
|------|-----|--------|-----------|
| 0 | `P10-0` | **shipped** | Planning/docs opened (this file + PLAN/ROADMAP sync). |
| 1 | `P10-1` | **shipped** | **Core types & contracts** — TypeScript types for snapshot kinds, temporal metadata, source ids, freshness enum; pure helpers + unit tests. No network, no UI. |
| 2 | `P10-2` | **shipped** | **Versioned snapshot store / cache** — local persistence API (put/get/list/evict by `sourceId`+`versionId`); tests with fixture bytes. |
| 3 | `P10-3` | **shipped** | **Lifecycle manager** — per-source state machine (`idle` / `loading` / `ready` / `stale` / `error`); subscribe/unsubscribe; tests. Still no product layer. |
| 4 | `P10-4` | pending | **Product-time resolver** — `resolveSnapshot(sourceId, productInstantMs)` against the store; nearest-valid default policy; scrub-safe (read-only); tests. |
| 5 | `P10-5` | pending | **Acquisition adapter + periodic refresh** — async acquisition interface; periodic scheduler; manual/file import path; prove no fetch on render path with tests. May use **recorded real-format** fixtures or a narrow free HTTP sample **into the cache only**—no scene overlay. |
| 6 | `P10-6` | pending | **App shell seam** — wire lifecycle so shell/TimeContext (or equivalent) can attach manager + resolve by product time for **future** layers; still **no** user-facing dynamic overlay. Integration tests as practical. |
| 7 | `P10-7` | pending | **Phase 10 closure** — docs mark Phase 10 complete; handoff opens **post–Phase 10 dynamic layer consumers**; sync ROADMAP/PLAN/AGENTS/README. |

### Step completion checklist (every step)

1. Implement only that step’s objective.
2. Add/adjust tests at the lifecycle/resolver/store boundary.
3. Set the step **Status** to `shipped` in this table.
4. Update `PLAN.md` Slice 5 “Active step” pointer to the next pending id.
5. Brief note under **Progress log** below.
6. Do **not** start the next step in the same session unless the human explicitly asks.

## Progress log

- **P10-0 (shipped):** Product decisions locked; three snapshot kinds specified; in-app periodic acquisition preferred; Phase 10 exit = lifecycle only; post–Phase 10 first consumer bias = global equirect raster (clouds/IR).
- **P10-1 (shipped):** Core contracts in `src/lifecycle/` — `DynamicSnapshotKind` (`equirectRaster` / `pointFeatures` / `tracks`), temporal meta, durable `sourceId` / `versionId`, freshness enum, resolve-result shape; pure helpers (`parseDynamicSnapshotTemporalMeta`, nearest-`validTimeMs` selection with optional `validUntilMs` window, kind-matched `buildDynamicSnapshotRecord`); tests in `dynamicSnapshotContracts.test.ts`. No network, store, manager, or UI.
- **P10-2 (shipped):** Versioned snapshot store in `src/lifecycle/` — `DynamicSnapshotStore` API (`put` / `get` / `list` / `evict` / `clear` by durable `sourceId`+`versionId`), entry prep helpers, `MemoryDynamicSnapshotStore` default backend; tests in `dynamicSnapshotStore.test.ts` with real-format JPEG (`jpeg-js`) and GeoJSON fixture bytes. No network, manager, resolver, acquisition, or UI.
- **P10-3 (shipped):** Lifecycle manager in `src/lifecycle/` — per-source state machine (`idle` / `loading` / `ready` / `stale` / `error`), validated transitions, `subscribe`/`unsubscribe`, `lifecycleStateToFreshness` bridge to resolve freshness; `createDynamicDataLifecycleManager`; tests in `dynamicLifecycleManager.test.ts`. No network, product-time resolver, acquisition, or UI.

## Post–Phase 10 — Dynamic layer consumers (planned track)

After `P10-7`, the default macro track becomes **consumer verticals** (still one PR at a time). Suggested order (adjust when sources/rights are confirmed):

| Step | Id | Status | Objective |
|------|-----|--------|-----------|
| 1 | `DLC-1` | pending | **First global equirect raster consumer** (clouds / satellite IR)—Model B scene layer; real free (or justified paid) source; SceneConfig enablement + attribution; periodic lifecycle acquisition. |
| 2 | `DLC-2` | pending | Point-features consumer (e.g. earthquakes)—reuse lifecycle. |
| 3 | `DLC-3` | pending | Tracks consumer (e.g. satellites/ISS or ADS-B)—reuse lifecycle. |
| 4 | `DLC-4` | pending | Optional Model A cloud participation in planetary illumination (see weather-cloud plan)—only with explicit scope. |

Phase 11 (zoom/pan/tiles) may unlock denser regional products later; Phase 10/DLC assume equirect / global-or-simple-region first.

## Success criteria (Phase 10 complete)

- All steps `P10-1`…`P10-7` marked **shipped**.
- Tests prove: store, manager states, product-time resolve, acquisition outside render.
- Docs and handoff point to **DLC** consumer track—not Phase 8/9 filler.
- No user-facing dynamic overlay required for Phase 10 exit.

## References

- [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) — layers must not fetch during render.
- [`PLAN.md`](../../../PLAN.md) — Slice 5; agent handoff.
- [`docs/ROADMAP.md`](../../ROADMAP.md) — Phase 10; post–Phase 10 consumers; Phases 11–13.
- [`weather-cloud-composition-plan.md`](weather-cloud-composition-plan.md) — Model A/B/C for weather specifically.
- [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md) — dynamic layer backlog.
