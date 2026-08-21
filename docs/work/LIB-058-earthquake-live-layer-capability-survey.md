# LIB-058 — Earthquake live layer capability, data, UX, and architecture survey

| Field | Value |
|-------|-------|
| ID | LIB-058 |
| Status | proposed |
| Created | 2026-08-21 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item.

## Objective

Document what the existing USGS earthquake live layer does, which provider fields survive the pipeline, which presentation/config capabilities already exist, and which enhancements are architecturally natural versus deferred. Planning evidence for later earthquake LIBs.

## Scope

**In scope**

- Repository reconnaissance of the earthquake pipeline, config, Layers UI, live-only policy, fixture fallback, tests.
- One live USGS `all_day.geojson` sample plus USGS GeoJSON / ComCat / FDSN documentation consulted as provider truth (distinct from repository truth).
- Structured survey in this work item.

**Out of scope**

- Any production source, config-schema, network, layer, renderer, asset, or dependency change.
- Filters, marker restyle, fallback removal, clustering, historical API, notices, detail panels, polling changes, proxy.
- Activating this item or creating an approved implementation LIB.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md)
- [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)

## Acceptance criteria

- Repository confirmed AWAITING SCOPE at start.
- Structured survey covering the requested sections.
- No production source changes.
- This item remains `proposed` unless a human approves it.
- `docs/STATE.md` stays AWAITING SCOPE.

## Verification plan

- Focused tests: none (survey-only)
- Full suite: no
- Type-check: no
- Build: no
- Visual verification: no — live feed inspected via HTTP fetch and code; Canvas paint not measured in-browser

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md) — awaiting-human-decision pointer only

## Completion record

Leave empty until a human approves and this survey is formally closed, or until a later approved item supersedes it. The structured survey below is the investigation record.

---

# Structured survey

Recorded 2026-08-21. Live payload: USGS `all_day.geojson` generated `2026-08-21T14:55:32Z`, **292** features, **208 535** bytes.

## 1. Verdict

**EARTHQUAKE LIVE LAYER INVESTIGATION COMPLETE**

The live layer is real, not a stub. USGS already supplies a rich summary GeoJSON. Libration preserves almost all *properties* in the snapshot, then throws away nearly everything at presentation: every event is labeled, color is a fixed orange, depth is dropped from geometry, age is unused, and fixture fallback can silently replace a live map with four canned events marked `ready`. The smallest high-value next implementation is provenance honesty plus local magnitude/label controls on the existing `all_day` feed — not a new provider.

## 2. Repository state

At investigation start: [`docs/STATE.md`](../STATE.md) **AWAITING SCOPE**. Last completed [LIB-057](LIB-057-milky-way-viewing-event-simplification-and-geography.md). No active item. Proposed [LIB-037](LIB-037-iss-propagation-timestamp-audit-and-ground-track-correction.md) remains proposed.

This item is drafted `proposed` only. It is **not** activated.

## 3. Current pipeline

```
Layer master `earthquakes` (AppConfig.layers + SceneConfig row)
  → updateConfig / commitWorkingV2Update
  → syncDynamicLifecycleConsumers / armDynamicLifecycleConsumers
  → host.ensureEarthquakesConsumer (if enabled AND product time live-enough)
  → createEarthquakesLiveHttpAcquisitionAdapter (browser fetch)
  → MemoryDynamicSnapshotStore.put (kind pointFeatures)
  → lifecycle markReady
  → pointFeaturesMaterializer.noteStoreEntry
  → per-frame attachForProductInstant.getPreparedPointFeatures
  → createDynamicPointFeaturesOverlayLayer.getState
  → CanvasRenderBackend → buildDynamicPointFeaturesRenderPlan
  → executeRenderPlanOnCanvas
```

