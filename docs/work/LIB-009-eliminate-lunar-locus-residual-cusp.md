# LIB-009 — Eliminate lunar locus residual cusp

| Field | Value |
|-------|-------|
| ID | LIB-009 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized residual-cusp fix after [LIB-008](LIB-008-fix-lunar-locus-zigzag.md). Authorized to create, approve, activate, diagnose, fix, and complete in the same request.

## Objective

Remove the remaining localized hook/cusp on the lunar locus that still travels approximately opposite the Moon. Prefer a Moon-anchored open one-cycle seam if evidence supports it, rather than forcing a false remote closure.

## Scope

**In scope**

- Diagnose residual cusp vs Moon-anchored open-cycle seam vs periodic-approximation fallback.
- Change cycle-seam representation and curve continuity only.
- Regression tests and Cursor Browser accelerated-cycle verification.

**Out of scope**

- Lunar color/width, Moon glyph redesign, ground track, analemma, ephemeris, standstill envelopes.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md).
- Cursor rules `010`, `020`, `060`.

## Acceptance criteria

1. Residual cusp reproduced and localized before the fix.
2. Moon-anchored seam quantitatively evaluated (endpoint/tangent/screen coverage).
3. Selected solution is justified; no forced false periodic join if open-cycle is viable.
4. Current Moon remains on the locus; seam is under the Moon; no migrating cusp on the exposed line.
5. Cadence, ~27.3-day meaning, standstill extents, wrap, line-only rendering preserved.
6. Regression tests cover residual-cusp/seam class; `npx tsc --noEmit` clean; `npm test` zero failures; `npm run build` succeeds.

## Verification plan

- Focused tests: Moon-seam geometry; no remote curvature spike; 28-day sweep; standstill; wrap; open path (no remote closure segment).
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm no diagnostics in production bundle
- Visual verification: required — accelerated full cycle plus standstill/dateline; [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) if curve construction changes.
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) if a full-cycle seam check is worth keeping.
- [`docs/STATE.md`](../STATE.md), [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md).

## Completion record

**Implementation summary**

The lunar locus is approximately periodic over one sidereal month, not exactly periodic in position or tangent. LIB-008 still forced a remote blend-closure opposite the Moon (`minCos ≈ 0.66`, ~49°), which remained a visible hook. Diagnosis of a Moon-centered cut showed endpoint gaps of 0.16°–1.20° (≤ ~6.3 px at the canonical scene width) inside the 7.5 px Moon disc, so a Moon-anchored **open** cycle is viable.

Production now samples `k = 0…+27` with the live Moon as `k = 0`, interpolates an open centripetal Catmull-Rom (`k = −1` / `k = +28` tangent support), crops at the closest same-direction return after one sidereal month (~26.4 mean lunar days), and does **not** weld endpoints. The plan emits an open polyline; strokes inside 0.75× the Moon disc radius are trimmed as presentation only. Cadence, `sublunarPoint`, standstill extents, color, and width are unchanged.

**Commands run**

- Diagnosis (DEV, removed before completion): Moon-anchored vs LIB-008 closed/blended comparison at recent, +3d, +16d, standstill, minor, baseline, and a 28-day / 6 h sweep.
- Focused: `npx vitest run src/core/lunarLocus.test.ts src/renderer/renderPlan/lunarLocusPlan.test.ts`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

**Actual results**

- Focused: 40 passed (31 core + 9 plan).
- `npx tsc --noEmit` exit 0.
- `npm test` 170 files / 1581 passed / 0 failed.
- `npm run build` succeeded; `dist/` has no diagnostic selectors.

Moon-seam measurements (open cycle, no weld): recent gap 0.226° (~1.2 px), tangent cos 0.977; recent+3d 0.160°; recent+16d 0.608°; standstill 0.460°; minor 0.922°; baseline 0.465°. Sweep worst gap 1.20° (~6.3 px) still inside the 7.5 px disc.

**Visual verification**

```text
Visual verification:
- Scenario: lunar-locus (locusEpoch=recent, then standstill, minor, baseline)
- Viewport: inner 1920×1080 CSS (scene canvas 1888×1079; Emulation.setDeviceMetricsOverride).
  Cursor screenshot tool downscaled the full page; locus/Moon inspection used CDP clips.
- Browser: Cursor built-in browser
- Inspected: paused recent (Moon at ~170°W, southern extreme, dateline); paused
  standstill (Moon over eastern China, taller figure); paused minor (East Africa,
  shorter figure); paused baseline (Moon at ~176°E, wrap copy on the left edge).
  Accelerated demo at 86400× (Data tab) through a Moon traversal of the traveling
  figure. Line-only; Moon on the path; no world-spanning segment.
- Result: PASS
- Observations: no migrating opposite-Moon hook on the exposed line. Two arms
  meet under the Moon glyph. Skinny-loop northern/southern U-turns look pointed
  at screenshot scale but are real geometry (open-path minCos 0.80–0.97), not a
  remote weld. Baseline wrap stays on the local edge copies.
```

**Not verified**

Pixel-perfect identity of every wrapped copy under animation; pausing at every named station during the same accelerated sweep (those stations were inspected as paused epochs); solar analemma / ground track / Moon glyph redesign (out of scope).

**Discovered, not done**

None.
