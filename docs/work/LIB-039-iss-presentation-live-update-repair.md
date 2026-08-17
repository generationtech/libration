# LIB-039 — ISS presentation live-update / invalidation repair

| Field | Value |
|-------|-------|
| ID | LIB-039 |
| Status | complete |
| Created | 2026-08-17 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-17 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Repair the integration defect that ISS Space objects presentation controls do not update the map immediately. Once ISS data is already available, every LIB-038 presentation control must produce a new visible ISS presentation from the same orbital data on the next frame, without TLE reacquisition, lifecycle re-arm, resize, or an unrelated config edit.

## Scope

**In scope**

- Trace the live path from Space objects controls through config, registry, prepared view, RenderPlan, and Canvas.
- Repair the smallest invalidation/cache/constructor-capture defect(s) so all LIB-038 controls take effect immediately.
- Reconcile orbit base color if it is a dead control.
- Deterministic DEV `?scenario=iss-presentation` using fixture/prepared ISS geometry (not production live fallback).
- Focused integration tests: same prepared view + presentation config → different RenderPlan; no acquisition.
- Visual verification of every control in the DEV scenario; live mode if a TLE is available.
- Proportional docs / STATE / DEVELOPMENT_LOG.

**Out of scope**

- ISS authority, SGP4, provenance, freshness, current-only policy, acquisition window, network behaviour.
- Proposed LIB-037.
- Clouds / earthquakes behaviour changes.
- New user-facing ISS settings except as required to reconcile a dead base-color control.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics resolve upstream of `RenderPlan`; no network in the render path.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
- Presentation invalidation only. Do not move paint style into the prepared ISS view. Do not add ISS-aware Canvas logic.

## Design notes

Pre-repair diagnosis (source, before implementation):

`createDynamicTracksOverlayLayer` captures `IssOrbitalPresentation` at construction (`sceneOverlayLayerFactory` → `issOrbitalPresentationFromScene`). Duration filtering is local in `getState` via `selectIssTrackTemporalWindow` over already-prepared samples. Paint style is not stored on the prepared view.

`sceneLayerSourceEqual` for `dynamicTracks` compared only `sourceId` and `metadata`, omitting `source.parameters` where ISS presentation lives. `sceneRuntimeAffectingEqual` therefore stayed true across Space objects edits, so `commitWorkingV2Update` did not rebuild the registry. Config and UI updated; the live overlay kept the constructor snapshot until some other runtime-affecting field forced a rebuild.

This is the same class of defect as LIB-020 (a config field changed but the equality predicate omitted it).

## Acceptance criteria

- Exact stale/invalidation root cause identified in the completion record.
- Every LIB-038 control changes config correctly and updates the map on the next frame from the same prepared ISS view.
- Orbit base color has coherent visible semantics or is reconciled.
- Presentation edits cause 0 TLE requests.
- DEV `iss-presentation` scenario covers all controls and does not leak into the production bundle.
- Historical / unavailable / >48 h stale suppression remains intact.
- Clouds and earthquakes activation unchanged.
- Focused tests, `npx tsc --noEmit`, `npm test`, `npm run build` pass.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: runtime equality + registry rebuild; config → plan for every control; same prepared view; no acquisition; duration local filtering; DEV scenario isolation
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm DEV scenario absent from production bundle
- Visual verification: required — `?scenario=iss-presentation` for every control; ordinary current-time if a live TLE is available. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — live presentation invalidation for `dynamicTracks` parameters
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — `iss-presentation` scenario and control regression
- ADR: none expected

## Completion record

**Implementation summary**

Root cause was the same class as LIB-020: `sceneLayerSourceEqual` for `dynamicTracks` compared only `sourceId` and `metadata`, omitting `source.parameters` where ISS presentation lives. `createDynamicTracksOverlayLayer` captures `IssOrbitalPresentation` at construction, so Space objects edits updated config/UI while the live overlay kept the constructor snapshot until some other runtime-affecting field rebuilt the registry.

Repair: include `shallowRecordEqual(a.parameters, b.parameters)` in the `dynamicTracks` branch of `sceneLayerSourceEqual`. Presentation-only commits now rebuild the registry. Duration filtering stays local in overlay `getState` (`selectIssTrackTemporalWindow`) over already-prepared samples. Paint style was never on the prepared view.

Orbit base color was otherwise dead (explicit past/future always overrode it). It now drives the on-map `ISS` label family; when past color still matches the previous base (factory default), past follows the new base. Customized past is left alone.

DEV-only `?scenario=iss-presentation` installs a process-local prepared ISS view (recorded TLE, in-process SGP4, versionId `iss-presentation-dev`) so controls can be inspected without CelesTrak. Production fixture-as-live remains suppressed. No ADR.

