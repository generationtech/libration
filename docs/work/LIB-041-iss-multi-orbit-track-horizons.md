# LIB-041 — ISS multi-orbit track horizons + silhouette color fix

| Field | Value |
|-------|-------|
| ID | LIB-041 |
| Status | complete |
| Created | 2026-08-17 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-17 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Let Space objects ISS past/future tracks show multiple orbital revolutions, with horizons expressed as minutes or orbits derived from the active TLE mean motion and propagated locally with SGP4. Fix the ISS silhouette glyph so the configured glyph color is visibly the foreground and updates immediately.

## Scope

**In scope**

- Replace/extend past/future duration selectors with minute and orbit horizon choices (15/30/45/60 min and 1/2/3/6 orbits).
- Persist an unambiguous horizon token; migrate existing `pastMinutes` / `futureMinutes`.
- Derive orbital period from the active TLE mean motion (not a hardcoded 92 min).
- Expand the **local** SGP4 sample window to the selected horizons without a new TLE fetch.
- Progressive alpha fading by orbit distance from product UTC; user past/future hues unchanged.
- Dateline-safe multi-orbit polylines; current marker remains exact SGP4(product UTC) and visually primary.
- Fix ISS silhouette color so config `glyphColor` is the visible fill/stroke; immediate paint; no rematerialization.
- Focused tests, `iss-presentation` visual verification, proportional docs.

**Out of scope**

- ISS authority, provider/failover, provenance, freshness thresholds, live-only policy, SGP4 correctness.
- Other satellites, generic orbital-object engine, historical TLE.
- User control for fading.
- Proposed LIB-037 unless an unrelated propagation defect is independently proven.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics resolve upstream of `RenderPlan`; no network in the render path.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
- Presentation and local materialization only. Do not move orbital truth into the backend. No ADR expected.

## Design notes

- Horizon tokens (`15m` / `30m` / `45m` / `60m` / `1orbit` / `2orbits` / `3orbits` / `6orbits`) avoid ambiguous raw numbers. `45m` is retained so an explicit LIB-038 45 min past is not silently rewritten.
- Defaults remain 60 min past / 30 min future.
- Period: `orbitalPeriodMinutes = 1440 / n` where `n` is TLE line-2 mean motion (rev/day). `satrec.no` after `twoline2satrec` is rad/min (SGP4/unkozai) and is only a fallback.
- Acquisition may still store a −60/+30 snapshot; overlay/local SGP4 from the already-acquired TLE covers the selected horizons. Horizon change must not fetch.
- Fade multiplies alpha only. Orbit index is elapsed time / period, not longitude crossings.
- Silhouette root cause to confirm in the completion record: likely the navy stroke covering a thin fill at map scale (fill-then-stroke), not a dead config field.

## Acceptance criteria

- Past/future horizons support multiple orbits; period comes from the active TLE, not 92 min.
- Minute choices remain; defaults ~60/30; explicit old configs migrate; 45 min is preserved.
- Local propagation window expands with the selected horizon; no extra TLE network from horizon or paint changes.
- 1 / 3 / 6 orbits each way, plus asymmetric horizons, render without world-spanning seam lines.
- Current marker is exact SGP4(product UTC) and stays visually primary.
- Progressive fading quietens distant revolutions; user colors keep their hue.
- Maximum-horizon local SGP4 stays comfortably interactive (target <50 ms).
- Silhouette glyph color is visibly the configured color and updates next frame; dot color and per-mode colors remain independent.
- Live-time / freshness / provenance unchanged. DEV `iss-presentation` verifies without network.
- Focused tests, `npx tsc --noEmit`, `npm test`, `npm run build` pass. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: period formula; horizon resolution; multi-orbit sample span; no network on horizon change; fade monotonic by orbit; repeated dateline crossings; silhouette `#ff00ff` / `#00ff00` in RenderPlan without rematerialization; LIB-038 config migration
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm DEV ISS scenario absent from production bundle
- Visual verification: required — `?scenario=iss-presentation` for 1/3/6/asymmetric orbits and silhouette color. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — orbit-derived horizons, local propagation window, temporal fading, silhouette color
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — 1/3/6 orbit cases and silhouette color regression
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — do not mark other satellites implemented
- ADR: none expected

## Completion record

**Implementation summary**

