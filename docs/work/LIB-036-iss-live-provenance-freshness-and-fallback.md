# LIB-036 — ISS live provenance, freshness, and fallback correctness

| Field | Value |
|-------|-------|
| ID | LIB-036 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-17 |

Human-approved. Freshness bands confirmed: ≤18 h normal, 18–48 h degraded, >48 h suppress. Preferred failure: CelesTrak unavailable → ISS unavailable; never present fixture as live. Do not activate LIB-037.

## Objective

Preserve LIB-035 ISS orbital math and product-time semantics. Fix the remaining trust defect: the map can display an ISS position that is valid for the available TLE or a canned fixture, but is not the actual current ISS, because the TLE is stale or acquisition silently falls back to fixture data.

## Scope

**In scope**

- ISS dynamic-layer handling only (`iss-orbital-track-v1` / `orbitalTracks`).
- Provenance on ISS prepared view/state.
- Production: no silent fixture-as-live; preferred hide + unavailable when CelesTrak fails with no usable live TLE.
- ISS-specific TLE freshness policy (fixed constants, not user-configurable).
- Automated marker = `SGP4(TLE, product UTC)` validation.
- Investigate initial empty ISS after enable; smallest ISS-side fix if acquisition does not become visible without a re-toggle. No second refresh loop.
- Focused tests, visual verification, proportional docs. ADR only if an architecture boundary changes.

**Out of scope**

- Eclipse systems; clouds/IR and earthquakes (keep current fixture-fallback defaults).
- Generic config organization, presets, search/filter, unrelated rendering architecture.
- New providers, persistent disk cache, retry/backoff/timeouts, API-key/proxy, TLE history.
- Commits, pushes, tags, branches, or releases.

**Preserve**

- Product time authority; ADR 0013 live-only suppression; SGP4; track window −60 / +30 min unless investigation evidence requires a change.

## Current behavior (inspected, not yet changed)

Activation: `orbitalTracks` enable → host `ensureOrbitalTracksConsumer` → CelesTrak TLE adapter → store → tracks materializer → overlay `resolveIssCurrentSample` → RenderPlan.

| Question | Current answer |
|----------|----------------|
| Visible origin | Unrecorded. Live TLE and fixture share `iss-orbital-track-v1`. |
| Provider failure | Default `useFixtureFallback !== false` → canned southern-Africa GeoJSON stored as success and painted. No TLE; marker is nearest fixture sample. |
| Cached snapshot | `stale-when-cached` keeps last good version on later refresh failure. Empty store + HTTP fail paints fixture, not last-good live. |
| TLE epoch / age | Epoch via `issTleEpochUnixMs` from stored lines only. Age not computed. Not on prepared-view meta. |
| SGP4 time | Marker: product UTC. Track samples: acquisition wall clock as center, −60 / +30 min at 2 min steps. |
| Initial enable | Host arms periodic acquire; materializer indexes on lifecycle `ready`. If that handoff misses, layer stays `missing-prepared-view` until a later event. Investigate; do not add a second loop. |

Existing Config status pattern: live-only hint. Do not add a TLE-debug HUD. A concise ISS unavailable/degraded line may reuse that pattern; epoch/age stay test-only unless that reuse is the smallest honest report.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant; no network in the render path.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)

Origin, freshness, and paint eligibility resolve upstream of `RenderPlan`. ADR only if that boundary would change.

## Required behavior

### 1. Provenance metadata

ISS prepared view/state must answer:

- source: live TLE / fixture / cached-or-stale live TLE
- TLE epoch UTC (null for fixture)
- acquisition UTC
- age at product time (product UTC − TLE epoch when epoch exists)
- propagated product UTC (instant passed to SGP4 for the marker)

### 2. No silent fixture-as-live (preferred)

```
CelesTrak unavailable
  → no ISS marker/track
  → unavailable state (not labeled live)
```

Do not paint a fixture orbit as the current ISS. Tests and explicit DEV/demo may still use fixture; those paths must be labeled fixture / demo / degraded, never live. Abort must not invoke fixture fallback.

Last-good **live TLE** under `stale-when-cached` may still paint if it passes the freshness policy; origin is cached/stale, not live, not fixture.

### 3. ISS TLE freshness (proposed constants)

Not user-configurable. Age = `productUtcMs − tleEpochMs`.

| Band | Age | Presentation |
|------|-----|----------------|
| Fresh | ≤ 18 h | Render normally |
| Degraded | 18 h < age ≤ 48 h | Render; mark degraded internally; must not be labeled live |
| Excessively stale | > 48 h | Suppress ISS (same visual as unavailable) |

Rationale: CelesTrak typically refreshes ISS GP more than once per day, so 18 h is still a current element set. 18–48 h remains map-useful (LIB-035’s ~32 h live TLE would be degraded, not hidden) but is not “live.” Beyond 48 h, ISS drag makes along-track error large enough that a world-map marker is no longer a current position. Confirm or revise these numbers on approval.

### 4. Marker validation

Given a known TLE and product UTC: marker = `SGP4(TLE, product UTC)`, not first track sample, last track sample, or future endpoint.

### 5. Acquisition visibility

