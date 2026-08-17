# LIB-040 — ISS acquisition reliability + fast first paint

| Field | Value |
|-------|-------|
| ID | LIB-040 |
| Status | complete |
| Created | 2026-08-17 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-17 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Make ISS enablement feel live: checking ISS on a fresh process must immediately attempt live TLE acquisition and either paint a usable orbital state within seconds or promptly report unavailable. Periodic TLE refresh is background maintenance, not first-paint scheduling. Never present fixture data as live.

## Scope

**In scope**

- End-to-end first-enable diagnosis (T0–T9 timeline) for ordinary non-scenario startup.
- Immediate first fetch on enable; separate first-enable from periodic refresh.
- ISS-appropriate TLE refresh cadence (not 1-minute polling unless evidence supports it).
- Bounded ISS acquisition timeout; modest post-failure retry.
- Current CelesTrak reliability assessment; one additional live TLE source only if verified suitable.
- Ordered same-cycle failover if a secondary is implemented; provider identity on prepared ISS state.
- In-session last-good live TLE reuse on re-enable; loading/unavailable Layers hints.
- Focused tests, ordinary fresh-process visual verification, proportional docs.

**Out of scope**

- ISS orbital math / SGP4 unless diagnostics prove it is involved.
- Proposed LIB-037.
- Other satellites, generic multi-provider framework, unrelated dynamic layers.
- Durable disk cache, user-selectable provider/refresh controls, diagnostics panel.
- Screen-scraped tracker lat/lon as authority.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics resolve upstream of `RenderPlan`; no network in the render path.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- Preserve LIB-036 freshness (≤18 h normal, 18–48 h degraded, >48 h suppress) and current-only policy.

## Design notes

Inspected before implementation:

- `armDynamicLifecycleConsumers` already calls `ensureOrbitalTracksConsumer({ runImmediately: true })`. First fetch is not supposed to wait for the interval tick.
- Catalog cadence was 1 minute (`ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS`). Marker motion is local SGP4; TLE does not need per-minute download.
- `fetchLiveHttpBytes` had no timeout. Hung CelesTrak leaves lifecycle `loading` and Layers showed no hint (`issConfigStatusHint` returned null while loading).
- Production ISS has no fixture fallback. Historical product time does not acquire.
- Re-enable keeps the in-memory snapshot (`stopPeriodic` does not `clearAll`).

## Acceptance criteria

- Root cause of no-appearance / long first-paint identified with T0–T9 evidence.
- Fresh enable triggers immediate acquisition; first fetch does not wait for the periodic interval.
- Responsive provider: visible ISS within a few seconds; HTTP-complete → visible-map latency small.
- Re-enable with usable in-memory live TLE is effectively immediate; no resize/re-toggle required.
- CelesTrak current reliability assessed; TLE refresh cadence justified and provider-friendly.
- If CelesTrak is unreliable, a suitable secondary live TLE source evaluated; if implemented, same-cycle failover and provider provenance.
- Fixtures never appear as live. All-provider failure reaches unavailable promptly with a loading hint during first acquisition.
- Historical product time does not acquire/render current ISS; return to current re-arms immediately.
- StrictMode fresh enable still works. Space objects presentation remains immediate. Clouds/earthquakes unchanged unless a proven shared seam fix is required.
- Focused tests, `npx tsc --noEmit`, `npm test`, `npm run build` pass. DEV scenario remains production-isolated.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: immediate arm; re-enable from cache; timeout/failover; no fixture; historical no-acquire; return-to-live re-arm; scheduled refresh not first-paint; loading/unavailable UX
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — ISS acquisition / host / Layers hints
- Visual verification: required — ordinary current-time fresh process (no `?scenario=` for primary first-paint); `?scenario=iss-presentation` isolation. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — immediate-on-enable, TLE cadence, provider/failover, loading/unavailable
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — fresh-process ISS first-paint smoke
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — persistent cache / broad stale UX remain future unless implemented
- [ADR 0014](../decisions/0014-iss-live-tle-ordered-provider-failover.md) — ordered live TLE failover

## Completion record

**Implementation summary**

Root cause of inert/slow first paint was not “wait for the 1-minute tick.” Enable already called `runImmediately: true`. CelesTrak GP (`https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE`) TCP-hangs from this IP (likely firewall after historical 1-minute polling). No HTTP timeout left lifecycle `loading` for minutes, and Layers hid the loading hint. No secondary live TLE existed.

Fixes: 8 s ISS attempt timeout (timeout ≠ user abort, so failover can run); CelesTrak → Where the ISS at same-cycle failover; 2-hour TLE cadence (CelesTrak GP update cycle) instead of 1 minute; 5-minute one-shot retry after all-provider failure; loading/unavailable/degraded Layers hints; provider id on prepared state; re-enable from in-memory ready snapshot without an immediate re-download. SGP4 math unchanged. Clouds/earthquakes unchanged except unused optional `timeoutMs` on the shared live-HTTP seam. [ADR 0014](../decisions/0014-iss-live-tle-ordered-provider-failover.md).

