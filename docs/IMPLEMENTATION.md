# Libration implementation

This document describes **how the current code actually works**. It is the reference a developer or agent should read before modifying the application.

Scope of ownership:

- This document owns current implementation truth: entry points, control flow, module responsibilities, and the concrete behaviour of each subsystem.
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) owns the durable boundaries and invariants that this implementation is required to respect. Where an invariant is relevant here, it is linked rather than restated.
- [`docs/PROJECT_STRATEGY.md`](PROJECT_STRATEGY.md) owns product intent.
- [`docs/STATE.md`](STATE.md) owns current development state. This document deliberately contains no status, phase, or scheduling information.

Everything below was established by reading the source at the time of writing. Where the code contains a transitional or surprising arrangement, that is described as it is, not as it ought to be.

---

## 1. Application and platform model

Libration is a **single-page browser application**. The stack is React 19, TypeScript, and Vite 7. Rendering is done with the Canvas 2D API onto one full-window canvas element. Persistence is browser `localStorage`.

```bash
npm install        # once
npm run dev        # Vite dev server, http://localhost:1420
npm test           # Vitest, run mode
npm run build      # tsc && vite build
```

The dev server port is fixed at `1420` with `strictPort: true` in `vite.config.ts`, because a Tauri desktop shell expects a known port.

### The Tauri shell

The repository contains a configured Tauri 2 shell in `src-tauri/` (Cargo manifest, `tauri.conf.json`, capabilities, icons, build script), and `@tauri-apps/api` plus `@tauri-apps/plugin-opener` are declared as dependencies.

**No file under `src/` imports anything from `@tauri-apps`.** The application does not call Tauri APIs, does not use a Tauri-provided filesystem or HTTP path, and stores its state in browser `localStorage`. Network acquisition uses `fetch`.

The accurate statement is therefore: the shell exists and is configured for desktop packaging, but it is **not load-bearing** in the current application architecture. The application behaves identically whether loaded through Vite in a browser or through the Tauri webview. Whether the shell should become load-bearing — for filesystem-backed caching, native menus, or packaged distribution — is an open product question, not a settled one. See [ADR 0006](decisions/0006-browser-first-spa-with-non-load-bearing-tauri-shell.md).

The npm package name is `libration`. `index.html` and `tauri.conf.json` (`productName` and window `title`) identify the application as Libration. The Tauri Rust crate name (`tauri-app`) and bundle identifier (`com.user.tauri-app`) remain scaffold leftovers; they are not architectural signals.

### Offline behaviour

The application is usable with no network. All base-map rasters, the emissive night-lights raster, and the font assets are bundled and served from `public/`. Clouds/IR and earthquakes fall back to recorded fixtures when live acquisition fails. ISS hides when CelesTrak is unavailable (fixture is tests/DEV only and is never painted as live). Nothing in the render path requires the network.

---

## 2. Startup

`index.html` loads `src/main.tsx`, which mounts `<App />` into `#root`.

`src/App.tsx` is the application shell. On first render it establishes several refs that hold the authoritative runtime state outside React's render cycle:

| Ref | Holds |
|-----|-------|
| `workingV2Ref` | The normalized `LibrationConfigV2` document — the authoritative persisted configuration. |
| `derivedAppConfigRef` | The runtime `AppConfig` derived from it via `v2ToAppConfig`. |
| `registryRef` | The `LayerRegistry` built from the derived config. |
| `canvasRef` | The single canvas element. |
| `demoPlaybackRef` | Demo-time playback state (transport position, pause flag). |
| `dynamicLifecycleHostRef` | The process-local dynamic data lifecycle host. |
| `productInstantMsRef` | The most recent canonical product instant. |

Configuration is seeded by `resolveStartupWorkingV2(storage, buildFallback)` in `src/config/v2/workingV2Persistence.ts`:

1. If no `Storage` is available, normalize and use the fallback document.
2. Otherwise attempt `loadPersistedWorkingV2(storage)`, which reads, parses, and **validates** the persisted document.
3. If loading yields nothing (absent, unparseable, or invalid), normalize and use the fallback.

Normalization is unconditional on both paths, so the working document is always in canonical form before anything else reads it.

### Development-only visual scenarios

In the Vite development server only (`import.meta.env.DEV`), `src/main.tsx` may apply `?scenario=<id>` **before** mounting `<App />`. Detection is centralized in `src/dev/visualScenarios.ts`. The registry builds a normalized `LibrationConfigV2` from `defaultLibrationConfigV2()` plus named overrides, with demo time enabled at a documented UTC instant and live dynamic feeds forced off. `iss-presentation` is the exception that turns `orbitalTracks` back on and installs a process-local prepared ISS view (recorded TLE, in-process SGP4, no network) so Space objects presentation controls can be inspected. Production ISS provenance is unchanged: the hatch never runs outside that DEV scenario, and fixture-as-live remains suppressed.

`src/App.tsx` (the shell, not the renderer) then:

1. Passes `null` storage into `resolveStartupWorkingV2` so persisted user configuration cannot contaminate the fixture.
2. Seeds `demoPlaybackRef` with `createPausedDemoPlaybackState`, so the product instant is the scenario UTC and stays frozen across reloads.
3. Shows a small HTML banner with the scenario id and UTC (or a visible unknown-id error). Banner CSS is imported from the same DEV-only module. The Canvas backend, layers, and `RenderPlan` do not see the query string.

While a scenario is applied, `persistWorkingV2` is a no-op (`setWorkingV2PersistenceSuppressed`), so fixture edits do not overwrite `libration.workingConfigV2.v1`. Unknown ids do not suppress persistence and do not substitute another scenario.

A DEV scenario may also install a process-local extra overlay builder (`setVisualScenarioExtraOverlayBuilder` in `src/dev/visualScenarioRuntime.ts`). The shell appends an upstream-resolved `resolvedRenderPlan` vector layer (drawn below the sublunar marker) when a builder is present. Production never installs a builder. `lunar-locus` enables the production Lunar locus scene row rather than that extra-overlay path. `moon-libration` uses the production Moon glyph (no extra overlay).

Production builds never import the registry (the dynamic import sits inside the DEV branch) and ignore `?scenario=`. Procedure: [`docs/VISUAL_VERIFICATION.md`](VISUAL_VERIFICATION.md).

The layer registry is then built by `createLayerRegistryFromConfig` (`src/app/bootstrap.ts`), which asks `planSceneStackComposition(config.scene)` for the resolved base-map part and ordered overlay parts, registers the base-map layer, and registers one layer per enabled overlay instance through `createLayerForSceneOverlayInstance`. Layers do not decide their own stacking; composition order, opacity, and `zIndex` come from the scene plan.

Two startup effects then run:

- `syncDynamicLifecycleConsumers()` — arms dynamic-data acquisition for whatever the persisted configuration already had enabled, so a saved session resumes without requiring the user to toggle anything. The same helper runs after every `updateConfig` commit. If the lifecycle host has been `dispose()`d (the canvas render effect cleans it up; React StrictMode remounts that effect in development), `reviveDisposedDynamicLifecycleHost` replaces it before re-arming. `ensure*` on a disposed host is a no-op.
- The render effect, which constructs the backend, waits for `backend.initialize(viewport)`, and only then starts the animation-frame loop. On setup it also calls `syncDynamicLifecycleConsumers()` so a StrictMode remount re-arms from current config.

---

## 3. Per-frame control flow

The whole frame lives in `renderFrame` inside a single `useEffect` in `App.tsx`. It is driven by `runAnimationFrameLoop` (`src/app/renderLoop.ts`), and is additionally invoked on resize and whenever the backend reports that a deferred resource (such as a decoded image) became available.

The sequence is:

**1. Resolve the canonical instant.**
`realNowMs = Date.now()`. If demo time is active, pending transport actions (`reset`, `resume`) are applied, `computeEffectiveRenderTimeMs` produces the simulated instant, and a pending `pause` is applied afterwards. The frame then commits to exactly one value:

```ts
const clockNowMs = demoActive ? effectiveNowMs : realNowMs;
productInstantMsRef.current = clockNowMs;
```

Everything downstream in the frame uses `clockNowMs`. There is no second clock. `deltaMs` is derived from the previous frame's clock value and is clamped to be non-negative; it resets to zero when demo mode is toggled, so a mode change cannot inject a spurious jump.

**2. Compute the overlay-readability frame.**
The shell resolves the effective base-map presentation for the current base map (`resolveEffectiveBaseMapPresentation` against the catalog entry) and the catalog's `capabilities` hint, then calls `computeOverlayReadabilityFrameFromTimeMs` with the instant, the emissive night-lights policy, those substrate inputs, and the scene's readability presentation. This produces **one** `OverlayReadabilityFrame` per frame that all participating layers share instead of each recomputing solar samples.

**3. Attach the dynamic-data view.**
`dynamicLifecycleHostRef.current.attachForProductInstant(clockNowMs)` produces a read-only attachment: resolve-by-source-id and prepared-view accessors bound to the product instant. It performs store reads only. It never fetches.

**4. Build `TimeContext`.**
`createTimeContext(clockNowMs, deltaMs, simulated, { overlayReadabilityFrame, dynamicDataLifecycle })`. This object is the single carrier of per-frame product time and per-frame derived context into the layer system.

**5. Evaluate layers.**
`registry.update(time)` advances every registered layer, then `buildRenderableLayerStates(registry, time)` collects time-resolved layer states in composition order.

**6. Build chrome state.**
`buildDisplayChromeState({ time, viewport, frame, displayTime, geography, displayChromeLayout })` computes the complete screen-space chrome layout, including `chromeState.topBand.height`.

**7. Build scene input and render the scene.**
`buildSceneRenderInput({ frame, viewport, layers, scene, topChromeReservedHeightPx: chromeState.topBand.height })` — note that the reserved chrome height is an **input** to the scene viewport, not something the scene discovers afterwards. `backend.render(input)` then executes the scene.

**8. Render chrome over the same canvas.**
`renderDisplayChrome(ctx2d, chromeState, viewport)` draws directly on the same 2D context.

### Two-pass rendering over one canvas