| Stage | Types / fields | Ownership | Caching / timing / failure |
|-------|----------------|-----------|----------------------------|
| Config | `layers.earthquakes: boolean` (factory `false`); Scene row `id: "earthquakes"`, `source.kind: "dynamicPointFeatures"`, `sourceId: "usgs-earthquakes-v1"`, `enabled: false`, `order: 3.5`, `opacity: 0.95` | `appConfig.ts`, `sceneConfig.ts`, `librationConfig.ts` persistence | Durable enablement only. URL never persisted. DEV `?scenario=` forces off. |
| Layer master | Layers → Layer masters checkbox “Earthquakes”. No dedicated topic. Live-only hint shared with clouds/ISS. | `LayersTab.tsx` | Checkbox stays enabled at historical Demo; presentation suppressed. |
| Lifecycle arming | `armDynamicLifecycleConsumers`; `productTimeLiveEnough` from ADR 0013 ±5 min | `dynamicDataLifecycleHost.ts`, `App.tsx` | Enable + live-enough → `ensureEarthquakesConsumer({ runImmediately: true })`. Else `stopPeriodic` (cache kept). |
| Acquisition | Live HTTP `all_day.geojson`; parse → `DynamicPointFeature[]` | `earthquakesAcquisition.ts`, `liveHttpAcquisition.ts` | 5 min `setInterval`; immediate first fetch; no timeout; no retry/backoff. Overlap coalesced via `inFlight`. Abort does not fixture-fallback. |
| Snapshot storage | `DynamicSnapshotRecord` meta + `pointFeatures` body; optional raw `payloadBytes` | `MemoryDynamicSnapshotStore` | All versions retained in memory. No eviction. `versionId` = `earthquakes-live-${acquiredAtMs}`. |
| Resolver | Nearest `validTimeMs` to product instant; no max distance | `dynamicSnapshotResolver.ts` | Never fetches. Snapshot `validTimeMs` = USGS `metadata.generated` or acquire clock. |
| Materializer | `PreparedPointFeaturesView` clones features + freshness | `dynamicPointFeaturesMaterializer.ts` | Indexes on lifecycle `ready`. Freshness bridged from manager (`ready`/`stale`/`error`/`loading`). |
| Layer | Maps features → markers (`id`, lon/lat, `label`, `magnitude`, night veil) | `dynamicPointFeaturesOverlayLayer.ts` | Invisible if no prepared view or `features.length === 0`. Does not filter by mag/age/type. |
| RenderPlan | 2 `path2d` discs + optional `text` per event | `sceneDynamicPointFeaturesPlan.ts` | No clustering, collision, or dateline wrap copies. |
| Canvas | Dispatch on layer `type: "points"` | `canvasRenderBackend.ts` | Scene viewport clip. Backend has no product knowledge. |

Presentation of current-only sources is suppressed when product time is not live-enough (`getPreparedPointFeatures` returns null). Store snapshots remain.

## 4. Provider

**Repository truth**

