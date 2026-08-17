# LIB-033 — Survey dynamic / internet-sourced layer support

| Field | Value |
|-------|-------|
| ID | LIB-033 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized survey-only item. Authorized to create, approve, activate, complete, and document in the same request. Do not implement features. Do not commit, push, tag, branch, or release.

## Objective

Determine the current state of Libration’s architecture and implementation for dynamic layers backed by off-product internet data sources, distinguish real vs stubbed layers, trace the data path, and recommend the smallest coherent next architecture/implementation step. Analysis only.

## Scope

**In scope**

- Repository reconnaissance of scene layers, dynamic-data lifecycle, networking, cache, freshness, product-time binding, config, tests, DEV scenarios, licensing, runtime boundary.
- Structured survey report in this work item’s completion record (and the chat response).
- `docs/STATE.md` and `docs/DEVELOPMENT_LOG.md` on completion.

**Out of scope**

- Any production source, test, config-schema, network, layer, renderer, asset, or dependency change.
- Adding network sources, credentials, or providers.
- Creating an implementation LIB.
- Committing, pushing, tagging, branching, or releasing.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — no network in the render path; dynamic data binds to product time.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)

## Acceptance criteria

- Repository confirmed AWAITING SCOPE at start; this survey item is the only active work.
- Complete structured survey covering the requested sections.
- No production source changes.
- No implementation LIB created.
- Final `docs/STATE.md` is AWAITING SCOPE.

## Verification plan

- Focused tests: none (survey-only)
- Full suite: no — documentation-only reconnaissance
- Type-check: no — no source changes
- Build: no
- Visual verification: no

## Documentation impact

- This work item
- `docs/STATE.md`
- `docs/DEVELOPMENT_LOG.md`

## Completion record

**Implementation summary**

Survey-only. No production source, tests, config, network, or assets were changed. Confirmed at start: `docs/STATE.md` was AWAITING SCOPE after LIB-032; no unrelated item was active. Created/activated this survey item under the human authorization in the request, then returned STATE to AWAITING SCOPE. No implementation LIB was created.

**Commands run**

None. Documentation-only reconnaissance; no `tsc`, `npm test`, or build.

**Actual results**

See the structured survey below. Headline: Libration already has a real dynamic-data lifecycle (ADR 0005) and three optional live internet consumers (clouds/IR, earthquakes, ISS), all default-off, with fixture fallback. They are not stubs. The largest remaining gap is product-time vs wall-clock policy plus failure UX, not a missing generic framework.

**Visual verification**

Not applicable (no rendered-output change).

**Not verified**

- Live CORS behaviour of USGS / CelesTrak / NASA GIBS in a real browser (no live fetch performed).
- Actual USGS `all_day` payload volume or GIBS WMS latency.
- Whether CelesTrak `text/plain` Content-Type always matches the adapter accept list in production.
- Whether GIBS returns a TIME-stamped “best” mosaic when the WMS URL omits `TIME`.
- Desktop Tauri webview networking vs Chrome (shell is non-load-bearing; not exercised).

**Discovered, not done**

- `docs/IMPLEMENTATION.md` §6 still says “thirteen known overlay ids” and omits `lunarEclipse` from the inline list; source `SCENE_STACK_LAYER_IDS` has fourteen entries including `lunarEclipse`.
- `src/App.tsx` comment still says “no dynamic overlay UI”; Layers tab already has master checkboxes for the three live overlays.
- Catalog comments still cite `docs/specs/scene/dynamic-data-lifecycle-plan.md`; the current contract is `dynamic-data-lifecycle.md`.

---

# Structured survey

## 1. Verdict

**DYNAMIC LAYER FOUNDATION READY FOR IMPLEMENTATION**

The acquisition → versioned snapshot store → product-time resolve → materializer → layer → `RenderPlan` → Canvas path already exists and is wired for three live consumers. The next work is product policy and hardening of those consumers (and only then new feeds), not a new generic framework.

## 2. Survey lifecycle

