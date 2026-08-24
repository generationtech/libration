# 0034 — Tracking UI is orthogonal target and mode

- **Status:** Accepted
- **Date:** 2026-08-24
- **Work item:** [LIB-090](../work/LIB-090-tracking-target-and-mode-ux-foundation.md)

## Context

[ADR 0032](0032-anchored-frames-target-a-trackable-map-object.md) and [ADR 0033](0033-iss-tracking-reuses-anchored-frame-target-architecture.md) already made production tracking `target + lockMode` on one anchored `SceneReferenceFrame`. LIB-089 still exposed that as seven combined Scene frame choices. Combined kinds made every new target a combinatorial UI change and blocked a later click-to-track path from sharing chrome state.

Wrong generalizations remain: treating Earth as a `TrackableMapObjectId`; new lock modes; persisting tracking selection; click-to-track in this decision; new frame or camera mathematics.

## Decision

1. **User-facing tracking is two orthogonal controls: Tracking target and Tracking mode.** Target values are Earth-fixed (no target) plus the production `TrackableMapObjectId` set (`moon`, `sun`, `iss`). Mode values remain `longitude` and `position`. Earth is not a trackable object.

2. **Runtime selection state is `target + rememberedMode`, not a combined frame kind.** Chrome and a later rendered-object click share `setTrackingTarget`. Mode is a runtime preference retained across target switches, including Earth-fixed. It is not persisted. Reload returns to Earth-fixed with default mode `position`.

3. **Production `SceneReferenceFrame` is unchanged.** Selection maps to Earth-fixed or `anchoredSceneReferenceFrame({ target, lockMode, continuousAnchorLonDeg, anchorLatDeg })` after existing target resolution. Renderers still receive the production frame, never DOM values.

4. **Camera reinitializes when the effective frame configuration changes.** Changing target or changing mode while a target is selected resets camera policy (identity vs automatic cover). Changing remembered mode while Earth-fixed does not. Reset view restores the frame default camera and does not change target or mode.

5. **Longitude continuity is session-local and target-keyed.** Switching target reinitializes continuous longitude. A mode-only switch on the same target preserves the current continuous longitude so there is no equivalent-world rebase. Camera still resets because lock mode changed.

6. **ISS availability is unchanged from ADR 0033.** ISS remains listed and is disabled without a valid authoritative position. Active ISS tracking falls back to Earth-fixed, keeps remembered mode, and reinitializes camera. The UI does not keep showing ISS while the production frame is Earth-fixed.

## Consequences

**Good.**

- New targets can be added to the target control without multiplying mode choices.
- Click-to-track can call `setTrackingTarget` without a parallel interaction system.
- Combined UI kinds are compatibility aliases only.

**Costs.**

- First selecting a target from a cold load uses remembered mode `position`, not an explicit combined choice.
- Mode remains visible but inactive (disabled) under Earth-fixed to avoid chrome jump.

**Non-decisions.** Click-to-track, city/planet/Milky Way/earthquake tracking, persistence, URL state, heading lock, and new lock modes are not authorized here.