- Exact URL: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`
- Durable id: `usgs-earthquakes-v1`
- Accept: `application/json`, `application/geo+json`
- Direct browser `fetch` (`globalThis.fetch`). No production proxy. Injectable `fetchFn` exists for tests / possible desktop bridge (unused in production).
- Cadence: 5 minutes (catalog `defaultRefreshIntervalMs`). USGS feed itself claims past-day updates every minute.
- No HTTP timeout passed (ISS uses 8 s; earthquakes do not).

**Observed live fetch 2026-08-21** (provider + transport, not in-repo)

- HTTP 200, **208 535** bytes, `Content-Type: application/json; charset=utf-8`
- `Access-Control-Allow-Origin: *` (CORS open)
- `Cache-Control: public, max-age=60`
- metadata: title “USGS All Earthquakes, Past Day”; `api: "2.7.0"`; `count: 292`
- Time to first byte ~0.2 s from this environment

**External USGS documentation** (not repository)

- GeoJSON summary format; past hour/day/week/month feeds updated every minute
- Feed Life Cycle Policy: production `v1.0` (1.0.17). No API key. No numeric rate limit found in the policy page; USGS FDSN docs tell automated apps to prefer these real-time GeoJSON feeds over the search API for current display
- License (catalog): U.S. Government work / public domain

## 5. Provider field inventory

USGS GeoJSON summary feature (schema from USGS GeoJSON docs + live sample 2026-08-21). `title` is present on every live feature even though the abbreviated geojson.php listing omits it.

| Field | Where | Notes |
|-------|-------|--------|
| `id` | Feature | Preferred event id; USGS says it **may change**; see `ids` |
| `mag` | properties | Official magnitude; may be negative |
| `place` | properties | Named place / Flinn-Engdahl region |
| `time` | properties | Origin UTC ms |
| `updated` | properties | Last update UTC ms |
| `tz` | properties | Epicenter TZ offset minutes; **null on all 292** (effectively unused) |
| `url` | properties | USGS event page |
| `detail` | properties | Per-event GeoJSON detail URL |
| `felt` | properties | DYFI felt-report count; usually null |
| `cdi` | properties | Max DYFI intensity 0–10; usually null |
| `mmi` | properties | ShakeMap max MMI 0–10; usually null |
| `alert` | properties | PAGER `green`/`yellow`/`orange`/`red`; usually null |
| `status` | properties | `automatic` / `reviewed` / `deleted` |
| `tsunami` | properties | `1` or `0`. **Not a tsunami warning.** Large oceanic events only |
| `sig` | properties | Significance 0–1000 from mag, MMI, felt, estimated impact |
| `net` | properties | Preferred contributor network |
| `code` | properties | Network-assigned code |
| `ids` | properties | Associated event ids |
| `sources` | properties | Contributor list |
| `types` | properties | Associated product types |
| `nst` | properties | Station count |
| `dmin` | properties | Distance to nearest station (degrees) |
| `rms` | properties | Travel-time residual |
| `gap` | properties | Azimuthal gap (degrees) |
| `magType` | properties | `ml`/`md`/`mb`/`mww`/… |
| `type` | properties | `earthquake`, `quarry blast`, `explosion`, … |
| `title` | properties | Computed `"M x.x - {place}"` |
| longitude, latitude | `geometry.coordinates[0,1]` | GeoJSON lon/lat |
| depth km | `geometry.coordinates[2]` | **Not a properties field** |
| `bbox`, `metadata.*` | collection | `generated`, `url`, `title`, `api`, `count`, `status` |

Detail URL can add products (ShakeMap, DYFI full, moment tensor, PAGER details, etc.). Summary already carries `felt`/`cdi`/`mmi`/`alert`/`sig`/`url`/`tsunami`.

## 6. Field population statistics

Live `all_day` sample, n=**292**, generated 2026-08-21T14:55:32Z.

| Metric | Value |
|--------|-------|
| Magnitude min/max | **−0.92 / 6.7** |
| Magnitude null | **0** |
| Depth min/max km | **−2.84 / 511.6** (all 292 have coords[2]) |
| Missing place / title | **0 / 0** |
| felt / cdi / mmi populated | **11 / 11 / 8** |
| alert populated | **4** (all `green`) |
| tsunami=1 | **0** |
| tz non-null | **0** |
| status | automatic 136, reviewed 156 |
| type | earthquake 285, quarry blast 6, explosion 1 |
| magType | ml 197, md 62, mb 30, mww 2, mwr 1 |
| sig min/median/max | 0 / 35 / 729; sig≥600: **1** (M6.7 Peru) |
| age | 0.09–23.9 h; last 1h: 7; 3h: 43; 6h: 80; 12h: 140; 24h: 292 |
| Clusters (crude) | California **114**, Alaska **72**, Hawaii 14; max 1° bin **26** |
| Near dateline (±5°) | 8; lat > 70°: 0 |

Shallow <70 km: 268; intermediate 70–300: 22; deep ≥300: 2.

## 7. Data-loss audit

Classification: **A** snapshot **B** prepared view **C** rendering **D** discarded at parse **E** detail URL only **F** not needed now

| Field | Class | Notes |
|-------|-------|-------|
| Feature `id` | A B C | Marker identity |
| lon/lat | A B C | Placement |
| `properties.*` bag | A B | Cloned wholesale into prepared view |
| `mag` | A B C | Radius only |
| `title` (else mag) | A B C | Label text; live always has `title` |
| `place` | A B | Unused in render if `title` exists (always, in sample) |
| `time` / per-feature `validTimeMs` | A B | **Not used** for age, filter, or fade |
| `updated`, `url`, `detail`, `felt`, `cdi`, `mmi`, `alert`, `status`, `tsunami`, `sig`, `net`, `code`, `ids`, `sources`, `types`, `nst`, `dmin`, `rms`, `gap`, `magType`, `type` | A B | Present in snapshot/view; **unused in render/config** |
| `tz` | A B | Always null in sample |
| depth `coordinates[2]` | **D** | Parser reads only lon/lat. **Dropped.** Not copied into properties |
| collection `bbox` | D | Ignored |
| `metadata.generated` | A | Snapshot `validTimeMs` |
| `metadata.url/title/api/count` | D | Not copied onto snapshot meta (catalog attribution used instead) |
| ShakeMap grids, DYFI maps, moment tensors, finite fault | E | Detail/products |
| Origin live vs fixture | **D** | No stamp (unlike ISS) |

The important loss is **depth** (geometry) and **non-use** of an otherwise preserved properties bag.

## 8. Current presentation

Inspected in `sceneDynamicPointFeaturesPlan.ts` and the overlay layer. Not inferred.

- **Marker:** filled disc + halo ring. Screen-space circle, not a geographic radius.
- **Color:** fixed `rgba(255, 120, 72, …)` fill, dark brown stroke, cream halo. Night-veil **lift** increases alpha and stroke width. Color does **not** encode mag/age/depth/alert.
- **Size:** `r = clamp(2.5, 2.2 + mag×0.85, 10) × max(0.7, viewportWidth/1400)`. Linear in magnitude, then clamped. Missing mag treated as 3. Negative mag → 0 before scale → minimum 2.5 px.
- **Label:** USGS `title` when present (`"M 1.2 - 10 km ENE of Coso Junction, CA"`). Every live event in the sample is labeled. Color cream with dark halo. Size `clamp(8, 0.012×width, 11)` px, left of disc.
- **Items per event:** 2 path2d + 1 text = **3** when labeled; 2 if unlabeled.
- **Depth / age / selection / hover:** none.
- **Z-order:** scene `order` 3.5 — above city pins (3), clouds, eclipses, Milky Way; below ISS (3.6), planets, subsolar/sublunar markers.
- **Overlap:** painter’s order = feed order. No collision, clustering, or density cap.
- **Seam:** single `mapXFromLongitudeDeg`; **no** wrap duplicates. Labels `x + r + 4` can clip at the right edge. Scene viewport `clip()`.
- **Polar:** screen circles (no geodetic distortion of marker shape). No events above 70° in this sample.

## 9. Current config

User-facing earthquake-specific controls: **none beyond the Layer masters checkbox**.

- Factory default: **off**
- Persisted: `layers.earthquakes` boolean + scene row enablement/`sourceId`
- Row `opacity: 0.95` exists in SceneConfig, **not exposed**
- No mag/age/depth/alert/type filters
- Overlay-readability per-layer pilots do **not** include earthquakes
- Shared generic `dynamicPointFeatures` machinery (not earthquake-specific config)
- Layers status: ISS has loading/unavailable/degraded; **earthquakes do not**
- Data tab copy honestly says clouds/earthquakes use fixtures when live fetch fails; the map does not

## 10. Magnitude handling

Traced: USGS `properties.mag` → snapshot properties → prepared view → overlay `magnitude` → linear radius formula above.

Feasible without new provider: min-magnitude filter, magnitude bands, stronger size scale, label threshold, major-event treatment. All local on already-preserved `mag`. Do not switch feed solely to get a threshold.

## 11. Depth handling

**Does not survive materialization as a first-class field.** It is only in GeoJSON `coordinates[2]`, which the parser ignores. It does not appear in labels, color, or size.

Adding shallow/intermediate/deep encoding or a depth filter is a **small parser + prepared-view** change (copy depth km onto the point), not a new architecture. Keep magnitude visually dominant if depth is encoded (ring or secondary cue, not competing fill color).

## 12. Age handling

Per-event origin `time` is preserved as `validTimeMs` and `properties.time`. Snapshot `validTimeMs` is feed `generated`, not event age.

Age is **not** displayed, **not** used for alpha, **not** used for filtering. The feed is already a 24 h window. Age is a natural unused dimension.

## 13. Significance / alert / tsunami

**sig:** always populated (0–729 here). Combines magnitude, MMI, felt reports, estimated impact. Better than raw magnitude for “what matters to people” (felt M2.3 in Alameda vs offshore M5). USGS significant feed is a curated subset; this sample’s significant_day count was **1**.

**alert:** PAGER impact scale. Only 4/292, all `green`. Too sparse as a primary control; useful as rare decoration / notice threshold.

**tsunami:** USGS: flag `1` for large oceanic events; **does not mean a tsunami exists or a warning is in effect**; USGS is not the warning authority (NOAA). This sample: **0**. A tsunami-flag marker could be misread as an alarm. If used later: restrained decoration + NOAA-link semantics, not an alarm system.

## 14. Felt / CDI / MMI

- **felt:** DYFI report count. 11/292. Updates after publication (max update lag in sample ~20.7 h).
- **cdi:** max community intensity from DYFI. Same 11 events.
- **mmi:** ShakeMap instrumental intensity. 8/292.

Useful for details / “was it felt?” — not for default global symbology (too sparse). Values can change as DYFI/ShakeMap products arrive; 5 min polling will pick that up on the next summary snapshot.

## 15. Update / revision behavior

- `updated` preserved, unused.
- Same feature `id` in the next poll replaces the event in a **new snapshot version** (full collection replace). Markers/labels update on the next frame after materialize.
- USGS preferred `id` **may change**; `ids` lists aliases. Current code keys only `feature.id`.
- Events **disappear** when they age out of the past-day window (or if dropped from the feed). Next snapshot simply omits them.
- Polling naturally handles revisions **if live HTTP keeps succeeding**. If live HTTP fails, fixture fallback currently **succeeds** and can replace the live collection (see §17).

`stale-when-cached` never runs when fixture fallback returns `ok: true`.

## 16. Polling

- Interval: **5 minutes**
- Immediate acquisition on enable (`runImmediately: true`)
- Subsequent: `setInterval` (t=5, 10, …)
- Disable: `stopPeriodic` (abort in-flight; **keeps store/materializer cache**)
- Re-enable: another **immediate** fetch (unlike ISS, which can skip re-download when a ready live snapshot exists)
- Fetches in 10 minutes while enabled: **3** (t=0, 5, 10)
- Feed updates every **1 minute** with `max-age=60`. 5 min is provider-friendly and slightly stale vs USGS; justified vs ISS/CelesTrak rate pain. Do not speed up without need.

## 17. Failure / fallback / provenance

Production `useFixtureFallback: true`. Four canned worldwide events (Hawaii, Japan, Chile, Aegean), real GeoJSON shape, same `sourceId`.

| Situation | Behaviour |
|-----------|-----------|
| First fetch fails | Fixture stored as **success** / `ready`. Map shows 4 fake quakes |
| Later fetch fails after live success | Adapter still returns fixture success → **new version replaces latest**; live map can become 4 fixtures |
| Abort / disable | No fixture |
| Empty live collection | Layer invisible (`features.length === 0`); no empty-vs-down UI |
| Freshness on prepared view | Computed; **not shown** in Layers |

Fixture can be **visually mistaken for live data**. Catalog attribution mentions fixture fallback even on live snapshots. No origin stamp. Data tab copy is the only honest UX.

This is the largest trust defect, analogous to pre-LIB-036 ISS.

## 18. Live-only policy

Earthquakes remain `timePolicy: "wallClockCurrent"`.

At historical/future Demo:

- Checkbox **stays enabled** (durable preference not mutated)
- Acquisition **stops**
- Map **hides** (prepared view null; no fixture substitute)
- Hint: “Live-only data is hidden while viewing another product time.”
- Returning to now re-arms immediately without re-toggling

Confirmed in ADR 0013, `dynamicLiveTimeIntegrity.test.ts`, `LayersTab.test.tsx`, `VISUAL_VERIFICATION.md`.

## 19. Historical feasibility

**Separate future feature. Do not fold into live-layer enhancement.**

USGS FDSN Event API `https://earthquake.usgs.gov/fdsnws/event/1/query` supports `starttime`/`endtime`/`minmagnitude`/`format=geojson` (limit 20 000). Observed 2026-08-21: HTTP 200, CORS `*`, browser-feasible without a proxy. USGS tells automated apps to use real-time feeds for **current** display.