- Start: `docs/STATE.md` **AWAITING SCOPE**; last completed LIB-032; no active item.
- This item: LIB-033 created, human-approved in the request, activated, completed.
- End: `docs/STATE.md` **AWAITING SCOPE**. No implementation LIB created.

## 3. Current layer inventory

Classification key: **A** static bundled; **B** computed local dynamic (product time, no internet); **C** internet snapshot; **D** streaming/high-cadence; **E** remote raster/tile.

| Layer id | Label | Default on | Origin | Class | Implementation | Renders | Config UI | Tests | DEV scenarios | Attribution |
|----------|-------|------------|--------|-------|----------------|---------|-----------|-------|---------------|-------------|
| (base map, not stack row) | Base map | yes (`scene.baseMap.visible`) | Bundled catalog rasters | A | real | yes | yes (Map topic) | yes | yes (all) | catalog “Source & license” |
| `solarShading` | Solar shading | yes | Local illumination; optional Model A cloud opacity from `global-clouds-ir-v1` | B (+ C/E if participation on) | real | yes | yes (master + Illumination) | yes | yes | cloud catalog if participation on |
| `grid` | Grid | yes | Derived lat/lon | B (geometry) / static overlay | real | yes | yes | yes | yes | n/a |
| `staticEquirectOverlay` | Static equirect overlay | no | Bundled `/maps/world-equirectangular.jpg` | A | real (placeholder src = shipped equirect) | yes when on | master only | yes | no dedicated | none on row |
| `globalCloudsIr` | Global clouds / IR | no | NASA GIBS WMS JPEG; fixture fallback | C + E | real live + fixture | yes when on and prepared | master checkbox only | yes (lifecycle + scene) | forced **off** | catalog + snapshot meta; **not shown in Layers UI** |
| `solarEclipse` | Solar eclipses | yes | Bundled NASA authority | A + B | real | only when event relevant | yes (Eclipse topic) | yes | many eclipse scenarios | NASA/bundled authority docs |
| `lunarEclipse` | Lunar eclipses | yes | Bundled NASA authority | A + B | real | only when event relevant | yes | yes | several lunar scenarios | NASA/bundled |
| `earthquakes` | Earthquakes | no | USGS `all_day.geojson`; fixture fallback | C | real live + fixture | yes when on and features > 0 | master checkbox only | yes | forced **off** | catalog; **not in Layers UI** |
| `orbitalTracks` | ISS orbital track | no | CelesTrak TLE + in-app SGP4; fixture fallback | C (TLE) + local propagate | real live + fixture | yes when on and samples exist | master checkbox only | yes | forced **off** | catalog; **not in Layers UI** |
| `cityPins` | City pins | yes | Bundled city catalog + user pins | A + B (local times) | real | yes | Pins tab + master | yes | yes | n/a |
| `subsolarMarker` | Subsolar marker | yes | Local solar model | B | real | yes | master + readability | yes | yes | n/a |
| `lunarGroundTrack` | Lunar ground track | no | Local `sublunarPoint` samples | B | real | yes when on | master + Astronomy paths | yes | `lunar-track` | n/a |
| `lunarLocus` | Lunar locus | no | Local lunar model | B | real | yes when on | master + Astronomy paths | yes | `lunar-locus` | n/a |
| `sublunarMarker` | Sublunar marker | yes | Local lunar model | B | real | yes | master + Moon & libration | yes | `moon-libration` | n/a |
| `solarAnalemma` | Solar analemma (ground track) | no | Local subsolar locus | B | real | yes when on | master + Astronomy paths | yes | readability/night with overlay | n/a |

`heatmap` is a declared `LayerType` with no consumer and no Canvas dispatch arm (draws nothing). Chrome is not a scene layer.

Cloud **participation** is not a stack row: `scene.illumination.cloudParticipation` (default `off`) consumes the same `global-clouds-ir-v1` source.

## 4. Internet-backed layers today

Production-optional, **default off**:

1. **Global clouds / IR** — browser `fetch` of NASA GIBS WMS JPEG; 15 min cadence.
2. **Earthquakes** — browser `fetch` of USGS `all_day.geojson`; 5 min cadence.
3. **ISS orbital track** — browser `fetch` of CelesTrak TLE for NORAD 25544, then SGP4 ground track; 1 min cadence.

