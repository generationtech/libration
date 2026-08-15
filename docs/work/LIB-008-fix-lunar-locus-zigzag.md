# LIB-008 — Fix lunar locus moving zigzag

| Field | Value |
|-------|-------|
| ID | LIB-008 |
| Status | complete |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (human) |
| Completed | 2026-08-14 |

Human-authorized defect fix for the production Lunar locus overlay from [LIB-007](LIB-007-lunar-locus.md). Authorized to create, approve, activate, diagnose, fix, and complete in the same request.

## Objective

Eliminate the localized zigzag/kink on the lunar locus that travels around the figure approximately opposite the Moon as product time advances, without distorting the real ~27.3-day geometry.

## Scope

**In scope**

- Diagnose whether the artifact is sample geometry, closed-spline closure/tangents, or world-wrap handling.
- Fix the actual curve construction or wrap logic.
- Preserve cadence, one-cycle meaning, Moon alignment, standstill amplitude, line style, Layers toggle, animation, and already-correct wrap behaviour.
- Automated continuity/seam regression tests and Cursor Browser visual verification (accelerated time, dateline, standstill epochs).
- Remove any temporary DEV diagnostics before completion.

**Out of scope**

- Redesign of the locus; color/style/user controls; lunar ground track; solar analemma; standstill envelopes; ephemeris change; renderer redesign.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; backends must not learn lunar-day or closure semantics.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md).
- Cursor rules `010`, `020`, `060`.

## Acceptance criteria

1. Root cause identified with evidence (sample geometry vs spline closure vs wrap).
2. Production fix addresses the cause; does not clip, hide, or special-case the point opposite the Moon.
3. Locus remains line-only; `k = 0` stays on the rendered path; mean-lunar-day cadence and one-cycle semantics unchanged.
4. Path is visually smooth everywhere, including the previous artifact location, through accelerated Moon motion.
5. Dateline/wrapped copies remain continuous; no false world-spanning segments.
6. Major/minor standstill amplitude behaviour remains intact.
7. Automated tests cover the seam/continuity defect; `npx tsc --noEmit` clean; `npm test` zero failures; `npm run build` succeeds.
8. Production bundle has no temporary diagnostic/experiment-only code.

## Verification plan

- Focused tests: spline continuity at the cycle seam; Moon alignment; support samples if used; epoch coverage; wrap copies.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm production bundle has no diagnostics
- Visual verification: required — `?scenario=lunar-locus` accelerated demo, dateline, major/minor standstill; follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item (root cause, fix, evidence).
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) if interpolation/closure description changes.
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) only if a reusable lunar-locus check is worth keeping.
- [`docs/STATE.md`](../STATE.md), [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md).

## Completion record

**Implementation summary**

Root cause is **B. closed-spline topology**, not sample geometry or world-wrap. LIB-007 treated `k = −13` and `k = +14` as adjacent Catmull-Rom neighbors. Those points are geographically close (< 8°) but are not consecutive on the orbit: 27 mean lunar days overshoots one sidereal month (~26.4 mean lunar days), so the wrap span ran back along the same arm. Because the sample window is centered on `k = 0`, that fake join sat about half a cycle away from the Moon and traveled with it.

Fix: open centripetal Catmull-Rom with real neighbors `k = −15, −14` (prefix + first-span `p0`) and `k = +15` (last-span `p3`). Crop near one sidereal month after `k = −13` (same-direction return, not an earlier figure-8 near-miss). Merge the last interpolated span onto the matching approach into the start. Rendered window remains `k = −13…+14`; `k = 0` stays live `sublunarPoint(now)`.

**Commands run**

- Focused: `npx vitest run src/core/lunarLocus.test.ts src/renderer/renderPlan/lunarLocusPlan.test.ts src/layers/lunarLocusLayer.test.ts`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

**Actual results**

- Focused interpolator/plan/layer tests passed (28 + 7 + 2).
- `npx tsc --noEmit` exit 0.
- `npm test` 170 files / 1576 passed / 0 failed.
- `npm run build` succeeded; `dist/` has no diagnostic/experiment selectors.

Pre-fix residual dump at `recent+3d`: wrap span climbed north then reversed south; min segment-progress cos = −0.089 at index 0. Sample chain itself was a smooth figure-8. Live post-fix interpolator at recent: join distance 0, minCos 0.95 at the southern lobe (not the seam), seam cosines ≥ 0.993. A 6 h month sweep found a second failure (false early crop at +384 h, minCos −0.61 on the other lobe); period-windowed search removed it.

**Visual verification**

```text
Visual verification:
- Scenario: lunar-locus (locusEpoch=recent, then standstill, minor, baseline)
- Viewport: 1920×1080 CSS (scene canvas 1888×1079)
- Browser: Cursor built-in browser
- Inspected: pre-fix V-kink on the shoulder opposite the Moon at 2026-01-16T22:00Z;
  post-fix line-only locus at recent/standstill/minor/baseline; Moon on the path;
  wrapped copies; no world-spanning segments. Accelerated demo at 150000× from
  Data tab. Continuity through a month of motion confirmed on the interpolator
  (6 h steps) rather than screenshot-only.
- Result: PASS
- Observations: pre-fix kink matched the first/last wrap, not a grid/dateline
  cut. Post-fix epochs keep major vs minor vertical extent. Recent Moon near
  170°W sits with the local figure.
```

**Not verified**

Pixel-perfect identity of every wrapped copy under animation; visual inspection of every 6 h step (automated instead); solar analemma unchanged (not re-inspected beyond “do not edit”).

**Discovered, not done**

None.