Architecture: new `timePolicy` (not `wallClockCurrent`), query keyed to product date, snapshot validity windows, rate/volume policy, empty-day UX. Would mix poorly with Demo astronomy playback. Remain deferred.

## 20. Feed variants

Confirmed USGS GeoJSON summaries:

| Window | all | M1.0+ | M2.5+ | M4.5+ | significant |
|--------|-----|-------|-------|-------|-------------|
| hour, day, week, month | yes | yes | yes | yes | yes |

URLs: `…/summary/{all\|1.0\|2.5\|4.5\|significant}_{hour\|day\|week\|month}.geojson`.

**Prefer one broad `all_day` fetch + local filtering.** Switching to `2.5_day` or `significant_day` would bake a threshold into transport, force a re-fetch to loosen it, and `significant_day` was **1** event on this date. Local filter keeps one payload and user control.

## 21. Magnitude threshold event counts

Same representative day (n=292):

| Threshold | Count |
|-----------|-------|
| all | 292 |
| ≥1 | 194 |
| ≥2 | 79 |
| ≥2.5 | 51 |
| ≥3 | 44 |
| ≥4 | 33 |
| ≥4.5 | 26 |
| ≥5 | 11 |

A later factory default in the **2.5–4** range would cut clutter sharply. Do not change factory behaviour in this survey.

