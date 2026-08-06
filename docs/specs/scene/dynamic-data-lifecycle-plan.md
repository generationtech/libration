# Dynamic data lifecycle — Phase 10 plan

## Status

**Phase 10 complete (`P10-0`…`P10-7` shipped).** This document remains the authoritative contract for the dynamic data lifecycle foundation, the **`DLC-*`** consumer step tracker, and the **`DLU-*` live acquisition** step tracker. Runtime lives in `src/lifecycle/` (types, store, manager, resolver, acquisition, app shell host, equirect + cloud-opacity + point-features + tracks materializers). **`DLC-1` shipped** (Model B global clouds/IR). **`DLC-2` shipped** (Model B earthquakes point-features). **`DLC-3` shipped** (Model B ISS orbital tracks). **`DLC-4` shipped** (Model A cloud participation in planetary illumination). **Sequenced Post–Phase 10 table (`DLC-1`…`DLC-4`) complete.** **Default macro track:** **`DLU-*` live network acquisition** for the four shipped consumers (fixture → live adapter under the same durable `sourceId`s; **`DLU-1`/`DLU-2`/`DLU-3`/`DLU-4` shipped**; **Active: `DLU-5`**). Additional *new* dynamic consumers still need **explicit scope** (see `docs/FUTURE_FEATURES.md`); remaining Phase 8 / Phase 9 stay deferred unless scoped. Agents must update the **`DLU-*`** status table (and Progress log) when a live-acquisition step ships.

**Authoritative scheduling:** [`PLAN.md`](../../../PLAN.md) (Agent session handoff, Slice 5 / **Active step `DLU-*`**), [`docs/ROADMAP.md`](../../ROADMAP.md) (Phase 10 complete; After Phase 10 consumers; **After DLC — live acquisition**).

**Related:** weather/cloud *participation* models remain in [`weather-cloud-composition-plan.md`](weather-cloud-composition-plan.md). That doc does **not** replace this lifecycle plan. User-facing weather/cloud **layers** were **out of scope for Phase 10**; they shipped as **`DLC-1`…`DLC-4`**. Live HTTP (or equivalent) under those durable ids is **`DLU-*`**.

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

**Rule:** Phase 10 steps `P10-0`…`P10-7` are **all shipped**. Consumer verticals `DLC-1`…`DLC-4` are **all shipped**. Further default work uses the **After DLC — Live network acquisition** `DLU-*` table—each agent session implements **exactly one** live-acquisition step (the first whose status is not `shipped`). Update that table and `PLAN.md` Slice 5 when a step completes. Do not skip ahead without explicit human scope. New scene consumers beyond the four shipped rows still need explicit `DLC-*` (or equivalent) scope—not invented as filler during `DLU-*`.

