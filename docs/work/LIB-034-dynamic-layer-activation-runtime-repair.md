# LIB-034 — Dynamic layer activation / runtime diagnosis and repair

| Field | Value |
|-------|-------|
| ID | LIB-034 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release.

## Objective

Determine why Config Layer masters for Global clouds / IR, Earthquakes, and ISS orbital track appear inert in ordinary current-time use, and repair the smallest real defects so the existing live acquisition pipeline arms, acquires or falls back, materializes, automatically updates the map, and produces a clearly visible effect.

## Scope

**In scope**

- Trace the full activation chain for the three existing consumers.
- Diagnose shared and layer-specific defects.
- Repair the smallest defects required for current intended production behaviour to become visible.
- Focused tests for the actual defect(s).
- Ordinary current-time, non-scenario visual verification, classifying LIVE vs FIXTURE vs BLOCKED per source.
- Proportional docs / STATE / DEVELOPMENT_LOG.

**Out of scope**

- New dynamic data sources or a second framework.
- Earthquake filtering, disk cache, retry/backoff, live-vs-demo policy, fixture-policy redesign, stale/error UI, GIBS TIME, ISS current-position correction, API-key/proxy — unless directly required for basic function.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — no network in the render path; dynamic data binds to product time.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- Keep the existing pipeline: config → lifecycle → acquisition → store → resolver/materializer → layer → RenderPlan → Canvas.

## Acceptance criteria

- Exact activation chain traced for all three layers.
- Shared and layer-specific root causes identified.
- Ordinary current-time non-scenario mode tested.
- Each Layer masters checkbox arms its intended consumer.
- Actual network, snapshot-store, product-time, materialization, and RenderPlan evidence recorded.
- Async data arrival automatically updates the map.
- Each layer becomes visibly present when ready; disable removes it; re-enable works.
- Factory startup still performs no dynamic requests.
- DEV scenario isolation does not suppress ordinary mode.
- No new feed; no generic framework; no silent hardening.
- Focused tests, `npx tsc --noEmit`, full `npm test`, and `npm run build` pass.
- Production bundle remains free of DEV-only diagnostics.
- Repository returns to AWAITING SCOPE.

If a provider is genuinely browser-blocked, internal wiring may still complete, but the verdict must state the live provider remains blocked.

## Verification plan

- Focused tests: host dispose/revive, activation arming after canvas-effect cleanup, existing DLC/DLU suites as needed
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — App shell / lifecycle host wiring
- Visual verification: required — ordinary non-scenario mode; enable / wait / visible / disable / re-enable for each of the three layers; classify LIVE vs FIXTURE vs BLOCKED. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) except do **not** use `?scenario=` for the primary smoke (scenario isolation is audited separately).

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — only if current docs incorrectly claim visibility/activation semantics that the repair changes
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — small ordinary-mode live dynamic-layer smoke procedure if useful

## Completion record

**Implementation summary**

Shared root cause: React 19 StrictMode remounts the canvas `useEffect`, whose cleanup called `dynamicLifecycleHostRef.current.dispose()`. The host is created once in a ref that survives the remount, so `ensure*` became a permanent no-op. Config checkboxes still mutated SceneConfig and rebuilt the registry, but acquisition never started — all three live layers stayed `missing-prepared-view`.

Repair: `isDisposed()`, `reviveDisposedDynamicLifecycleHost`, and `armDynamicLifecycleConsumers`. `syncDynamicLifecycleConsumers` replaces a disposed host before arming; the canvas effect re-arms on setup. rAF already re-reads prepared views every frame, so async arrival did not need a second invalidation path. Content-Type parameter stripping was already correct. DEV `?scenario=` isolation does not leak into ordinary mode.

**Commands run**