## 22. Age threshold event counts

| Max age | Count |
|---------|-------|
| 1 h | 7 |
| 3 h | 43 |
| 6 h | 80 |
| 12 h | 140 |
| 24 h | 292 |

1 h is too sparse as a default. 6 h / 12 h / 24 h are useful optional caps. Age **fade** over 24 h is a presentation option (see recommended later phases).

## 23. Performance

Measured on the live 292-event payload in Node (not Canvas):

| Step | Cost |
|------|------|
| JSON parse | ~1.9 ms |
| Parse-to-points mimic | ~0.25 ms |
| Materializer clone | ~0.11 ms |
| Plan-item accounting | ~0.24 ms |

Typical RenderPlan: **876** items (584 discs + 292 labels). Synthetic 500 / 1000 / 2000 events: 1500 / 3000 / 6000 items; plan accounting still <2 ms. **Likely bottleneck is Canvas text + halo strokes**, not acquisition. Not verified in-browser. Labels-off would drop to 2 items/event.

Memory store retains every 5 min version (~200 KB + cloned features) with **no eviction**.

## 24. Clutter / label assessment

Every event is labeled with a ~36-character title. California 114 + Alaska 72 on a world equirect map. 14 one-degree bins have ≥5 events (max 26). ~200 of 292 events are M<2. Labels do not hide at small viewport (font only shrinks to 8 px). No collision. Dateline: no label wrap copies.

