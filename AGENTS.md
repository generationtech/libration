# AGENTS.md

Entry contract for AI coding agents working in the Libration repository.

## What Libration is

A renderer-agnostic, longitude-first world time and global scene instrument. It is a precision time instrument with a composable scene system, not a generic map viewer.

## Reading sequence

1. This file.
2. [`docs/STATE.md`](docs/STATE.md) — current status, active item, next action.
3. The active work item in `docs/work/`, if any.

Those three decide whether you may implement anything. Repository documentation and the active work item govern implementation. External chat history does not.

If `docs/STATE.md` is **AWAITING SCOPE**, or there is no approved item, **stop**. Draft a `proposed` item only if asked. Never self-approve work. Never start [`docs/FUTURE_FEATURES.md`](docs/FUTURE_FEATURES.md) ideas.

Then, for ordinary implementation, read [`ARCHITECTURE.md`](ARCHITECTURE.md) and the relevant parts of [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md).

| Task | Also read |
|------|-----------|
| Rendering, chrome, layout | Implementation §4–5; ADRs 0001–0002, 0026; Cursor rule `010` |
| Scene, layers, base maps | Implementation §6, §10; `docs/maps/`; camera/reference-frame spec; Cursor rules `020`, `030` |
| Configuration or persistence | Implementation §7; Cursor rule `020` |
| Time or display modes | Implementation §8; ADR 0004; ADR 0013 (current-only live-enough gate) |
| Dynamic data | `docs/specs/scene/dynamic-data-lifecycle.md`; ADR 0005; ADR 0013 |
| Visual changes | [`docs/VISUAL_VERIFICATION.md`](docs/VISUAL_VERIFICATION.md); Implementation §2 (DEV scenario seed); Cursor rule `060` |

Read the source before editing it. Documentation describes the system; the source is the system.

## Documentation ownership

One kind of truth, one owner. See [`docs/WORKFLOW.md`](docs/WORKFLOW.md) for execution. In short:

| Document | Owns |
|----------|------|
| [`README.md`](README.md) | What it is, how to run it |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Durable boundaries and invariants |
| [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) | How the current code works |
| [`docs/STATE.md`](docs/STATE.md) | Current development state |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Approved future direction |
| [`docs/FUTURE_FEATURES.md`](docs/FUTURE_FEATURES.md) | Speculative ideas |
| [`docs/VISUAL_VERIFICATION.md`](docs/VISUAL_VERIFICATION.md) | Cursor-native visual verification procedure |
| [`docs/work/`](docs/work/) | Individual work items |
| [`docs/history/`](docs/history/) | Archived planning — never current truth |

## Architecture in short

Stated with rationale in [`ARCHITECTURE.md`](ARCHITECTURE.md):

1. Product semantics resolve upstream of rendering.
2. `RenderPlan` is the hard rendering boundary.
3. Backends must not inspect configuration to decide product behaviour.
4. `SceneConfig` is authoritative for scene content.
5. Chrome is screen-space and reserves layout before the scene viewport.
6. Projection defines spatial truth; base maps are substrates. Scene camera (when present) is a view, not a projection and not a mutation of entity state.
7. One canonical UTC instant per frame; display modes format, never mutate.
8. Persist durable semantic ids, never resolved paths or URLs.
9. No network access in the render path.
10. Illumination composes upstream into one `rasterPatch`.
11. Scene/map reference frame (Earth-fixed default; Moon longitude-lock; Moon position-lock; Sun longitude-lock; Sun position-lock) is independent of camera and of civil-time reference.

## How to operate

Stay in the active item’s scope. Change the smallest responsible boundary. Test behaviour changes; never weaken an assertion to pass. Update only the document that owns the changed truth. Report commands actually run and their actual results.

Stop when the boundary is unclear, persisted configuration would change, a backend seems to need product knowledge, docs and source disagree, two sources of truth appear, or there is no approved work.
