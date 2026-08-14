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

Note that `tauri.conf.json` still carries scaffold values (`productName` and window `title` of `tauri-app`), and `package.json` is still named `tauri-app`. These are cosmetic scaffold leftovers, not architectural signals.

### Offline behaviour

The application is usable with no network. All base-map rasters, the emissive night-lights raster, and the font assets are bundled and served from `public/`. Dynamic data sources fall back to recorded fixtures when live acquisition fails. Nothing in the render path requires the network.

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

The layer registry is then built by `createLayerRegistryFromConfig` (`src/app/bootstrap.ts`), which asks `planSceneStackComposition(config.scene)` for the resolved base-map part and ordered overlay parts, registers the base-map layer, and registers one layer per enabled overlay instance through `createLayerForSceneOverlayInstance`. Layers do not decide their own stacking; composition order, opacity, and `zIndex` come from the scene plan.

Two startup effects then run:

- `syncDynamicLifecycleConsumers()` — arms dynamic-data acquisition for whatever the persisted configuration already had enabled, so a saved session resumes without requiring the user to toggle anything.
- The render effect (below), which constructs the backend, waits for `backend.initialize(viewport)`, and only then starts the animation-frame loop.

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

`SCENE_STACK_LAYER_IDS` in `src/config/v2/sceneConfig.ts` defines the ten known overlay ids, in canonical order:

```
solarShading, grid, staticEquirectOverlay, globalCloudsIr, earthquakes,
orbitalTracks, cityPins, subsolarMarker, sublunarMarker, solarAnalemma
```

The base map is separate; it is the foundational part of the composition, not an entry in this list.

### Layer implementations

| Layer | Module | Notes |
|-------|--------|-------|
| Base map | `baseMapLayer.ts` | Resolves the family id to a concrete raster; carries effective presentation. |
| Solar shading / illumination | `solarShadingLayer.ts`, `solarShadingPayload.ts` | Emits the single planetary illumination `rasterPatch`. |
| Lat/lon grid | `latLonGridLayer.ts`, `equirectGridPayload.ts` | |
| City pins | `cityPinsLayer.ts`, `cityPinsPayload.ts` | Carries per-pin readability veil. |
| Subsolar / sublunar markers | `subsolarMarkerLayer.ts`, `sublunarMarkerLayer.ts` | |
| Solar analemma | `solarAnalemmaLayer.ts` | Derived ground track. |
| Static equirect overlay | `staticEquirectRasterOverlayLayer.ts` | Full-viewport raster overlay. |
| Dynamic equirect raster | `dynamicEquirectRasterOverlayLayer.ts` | Reads prepared views only. |
| Dynamic point features | `dynamicPointFeaturesOverlayLayer.ts` | |
| Dynamic tracks | `dynamicTracksOverlayLayer.ts` | |

### Planetary illumination

Illumination is not a stack of blend passes. Solar geometry, continuous twilight, moonlight, and emissive night lights are all resolved **upstream, on the CPU, into one RGBA field**, which is emitted as a **single** `rasterPatch`.

The pieces:

- `src/renderer/illuminationShading.ts` — the sampling and tuning core. Takes the geometric dot product of surface normal and subsolar direction, converts to solar altitude, and produces attenuation plus atmospheric tint. Civil, nautical, and astronomical thresholds are retained as **semantic anchors informing a continuous field**, not as banded regions. Composition is non-emissive: it attenuates and tints, it does not glow.
- `src/core/moonlightPolicy.ts`, `lunarIllumination.ts`, `lunarPhase.ts`, `sublunarPoint.ts` — moon phase, lunar altitude, and surface incidence produce a bounded directional night-side contribution: cool additive RGB plus a secondary transmittance lift on the darken mask. Strength comes from `scene.illumination.moonlight.mode` (`off` / `natural` / `enhanced` / `illustrative`), resolved into a deterministic policy table upstream.
- `src/renderer/emissiveIlluminationRaster.ts`, `src/core/emissiveNightLightsPolicy.ts` — human-made radiance sampled per texel from a bundled equirectangular raster, gated by solar altitude, coexisting with moonlight, and scaled by mode and presentation (`intensity`, `driverExponent`). The asset is chosen by durable `assetId` against a bundled **emissive composition catalog** that is separate from the base-map catalog; unknown or blank ids canonicalize to the catalog default.
- `src/lifecycle/dynamicCloudOpacityMaterializer.ts` — when `scene.illumination.cloudParticipation` is on, cloud opacity derived from the dynamic clouds source modulates the same field.

Polar behaviour (midnight sun, polar night) is not special-cased. It emerges from real solar geometry and seasonal axial tilt.

The backend sees one `rasterPatch` and knows nothing about any of this. See [ADR 0002](decisions/0002-single-upstream-planetary-illumination-rasterpatch.md).

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

Applying a commit does four things: swap the working document, re-derive `AppConfig`, conditionally rebuild the layer registry, and persist to `localStorage`.

### Registry rebuild predicates

The registry is rebuilt when any of the following changed:

- `sceneRuntimeAffectingEqual(prev.scene, next.scene)` is false — the authoritative trigger. It compares projection, view mode, ordering mode, base-map identity/visibility/opacity/variant/presentation, illumination modes and emissive presentation, overlay-readability presentation and per-layer entries, and every runtime-affecting field of each layer instance.
- Legacy `LayerEnableFlags` differ.
- The visible city id set or the custom pin list differ.
- Pin presentation, the default product font, or the top-band mode changed **and** the city-pins layer is registered in either the old or new config — because that layer captures those values at construction time.