At ~200 labeled events the map is a text field, not an earthquake map. **Label-all is the primary readability failure.** Magnitude-scaled discs already exist and would be readable if labels were reserved for larger/significant events.

## 25. Clustering

Typical overlap is regional swarms (SoCal, Alaska), not a uniform global soup. Clustering would hide individual magnitudes — the one visual channel that already exists.

RenderPlan has **no** point-cluster primitive (only unrelated chrome “clusters”).

**Rank: later / likely unnecessary** if magnitude filter + label threshold ship. Reconsider only after those, on a swarm day.

## 26. Selection / detail feasibility

No map hit-testing, hover tooltip, or clicked-artifact panel exists (`pointerdown` / hit-test not present on the scene canvas). City pins are paint-only.

Richer details are **architecturally easy upstream** (properties already on the prepared view) and **hard in interaction** (would be new product infrastructure). Smallest later pattern: Layers status/detail block, or a selected-id carried in layer state then a chrome placard — not a new backend. USGS `url` is a plain https event page; opening it in web/Tauri would be straightforward **after** a selection policy exists. Do not add hover architecture in v1.

## 27. Interaction with other layers

Z-order 3.5: earthquakes sit on top of illumination, clouds, MW, eclipse geography, and **city pins**; under ISS, planets, and solar/lunar glyphs.

Orange discs + cream labels compete with eclipse warm reds, city pin labels, and night-side cream text. Solar night veil already lifts earthquake contrast on the dark hemisphere (good). Day-side orange on a lit map is weaker but still distinct from ISS/planet glyphs.

Recommendation: slightly **weaker hierarchy than now relative to city pins** if labels remain on; or keep z-order and **cut labels** so pins stay readable. Do not raise earthquakes above ISS.

