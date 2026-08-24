# Scene camera and map reference frame

## What this document is

The durable architecture for evolving Libration’s map from the **2.0.0 Earth-fixed full-world presentation** into an interactive viewing system, without rewriting stable 2.0.0 systems.

It owns intended structure, insertion points, rendering categories, interaction constraints, the development sequence, and zoom-milestone acceptance direction.

It does **not** own current implementation truth ([`docs/IMPLEMENTATION.md`](../../IMPLEMENTATION.md)), current status ([`docs/STATE.md`](../../STATE.md)), or permission to start work ([`docs/WORKFLOW.md`](../../WORKFLOW.md)). Speculative extras stay in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md). Durable invariants are in [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) and [ADR 0026](../../decisions/0026-scene-camera-independent-of-projection-and-reference-frame.md).

No production code is implied by this file existing in isolation. Zoom (A1) is implemented: [LIB-080](../../work/LIB-080-scene-camera-zoom.md). Pan (A2) is implemented: [LIB-081](../../work/LIB-081-scene-camera-pan.md). Scene reference-frame foundation (B) is implemented as Earth-fixed identity: [LIB-082](../../work/LIB-082-scene-reference-frame-foundation.md). Moon longitude-lock (first Phase C slice) is implemented: [LIB-083](../../work/LIB-083-moon-longitude-locked-scene-frame.md). Moon position-lock is implemented: [LIB-084](../../work/LIB-084-moon-position-locked-scene-frame.md). Sun longitude-lock and Sun position-lock are implemented: [LIB-085](../../work/LIB-085-sun-anchored-scene-frames.md). The shared anchored production model is implemented: [LIB-086](../../work/LIB-086-generalize-anchored-scene-reference-frames.md). Automatic scene-cover zoom for position-lock is implemented: [LIB-087](../../work/LIB-087-automatic-scene-cover-zoom-for-position-locked-frames.md). The trackable-map-object target identity is implemented: [LIB-088](../../work/LIB-088-trackable-map-object-foundation.md). ISS is a production trackable target: [LIB-089](../../work/LIB-089-iss-tracking-target.md). User-facing tracking is Tracking target + Tracking mode: [LIB-090](../../work/LIB-090-tracking-target-and-mode-ux-foundation.md). Additional entity-fixed kinds beyond Moon, Sun, and ISS are not implemented.

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
Scene reference-frame transform  (Earth-fixed identity; Moon/Sun longitude-lock or position-lock)
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
| Scene reference frame | No | No | Transform **before** projection (Earth-fixed, Moon/Sun longitude-lock, or Moon/Sun position-lock) |
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
| Scene camera | Runtime `SceneCamera` on `SceneRenderInput` (`scale`, `centerU`, `centerV`) | No (LIB-080) |
| Scene/map reference frame | Runtime `SceneReferenceFrame` on `SceneRenderInput` (Earth-fixed default; Moon longitude-lock; Moon position-lock; Sun longitude-lock; Sun position-lock) | No (LIB-082–085) |
| Pointer scene CSS | `App.tsx` ref; earthquake hover only | No |
| Demo playback | Runtime ref | Transport not persisted |

`SceneRenderInput` (`src/renderer/types.ts`) already carries frame, full viewport, layers, and `sceneLayerViewportPx`. It is the natural per-frame carrier for camera parameters.

### 4.5 Wrap / antimeridian (already present)

Earth-fixed 2.0.0 already unwraps short-arc polylines and paints ±360° copies for loci, tracks, eclipse geography, and Milky Way (`equirectSeamPath.ts`, `equirectSeamRegion.ts`, lunar locus world copies). Illumination samples wrap longitude.

LIB-081 adds viewport-intersecting **display copies** of that already-projected strip (`sceneCameraHorizontalWorldCopyOffsets`): rasters use dest-intersection (slop 0); seam-unwrapped vectors use 5% width slop; at most four copies. Canonical lon/lat is not mutated. That is still Earth-fixed strip periodicity, not scene reference-frame longitude continuity. Camera wrapping and reference-frame continuity are separate problems.

### 4.6 Interactions today

