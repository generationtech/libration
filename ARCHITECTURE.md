# Libration architecture

This document owns Libration's **durable architecture**: the boundaries, invariants, and structural commitments that implementation work is required to preserve.

It deliberately contains no status, no maturity assessment, no feature ledger, and no roadmap position.

- How the current code actually works: [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md)
- Why specific durable choices were made: [`docs/decisions/`](docs/decisions/)
- What the product is for: [`docs/PROJECT_STRATEGY.md`](docs/PROJECT_STRATEGY.md)

Each invariant below is stated as **boundary**, **rationale**, and **consequence**, because an invariant without its rationale is a rule people route around, and an invariant without its consequences is a rule people underestimate.

---

## 1. Architectural identity

Libration is a renderer-agnostic, longitude-first world time and global scene instrument.

Five commitments define the system:

1. Time is canonicalized as UTC instants.
2. Spatial structure is longitude-first, not timezone-first.
3. Product meaning is resolved upstream of rendering.
4. Rendering intent is expressed as a backend-neutral `RenderPlan`.
5. Backends execute resolved plans and do not own product semantics.

Everything else in this document follows from these.

---

## 2. The pipeline

All visual output follows one shape:

```mermaid
flowchart LR
    IN[Config, Time, Assets] --> RES[Resolvers]
    RES --> SEM[Semantic planning]
    SEM --> LAY[Layout]
    LAY --> ADA[Realization adapters]
    ADA --> RP[RenderPlan]
    RP --> EX[Executor]
    EX --> BE[Backend]
```

Upstream of `RenderPlan`, code may know about time, map families, chrome meaning, scene layers, fonts, glyph kinds, and user configuration.

Downstream of `RenderPlan`, code may know about surfaces, drawing APIs, caches, image resources, font registration, and primitive execution.

Nothing may know about both.

---

## 3. Time invariants

### 3.1 One authoritative UTC instant per frame

**Boundary.** Each frame resolves exactly one canonical product instant. Every downstream computation — geometry, astronomy, asset resolution, data selection, labels — derives from that single value.

**Rationale.** Libration is a time instrument before it is a map. If two parts of a frame can disagree about what time it is, the instrument is not merely imprecise, it is incoherent: the terminator, the tape, the pins, and the readout would each be telling a slightly different truth. A single instant makes every frame internally consistent by construction rather than by discipline.

**Consequence.** No code downstream of the frame's time resolution may call a wall clock. Anything needing time takes it from the frame's time context. Introducing a second clock is not a performance shortcut; it is a correctness regression.

See [ADR 0004](docs/decisions/0004-one-canonical-utc-instant-per-frame.md).

### 3.2 Display modes format; they do not mutate

**Boundary.** Display mode, reference civil zone, reference city, and label style change **presentation only**. They never change the canonical instant.

**Rationale.** Civil time is a projection of an instant, not a competing definition of it. Users switch between 12-hour, 24-hour, UTC-style, and reference-city framings to read the same moment differently. If any of those switches perturbed the underlying clock, the display would be self-referential.

**Consequence.** A formatting change must never feed back into time resolution. Chrome geometry that depends on civil time derives it from the canonical instant plus a zone, not from a formatted string. Reference city selection contributes a meridian for spatial registration, not a clock.

### 3.3 Demo time replaces the source; it does not add one

**Boundary.** Demo mode is the single sanctioned exception to real-time operation. It substitutes the time source and is otherwise indistinguishable downstream except for an explicit `simulated` flag.

**Rationale.** Deterministic and accelerated time is genuinely necessary — for demonstration, for reviewing seasonal and diurnal behaviour, and for reasoning about the illumination model. The way to provide it without violating 3.1 is substitution, not addition.

**Consequence.** Demo time is configured, not ad hoc. Nothing downstream branches on demo mode to alter product behaviour.

---

## 4. Rendering invariants

### 4.1 `RenderPlan` is a hard boundary

**Boundary.** `RenderPlan` is the complete, backend-neutral description of what to draw: an ordered list of primitives. It is the only thing a backend receives.

**Rationale.** The product's rendering intent is elaborate and its drawing surface is replaceable. Keeping intent in a declarative structure means the meaning of a frame can be inspected, tested, and reasoned about without a canvas, and a future backend inherits correct behaviour rather than reimplementing it.

**Consequence.** A plan is fully testable without rendering — plan-level tests are the primary way geometry is verified. A second backend requires no product-side changes. Conversely, any product decision that reaches a backend has escaped the boundary and must be moved upstream.

See [ADR 0001](docs/decisions/0001-renderplan-as-the-renderer-boundary.md).

### 4.2 Backends execute; they do not decide

**Boundary.** A backend receives resolved intent. It must not inspect `SceneConfig` or any product configuration to decide product behaviour. It must not implement asset-resolution policy, decide fonts, glyph kinds, or layer semantics, and must not own layout.

**Rationale.** Every product rule that leaks into a backend is a rule that must be reimplemented, identically, in every future backend — and that will silently diverge.