**Control matrix (post-repair)**

| Control | Config changes? | Registry rebuild? | Prepared view changes? | RenderPlan changes? | Visible next frame? |
|---------|-----------------|-------------------|------------------------|---------------------|---------------------|
| Orbit track | yes | yes (`parameters`) | no | trail lines 0/n | yes |
| Track past | yes | yes | no (local filter) | past segments 0/n | yes |
| Track future | yes | yes | no (local filter) | future segments 0/n | yes |
| Past duration | yes | yes | no (local filter) | past sample/line extent | yes |
| Future duration | yes | yes | no (local filter) | future sample/line extent | yes |
| Base color | yes | yes | no | label fill; past stroke only if still linked | yes |
| Past color | yes | yes | no | past stroke | yes |
| Future color | yes | yes | no | future stroke | yes |
| Line thickness | yes | yes | no | stroke width | yes |
| Glyph type | yes | yes | no | disc vs station path | yes |
| Glyph size | yes | yes | no | radius/scale | yes |
| Dot color | yes | yes | no | disc fill | yes |
| Glyph color | yes | yes | no | silhouette fill | yes |
| Show ISS label | yes | yes | no | text primitive 0/n | yes |

Class A (paint) and class B (past/future/duration) both rebuild the registry because presentation is captured at layer construction. Neither rematerializes SGP4 or acquires a TLE. Duration ownership: local `getState` filter of already-prepared samples.

**Commands run**

- `npx tsc --noEmit`
- focused vitest: `workingV2Commit`, `sceneConfig`, `issPresentationLiveUpdate`, `LayersTab`, `visualScenarios`
- `npm test`
- `npm run build`
- Cursor Browser: `http://localhost:1420/?scenario=iss-presentation`, `?scenario=solar-eclipse-2017`, ordinary `http://localhost:1420/`

**Actual results**

- `npx tsc --noEmit` clean
- `npm test`: 217 files / 2052 passed / 0 failed
- `npm run build` succeeded (`dist/assets/index-SMYx92lr.js`); `iss-presentation` / `iss-presentation-dev` absent from `dist/`
- Presentation-only commit rebuilds registry without toggling `orbitalTracks`; same prepared view + presentation patch yields a different RenderPlan; `fetchFn` not called

**Visual verification**

```text
Visual verification:
- Scenario: iss-presentation
- Viewport: inner ~872×998 CSS (not canonical 1920×1080); Config open ~703×769
- Browser: Cursor built-in browser
- Inspected: every Space objects ISS control; CelesTrak resource count; topic navigation
- Result: PASS
- Observations:
  - Banner: scenario: iss-presentation · 2026-08-06T01:17:00.000Z · persistence isolated
  - Orbit track OFF: Pacific/South America cyan trail gone immediately; glyph/label remain. ON: trail returned immediately.
  - Past #ff0000 / future #00ff00: past over Pacific/SA went red immediately (1149 red pixels); green future present.
  - Past duration 60→15: red pixels 1149→466; Americas long trail gone; short red remains near ISS.
  - Future duration 30→15: green pixels 74→31.
  - Past OFF: red 0, green remains. Both OFF: red 0 green 0. Restore: segments return.
  - Thickness Thick→Thin: red pixels 474→127.
  - Glyph Extra large silhouette visible over Indian Ocean; then Extra large magenta Dot (#ff00ff, 249 magenta pixels).
  - Label ON (yellow after base #ffff00, 91 yellow pixels) → OFF (text gone, marker remains) → ON.
  - Base #ffff00 while past still #ff0000: past stayed red (customized); label used yellow.
  - Advanced → Space objects: settings remained (silhouette/extra large/red/green/15 min/thick); topic change did not mutate.
  - performance resource entries matching celestrak|25544|gp.php = 0 after all presentation edits.
- Scenario: solar-eclipse-2017 (2017-08-21T18:25:29.700Z): no ISS track/glyph/label (no DEV hatch).
- Ordinary http://localhost:1420/: no CelesTrak requests this session; live ISS map not available.
```

**Not verified**

- Ordinary current-time live ISS immediacy (CelesTrak produced 0 requests; live verification unavailable)
- Canonical 1920×1080 viewport
- Base-color follow of past track on the map when past is still linked (exercised in unit tests; visual session had already customized past to red)

**Discovered, not done**

- Proposed LIB-037 remains proposed
- Config panel covers the ISS over the Indian Ocean at this scenario UTC; closing Config is required to inspect glyph/label
- HTML `type=color` fill without a native `input`/`change` can leave React state stale in automation; the control itself works when events fire
