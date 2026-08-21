# Dynamic data lifecycle — current contract

This document owns the **current contract** for Libration's dynamic (time-varying, externally sourced) data subsystem: what a snapshot is, how snapshots are selected for product time, when acquisition may run, and what happens when a source is unavailable.

It is a specialized architectural document. It does not track development progress. The historical Phase 10 / `DLC-*` / `DLU-*` execution record, including the per-step progress log, is preserved in [`docs/history/dynamic-data-lifecycle-execution-2026-08.md`](../../history/dynamic-data-lifecycle-execution-2026-08.md).

Runtime lives in `src/lifecycle/`. For how the subsystem is wired into the application shell and the frame loop, see [`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md). For the invariants this contract depends on, see [`ARCHITECTURE.md`](../../../ARCHITECTURE.md).

## Purpose

The subsystem exists so that scene content can depend on data that changes over time and originates outside the repository, without any of the following leaking into rendering:

- network access on the paint path;
- wall-clock time as a substitute for product time;
- concrete feed URLs as persisted configuration;
- source-specific failure handling inside a backend.

It is deliberately **source-agnostic and product-agnostic**. Weather is one consumer among many.

## Snapshot kinds

A snapshot is an immutable, versioned unit of acquired data. Three kinds are defined and all three are accepted by the store, manager, and resolver (`src/lifecycle/dynamicSnapshotTypes.ts`, `dynamicSnapshotContracts.ts`):

| Kind | Payload | Spatial contract | Example consumers |
|------|---------|------------------|-------------------|
| `equirectRaster` | Full-world (or documented regional) equirectangular raster bytes | Prefer −180…+180° longitude, −90…+90° latitude; document any deviation | Cloud/IR mosaics, radar, smoke, AQI rasters |
| `pointFeatures` | Time-valid point or small-geometry feature collection | Geographic coordinates in the feature payload | Earthquakes, volcanoes, lightning |
| `tracks` | Time-tagged positions or trajectories | Geographic coordinates per sample | Satellites, aircraft, vessels |

### Shared temporal metadata

Every snapshot version carries at least:

- `sourceId` — durable semantic identifier. **Never** a raw feed URL. This is the only source identity that may be persisted in `SceneConfig`.
- `kind` — one of the three kinds above.
- `versionId` — opaque monotonic or content-addressed version.
- `acquiredAtMs` — when the application obtained the bytes.
- `validTimeMs` — the instant the data represents (analysis or valid time, defined per source).
- Optional `validUntilMs` / coverage interval, used for forecast and staleness rules.
- Attribution and rights notes, carried on the source catalog entry rather than invented per fetch.

## Source catalogs

Each snapshot kind has a bundled catalog of known sources (`dynamicEquirectSourceCatalog.ts`, `dynamicPointFeaturesSourceCatalog.ts`, `dynamicTracksSourceCatalog.ts`). A catalog entry owns the durable `sourceId`, a short UI label, attribution and licence text, the default refresh interval, and the spatial contract note.

Catalogs are the single place where a durable id is associated with human-facing provenance. Acquisition adapters own the transport; the catalog owns the identity and the rights statement.

## Product-time binding

Resolution is a read-only lookup against the store, driven by the canonical product instant:

```
resolveSnapshot(sourceId, productInstantMs) → { status, snapshot | null, freshness }
```

Rules:

- Selection is driven by the **product instant**, which includes demo-time and any future scrubbed time — not by wall clock and not by the time the bytes arrived.
- The default policy selects the snapshot whose `validTimeMs` is nearest to `productInstantMs`, optionally constrained by a `validUntilMs` window.
- `freshness` exposes loading / ready / stale / error / missing for chrome or future UI. It is presentation information. It must not be used by a backend to decide product behaviour.
- Resolution **never** triggers acquisition. Moving product time re-selects among cached versions; it does not fetch.

## Acquisition

Acquisition is asynchronous and always runs outside `requestAnimationFrame`, layer construction, and RenderPlan building. Three modes exist:

1. **Periodic in-app refresh** — the default. An adapter fetches and converts on an injectable timer, writing versioned snapshots into the store. Cadence is source-defined (`defaultRefreshIntervalMs` on the catalog entry).
2. **Manual / file import** — a user or test harness supplies a prepared snapshot. Recorded real-format samples are preferred over synthesised data.
3. **Sidecar / buddy process** — an escape hatch, documented for sources that genuinely cannot be converted in-app. Not currently used.

Paid or authenticated sources are permitted when the benefit is clear; they enter through the same acquisition → store → resolve path.

### Failure and offline policy

| Situation | Behaviour |
|-----------|-----------|
| Live acquisition fails (non-abort) and the adapter has a fixture fallback | The adapter returns the recorded real-format fixture **under the same durable `sourceId`**, so scene identity is unchanged. Production Clouds, earthquakes, and ISS do **not** enable this path. |
| Live Clouds/earthquake/ISS acquisition fails with no usable live snapshot | Overlay unavailable; no fixture substitution; Layers status is unavailable. Last-good **live** Clouds may still paint while observation age is ≤ 6 h. |
| Acquisition is aborted | Fixture fallback is **not** invoked. An abort is not a failure. |
| Refresh fails while a prior version is cached | The controller's `stale-when-cached` failure policy prefers the prior ready version over surfacing a hard error. Clouds presentation may still paint that live mosaic while observation age (`productUtcMs − validTimeMs`) is ≤ 6 h. Earthquake presentation may still paint that live snapshot while snapshot age is ≤ 60 min (status stale). |
| Nothing has ever been acquired | Resolution reports missing; consumers must render nothing rather than improvising. |
| Any resolve or paint | Never fetches. |

Fixture bytes are application-local test and demo content and are described as such in the catalogs. They are a fallback, not a product feature. Production must not present Clouds, earthquake, or ISS fixtures as live. DEV `?scenario=clouds` may paint a labeled fixture.

## Materialization

Acquired bytes are not consumed directly by layers. A **materializer** converts a snapshot into a prepared, synchronously readable view (`dynamicEquirectMaterializer.ts`, `dynamicPointFeaturesMaterializer.ts`, `dynamicTracksMaterializer.ts`, `dynamicCloudOpacityMaterializer.ts`). Clouds v1 decodes PNG and applies the IR→cloud-highlight transfer during acquisition/materialization, outside the frame. The unused Model A cloud-opacity materializer is not armed in production.

Layers read prepared views. If no prepared view exists for the current product instant, the layer contributes nothing.

## Lifecycle boundaries

| Boundary | Rule |
|----------|------|
| Render path | No fetch, no decode, no I/O. |
| `SceneConfig` | Persists enablement, durable `sourceId`, and presentation. Never URLs, never resolved snapshot versions. |
| Backends | See only the primitives a layer emitted. They have no knowledge that data was dynamic. |
| Lifecycle host | Owns store, manager, resolver, and acquisition wiring; attaches a read-only view to `TimeContext` per tick. |
| Consumers | Ask the attachment for a prepared view; they do not reach into the store or arm acquisition themselves. |

## Current consumers

Four consumers are wired today. Clouds use live NASA GIBS Band13 PNG with no production fixture fallback: first-ever failure is unavailable; a later failure may keep a prior live mosaic as stale while observation age is ≤ 6 h. Earthquakes use live USGS `all_day.geojson` with no production fixture fallback: first-ever failure is unavailable; a later failure may keep a prior live snapshot as stale while snapshot age is ≤ 60 min. Local magnitude/age/label/type filters are presentation over that snapshot. ISS uses live CelesTrak TLE with no production fixture fallback: CelesTrak failure with no usable live TLE hides the overlay.

| Scene / config surface | Durable `sourceId` | Kind | Live feed | Default refresh |
|------------------------|--------------------|------|-----------|-----------------|
| Layer `globalCloudsIr` (user-facing **Clouds**) | `global-clouds-ir-v1` | `equirectRaster` | NASA GIBS WMS Band13 GOES-West + GOES-East + Himawari PNG stack, explicit `TIME` | 10 min |
| Layer `earthquakes` | `usgs-earthquakes-v1` | `pointFeatures` | USGS `all_day.geojson` | 5 min |
| Layer `orbitalTracks` | `iss-orbital-track-v1` | `tracks` | CelesTrak GP TLE for CATNR 25544, propagated to a ground track via SGP4 | 2 h |

Clouds v1 does **not** arm acquisition from `scene.illumination.cloudParticipation`. Physical participation is forced off. Observational snapshots distinguish product time (`TimeContext.now`), observation time (`validTimeMs`), and acquisition time (`acquiredAtMs`); see [ADR 0022](../../decisions/0022-observational-data-three-clocks.md).

## Adding a consumer

A new consumer needs, at minimum:

1. A catalog entry with a durable `sourceId`, attribution, licence note, and refresh cadence.
2. An acquisition adapter. Production Clouds/earthquakes/ISS must not fixture-as-live; recorded fixtures remain for tests and DEV scenarios.
3. A materializer, or reuse of an existing one if the shape matches.
4. A `SceneConfig` row persisting enablement and the durable id — not the feed URL.
5. A layer that reads prepared views only.
6. Tests at the lifecycle, materializer, and layer boundaries, including a test that resolution does not fetch.

New consumers are product decisions and require explicit scope. Do not add feeds because the seam supports them.

## Related documents

- [`weather-cloud-composition-plan.md`](weather-cloud-composition-plan.md) — planning-only exploration of how weather may participate in composition (Model A / B / C).
- [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md) — speculative dynamic-data ideas.
- [`docs/history/dynamic-data-lifecycle-execution-2026-08.md`](../../history/dynamic-data-lifecycle-execution-2026-08.md) — how this subsystem was built.