**Consequence.** Backend bridges translate shared intent into backend-native calls and nothing more. Backends may report **concrete resource events** (an image URL failed to load, a font failed to register), because those are facts about the drawing surface. They may not choose a replacement. Fallback is policy, and policy is upstream.

### 4.3 Draw order is resolved upstream

**Boundary.** `RenderPlan` items are drawn in array order. There is no z-sorting or compositing in the executor.

**Rationale.** Ordering is a product decision — which overlay occludes which — and belongs where the product is modelled. A sorting executor would create a second, weaker place to express ordering.

**Consequence.** Scene composition resolves the full order before plan construction. Ties preserve document order, so layer ordering is deterministic and reproducible.

### 4.4 Composition happens upstream, not in the backend

**Boundary.** There is no generalized compositor and no backend-owned blend policy. Where multiple physical effects contribute to one visual result, they are combined upstream into a single primitive.

**Rationale.** A general compositor would be a second, weaker place to express product meaning, and it would push physically-motivated decisions into a layer that cannot reason about them.

**Consequence.** Planetary illumination — solar geometry, twilight, moonlight, emissive night lights, optional cloud participation — resolves to **one** `rasterPatch`. The backend decodes images and blits pixels; it has no illumination concepts at all.

See [ADR 0002](docs/decisions/0002-single-upstream-planetary-illumination-rasterpatch.md).

---

## 5. Chrome invariants

### 5.1 Chrome is screen-space

**Boundary.** Display chrome is instrument content in screen space. It is not a scene layer, does not participate in map projection, and does not enter scene layer ordering.

**Rationale.** Chrome is the instrument's frame of reference. Making it a scene layer would subject the reading surface to projection, camera, and layer-ordering concerns that have nothing to do with reading time.

**Consequence.** Chrome and scene are separate rendering passes over the same surface. Chrome elements are positioned in CSS pixels, even when their position is *derived* from longitude.

### 5.2 Chrome reserves layout before the scene viewport is resolved

**Boundary.** Chrome computes its reserved height first. The scene viewport is the full viewport minus that reservation.

**Rationale.** Chrome height is content-dependent — it varies with typography, marker size, and configured rows. The scene must be laid out against a known reservation, and the map is shortened rather than occluded so that the full longitude span stays visible.

**Consequence.** The frame order is fixed: chrome state, then scene input, then scene render, then chrome render. Chrome cannot depend on scene layout, because the dependency runs the other way.

### 5.3 Structural longitude and civil time are separate coordinate models

**Boundary.** The fixed 15° structural columns and the time-phased civil hour tape are distinct coordinate systems that coexist in the top band. They must not be unified.

**Rationale.** This is the longitude-first thesis made visible. Structural columns are geography and register exactly with the map. The phased tape is civil time and slides continuously against an anchored read point. Civil offsets are not multiples of 15° and political zones do not follow meridians, so any attempt to make one grid serve both purposes must falsify one of them.