- Pointer move/leave/cancel on the canvas → earthquake hover via `canvasClientPointToSceneCss` (null in the top chrome band). Inverse camera is applied so hover matches painted discs while zoomed.
- Hover is not click/select.
- Wheel zoom on the scene strip (LIB-080). Pointer drag pan on the scene strip (LIB-081; 4 CSS px threshold; `touch-action: none`; no pinch).
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
- `centerU` is continuous / unwrapped. The horizontal world is periodic; values such as `1.05` are valid camera positions. `centerV` is clamped to the visible projected latitude extent (at scale 1 it is 0.5).
- Identity is specifically `scale = 1`, `centerU = 0.5`, `centerV = 0.5`, not merely `scale === 1`. Horizontal pan at scale 1 is allowed.
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
4. Plan builders: transform canonical lon/lat through the scene/map reference frame (Earth-fixed identity, Moon/Sun longitude-lock, or Moon/Sun position-lock), project with the existing helpers onto the **identity world strip**, then apply the camera similarity (uniform scale about `centerU/V` into the scene rect). Raster dest rects use the same camera transform plus, under anchored frames, a continuous horizontal strip shift and, under position-lock, a vertical dest shift with no vertical wrap. Clip remains the scene strip.
5. Inverse camera + inverse projection + inverse frame for pointer hit-testing (earthquake hover today uses the shared forward mapping, which includes the frame).

A1 may only *expose* scale. The struct should still include centre so pan is not a redesign, and so zoom-about-pointer can keep a projected point stable without calling that “pan navigation.”

### 5.3 What stays out of the camera

- Canonical UTC, demo transport, event playback.
- Layer payloads (subsolar/sublunar points, tracks, loci, eclipse geography, ISS, planets, Clouds bytes).
- `SceneConfig` composition, base-map family, illumination policy.
- Chrome layout and drawing.
- Scene reference-frame transform (Earth-fixed identity; Moon/Sun longitude-lock; Moon/Sun position-lock).
- Persistence and URL/shareable view (Phase E).

---

## 6. Scene reference frame (LIB-082 / LIB-083 / LIB-084 / LIB-085 / LIB-086)

A scene/map reference frame transforms **already-computed** geographic positions **before** projection. It is not a camera, not a projection parameter, and not civil-time reference.

```text
canonical physical / geographic lon/lat
        ↓
scene reference-frame transform     (Earth-fixed identity; anchored longitude-lock or position-lock)
        ↓
scene-frame lon/lat
        ↓
equirectangular projection
        ↓
SceneCamera (pan, zoom, horizontal wrap)
```

**Canonical physical coordinates are authoritative.** Scene-frame coordinates are derived presentation state. Do not overwrite Moon, Sun, ISS, earthquake, or other entity lon/lat with frame-relative values.

**Projection is separate.** Equirectangular helpers still map scene-frame lon/lat. Do not add Moon/Sun cases to generic projection helpers.

**Camera is separate.** `SceneCamera` remains `{ scale, centerU, centerV }` over projected scene-frame space. Do not put frame type, time, anchor entity, or longitude-normalization policy on the camera. Anchored frames must not write Moon or Sun coordinates into `centerU` / `centerV`.

### 6.0 Production model (LIB-086 / LIB-088 / LIB-089)

Production `SceneReferenceFrame` is:

```text
earthFixed                          identity (not a target)

anchored
    target                          TrackableMapObjectId   (moon | sun | iss)
    lockMode                        longitude | position
    continuousAnchorLonDeg
    anchorLatDeg
```

`lockMode: longitude` is longitude locked with latitude identity. `lockMode: position` is both axes locked. Latitude-only lock and unlocked anchored frames are not constructible.

Moon, Sun, and ISS are production **trackable map object** identities (`src/core/trackableMapObject.ts`). Forward/inverse transform, raster dest shift, camera vertical extent, longitude continuity, and automatic cover branch on Earth-fixed vs anchored and on `lockMode` — not on which object is the target. Target resolution is a separate seam: canonical instant + authoritative product state → canonical lon/lat, then the frame is built from those numbers. Moon uses the existing `sublunarPoint`; Sun uses the existing `subsolarPoint`; ISS uses the existing ISS current sample (`resolveIssCurrentSample`) when the overlay would itself paint (`issTrackShouldPaint`). Runtime policy: `src/core/sceneFrameAnchor.ts`. Selection UI: `src/core/trackingSelection.ts`. ISS availability: [ADR 0033](../../decisions/0033-iss-tracking-reuses-anchored-frame-target-architecture.md). Orthogonal target/mode UI: [ADR 0034](../../decisions/0034-tracking-ui-is-orthogonal-target-and-mode.md).

