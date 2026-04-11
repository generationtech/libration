# Project Plan

## Current State

Initial public release: COMPLETE (`v1.0.0`)  
Architecture: COMPLETE enough for feature-forward work  
Top-band hour-marker runtime migration: COMPLETE for the supported production path  
Hour-marker editor architecture migration: COMPLETE  
Hour-marker persistence migration: COMPLETE  
Typography + glyph subsystem: IMPLEMENTED and usable  
Canvas font realization for bundled font assets: WORKING  
RenderPlan backend-boundary cleanup: COMPLETE enough for the current Canvas path

---

## Current Phase

### Phase: Post-Release Feature Work on Top-Band Chrome

Focus:
- treat the cleaned hour-marker runtime/editor/persistence model as stable
- use `chrome.layout.hourMarkers` as the single authoritative model
- continue top-band visual and feature work without reintroducing migration scaffolding
- preserve renderer-agnostic planning and semantic/runtime separation
- maintain Libration as the canonical public reference implementation of this system

Current truthful top-band model:
- **Behavior** → `tapeAdvected`, `staticZoneAnchored`
- **Content** → `hour24`, `localWallClock`
- **Realization** → `text`, `analogClock`, `radialLine`, `radialWedge`
- **Layout** → size / placement semantics
- **Appearance** → layered styling controls

Recent completed work:
- extracted `HourMarkersEditor` from `ChromeTab`
- reorganized hour-marker editing around the runtime axes
- introduced realization-specific editor ownership
- migrated persistence to structured `chrome.layout.hourMarkers`
- removed legacy flat hour-marker fields
- switched runtime resolution to structured hour-marker input
- removed hour-marker circle backgrounds from the top band
- removed `NOON` / `MIDNIGHT` tape annotations from the top-band render plan
- verified that fresh deploys default `AppConfig.data.mode` to `static`
- completed public repo cleanup, rename, and AGPL licensing
- published the initial public release (`v1.0.0`)

Immediate next target:
- continue incremental top-band feature and styling work using the completed structured model
- avoid reopening hour-marker migration work unless a concrete bug requires it
- keep public-facing docs, defaults, and licensing posture coherent as the project evolves

---

## Chosen Inventory

### Font-backed
- Zeroes One
- Zeroes Two
- DSEG7Modern-Regular
- DotMatrix-Regular
- COMPUTER
- Flip Clock
- Kremlin

### Procedural
- analogClock
- radialLine
- radialWedge

---

## Runtime Status (Hour Markers)

The hour-marker runtime proving ground is complete enough to stop modifying for architectural reasons.

Implemented production path:
- structured `chrome.layout.hourMarkers`
- `resolveEffectiveTopBandHourMarkers`
- semantic hour-marker planner
- renderer-agnostic layout stage
- realization adapters for:
  - text
  - analogClock
  - radialLine
  - radialWedge
- strict semantic-only runtime contract for in-disk hour markers

Important consequences:
- no fallback runtime path remains for top-band hour markers
- production uses the semantic path only
- editor, normalization, and runtime now share one authoritative config model
- tests rely on semantic fixtures and structured config, not degraded fallback behavior or flat compatibility fields

---

## Completed Migration Work

### 1. Editor Boundary
- introduced `HourMarkersEditor`
- moved hour-marker controls out of `ChromeTab`
- kept user-visible behavior stable during the extraction

### 2. Internal Editor Structure
- organized the hour-marker editor around:
  - behavior
  - content
  - realization
  - layout
  - appearance

### 3. Realization-Specific Ownership
- introduced dedicated editor ownership for:
  - `HourMarkerBehaviorEditor`
  - `HourMarkerContentEditor`
  - `HourMarkerRealizationEditor`
  - `TextHourMarkerAppearanceEditor`
  - glyph-mode-specific appearance ownership for:
    - analogClock
    - radialLine
    - radialWedge

### 4. Persistence and Runtime Cutover
- introduced structured `chrome.layout.hourMarkers`
- migrated normalization to structured-only hour-marker input
- migrated editor authoring to structured-only hour markers
- migrated runtime/resolver consumption to structured-only hour markers
- removed legacy flat hour-marker persistence fields and compatibility output

---

## Next Direction

### 1. Feature-Forward Styling / Chrome Evolution
- add new top-band visual changes on top of the stable hour-marker architecture
- keep the scope local to top-band chrome unless a broader pattern is clearly justified

### 2. Realization-Specific Appearance Controls (When Needed)
Potential future work:
- analog clock specific appearance controls
- radial line specific appearance controls
- radial wedge specific appearance controls
- richer text appearance controls

These should be added only in response to concrete feature needs.

### 3. Pattern Reuse Elsewhere (Deferred)
- apply the structured editor/persistence pattern to other chrome surfaces only after hour markers prove out as a reusable template
- do not generalize the hour-marker architecture prematurely

### 4. Future Rendering Work (Deferred, Not Current)
- renderer-owned glyph outline rendering
- atlas/SDF-based text rendering
- RTX/native backend realization

---

## Rules Going Forward

- No architectural rewrites without a concrete feature blocker
- Use the current runtime/editor/persistence subsystem instead of redesigning it again
- Keep renderer planning backend-neutral
- Font selection must not leak directly into unrelated components
- Non-font glyph modes remain first-class representations
- Treat custom glyph-shape rendering as a future renderer feature, not an assumed current capability
- Keep the default first-load data posture local-first and `static` unless a deliberate product decision changes it
- Preserve AGPL-aligned user-freedom intent in public-facing project decisions
- Do not reintroduce top-band text-style preset concepts
- Do not restore degraded runtime fallback behavior for hour markers
- Do not resurrect legacy flat hour-marker persistence
