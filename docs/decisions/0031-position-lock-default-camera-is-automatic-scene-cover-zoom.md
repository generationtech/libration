# 0031 — Position-lock default camera is automatic scene-cover zoom

- **Status:** Accepted
- **Date:** 2026-08-23
- **Work item:** [LIB-087](../work/LIB-087-automatic-scene-cover-zoom-for-position-locked-frames.md)

## Context

[ADR 0028](0028-moon-position-lock-translates-scene-frame-latitude.md) defined position-lock as a scene-frame latitude translation, not camera-follow. At identity camera (`scale = 1`, `centerU = 0.5`, `centerV = 0.5`) the translated Earth can leave empty background bands above or below the interior scene strip. That was architecturally correct: the frame says where Earth is; the camera was still the 2.0.0 identity view of that frame.

The product now wants those bands gone **without** changing the frame transform, wrapping Earth vertically, or writing the anchor into `centerV` each tick (camera-follow). [LIB-086](../work/LIB-086-generalize-anchored-scene-reference-frames.md) already shares one anchored production type, so the policy can key off `lockMode: "position"`, not Moon vs Sun.

Wrong solutions: mutate anchor latitude; raise raster height; follow the subpoint with `centerV`; invent Moon- or Sun-specific zoom constants.

## Decision

1. **Automatic scene-cover zoom is camera policy, not a reference-frame change.** Position-lock still translates Earth. The camera chooses the minimum uniform scale so the visible vertical window, centred on the scene-frame origin (`centerV = 0.5`), lies inside the translated Earth extent. That is **cover**, not contain: geography may be cropped; empty north/south bands from translation must not appear while the policy is active.

2. **The policy applies only to anchored position-lock.** Earth-fixed and longitude-lock keep identity as the default view. Moon position-lock and Sun position-lock share the same helper (`minimumScaleToCoverSceneFrameEarth`); they must not grow body-specific zoom branches.

3. **Required scale is derived from the existing camera model.** Identity already maps the projected world onto the interior scene rect (stretched, not letterboxed). The visible normalized-v half-span is `0.5 / scale`, so viewport pixel height cancels. With Earth occupying `[vMin, vMin+1]` and `vMin = anchorLat / 180`, the origin-centred cover scale is `1 / (1 − |anchorLat| / 90)` (clamped to `[1, 8]`). Do not tune by empirical Moon/Sun constants.

4. **Policy state is explicit and runtime-only.** Distinguish `off` / `auto` / `manual`. Do not infer override from `scale !== expected`, because the required cover scale itself moves with latitude and would be ambiguous. Not persisted, not URL state, not a `SceneCamera` field, not a frame field.

5. **Manual wheel zoom suspends auto-cover.** Pointer-stable zoom remains. Later time/latitude updates must not rewrite the user’s scale. The user may intentionally expose background. Pan does not, by itself, suspend the policy; during an active pan the cover applicator is skipped so pan math is not overwritten mid-gesture, then auto-cover resumes (scale only).

6. **Reset view and entering position-lock re-arm auto-cover.** In position-lock, Reset means “restore this frame’s automatic default,” which may be `scale > 1`. The Reset control is disabled at that automatic default. Earth-fixed / longitude-lock Reset remains identity. Switching among the five scene-frame choices reinitializes policy and does not carry a manual override.

7. **Camera centre stays independent of the anchor.** Auto-cover updates scale. It must not write Moon or Sun coordinates into `centerU` / `centerV`. Horizontal wrap and `centerU` are unchanged.

8. **Existing camera limits remain authoritative.** If a required cover scale would exceed max 8, report it; do not silently violate bounds. Supported Moon (~±28.6°) and Sun (~±23.4°) latitudes are well inside that limit (`|lat| ≤ 78.75°` reaches 8×).

This record **supersedes the default-view clause** of ADR 0028 point 9 (identity camera as the position-lock product default, with blank bands accepted). ADR 0028’s frame mathematics, no-follow rule, and no-vertical-wrap rule remain.

## Consequences

**Good.**

- Position-lock remains a frame, not camera-follow.
- Empty translation bands go away as a viewing choice, reversible by manual zoom.
- Moon and Sun stay one calculation.

**Costs.**

- Reset-disabled no longer means `isIdentitySceneCamera` in position-lock.
- Cover scale > 1 also zooms longitude; horizontal fill still uses existing world copies.
- Manual zoom can show the blank bands again; that is intended.

**Non-decisions.** Camera-follow, vertical wrap, persistence, URL camera, new frames, raising max scale, and longitude-lock auto-zoom are not authorized here.