| Step | Id | Status | Objective |
|------|-----|--------|-----------|
| 0 | `P10-0` | **shipped** | Planning/docs opened (this file + PLAN/ROADMAP sync). |
| 1 | `P10-1` | **shipped** | **Core types & contracts** — TypeScript types for snapshot kinds, temporal metadata, source ids, freshness enum; pure helpers + unit tests. No network, no UI. |
| 2 | `P10-2` | **shipped** | **Versioned snapshot store / cache** — local persistence API (put/get/list/evict by `sourceId`+`versionId`); tests with fixture bytes. |
| 3 | `P10-3` | **shipped** | **Lifecycle manager** — per-source state machine (`idle` / `loading` / `ready` / `stale` / `error`); subscribe/unsubscribe; tests. Still no product layer. |
| 4 | `P10-4` | **shipped** | **Product-time resolver** — `resolveSnapshot(sourceId, productInstantMs)` against the store; nearest-valid default policy; scrub-safe (read-only); tests. |
| 5 | `P10-5` | **shipped** | **Acquisition adapter + periodic refresh** — async acquisition interface; periodic scheduler; manual/file import path; prove no fetch on render path with tests. May use **recorded real-format** fixtures or a narrow free HTTP sample **into the cache only**—no scene overlay. |
| 6 | `P10-6` | **shipped** | **App shell seam** — wire lifecycle so shell/TimeContext (or equivalent) can attach manager + resolve by product time for **future** layers; still **no** user-facing dynamic overlay. Integration tests as practical. |
| 7 | `P10-7` | **shipped** | **Phase 10 closure** — docs mark Phase 10 complete; handoff opens **post–Phase 10 dynamic layer consumers**; sync ROADMAP/PLAN/AGENTS/README. |

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
- **P10-4 (shipped):** Product-time resolver in `src/lifecycle/` — `createDynamicSnapshotResolver` / `resolveSnapshot(sourceId, productInstantMs)` against `DynamicSnapshotStore`; nearest-`validTimeMs` default policy (optional `validUntilMs` window via existing pure helpers); optional lifecycle-manager freshness bridge; scrub-safe read-only (list/get only—no put/fetch); tests in `dynamicSnapshotResolver.test.ts`. No network, acquisition, shell seam, or UI.
- **P10-5 (shipped):** Acquisition controller in `src/lifecycle/` — `DynamicSnapshotAcquisitionAdapter`, `createDynamicAcquisitionController` (async `refreshNow`, `startPeriodic`/`stopPeriodic` via injectable `setInterval`—never `requestAnimationFrame`), manual/file `importSnapshot` into the versioned store, lifecycle loading/ready/error transitions, `createFixtureAcquisitionAdapter` with real-format JPEG fixtures; tests in `dynamicAcquisition.test.ts` prove scrub/resolve does not invoke adapters. No shell seam, scene overlay, or UI.
- **P10-6 (shipped):** App shell seam — `createDynamicDataLifecycleHost` wires store + lifecycle manager + product-time resolver + acquisition; `attachForProductInstant` builds a read-only `DynamicDataLifecycleAttachment` on `TimeContext` each tick (`App.tsx`); `getDynamicDataLifecycleAttachment` for future layers; tests in `dynamicDataLifecycleHost.test.ts` prove scrub resolve does not invoke adapters. Still **no** user-facing dynamic overlay or SceneConfig dynamic enablement.
- **P10-7 (shipped):** Phase 10 closure — all `P10-1`…`P10-7` marked shipped; public barrel smoke in `phase10LifecycleClosure.test.ts` (kinds/states + compose + scrub-safe host attach); docs/handoff point default macro track to **`DLC-*`** (next **`DLC-1`** global equirect clouds/IR). Still **no** user-facing dynamic overlay in Phase 10 exit.
- **DLC-1 (shipped):** First Model B global equirect clouds/IR consumer — durable source `global-clouds-ir-v1` + catalog attribution; SceneConfig row `globalCloudsIr` (`dynamicEquirectRaster`); sync equirect materializer + host `ensureGlobalCloudsIrConsumer`; fixture JPEG acquisition (real `image/jpeg`) with periodic refresh outside rAF; layer `createDynamicEquirectRasterOverlayLayer` reads prepared views only; Layers toggle; tests `dlc1GlobalCloudsIr.test.ts` / `dlc1GlobalCloudsIrScene.test.ts`. Next Active step: **`DLC-2`**.
- **DLC-2 (shipped):** Point-features earthquakes consumer — durable source `usgs-earthquakes-v1` + catalog attribution; SceneConfig row `earthquakes` (`dynamicPointFeatures`); sync point-features materializer + host `ensureEarthquakesConsumer`; USGS-shaped GeoJSON FeatureCollection fixture (real `application/geo+json`) with periodic refresh outside rAF; layer `createDynamicPointFeaturesOverlayLayer` reads prepared views only; Layers toggle; tests `dlc2Earthquakes.test.ts` / `dlc2EarthquakesScene.test.ts`. Next Active step: **`DLC-3`**.
- **DLC-3 (shipped):** Tracks ISS orbital consumer — durable source `iss-orbital-track-v1` + catalog attribution; SceneConfig row `orbitalTracks` (`dynamicTracks`); sync tracks materializer + host `ensureOrbitalTracksConsumer`; ISS-shaped GeoJSON timed LineString FeatureCollection fixture (real `application/geo+json`) with periodic refresh outside rAF; layer `createDynamicTracksOverlayLayer` reads prepared views only; Layers toggle; tests `dlc3OrbitalTracks.test.ts` / `dlc3OrbitalTracksScene.test.ts`. Next Active step: **`DLC-4`**.
- **DLC-4 (shipped):** Model A cloud participation in planetary illumination — SceneConfig `scene.illumination.cloudParticipation` (mode / durable `sourceId` / intensity; default off); sync cloud-opacity materializer (jpeg-js decode outside rAF) on the same `global-clouds-ir-v1` fixture as DLC-1; solar shading payload + `sampleIlluminationRgba8` / RenderPlan modulate one illumination `rasterPatch`; Layers controls; host arms clouds acquisition when Model A enabled even if Model B overlay is off; tests `dlc4CloudParticipation.test.ts` + SceneConfig normalization. Sequenced DLC table complete — handoff to **`DLU-*`** live acquisition.
- **DLU-0 (shipped):** Live acquisition planning/docs opened — default macro track = `DLU-*` for the four shipped consumers under durable ids; Active step **`DLU-1`**.
- **DLU-1 (shipped):** Visibility & render readiness — Canvas `drawLayer` now dispatches layer type `tracks` to `drawTracksLayer` (ISS orbital path was silent when tracks paint lived only under `points`); type-keyed seams for points vs tracks; tests `dlu1VisibilityRenderReadiness.test.ts`. Still fixture acquisition. Active step **`DLU-2`**.
- **DLU-2 (shipped):** Shared live HTTP acquisition seam — `fetchLiveHttpBytes` / `createLiveHttpAcquisitionAdapter` (abort, content-type checks, attribution carry-through, optional fixture fallback); controller `acquireFailurePolicy: "stale-when-cached"`; tests `dlu2LiveHttpAcquisition.test.ts` prove no fetch on resolve. Host consumers still fixture-backed. Active step **`DLU-3`**.
- **DLU-3 (shipped):** Live USGS earthquakes — `createEarthquakesLiveHttpAcquisitionAdapter` fetches `all_day.geojson` under durable `usgs-earthquakes-v1` (DLU-2 seam + fixture offline fallback); host `ensureEarthquakesConsumer` registers the live adapter; GeoJSON → point-features parse; tests `dlu3EarthquakesLiveAcquisition.test.ts`. Active step **`DLU-4`**.
- **DLU-4 (shipped):** Live ISS orbital track — `createIssOrbitalTrackLiveHttpAcquisitionAdapter` fetches CelesTrak GP TLE (`CATNR=25544`) under durable `iss-orbital-track-v1` via the DLU-2 live HTTP seam, propagates a timed geographic ground track (SGP4 / satellite.js) outside rAF, fixture offline fallback; host `ensureOrbitalTracksConsumer` registers the live adapter; tests `dlu4IssOrbitalLiveAcquisition.test.ts`. Active step **`DLU-5`**.

