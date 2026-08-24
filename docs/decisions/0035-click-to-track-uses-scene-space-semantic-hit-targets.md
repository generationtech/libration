# 0035 — Click-to-track uses scene-space semantic hit targets

- **Status:** Accepted
- **Date:** 2026-08-24
- **Work item:** [LIB-091](../work/LIB-091-direct-click-to-track-for-map-objects.md)

## Context

[ADR 0034](0034-tracking-ui-is-orthogonal-target-and-mode.md) made user-facing tracking orthogonal Target + Mode and named `setTrackingTarget` as the seam a later rendered-object click must share. LIB-090 still selected targets only from chrome. Inverse-projecting a click to canonical lon/lat would be wrong for wrapped world copies, CSS-sized glyphs, zoom/pan, and target-relative frames: the user clicks what they see.

Wrong generalizations remain: GIS feature picking; polygon/path selection; treating earthquakes as trackable; constructing frames or mutating camera in the click path; synthesizing Target `<select>` events; attaching identity to wrap-copy index, label text, color, or lon/lat.

## Decision

1. **A click on a rendered Moon, Sun, or ISS glyph sets Tracking target through `setTrackingTarget`.** Remembered Tracking mode is unchanged. The Target control updates because selection state changed. Empty geography does not clear tracking. Clicking the already-selected target is a no-op (no camera reset).

2. **Hit testing is scene/CSS-space against actually painted glyph copies.** Per-frame hit targets carry `TrackableMapObjectId` plus the same scene coordinates and radii the plan builders use to paint. Wrapped visible copies share one physical id. Off-screen copies do not contribute. Inverse geographic search is not the pick path.

3. **Hit-area policy.** Radius is `max(paintedRadius + 3px, 8px)`. Overlap: nearest center wins; distances within 0.5px are ties, broken by stable id order `moon`, `sun`, `iss`. Linear scan is enough for this handful of points.

4. **Pan vs click reuses the existing 4px drag threshold.** A pointer sequence that becomes a pan does not select on pointer-up. Hover cursor is `pointer` on a trackable glyph, `grab` otherwise, `grabbing` while panning. Chrome outside the scene strip cannot click-to-track.

5. **ISS availability is unchanged.** The click path calls `setTrackingTarget` with the same availability map as chrome. A painted glyph that is not authoritative still cannot become the target.

6. **The Canvas backend does not own tracking selection.** It may expose glyph geometry; application state remains above rendering. This seam is point-like trackable objects only (future city pins and planets can reuse it). Milky Way is a band, not this pick model. Earthquakes remain hover-only.

## Consequences

**Good.**

- Clicking a glyph is functionally the same as choosing that object in Target.
- Camera, frame, continuity, cover, and Reset stay on the existing target-change path.
- Wrapped copies and zoom/pan stay aligned with paint.

**Costs.**

- Hit targets must be collected from the same geometry as paint, including the ISS unwrap+identity-X path.
- Exact glyph overlap is resolved without a chooser.

**Non-decisions.** City, planet, and Milky Way tracking; earthquake tracking; hover-to-track; persistence; URL state; heading lock; generic GIS picking.
