# Development Strategy

## Purpose

This document defines how Libration should be developed.

It is a practical engineering guide for human work, ChatGPT planning, and Cursor implementation.

## Core development rule

Architectural boundaries are more important than local convenience.

Do not make a small task easy by placing behavior in the wrong layer.

## Work unit model

Use narrow, phase-scoped work units.

Each work unit should have:

- objective.
- scope boundary.
- expected files or subsystems.
- success criteria.
- tests.
- documentation updates.
- explicit non-goals.

## Implementation intent template

Use this shape when asking Cursor to implement:

```text
APPROVAL HEADER:
You are approved to make coordinated multi-file edits for this phase.
You are approved to create lifecycle/support files needed by this phase.
You are approved to split files when that improves architecture or maintainability.
Do not ask for confirmation before making those edits.

Context:
<short project context>

Required reading:
<docs and source files>

Task:
<single clear objective>

Constraints:
<architecture rules>

Expected implementation:
<phased details>

Tests:
<commands or test targets>

Return:
- files changed
- summary
- tests run
- risks or follow-up
```

## Required implementation behavior

### Keep product meaning upstream

Product meaning belongs in:

- config normalization.
- resolvers.
- semantic planners.
- layout.
- realization adapters.
- layer state builders.
- RenderPlan builders.

Product meaning does not belong in:

- backend execution.
- canvas bridges.
- resource caches.
- drawing loops.

### Preserve config authority

Config must store durable user intent.

Do not store:

- resolved month raster paths.
- derived display labels.
- backend-native font names as primary identity.
- transient layout coordinates.
- effective runtime behavior that can be derived.

### Preserve deterministic rendering

Rendering should be repeatable for a given config, time context, asset catalog, and viewport.

Avoid hidden global state except where explicitly managed, such as failed resource tracking or backend caches.

### Prefer structured models

Avoid boolean clusters when a structured model is warranted.

Prefer explicit axes such as:

- source.
- presentation.
- behavior.
- layout.
- realization.
- lifecycle.
- composition.

### Avoid compatibility drag

Temporary compatibility is acceptable during migration.

After a migration is complete:

- remove stale compatibility fields.
- update tests.
- update docs.
- prevent reintroduction through Cursor rules and specs.

## Testing strategy

Use the smallest meaningful test first.

Expected test types:

- normalization tests.
- resolver tests.
- planner tests.
- layout tests.
- RenderPlan primitive tests.
- backend bridge tests.
- UI/editor behavior tests where practical.
- catalog validation tests.
- onboarding tool tests for map/font workflows.

When a bug is found, add a regression test at the boundary that should have caught it.

## Documentation strategy

Docs are part of the product.

Update docs when:

- architecture changes.
- config semantics change.
- source of truth changes.
- workflows change.
- feature status changes (including composition and overlay readability milestones).
- when a vertical phase ships (e.g. overlay readability **v1 + v1.1** + **derived substrate lift scale** + **substrate heuristic increments** (catalog `reliefShaded` / `boundaryDense` / `chromaticDense` / `bathymetryShaded` / `fineScaleTexture` / `labelDense` / `etchedReliefDense` / `sunGlintDense`—the **eight shipped** intrinsics—, sub-1 brightness dimming), **`scene.overlayReadability.presentation` scalars**, **six default-stack `scene.overlayReadability.perLayer` pilots** per `SCENE_OVERLAY_READABILITY_PER_LAYER_PILOT_KEYS`, or **incremental twilight transition tuning** in `illuminationShading.ts` (including cumulative constants-only passes, e.g. the **second** narrow atmospheric pass doc-finalized in `PLAN.md` / `docs/ROADMAP.md`)), update `PLAN.md`, `docs/ROADMAP.md`, `ARCHITECTURE.md` maturity, `docs/FUTURE_FEATURES.md`, `docs/PROJECT_STRATEGY.md`, `docs/AI_COENGINEERING.md`, `AGENTS.md`, `docs/DEVELOPMENT_STRATEGY.md`, `docs/maps/MAP_ASSET_SOURCES.md`, `docs/maps/MAP_ASSET_STRATEGY.md`, and `.cursor/rules/050-docs-and-roadmap.mdc` so shipped vs backlog is obvious without reading source; add **Phase 7 rolling closure** bullets in `docs/ROADMAP.md` when a substrate, readability, or atmospheric increment finishes.
- future ideas are accepted, deferred, or rejected.

Keep docs in these roles:

- `README.md`: public entry point.
- `ARCHITECTURE.md`: durable architecture.
- `PLAN.md`: current execution direction.
- `docs/ROADMAP.md`: phase status.
- `docs/FUTURE_FEATURES.md`: backlog preservation.
- specs: contracts and invariants.
- historical docs: completed execution criteria.

## Refactoring criteria

Refactor when:

- an existing boundary is violated.
- a subsystem is doing more than one role.
- duplicate config surfaces exist.
- tests are forced to know internal details.
- future planned work is blocked by current shape.

Do not refactor merely because code looks different than preferred style if it is stable, tested, and correctly bounded.

## AI co-engineering criteria

ChatGPT is best used for:

- architecture.
- phase planning.
- implementation intents.
- reviewing Cursor summaries.
- docs synthesis.
- debugging root-cause analysis.
- deciding boundaries.

Cursor is best used for:

- code edits.
- narrow multi-file implementation.
- test updates.
- local source inspection.
- mechanical refactors.
- applying documented rules.

Never let Cursor invent new product architecture without first grounding it in docs or an explicit plan.

## Failure signals

Stop and reassess if:

- backend starts inspecting high-level config.
- a display-mode change moves canonical time.
- a map family id is replaced by a concrete raster path in config.
- scene and chrome responsibilities blur.
- tests require broad snapshots for small logic changes.
- one phase starts editing unrelated subsystems.
- docs and code disagree on source of truth.