- Baseline before changes: `npm test` — 206 files / 1970 passed
- Focused: `npx vitest run src/lifecycle/dynamicLayerActivation.test.ts src/lifecycle/dynamicDataLifecycleHost.test.ts src/lifecycle/dlu2LiveHttpAcquisition.test.ts src/components/config/LayersTab.test.tsx src/dev/visualScenarios.test.ts` — 81 passed
- `npx tsc --noEmit` — clean
- `npm test` — 207 files / 1979 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-B1mMNBnz.js`); production bundle has no `visualScenarios` / `?scenario=`

**Actual results**

Diagnostic matrix (ordinary current-time, non-scenario, after repair):

| Stage | Clouds/IR | Earthquakes | ISS |
|-------|-----------|-------------|-----|
| Config enabled | yes | yes | yes |
| Consumer armed | yes | yes | yes |
| Request attempted | NASA GIBS WMS JPEG | USGS `all_day.geojson` | CelesTrak TLE CATNR=25544 |
| HTTP success | 200 | 200 | 200 |
| Fallback used | no | no | no |
| Snapshot stored | yes (equirect JPEG ~177 kB) | yes (205 features) | yes (3LE, 168 B) |
| Snapshot resolved | nearest `validTimeMs` ≈ acquire/now | same | same |
| Materialized | blob/imageBlit, 2048×1024 | 205 valid points | SGP4 ~46 samples (75 min lookback + 15 min lookahead @ 2 min) |
| RenderPlan emitted | 1 `imageBlit` | ~410 `path2d` + labels | ~45 `line` + 2 tip `path2d` + text |
| Canvas drew | yes | yes | yes |
| Visible | LIVE SUCCESS | LIVE SUCCESS | LIVE SUCCESS |

CORS: all three providers permitted from `http://localhost:1420`. Content-Types: `image/jpeg`; `application/json; charset=utf-8`; `text/plain; charset=UTF-8` — already accepted after MIME parameter strip.

**Visual verification**

```text
Visual verification:
- Scenario: ordinary non-scenario current-time (http://localhost:1420/, no ?scenario=)
- Viewport: Cursor built-in browser (not a guaranteed 1920×1080 CSS viewport)
- Browser: Cursor built-in browser
- Inspected: Layer masters toggles; USGS/CelesTrak/GIBS fetches; map OFF vs ON vs disable
- Result: PASS
- Observations:
  - Factory-like startup: no live overlays; no scenario banner; wall clock 2026-08-16 ~22:03 EDT
  - Earthquakes ON: hundreds of orange USGS markers/labels (e.g. Jackson WY, Puerto Rico); LIVE (205 features, mag −0.01…6.1)
  - Earthquakes OFF: markers gone
  - ISS ON: cyan ~51.6° inclination track South Pacific → North Atlantic + tip; live TLE `ISS (ZARYA)` epoch 26228
  - ISS OFF then clouds: track gone
  - Clouds ON: MODIS Terra CTT Day mosaic; colorful IR swathe over day-side Asia/Australia; night-side of that product is empty
  - Clouds OFF: satellite substrate returns; IR band gone
  - ?scenario=baseline: banner “persistence isolated”; three live masters remain unchecked despite prior ordinary-mode toggles
```

**Not verified**

- Exact live RenderPlan item counts from the running app (inferred from payload × plan builders; not dumped from a frame).
- ISS and clouds photographed re-enable after disable (disable confirmed; earthquakes had a full enable/disable/re-enable cycle).
- Cloud participation illumination path in this session (overlay master only).
- Desktop Tauri webview networking.
- Guaranteed 1920×1080 CSS viewport.

**Discovered, not done**

- Live-vs-demo policy for current-only internet feeds.
- Fixture-vs-live production paint policy.
- Stale/error UX; persistent cache; retry/backoff; page-hidden pause; fetch timeout.
- GIBS `TIME`; earthquake mag/age filters; ISS tip at product-time current position (~15 min lookahead remains).
- API-key/proxy architecture; source attribution UI.
- `docs/IMPLEMENTATION.md` §6 still says “thirteen known overlay ids” and omits `lunarEclipse` from the inline list (`SCENE_STACK_LAYER_IDS` has fourteen).

