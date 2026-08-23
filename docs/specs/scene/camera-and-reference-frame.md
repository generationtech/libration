# Scene camera and map reference frame

## What this document is

The durable architecture for evolving Libration’s map from the **2.0.0 Earth-fixed full-world presentation** into an interactive viewing system, without rewriting stable 2.0.0 systems.

It owns intended structure, insertion points, rendering categories, interaction constraints, the development sequence, and zoom-milestone acceptance direction.

It does **not** own current implementation truth ([`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md)), current status ([`docs/STATE.md`](../../STATE.md)), or permission to start work ([`docs/WORKFLOW.md`](../../WORKFLOW.md)). Speculative extras stay in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md). Durable invariants are in [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) and [ADR 0026](../../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

No production code is implied by this file existing. Zoom is the first implementation slice: [LIB-080](../../work/LIB-080-scene-camera-zoom.md) (proposed).

---

## 1. Baseline: Libration 2.0.0

2.0.0 is the completed, stable baseline. Default scene behaviour is:

> Geography remains stationary while astronomical and entity positions, and their paths, move across it.

That presentation is **Earth-fixed**, **full-world**, and **north-up**. There is no zoom, pan, map rotation, or entity-fixed map frame.

Existing `scene.viewMode` is the persisted framing family and currently has one value: `fullWorldFixed`. It is not a camera. Month-aware base-map switching is asset resolution, not camera behaviour ([ARCHITECTURE.md](../../../ARCHITECTURE.md) §6.2).

Preserve 2.0.0 behaviour at the identity camera. Later map-reference-frame work must keep Earth-fixed as the default.

---

## 2. Naming: two different “reference frames”

Do not conflate:

| Concept | What it is today | What this document adds |
|---------|------------------|-------------------------|
| **Civil time reference** | Display mode, IANA zone, reference city. Formats the same UTC instant. | Unchanged. |
| **Scene / map reference frame** | Implicit Earth-fixed geographic coordinates. | An explicit transform of world state into the coordinates that projection then maps. |

“Reference frame” below means the **scene/map** frame unless civil time is named.

---

## 3. Conceptual pipeline

```text
Physical / astronomical state     (entity lat/lon at the canonical UTC instant)
        ↓
Scene reference-frame transform  (Earth-fixed identity today; entity-fixed later)
        ↓
Map projection                   (equirectangular; spatial truth)
        ↓
Scene camera / view              (scale + translation; no rotation in this phase)
        ├── pan
        └── zoom
        ↓
RenderPlan → screen
```

This is a separation of responsibilities, not a required class diagram. Prefer the smallest mapping that matches the current code.

| Stage | Mutates physical/entity state? | Mutates time? | Lives with |
|-------|--------------------------------|---------------|------------|
| Astronomy / lifecycle | No — it *is* that state | No — consumes `TimeContext.now` | Layers, `src/core/` |
| Scene reference frame | No | No | Future transform **before** projection |
| Projection | No | No | `src/core/equirectangularProjection.ts` |
| Scene camera | No | No | Runtime view state on the scene path |
| Chrome | No | No | Screen-space; not camera-transformed |

---

## 4. Current implementation (2.0.0)

Inspected against source. The intended camera must plug into this shape rather than replacing it.

### 4.1 Projection

`src/core/equirectangularProjection.ts` is the spatial contract:

- longitude −180°…+180° → x ∈ `[0, widthPx]`
- latitude +90°…−90° → y ∈ `[0, heightPx]`

The same `widthPx` registers scene drawing and top-band longitude geometry. Inverse helpers exist (`longitudeDegFromMapX`, `latitudeDegFromMapY`).

There is no map library. Canvas 2D executes `RenderPlan`. Changing projection parameters (central meridian, non-linear scale) is **not** the zoom mechanism.

### 4.2 Scene viewport

Chrome height is reserved first. The scene strip is the remainder (`src/renderer/sceneViewportLayout.ts`). The canvas backend clips to that rect, translates origin, then builds plans with `viewportWidthPx` / `viewportHeightPx` equal to the strip size (`src/renderer/canvasRenderBackend.ts`).

Full world is stretched to that rectangle. Geographic aspect is not letterboxed. Identity camera must keep that stretch.

### 4.3 Where geometry becomes pixels

Plan builders (`src/renderer/renderPlan/`) convert geographic coordinates into scene CSS pixels **and** emit marker radii, stroke widths, and type sizes in CSS pixels. The backend does not re-project. A naive `ctx.scale` would therefore scale strokes and glyphs with the map.

Raster layers (`imageBlit`, illumination `rasterPatch`, Clouds) currently dest-blit the **full world** to the **full scene rect**.

### 4.4 View state today

| State | Where | Persisted? |
|-------|--------|------------|
| `scene.viewMode` = `fullWorldFixed` | `SceneConfig` | Yes |
| `scene.projectionId` = `equirectangular` | `SceneConfig` | Yes |
| Scene camera | Does not exist | — |
| Pointer scene CSS | `App.tsx` ref; earthquake hover only | No |
| Demo playback | Runtime ref | Transport not persisted |

`SceneRenderInput` (`src/renderer/types.ts`) already carries frame, full viewport, layers, and `sceneLayerViewportPx`. It is the natural per-frame carrier for camera parameters.

### 4.5 Wrap / antimeridian (already present)

Earth-fixed 2.0.0 already unwraps short-arc polylines and paints ±360° copies for loci, tracks, eclipse geography, and Milky Way (`equirectSeamPath.ts`, `equirectSeamRegion.ts`, lunar locus world copies). Illumination samples wrap longitude.

That is **periodicity of a full-world strip**, not a continuous unwrapped moving-map longitude. Entity-fixed motion will need wrap-aware or unwrapped longitude so 179° → −179° is not a visual jump. Do not implement that until reference-frame work. Do not discard the existing seam helpers.

### 4.6 Interactions today

- Pointer move/leave/cancel on the canvas → earthquake hover via `canvasClientPointToSceneCss` (null in the top chrome band).
- Hover is not click/select.
- No wheel, pinch, or drag handlers on the canvas.
- `C` toggles Config; `Escape` closes it.
- Config panel, launcher, eclipse info panel, and DEV scenario banner are DOM overlays, not scene layers.
- ResizeObserver + `window.resize` rebuild the viewport and re-render.
- DEV `?scenario=` is startup-only visual fixture state, not shareable camera state.

---

## 5. Natural camera boundary

**Put scene camera on the scene render path, as runtime view state, applied at plan construction.**

Preferred shape (names are illustrative):

```text
SceneCamera = {
  scale,           // 1 = full projected world fits the scene rect (2.0.0)
  centerU,         // 0.5 = horizontal centre of the projected world strip
  centerV,         // 0.5 = vertical centre of the projected world strip
}
```

- Scale is dimensionless relative to the current full-world→scene-rect mapping.
- Centre is in **normalized projected space**, not geographic degrees and not CSS pixels. Resize then reapplies the same camera to the new scene rect; identity remains “full world fills the strip.”
- No rotation. North stays up in projected space for this development phase.

**Identity:** `scale = 1`, `centerU = 0.5`, `centerV = 0.5`. Bit-for-bit equivalent to 2.0.0 mapping.

### 5.1 Why here

| Candidate | Verdict |
|-----------|---------|
| Mutate astronomical / entity positions | Forbidden. Camera is presentation. |
| Change equirectangular projection contract | Forbidden. Projection remains spatial truth. |
| `ctx.scale` / `ctx.transform` in the backend | Rejected. Mixes geographic scale with screen-space strokes and type. |
| Map library / new dependency | Rejected. The product already owns projection and `RenderPlan`. |
| Persist zoom on `scene.viewMode` | Rejected for A1. `fullWorldFixed` is a framing family, not a scale. |
| CSS pixels pan offset only | Weak on resize. Normalized projected centre survives layout. |
| Geographic lon/lat view centre | Premature. Ties the camera to Earth-fixed degrees and obstructs a later scene reference-frame transform. |

### 5.2 Where the numbers flow

1. Shell holds camera in a runtime ref (same family as demo playback and pointer CSS), default identity.
2. Each frame, camera is attached to `SceneRenderInput` (or an equivalent view context built next to `sceneLayerViewportPx`).
3. `CanvasRenderBackend` passes it into existing plan builders. It still must not read `SceneConfig` to invent camera behaviour.
4. Plan builders: project lon/lat with the existing helpers onto the **identity world strip**, then apply the camera similarity (uniform scale about `centerU/V` into the scene rect). Raster dest rects use the same transform. Clip remains the scene strip.
5. Inverse camera + inverse projection for pointer hit-testing (earthquake hover today).

A1 may only *expose* scale. The struct should still include centre so pan is not a redesign, and so zoom-about-pointer can keep a projected point stable without calling that “pan navigation.”

### 5.3 What stays out of the camera

- Canonical UTC, demo transport, event playback.
- Layer payloads (subsolar/sublunar points, tracks, loci, eclipse geography, ISS, planets, Clouds bytes).
- `SceneConfig` composition, base-map family, illumination policy.
- Chrome layout and drawing.
- Scene reference-frame transform (later; identity today).
- Persistence and URL/shareable view (Phase E).

---

## 6. Scene reference frame (later)

A scene reference frame transforms **already-computed** geographic positions before projection.

```text
referenceFrame.anchor = Earth | Moon | Sun | (later) entity-id
camera.scale = …
camera.centerU/V = …
```

Earth-fixed is identity: presentation coordinates = geographic coordinates. That is 2.0.0.

Entity-fixed is **not** “each frame assign camera centre to the entity.” Tracking that overwrites camera state and fights pan. The entity defines the origin of the projected world; the user still zooms and pans in that world.

Anchor selection must be generic for any entity that can supply a time-dependent geographic position. Moon-fixed and Sun-fixed are early demonstrations, not architecture.

Do not implement this in A1–A2. Do not add Moon-specific branches to the camera.

World wrapping for entity-fixed motion is a Phase B/C concern. Anticipate continuous/unwrapped longitude or equivalent wrap-aware presentation so antimeridian crossings do not jump. Reuse 2.0.0 seam helpers rather than inventing a second wrap model.

---

## 7. Chrome and camera

Chrome stays **screen-space** ([ARCHITECTURE.md](../../../ARCHITECTURE.md) §5.1). The scene camera must not transform it.

At identity camera, structural 15° columns continue to register with the map (2.0.0). When the camera is not identity, those columns remain a full-world instrument ruler and will **not** track zoomed meridians. That is accepted for this phase: chrome is the time instrument, not a map overlay.

Do not zoom the civil hour tape. A later optional camera-locked meridian overlay would be a **scene** layer, not zoomed chrome.

Bottom HUD, eclipse information panel, Config launcher, and Config panel are DOM chrome. They do not scale with the map.

---

## 8. Rendering inventory for zoom

Use this list in visual verification. Do not treat every row as a new product feature.

### 8.1 Geographic / projected — must move and scale with the map

Registration with geography is load-bearing.

- Base-map `imageBlit` destination.
- Planetary illumination `rasterPatch` destination (and Clouds / static equirect rasters).
- Lat/lon grid lines.
- Geographic outlines implied by substrates (they are the raster).
- Lunar ground track, lunar locus, solar analemma.
- Eclipse forecast corridor, live footprint, alignment ribbon, visibility footprint, ground-position marker **position**.
- ISS and planetary tracks / loci.
- Milky Way zenith ribbon, band, ribs, altitude contours, viewing footprint.
- Entity marker **positions** (Sun, Moon, planets, ISS, city pins, earthquakes).
- Earthquake hover hit centres (same transform as painted discs).

### 8.2 Screen-space — keep constant visual size unless a later item says otherwise

- Top-band chrome, bottom HUD, Config UI, eclipse information panel, DEV banner.
- Stroke widths on tracks, loci, grid, eclipse outlines (CSS px today).
- Marker/glyph **radii** (Sun, Moon, planets, ISS, pins, earthquakes) once placed.
- Map labels (city names, event labels, earthquake text, Galactic center).
- Hover-label offset and hit **padding** in CSS px.
- Moon libration ring/crosshair and Earth-shadow overlay **on the glyph** (they are glyph-local; the glyph’s map position is geographic).

Several of these currently derive size from **viewport width** (`w * 0.0055` Sun, pin radius, label `em`). At identity that is 2.0.0. Under zoom, keep using the **scene viewport CSS width**, not the scaled world width, so glyphs do not inflate with zoom.

### 8.3 Mixed / semantic — choose deliberately in A1, do not invent a system

| Element | A1 direction |
|---------|----------------|
| Marker size vs zoom | Constant CSS size (screen-space). Semantic zoom (hide pins, denser grid) is Phase E. |
| Path stroke width | Constant CSS width. Paths still follow projected geometry. |
| Illumination / base-map texel density | Existing full-world rasters upscale. Softness when zoomed in is accepted. No tiles in A1. |
| Grid step (30°) | Unchanged. Lines may look sparse when zoomed in. |
| Locus trim-to-Moon-disc | Trim in **scene pixels** using the (constant) Moon radius so the seam still hides under the glyph. |
| Eclipse wrap copies | Keep existing ±360° copies; camera clip will hide off-screen copies. |
| Overlay readability veil | Unchanged (derived from solar geometry, not zoom). |

---

## 9. Interaction constraints

Decisions that can be made now:

1. **Wheel zoom applies only in the scene strip.** `canvasClientPointToSceneCss` already returns null over reserved top chrome. Do not zoom when the pointer is in that band or over DOM overlays (Config, launcher, eclipse panel).
2. **`preventDefault` on scene-strip wheel** so the page does not scroll. The canvas is full-window; accidental document scroll is the main conflict.
3. **Config / overlay wheel** continues to scroll those panels.
4. **Minimum scale = 1.** 2.0.0 full-world is the most zoomed-out view. Zoom-out at identity is a no-op clamp.
5. **Reset/default view** restores identity camera. Exact control (button vs key) may be chosen in A1; the behaviour is required.
6. **Earthquake hover** remains hover, not select. Hit-test through inverse camera.
7. **No map rotation.**
8. **Do not persist camera** in `LibrationConfigV2` in A1/A2. Identity is the default every session. Persistence is Phase E.
9. **DEV scenarios** stay startup config fixtures. Do not add `?zoom=` unless a later verification item needs it; identity is the scenario default.

Open questions that need implementation evidence (do not freeze now):

- Zoom toward **pointer** vs **viewport centre**. Pointer-stable zoom is better UX and uses `centerU/V` without being pan. Try it in A1; fall back to centre-zoom if it fights layout or tests.
- **Pinch/touch** in A1 vs wheel-only first. If pinch is deferred, still consider `touch-action: none` on `.render-canvas` so browser page-zoom does not steal gestures. Confirm against hover and Config.
- Numeric **maximum scale** (a starting band of about 4–8× is enough; tune if rasters or labels fail).
- Whether a visible zoom control is required in A1 besides wheel (ambient-instrument posture argues for wheel + reset first).
- Keyboard zoom. Not required for A1 unless wheel proves inaccessible in the verification environment.

A2 (pan) will add pointer/touch drag. Drag must not start from Config or the launcher. Distinguish drag pan from click; earthquake hover must survive pan (hover follows pointer; no selection).

---

## 10. Development sequence

Issue IDs continue `LIB-###`. Only listed work items exist as files; later slices are direction until scoped.

| Phase | Slice | ID | Status |
|-------|--------|----|--------|
| A — Camera foundation | A1 Zoom | [LIB-080](../../work/LIB-080-scene-camera-zoom.md) | proposed |
| A | A2 Pan | [LIB-081](../../work/LIB-081-scene-camera-pan.md) | proposed |
| A | A3 Camera consolidation | (incremental in A1/A2; no standalone LIB unless a gap remains) | — |
| B | Scene reference-frame foundation (Earth-fixed identity vs transform; not camera) | unscoped | — |
| C | Experimental Moon-fixed and Sun-fixed moving map | unscoped | — |
| D | Generalized entity-fixed anchor, if C validates | unscoped | — |
| E | Refinements | unscoped; inventory in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md#scene-view-and-projection) | — |

A1 must not implement pan UX, entity-fixed mode, or rotation. It must leave a camera struct that A2 can translate.

Phase E includes, and does not commit to: entity-selection UX, reference-frame selector UI, animated frame transitions, one-click reset polish, camera persistence, URL/shareable view, heading lock, map rotation, alternate projections, semantic zoom, entity-relative trails, tiles, globe/perspective.

---

## 11. Zoom milestone (LIB-080) — acceptance direction

Implement in a later approved intent. Direction:

- Smooth, predictable zoom of geographic/projected content.
- Identity camera indistinguishable from 2.0.0 default appearance (same layout, chrome registration, animation, scenarios).
- No change to astronomical calculations, entity payloads, time, or illumination policy.
- Geographically anchored overlays stay registered to the base map and to each other.
- Marker sizes and line widths stay screen-stable (viewport-based tokens, not world-scaled).
- Resize at identity matches 2.0.0; resize while zoomed keeps the same normalized camera.
- Time animation and scenario selection keep working while zoomed.
- Wheel on the scene does not scroll the browser page; chrome/Config do not zoom the map.
- Reset restores identity.
- Architecture permits pan next and does not block a later pre-projection reference-frame transform.

Mechanism: **view transform on already-projected coordinates at plan construction**, carried on scene render input. Not projection-parameter zoom, not backend `ctx.scale`, not a map library.

---

## 12. Validation

Reuse [`docs/VISUAL_VERIFICATION.md`](../../VISUAL_VERIFICATION.md) and existing `?scenario=` fixtures. Do not add pixel-diff infrastructure.

### 12.1 Automated (A1)

- Identity camera: existing plan-level geometry tests remain valid (full-world mapping).
- New focused tests: scale≠1 moves projected points and raster dest rects; stroke/marker CSS sizes unchanged; inverse mapping round-trips; clamp min/max; identity equals current helpers; hover hit uses the same transform.
- Resize: identity still fills the scene rect.
- `npx tsc --noEmit` and `npm test` on completion.
- Do not weaken existing assertions.

### 12.2 Visual (A1)

Canonical 1920×1080 when possible. At least:

| Check | Fixture |
|-------|---------|
| Default view unchanged | `baseline` at identity |
| Zoom in / out / clamp at min | `baseline` |
| Reset to default | `baseline` |
| Resize while zoomed | `baseline` |
| Time animation while zoomed | `baseline` or `terminator` Demo |
| Sun/Moon registration | `moon-libration`, `readability` |
| Lunar path / locus | `lunar-track`, `lunar-locus` (recent and `locusEpoch=standstill`) |
| Solar features | `solar-eclipse-total` or `solar-eclipse-2017` |
| Antimeridian | `lunar-track`, `solar-eclipse-dateline`, `lunar-eclipse-horizon` |
| Clouds registration | `clouds` |
| ISS track | `iss-presentation` |
| Earthquakes hover while zoomed | `earthquake-presentation` |
| Responsive layout / chrome unzoomed | `baseline` with Config open |

Future pan combinations are A2. A1 should not drag-pan.

---

## 13. Risks

Meaningful issues for implementers; not a backlog of extras.

1. **Plan builders are numerous.** Camera must be a shared mapping, not a one-off in a single overlay. Missing a builder desynchronizes that layer.
2. **Backend currently constructs plans.** Camera parameters must reach that call site via `SceneRenderInput` (or equivalent) without teaching the backend `SceneConfig`.
3. **Viewport-derived glyph sizes** vs world scale — easy to get wrong if builders use scaled width as `w`.
4. **Illumination and base-map softness** when zoomed in; accepted, not a tile project.
5. **Chrome vs map registration** only at identity — will look “wrong” if someone expects meridians to follow zoom. Document in UI copy only if users need it; do not zoom chrome to hide it.
6. **Wheel vs overlay stacking** and Cursor-browser verification environment.
7. **Antimeridian at zoom + later pan** near ±180°: identity already has wrap copies; pan will expose more. A1 zoom about centre mostly hides the dateline; still verify dateline scenarios at identity and modest zoom.
8. **Persisted config temptation.** Putting scale on `SceneConfig` would change the persistence boundary; A1 must not.

---

## 14. Non-goals for the architecture phase and for A1

Do not: implement zoom/pan/entity-fixed in this spec’s authoring; implement Moon-fixed or Sun-fixed; rotate the map; redesign unrelated UI; change astronomy; rewrite 2.0.0 illumination, eclipse, Clouds, or chrome to match an idealized camera module; add map libraries, tiles, or URL view state; broaden into globe/Mercator work.