Acquisition still stores a −60/+30 min snapshot. Overlay locally re-propagates from the already-acquired TLE around product UTC to the selected horizons (2 min cadence; cache keyed by TLE, windows, step, 2 min time bucket). Period is `1440 / n` minutes from TLE line-2 mean motion (rev/day); `satrec.no` rad/min is fallback only. Horizons persist as tokens (`15m`/`30m`/`45m`/`60m`/`1orbit`/`2orbits`/`3orbits`/`6orbits`); defaults 60 min past / 30 min future; LIB-038 minutes migrate; leftover `pastMinutes`/`futureMinutes` are deleted. Orbit index is elapsed time / period; fade multiplies alpha only (1.00 / 0.82 / 0.68 / 0.56 / floor 0.42). Seams reuse unwrapped longitudes plus short-strip pairing; runs also split at orbit boundaries.

Silhouette color was not a dead config field: RenderPlan already filled from `glyphColor`, but a ~1 px navy stroke covered the thin fill. Two-pass understroke then foreground fill+stroke from `glyphColor`. Paint-only; no rematerialization.

**Commands run**

- `npx tsc --noEmit`
- focused vitest: `issOrbitHorizon`, `issMultiOrbitTrack`, plus related presentation / LayersTab / sceneConfig / live-update / overlay / RenderPlan
- `npm test`
- `npm run build`
- Cursor Browser: `http://localhost:1420/?scenario=iss-presentation`

**Actual results**

- Fixture TLE n = 15.49359774 rev/day → period ≈ 92.9416 min (5_576_496.9 ms)
- Default −60/+30: 46 samples, 43 plan lines, local SGP4 ~1–4 ms
- 1+1 orbit: 93 samples / 91 lines / span ~186 min
- 3+3 orbits: 279 samples / 277 lines / span ~558 min
- 6+6 orbits: 558 samples / 556 lines / span ~1115 min; SGP4 ~4.3 ms; plan-build ~1.7 ms (well under 50 ms)
- `npx tsc --noEmit` clean
- focused vitest 142 passed
- `npm test`: 220 files / 2081 passed / 0 failed
- `npm run build` succeeded (`dist/assets/index-WEc8IbSN.js`); `iss-presentation` absent from `dist/`

**Visual verification**

```text
Visual verification:
- Scenario: http://localhost:1420/?scenario=iss-presentation (DEV banner UTC 2026-08-06T01:17:00.000Z)
- Viewport: Cursor pane ~703×769 CSS, dpr ~1.30 (not canonical 1920×1080)
- Browser: Cursor built-in browser; npm run dev
- Inspected: Past/Future horizon selectors; 1/3/6 orbits each way; 6 past/1 future and 1 past/6 future; ISS silhouette Extra large #ff00ff then #00ff00; restore Dot/Medium/60m/30m; CelesTrak/WTIA resource list
- Result: PASS
- Observations:
  - UI labels Past horizon / Future horizon; hint “Orbit horizons are derived from the current TLE orbital period.” Defaults 60 min / 30 min. 45 min retained in the selector.
  - 1+1: one previous and one future revolution around the current glyph; Earth-rotation shift; no world-spanning seam lines.
  - 3+3: multi-pass lattice; farther passes quieter; current glyph still primary.
  - 6+6: denser lattice, no renderer failure, fading still readable; 6+6 is busy but usable.
  - Asymmetric 6 past / 1 future then 1 past / 6 future: independent extents; no extra TLE fetch.
  - Silhouette Extra large magenta then green visibly recolored body + arrays immediately; switching back to Dot restored #b4f0ff independently.
  - 0 celestrak / wheretheiss resource entries throughout.
  - Factory restored: Past 60 min, Future 30 min, glyph Dot, size Medium, dot color #b4f0ff.
```

**Not verified**

- Canonical 1920×1080 viewport
- Side-by-side 1 min vs 2 min vs 3 min cadence on the map (2 min kept after vertex/perf comparison)
- Silhouette `#ffff00` (magenta and green were the visual pair)
- Ordinary live ISS enable this session (scenario-only; live-time/freshness unchanged in code and tests)
- Pixel-exact fade multipliers vs the recommended table (visual tune used 1.00/0.82/0.68/0.56/0.42)

**Discovered, not done**

- Proposed LIB-037 remains proposed
- 6+6 is visually dense even with fading; support retained
- Other satellites remain unimplemented