Ordinary factory startup fetches **nothing**. Acquisition arms from persisted enablement or a Layers toggle (`syncDynamicLifecycleConsumers` on startup and on config commit). DEV `?scenario=` forces all three plus cloud participation **off**.

Live failure (non-abort) falls back to a **recorded fixture under the same `sourceId`**, so the scene still draws. That is deliberate and documented; it is also the main UX hazard.

## 5. Clouds / IR status

- **Ids:** scene `globalCloudsIr`; source `global-clouds-ir-v1`.
- **Status:** real, production-optional, default off.
- **Source:** NASA GIBS WMS `MODIS_Terra_Cloud_Top_Temp_Day`, EPSG:4326, BBOX −180/−90/180/90, 2048×1024 JPEG. URL is code-owned, never persisted.
- **Format:** JPEG bytes → overlay blob/data URL; same bytes decoded with `jpeg-js` to luma opacity for Model A.
- **Projection:** assumed full-world equirect; no reprojection.
- **TIME:** WMS URL has **no `TIME`**. `validTimeMs` is acquire/wall clock, not imagery analysis time.
- **IR vs clouds:** one feed, two presentations. Overlay is the CTT JPEG; illumination uses luma as cloud opacity. Not two products.
- **Refresh:** 15 min `setInterval`; immediate on arm.
- **Config:** overlay master; Illumination topic mode `off|natural|enhanced|illustrative` + intensity 0–2. No refresh, opacity-slider, or source picker in UI (row opacity 0.45 exists on the scene instance).
- **Ordinary startup:** overlay off, participation off → no fetch.
- **Tests:** `dlc1`, `dlu5`, `dlu6`, `dlu7`, `dlc4`, scene test. No dedicated visual scenario.
- **Crossfade / alpha / seam:** none. JPEG has no alpha. Full-viewport blit.

## 6. Earthquakes status

- **Ids:** scene `earthquakes`; source `usgs-earthquakes-v1`.
- **Status:** real, production-optional, default off — **not a stub**.
- **Source:** `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`.
- **Model:** `DynamicPointFeature` (`id`, `lonDeg`, `latDeg`, optional `validTimeMs`, `properties`). Parser keeps USGS `mag`, `place`, `time`, `title`, and other properties; **depth is not modelled**. Time window is the feed’s past day, not a product-time window.
- **Render:** magnitude-scaled orange discs + labels; no filtering, clustering, or culling.
- **Refresh:** 5 min; immediate on arm.
- **Config:** master checkbox only. No magnitude threshold, age window, or refresh control.
- **Historical / demo:** snapshot `validTimeMs` is USGS `metadata.generated` or acquire time. Resolver picks nearest snapshot with **no max distance**, so a 2017 demo still shows the latest 24 h of (usually 2026) events. Per-feature `time` is not filtered.
- **Failure:** live fail → four synthetic worldwide events. Empty live collection → layer invisible (`features.length === 0`) with no “feed empty” vs “feed down” UI.
- **Tests:** `dlc2`, `dlu3`, scene test, DLU-1 render dispatch. No visual scenario.

## 7. ISS status

- **Ids:** scene `orbitalTracks`; source `iss-orbital-track-v1`.
- **Not local-TLE-only.** Live path fetches CelesTrak GP TLE (`CATNR=25544&FORMAT=TLE`), then SGP4 via `satellite.js` **outside rAF**.
- **Cadence:** 1 min TLE refresh. Track window: 75 min lookback + 15 min lookahead, 2 min samples, **centered on acquire/wall clock**, not `TimeContext.now`.
- **Render:** trail + tip disc + “ISS” label. Tip is the **last sample** (lookahead end, ~15 min after acquire), not an interpolated current position.
- **Product time:** prepared track is selected by snapshot `validTimeMs` ≈ acquire time. Samples are not re-propagated or interpolated to product instant. Demo 2017 still shows a 2026-shaped track if one snapshot exists.
- **Offline:** fixture GeoJSON LineString (not orbital truth).
- **Config:** master checkbox only.
- **Tests:** `dlc3`, `dlu4`, scene test, DLU-1 `tracks` dispatch (previously silent if typed as `points`).
- **Orbital prediction:** yes, but only around acquire time, not historical/demo instants.