**Commands run**

- Direct CelesTrak / Where the ISS at probes (ordinary network, not sandbox)
- `npx tsc --noEmit` (via `npm run build` `tsc && vite build`)
- focused vitest: `issAcquisitionReliability`, `issLiveProvenance`, `dlu2LiveHttpAcquisition`, `LayersTab`, `dynamicDataLifecycleHost`
- `npm test`
- `npm run build`
- Cursor Browser: ordinary `http://localhost:1420/` (factory reset, StrictMode `npm run dev`), `?scenario=iss-presentation`

**Actual results**

- Pre-fix CelesTrak: DNS `104.168.149.178`, TCP timeout 20 s, `http_code=000`, no headers/body. CORS GET also hung.
- Where the ISS at `https://api.wheretheiss.at/v1/satellites/25544/tles?format=text`: HTTP 200 ~345 ms (later browser ~200–237 ms), `Content-Type: text/plain`, CORS `Access-Control-Allow-Origin: *`, valid ISS 3LE. TLE epoch this session `2026-08-16T19:48Z` (~23 h old → LIB-036 degraded band, still paintable).
- CelesTrak official policy (fetched 2026-08-17): one download per 2-hour GP update; M2M should stop on non-200; excessive downloads → firewall.
- Focused ISS reliability + provenance + host: 33 passed after re-enable skip.
- `npx tsc --noEmit` clean.
- `npm test`: 218 files / 2065 passed / 0 failed (after skip-immediate host change).
- `npm run build` succeeded (`dist/assets/index-BOtOqay0.js`); `iss-presentation` / `iss-presentation-dev` absent from `dist/`.
- Unit bounds: parse <20 ms, one SGP4 sample <20 ms, −60/+30 track <50 ms.

**Visual verification**

```text
Visual verification:
- Scenario: ordinary http://localhost:1420/ (no ?scenario=), factory localStorage cleared
- Viewport: inner Cursor Browser (not canonical 1920×1080)
- Browser: Cursor built-in browser; npm run dev (React StrictMode)
- Inspected: fresh enable ×3; loading hint; CelesTrak timeout + WTIA failover; map ISS; disable 5 s / re-enable; 2017 Demo suppression; return to current; ?scenario=iss-presentation; Space objects orbit-track toggle
- Result: PASS (this IP: primary hang + secondary success)
- Observations:
  - Trial 1 (instrumented fetch): T0→T3 CelesTrak start immediately; AbortError 8089.9 ms; WTIA 232.5 ms HTTP 200; loading hint on same snapshot as checked ISS; then degraded + visible Pacific/SA track. No fixture.
  - Trial 2: T0→request-start 2.7 ms; CelesTrak AbortError 8032 ms; WTIA 237 ms 200; degraded + visible track.
  - Trial 3 (hint observer): T0→request-start 3.2 ms; loading hint at 99 ms; CelesTrak AbortError 8061.5 ms; WTIA 200 ms 200; degraded hint at 8506 ms (~241 ms after WTIA body). Visible track. Local processing ≪ network.
  - Re-enable before skip-immediate: cache painted immediately (degraded, not loading) while a background CelesTrak request started.
  - Re-enable after skip-immediate (trial 3): 0 extra fetches; hint degraded within ≤50 ms of click (script sampled at 50 ms; return timestamp 385 ms includes 250 ms sleeps).
  - Return to current from 2017 Demo: ISS track returned immediately; fetch log length unchanged (8→8).
  - 2017-08-21 Demo: “Live-only data is hidden while viewing another product time.”; no loading hint; no ISS on map; eclipse card present.
  - ?scenario=iss-presentation: banner UTC 2026-08-06T01:17:00.000Z; ISS glyph/label/track visible; 0 celestrak/wheretheiss fetches. Orbit track OFF removed the trail immediately; ON restored it.
- CelesTrak from this client remains TCP-hang / 8 s timeout. First paint is timeout-dominated (~8.3 s) when primary is dead. Responsive-provider ≤3 s path not observed here because CelesTrak never returned headers.
```

**Not verified**

- CelesTrak HTTP 200 first-paint ≤3 s (provider unreachable from this IP)
- Canonical 1920×1080 viewport
- All-provider failure unavailable UX in the live browser (secondary succeeded)
- Clouds/IR and earthquakes live enable this session (not the reported defect)
- Durable last-good TLE across process restart (intentionally not implemented)

**Discovered, not done**

- Proposed LIB-037 remains proposed
- Durable last-good TLE cache remains future hardening
- Where the ISS at TLE can be 18–48 h old while still valid; product correctly labels degraded rather than “live”
- When CelesTrak hangs, first paint includes the full 8 s primary timeout before failover