User-visible tracking is **Tracking target** + **Tracking mode**. Those map into Earth-fixed or `target + lockMode`. Combined UI ids are compatibility aliases, not transform kinds.

See [ADR 0030](../../decisions/0030-anchored-scene-frames-are-one-production-kind.md), [ADR 0032](../../decisions/0032-anchored-frames-target-a-trackable-map-object.md), [ADR 0033](../../decisions/0033-iss-tracking-reuses-anchored-frame-target-architecture.md), and [ADR 0034](../../decisions/0034-tracking-ui-is-orthogonal-target-and-mode.md).

### 6.0.1 Trackability contract

A rendered map object may become a tracking target only if it provides:

1. A stable identity independent of current coordinates.
2. Authoritative canonical geographic lon/lat.
3. Coordinates for the same canonical UTC instant as the rendered frame.
4. If it moves, longitude that can be followed continuously through ±180°.
5. Position-lock that is meaningful as north-up map translation (not heading-up chase).
6. Displayed map position that matches the resolver’s canonical coordinates.

Future targets may be **dynamic** (Moon, Sun, ISS) or **static** (later city pins). The frame does not require motion. Clickable object selection is not implemented. Earthquakes are not tracking targets.

### 6.1 Earth-fixed identity (default)

`SceneReferenceFrame` kind `earthFixed`. Forward and inverse are exact identity:

```text
sceneLongitude = canonicalLongitude
sceneLatitude  = canonicalLatitude
```

No extra canonical wrap is applied on this path (LIB-081 numeric behaviour is preserved). Identity short-circuits the same way the identity camera does.

Runtime location: `SceneRenderInput.sceneReferenceFrame`, defaulted in `buildSceneRenderInput`. Not persisted, not `scene.viewMode`, not URL/storage. Earth-fixed is the load default.

Shared mapping: `sceneXFromLongitudeDeg` / `sceneYFromLatitudeDeg` compose **frame → projection → camera**. Inverse: `canonicalLongitudeDegFromSceneX` / `canonicalLatitudeDegFromSceneY` compose **inverse camera → inverse projection → inverse frame**.

### 6.2 Moon longitude-lock (LIB-083)

User-visible Moon longitude-lock. Production: `anchored` with `target: "moon"` and `lockMode: "longitude"`.

```text
sceneLon = nearestEquivalent(canonicalLon, λMoon_continuous) − λMoon_continuous
sceneLat = canonicalLat
```

The Moon maps to scene longitude `0°` (centre of the identity strip). Latitude is not subtracted. Vertical Moon motion remains the real sublunar latitude.

**Continuous lunar anchor.** Derived from `sublunarPoint` at the canonical UTC instant. Follows `continuousLongitudeFollowingCanonicalDeg` so a canonical `178 → 179 → 180 → −179 → −178` sequence is `178 → 179 → 180 → 181 → 182`. Exact-360° rebase is allowed for numeric range; canonicalizing the anchor every frame is not.

**Sign convention.** Positive scene longitude is east of the Moon. As the sublunar point travels west, terrestrial features drift east in the scene. Do not reverse the transform for a preferred visual direction.

**Epoch policy.** While the mode stays active, time jumps (Demo, direct selection, tour) follow the nearest equivalent of the new canonical longitude. A new scene/frame epoch reinitializes from canonical longitude: first entry, reload, switching in from Earth-fixed. Switching out clears continuous state.

**Camera on switch.** Changing Tracking target, or changing Tracking mode while a target is selected, reinitializes camera policy (identity, or automatic cover on the destination position-lock frame) and does not carry a manual zoom override. Reset view resets the camera only and does not change target or mode. Continuity is tracking-session-local: a target switch reinitializes continuous longitude from the new target. A mode-only switch on the same target preserves continuous longitude.