Enabling ISS must not require a manual re-toggle after fetch completion. Prove (or repair ISS-side) that acquisition completion materializes prepared views and the existing render loop observes them. No second refresh loop. Do not change the shared activation architecture unless the defect is ISS-specific and the smallest fix stays inside this item.

## Acceptance criteria

- Provenance fields above are testable.
- Ordinary production ISS does not store or paint fixture as live.
- Provider failure, empty cache: no ISS marker/track; unavailable, not live.
- Provider failure after a still-fresh or degraded live TLE: last-good live TLE may remain with correct origin/freshness band; excessively stale TLE is suppressed.
- Marker = SGP4(TLE, product UTC); not track endpoints.
- Enable ISS → acquire → visible without re-toggle (ordinary current mode).
- Historical Demo: ISS hidden (ADR 0013). Return to now restores without re-enable.
- Clouds/IR and earthquakes unchanged. Track window unchanged unless evidence is recorded.
- Focused tests, `npx tsc --noEmit`, `npm test`, `npm run build` pass.
- Visual verification per plan. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: provenance; no fixture-as-live; freshness bands; marker vs SGP4 vs endpoints; historical suppress / return; acquisition → prepared view without re-toggle; existing DLU-4 / LIB-035 ISS tests
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — ISS acquisition / host / tracks view
- Visual verification: required, [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md):
  - Ordinary current mode (no `?scenario=`): enable ISS → acquire → visible marker; source metadata inspectable in tests/status
  - Simulated TLE provider failure: ISS does not appear as live
  - Historical Demo: ISS hidden
  - Return to now: ISS restores without re-toggle

## Documentation impact

- This work item, [`docs/STATE.md`](../STATE.md), [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md), [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — ISS fixture/provenance/stale portion only
- ADR only if an architecture boundary changes (not for ISS-only freshness constants)

## Completion record

**Implementation summary**

Production ISS no longer falls back to fixture. Acquisition stamps `issOrigin` (`live-tle` / `fixture`); overlay computes provenance (origin, TLE epoch, acquisition UTC, age at product UTC, SGP4 product UTC) and paints only a fresh or degraded live/cached TLE. Fixture never paints. Age bands: ≤18 h live, 18–48 h degraded, >48 h suppress. CelesTrak failure with an empty cache leaves ISS unavailable. Layers shows a concise unavailable/degraded hint when the layer is enabled and product time is live-enough; ADR 0013 live-only copy still takes precedence historically. Clouds/IR and earthquakes keep fixture fallback. Marker remains `SGP4(TLE, product UTC)`. Track window unchanged. No ADR (ISS-only policy; origin/freshness resolve upstream of `RenderPlan`).

**Commands run**

- `npx tsc --noEmit`
- focused ISS/lifecycle/Layers tests (including new `src/lifecycle/issLiveProvenance.test.ts`)
- `npm test`
- `npm run build`
- `npm run dev` at http://localhost:1420/ (Cursor built-in browser, ordinary current mode, no `?scenario=`)
- `curl --max-time 12` to CelesTrak GP CATNR 25544 (connectivity probe)

**Actual results**

- `npx tsc --noEmit` — clean
- focused ISS tests — 78 passed
- `npm test` — 212 files / 2018 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-Dk9y2ABQ.js`)
- CelesTrak curl — connection timed out after 12 s (`http_code=000`)

**Visual verification**

```text
Visual verification:
- Scenario: ordinary current mode (no ?scenario=); then Demo 2017-08-21; then Static / now
- Viewport: Cursor browser pane; scene canvas CSS ~872×998 bitmap (not canonical 1920×1080)
- Browser: Cursor built-in browser
- Inspected: ISS Layer masters checkbox; Layers ISS/live-only hints; Data-tab ISS-hides copy;
  map for ISS marker/track vs southern-Africa fixture; product HUD date; 2017 eclipse info panel
- Result: PASS for provenance failure path, no fixture-as-live, historical hide, enablement restore
- Ordinary now: enable ISS (stayed checked, no re-toggle). After acquire: Layers
  “ISS orbital track is unavailable.” No ISS marker/track on the map (fixture not painted as live).
  Data tab: clouds/quakes fixture on failure; ISS hides when CelesTrak unavailable.
- Historical Demo start 2017-08-21: HUD/eclipse panel showed the 2017 total solar eclipse;
  Layers “Live-only data is hidden while viewing another product time.”; ISS checkbox still on;
  no ISS on the map.
- Return to Static: product HUD August 17 2026 ~12:18 AM; ISS still checked without re-enable;
  live-only hint gone; still no ISS on the map. Unavailable hint did not immediately return
  (re-arm left lifecycle in loading while CelesTrak hung; loading shows no hint by design).
```

**Not verified**

- Live CelesTrak TLE on the map (provider unreachable this session; curl TCP timeout). No comparison to an external ISS tracker. Viewport was not 1920×1080. Degraded (18–48 h) band was covered by unit tests, not a live stale TLE in the browser.

**Discovered, not done**

- CelesTrak GP still unreachable from this IP (LIB-035 saw HTTP 403; this session timed out). Fetch timeouts remain out of scope, so a hung re-arm after historical→now leaves the Layers hint empty until the fetch settles.
- LIB-037 stays proposed. Re-evaluate only after a confirmed live TLE.