## 8. Networking architecture

Reusable seam: `src/lifecycle/liveHttpAcquisition.ts` (`fetchLiveHttpBytes`, `createLiveHttpAcquisitionAdapter`).

| Concern | Current |
|---------|---------|
| Direct `fetch` | Yes, via injectable `LiveHttpFetchFn`; default `globalThis.fetch` |
| Wrapper | Yes — DLU-2 adapter |
| Retry / backoff / rate-limit | No |
| Timeout | No (`AbortSignal.timeout` unused) |
| Cancellation | `AbortController` on periodic stop / overlapping replaced interval |
| Overlap | `inFlight` map coalesces `refreshNow` |
| HTTP status | non-OK → `HTTP ${status}` |
| Content-Type | exact MIME after stripping parameters |
| Parsing | per adapter (JPEG SOI, USGS GeoJSON, TLE) |
| CORS | none in code; browser-direct to third parties |
| User-Agent / proxy / Tauri HTTP | none; comment allows a future desktop `fetchFn` |
| API keys | none; no `.env` |
| Offline | fixture fallback (default on) |

**Reusable ingestion layer: yes** (lifecycle + live HTTP seam). Not a generic SDK.

## 9. Refresh architecture

General scheduler: `createDynamicAcquisitionController` — injectable `setInterval`, never `requestAnimationFrame`. Cadence is catalog `defaultRefreshIntervalMs`. Host `ensure*` is idempotent (does not reset the timer every frame).

| Layer | Cadence | Timer owner | Disabled | Page hidden | Overlap | Retry | User-configurable |
|-------|---------|-------------|----------|-------------|---------|-------|-------------------|
| Clouds/IR | 15 min | acquisition controller | `stopPeriodic` | continues (no `visibilitychange`) | coalesced | next interval only | no |
| Earthquakes | 5 min | same | same | same | same | same | no |
| ISS | 1 min | same | same | same | same | same | no |

Cloud participation **or** overlay arms the same clouds timer. Abort does **not** invoke fixture fallback.

## 10. Product-time vs wall-clock behavior

Architecture (ADR 0004/0005) requires snapshot selection by canonical product instant. Implementation stores `acquiredAtMs` / `validTimeMs` and selects nearest `validTimeMs`.

Current live adapters mostly set `validTimeMs` from **wall clock** (`Date.now` / host `nowMs`). They do not request historical products. `validUntilMs` is unused in production adapters, so covering-window selection never applies; nearest-of-one always wins.

| Candidate | Latest-now vs product time | Historical request | `Date.now()` | Demo 2017 vs live 2026 | Suppressed in demo? | Live-only concept |
|-----------|----------------------------|--------------------|--------------|------------------------|---------------------|-------------------|
| Clouds/IR | latest GIBS (no TIME) | no | yes for validTime | 2017 scene + 2026 mosaic | DEV scenarios off; production demo **no** | no |
| Earthquakes | USGS last 24 h wall | no | acquire; generated if present | 2017 scene + 2026 quakes | same | no |
| ISS | TLE now, propagate around acquire | no | center of SGP4 window | 2017 scene + 2026 track | same | no |

Tension: demo/scrub astronomy is product-time-true; live overlays are wall-clock-true while still claiming product-time binding.

## 11. Freshness model

Present on lifecycle types: `idle|loading|ready|stale|error` and freshness `loading|ready|stale|error|missing`. Snapshots have `acquiredAtMs`, `validTimeMs`, optional `validUntilMs`. Policy `stale-when-cached`.

Absent as product UX: `observedAt`, `expiresAt`, `stale-but-usable` as a user state, loading/error chrome. Freshness is copied into layer `metadata` and **never shown**.

Minimum needed for near-live layers: `acquiredAtMs`, source/analysis time, freshness enum, lastError, and a fixture-vs-live flag.

