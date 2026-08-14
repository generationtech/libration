# AGENTS.md

Entry contract for AI coding agents working in the Libration repository.

## What Libration is

A renderer-agnostic, longitude-first world time and global scene instrument. It is a precision time instrument with a composable scene system, not a generic map viewer.

## Documentation ownership

One kind of truth, one owner. Read the owner; do not reconstruct its content from another document.

| Document | Owns |
|----------|------|
| [`README.md`](README.md) | What Libration is, how to run and verify it, where to read more |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Durable boundaries and invariants, with rationale |
| [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) | How the current code actually works |
| [`docs/decisions/`](docs/decisions/) | Why durable choices were made |
| [`docs/PROJECT_STRATEGY.md`](docs/PROJECT_STRATEGY.md) | Product thesis, positioning, design principles |
| [`docs/FUTURE_FEATURES.md`](docs/FUTURE_FEATURES.md) | Speculative and future ideas — not approved work |
| [`docs/maps/`](docs/maps/) | Asset provenance, licensing, curation policy |
| [`docs/specs/scene/`](docs/specs/scene/) | Specialized subsystem contracts and planning specs |
| [`docs/history/`](docs/history/) | Archived planning and execution records — never current truth |

**Reserved, not yet created.** These are modernization targets. Do not invent them, and do not create competing surfaces for what they will own:

- `docs/STATE.md` — current development state and next actionable work.
- `docs/WORKFLOW.md` — how work items are defined, executed, and completed.
- `docs/VISUAL_VERIFICATION.md` — how visual changes are verified against the running application.
- `docs/ROADMAP.md` currently holds transitional pre-modernization content and will be rewritten.

## Required reading by task type

Always: `README.md` and `ARCHITECTURE.md`.

| Task | Also read |
|------|-----------|
| Any code change | `docs/IMPLEMENTATION.md` for the affected subsystem |
| Rendering, chrome, or layout | `docs/IMPLEMENTATION.md` §4–5, ADRs 0001 and 0002 |
| Scene, layers, base maps | `docs/IMPLEMENTATION.md` §6 and §10, `docs/maps/` |
| Time or display modes | `docs/IMPLEMENTATION.md` §8, ADR 0004 |
| Configuration or persistence | `docs/IMPLEMENTATION.md` §7 |
| Dynamic data | `docs/specs/scene/dynamic-data-lifecycle.md`, ADR 0005 |
| Product direction | `docs/PROJECT_STRATEGY.md` |

Read the source before editing it. Documentation describes the system; the source is the system.

## Non-negotiable architecture rules

These are stated with rationale in [`ARCHITECTURE.md`](ARCHITECTURE.md). In short:

1. Product semantics resolve upstream of rendering.
2. `RenderPlan` is the hard rendering boundary; backends execute resolved primitives only.
3. Backends must not inspect configuration to decide product behaviour.
4. `SceneConfig` is authoritative for scene content.
5. Chrome is screen-space and reserves layout before the scene viewport.
6. Projection defines spatial truth; base maps are substrates.
7. One canonical UTC instant per frame; display modes format, never mutate.
8. Persist durable semantic ids, never resolved paths or URLs.
9. No network access in the render path.
10. Illumination composes upstream into one `rasterPatch`.

## How to operate

- **Stay in scope.** Implement the task that was asked for. Do not broaden into adjacent refactors because the code is nearby.
- **Change the smallest responsible boundary.** When fixing a bug, identify the root cause and state which boundary the fix belongs to.
- **Test behaviour changes.** Add or adjust tests at the boundary that changed — normalization, resolver, plan builder, layer, lifecycle. Never weaken an assertion to make a suite pass.
- **Update the owning document** when behaviour or architecture changes, in the same change. Update only the document that owns the changed truth.
- **Report honestly.** Files changed, what changed, why, tests run, tests not run and why, risks and follow-ups. Do not claim tests passed unless you ran them. A summary that says "complete" without test evidence is incomplete.

## When to stop rather than invent

Stop and ask for direction when:

- the correct architectural boundary is unclear;
- a change would affect persisted user configuration;
- a backend change appears to need product knowledge;
- a test failure reveals documentation and source disagreeing;
- two sources of truth appear to exist;
- the work requires a new model rather than a patch;
- there is no explicitly scoped task and you would have to choose one.

The last case matters. Absence of an assigned task is not an invitation to generate plausible work. Ask.

## Anti-patterns

- Redesigning a subsystem while implementing a feature in it.
- Adding a configuration field while continuing to derive behaviour from the old one.
- Making a backend decide anything about product meaning.
- Fetching, decoding, or doing I/O inside the render path.
- Repeating another document's facts "for convenience" — link instead.
- Treating archived history as current state.
- Using chat history as project memory. Decisions belong in the repository.