**Rasters.** Shift the existing full-world equirectangular strip by `−λMoon_continuous / 360 × width` and paint periodic dest copies. Base map, illumination, and Clouds share that dest.

**Global branch cut.** Independent nearest-equivalent relative longitude has a seam ~180° from the Moon. Whole-Earth presentation uses periodic copies plus seam-aware path unwrap in scene-frame longitude. Canonical antimeridian, Moon-frame antipode, and camera display wrap are distinct.

**UI.** Compact runtime **Target** and **Mode** controls: Earth-fixed / Moon / Sun / ISS and Longitude / Position. Mode is disabled under Earth-fixed. Not a generalized selector. Click-to-track is not implemented; the canonical seam is `setTrackingTarget`.

See [ADR 0027](../../decisions/0027-moon-longitude-lock-is-a-scene-reference-frame.md).

### 6.3 Moon position-lock (LIB-084)

User-visible Moon position-lock. Production: `anchored` with `target: "moon"` and `lockMode: "position"`. Same architecture as longitude-lock; second supported lock mode.

```text
sceneLon = nearestEquivalent(canonicalLon, λMoon_continuous) − λMoon_continuous
sceneLat = canonicalLat − moonAnchorLat
```

The Moon maps to scene `(0°, 0°)`. Scene-frame latitude is not geographic latitude and may leave ±90°. Latitude is not periodic; do not wrap, mirror, or reuse longitude seam helpers vertically.

**Anchor.** Longitude continuity is unchanged from §6.2. Latitude is the current sublunar latitude; there is no latitude continuity state.

**Rasters.** Horizontal shift as in §6.2, plus vertical dest shift `−moonAnchorLat / 180 × height`. No vertical copies. Beyond the translated Earth strip, the scene shows the normal background.

**Projection.** Equirectangular Y mapping is linear in scene-frame latitude, including values outside geographic ±90°.

**Camera.** Identity (`1, 0.5, 0.5`) remains the geometric identity of the camera struct. For position-lock the **product default view** is automatic scene-cover zoom: the minimum scale so the origin-centred vertical window lies inside the translated Earth extent ([LIB-087](../../work/LIB-087-automatic-scene-cover-zoom-for-position-locked-frames.md), [ADR 0031](../../decisions/0031-position-lock-default-camera-is-automatic-scene-cover-zoom.md)). Time must not write `centerV`. Cover updates scale only. Manual wheel zoom suspends auto-cover; Reset view and entering position-lock re-arm it. At scale 1, `centerV` stays 0.5; blank beyond translated Earth is still what identity shows, and is reachable again under a manual zoom override. At scale > 1, pan/zoom clamp against the scene-frame Earth extent.

See [ADR 0028](../../decisions/0028-moon-position-lock-translates-scene-frame-latitude.md).

### 6.4 Sun longitude-lock (LIB-085)

User-visible Sun longitude-lock. Production: `anchored` with `target: "sun"` and `lockMode: "longitude"`. Same lock semantics as §6.2; second production target.

```text
sceneLon = nearestEquivalent(canonicalLon, λSun_continuous) − λSun_continuous
sceneLat = canonicalLat
```

The subsolar point maps to scene longitude `0°`. Latitude is not subtracted. Vertical Sun motion remains the real subsolar latitude.

**Anchor.** Derived from `subsolarPoint` at the canonical UTC instant. Continuity policy is identical to the Moon: follow nearest equivalent while the frame stays active; reinitialize on a new frame epoch.

**Solar noon interpretation.** Scene longitude zero is the current **subsolar meridian**. Regions passing that meridian are passing the Sun-relative central meridian. This is not civil clock noon.

**Illumination.** Day/night samples remain canonical geographic/time physics. The raster dest shares the Earth shift with base map and Clouds. Do not special-case shading to look stationary.

See [ADR 0029](../../decisions/0029-sun-anchoring-reuses-moon-axis-lock.md).

### 6.5 Sun position-lock (LIB-085)

User-visible Sun position-lock. Production: `anchored` with `target: "sun"` and `lockMode: "position"`. Same lock mode as §6.3; solar target.

```text
sceneLon = nearestEquivalent(canonicalLon, λSun_continuous) − λSun_continuous
sceneLat = canonicalLat − sunAnchorLat
```