There is one `<canvas>`. The frame paints it twice: the backend paints the scene into the region below the reserved top band, and chrome is then painted in screen space over the whole surface. This is the concrete expression of the chrome/scene separation.

The ordering constraint is not stylistic. Chrome must produce its height **before** the scene viewport is computed, because the scene's usable rectangle is `full viewport minus reserved top height` (`sceneLayerViewportRectPx` in `src/renderer/sceneViewportLayout.ts`). Reversing that order would make the map's vertical extent depend on content that has not been measured yet. See the chrome invariants in [`ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## 4. Rendering pipeline

```
Config + Time + Assets
  → Resolvers            (turn persisted config into effective values)
  → Semantic planning    (what the instrument means: markers, ticks, labels)
  → Layout               (where things go, in CSS pixels)
  → Realization adapters (how a semantic thing becomes drawable)
  → RenderPlan           (backend-neutral primitives)
  → Executor             (walks the plan)
  → Canvas backend       (issues Canvas 2D calls)
```

### RenderPlan

`RenderPlan` (`src/renderer/renderPlan/renderPlanTypes.ts`) is the hard boundary between product meaning and drawing. It is a flat list:

```ts
export interface RenderPlan {
  /** Drawn in array order (painter's algorithm). */
  items: RenderPlanItem[];
}
```

There are **nine** primitive kinds:

| Kind | Purpose |
|------|---------|
| `text` | Straight text with a resolved font descriptor |
| `curvedText` | Text along a path |
| `rect` | Filled or stroked rectangle |
| `line` | Straight segment |
| `path2d` | Descriptor-backed or backend-native path |
| `linearGradientRect` | Linear gradient fill in a rect |
| `radialGradientFill` | Radial gradient fill |
| `rasterPatch` | Direct RGBA pixel data (used by planetary illumination) |
| `imageBlit` | A decoded image drawn into a destination rect, optionally with a CSS filter string |

Draw order is **array order**. There is no z-sorting inside the executor and no compositor. Anything that needs to be beneath something else must be emitted earlier. Layer ordering is resolved upstream by the scene composition planner, which is why the executor can be this simple.

Plan builders live in `src/renderer/renderPlan/`, one per product concern (`sceneBaseRasterMapPlan`, `sceneCityPinsPlan`, `sceneSolarShadingIlluminationPlan`, `topBandTickRailPlan`, `timezoneLetterRowPlan`, and so on).

### The Canvas backend

`CanvasRenderBackend` (`src/renderer/canvasRenderBackend.ts`) executes plans through `canvasRenderPlanExecutor` and a set of narrow bridges in `src/renderer/canvas/`:

- `canvasTextFontBridge` — resolves a font descriptor to a Canvas font string.
- `canvasPaintBridge` — fills and strokes.
- `canvasPathBridge` — path construction.
- `bundledFontFaceLoader` / `bundledFontCanvasFamily` — font registration.
- `canvasGammaRasterCache` — an offscreen cache keyed by image URL, natural pixel dimensions, and effective gamma, so a gamma-corrected base map is recomputed only when one of those changes.

The backend is mechanical. It decodes images, registers fonts, manages surfaces and caches, and issues draw calls. It does not read `SceneConfig`, does not know which base-map family is active, does not implement month-aware resolution, and does not interpret illumination modes. Its one upstream-facing signal is resource failure reporting — it can report that an image URL failed to load (`addEquirectBaseMapImageLoadFailure`), but the decision about what to do instead belongs upstream.

`LoggingRenderBackend` (`src/renderer/loggingRenderBackend.ts`) implements the same interface and records plans instead of drawing, which is what makes plan-level testing possible without a canvas.

---

## 5. Chrome coordinate model

**This section describes the single most misleading part of the codebase. Read it before touching `src/renderer/displayChrome.ts` (roughly 1,900 lines).**

The top band renders several horizontal rows that look like they belong to one ruler. They do not. Two different coordinate models are interleaved, deliberately.

### Model A — fixed structural longitude columns

The 24 structural columns are pure geography. Column `h` spans longitude `-180 + 15h` to `-180 + 15(h+1)`, converted to x by `mapXFromLongitudeDeg`. They never move. They are the same grid the equirectangular map uses, which is why the NATO structural-zone letter row lines up with the map beneath it.

Helpers live in `src/renderer/structuralLongitudeGrid.ts` (`LON_PER_UTC_STRUCTURAL_HOUR = 360 / 24`, column index from longitude, column-center longitude). `UtcTopScaleHourSegment` carries this geometry.

The label on a structural column is a **meridian-offset grid hour** (UTC day plus `lon/15`, wrapped). It is a structural overlay label. It is not the reference civil clock.

### Model B — the phased civil hour-marker tape

The circular hour markers and the tick rail are **not** on the structural grid. They slide continuously with civil time. Their x comes from `topBandHourMarkerCenterX(...)`, which is a function of:

- the civil fractional hour-of-day in the reference IANA zone (`referenceFractionalHourOfDay`, derived via `deriveCivilProjection`), and
- an anchor fraction from `resolveTapeAnchorFraction(readPoint, width)`, which registers the tape against the resolved **read-point meridian**.

`TopBandLongitudeAnchor` holds the resolved reference meridian and its exact x on the strip. That x uses the same `mapXFromLongitudeDeg` as map pins, so the read-point indicator sits at the same place a pin at that longitude would. A selected reference city contributes **longitude for spatial registration only**; the civil time itself comes from the IANA zone.

Tick geometry uses the same phased formula with fractional hour arguments. The intra-hour cadence is three majors per hour (at 1/4, 1/2, 3/4) and two minors per quarter (at 1/3 and 2/3 along each quarter), giving eight minors per hour.

### Why they must not be unified

Structural longitude sectors and civil timezone membership are **intentionally decoupled**. Civil offsets are not multiples of 15°, political zones do not follow meridians, and the product's thesis is that longitude — not political zoning — is the structural basis of the display. Snapping the phased tape onto the structural columns would destroy the civil reading; anchoring the structural row to civil time would destroy the map registration.

The source says so explicitly in the doc comment on `UtcTopScaleCircleMarker`:

> `centerX` is **not** tied to `UtcTopScaleHourSegment.centerX`; it follows the time-phased band anchored in longitude.

If you find yourself writing a helper that returns "the x for hour h", stop and decide which model you are in.

### Seam wrapping

Because the phased tape moves continuously and the strip is periodic with period `widthPx`, markers near the edges must be drawn more than once. `topBandWrapOffsetsForCenteredExtent(centerX, halfExtent, widthPx)` returns the integer offsets `k` such that `centerX + k·widthPx` is visible. Any new top-band content wide enough to straddle the seam needs the same treatment, or it will visibly pop at the antimeridian.

### Vertical layout

The top band stacks three rows, top to bottom: the circle band (dual-hour stack, disks, annotations), the tick rail, and the timezone letter row. Their heights sum to the band height (`UtcTopScaleRowMetrics`, `TopBandLayout`).

The circle band height is computed by a **fixed-point solve**, `solveCanonicalHourMarkerDiskBandHeightPx`. Intrinsic content height (text ink metrics or glyph head geometry) determines the marker radius, which in turn affects the measured intrinsic height, so the solver iterates to convergence. Two properties are load-bearing and are called out in the source:

1. The seed intrinsic height must **not** be the disk-strip height from the circle stack, or the fixed point becomes self-referential.
2. The loop must converge on **intrinsic** content height only. Terminating on row height would let padding change the iteration count and return different intrinsics near ~1px thresholds — a bug that previously existed.

Marker scale is driven only by the converged intrinsic height. Row height is intrinsic plus resolved padding, and "Auto" padding is proportional to intrinsic height so the row tracks content when size or font changes.

### Display modes are formatting only

`TopBandTimeMode` (local 12-hour, local 24-hour, UTC-style) affects numerals and the crown annotation (`noon` / `midnight` wording in 12-hour mode, numeric `00` / `12` in 24-hour civil mode, nothing in UTC-style mode). It does **not** affect geometry. `referenceFractionalHourOfDay` is documented as unaffected by display mode, and tape positions come from `deriveCivilProjection` regardless of mode. This is the chrome-level expression of the time invariant in [`ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## 6. Scene and layer architecture

### Layer contract

A layer (`src/layers/types.ts`) declares a `LayerType` — one of `raster`, `vector`, `points`, `tracks`, `heatmap`, `text`, `illumination` — and produces a time-resolved state from a `TimeContext`. RenderPlan builders convert that state into primitives.

Layer type matters at the backend dispatch seam: the Canvas backend routes by type, and a type with no dispatch arm draws nothing silently. (This is not hypothetical; `tracks` was previously folded under `points` and the ISS ground track did not paint.)

### Registry and factory

`LayerRegistry` (`src/layers/LayerRegistry.ts`) holds registered layers and drives `update(time)`. `createLayerForSceneOverlayInstance` (`src/layers/sceneOverlayLayerFactory.ts`) maps a `SceneLayerInstance` to a concrete layer. `planSceneStackComposition` (`src/config/sceneStackComposition.ts`) resolves the ordered stack.

The registry is **rebuilt, not mutated**, when composition-relevant configuration changes. See §7.

### The default scene stack

`SCENE_STACK_LAYER_IDS` in `src/config/v2/sceneConfig.ts` defines the thirteen known overlay ids, in canonical order:

```
solarShading, grid, staticEquirectOverlay, globalCloudsIr, solarEclipse, earthquakes,
orbitalTracks, cityPins, subsolarMarker, lunarGroundTrack, lunarLocus, sublunarMarker, solarAnalemma
```

The base map is separate; it is the foundational part of the composition, not an entry in this list.

### Layer implementations

| Layer | Module | Notes |
|-------|--------|-------|
| Base map | `baseMapLayer.ts` | Resolves the family id to a concrete raster; carries effective presentation. |
| Solar shading / illumination | `solarShadingLayer.ts`, `solarShadingPayload.ts` | Emits the single planetary illumination `rasterPatch`. During an active solar eclipse, a geographic daylight-transmission field from local disc obscuration is composed into the same raster ([ADR 0012](decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md)). |
| Lat/lon grid | `latLonGridLayer.ts`, `equirectGridPayload.ts` | |
| City pins | `cityPinsLayer.ts`, `cityPinsPayload.ts` | Carries per-pin readability veil. |
| Subsolar / sublunar markers | `subsolarMarkerLayer.ts`, `sublunarMarkerLayer.ts` | The Moon glyph is a symbolic map marker, not an angular-scale Moon. Optical libration (Meeus ch. 53, no physical libration) is computed in `lunarOpticalLibration.ts` from the same truncated lunar series as `sublunarPoint`. Payload fields `librationLongitudeDeg` / `librationLatitudeDeg` plus `appearance` drive a displaced internal **ring** (default) or **crosshair**. **Map-oriented** presentation keeps longitude east = right and latitude north = up. **Observer-oriented** (default) rotates that displacement — and the crosshair axes — by χ = C − q (Meeus lunar-axis position angle minus parallactic angle) for the terrestrial observer. Observer coordinates come only from chrome `displayTime.topBandAnchor` when it is a known catalog `fixedCity` (`resolveReferenceCityObserverLocation`); they are not stored on the Moon row. If orientation is observer-oriented, “use reference city” is on, and no valid city is resolved, presentation falls back to map-oriented (χ = 0) rather than inventing a location. Below-horizon geometry is still computed. Ring geometry stays circular; observer rotation is visible there only as a rotated displacement. Contrast is a two-pass stroke: a slightly wider automatic under-stroke (dark `18,26,40` or light `236,240,246` from WCAG relative luminance of the user color, threshold 0.179) then the user-selected foreground (`#c5d4e8` default). The under-stroke is not user-configurable and does not recolor by phase region. Display amplification (`librationMotionScale`) scales the glyph offset only. Size tokens `small` / `normal` / `large` / `extraLarge` scale disc, phase, and indicator together; `normal` is the historical radius (`min(7.5, max(3.8, width×0.0046))`). Moon size does not change the Sun glyph. Libration defaults **on**. Phase astronomy is unchanged. During an active lunar eclipse, a separate spatial Earth-shadow overlay (penumbra gradient + clipped umbra + coverage-scaled totality red, rotated by the same observer χ as libration) paints over the phase disc and under the libration mark; it is not a phase rewrite. |
| Lunar ground track | `lunarGroundTrackLayer.ts` | Time-windowed trajectory of `sublunarPoint` around `TimeContext.now`. Default 24 h past + 24 h future at 10-minute samples; extents persist on `source.parameters.pastHours` / `futureHours` (`6` / `12` / `24` / `48` / `72`). Stroke RGB identities persist as `pastColor` / `futureColor` (`#rrggbb`, default `#aacdf0`). Past is quieter than future via plan-builder alpha; unlabeled 6-hour ticks. Default off. Independent of the sublunar marker. |
| Lunar locus | `lunarLocusLayer.ts` | Compact sublunar figure: `sublunarPoint` sampled once per **mean lunar day** (derived from the lunar model’s GMST and mean-longitude rates, ≈24 h 50 m 28.3 s) for 28 points spanning ≈27.3 days, starting at `TimeContext.now` (`k = 0…+27`). Residual `(δlon, lat)` is interpolated with an **open** centripetal Catmull-Rom whose neighbors outside that window (`k = −1` and `k = +28`) supply real tangents. The displayed path is cropped near one sidereal month after the current Moon (~26.4 mean lunar days). Endpoints are not welded: the locus is approximately periodic, not exactly periodic, and the Moon glyph is the cycle seam. Strokes that fall inside the Moon disc are trimmed as presentation only (trim radius follows the configured Moon size). The plan draws an open polyline of unwrapped longitudes plus ±360° copies so a figure near ±180° stays associated with the Moon. Line-only. Stroke RGB identity persists as `source.parameters.strokeColor` (default `#1c2638`); thickness token `thin` / `normal` / `thick` multiplies the veil-aware base width `1.2 + 0.95 × veil`. Independent of Solar analemma styling. Non-current samples memoized per 1-second product-time bucket; `k = 0` is always live `sublunarPoint(now)`. Default off. Independent of the Moon marker, lunar ground track, and solar analemma. Vertical extent follows the lunar model (major- vs minor-standstill epochs differ without a standstill switch). |
| Solar eclipses | `solarEclipseLayer.ts` | NASA-derived solar overlay (E1 live footprint + E2 forecast corridor + E5 alignment beam + E6 labels/styles + live ground-position marker). Default **on**: geography appears only while an event is relevant. Forecast horizon (`0` / live only, `1`, `3`, `7`, `14`, `30`, `90`, `365` days; default **7**) is how early upcoming solar geography appears, not eclipse duration. Upcoming events emit an event-path corridor (cached, time-independent) and a representative greatest-eclipse partial region. While the event is globally active the corridor remains as path context (fill ~80% of upcoming strength; limits stay strong) even before/after the umbra is on Earth. The representative forecast partial region is upcoming-only. Active broad partial darkening is physical illumination (local obscuration field), not the former teal live-partial fill; that fill is restored only if Active eclipse shading is off. Active events emit the live E1 umbra/antumbra when that geometry exists. A live ground-position marker sits on the authoritative central point while that intersection exists. An optional alignment ribbon (E5) connects the Sun/Moon glyph cluster to that live umbra/antumbra only while a terrestrial central target exists; partial-only events get a local bloom; central events with no current Earth intersection emit no beam. Partial-only events never fabricate a central corridor or marker. Presentation-only type filters (total / annular / partial / hybrid) default **on**. Child geography toggles and user style persist on the row. Alignment is `scene.eclipseAlignment`. Canvas sees no eclipse astronomy. |
| Lunar eclipses | `lunarEclipseLayer.ts`, Earth-shadow fields on `sublunarMarkerLayer.ts` | NASA-derived lunar overlay (E3 + E5 axis + E6 labels/styles + post-E6 forecast + LIB-021 spatial Moon shadow). Default **on**: geography appears only while an event is relevant. Separate lunar forecast horizon (`0` / live only, `1`, `3`, `7`, `14`, `30`, `90`, `365` days; default **7**). Upcoming events emit a quieter representative Moon-visible region at greatest eclipse (cached, not a terrestrial path). Only the nearest upcoming lunar event gets map geography; others remain in the service and event information. Active events emit the current Moon-above-horizon region (dark informational fill), geometric horizon boundary, spatial Earth-shadow Moon treatment, and optional alignment axis. Forecast effects disappear at event start. Presentation-only type filters (total / partial / penumbral) default **on**. Child controls and user style persist on the row. Alignment is `scene.eclipseAlignment`. Map labels offset a Sun/Moon glyph halo. Canvas sees no eclipse astronomy. |
| Solar analemma | `solarAnalemmaLayer.ts` | Derived ground track. Default samples the year-long subsolar locus at the canonical instant’s UTC time-of-day so today’s vertex coincides with the live subsolar point. Optional `source.parameters.utcHour` freezes that integer hour at `:00:00.000`. Stroke RGB identity persists as `source.parameters.strokeColor` (default `#ffc878`); thickness token `thin` / `normal` / `thick` multiplies the same veil-aware base width as the lunar locus. Independent of Lunar locus styling. |
| Static equirect overlay | `staticEquirectRasterOverlayLayer.ts` | Full-viewport raster overlay. |
| Dynamic equirect raster | `dynamicEquirectRasterOverlayLayer.ts` | Reads prepared views only. |
| Dynamic point features | `dynamicPointFeaturesOverlayLayer.ts` | |
| Dynamic tracks | `dynamicTracksOverlayLayer.ts` | |

### Planetary illumination

Illumination is not a stack of blend passes. Solar geometry, continuous twilight, moonlight, and emissive night lights are all resolved **upstream, on the CPU, into one RGBA field**, which is emitted as a **single** `rasterPatch`.

The pieces:

- `src/renderer/illuminationShading.ts` — the sampling and tuning core. Takes the geometric dot product of surface normal and subsolar direction, converts to solar altitude, and produces attenuation plus atmospheric tint. Civil, nautical, and astronomical thresholds are retained as **semantic anchors informing a continuous field**, not as banded regions. Composition is non-emissive: it attenuates and tints, it does not glow. Optional `daylightTransmission01` attenuates *daylight only*: `eclipseDaylightFactor = 1 − (1 − nightVeil) × (1 − transmission)` then `overlayAlpha = 1 − (1 − ordinaryOverlayAlpha) × eclipseDaylightFactor`. `ordinaryOverlayAlpha` is night-overlay opacity, not a daylight fraction. Settled night (`nightVeil = 1`) is unchanged.
- `src/core/moonlightPolicy.ts`, `lunarIllumination.ts`, `lunarPhase.ts`, `sublunarPoint.ts` — moon phase, lunar altitude, and surface incidence produce a bounded directional night-side contribution: cool additive RGB plus a secondary transmittance lift on the darken mask. Strength comes from `scene.illumination.moonlight.mode` (`off` / `natural` / `enhanced` / `illustrative`), resolved into a deterministic policy table upstream. During an active lunar eclipse, ordinary moonlight is further multiplied by a coverage-derived transmission scalar (`lunarEclipseMoonlightTransmission`): uneclipsed fraction at 1, penumbra-only at 0.78, umbra at 0.05. The scalar comes from E3 disc/shadow overlap, not contact-state switches, and does not change lunar phase. It is physical illumination behaviour: it follows eclipse truth even when the Lunar eclipses presentation layer is off. Reference city does not affect it.
- `src/core/eclipse/solarEclipseObscuration.ts`, `solarEclipseObscurationField.ts`, `solarEclipseDaylightTransmission.ts` — during an active solar eclipse, local solar-disc *area* obscuration is evaluated from the same Besselian observer-plane identities as E4 (`Rs`, `Rm`, circle-overlap fraction). **E4 visibility** (`obscuration01`) remains 0 when the Sun is geometrically below the horizon. **Map illumination** stores `physicalObscuration01` (overlap while in the penumbra, including just below the horizon) on a **stable full-world** 288×145 (~1.25°) equirect grid (−180…+180 periodic longitude, +90…−90 latitude), bilinearly interpolated, cached by event id and 250 ms product-time bucket, and mapped with `visualDarkening = maxDarken × obscuration^γ` (Normal: maxDarken 0.56, γ 1.45; Subtle 0.34/1.7; Dramatic 0.74/1.22). Cells outside the physical penumbra are 0 because the physics is 0, not because they were skipped. A boolean sun-above-horizon mask is not stored: interpolating that mask produced a scalloped terminator seam ([LIB-029](work/LIB-029-solar-eclipse-horizon-illumination-reconciliation.md)). A moving bbox derived from the live penumbra outline is not used ([LIB-028](work/LIB-028-solar-eclipse-obscuration-raster-boundary.md)). Sampler longitude is wrapped; latitude is clamped. Upcoming events do not contribute. The field follows eclipse truth whenever solar shading is on, even if Solar eclipses overlays are hidden ([ADR 0012](decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md)). This is a visual illumination approximation, not photometric lux.
- `src/renderer/emissiveIlluminationRaster.ts`, `src/core/emissiveNightLightsPolicy.ts` — human-made radiance sampled per texel from a bundled equirectangular raster, gated by solar altitude, coexisting with moonlight, and scaled by mode and presentation (`intensity`, `driverExponent`). The asset is chosen by durable `assetId` against a bundled **emissive composition catalog** that is separate from the base-map catalog; unknown or blank ids canonicalize to the catalog default.
- `src/lifecycle/dynamicCloudOpacityMaterializer.ts` — when `scene.illumination.cloudParticipation` is on, cloud opacity derived from the dynamic clouds source modulates the same field.

Polar behaviour (midnight sun, polar night) is not special-cased. It emerges from real solar geometry and seasonal axial tilt.

The backend sees one `rasterPatch` and knows nothing about any of this. See [ADR 0002](decisions/0002-single-upstream-planetary-illumination-rasterpatch.md).

### Solar eclipse live footprint and forecast corridor

Production flow (E1 live + E2 forecast, [LIB-014](work/LIB-014-solar-eclipse-live-footprint.md), [LIB-015](work/LIB-015-solar-eclipse-forecast.md)):

```
bundled authority JSON
  → EclipseAuthority (parse, provenance, binary-search lookup)
  → EclipseEventService.resolveEclipseFrame(TimeContext.now, { horizonMs })
  → live Besselian footprint at T  +  cached event corridor (if horizon > 0)
  → solar eclipse presentation lifecycle (upcoming / global-active pre-central / central-active / global-active post-central / completed)
  → solar eclipse layer (semantic lat/lon regions)
  → equirectRegionOverlay RenderPlan (seam unwrap + ±360° copies)
  → Canvas (path fill/stroke only)
```

- **Asset:** `src/assets/eclipse/solar-eclipse-authority-v1.json` (`authorityId` `nasa-espenak-meeus-5mcse-solar`, `authorityVersion` `1`). 454 solar events, 1900-01-01T00:00:00.000Z inclusive through 2101-01-01T00:00:00.000Z exclusive.
- **Ingest:** `npm run eclipse:prep` reads the NASA GSFC Besselian CSV (SHA-256 pinned; file is gitignored) and writes the JSON. Runtime never fetches NASA and never parses HTML/PDF.
- **Lookup:** `activeSolarEclipseAt`, `nextSolarEclipseAfter`, `solarEclipsesIntersecting`, and `solarEclipsesUpcomingInHorizon` use binary search on the sorted catalog. Discovery does not scan all 454 events per frame and does not live in Canvas.
- **Forecast horizon:** scene parameter `forecastHorizonDays` (`0` = Live only, plus 1/3/7/14/30/90/365). Default **7**. Live-only preserves E1: active live footprint only, no upcoming corridor. Master Solar eclipses toggle defaults **on** as of E6; explicit persisted off is preserved.
- **Lifecycle:** `EclipseFrame` still distinguishes only authority `upcoming` vs `active` from product UTC + contacts + horizon. Presentation adds `resolveSolarEclipsePresentationPhase` ([LIB-025](work/LIB-025-solar-eclipse-lifecycle-shading-reconciliation.md)): **upcoming**; **global-active pre-central** (event started, no terrestrial central intersection yet); **central-active** (live `centralPoint`); **global-active post-central** (event still global, umbra/antumbra has left Earth); **global-active** (partial-only, no central intersection possible); **completed**. This is not a second eclipse truth model. Completed events drop out of the selection. Live-only horizon (`0`) still omits forecast corridor geography.
- **Live vs corridor:** the live umbra/antumbra is the compact footprint at T. The forecast corridor is the geographic strip swept by the central shadow over the event, sampled at 60 s, cached by event id / authority version / algorithm id `solar-event-corridor-v1`. See [ADR 0009](decisions/0009-cached-solar-eclipse-event-corridor.md). The corridor is event-scale context and stays visible through upcoming and all globally active phases when the horizon is not live-only. It is independent of the live ground marker and alignment beam. Active fill is ~80% of upcoming fill; corridor limits stay at least as strong as upcoming. Forecast centerline remains during pre- and post-central active phases so the path does not vanish before the umbra is on Earth; during central-active the stronger live centerline is used instead.
- **Partial forecast:** representative **greatest-eclipse** penumbral outline, not the event-long swept penumbral union. It is drawn only while the event is upcoming. Once globally active, continuous local-obscuration shading in the illumination raster owns current partial darkening. The former teal live-partial fill is not drawn while Active eclipse shading is on. Partial-only events show the forecast region before start, then the physical field, and never a central corridor.
- **Outside the span / truncated windows:** `EclipseFrame.support` is `{ supported: false, reason: "outside-authority-range" }` when T itself is outside 1900–2100. That is not the same as a supported instant with no eclipse. If the requested `(T, T+H]` extends beyond the authority interval, `forecastCoverage.truncated` is true and only events in the supported query interval are returned. No ambient fallback. When Solar or Lunar eclipses are enabled, the event-information surface and optional chrome line say “Eclipse data unavailable outside 1900–2100.” They do not say that no eclipse exists.
- **Product time:** every evaluation uses the frame’s canonical UTC (`TimeContext.now` / `eclipseFrame`). No `Date.now()` in eclipse math. Pause freezes geometry; accelerated demo and direct UTC jumps re-evaluate selection immediately and reuse cached corridors.
- **Wrap:** `src/renderer/renderPlan/equirectSeamRegion.ts` projects closed fill rings by folding longitudes into the smallest containing arc, then emits ±360° world copies so a dateline-crossing oval does not span the map. Sequential path unwrap is still used for polylines. Polar caps (circular longitude span > 270°) close through the nearer pole. World copies whose visible x-spans overlap are dropped so one semantic translucent fill cannot alpha-stack on itself ([LIB-026](work/LIB-026-solar-eclipse-visual-semantics-reconciliation.md)).
- **Visual families ([LIB-026](work/LIB-026-solar-eclipse-visual-semantics-reconciliation.md) / [LIB-027](work/LIB-027-continuous-solar-eclipse-obscuration-shading.md)):** **Event path** — static violet/lilac corridor (`rgba(72, 48, 140, …)` fill, lilac limits, active stroke `0.62`). **Active partial darkening** — physical illumination field (charcoal daylight attenuation from local obscuration), not a teal polygon. **Forecast partial** — informational teal-slate (`rgba(47, 109, 120, 0.11)`), upcoming only. **Live central** — compact indigo umbra (`rgba(40, 24, 72, 0.50)`) or warm antumbra. **Alignment** — warm gold ribbon. **Ground marker** — vermilion locator. **Ordinary night** — the same illumination `rasterPatch`, unmodified on the night side.
- **Illumination raster is not the eclipse overlay.** Compact umbra/antumbra remain overlay markers. Broad active obscuration is composed into the same `rasterPatch` as ordinary solar shading ([ADR 0012](decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md)); Canvas still sees pixels.

See [ADR 0008](decisions/0008-bundled-nasa-solar-eclipse-authority.md), [ADR 0009](decisions/0009-cached-solar-eclipse-event-corridor.md), and [`docs/specs/scene/eclipse-system.md`](specs/scene/eclipse-system.md).

### Lunar eclipse truth and terrestrial visibility

Production flow (E3, [LIB-016](work/LIB-016-lunar-eclipse-truth-and-visibility.md)):

```
bundled lunar authority JSON
  → EclipseAuthority (same family as solar; lunar parse, provenance, binary-search lookup)
  → EclipseEventService.resolveEclipseFrame(TimeContext.now)
  → circular Earth-shadow geometry at the Moon  +  Moon-above-horizon region
  → Moon glyph earthShadowOverlay  +  lunar eclipse layer (semantic lat/lon region)
  → existing Moon RenderPlan / equirectRegionOverlay
  → Canvas (path fill/stroke only)
```

- **Asset:** `src/assets/eclipse/lunar-eclipse-authority-v1.json` (`authorityId` `nasa-espenak-meeus-5mcle-lunar`, `authorityVersion` `1`). 459 lunar events (166 total, 122 partial, 171 penumbral), same 1900-01-01T00:00:00.000Z inclusive through 2101-01-01T00:00:00.000Z exclusive span as solar.
- **Ingest:** `npm run eclipse:prep` also reads NASA GSFC `5MKLEcatalog.txt` (SHA-256 pinned; file is gitignored) and writes the lunar JSON. Runtime never fetches NASA and never parses HTML/PDF. EclipseWise is not an authority.
- **Lookup:** `activeLunarEclipseAt`, `getLunarEclipseEventById`, `nextLunarEclipseAfter`, `lunarEclipsesIntersecting`, and `lunarEclipsesUpcomingInHorizon` use binary search. The same `EclipseEventService` forecast model used for solar also returns upcoming lunar events when `lunarHorizonMs > 0`. Live only (`0`) keeps E3 active-only presentation.
- **Contacts:** P1/U1/U2/greatest/U3/U4/P4 by symmetry about greatest eclipse from NASA durations. Invalid contacts are `null` (no U2/U3 on partial; no U1–U4 on penumbral). Not derived from the ambient Moon model.
- **Earth-shadow at the Moon:** recover penumbral/umbral radii from catalog magnitudes + |γ| with IAU `k = 0.2725076`; interpolate along-track separation at constant speed from P1/P4. Phases: `none` / `penumbral` / `partial-umbral` / `total-umbral`. Totality styling is used only when the Moon is inside the umbra.
- **Moon glyph:** existing size, phase, optical libration, and observer orientation are unchanged. Eclipse overlay is independent of phase shading. Draw order: glow → phase disc → phase shadow → spatial Earth-shadow (penumbra gradient + clipped umbra + coverage-scaled totality red) → libration mark → outline. Shadow offsets are map-oriented east/north in Moon radii; the RenderPlan builder rotates them by the same observer χ as the libration mark. Geometry scales with Moon size. Totality red/brown emerges from umbral coverage rather than a whole-disc state switch.
- **Visibility region:** geometric lunar altitude = 0 on a spherical Earth (same unit-sphere dot product as illumination `lunarDot`). No refraction. The active boundary is a great-circle horizon contour around the current ambient `sublunarPoint`. The fill is a dark informational overlay (`rgba(22, 34, 54, 0.20)` default), not a moonlight lift. Forecast geography reuses the same construction at the authority zenith of **greatest eclipse** (`lunar-forecast-visibility-v1`, cached by event id / authority version). It answers where the Moon is geometrically above the horizon at GE — not visibility for every contact, not totality everywhere in the region, and not a solar-style path. Equatorial moons use a 180° longitude strip sampled so dateline unwrap does not invert the hemisphere.
- **Wrap:** the same generic `equirectRegionOverlay` / polar-close path as solar. A near-equatorial Moon-up hemisphere is allowed to span the map in longitude; an equatorial strip crossing ±180° is split via world copies, not one 360° rectangle.
- **Glyph depth:** when Sun and Moon glyphs overlap, Moon paints above Sun. Default stack order (`sublunarMarker` after `subsolarMarker`) assigns the higher z-index; Canvas sorts by that z-index. The rule is global, not eclipse-gated.
- **Penumbral-only events:** subtype and negative umbral magnitude are preserved. When such an event is active, the visibility region still draws and the Moon receives the penumbral overlay only (no umbra/totality fill). There is no dedicated penumbral UI emphasis.
- **Outside the span:** the shared `EclipseFrame.support` `{ supported: false, reason: "outside-authority-range" }` applies. No ambient fallback.
- **Product time:** `TimeContext.now` / `eclipseFrame`. Pause freezes geometry; accelerated demo and direct UTC jumps reconstruct immediately.

See [`docs/specs/scene/eclipse-system.md`](specs/scene/eclipse-system.md) §10 and §22.

### Reference-city eclipse circumstances

Production flow (E4, [LIB-017](work/LIB-017-reference-city-eclipse-circumstances.md)):

```
EclipseFrame (global events + geography)
  + resolveReferenceCityObserverLocation(displayTime.topBandAnchor)
  → ReferenceCityEclipseCircumstances resolver (cached by event id / authority version / lat/lon)
  → presentation (lower-right eclipse information panel; optional bottom-HUD chrome line)
```

GLOBAL ECLIPSE TRUTH IS NEVER FILTERED BY REFERENCE CITY. Changing the city updates only the derived circumstances. Event identity, solar live footprint, solar forecast corridor, lunar Earth-shadow state, and lunar visibility region are unchanged. No catalog city (auto, fixed longitude, unknown id) leaves global eclipses intact and omits circumstances — there is no Knoxville fallback.

- **Observer:** the same chrome `displayTime.topBandAnchor` catalog city used by top-band time and LIB-011 libration. No second selector.
- **Solar local contacts:** Besselian reduction of the same NASA elements as E1/E2. Root functions `m²−L1'²` (C1/C4), `m²−|L2'|²` (C2/C3), and `u u̇ + v v̇` (maximum). 30 s sampling, bisection + Newton, 1 ms tolerance. C2/C3 only when the observer is locally total or annular. Contacts are UTC instants in domain state.
- **Magnitude** is NASA diameter fraction `(L1'−m)/(L1'+L2')` at local maximum. **Obscuration** is circle-overlap area fraction from apparent Sun/Moon radii; it is not magnitude.
- **Geometric horizon:** Sun/Moon center altitude with no refraction, topography, or station elevation. A contact is below the horizon when center altitude < 0°.
- **Lunar:** global contacts from E3; Moon altitude at each contact; geometric moonrise/moonset inside the event interval; local-visible maximum is global GE only when the Moon is up.
- **Caching:** solar C1–C4 solutions are cached per event+observer and are not recomputed every frame. Product time only selects the relevant event and formats live status.
- **Presentation:** compact rows in the lower-right eclipse information panel when Event information is on; optional compact bottom-HUD line (date-style, subordinate). Local wall times use the city’s IANA zone via existing `formatWallClockInTimeZone`. Copy says “not visible from {city}”, never that the global event is absent. Layers remains controls-only.
- **Config:** `scene.eclipseCircumstances.detailsEnabled` and `chromeStatusEnabled`, both default **on**. Disabling either does not disable the global eclipse map. Old configs missing the keys normalize to on.
- **Upcoming events:** local contacts are available for forecast-horizon solar and lunar events, not only active ones. A future lunar eclipse still appears globally when the reference city cannot see it.

See [ADR 0010](decisions/0010-eclipse-events-global-circumstances-derived.md).

### Live eclipse alignment / beam

Production flow (E5, [LIB-018](work/LIB-018-eclipse-alignment-beam.md)):

```
EclipseFrame (active event + live geometry)
  + ambient subsolar/sublunar glyph positions
  + scene.eclipseAlignment
  → buildEclipseAlignmentPresentation
  → extra equirectRegionOverlay fills/strokes on the existing solar/lunar layers
  → Canvas (generic path fill/stroke only)
```

The beam is **presentation**, not eclipse truth. It does not recompute Besselian or lunar-shadow astronomy. It does not replace the E1 live footprint, the E2 forecast corridor, or the E3 Moon-up region.

- **Active-only.** Upcoming forecast events emit no beam. After last contact the effect disappears. Same product UTC yields the same geometry; pause freezes it; direct jumps reconstruct immediately. No `Date.now()`, no independent animation clock.
- **Solar.** For total/annular/hybrid events with a live central point, a tapered translucent ribbon runs from the Sun/Moon glyph cluster (ambient midpoint) to the live umbra (total) or antumbra (annular). The beam target is that same central point as the live ground-position marker. Partial-only events get a local alignment bloom around the glyphs — no fabricated terrestrial target. Central events before/after the umbra/antumbra is on Earth emit **no** beam (and no glyph-field bloom); the event corridor remains as independent path context. The beam is not aimed along the forecast corridor.
- **Lunar.** A related but distinct Earth-shadow axis/ribbon from the anti-solar direction toward the Moon glyph (Sun → Earth → Moon). It is not a solar-style terrestrial path. Totality may add a restrained red/brown wash; penumbral/partial do not.
- **Strength.** Solar `alignmentStrength01` comes from the same Besselian evaluation as the live footprint (axis distance vs penumbra / central presence). Lunar strength comes from E3 phase and magnitudes. Reference-city magnitude is not used.
- **Independence.** The builder does not take an observer. Changing the reference city does not change beam geometry, strength, target, or event identity.
- **Config.** `scene.eclipseAlignment`: `enabled` (master, default **on**), `solarEnabled` / `lunarEnabled` (default **on**), `intensity` `subtle` | `normal` | `dramatic` (default **normal**). Disabling the beam leaves eclipse geography intact. Disabling the solar or lunar eclipse layer suppresses the corresponding beam. The beam cannot appear when that eclipse layer is off.
- **Layering.** Within the solar eclipse overlay, generic `drawOrder` on equirect fills/strokes yields: forecast representative partial (upcoming only) → corridor fill → corridor limit strokes → alignment bands → live umbra/antumbra → alignment axis → live/forecast centerline → ground-position marker → labels. Corridor limits stay above the path fill so the route remains readable over the moving dark field. Alignment bands draw before the compact central footprint. Glyphs stay above the eclipse layers. Ordinary solar/day-night shading plus active eclipse daylight attenuation is the illumination `rasterPatch` under the overlay. The solar ribbon is a directional beam (origin half-width ~5.4°, Dramatic ~6.4°), not a map-scale shading region.
- **Active eclipse shading config.** `activeEclipseShadingEnabled` (default **on**) and `activeEclipseShadingIntensity` `subtle` | `normal` | `dramatic` (default **normal**) persist on the solar eclipse row. The physical field follows solar shading, not the Solar eclipses overlay master.
- **Map semantics.** The effect is a 2D geographic alignment visualization, not a literal 3D ray through screen space.

See [`docs/specs/scene/eclipse-system.md`](specs/scene/eclipse-system.md) §11.

### Eclipse configuration, event information, and product polish

Production surface (E6, [LIB-019](work/LIB-019-eclipse-product-polish.md)). E6 does not add astronomy. It groups the E1–E5 controls, adds inspectable event information, restrained labels, presentation-only type filters, user styling, honest unsupported-range copy, and reviewed defaults. [LIB-021](work/LIB-021-lunar-eclipse-visual-reconciliation.md) moved that inspectable event information out of Layers onto a lower-right map panel.

- **Defaults.** Factory Solar eclipses and Lunar eclipses are **on**. Geography still appears only while an event is relevant, so an ordinary date stays visually clean. Named presets `minimal` / `celestial` / `featuredCities` remain explicitly off. An old persisted document with an explicit `enabled: false` stays off; a missing key now normalizes **on**. Forecast horizon remains **7** days. Alignment, observer details/chrome, event information, labels, and all supported event types default **on**.
- **Type filters.** Solar: total / annular / partial / hybrid. Lunar: total / partial / penumbral. Filters hide map geometry, labels, event information, and chrome for that subtype. They do not change `EclipseFrame` or authority lookup. Default: all on.
- **Event information.** Compact lower-right map panel for the presented upcoming solar, upcoming lunar, active solar, or active lunar event: accessible type name, UTC date, greatest-eclipse UTC, lifecycle, product-time relative countdown, and a compact geography legend. The existing Event information toggle shows or hides that panel. It auto-opens when a relevant event appears and can be dismissed to a small chip. When Config is open, the panel offsets left of the Config shell. The primary event is active solar, then active lunar, then the nearest upcoming of either kind. Reference-city circumstances reuse the E4 block in the same panel when Reference-city eclipse details is on. Hidden when no relevant event exists. Layers/Config no longer contain live Event/Date/magnitude rows.
- **Labels.** At most one restrained map label for that same primary event. `scene.eclipseInfo.labelsEnabled` is captured into the solar/lunar layers at construction; toggling it rebuilds the layer registry so the map label appears or disappears immediately. When on, the RenderPlan builder offsets the label if it would intersect a Sun/Moon glyph halo, using a fixed candidate order (preferred, right, left, above, below). Event information and persistent chrome status are independent and do not require a registry rebuild.
- **Unsupported range.** When Solar or Lunar eclipses are enabled and product UTC is outside 1900–2100, copy is “Eclipse data unavailable outside 1900–2100.” That is not the same as a supported date with no eclipse. Features off: no empty furniture.
- **Styling.** Independent color / thickness / fill-opacity families for solar forecast, solar live, lunar visibility, and optional alignment base colors. Fill opacity is clamped 0.04–0.55. Defaults keep the verified E1–E5 tokens. Changing one family does not leak into another. Alignment intensity still does not change event truth.
- **Config groups** in Layers: Eclipses (information / labels); Solar (horizon, types, live/forecast geography); Lunar (horizon, types, forecast Moon-visible region/boundary, active Moon-shadow and Moon-visible geography); Alignment; Reference city; Eclipse appearance. Child controls disable when the parent layer or master is off. Solar forecast corridor/partial disable when the solar horizon is Live only. Lunar forecast region/boundary disable when the lunar horizon is Live only.
- **HUD layout.** Persistent eclipse status is a separate contextual row below the date/time block. Date/time keep the two-line spacing used when no status exists; the status row is slightly smaller and sits below with a gap at least as large as the date/time gap. Turning persistent status off removes the row entirely.
- **No event browser** and no map click-inspector (scene pointer inspection remains unapproved Phase 11).

Post-E6 reconciliation ([LIB-020](work/LIB-020-eclipse-reconciliation-and-lunar-forecast.md)) added lunar forecasting on the existing EclipseAuthority / EclipseEventService path. [LIB-021](work/LIB-021-lunar-eclipse-visual-reconciliation.md) moved event information onto the map, attenuates moonlight from lunar coverage, and replaced whole-disc Moon tints with spatial Earth-shadow geometry. [LIB-025](work/LIB-025-solar-eclipse-lifecycle-shading-reconciliation.md) keeps the solar event corridor visible through globally active pre- and post-central phases, hands active partial shading to the live footprint, and limits the targeted alignment beam to instants with a terrestrial central target. [LIB-026](work/LIB-026-solar-eclipse-visual-semantics-reconciliation.md) separates those layers into stable visual families and prevents wrap-copy alpha stacking. [LIB-027](work/LIB-027-continuous-solar-eclipse-obscuration-shading.md) replaces the active teal live-partial fill with continuous local-obscuration daylight attenuation in the illumination raster. None of these is an E7 program phase. Moonlight attenuation is recorded in [ADR 0011](decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md). Solar-eclipse daylight attenuation is recorded in [ADR 0012](decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md).

See [`docs/specs/scene/eclipse-system.md`](specs/scene/eclipse-system.md) §13 and §18 E6.

### Overlay readability

Overlays must stay legible over eleven visually different substrates and across the full illumination range. The mechanism is derived entirely upstream — **it never samples the rendered raster**.

Per frame the shell computes one `OverlayReadabilityFrame` (`src/core/overlayReadabilityFrame.ts`) from four inputs:

1. **Solar field** — `nightVeil01At` / `globalNightVeil01`, aligned with `illuminationNightVeil01FromSolarAltitudeDeg`.
2. **Emissive policy pressure** — `globalEmissiveLegibilityPressure01`, derived from the emissive night-lights *policy* (mode, intensity, driver exponent). The policy, not the texture. No emissive raster is sampled in the readability path.
3. **Substrate lift scale** — `substrateOverlayReadabilityLiftScale01` (range 0.35–1) from `src/core/substrateOverlayReadabilityLiftScale.ts`, computed from the effective base-map presentation and optional catalog `capabilities`. `overlayOptimized` and `darkFriendly` scale the presentation-derived penalty. Eight optional intrinsic hints — `reliefShaded`, `boundaryDense`, `chromaticDense`, `bathymetryShaded`, `fineScaleTexture`, `labelDense`, `etchedReliefDense`, `sunGlintDense` — add small bounded penalties at neutral presentation, subject to a combined cap. Brightness below default *reduces* the penalty, so a dimmed base keeps its overlay lift.
4. **Scene presentation** — normalized `scene.overlayReadability.presentation` (`readabilityVeilScale01`, `overlayLiftMultiplier01`) post-processes the derived veil and lift.

Optional `scene.overlayReadability.perLayer` entries exist for six default stack rows (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`) and apply the same two scalars again inside the layer constructor, via `applySceneOverlayReadabilityPresentationToFrame`. Identity values are dropped during normalization, so the persisted document stays clean.

Consumers receive derived hints (`OverlayReadabilityHints`) and adjust stroke widths and RGBA alphas using `effectiveOverlayReadabilityLiftVeil01` (veil × lift scale). City pins carry the signal per pin. Static full-viewport raster overlays carry a global veil on the payload, and `buildBaseRasterMapRenderPlan` merges `overlayReadabilityCssFilterAppend` with the presentation-derived `cssFilter` into the single `imageBlit`.

`getOverlayReadabilityFrameOrCompute` exists as a fallback for callers with no attached frame; it computes a subsolar-only frame from `now`. Production always uses the shell-attached frame, so the fallback path does not see emissive, substrate, or presentation inputs. Do not treat the fallback as equivalent.

---

## 7. Configuration and persistence

### The two documents

`LibrationConfigV2` (`src/config/v2/librationConfig.ts`) is the authoritative persisted application configuration. `SceneConfig` (`src/config/v2/sceneConfig.ts`) is the scene portion of it and is authoritative for scene content: `projectionId`, `viewMode`, `orderingMode`, `baseMap`, ordered `layers[]`, `illumination`, and `overlayReadability`.

`AppConfig` (`src/config/appConfig.ts`) is a **derived runtime view**, produced by `v2ToAppConfig`. It is not persisted and is not a second source of truth.

### Storage keys

| Key | Contents |
|-----|----------|
| `libration.workingConfigV2.v1` | The working `LibrationConfigV2` document |
| `libration.userPresets.v1` | Saved user presets |

### Commit lifecycle

All mutation goes through `commitWorkingV2Update` in `src/app/workingV2Commit.ts`:

1. Clone-and-normalize the current document.
2. Run the caller's `updater(draft)`.
3. **Normalize again.**
4. Apply the committed result.

Normalizing on both sides of the updater means a caller cannot leave the document in a non-canonical state, and normalization is idempotent by construction. `replaceWorkingV2FromSnapshot` takes the same path for preset loads.

Applying a commit does four things: swap the working document, re-derive `AppConfig`, conditionally rebuild the layer registry, and persist to `localStorage`. Persistence is skipped when a DEV visual scenario is active (see §2).

### Registry rebuild predicates

The registry is rebuilt when any of the following changed:

- `sceneRuntimeAffectingEqual(prev.scene, next.scene)` is false — the authoritative trigger. It compares projection, view mode, ordering mode, base-map identity/visibility/opacity/variant/presentation, illumination modes and emissive presentation, overlay-readability presentation and per-layer entries, and every runtime-affecting field of each layer instance. For `dynamicTracks` rows that includes `source.parameters` (ISS presentation: track toggles, durations, colors, thickness, glyph, label). Those values are captured when `createDynamicTracksOverlayLayer` is constructed; omitting them from the predicate leaves a stale overlay that only refreshes when something else rebuilds the registry (LIB-039).
- Legacy `LayerEnableFlags` differ.
- The visible city id set or the custom pin list differ.
- Pin presentation, the default product font, or the top-band mode changed **and** the city-pins layer is registered in either the old or new config — because that layer captures those values at construction time.
- The top-band reference-city anchor (`displayTime.topBandAnchor`) changed **and** the Moon (`sublunarMarker`) layer is registered — because that layer captures the resolved observer location at construction. Anchor-only chrome edits do not rebuild when the Moon layer is off.

That last group is worth understanding: several layers read configuration **once, at construction**. Changing such a value therefore requires a rebuild rather than an update. If you add a layer that captures config in its constructor, you must extend these predicates or the layer will silently keep stale values.

### Normalization

`normalizeLibrationConfig` backfills defaults, clamps unsupported values, canonicalizes durable ids against their catalogs, drops identity-valued optional entries, and preserves user intent where it is representable. `assertIsNormalizedLibrationConfig` is used in tests to prove a document is canonical.

Missing keys take the **current factory defaults**. Explicit persisted values are kept. Factory presentation defaults after [LIB-035](work/LIB-035-dynamic-live-time-integrity-and-iss-position.md): bottom HUD `chrome.layout.bottomTimeShowSeconds` is `false`; pin `labelMode` is `city` (name without time); pin `pinDateTimeDisplayMode` is `time` (no seconds when the time line is enabled). An old document that omitted those keys therefore normalizes to the new quieter defaults; a document that stored `true` / `cityAndTime` / `timeWithSeconds` keeps them. Named code presets clone `DEFAULT_APP_CONFIG` and inherit the same factory values; none pin HUD seconds or pin time as an intentional override.

Config stores **durable semantic ids** — base-map family ids, emissive asset ids, dynamic `sourceId`s — never resolved file paths, month-specific rasters, or feed URLs.

### The transitional legacy-flag surface

`AppConfig.layers` is a flat `LayerEnableFlags` record with one boolean per layer id. It is kept in sync with the authoritative scene, and it is still consulted in the rebuild predicates and by some construction paths.

This is a transitional compatibility surface, documented as such in the source: *"Scene is authoritative for runtime composition and overlay construction. Legacy `layers` flags remain as transitional compatibility, but scene deltas are the primary trigger surface for registry rebuilds."*

Treat the flags as derived. Do not add new product behaviour that depends on them, and do not remove them opportunistically — several predicates and tests currently read them. Collapsing this surface is a real piece of work, not a cleanup.

### Not dead code

`ALLOW_PHASE3_MUTATIONS` in `src/components/config/phase3Flags.ts` is a `const true`. It gates the config-mutation path and the user-presets panel in `App.tsx`. It reads like a leftover feature flag but it is currently load-bearing in the sense that removing it means editing live call sites; it is not an inert constant with no references.

---

## 8. Time model

**One canonical UTC instant per frame.** `clockNowMs` is computed once in `renderFrame` and threaded through `TimeContext` to everything. There is no `Date.now()` call downstream of that point in the frame.

**Real time** is `Date.now()`. **Demo time** is a configured alternative source: `data.mode === "demo"` with `demoTime.enabled`, a `startIsoUtc` anchor (default `2030-06-15T12:00:00.000Z`), and a `speedMultiplier`. `computeEffectiveRenderTimeMs` and the transport helpers in `src/app/demoPlayback.ts` produce the simulated instant. Pause state lives in the runtime playback ref, not in the configuration document.

Demo mode is the intentional exception to "one clock", and it is intentional precisely because it replaces the source rather than adding a parallel one: downstream code cannot tell the difference apart from the `simulated` flag on `TimeContext`.

**Time drives content, not just labels.** The product instant selects:

- the month raster for month-aware base-map families, through the catalog-backed resolver;
- subsolar and sublunar points, solar altitude, lunar phase and optical libration, lunar altitude, and hence the whole illumination field;
- the analemma ground track (default: UTC time-of-day of the instant; optional frozen `utcHour`);
- the lunar ground track (past/future window around the instant; same `sublunarPoint` as the Moon marker);
- the lunar locus (mean-lunar-day samples of the same `sublunarPoint` across one orbital cycle, with the instant as the cycle seam);
- solar eclipse authority lookup, live geographic footprint, and forecast-window event selection (NASA Besselian evaluation at that UTC; unsupported outside 1900–2100; forecast windows that extend past the span are truncated);
- lunar eclipse authority lookup, Earth-shadow geometry at the Moon, the terrestrial Moon-above-horizon region, and advance forecast of upcoming lunar events (unsupported outside 1900–2100);
- reference-city eclipse circumstances for the chrome catalog city (derived observer projection; does not change global event selection);
- live eclipse alignment presentation for an active solar or lunar event (derived from existing live geometry; does not change event truth);
- eclipse event-information copy, relative time-to-event, and restrained map labels (presentation of the same frame; does not change event truth);
- which dynamic snapshot is resolved for each source.

**Display formatting never mutates the instant.** Reference zone, reference city, and top-band mode change presentation and — for the phased tape — where a civil hour is *read*. They do not change what time it is. Time formatting helpers live in `src/core/timeFormat.ts`, `wallTimeInZone.ts`, `timeZoneOffset.ts`, and `civilProjection.ts`; none of them feed back into the instant.

**Current-only live feeds are gated by live-enough product time.** `isProductTimeLiveEnough` in `src/core/liveProductTimePolicy.ts` compares the product instant to wall-clock now with an inclusive ±5 minute window (not user-configurable). Ordinary current-time operation qualifies; paused Demo still within the window qualifies; 2017/2030 Demo and accelerated playback that has walked outside the window do not. Wall-clock now is the same top-of-frame `Date.now()` already used to distinguish real vs demo time. It is not a second display clock. See [ADR 0013](decisions/0013-current-only-internet-data-requires-live-enough-product-time.md).

---

## 9. Dynamic data lifecycle

Full contract: [`docs/specs/scene/dynamic-data-lifecycle.md`](specs/scene/dynamic-data-lifecycle.md). Summarised here only as it appears in the application.

Runtime lives in `src/lifecycle/`. `createDynamicDataLifecycleHost` bundles a versioned snapshot store, a per-source lifecycle state machine (`idle` / `loading` / `ready` / `stale` / `error`), a product-time resolver, an acquisition controller, and the materializers.

Acquisition is periodic and runs on an injectable timer, never inside `requestAnimationFrame`, a layer constructor, or a RenderPlan builder. Refresh cadence is per source: 15 minutes for clouds/IR, 5 minutes for earthquakes, 1 minute for the ISS track.

Each frame the host attaches a read-only view bound to the product instant. When the shell supplies wall-clock now, `getPreparedEquirectRaster` / `getPreparedCloudOpacity` / `getPreparedPointFeatures` / `getPreparedTracks` return **null** for catalog `timePolicy: "wallClockCurrent"` sources unless product time is live-enough. Store snapshots remain; fixture bytes are not painted as a substitute. Layers with no prepared view contribute nothing (`missing-prepared-view`).

Three live feeds are wired, each classified `timePolicy: "wallClockCurrent"` under their present implementations. Clouds/IR and earthquakes keep a recorded real-format fixture as offline fallback under the same durable `sourceId`. ISS does not: CelesTrak failure with no usable live TLE leaves the overlay unavailable.

| Durable `sourceId` | Feed | When product time is not live-enough |
|--------------------|------|--------------------------------------|
| `global-clouds-ir-v1` | NASA GIBS WMS, MODIS Terra Cloud Top Temperature (Day), equirect JPEG (no `TIME`; latest/current) | Overlay **and** cloud illumination participation suppressed |
| `usgs-earthquakes-v1` | USGS `all_day.geojson` | Presentation suppressed |
| `iss-orbital-track-v1` | CelesTrak GP TLE (CATNR 25544), SGP4 via `satellite.js` | Track and current marker suppressed (current TLE is not a historical reconstruction) |

Cloud participation in planetary illumination consumes the **same** `global-clouds-ir-v1` source through the cloud-opacity materializer, so enabling it arms acquisition even when the cloud overlay layer is off — **except** when product time is not live-enough, in which case both overlay and participation stay off.

Layer masters checkboxes (`globalCloudsIr`, `earthquakes`, `orbitalTracks`) are the production enablement path. They mutate SceneConfig through `updateConfig` → `commitWorkingV2Update`, rebuild the registry, and call `syncDynamicLifecycleConsumers()`. Factory defaults keep all three off, so ordinary startup fetches nothing. Durable checked state is **not** cleared when Demo time is historical; Layers shows “Live-only data is hidden while viewing another product time.” while suppressed.

When every current-only consumer of a source is suppressed, `armDynamicLifecycleConsumers` **stops** periodic acquisition. Returning inside the live-enough window re-arms immediately (`runImmediately: true`) from a React effect driven by an eligibility flag — not from rAF.

Each animation frame re-attaches the host and re-reads prepared views, so a completed acquisition becomes visible on the next frame without a separate React invalidation.

**ISS current position.** Live acquisition stores TLE lines and an origin stamp (`live-tle`) on the track properties. Each prepared view computes an explicit SGP4 sample at the product UTC (`propagateIssPositionAtTime`); the RenderPlan marker and `ISS` label use that sample, not the first or last track vertex. Acquisition still generates a **−60 min past / +30 min future** track at 2 min steps. Layers → **Space objects** holds ISS presentation: an orbit-track master (hides trajectory lines, not the current glyph), independent past/future toggles and colors, discrete past duration (15/30/45/60 min, default 60) and future duration (15/30 min, default 30) filtered by sample `timeMs` vs product UTC in the overlay `getState` (not during TLE materialization), shared line thickness (thin/normal/thick; normal matches the previous 1.6 px trail), orbit base color (on-map label family; past track follows when it still matches the previous base), Dot or ISS-silhouette glyph with size and conditional color, and a Show ISS label toggle (default on). Future segments stay the same `line` primitive at slightly lower alpha. Changing those parameters rebuilds the layer registry immediately because `sceneRuntimeAffectingEqual` includes `dynamicTracks.source.parameters`; the already-prepared ISS view is reused and no TLE fetch is started. TLE refresh remains 1 minute; the marker moves with product time between fetches. Presentation options do not change provenance, freshness, or historical suppression.

TLE age is `productUtcMs − tleEpochMs` (not user-configurable): ≤18 h paints as live; 18–48 h paints as degraded (not labeled live); >48 h suppresses ISS (same visual as unavailable). Last-good **live** TLE kept by `stale-when-cached` may still paint in the fresh or degraded band; origin is cached/stale, not live, not fixture. Production does not fall back to fixture. CelesTrak failure with an empty cache leaves ISS unavailable. Layers shows a concise “ISS orbital track is unavailable/degraded” hint when the layer is enabled and product time is live-enough. Historical suppression takes precedence: a current-only source outside the live window is hidden even if a snapshot exists.

Failure policy for clouds/IR and earthquakes remains `stale-when-cached` with fixture fallback on empty cache. Aborts do not trigger fixture fallback.

---

## 10. Map and substrate model

Base-map inventory is declared in a bundled JSON catalog:

```
src/assets/maps/base-map-catalog.json
```

The application does **not** scan `public/maps` at runtime and does not fetch a remote catalog. Eleven families are bundled:

| Family id | Kind |
|-----------|------|
| `equirect-world-legacy-v1` | Default reference substrate |
| `equirect-world-topography-ne-v1` | Natural Earth topography |
| `equirect-world-political-v1` | Natural Earth political |
| `equirect-world-geology-v1` | USGS-lineage geology |
| `equirect-world-bathymetry-etopo-v1` | NOAA NCEI ETOPO 2022 |
| `equirect-world-landcover-modis-v1` | NASA MODIS IGBP land cover |
| `equirect-world-climate-koppen-beck-v1` | Beck Köppen–Geiger present-day climate |
| `equirect-world-population-gpw-v1` | NASA SEDAC GPWv4 population |
| `equirect-world-blue-marble-bm-v1` | Blue Marble, month-aware |
| `equirect-world-blue-marble-t-v1` | Blue Marble topography, month-aware |
| `equirect-world-blue-marble-tb-v1` | Blue Marble topography+bathymetry, month-aware |

Persisted configuration stores the **family id**. Concrete rasters are resolved at runtime by `baseMapAssetResolve.ts` and, for month-aware families, `baseMapMonthResolve.ts` using the canonical product instant. A month raster path is never persisted. `equirect-world-topography-v1` and `equirect-world-topo-v1` are legacy resolver aliases for the Blue Marble **T** family; they are not aliases for the static Natural Earth topography family.

Catalog entries carry `previewThumbnailSrc`, structured `attribution`, an optional `licenseNote`, up to two `sourceLinks`, and optional `capabilities` hints consumed by the overlay-readability substrate model (§6). Attribution is catalog-only and is never persisted into `SceneConfig`; `BaseMapStyleControl` renders it in a "Source & license" block.

Presentation overrides (brightness, contrast, gamma, saturation) are per-family and resolved by `resolveEffectiveBaseMapPresentation`. Gamma is applied through the backend's offscreen cache rather than per frame.

Onboarding a new family uses `npm run maps:prep -- --update-catalog` against a curated source TIFF. Provenance, licensing, dateline-roll handling, and resampling procedure for every asset live in [`docs/maps/MAP_ASSET_SOURCES.md`](maps/MAP_ASSET_SOURCES.md); the curation policy lives in [`docs/maps/MAP_ASSET_STRATEGY.md`](maps/MAP_ASSET_STRATEGY.md). Do not duplicate provenance elsewhere.

Base maps are **substrates**. Spatial truth is the projection (`src/core/equirectangularProjection.ts`), never the image.

---

## 11. UI and configuration panel

The scene fills the window. The configuration UI is an overlay panel.

**Opening and closing:** press `C` to toggle, `Escape` to close, or use the launcher button. The `C` handler ignores repeats, ignores modified keypresses (`Ctrl` / `Meta` / `Alt`), and ignores the key entirely when focus is in a text-entry element, so typing a lowercase "c" into a field does not close the panel.

**Tabs** are declared once in `src/components/config/configTabs.ts`:

| Tab | Owns |
|-----|------|
| Layers | Scene stack toggles (Layer masters topic, default): lunar ground track, lunar locus, Solar eclipses, Lunar eclipses, and the other overlay masters. Internal **Layers topic** selector (UI-only, not persisted; inactive topics unmount; compact selector uses shared `.config-topic-nav` `position: sticky` inside the existing `.config-tab-panel` scroller, not the viewport; changing topic resets that panel’s `scrollTop` and does not call `updateConfig`): Map (family, preview, attribution, presentation); Illumination (moonlight, night lights, cloud participation); Eclipse System (event information / labels; solar and lunar forecast horizons and type filters; lunar forecast/active Moon-visible geography; alignment; reference-city details/chrome; independent appearance; active solar eclipse shading enable and Subtle/Normal/Dramatic intensity); Moon & libration (size, ring/crosshair, map/observer orientation, use-reference-city, color, thickness, motion scale); Astronomy paths (past/future track extents and stroke colors; independent Lunar locus and Solar analemma stroke color/thickness); **Space objects** (ISS presentation: orbit track, past/future segments, colors, thickness, glyph, size, label — other object families are not implemented); Advanced (overlay-readability presentation and per-layer pilots). Optional live overlays (clouds/IR, earthquakes, ISS) remain Layer masters checkboxes. Live eclipse event rows live on the map, not in this tab. |
| Pins | Reference cities, custom pins, pin presentation |
| Chrome | Internal **Chrome topic** selector (UI-only, not persisted; inactive topics unmount; same sticky `.config-topic-nav` inside `.config-tab-panel` as Layers; changing topic resets that panel’s `scrollTop` and does not call `updateConfig`). Default **Reference & clock** (hour-label format, civil timezone source, read-point meridian / reference city). Other topics: Bottom HUD; Hour indicators; Tick tape; NATO time zones. There is no nested Chrome-area selector. |
| Geography | Geographic meridian when Chrome read point is Auto (Greenwich vs fixed coordinate) |
| Data | Time mode and demo-time controls |
| General | Application-level settings, presets |

Every edit routes through `updateConfig` → `commitWorkingV2Update`, so the panel cannot bypass normalization or persistence. Changes are saved immediately; there is no explicit save action.

**Demo transport** controls in the Data tab post an action (`pause` / `resume` / `reset`) into `demoTransportActionRef`, which the next frame consumes. Transport state is runtime-only and is not persisted; `demoTime.speedMultiplier` and `startIsoUtc` are persisted.

**Config-panel time:** while the panel is open, `configPanelProductInstantMs` tracks the render clock but only updates when the **UTC calendar month** changes. That is enough for the month-aware base-map selector to show the correct active month without re-rendering the panel every frame.

**Accessibility:** the canvas is `aria-hidden`. Nothing in the scene is represented in the DOM. DOM-based inspection tells you nothing about what is drawn — only pixels do. This matters for any verification approach.

---

## 12. Areas requiring care

Not a defect list. These are places where the code is doing something subtle for a reason, and where an ordinary-looking change is likely to be wrong.

**`src/renderer/displayChrome.ts` (~1,900 lines).** Two coordinate models coexist (§5). The band-height fixed-point solve has two documented traps: the seed must not come from the circle stack, and the loop must converge on intrinsic height rather than row height. Seam wrapping must be applied to anything that can straddle the antimeridian. A change that "simplifies" any of these will produce output that looks nearly right and is wrong.

**`src/renderer/illuminationShading.ts`.** The twilight field is continuous, and its constants have been tuned iteratively against visual review (Gaussian sigma for anchor-colour coupling, cooler civil-to-astronomical progression, a capped atmospheric-tint budget, a softened day-side envelope below the daylight-clear cutoff). The constants are interdependent — the tint cap only makes sense against the current sigma and anchor colours. Changing one in isolation shifts the terminator's appearance globally, and there is no pixel baseline to catch it. Treat this file as tuned, and change it only with visual review.

**Config normalization and the rebuild predicates.** Normalization is idempotent and runs on both sides of every update; the rebuild predicates in `workingV2Commit.ts` encode which layers capture configuration at construction time. Adding a config field that a layer reads in its constructor without extending `sceneRuntimeAffectingEqual` or the compatibility predicates produces a stale layer that only refreshes when something *else* forces a rebuild — an intermittent bug that is hard to attribute.

**Illumination resource realization.** The illumination field is computed on the CPU per frame and emitted as one `rasterPatch`. Emissive sampling decodes a bundled raster; cloud participation decodes a JPEG during materialization, outside the frame. The gamma raster cache is keyed on URL, natural dimensions, and gamma. Work added to this path is per-frame, per-texel work — it is the easiest place in the codebase to destroy the frame rate.

**Backend layer-type dispatch.** The Canvas backend routes by `LayerType`. A missing dispatch arm is silent: the layer computes state, emits nothing, and nothing appears. A new layer type needs a dispatch arm and a test at the backend boundary.

**The legacy layer-flag surface** (§7). Transitional and still read. Neither extend it nor delete it casually.

---

## 13. Module map

| Path | Responsibility |
|------|----------------|
| `src/main.tsx`, `src/App.tsx` | Entry point and application shell: refs, frame loop, wiring |
| `src/dev/` | Development-only visual-scenario registry and process-local session (not a product subsystem) |
| `src/app/` | Bootstrap (registry construction), render loop, render bridge, config commit path, demo playback, preset lifecycle |
| `src/config/` | Resolvers, defaults, catalogs (base map, presentation), chrome and hour-marker configuration, semantic planning inputs |
| `src/config/v2/` | `LibrationConfigV2`, `SceneConfig`, normalization, `localStorage` persistence, user presets |
| `src/core/` | Product logic independent of rendering: time and civil projection, live-enough product-time policy, solar and lunar geometry, eclipse authority and Besselian geography, projection maths, illumination policies, overlay-readability frame, substrate lift model |
| `src/layers/` | Layer contracts, registry, factory, and one module per layer with its payload type |
| `src/lifecycle/` | Dynamic data: contracts, store, manager, resolver, acquisition (live HTTP and fixture), source catalogs, materializers, app-shell host |
| `src/renderer/` | Chrome layout and rendering, illumination sampling, realization adapters, scene viewport layout, backend interface |
| `src/renderer/renderPlan/` | `RenderPlan` types, the Canvas executor, and one plan builder per product concern |
| `src/renderer/canvas/` | Canvas-specific bridges: fonts, paint, paths, gamma raster cache |
| `src/glyphs/` | Procedural glyph geometry for hour markers |
| `src/typography/` | Font descriptors, metrics, ink measurement |
| `src/color/` | Colour space helpers |
| `src/components/config/` | Configuration panel shell, tab strip, and the six tab implementations |
| `src/assets/` | Bundled catalogs (base maps, emissive composition, solar and lunar eclipse authority) and the generated font manifest |
| `src/data/` | Static reference data (cities) |
| `tools/` | `maps:prep`, `fonts:prep`, and `eclipse:prep` asset preparation |
| `src-tauri/` | Tauri desktop shell (present, not load-bearing) |

Tests are colocated as `*.test.ts` / `*.test.tsx` next to the modules they cover.

---

## 14. Where to read next

- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — the boundaries and invariants this implementation must preserve.
- [`docs/VISUAL_VERIFICATION.md`](VISUAL_VERIFICATION.md) — Cursor-native visual verification procedure.
- [`docs/decisions/`](decisions/) — why the durable choices were made.
- [`docs/PROJECT_STRATEGY.md`](PROJECT_STRATEGY.md) — what the product is for.
- [`docs/specs/scene/dynamic-data-lifecycle.md`](specs/scene/dynamic-data-lifecycle.md) — the dynamic-data contract in full.
- [`docs/specs/scene/eclipse-system.md`](specs/scene/eclipse-system.md) — Eclipse System architecture; E1–E6 are production. Remaining eclipse ideas stay unapproved in [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md).
- [`docs/maps/MAP_ASSET_SOURCES.md`](maps/MAP_ASSET_SOURCES.md) — asset provenance and licensing.
- [`docs/history/`](history/) — how the system was built, for when the *why* is not in the code.
