# LIB-035 — Dynamic live-time integrity + ISS current position + display default cleanup

| Field | Value |
|-------|-------|
| ID | LIB-035 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release.

## Objective

Current-only internet layers (clouds/IR, earthquakes, ISS) may appear only when Libration’s product time is live-enough relative to wall-clock now. Historical/future Demo views stay temporally coherent. The ISS glyph is the SGP4 position at the product instant, not the future end of the track. Fresh factory defaults omit HUD seconds, omit city-pin time, and use pin time without seconds when that line is enabled.

## Scope

**In scope**

- One reusable live-enough product-time policy (wall clock gates current-only feeds only).
- Classify the three existing providers as current-only under present implementations.
- Suppress presentation (including cloud illumination participation) when product time is not live-enough; do not paint fixture as a substitute; do not mutate durable enable preferences.
- Stop/re-arm periodic acquisition when current-only consumers cannot be displayed.
- Concise Config indication for enabled-but-suppressed live layers.
- ISS current-position correction: explicit SGP4 at product UTC; marker and `ISS` label follow that sample; re-evaluate track window.
- Factory defaults: bottom HUD `showSeconds` off; pin label content city-only; pin datetime default without seconds. Missing keys normalize to the new defaults; explicit persisted values are preserved.
- Preset audit without redesign.
- Focused tests, visual verification, proportional docs, ADR if justified.

**Out of scope**

- New live providers or a generic policy/diagnostics framework.
- Historical USGS / GIBS `TIME` / TLE history.
- Persistent cache, retries/backoff/timeouts, stale/error UX, API-key/proxy.
- Earthquake filters, Config redesign, product-time precision/cadence changes.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant; no network in the render path.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md) — product time remains display authority; wall clock only gates current-only validity.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)

## Acceptance criteria

- Current-only product-time policy exists and is testable with injectable clocks.
- Ordinary current-mode clouds, earthquakes, and ISS still work (no LIB-034 regression).
- Historical/future product time suppresses earthquakes, clouds overlay, cloud illumination participation, and ISS; returning to now restores automatically without toggling enablement.
- DEV scenario isolation still forces live consumers off.
- Historical suppression never substitutes fixture data.
- ISS marker = SGP4(TLE, productUtcMs); label follows current marker; not the future endpoint.
- ISS movement follows product time between TLE fetches.
- Live ISS lat/lon is externally cross-checked at a recorded UTC (target ≤ 100 km).
- Factory HUD seconds off; pin time off; pin time format without seconds when enabled.
- Explicit persisted seconds/time preferences survive normalization.
- Focused tests, `npx tsc --noEmit`, full `npm test`, and `npm run build` pass.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: live-enough policy, suppression/re-arm, ISS current sample vs last sample, HUD/pin defaults, cloud participation
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — App shell / lifecycle / chrome defaults
- Visual verification: required — ordinary current mode live smoke; historical Demo suppression; ISS external comparison; factory HUD/pin presentation. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md). Ordinary current-mode smoke must **not** use `?scenario=`.

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — mark ISS current-position portion fulfilled if listed; do not remove deferred hardening
- ADR if the live-enough gate is recorded as a durable decision

## Completion record

**Implementation summary**

Live-enough policy is `isProductTimeLiveEnough` (±5 min inclusive) in `src/core/liveProductTimePolicy.ts`. Catalogs mark the three existing sources `timePolicy: "wallClockCurrent"`. Attach suppresses prepared views (including cloud opacity) when wall clock is supplied and product time is outside the window; `armDynamicLifecycleConsumers` stops polling and re-arms on return. Durable Layer masters stay checked; Config shows “Live-only data is hidden while viewing another product time.” ISS marker is explicit SGP4 at product UTC; track window −60/+30 min; future segments slightly fainter. Factory HUD seconds off; pin `labelMode` `city`; pin datetime `time`. Missing keys normalize to the new defaults; explicit persisted values survive. ADR 0013 records the product-time/wall-clock gate.

**Commands run**

- `npx tsc --noEmit`
- focused: `liveProductTimePolicy`, `dynamicLiveTimeIntegrity`, `issCurrentPosition`, LayersTab, librationConfig (and HUD tests updated for HH:MM)
- `npm test`
- `npm run build`
- `npx tsx` SGP4 vs where-the-iss.at TLE/position at recorded UTC; live-enough / SGP4 microbench
- Cursor Browser at `http://localhost:1420/` (no scenario) and `?scenario=baseline`

**Actual results**

- `npx tsc --noEmit` clean
- `npm test` 211 files / 2003 passed / 0 failed (from the implementation pass in this item)
- `npm run build` succeeded (`dist/assets/index-CLxBqkVw.js`)
- SGP4(TLE from where-the-iss.at, 2026-08-17T03:16:20.000Z) vs tracker lat/lon: ~0.0001 km
- live-enough check ~0.05 µs/call; one ISS SGP4 sample ~0.05 ms

**Visual verification**

```text
Visual verification:
- Scenario: ordinary current mode (no ?scenario=), then Demo 2017-08-21, then static now, then ?scenario=baseline
- Viewport: Cursor browser pane; scene canvas CSS ~673×770, bitmap 872×998 (not canonical 1920×1080)
- Browser: Cursor built-in browser
- Inspected: factory HUD without seconds; factory city names only; pin time enabled → HH:MM without seconds;
  current-mode USGS earthquakes + GIBS IR overlay; historical suppression of quakes/clouds/ISS/cloud participation
  with checkboxes still checked and live-only hint; return to now restores without re-toggle; baseline isolation
- Result: PASS for policy, defaults, earthquakes, clouds, historical suppression, re-arm, scenario isolation
- ISS map vs external: CelesTrak returned 403 (IP temporarily blocked for excessive TLE downloads). On-map ISS
  matched the offline fixture (~25°E, southern Africa), not live Patagonia. Propagator vs where-the-iss.at at
  the recorded UTC agreed to ~0.1 m using that site’s TLE. TLE epoch 2026-08-15T19:02:07Z (~32 h old).
```

**Not verified**

- Live CelesTrak TLE on the map during this session (HTTP 403 from this IP; 2-hour block). NASA tracking page not used (404/unavailable). Viewport was not 1920×1080. HUD seconds control was confirmed present and default-off; not toggled on in the browser. Accelerated Demo walking across the ±5 min threshold was covered by unit tests, not a long Browser run.

**Discovered, not done**

- CelesTrak GP rate-limit / IP block during ordinary 1-minute refresh plus extra verification fetches. Production fixture-on-failure policy remains deferred (on-map ISS was the fixture while CelesTrak was 403).

