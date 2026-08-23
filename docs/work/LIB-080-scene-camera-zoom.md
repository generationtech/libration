# LIB-080 — Scene camera zoom

| Field | Value |
|-------|-------|
| ID | LIB-080 |
| Status | complete |
| Created | 2026-08-22 |
| Approved | 2026-08-22 (human; this request) |
| Completed | 2026-08-22 |

Human-authorized. This request explicitly authorizes approval and activation of scene camera zoom. Do not start [LIB-081](LIB-081-scene-camera-pan.md), pan, pinch, persistence, or scene reference frames. Architecture: [`docs/specs/scene/camera-and-reference-frame.md`](../specs/scene/camera-and-reference-frame.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

## Objective

Introduce useful map zoom while preserving Libration 2.0.0 behaviour at the identity camera, and establish the first portion of a scene camera that pan can extend without redesign.

## Scope

**In scope**

- Runtime scene camera (scale + projected-world centre; identity = 2.0.0).
- Apply that camera at scene `RenderPlan` construction (shared mapping; raster dest rects included).
- Inverse mapping for existing pointer hit-testing (earthquake hover).
- Wheel zoom on the scene strip, with min scale = 1, a clamped max, and reset to identity.
- Tests and visual verification listed below.
- Implementation-doc updates for how zoom actually works once shipped.

**Out of scope**

- Pan drag / programmatic pan UX ([LIB-081](LIB-081-scene-camera-pan.md)).
- Persisting camera in `LibrationConfigV2` or URL state.
- Moon-fixed, Sun-fixed, or generic entity-fixed frames.
- Map rotation, alternate projections, tiles, globe view.
- Zooming chrome or changing astronomy, time, illumination policy, Clouds composition, or eclipse authority.
- Semantic zoom (hiding layers by scale), new map libraries, pixel-diff harnesses.
- Unrelated UI redesign.

Zoom-about-pointer may adjust `centerU/V` to keep a point stable. That is camera math, not pan navigation, and is allowed if it stays simple.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §4 (`RenderPlan`), §5 (chrome screen-space), §6.1–6.2 (projection vs view), §6.6–6.7 (camera vs physical state vs scene reference frame).
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0026](../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).
- Cursor rules `010`, `020`, `040`, `060`.
- Do not persist camera. Do not put product camera policy in the backend. Do not mutate entity positions to fake zoom.

## Acceptance criteria

- Identity camera matches 2.0.0 default appearance: full world in the scene strip, chrome unscaled, structural meridians registered with the map.
- Zoom in/out is smooth and predictable; min scale 1; max scale clamped; zoom-out at identity is a no-op.
- Reset restores identity.
- Astronomical calculations, layer payloads, product time, and demo/event playback are unchanged.
- Geographic overlays stay registered to the base map and each other while zoomed.
- Marker radii and path stroke widths stay screen-stable (scene-viewport tokens, not world-scaled width).
- Resize at identity still fills the scene strip; resize while zoomed keeps the same normalized camera.
- Wheel over the scene strip does not scroll the page; wheel over Config / chrome band / DOM overlays does not zoom the map.
- Architecture leaves `centerU/V` (or equivalent) so [LIB-081](LIB-081-scene-camera-pan.md) can pan without a second view model.
- No new dependencies.

## Verification plan

- Focused tests: identity vs current projection helpers; camera transform of points and raster dest; screen-space sizes; inverse hit-test; min/max clamp; reset.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes if entry/CSS/canvas event wiring changes
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) and spec §12. At least `baseline` (identity, zoom in/out, clamp, reset, resize, Config open), `lunar-track`, `lunar-locus` (recent + standstill), `moon-libration`, one solar eclipse, one dateline scenario, `clouds` or `iss-presentation` as relevant, `earthquake-presentation` hover while zoomed. Demo time while zoomed.

## Documentation impact

- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — how zoom and camera actually work after implementation.
- [`docs/STATE.md`](../STATE.md)
- This work item.
- Spec only if implementation discovers a boundary the spec got wrong.

## Completion record

Fill only when completing.

**Implementation summary**

Runtime `SceneCamera` (`scale`, `centerU`, `centerV` in normalized projected space) lives in `src/core/sceneCamera.ts` and is applied after equirectangular projection at RenderPlan construction. Identity (`scale = 1`, centre 0.5, 0.5) short-circuits to the 2.0.0 mapping. Wheel zoom on the scene strip is pointer-stable, clamped to scale 1…8 with the visible window inside the identity world. Reset view restores identity. Camera is a shell runtime ref — not persisted. Canvas still draws CSS primitives; no `ctx.scale()`.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npm run dev` (http://localhost:1420, `strictPort: true`) plus Cursor built-in browser / CDP at inner **1920×1080** (`Emulation.setDeviceMetricsOverride` before reload)

**Actual results**

- `npx tsc --noEmit`: clean
- `npm test`: 273 files / 2636 passed / 0 failed (re-run at completion)
- `npm run build`: succeeded (`tsc && vite build`)

**Visual verification**

Cursor Browser, canonical inner 1920×1080. Device metrics set before navigation. Screenshots of the Cursor pane crop the left of that layout (accepted limitation of compositor capture vs canvas size; layout/canvas CSS were 1920×1080).

- `baseline`: identity Reset disabled; zoom in / farther / max clamp (soft full-world raster, sharp CSS grid/markers, chrome unzoomed); zoom out to min clamp (Reset disabled again); Reset view restores identity; Config open while zoomed; Demo Playing at 60× while zoomed (HUD advanced; camera stayed zoomed); resize 1280×720 while zoomed kept Reset enabled and overlays registered; scene-strip wheel `preventDefault` with `scrollY = 0`; chrome-band wheel not consumed.
- `lunar-track`: zoomed; track/grid in Pacific.
- `lunar-locus` recent and `locusEpoch=standstill`: zoomed; geography/grid registered (standstill showed Baja/Mexico).
- `moon-libration`: zoomed; Moon glyph screen-sized, map registered.
- `solar-eclipse-total`: zoomed over Mexico; path, umbra/penumbra, marker, grid registered.
- `solar-eclipse-dateline`: zoomed near antimeridian; grid/islands/path; no wrap redesign.
- `clouds`: zoomed; cloud raster dest registered with geography/grid; Sun glyph not magnified.
- `iss-presentation`: zoomed; ISS track registered with Mexico geography and terminator.
- `earthquake-presentation`: zoomed about Hawaii; hover label `M4 · 12 km ENE of Pahala, Hawaii` at the marker.

**Not verified**

- Pinch / touch (out of scope).
- Pixel-identical identity vs a stored 2.0.0 screenshot (qualitative; identity mapping covered by tests).
- Full-canvas 1920×1080 PNG export (`canvas.toDataURL`); inspection used the Cursor pane crop of the 1920×1080 layout.
- Wheel over Config panel body (Config was open while zoomed; chrome-band wheel was the automated non-scene check).
- ISS glyph itself in the pane crop (track registration was visible).

**Discovered, not done**

- Horizontal wrap by translating `centerU` across ±180° is not a tiled repeating world. A1 clamp keeps the visible window inside `[0,1]²`. Dateline pan / extra raster copies are LIB-081 (or later), not a zoom defect.
- Chrome structural meridians do not track the zoomed map (accepted).
- Full-world rasters go soft when zoomed (accepted; no tiles).