## 12. Cache / offline model

- Store: **in-memory** `MemoryDynamicSnapshotStore` only. `evict` exists; host never bounds or expires versions.
- `localStorage`: config/presets only, not snapshots.
- No IndexedDB, Cache API, service worker, or Tauri disk cache.
- Overlay rasters: blob/object URLs in the equirect materializer.
- Browser HTTP cache: whatever `fetch` does; not modelled.

**Same session, temporary outage:** last good snapshot remains; refresh failure → `stale` if cached.

**Reload / first launch offline:** last live bytes are gone. Adapters then succeed via **fixture**, which is not last-good live data.

Answer: Libration cannot retain last successful live data across reload. Within a session, yes.

## 13. Failure UX

| Situation | Behaviour |
|-----------|-----------|
| First launch, layer off | nothing |
| Layer on, still loading | invisible (`missing-prepared-view`) |
| Live fail, no cache | **fixture draws** under same id |
| Live fail, cache exists | keep cache, mark stale; no UI |
| Empty USGS collection | invisible; looks like no quakes |
| Console | raster decode errors only (`[libration:canvas] failed to load raster image`) |
| Config / map badge / retry | none |

A broken USGS fetch can look like four “real” earthquakes (fixture), not “earthquake feed unavailable.” ADR 0005 already names this cost.

## 14. Raster dynamic-data support

Supported: `equirectRaster` snapshots, JPEG materialize to `imageBlit`, Model A opacity decode, full-world equirect assumption.

Not supported: tiles, reprojection, TIME-aware WMS, alpha mosaics, crossfade, remote-image CORS (`HTMLImageElement.crossOrigin` unset; overlays use blob URLs so this is currently OK), raster freshness UI.

Adequate for another global equirect product. Not adequate for tiled radar/regional products (Phase 11 zoom/tiles is roadmap, unapproved).

## 15. Vector dynamic-data support

Points and tracks are first-class `LayerType`s with RenderPlan builders. Points: per-feature path2d + label. Tracks: per-segment `line` + tip. Seam unwrapping exists for tracks.

No batching, spatial index, culling, clustering, or time-window filter. Fine for tens–low hundreds. USGS all-day can be hundreds–thousands of plan items. ADS-B/AIS tens of thousands would need a new slice.

## 16. External-source / licensing status

Repository-derived only (no new provider research).

| Source | Domain / endpoint (in code) | License note in catalog | Attribution | API key | Browser-direct |
|--------|-----------------------------|-------------------------|-------------|---------|----------------|
| NASA GIBS MODIS Terra CTT Day | `gibs.earthdata.nasa.gov` WMS | “free and open for public use with attribution” | catalog string | no | assumed |
| USGS earthquakes | `earthquake.usgs.gov/.../all_day.geojson` | U.S. Government work / public domain | catalog string | no | assumed |
| CelesTrak GP TLE ISS | `celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE` | “free for redistribution with attribution” | catalog string | no | assumed |

Fixture bytes are described as app-local test/demo content. Base-map provenance is a separate catalog (`docs/maps/MAP_ASSET_SOURCES.md`), not live feeds.

## 17. Credentials / CORS / runtime boundary

- Runtime: **browser-first SPA**; Tauri shell exists and is **not load-bearing** (ADR 0006). `src/` does not import `@tauri-apps`. Persistence is `localStorage`. Network is frontend `fetch`.
- `tauri.conf.json` `csp`: `null`.
- No env/API-key pattern. Adding a secret-bearing live layer in the frontend would expose the key. **Not safe today.** A Tauri/backend proxy is an open product question, not present.

CORS of the three current hosts was **not live-verified**.

## 18. Performance / scaling

| Scale | Practical today |
|-------|-----------------|
| Tens (ISS) | yes |
| Hundreds (typical USGS day) | likely OK, one plan item family per point |
| Thousands | likely heavy (labels + dual discs) |
| Tens of thousands (ADS-B/AIS) | not practical without batching/culling |

Illumination already samples a CPU cloud-opacity field per frame when participation is on (2048×1024 decode once at materialize).

