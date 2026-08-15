# LIB-003 — Solar analemma follows the live subsolar point

| Field | Value |
|-------|-------|
| ID | LIB-003 |
| Status | complete |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (human) |
| Completed | 2026-08-14 |

Captures the request that the ground-track analemma move with the Sun so the live subsolar point sits on today’s vertex of the curve. This is the [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) candidate “active solar-position synchronization along analemma trajectories,” not analemma variants.

## Objective

The solar analemma overlay is the year-long locus of the subsolar point at one UTC clock time each day. Sample that clock time from the canonical frame instant so the curve translates with Earth rotation and the live subsolar marker lies on the current day’s point.

## Scope

**In scope**

- Default sampling: use the UTC time-of-day (hour, minute, second, millisecond) of the frame’s canonical instant, not a frozen integer hour.
- Keep the same mean-solar model as `subsolarPoint` and the same one-sample-per-day closed polyline.
- When `source.parameters.utcHour` is explicitly set, keep today’s frozen-hour overlay (no UI; existing persistence/tests). Unset remains the default and follows the clock.
- Layer state continues to rebuild per frame from `TimeContext.now`.
- Tests for coincidence of today’s vertex with `subsolarPoint(now)`, and for longitude shift when the clock is not 12:00 UTC.
- `docs/IMPLEMENTATION.md` current-behaviour note for the overlay.
- Cursor-native visual verification with analemma and subsolar marker both on (`?scenario=readability`, plus a non-noon instant if needed to show the translation).

**Out of scope**

- Sky analemma at a fixed place; other analemma variants.
- New markers, glyphs, or a “current day” highlight beyond coincidence with the existing subsolar marker.
- UI to pick a frozen UTC hour.
- Persistence schema changes; new SceneConfig fields.
- Illumination, overlay-readability, or subsolar-marker restyling.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant per frame; display formatting must not mutate product time; product semantics resolve upstream of rendering.
- [`docs/decisions/0004-one-canonical-utc-instant-per-frame.md`](../decisions/0004-one-canonical-utc-instant-per-frame.md)
- Sampling stays in `src/core/` / the analemma layer. Backends do not choose the hour.

## Acceptance criteria

- With default (unset) `utcHour`, the analemma point for the current UTC calendar day equals `subsolarPoint` at the same canonical instant (same lat/lon within ordinary floating-point tolerance).
- At a non-noon UTC instant, the default curve is not the frozen 12:00 UTC locus; it has translated in longitude with the subsolar point.
- Explicit `utcHour` still samples that integer hour at `:00:00.000` each day.
- Display modes and demo/real clock choice do not alter sampling except through the canonical instant.
- `npx tsc --noEmit` is clean; `npm test` has zero failures.
- Visual verification: subsolar marker sits on the analemma; at a non-noon scenario instant the figure-8 is not parked on the noon-UTC meridian band.

## Verification plan

- Focused tests: `src/core/solarAnalemmaGroundTrack.test.ts`; analemma layer / factory if the default hour path changes.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: no — overlay sampling only; no bundling, entry, or asset-pipeline change.
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md); `readability` (analemma on) and a non-noon instant (existing `night` at 06:00 UTC, or paused demo time) to confirm the curve moved with the Sun.

## Documentation impact

- `docs/IMPLEMENTATION.md` — current analemma sampling rule
- `docs/STATE.md` and `docs/DEVELOPMENT_LOG.md` on completion
- This work item’s completion record
- Remove the “active solar-position synchronization along analemma trajectories” bullet from `docs/FUTURE_FEATURES.md` only if that candidate is fully delivered

## Completion record

**Implementation summary**

Default solar analemma sampling now uses the UTC time-of-day of the canonical frame instant (hour through millisecond), so today’s vertex coincides with `subsolarPoint(now)` and the figure-8 translates in longitude with the Sun. Explicit `source.parameters.utcHour` still freezes that integer hour at `:00:00.000`. Sampling remains in `src/core/solarAnalemmaGroundTrack.ts`; the layer still rebuilds per frame from `TimeContext.now`.

**Commands run**

- `npx vitest run src/core/solarAnalemmaGroundTrack.test.ts src/layers/solarAnalemmaLayer.test.ts src/layers/sceneOverlayLayerFactory.test.ts`
- `npx tsc --noEmit`
- `npm test`
- `npm run build` — not run (work item: overlay sampling only)

**Actual results**

- Focused tests: 3 files / 13 passed
- `npx tsc --noEmit`: clean (exit 0)
- `npm test`: 163 files / 1504 passed / 0 failed

**Visual verification**

```text
Visual verification:
- Scenario: readability
- Viewport: 703×769 CSS px (canonical 1920×1080 not programmatically available; limitation recorded)
- Browser: Cursor built-in browser
- Inspected: analemma polyline, subsolar marker, coincidence at 12:00 UTC 21 June,
  chrome/scene layout, Köppen substrate clutter
- Result: PASS
- Observations: figure-8 on the Greenwich longitude band; sun glyph on the northern
  vertex (June solstice); no chrome clipping; city pins and grid present

- Scenario: night (Solar analemma enabled in Layers; subsolar marker already on)
- Viewport: 703×769 CSS px (same limitation)
- Browser: Cursor built-in browser
- Inspected: analemma translation at 06:00 UTC 21 December vs noon-UTC meridian
- Result: PASS
- Observations: figure-8 over the Indian Ocean near 90°E, not parked on Greenwich;
  sun glyph on the southern vertex (December solstice); Americas in night

- Repeatability: readability reloaded after night; same northern-vertex coincidence
```

**Not verified**

- `npm run build` (not required)
- Canonical 1920×1080 viewport (browser was 703×769)
- Frozen `utcHour` overlay visually (no UI; covered by unit tests)

**Discovered, not done**

- `night` does not enable the analemma by default; the non-noon check used a Layers toggle. A dedicated non-noon analemma scenario was not added (catalog growth needs its own work item).