**Consequence.** Two independent x-derivations exist by design. See [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md#5-chrome-coordinate-model) before modifying top-band geometry.

### 5.4 Persisted chrome state is single-sourced and derived at runtime

**Boundary.** Hour-marker persisted state lives under `chrome.layout.hourMarkers` and nowhere else. Runtime content and behaviour are derived from it, not duplicated into parallel persisted axes.

**Rationale.** Parallel persisted representations of the same concept drift, and reconciling them becomes indefinite work.

**Consequence.** Text and procedural glyph realizations both flow through the same resolver → semantic plan → layout → adapter → `RenderPlan` path. Adding a realization means adding an adapter, not a persistence axis.

---

## 6. Scene and spatial invariants

### 6.1 Projection defines spatial truth; base maps do not

**Boundary.** Geographic position is defined by the projection. A base map is a substrate that must satisfy the projection contract.

**Rationale.** Overlays, markers, pins, and derived tracks must be correct relative to each other and to geography. If the raster defined truth, every overlay would inherit that raster's registration errors, and swapping substrates would silently move everything.

**Consequence.** All scene geometry is expressed in geographic or projection-aware coordinates before rendering. A substrate whose registration cannot be corrected to the projection contract is not eligible for inclusion, regardless of how good it looks.

### 6.2 Scene view and projection are separate concepts

**Boundary.** What is being projected and how the viewer is looking at it are distinct.

**Rationale.** Keeping them separate is what allows viewing behaviour to change without redefining spatial truth.

**Consequence.** Month-aware base-map switching is **asset resolution**, not camera behaviour. Camera-like features affect the view, not the projection contract.

### 6.3 `SceneConfig` is authoritative for scene content

**Boundary.** `SceneConfig` owns projection, view mode, base map, and the ordered layer list. Nothing else may define scene composition.

**Rationale.** One authoritative model makes composition deterministic and reproducible, and makes presets meaningful.

**Consequence.** Runtime structures such as the layer registry are **derived** from `SceneConfig`. When it changes in a composition-relevant way, the derived structure is rebuilt rather than patched.

### 6.4 Durable semantic ids, never resolved paths

**Boundary.** Configuration persists durable semantic identifiers — base-map family ids, composition asset ids, dynamic source ids. It never persists resolved raster paths, month-specific filenames, feed URLs, or derived runtime values.

**Rationale.** Resolved values are a function of time, catalog contents, and the asset pipeline, all of which change. A persisted path is a saved configuration that breaks when any of them does.

**Consequence.** A configuration saved in one month resolves correctly in another. Assets can be re-derived, re-encoded, or relocated without invalidating user state. Month-aware families resolve concrete rasters from the canonical product instant at runtime.

### 6.5 Asset inventory is catalog-driven

**Boundary.** Base-map inventory is declared in a bundled catalog. The application does not scan asset directories at runtime and does not fetch a remote catalog.

**Rationale.** Inventory carries semantics that a directory listing cannot express: family identity, month-awareness, projection contract, attribution, licensing, and readability capabilities. Scanning would infer a weaker model from filenames and make the shipped set non-deterministic.

**Consequence.** Adding a family is a curation step producing a catalog entry, not a file drop. Provenance and licensing have a definite home.

See [ADR 0003](docs/decisions/0003-bundled-base-map-catalog-with-durable-family-ids.md). The same posture applies to the bundled solar eclipse authority: versioned NASA-derived JSON, no runtime fetch, independent of ambient Sun/Moon astronomy ([ADR 0008](docs/decisions/0008-bundled-nasa-solar-eclipse-authority.md)).

---

## 7. Data invariants

### 7.1 No network access in the render path

**Boundary.** No fetch, decode, or I/O occurs inside the animation frame, layer construction, or `RenderPlan` building.

**Rationale.** A frame must be a pure function of resolved state. Latency or failure inside the paint path produces stalls, torn frames, and non-deterministic output, and makes rendering untestable.

**Consequence.** Acquisition is a separate, periodic, asynchronous concern. Decoding happens during materialization. Layers read prepared views synchronously and contribute nothing when no view exists.

### 7.2 Dynamic data binds to product time

**Boundary.** Snapshot selection is driven by the canonical product instant, not by wall clock and not by arrival order.

**Rationale.** Otherwise time-travel and demo playback would show data from the wrong moment while the rest of the frame showed the right one — reintroducing the incoherence that 3.1 exists to prevent.

**Consequence.** Snapshots are versioned and carry an explicit valid time. Changing product time re-selects among cached versions and never triggers acquisition.

See [ADR 0005](docs/decisions/0005-dynamic-data-acquisition-outside-the-render-path.md).

### 7.3 Readability is derived, never sampled

**Boundary.** Overlay legibility adjustments are computed upstream from known state — solar geometry, illumination policy, substrate presentation and declared capabilities. The rendered image is never read back to decide them.

**Rationale.** Sampling the framebuffer would make presentation depend on the backend, create a feedback loop between drawing and deciding what to draw, and impose a readback cost per frame. Deriving from policy keeps the decision in the same place as the rest of product meaning, and keeps it testable without rendering.

**Consequence.** Substrates declare capability hints in the catalog rather than being measured. Layers receive derived hints and adjust resolved draw intent. The backend remains unaware that readability exists.

See [ADR 0007](docs/decisions/0007-overlay-readability-derived-not-sampled.md).

---

## 8. Configuration invariants

### 8.1 One authoritative persisted document

**Boundary.** `LibrationConfigV2` is the authoritative persisted application configuration. Runtime configuration views are derived from it and are never a second source of truth.

**Rationale.** Two writable representations of the same state diverge.

**Consequence.** All mutation flows through one commit path. Derived views are recomputed, never edited.

### 8.2 Normalization is total and idempotent

**Boundary.** Every persisted document is normalized: defaults backfilled, unsupported values clamped, durable ids canonicalized against their catalogs, identity-valued optional entries dropped. Normalizing a normalized document changes nothing.

**Rationale.** Configuration arrives from older versions, from presets, from user edits, and from partially-written storage. Downstream code should never have to ask whether a field is present or plausible.

**Consequence.** Normalization must preserve user intent wherever it is representable — it corrects, it does not overwrite. It must not reintroduce compatibility surfaces that were deliberately removed.

---

## 9. Platform posture

Libration's application architecture is currently **browser-first**: React, TypeScript, Vite, Canvas 2D, and browser `localStorage`. A configured Tauri shell exists in the repository for desktop packaging and integration, but the application does not depend on Tauri APIs for any behaviour.

This is a description of the current architecture, not a commitment about the future. Whether the shell becomes load-bearing is an open product question. Nothing in this document should be read as deprecating desktop packaging.

See [ADR 0006](docs/decisions/0006-browser-first-spa-with-non-load-bearing-tauri-shell.md) and [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md#1-application-and-platform-model).

---

## 10. Applying these invariants

When a change appears to require violating an invariant, the usual cause is that a product decision is being made at the wrong layer. The productive question is not "may I make an exception" but "where does this decision belong."

Two useful checks:

- **If a backend needs to know it, it is in the wrong place.** Move the decision upstream and let the backend receive a resolved primitive.
- **If it must be persisted, persist the semantic id, not the resolved value.**

Changes that genuinely alter a boundary are architecture changes. They belong in an ADR under [`docs/decisions/`](docs/decisions/), with this document updated in the same change.