## 19. Existing reusable abstractions

Already exist: durable `sourceId` catalogs; snapshot kinds; temporal meta; memory store; lifecycle manager; product-time resolver; acquisition controller; live HTTP adapter; fixture fallback; three materializers; SceneConfig rows; three overlay layers; host `ensure*`/`stop*`/`attachForProductInstant`; `stale-when-cached`.

Do **not** build a second framework. Adding a consumer is the documented checklist in `dynamic-data-lifecycle.md`.

## 20. Missing foundation pieces

Product/UX gaps, not a missing subsystem:

1. Live-vs-demo / product-time policy for “current” feeds.
2. Distinguish fixture vs live vs empty vs error in UI.
3. Durable last-good cache (optional; architecture already allows a store backend).
4. Fetch timeout, backoff, page-hidden pause.
5. `validUntilMs` / max-age so nearest-snapshot cannot pick a 9-year-wrong mosaic.
6. ISS propagation/interpolation at **product** instant; tip at current position.
7. GIBS `TIME` (or documented latest-only).
8. Earthquake mag/age filters; depth unused.
9. Attribution and freshness in Config.
10. API-key / proxy path if a future feed needs secrets.
11. Bounded store eviction (ADR 0005 cost).

## 21. Backlog / roadmap reconciliation

| Item | State |
|------|--------|
| Dynamic-data lifecycle | **shipped** |
| Global clouds/IR overlay (Model B) | **shipped**, default off |
| Cloud participation (Model A) | **shipped**, default off |
| Earthquakes | **shipped**, default off |
| ISS orbital track | **shipped**, default off |
| Live HTTP (DLU) | **shipped** |
| Weather radar / precip / temp / wind / pressure | **absent** (FUTURE_FEATURES) |
| Hurricane tracks | **absent** |
| Aurora forecast | **absent** |
| Volcano activity | **absent** (pointFeatures kind ready) |
| ADS-B / AIS | **absent** (tracks kind ready; scale not) |
| Satellite live positions / spacecraft beyond ISS | **absent** (ISS is the one tracks consumer) |
| Lightning / wildfire / AQI | **absent** |
| Zoom/tiles (unlocks regional products) | roadmap Phase 11, **unapproved** |
| Disk cache via Tauri | **architecture prerequisite**, open |

FUTURE_FEATURES correctly treats new consumers as needing explicit scope. It does not list earthquakes/ISS/clouds as remaining ideas.

## 22. Recommended implementation order

1. **Policy + UX on existing earthquakes** (live vs demo, fixture vs live, empty vs error). Smallest architecture-forcing slice; reuses the whole pipeline.
2. **Same policy applied to ISS** (propagate/interpolate to product instant or hide outside live time; tip = current).
3. **Same policy applied to clouds/IR** (TIME or latest-only labelling; participation vs overlay).
4. **Volcanoes** — second `pointFeatures` consumer.
5. **Additional spacecraft** — second `tracks` consumer (SGP4 reuse).
6. **A better visible-cloud or weather raster** — second `equirectRaster` (may need TIME).
7. **Hurricanes** — mixed points/tracks.
8. **Aurora / radar** — raster; likely needs TIME and maybe tiles.
9. **ADS-B / AIS** — last; volume + cadence + licensing.

## 23. Recommended first production slice

**Harden Earthquakes as the first production slice — do not re-implement the feed.**

Why first: already a complete C-class vector path; demo-time incoherence and fixture-masquerading-as-events are most visible here; mag/time fields already parsed.

Reuses: catalog, live HTTP, USGS parser, point materializer, overlay layer, RenderPlan, host arm/stop.

Forces: live-vs-demo policy; “no events” vs “no data”; whether fixture may paint in production; optional freshness/attribution in Config.

Intentionally not: generic framework, ISS prediction-at-scrub, GIBS TIME, persistent cache, ADS-B, API keys, tiles.

## 24. Minimal architecture proposal

No new umbrella types required. Grow the existing lifecycle:

