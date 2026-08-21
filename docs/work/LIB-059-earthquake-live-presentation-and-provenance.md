# LIB-059 — Earthquake live presentation and provenance

| Field | Value |
|-------|-------|
| ID | LIB-059 |
| Status | complete |
| Created | 2026-08-21 |
| Approved | 2026-08-21 (human; this request) |
| Completed | 2026-08-21 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037 or LIB-058.

## Objective

Keep USGS `all_day.geojson` as the live earthquake authority. Stop silently presenting fixture earthquakes as live. Add local magnitude, recency, label, and event-type controls so the map is readable without a new provider or refetch.

## Scope

**In scope**

- Earthquake provenance upstream of `RenderPlan` (live / stale live / loading / unavailable / fixture).
- Production: no silent fixture-as-live; first-fail with no live snapshot is unavailable; later fail keeps prior live snapshot as stale when within policy.
- Local presentation filters on the existing broad feed: minimum magnitude, maximum event age, label master + label magnitude threshold, earthquakes-only type filter.
- New Layers topic **Earthquakes** owning those controls and status copy.
- Immediate presentation invalidation (no network refetch).
- Conservative HTTP timeout so hung USGS requests can resolve to stale/unavailable.
- Focused tests, visual verification, proportional docs.

**Out of scope**

- New provider or feed-variant switching (`1.0_day`, `2.5_day`, `4.5_day`, `significant_day`).
- Poll cadence change unless a defect is found (keep 5 min).
- Clustering, map selection/hit-test, Event Playback, historical FDSN, depth presentation, magnitude color bands, age fading, PAGER/alert/felt/tsunami symbology.
- Snapshot-store eviction redesign.
- Clouds/IR fixture policy.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; no network in the render path.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- ISS LIB-036 provenance as the primary precedent. Earthquake snapshot freshness is snapshot-age, not TLE-epoch age.

## Design notes

**Feed.** Unchanged: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`, 5 min cadence, immediate fetch on enable, direct browser CORS, no proxy.

**Snapshot age vs event age.** Snapshot age is `productUtcMs − acquiredAtMs` (how old is this USGS copy). Event age is `productUtcMs − properties.time` (how long ago the quake occurred). Do not conflate.

**Stale policy (earthquake snapshot age; not ISS TLE bands).** USGS generates the summary about every minute; Libration polls every 5 minutes.

| Band | Snapshot age | Presentation |
|------|--------------|----------------|
| Fresh | ≤ 10 min | Paint as live |
| Stale | >10 min and ≤ 60 min | Paint; status stale, not live |
| Excessively stale | > 60 min | Suppress markers; unavailable |

10 min is two missed polls. 60 min is still a current-day snapshot but no longer “live.” ISS 18 h / 48 h bands are orbital-element policy and do not apply.

**Production fixture.** Host `useFixtureFallback: false`. Fixture producer remains for tests and DEV. Overlay never paints `origin: fixture` as live. DEV `?scenario=earthquake-presentation` may paint recorded features with fixture origin and a non-live status.

**Timeout.** 15 s per USGS attempt (timeout ≠ user abort) so provenance can leave Loading.

**Presentation (local, not in the snapshot).**

```
EarthquakePresentation {
  minMagnitude: number | "all"   // factory 2.5
  maxAgeMs: number               // factory 24 h
  showLabels: boolean            // factory true
  labelMinMagnitude: number | "follow"  // factory 4.0
  earthquakesOnly: boolean       // factory true
}
```

Null magnitude: hide when threshold is not All; show at minimum marker size when All. Event timestamps up to 2 min in the future are treated as age 0 (clock skew); they are not labeled with negative age.

## Acceptance criteria

- USGS `all_day` URL and 5 min cadence unchanged.
- Immediate fetch on enable still works.
- Production never paints fixture earthquakes as live/current/ready-from-USGS.
- First-ever live fetch failure → unavailable, no markers, no fixture.
- Later poll failure with a usable live snapshot → stale, no fixture replacement.
- Later success → live, snapshot updates.
- Provenance resolves upstream of `RenderPlan`.
- Layers exposes loading / live / stale / unavailable (historical live-only copy still wins).
- New Earthquakes topic with Data / Labels / Status.
- Magnitude, age, labels, type filter are local, immediate, no refetch.
- Marker eligibility and label eligibility are independent.
- Magnitude-driven orange marker size unchanged unless visual evidence requires it.
- LIB-035 historical Demo suppression preserved.
- Focused tests, `npx tsc --noEmit`, `npm test`, `npm run build` pass.
- DEV scenario ids absent from production bundle.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: provenance/failure; magnitude/age/label/type filters; immediate presentation update; historical suppression; Layers topic/status
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — acquisition, host, Layers, presentation
- Visual verification: required, [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item, [`docs/STATE.md`](../STATE.md), [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md), [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — Earthquakes topic / `earthquake-presentation` if added
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — earthquake fixture/filter portion only
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md) — earthquake fixture policy
- ADR: none expected unless a shared provenance boundary changes

## Completion record

**Commands**

- `npx tsc --noEmit` — clean (also after status-copy follow-up)
- `npm test` — 258 files / 2416 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-ClbhNyeB.js`); `earthquake-presentation` / `visualScenarios` absent from `dist/`

**Chosen policy**

- Snapshot age: ≤10 min live; >10 and ≤60 min stale (paint); >60 min suppress/unavailable
- Event age: `productUtcMs − properties.time`; factory max 24 h; 2 min future skew
- USGS timeout 15 s; host `useFixtureFallback: false`
- Factory presentation: min mag 2.5+, max age 24 h, earthquakes-only, labels on, label min 4.0+
- Compact label `M4.6 · place`; orange magnitude-scaled markers unchanged
- No new ADR; ADR 0005 consequence updated (ISS and earthquakes no production fixture-as-live; clouds/IR still fixture)

**Visual verification**

Cursor Browser `http://localhost:1420/` (ordinary current after unchecking Demo). Enable Earthquakes: Layers → Earthquakes status `Earthquake data live` then `Earthquake data live · 1 min old`. Factory map: worldwide orange markers, compact `M4.6 · place` labels at 4.0+ (examples: M6.7 Peru, M5.1 Tonga, M5.4 South Sandwich). Not four canned worldwide fixture points. Min mag 5+ and max age 1 h changed the map with USGS fetch count remaining 0 after a post-acquire hook. Historical Demo 2017-08-21: `Live-only data is hidden while viewing another product time.`; no live fixture substitution. `?scenario=earthquake-presentation` banner UTC `2026-08-21T16:00:00.000Z`, persistence isolated; factory subset (M4.4 Alaska, M4.0 Hawaii, M4.6 Aegean, M5.2 Taiwan); status `Earthquake data (DEV fixture)`, never Live.

**Not verified**

Canonical 1920×1080 viewport. Exact live GeoJSON acquired/visible/label counts. Forced USGS first-fail / later-fail / recovery in the browser (unit tests cover those paths; live USGS succeeded this session). All+labels-follow stress in the browser. Dateline wrap copies (markers near ±180° were visible without adding wrap). Snapshot-store eviction.

**Discovered, not done**

Clustering, selection, depth, magnitude color, age fading, PAGER/alert/tsunami, historical FDSN, Event Playback, snapshot-store eviction, clouds/IR fixture policy. Point wrap copies near ±180° remain later if a clip defect is confirmed. LIB-037 and LIB-058 stay proposed.
