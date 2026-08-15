# LIB-010 — Moon libration indicator and astronomical overlay styling

| Field | Value |
|-------|-------|
| ID | LIB-010 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized production Moon libration indication plus independent Moon / Lunar locus / Solar analemma styling controls. Authorized to create, approve, activate, implement, verify, and complete in the same request.

## Objective

Keep the Moon a compact phase-aware map glyph, and add a physically derived optical-libration mark (displaced ring by default, optional crosshair) plus durable size and stroke-style controls for the Moon, Lunar locus, and Solar analemma. Record apparent lunar-north rotation as backlog only.

## Scope

**In scope**

- Optical libration longitude/latitude from the existing Meeus-style lunar model.
- Moon glyph: enable/disable libration, ring/crosshair, color, thickness, motion scale, overall size.
- Independent Lunar locus and Solar analemma color/thickness.
- Config normalization/persistence, DEV `moon-libration` scenario, tests, visual verification.

**Out of scope**

- Apparent lunar-north / orientation rotation (backlog only).
- Lunar texture, topography, phase-astronomy changes, locus/ground-track geometry, solar ground track, Sun size, general theme editor.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md).
- Cursor rules `010`, `020`, `060`.

## Acceptance criteria

See the authorizing prompt §41. Summary: real libration on the production Moon; phase unchanged; independent path styles; defaults preserve current Moon size and current locus/analemma appearance; old configs normalize; DEV scenario uses production rendering; verification commands pass.

## Verification plan

- Focused tests: libration astronomy; Moon plan/size/style; locus/analemma style independence; config round-trip.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — no DEV scenario selectors in `dist/`
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — lunar-north rotation backlog only.
- [`docs/STATE.md`](../STATE.md), [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md).

## Completion record

**Implementation summary**

Optical libration (Meeus AA ch. 53, no physical libration) is computed in `lunarOpticalLibration.ts` from the existing truncated lunar series. The production Moon glyph keeps phase shading unchanged and draws a displaced internal **ring** (default) or **crosshair**. Display amplification (`librationMotionScale`) scales glyph offset only. Moon size tokens scale disc, phase, and indicator together; `normal` preserves the historical radius. Independent Lunar locus / Solar analemma `strokeColor` and `strokeThickness` persist on each scene row. Apparent lunar-north rotation is backlog-only in `docs/FUTURE_FEATURES.md`.

**Commands run**

- Focused tests during implementation (libration astronomy, Moon plan, config, Layers UI, scenarios).
- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `rg -n "moon-libration|librationEpoch|locusEpoch|lunar-locus" dist`

**Actual results**

- `npx tsc --noEmit` exit 0.
- `npm test` 172 files / 1607 passed / 0 failed.
- `npm run build` succeeded (`dist/assets/index-B9czx10J.js` 611.79 kB).
- `dist/` contains no `moon-libration`, `librationEpoch`, `locusEpoch`, or `lunar-locus` selectors.

J2000 (`2000-01-01T12:00:00Z`) from this truncated model: lon ≈ +4.974°, lat ≈ −6.622°. Sampled extrema over ~400 days: `|l|<10.5°`, `|b|<8.5°`, both signs.

**Visual verification**

```text
Visual verification:
- Scenario: moon-libration (default librationEpoch=diagonal), then
  librationEpoch=zero, lonEast, lonWest, latNorth, latSouth, new, quarter, full.
  Ordinary startup http://localhost:1420/ without ?scenario=.
- Viewport: inner 1920×1080 CSS (Emulation.setDeviceMetricsOverride).
- Browser: Cursor built-in browser
- Inspected: default ring at diagonal UTC; ring on new/full/quarter; lonEast
  (right) / lonWest (left); latSouth (down); latNorth; near-centered zero;
  Crosshair + Extra large + locus + analemma; Small and Large sizes; accelerated
  demo 86400× then pause freeze; alt colors (#e07090 / #3aa07a / #7ec8ff) and
  thick/thin path strokes with ground track; Layers defaults on a fresh load.
- Result: PASS
- Observations: phase and libration stay distinct. Default #c5d4e8 reads on both
  dark and bright phase halves with a thin dark understroke. Extra large stays
  compact (~14 px), not absurd. Crosshair is a small reference mark, not a HUD.
  Pause froze geographic position, terminator, and indicator. Locus green did
  not recast the analemma. SPA search-only navigation did not remount the
  scenario; epoch checks used location.replace so the DEV fixture reapplied.
```

**Not verified**

Pixel-perfect stroke widths at every Moon size; every user-chosen color on every basemap; Subtle/Enhanced motion-scale live inspection (unit-tested); libration-off live screenshot (unit-tested; toggle present); real-time (non-demo) clock while watching the ring (same `TimeContext.now` path); Sun-size invariance by measuring Sun pixels (Sun controls were not changed; Extra large Moon did not enlarge the Sun).

**Discovered, not done**

Apparent lunar orientation / lunar-north rotation remains in `docs/FUTURE_FEATURES.md` only. Changing `librationEpoch` without a full document reload does not re-apply the DEV fixture (same as other scenario query params applied at bootstrap).
