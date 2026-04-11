# Project Plan

## Current State

Renderer-agnostic architecture is **complete**.

Focus shifts to:
👉 feature development

---

## Completed Phases

### Phase 1–4
Foundation, layer system, chrome fidelity

### Phase 5
State + persistence

### Phase 6–14
RenderPlan migration:
- chrome → plan
- scene overlays → plan
- markers → plan
- illumination → plan
- base map → plan

---

## Current Phase

### Phase 15 COMPLETE
Base raster map migrated via imageBlit

---

## Next Direction

Primary focus:
- Feature development

Potential future work:
- data layers
- UX improvements
- GPU renderer (later)

---

## Rules Going Forward

- No major architectural rewrites
- Extend via plan builders
- Add primitives only when required