That last group is worth understanding: several layers read configuration **once, at construction**. Changing such a value therefore requires a rebuild rather than an update. If you add a layer that captures config in its constructor, you must extend these predicates or the layer will silently keep stale values.

### Normalization

`normalizeLibrationConfig` backfills defaults, clamps unsupported values, canonicalizes durable ids against their catalogs, drops identity-valued optional entries, and preserves user intent where it is representable. `assertIsNormalizedLibrationConfig` is used in tests to prove a document is canonical.

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
- subsolar and sublunar points, solar altitude, lunar phase and altitude, and hence the whole illumination field;
- the analemma ground track;
- which dynamic snapshot is resolved for each source.

**Display formatting never mutates the instant.** Reference zone, reference city, and top-band mode change presentation and — for the phased tape — where a civil hour is *read*. They do not change what time it is. Time formatting helpers live in `src/core/timeFormat.ts`, `wallTimeInZone.ts`, `timeZoneOffset.ts`, and `civilProjection.ts`; none of them feed back into the instant.

---

## 9. Dynamic data lifecycle

Full contract: [`docs/specs/scene/dynamic-data-lifecycle.md`](specs/scene/dynamic-data-lifecycle.md). Summarised here only as it appears in the application.

Runtime lives in `src/lifecycle/`. `createDynamicDataLifecycleHost` bundles a versioned snapshot store, a per-source lifecycle state machine (`idle` / `loading` / `ready` / `stale` / `error`), a product-time resolver, an acquisition controller, and the materializers.

Acquisition is periodic and runs on an injectable timer, never inside `requestAnimationFrame`, a layer constructor, or a RenderPlan builder. Refresh cadence is per source: 15 minutes for clouds/IR, 5 minutes for earthquakes, 1 minute for the ISS track.

Each frame the host attaches a read-only view bound to the product instant. Layers ask that attachment for prepared views. Resolution is a store read; changing product time re-selects among cached versions and never triggers a fetch.

Three live feeds are wired, each with a recorded real-format fixture as offline fallback under the same durable `sourceId`:

| Durable `sourceId` | Feed |
|--------------------|------|
| `global-clouds-ir-v1` | NASA GIBS WMS, MODIS Terra Cloud Top Temperature (Day), equirect JPEG |
| `usgs-earthquakes-v1` | USGS `all_day.geojson` |
| `iss-orbital-track-v1` | CelesTrak GP TLE (CATNR 25544), propagated with SGP4 via `satellite.js` |

Cloud participation in planetary illumination consumes the **same** `global-clouds-ir-v1` source through the cloud-opacity materializer, so enabling it arms acquisition even when the cloud overlay layer is off.

Failure policy is `stale-when-cached`: a failed refresh prefers the last good version over surfacing an error. Aborts do not trigger fixture fallback.

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
| Layers | Scene stack toggles, illumination (moonlight, emissive night lights, cloud participation), overlay-readability presentation |
| Pins | Reference cities, custom pins, pin presentation |
| Chrome | Top-band layout, hour markers, tick tape, NATO letter row, bottom chrome |
| Geography | Base-map family selection and presentation, projection-adjacent settings |
| Data | Time mode, demo-time controls, dynamic data sources |
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
| `src/app/` | Bootstrap (registry construction), render loop, render bridge, config commit path, demo playback, preset lifecycle |
| `src/config/` | Resolvers, defaults, catalogs (base map, presentation), chrome and hour-marker configuration, semantic planning inputs |
| `src/config/v2/` | `LibrationConfigV2`, `SceneConfig`, normalization, `localStorage` persistence, user presets |
| `src/core/` | Product logic independent of rendering: time and civil projection, solar and lunar geometry, projection maths, illumination policies, overlay-readability frame, substrate lift model |
| `src/layers/` | Layer contracts, registry, factory, and one module per layer with its payload type |
| `src/lifecycle/` | Dynamic data: contracts, store, manager, resolver, acquisition (live HTTP and fixture), source catalogs, materializers, app-shell host |
| `src/renderer/` | Chrome layout and rendering, illumination sampling, realization adapters, scene viewport layout, backend interface |
| `src/renderer/renderPlan/` | `RenderPlan` types, the Canvas executor, and one plan builder per product concern |
| `src/renderer/canvas/` | Canvas-specific bridges: fonts, paint, paths, gamma raster cache |
| `src/glyphs/` | Procedural glyph geometry for hour markers |
| `src/typography/` | Font descriptors, metrics, ink measurement |
| `src/color/` | Colour space helpers |
| `src/components/config/` | Configuration panel shell, tab strip, and the six tab implementations |
| `src/assets/` | Bundled catalogs (base maps, emissive composition) and the generated font manifest |
| `src/data/` | Static reference data (cities) |
| `tools/` | `maps:prep` and `fonts:prep` asset preparation |
| `src-tauri/` | Tauri desktop shell (present, not load-bearing) |

Tests are colocated as `*.test.ts` / `*.test.tsx` next to the modules they cover.

---

## 14. Where to read next

- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — the boundaries and invariants this implementation must preserve.
- [`docs/STATE.md`](STATE.md) — current development state and next action.
- [`docs/decisions/`](decisions/) — why the durable choices were made.
- [`docs/PROJECT_STRATEGY.md`](PROJECT_STRATEGY.md) — what the product is for.
- [`docs/specs/scene/dynamic-data-lifecycle.md`](specs/scene/dynamic-data-lifecycle.md) — the dynamic-data contract in full.
- [`docs/maps/MAP_ASSET_SOURCES.md`](maps/MAP_ASSET_SOURCES.md) — asset provenance and licensing.
- [`docs/history/`](history/) — how the system was built, for when the *why* is not in the code.
