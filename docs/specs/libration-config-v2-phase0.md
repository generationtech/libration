# LibrationConfig v2 — Phase 0 (schema contract)

This document defines the durable, render-engine-agnostic configuration shape for Libration. Sections **B–F** are normative for Phase 0 adoption.

---

## B. Proposed `LibrationConfig v2`

### Render-engine boundary (normative)

**Portable product domains (same saved document for every render engine):**  
`meta`, `layers`, `pins`, `chrome`, `geography`, `data` — these describe **what the instrument should show and how it should behave**, not how a backend draws it.

**Must stay outside durable config:** anything that is a **renderer implementation detail** (rasterization API, surface type, swapchain, shader constants, mesh/buffer layout), **shell/editor session state** (panel layout, focus, undo stack, transient selections), **VM/webview lifecycle**, **DOM/CSS**, **browser canvas** specifics, or **GPU vendor API** choices. Those live in the shell, editor, or renderer input adapter, and may change per engine without migrating user documents.

**Adapter + plan-builder role (UPDATED):** Each render engine maps the same v2 document through the application and plan-building pipeline:

LibrationConfig v2  
→ App / Resolver  
→ LayerState / Chrome State  
→ RenderPlan Builders  
→ RenderPlan  
→ Executor  
→ Backend

The saved file shape does not vary by engine.

**Critical rule:**  
> No renderer may interpret `LibrationConfig v2` directly.  
> All rendering semantics must be resolved into a RenderPlan before execution.

---

### Top-level schema (revised)

All top-level keys are **always present** in a normalized document (including factory presets, user presets, and working copy).

| Domain | Status | Purpose |
| --- | --- | --- |
| `meta` | **Active** (minimal) | Document identity: numeric schema version and provenance only. |
| `layers` | **Active** | Layer enable flags — which composable map/scene layers participate in the scene. |
| `pins` | **Active** + **future fields stubbed** | Pin *content* and selection (reference cities today; room for custom pins and appearance without schema churn). |
| `chrome` | **Active** + **optional stubs** | Instrument chrome *behavior*: civil-time source, top-band labeling mode, longitude anchor. Phase 0 preserves today’s wiring: **`chrome.displayTime`** supplies the shared civil-time reference pipeline for both the **top time instrument** and the **lower floating civil-time readouts** (no forked semantics). |
| `geography` | **Placeholder / future-facing** | Non-pin geospatial product context (e.g. explicit user location). |
| `data` | **Placeholder / future-facing** | Live data ingestion and dynamic layers. |

---

### Normalized shape (outline)

- **`meta`** — numeric `schemaVersion` (Phase 0: `2`)
- **`layers`** — LayerEnableFlags (unchanged)
- **`pins`** — reference cities + placeholders for custom/appearance/controls
- **`chrome`** — displayTime (civil-time + anchor behavior)
- **`geography`** — empty object
- **`data`** — empty object

---

### Per-domain notes

#### `meta`
- Schema version and provenance only
- No runtime rendering data

#### `layers`
- Declares which logical scene layers are enabled
- No rendering semantics

#### `pins`
- Describes geographic intent
- Not rendering primitives

#### `chrome`
- Defines instrument behavior
- Not pixel layout or rendering implementation

#### `geography`
- Future user/location context
- Must not absorb pins or renderer state

#### `data`
- Future ingestion
- Product-level selection only

---

## C. Exact mapping from current `AppConfig`

(unchanged mapping — preserved for correctness)

---

## D. Defaults / placeholders

Stub domains default to **empty objects**, ensuring a stable normalized shape.

---

## E. Preset compatibility model

Presets remain full snapshots of this schema.

Render-engine independence is preserved:
- No canvas-specific or GPU-specific data is stored.

---

## F. No-regression constraints

(unchanged — preserved fully)

---

## Additional Clarification (NEW)

### Runtime vs Durable Structures

The following are **runtime-only and must never be persisted**:

- RenderPlan
- RenderPlan primitives (rect, line, text, path2d, gradients, rasterPatch, imageBlit)
- Cached geometry or projection results
- Renderer-specific buffers or state

These are derived from `LibrationConfig v2` at runtime and must remain ephemeral.

### Hour markers (`chrome.layout.hourMarkers`)

Top-band hour markers are authored and persisted **only** via the structured `chrome.layout.hourMarkers` object. **Breaking change:** documents that stored hour-marker settings solely via removed flat fields on `chrome.layout` are incompatible with current versions (intentional cutover).

---

## Status

The schema is fully aligned with the RenderPlan architecture:

- Config expresses **intent only**
- Plan builders resolve intent into explicit rendering instructions
- Backends execute without interpretation

---

*End of Phase 0 sections B–F.*