## 28. Recommended config location

Follow the ISS pattern:

- **Layer masters:** on/off only
- **New Layers topic: Earthquakes** (not Advanced, not Data Event Playback)

Advanced is overlay-readability pilots; Data is demo time / event playback. Earthquakes are a live geographic overlay, like Space objects.

## 29. Top 3 high-value controls

1. **Minimum magnitude** (local filter on preserved `mag`)
2. **Label threshold** (or labels off except majors) — biggest readability win
3. **Maximum event age** (1/3/6/12/24 h) — uses already-stored origin time

Not in the top 3: tsunami-only, alert-only, felt threshold, region search (sparse or new UX). Event-type exclude (`quarry blast`) is a cheap extra, not a headline control.

## 30. Highest-value trust improvement

**Stop presenting fixture earthquakes as live**, and surface provenance (live / stale / unavailable / loading) on Layers, mirroring ISS LIB-036.

Without this, any filter UI still operates on possibly canned data.

## 31. Highest-value readability improvement

**Stop labeling every event.** Keep magnitude-scaled discs; label ≥ some magnitude or top-N by `sig`.

## 32. Recommended conservative next LIB

**Earthquake live honesty + local magnitude/label controls on the existing `all_day` feed.**

In scope (single implementation package, after human approval):

- Origin stamp on snapshots (`live` vs `fixture`), resolve upstream of RenderPlan
- Production: do not paint fixture as current earthquakes (hide + Layers unavailable), same policy family as ISS; keep fixture for tests/DEV
- `stale-when-cached` must actually apply (fixture success must not mask live failure when a live version exists)
- Layers hints: loading / unavailable / stale when the master is on and product time is live-enough (historical live-only copy still wins)
- Config on a new Layers → Earthquakes topic: **minimum magnitude** (local) and **label threshold** (local; “off” allowed)
- Keep USGS `all_day`; do not change cadence, URL, or add a proxy
- Depth still not required in v1 (parser still drops coords[2] unless a tiny carry-through is needed for later)

Out of scope for that item: clustering, historical FDSN, notices, playback, hover/select, alert/tsunami symbology, age fade, feed-variant picker.

## 33. Recommended later phases

**V2**

- Max age filter and/or 24 h alpha fade (size = mag, alpha = age) if user testing doesn’t confuse it with magnitude
- Parser copies depth; optional depth filter; restrained depth ring
- Selection/detail placard: mag, place, depth, UTC, age, felt, USGS link
- Optional `sig` / PAGER alert as secondary cues; exclude non-earthquake `type`s

**V3**

- Historical FDSN (new time policy; not Event Playback)
- Clustering only if filters still fail on swarm days
- Transient notices for rare high-`sig`/high-mag fresh events, with provenance gates
- Store eviction / timeout / backoff shared with clouds

## 34. Architecture risks

- Fixture-as-success bypasses `stale-when-cached`
- Unbounded in-memory snapshot versions
- Earthquake-specific presentation currently lives in a **generic** point-features plan (orange discs). Filters should resolve **upstream** of RenderPlan (layer/prepared view), not in the canvas backend
- Preferred USGS `id` can change
- Event notices and Event Playback families are astronomy-only; do not overload them
- Depth requires a parse contract change (not just UI)

## 35. Provider / API risks

- Summary schema `v1.0` is stable but `title` is undocumented in the short geojson.php list
- `tz` appears retired (always null)
- `tsunami` is easy to misread
- FDSN is the wrong tool for the live overlay (USGS says so)
- `all_month` / unconstrained historical queries can be huge (20k cap)
- No published numeric rate limit found; 5 min vs 1 min feed update is conservative
- Detail-per-event N+1 would be hostile; summary is enough for v1–v2

## 36. Not verified

- In-browser Canvas paint time / UI jank at 292–2000 events
- Tauri webview vs Chrome CORS/fetch (shell is non-load-bearing)
- USGS behaviour on `status: deleted` inside `all_day`
- Whether preferred `id` changes were observed live (docs say it can)
- Worst-day counts (this sample is one Friday, 292 events; aftershocks can be larger)
- Accessibility contrast measurements (qualitative only)
- Opening USGS `url` inside Tauri

## 37. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item stays **proposed**.