## Post–Phase 10 — Dynamic layer consumers (complete)

**Phase 10 exit criteria met.** The sequenced consumer verticals `DLC-1`…`DLC-4` are **shipped**. Additional *new* consumers (volcanoes, lightning, radar families, etc.) require **explicit scope**. Live network refresh for the shipped four is **`DLU-*`** (below)—not a fifth `DLC-*` id.

| Step | Id | Status | Objective |
|------|-----|--------|-----------|
| 1 | `DLC-1` | **shipped** | **First global equirect raster consumer** (clouds / satellite IR)—Model B scene layer; real free (or justified paid) source; SceneConfig enablement + attribution; periodic lifecycle acquisition. |
| 2 | `DLC-2` | **shipped** | Point-features consumer (e.g. earthquakes)—reuse lifecycle. |
| 3 | `DLC-3` | **shipped** | Tracks consumer (e.g. satellites/ISS or ADS-B)—reuse lifecycle. |
| 4 | `DLC-4` | **shipped** | Optional Model A cloud participation in planetary illumination (see weather-cloud plan)—explicit scope supplied by DLC consumer sessions. |

Phase 11 (zoom/pan/tiles) may unlock denser regional products later; Phase 10/DLC/`DLU` assume equirect / global-or-simple-region first.

## After DLC — Live network acquisition (`DLU-*`) (active track)

**Product intent:** Replace fixture-only acquisition adapters with **periodic in-app live (network) acquisition** for the **already shipped** consumers, keeping durable SceneConfig `sourceId`s and the Phase 10 lifecycle boundary (no fetch in rAF / layer constructors / RenderPlan build). Fixture adapters remain acceptable as offline / test fallbacks when a step documents that policy.

**In-scope consumers (do not invent new scene rows in this track):**

| Scene / config surface | Durable `sourceId` | Snapshot kind |
|------------------------|--------------------|---------------|
| Layers `globalCloudsIr` (Model B) | `global-clouds-ir-v1` | `equirectRaster` |
| Layers `earthquakes` | `usgs-earthquakes-v1` | `pointFeatures` |
| Layers `orbitalTracks` | `iss-orbital-track-v1` | `tracks` |
| `scene.illumination.cloudParticipation` (Model A) | same `global-clouds-ir-v1` opacity field | cloud-opacity materializer on equirect |