- Keep `sourceId` + kind catalogs + adapters + store + resolve + materialize.
- Add a **per-source time policy** on the catalog or SceneConfig row: `wallClockCurrent` | `productTimeBound` | `hideWhenProductTimeDiverges`.
- Add **origin** on snapshots: `live` | `fixture` | `manual`.
- Use `validUntilMs` (or a max Δt) so nearest-snapshot cannot span years.
- Surface lifecycle `state`/`lastError`/`acquiredAtMs` in Config for armed sources only.
- Keep failure policy `stale-when-cached` for live bytes; **do not** treat fixture as stale-live.
- Persistent store later, same `DynamicSnapshotStore` interface (ADR 0006 already names disk cache as Tauri-shaped).

ISS next would add product-time SGP4 in acquisition or a prepared-view interpolator — still not a new framework. Clouds next would add TIME or an explicit latest-only flag.

## 25. Live-vs-demo-time policy recommendation

**E, layer-specific, with a default of B for current-only feeds.**

Libration’s identity is one canonical UTC instant per frame. Showing 2026 quakes on a 2017 eclipse scene violates that.

Recommended default for internet “current” products (USGS all-day, GIBS latest, ISS TLE):

- **Hide** (or clearly disable) the overlay when `|productInstant − wallClock|` exceeds a small live-slop, unless the source can supply historical data.
- Do **not** silently overlay latest-live on historical astronomy (reject A).
- Marking as “live-now” while historical astronomy plays (C) is a weaker teaching mode; only if a human wants a comparison instrument.
- Request historical data (D) only where the provider actually supports it (GIBS TIME maybe; USGS all-day no; TLE propagate-to-past yes in principle).

DEV scenarios already force live layers off; production demo should follow the same product rule once scoped.

## 26. Offline / stale policy recommendation

- **Network down, last-good live cache in session:** keep drawing; show stale + acquired time.
- **Provider error, last-good exists:** same.
- **Stale beyond max age:** stop drawing; show unavailable, not empty.
- **First launch, no cache:** show unavailable / “waiting for feed”, **not** fixture, in ordinary production. Keep fixtures for tests and explicit demo/DEV.
- **Empty live collection:** “no earthquakes in this window”, distinct from unavailable.

## 27. Testing strategy

Keep current pattern: mocked `fetch`, real-format fixtures, injectable clocks/timers, “resolve does not fetch” tests. No live-network in `npm test`.

Add (when an implementation item exists): origin `live|fixture`; product-time hide/select; empty vs error; Abort vs fallback. Optional out-of-suite smoke against real USGS/GIBS/CelesTrak.

## 28. Visual verification strategy

Do not depend on live internet for regression.

- Fixture scenario with earthquakes/ISS/clouds **on** and live fetch forced to fixture (or a DEV hook).
- Demo historical scenario: live overlays hidden or labelled per policy.
- Stale / error / empty states via mocked host, not live 500s.
- Optional manual live smoke outside the catalog.

Current `isolateFromLiveNetworkData` is correct for astronomy scenarios; a dedicated dynamic-layer scenario would need an approved work item.

## 29. Human decisions required

1. Live-vs-demo policy (hide vs mark vs historical fetch) for current-only feeds.
2. Whether production may paint **fixture** data when live fails.
3. Whether first new *feed* after hardening is volcanoes, spacecraft, or a better cloud product.
4. Whether API-key feeds are allowed in-browser (no) vs deferred until a proxy exists.
5. Whether disk-backed snapshot cache waits for a load-bearing Tauri decision.

## 30. Files / documentation touched

- `docs/work/LIB-033-dynamic-layer-internet-source-survey.md` (this item)
- `docs/STATE.md`
- `docs/DEVELOPMENT_LOG.md`

No `src/` changes. No implementation LIB.

## 31. Not determined

- Live CORS / Content-Type / latency of the three production URLs.
- Typical USGS `all_day` feature counts.
- Exact GIBS mosaic time when `TIME` is omitted.
- Tauri webview fetch behaviour.
- Whether CelesTrak terms in the catalog match current CelesTrak policy (repo text only).

## 32. Final state

**AWAITING SCOPE.** No implementation item automatically created.