The subsolar point maps to scene `(0°, 0°)`. Scene-frame latitude may leave ±90°. Latitude is not periodic. Vertical Earth motion follows solar declination and is slow; verify with deterministic seasonal epochs, not real-time waiting.

**Rasters / camera.** Same dest-shift and translated-Earth extent rules as Moon position-lock (§6.3), using the solar anchor. Product default camera is the same automatic cover policy as Moon position-lock ([LIB-087](../../work/LIB-087-automatic-scene-cover-zoom-for-position-locked-frames.md)).

See [ADR 0029](../../decisions/0029-sun-anchoring-reuses-moon-axis-lock.md).

### 6.5.1 ISS longitude-lock (LIB-089)

User-visible ISS longitude-lock. Production: `anchored` with `target: "iss"` and `lockMode: "longitude"`. Same transform as Moon/Sun longitude-lock.

```text
sceneLon = nearestEquivalent(canonicalLon, λIss_continuous) − λIss_continuous
sceneLat = canonicalLat
```

The ISS sub-satellite point maps to scene longitude `0°`. Physical ISS latitude remains unlocked, so the glyph moves north/south as the orbit progresses. Earth translates horizontally. Camera default is identity. Automatic cover is not applied merely because the target is ISS.

Authoritative position is the existing ISS current sample at the canonical product instant, not a second propagator. Tracking is unavailable when that sample is missing or would not paint.

### 6.5.2 ISS position-lock (LIB-089)

User-visible ISS position-lock. Production: `anchored` with `target: "iss"` and `lockMode: "position"`. Same transform and cover policy as Moon/Sun position-lock.

```text
sceneLon = nearestEquivalent(canonicalLon, λIss_continuous) − λIss_continuous
sceneLat = canonicalLat − issAnchorLat
```

The ISS maps to scene `(0°, 0°)` because it uses the same canonical position that resolved the anchor. Cover scale is `1 / (1 − |anchorLat| / 90)` from the resolved ISS latitude, not a hard-coded inclination. Manual override, Reset, pan, and camera independence are unchanged.

See [ADR 0033](../../decisions/0033-iss-tracking-reuses-anchored-frame-target-architecture.md).

### 6.6 Horizontal camera wrapping ≠ reference-frame longitude continuity

LIB-081 copies the already-projected strip so a panned camera can show the dateline. That does not unwrap an anchor that crosses ±180°.

Entity-fixed frames need **continuous/unwrapped anchor longitude**. Primitives live in `src/core/longitudeContinuity.ts`:

| Kind | Interval / behaviour |
|------|----------------------|
| Canonical longitude | (−180, 180]; `+180` kept; `−180` → `+180` |
| Wrapped longitude delta | shortest signed eastward difference in (−180, 180]; 180° tie is `+180` east |
| Continuous / unwrapped longitude | may leave ±180 (181, 541, …); used for anchors |
| Nearest equivalent longitude | continuous value on the same meridian closest to a *near* longitude |
| Rebase | fold by exact 360° turns into (−540, 540] without canonicalizing |

Relative-longitude rule for a frame anchored at continuous `λa`:

```text
Δλ = nearestEquivalent(λ, λa) − λa
```

The relative result is **not** re-wrapped to ±180.

Latitude is not wrapped. Position-lock subtracts the active anchor latitude (Moon, Sun, or ISS); longitude-lock does not.

ISS longitude-lock and ISS position-lock are implemented ([LIB-089](../../work/LIB-089-iss-tracking-target.md), [ADR 0033](../../decisions/0033-iss-tracking-reuses-anchored-frame-target-architecture.md)). Further trackable targets are **not** implemented. A later target should reuse this identity + resolution + common lock-mode path rather than invent a special transform.

Entity-fixed is **not** “each frame assign camera centre to the entity.” The entity defines the origin of the scene-frame world; the user still zooms and pans with `SceneCamera`.

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
5. **Reset/default view** restores the frame default camera. Earth-fixed and longitude-lock: identity. Position-lock: current automatic cover (which may be `scale > 1`). Reset is disabled at that default. Exact control (button vs key) may be chosen in A1; the behaviour is required.
6. **Earthquake hover** remains hover, not select. Hit-test through inverse camera.
7. **No map rotation.**
8. **Do not persist camera** in `LibrationConfigV2` in A1/A2. Identity is the default every session. Persistence is Phase E.
9. **DEV scenarios** stay startup config fixtures. Do not add `?zoom=` unless a later verification item needs it; identity is the scenario default.

