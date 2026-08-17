# LIB-037 — ISS propagation timestamp audit and ground-track correction

| Field | Value |
|-------|-------|
| ID | LIB-037 |
| Status | proposed |
| Created | 2026-08-16 |
| Approved | |
| Completed | |

Drafted after [LIB-036](LIB-036-iss-live-provenance-freshness-and-fallback.md). Not approved. Re-evaluate after a confirmed live TLE. Do not implement until a human moves this item to `approved`.

## Objective

Audit the existing ISS time path and correct any remaining propagation-timestamp or epoch-conversion defect so the rendered ISS marker and ground track match a reputable external ISS tracker when product time is live-enough and a live TLE is in use. Do not redesign dynamic layers.

## Scope

**In scope**

- ISS acquisition, TLE parsing, epoch conversion, SGP4 propagation inputs, ISS track generation, ISS marker generation, longitude/latitude conversion.
- Focused tests that pin the time path (TLE epoch → Unix ms; Date → minutes-since-epoch; published TLE + UTC → lat/lon).
- Smallest ISS-side conversion fix if the audit finds one.
- Visual verification against an external tracker at a recorded UTC, only after live TLE (not fixture) is proven.
- Proportional docs. ADR only if an architecture boundary changes.

**Out of scope**

- Eclipse systems, clouds, earthquakes, config organization, unrelated rendering, dynamic-layer architecture.
- LIB-036 provenance / freshness / fixture-as-live policy (complete; do not reopen here).
- New providers, TLE history, persistent cache, retry/backoff, API-key/proxy.
- Commits, pushes, tags, branches, or releases.

**Preserve**

- Current-only live policy from LIB-035 / ADR 0013.
- Freshness handling from LIB-036; do not invent a parallel freshness policy here.
- Existing `RenderPlan` architecture; product time remains authoritative; backends do not decide product behaviour.

## Current behavior (inspected, not yet changed)

Paint path:

```
orbitalTracks enable
  → host ensureOrbitalTracksConsumer
  → CelesTrak TLE adapter (fixture fallback still default-on)
  → store snapshot (validTimeMs = acquiredAtMs = Date.now() in the adapter)
  → tracks materializer
  → overlay resolveIssCurrentSample(track, time.now)
  → RenderPlan (equirect x from lon, y = (90 − lat) / 180)
```

| Stage | Current answer |
|-------|----------------|
| Acquisition clock | Live producer centers the track on `acquiredAtMs` (`options.nowMs ?? Date.now`). Host does **not** inject a shared clock into the ISS adapter (clouds do). |
| TLE parse | `parseIssTleBytes`: 3LE name + `1 ` / `2 ` lines, or 2LE. `trimEnd` only. Prefix and length checks; no checksum. |
| Epoch | `satellite.js` `twoline2satrec`: year `YY<57` → 2000+; `jdsatepoch = jday(year, mon, day, hr, min, sec)`. Libration `issTleEpochUnixMs` is `(jdsatepoch − 2440587.5) × 86400000` and is unused by paint. |
| SGP4 time | `propagate(satrec, new Date(timeMs))` → minutes = `(jday(Date) − jdsatepoch) × 1440`. `jday(Date)` uses UTC getters. |
| Geodetic | `gstime(date)` then `eciToGeodetic` then `degreesLong` / `degreesLat`; lon wrapped to (−180, 180]. |
| Track | −60 / +30 min at 2 min steps, **centered on acquire wall clock**, not product UTC. |
| Marker | Live TLE on track properties → `propagateIssPositionAtTime(tle, time.now)` (`TimeContext.now` = product UTC). No TLE → nearest fixture sample. |
| Lon/lat draw | `mapLatToY = (90 − latDeg) / 180 × h`. North-up; not a latitude flip. |
| Fixture fallback | Still default (`useFixtureFallback !== false`). Fixture tip is **24.9°E, 16.8°S** (southern Africa / Mozambique Channel). |

LIB-035 already showed isolated `SGP4(TLE from where-the-iss.at, recorded UTC)` agreed with that tracker to ~0.1 m. CelesTrak was HTTP 403 in that session; the on-map ISS matched the **fixture**, not live Patagonia.

## Required investigation (on approval, before any conversion patch)

Trace and record, for one ordinary current-mode frame with ISS enabled:

1. Whether the painted track carries `tleLine1` / `tleLine2` (live) or fixture samples with no TLE.
2. CelesTrak HTTP status and the raw TLE body.
3. Parsed TLE epoch UTC vs `issTleEpochUnixMs`.
4. Product UTC (`time.now`) vs acquire `validTimeMs` vs wall `Date.now()`.
5. Minutes-since-epoch passed to SGP4 for the marker.
6. Marker lat/lon vs the track sample nearest product UTC.
7. Same TLE + same UTC vs a reputable external tracker (target ≤ 100 km, as in LIB-035).

Disprove fixture-as-live **before** treating a conversion bug as the cause. Southern Africa / Indian Ocean at ~25°E is the fixture tip. A live ISS over Europe / Mediterranean / Asia with a phase-shifted track of the same 51.6° sine is a different defect.

If the painted layer is fixture, stop this item’s conversion work and record that LIB-036 owns the remaining on-map error. Do not “fix” SGP4 to match a canned orbit.

If live TLE is proven and the map still disagrees with the external tracker at the same UTC, the remaining suspects are: a live-path conversion tests do not exercise; a different element set than the tracker; product UTC not the UTC used in the comparison. Patch only the proven conversion.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant; no network in the render path.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)

Origin, freshness, and paint eligibility stay upstream of `RenderPlan`. This item may only correct ISS time/coordinate conversion into that existing path.

## Acceptance criteria

- Audit record exists: live vs fixture, TLE epoch, product UTC, SGP4 minutes-since-epoch, marker lat/lon, external lat/lon at the same instant.
- If fixture: no SGP4/epoch patch; discovered work points at LIB-036; item can complete as audit-only with that evidence.
- If live TLE: marker and track agree with a recorded external comparison at that UTC (target ≤ 100 km); marker remains `SGP4(TLE, product UTC)`, not track endpoints.
- Track remains a sample window around current time; do not change −60 / +30 min unless the audit proves the window itself is the error (record the evidence).
- Current-only live policy, RenderPlan boundary, and non-ISS consumers unchanged.
- Focused tests, `npx tsc --noEmit`, `npm test`, `npm run build` pass.
- Visual verification per plan when a conversion patch ships. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: TLE epoch → Unix ms; `Date` UTC → minutes-since-epoch; published TLE + UTC → lat/lon vector; marker vs SGP4 vs track endpoints (existing LIB-035 tests must still pass)
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes if ISS acquisition / overlay / plan code changes; no if audit-only
- Visual verification: required if a conversion patch ships, [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md):
  - Ordinary current mode (no `?scenario=`): ISS enabled; record product HUD UTC; compare marker and track to an external tracker at that UTC
  - Prove the painted track is live TLE, not fixture, before scoring the comparison
  - Historical Demo: ISS still hidden (ADR 0013)

## Documentation impact

- This work item, [`docs/STATE.md`](../STATE.md), [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) only if the ISS time path’s durable description changes
- ADR only if an architecture boundary changes

## Completion record

Fill only when completing.

**Implementation summary**

**Commands run**

**Actual results**

**Visual verification**

**Not verified**

**Discovered, not done**