**Rule:** each agent session implements **exactly one** `DLU-*` step — the first whose Status is not `shipped`. Update this table, Progress log, and `PLAN.md` Slice 5 **Active step** when a step completes.

| Step | Id | Status | Objective |
|------|-----|--------|-----------|
| 0 | `DLU-0` | **shipped** | Planning/docs opened (this section + PLAN/ROADMAP/AGENTS sync). Default macro track = live acquisition for the four shipped consumers. |
| 1 | `DLU-1` | **shipped** | **Visibility & render readiness** — enablement of the four shipped consumers must produce a clear on-map effect with fixture (or live) data: fix Canvas dispatch for layer type `tracks` (ISS path currently not drawn), harden any missing paint/composition seams, and tighten fixture presentation only as needed so Layers toggles are demonstrably visible. Tests at backend / layer / scene boundary. Still no live HTTP required. |
| 2 | `DLU-2` | **shipped** | **Shared live acquisition seam** — reusable in-app HTTP (or desktop-equivalent) acquisition helpers for lifecycle adapters: abort signals, content-type checks, error → lifecycle `error` / stale policy, attribution carry-through, optional fixture fallback hook. Prove no fetch on resolve / paint path. No per-source production feed swap yet unless trivial smoke. |
| 3 | `DLU-3` | **shipped** | **Live earthquakes** — swap / add production acquisition for `usgs-earthquakes-v1` (USGS real-time GeoJSON or equivalent free feed) under the same durable id; periodic refresh outside rAF; Layers `earthquakes` shows live points when enabled. |
| 4 | `DLU-4` | **shipped** | **Live ISS orbital track** — swap / add production acquisition for `iss-orbital-track-v1` (CelesTrak / TLE→ephemeris or equivalent free feed) under the same durable id; Layers `orbitalTracks` shows a live (or regularly refreshed) ground track when enabled. Depends on `DLU-1` draw path. |
| 5 | `DLU-5` | pending | **Live global clouds / IR** — swap / add production acquisition for `global-clouds-ir-v1` (rights-cleared free equirect cloud/IR mosaic or justified paid source) under the same durable id; Layers `globalCloudsIr` shows live (or regularly refreshed) equirect when enabled. |
| 6 | `DLU-6` | pending | **Live Model A cloud participation** — ensure `scene.illumination.cloudParticipation` consumes the **live** `global-clouds-ir-v1` opacity field (same materializer / host arming); verify illumination `rasterPatch` updates when live clouds refresh; tests at materializer + illumination boundary. |
| 7 | `DLU-7` | pending | **DLU closure** — mark live track complete for the four consumers; sync README/PLAN/ROADMAP/AGENTS; document offline/fixture fallback and next frontiers (new `DLC-*` consumers or Phase 11). |

### DLU step completion checklist (every step)

1. Implement only that step’s objective.
2. Add/adjust tests at the lifecycle / acquisition / layer / RenderPlan boundary as appropriate.
3. Set the step **Status** to `shipped` in the `DLU-*` table.
4. Update `PLAN.md` Slice 5 “Active step” pointer to the next pending id (or “none pending” after `DLU-7`).
5. Brief note under **Progress log** above.
6. Do **not** start the next step in the same session unless the human explicitly asks.

## Success criteria (Phase 10 complete)

- All steps `P10-1`…`P10-7` marked **shipped**. ✅
- Tests prove: store, manager states, product-time resolve, acquisition outside render. ✅ (`src/lifecycle/*` + `phase10LifecycleClosure.test.ts`)
- Docs and handoff point to **DLC** consumer track—not Phase 8/9 filler. ✅
- No user-facing dynamic overlay required for Phase 10 exit. ✅

## Success criteria (DLU live acquisition — in progress)

- All steps `DLU-1`…`DLU-7` marked **shipped**.
- Shipped consumers refresh from live (or documented rights-cleared) network sources under the same durable ids when online.
- No fetch inside rAF / layer constructors / RenderPlan build.
- Offline / fixture fallback policy documented and tested where applicable.

## References

- [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) — layers must not fetch during render.
- [`PLAN.md`](../../../PLAN.md) — Slice 5; agent handoff; **Active step `DLU-*`**.
- [`docs/ROADMAP.md`](../../ROADMAP.md) — Phase 10; post–Phase 10 consumers; After DLC live acquisition; Phases 11–13.
- [`weather-cloud-composition-plan.md`](weather-cloud-composition-plan.md) — Model A/B/C for weather specifically.
- [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md) — dynamic layer backlog.