Open questions that A1 (LIB-080) resolved:

- Zoom is **pointer-stable** (world point under the pointer is preserved subject to clamp).
- **Pinch** remains out of scope. A2 sets `touch-action: none` on the scene canvas so Pointer Events can pan; single-finger touch pan uses the same path as mouse. Pinch zoom is not implemented.
- Maximum scale is **8**.
- Visible control is **Reset view** only (no +/- buttons).
- Keyboard zoom is not required.

A2 (pan) adds pointer drag on the scene strip. Drag does not start from Config, the launcher, or reserved top chrome. A 4 CSS px threshold distinguishes drag from click; earthquake hover is suppressed during an active pan and resumes afterward, including on wrapped display copies.

---

## 10. Development sequence

Issue IDs continue `LIB-###`. Only listed work items exist as files; later slices are direction until scoped.

| Phase | Slice | ID | Status |
|-------|--------|----|--------|
| A — Camera foundation | A1 Zoom | [LIB-080](../../work/LIB-080-scene-camera-zoom.md) | complete |
| A | A2 Pan | [LIB-081](../../work/LIB-081-scene-camera-pan.md) | complete |
| A | A3 Camera consolidation | (incremental in A1/A2; no standalone LIB unless a gap remains) | — |
| B | Scene reference-frame foundation (Earth-fixed identity vs transform; not camera) | [LIB-082](../../work/LIB-082-scene-reference-frame-foundation.md) | complete |
| C | Experimental Moon longitude-locked moving map | [LIB-083](../../work/LIB-083-moon-longitude-locked-scene-frame.md) | complete |
| C2 | Moon latitude lock / position-locked frame | [LIB-084](../../work/LIB-084-moon-position-locked-scene-frame.md) | complete |
| C3 | Sun-anchored longitude-lock and position-lock | [LIB-085](../../work/LIB-085-sun-anchored-scene-frames.md) | complete |
| C4 | Shared anchored production model (Moon/Sun) | [LIB-086](../../work/LIB-086-generalize-anchored-scene-reference-frames.md) | complete |
| C5 | Automatic scene-cover zoom for position-lock | [LIB-087](../../work/LIB-087-automatic-scene-cover-zoom-for-position-locked-frames.md) | complete |
| D | Generalized entity-fixed anchor, if C validates | — | unscoped |
| E | Refinements | unscoped; inventory in [`docs/FUTURE_FEATURES.md`](../../FUTURE_FEATURES.md#scene-view-and-projection) | — |

A1 must not implement pan UX, entity-fixed mode, or rotation. It must leave a camera struct that A2 can translate.

Phase E includes, and does not commit to: entity-selection UX, reference-frame selector UI, animated frame transitions, one-click reset polish, camera persistence, URL/shareable view, heading lock, map rotation, alternate projections, semantic zoom, entity-relative trails, tiles, globe/perspective.

---

## 11. Zoom milestone (LIB-080) — acceptance direction

Implemented in LIB-080. Direction that shipped:

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

### 12.3 Pan (A2 / LIB-081)

Implemented. Direction that shipped:

- Pointer drag pan; geography follows the pointer; 4 CSS px threshold.
- `centerU` unwrapped; `centerV` latitude-clamped; identity is `1, 0.5, 0.5`.
- Viewport-intersecting horizontal display copies; canonical lon/lat unchanged.
- Pointer-stable zoom after pan, including unwrapped `centerU`.
- Reset from any zoom+pan+wrap combination.
- Wrapped earthquake hover hits the canonical feature.
- `touch-action: none`; single-finger Pointer Events pan; no pinch.

Visual extras on the A1 fixtures: 1× horizontal wrap both directions, vertical no-op at 1×, zoom+pan at ~2×/~4×, dateline eclipse, clouds/ISS/earthquake wrap, resize while panned.

### 12.4 Reference-frame foundation (B / LIB-082)

Implemented as Earth-fixed identity. User-visible scene must match completed LIB-081.

Automated: forward/inverse identity (no wrap drift); frame then projection then camera equals LIB-081 mapping (identity, zoom, pan, unwrapped `centerU`); wrapped display copies; hover through the inverse frame path; longitude continuity primitives; synthetic relative-longitude continuity across the antimeridian (not a production frame kind).

Visual: regression of the A1/A2 fixture set. Any registration drift is a defect, not architectural noise.

### 12.5 Moon longitude-lock (C / LIB-083)

Implemented. Earth-fixed remains the default and must still match completed LIB-082.

Automated: Moon scene longitude is the frame origin; latitude identity; continuous antimeridian anchor; forward/inverse; antipodal copies; raster dest shift shared by base map and illumination; camera composition (identity, zoom, pan, unwrapped `centerU`); pointer-stable zoom; earthquake hover; seam-sensitive path; frame-switch camera reset; Reset view does not change the frame.

Visual: Earth-fixed regression, then Moon-frame static/animated, lunar antimeridian, antipodal seam, `lunar-track`, `lunar-locus`, `moon-libration`, solar eclipse, `solar-eclipse-dateline`, Clouds, ISS, earthquake hover, resize. The Moon stays horizontally fixed in **scene-frame** longitude (not necessarily screen-centre after pan). Latitude remains unlocked.

### 12.6 Moon position-lock (C2 / LIB-084)

Implemented. Earth-fixed and longitude-lock remain distinct and must still match completed LIB-083.

Automated: position-lock Moon origin `(0, 0)`; longitude-lock regression (`sceneLat = canonicalLat`); latitude forward/inverse including outside ±90°; linear projection outside geographic range; raster vertical dest shared by base map and illumination; vector/raster registration; camera composition; vertical Earth-extent clamp; Reset; frame-switch; hover after both-axis translation; time progression (Earth moves, Moon stays).

Visual: Earth-fixed and longitude-lock regression; position-lock static (Moon at origin, Earth translated, no vertical wrap); animated (Moon X and Y fixed, Earth both axes); standstill/extreme latitude; lunar antimeridian with latitude lock; camera independence; Clouds; ISS; earthquake; eclipse; resize.

### 12.7 Sun-anchored frames (C3 / LIB-085)

Implemented. Earth-fixed and both Moon modes remain distinct and must still match completed LIB-084.

Automated: five production configurations; Sun longitude origin; Sun position origin; continuous solar longitude through the antimeridian; latitude identity vs subtract including outside ±90°; inverse; raster dest X (longitude-lock) and X+Y (position-lock) shared by base map and illumination; camera composition; vertical Earth-extent clamp; frame-switch camera reset; hover under Sun position-lock with wrap; Moon-as-non-anchor track transform; eclipse-like polyline under Sun frame; seasonal solar-latitude pair with Sun remaining at origin.

Visual: Earth-fixed and Moon regression; Sun longitude-lock static/animated; solar antimeridian; Sun position-lock static and seasonal comparison; camera independence; illumination/Clouds registration; Moon/lunar layers; ISS; earthquakes; solar eclipse total and dateline; resize.

### 12.8 Shared anchored production model (LIB-086)

Implemented. User-visible behaviour must match completed LIB-085. No new frame choice.

Automated: Moon and Sun anchored frames share one structural type except `target`, coordinates, and `lockMode`; lock semantics independent of `target`; identical numeric anchors produce identical forward/inverse/raster/camera-extent/cover-scale results; Earth-fixed identity; five UI choices map to Earth-fixed or `target + lockMode`; retained Moon/Sun acceptance tests.

Visual: five-mode regression matrix against LIB-085 (Earth-fixed, Moon longitude-lock, Moon position-lock, Sun longitude-lock, Sun position-lock); cross-anchor switching with camera reset; representative layers; camera independence; resize.

### 12.8.1 Trackable map object foundation (LIB-088)

Implemented. User-visible behaviour must match completed LIB-087. No new frame choice.

Automated: Moon and Sun have distinct stable target identities; five UI choices map to Earth-fixed or `target + lockMode`; Moon resolves from existing sublunar state and Sun from existing subsolar state; identical numeric anchors produce identical forward/inverse/raster/extent/cover results regardless of target; continuity remains target-independent; retained Moon/Sun acceptance, frame-switch, and inverse hover tests.

Visual: five-mode regression against LIB-087 including auto-cover and manual override; cross-target switching; representative overlays; resize.

### 12.8.2 ISS tracking target (LIB-089)

Implemented. ISS is a third `TrackableMapObjectId`. No new reference-frame transform, camera, wrap, or cover architecture.

Automated: `"iss"` identity; valid ISS state resolves to canonical lon/lat; missing/invalid ISS cannot construct an anchored frame; Moon/Sun resolution unchanged; seven UI choices map to Earth-fixed or `target + lockMode`; ISS longitude-lock (scene lon ≈ 0, scene lat = ISS lat); ISS position-lock (origin); same-state invariant; antimeridian and multi-turn continuity; auto-cover at equator / mid / ~51.6° from generic formula; manual override / Reset / frame switch; camera independence; raster/vector registration; ISS track registration; inverse hover.

Visual: `iss-presentation` ISS longitude-lock (meridian lock, north/south motion, registered track, no antimeridian jump); ISS position-lock (origin, both-axis Earth motion, auto-cover vs latitude); accelerated Demo orbit; equator vs high-latitude cover; manual override then Reset; pan; Moon ↔ Sun ↔ ISS switches; resize auto vs manual; representative overlays. On `baseline`, ISS options are disabled until a valid ISS position exists.

A redesigned Tracking target + Tracking mode control is implemented in [LIB-090](../../work/LIB-090-tracking-target-and-mode-ux-foundation.md). Click-to-track is not in scope there.

### 12.8.3 Tracking target and mode UX (LIB-090)

Implemented. Product/interaction refactor only. Production `SceneReferenceFrame` and camera/cover math are unchanged.

Automated: Earth-fixed and each Moon/Sun/ISS × longitude/position state; target control maps to `null | moon | sun | iss`; mode maps to `longitude | position`; same mode on different targets without combined-kind logic; mode retained across target switches; Earth-fixed is no-target; ISS disabled/unavailable fallback; camera reset on target or effective mode change; auto-cover only for tracked position-lock; Reset does not change target/mode; target switch reinitializes continuity; mode-only switch preserves continuity.

Visual: initial Earth-fixed with mode disabled; Moon/Sun/ISS target+mode matrix; ISS unavailable; mode retention across targets; Earth-fixed return; camera/cover/Reset; representative overlays; resize 1280×720.

### 12.9 Automatic scene-cover zoom (LIB-087)

Implemented. Camera policy only; frame mathematics unchanged from LIB-086.

Automated: Earth-fixed and longitude-lock remain identity default; position-lock cover scale is shared (not Moon/Sun branched); ~0° latitude → scale ~1; ±latitude, lunar extreme, solar solstice cover and are the minimum sufficient scale; Moon/Sun latitudes fit max 8; auto-cover does not write `centerV` from the anchor; manual zoom policy suspends rewrite; Reset/frame-switch re-arm; resize does not change the normalized cover scale.

Visual: Moon position-lock ordinary and extreme/standstill latitudes with no translation-caused top/bottom blank band; Moon stays frame-fixed; accelerated lunar-latitude animation with adapting zoom and no camera-follow; manual wheel override then time advance then Reset; Sun position-lock near equinox and solstice; Moon/Sun longitude-lock and Earth-fixed regression; resize with auto-cover and with manual override; representative overlays (base map, illumination, Clouds, Moon/Sun marker, lunar track or locus, ISS, eclipse geometry) remain registered.

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

Do not: treat this spec as permission to start unscoped slices; implement generic entity-fixed without a work item; rotate the map; redesign unrelated UI; change astronomy; rewrite 2.0.0 illumination, eclipse, Clouds, or chrome to match an idealized camera module; add map libraries, tiles, or URL view state; broaden into globe/Mercator work. Zoom, pan, Earth-fixed identity, Moon longitude-lock, Moon position-lock, Sun anchoring, the shared anchored production model, position-lock automatic cover zoom, the trackable-map-object target identity, ISS tracking, and Tracking target + Tracking mode UX are implemented (LIB-080–090). Further targets (cities, planets) and click-to-track are not authorized by this spec.
