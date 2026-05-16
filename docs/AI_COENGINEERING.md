# AI Co-engineering

## Purpose

This document defines how Libration uses ChatGPT and Cursor together.

The goal is to preserve architectural intent while still benefiting from fast AI-assisted implementation.

## Tool roles

### ChatGPT role

Use ChatGPT for:

- architecture design.
- strategy.
- phase planning.
- writing Cursor implementation intents.
- reviewing summaries.
- debugging root causes.
- documentation synthesis.
- deciding whether a proposed implementation fits the product.

### Cursor role

Use Cursor for:

- local source inspection.
- multi-file code edits.
- test updates.
- mechanical refactors.
- file moves.
- implementation of phase-scoped tasks.
- applying project rules to the codebase.

Cursor should not independently invent major architecture. It should implement plans grounded in docs or explicit prompts.

## Planetary illumination and composition (agent guidance)

The upstream planetary illumination path is **production-complete** for twilight (including a **shipped incremental non-emissive twilight transition tuning** pass in `illuminationShading.ts`—anchor coupling, tint cap, day-side envelope; constants-only, one `rasterPatch`), moonlight, and emissive night lights (catalog, sampling, policy tables, Layers controls, illustrative defaults, single `rasterPatch`). **Composition-aware overlay readability** (v1 + v1.1 + **derived substrate lift scale** + **persisted** `scene.overlayReadability.presentation` (`readabilityVeilScale01`, `overlayLiftMultiplier01`) + **six shipped default-stack `perLayer` keys** — `grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`; identity-only subtrees omitted on normalize; canonical list `SCENE_OVERLAY_READABILITY_PER_LAYER_PILOT_KEYS` in `src/config/v2/sceneConfig.ts`) is **shipped** and documented as a **closed phase** in `PLAN.md` / `ARCHITECTURE.md` (derived solar night veil, emissive **policy-only** legibility pressure, presentation/catalog substrate lift including the **shipped seven-intrinsic** optional catalog hints **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** and **sub-1 brightness** dimming, user scalars applied in the shell before hints; one `OverlayReadabilityFrame` per tick on `TimeContext` when the shell attaches it). **Do not** treat emissive composition or the settled overlay readability stack as future MVP work or propose a new “compositor” boundary inside the backend.

For new work in this area:

- read `ARCHITECTURE.md` (subsystem section), `PLAN.md` Slice 2, and `docs/ROADMAP.md` Phase 6 / Phase 9.
- assume **SceneConfig remains authoritative** and **RenderPlan + execution-only backend** remain intact.
- prefer **incremental** features (e.g. **`perLayer` pilots for new stack rows** beyond the six shipped defaults; **further** catalog/resolver substrate heuristics **beyond** the shipped seven intrinsics (`reliefShaded` … `etchedReliefDense`); **further** atmospheric refinement **after** the shipped twilight tuning increment; optional future SceneConfig twilight softness) over reopening settled composition architecture.
- ground behavior changes in tests at normalization, resolver, illumination sampling, or RenderPlan boundaries—not in Canvas policy branches.

## Standard co-engineering loop

1. Discuss product or architecture with ChatGPT.
2. Convert the decision into a narrow Cursor implementation intent.
3. Let Cursor inspect source and implement.
4. Run tests locally.
5. Bring Cursor's summary, failures, or diffs back to ChatGPT when needed.
6. Update docs and rules when the architecture changes.
7. Commit per coherent slice.

## Cursor prompt approval header

Use this boilerplate for implementation intents:

```text
APPROVAL HEADER:
You are approved to make coordinated multi-file edits for this phase.
You are approved to create lifecycle/support files needed by this phase.
You are approved to split files when that improves architecture or maintainability.
Do not ask for confirmation before making those edits.
```

Skip artificial lifecycle splitting for installer-only or one-shot tasks where no meaningful lifecycle exists.

## Implementation intent shape

```text
APPROVAL HEADER:
...

We are continuing Libration development.

Required reading:
- README.md
- ARCHITECTURE.md
- PLAN.md
- AGENTS.md
- docs/DEVELOPMENT_STRATEGY.md
- relevant specs

Task:
<one narrow objective>

Architecture constraints:
- preserve RenderPlan boundary
- keep backend product-semantics-free
- keep SceneConfig authoritative
- preserve canonical time model
- update tests
- update docs if behavior changes

Implementation guidance:
<specific steps or acceptable freedom>

Success criteria:
<observable outcomes>

Return:
- files changed
- summary
- tests run
- tests not run
- risks/follow-up
```

## Good Cursor task examples

Good:

- Add a new map catalog validation test.
- Move historical docs under `docs/historical` and update links.
- Add selector copy for month-aware map families.
- Implement a narrow resolver fix with regression tests.
- Extract a component without changing behavior.
- Add one layer type behind existing SceneConfig boundaries.

Bad:

- Redesign the entire scene system while adding a map.
- Make backend decide which map to display.
- Add new config fields and derive behavior from old fields too.
- Implement live weather directly inside render.
- Fix tests by weakening assertions with no root cause.
- Add a visual feature without docs or tests.

## Review expectations

Cursor summaries should include:

- changed files.
- root cause if fixing a bug.
- behavior changed.
- tests added.
- tests run.
- known risks.
- follow-up work.

If a summary says "complete" but does not include tests, treat it as incomplete until verified.

## When to stop and ask ChatGPT

Stop when:

- the correct architectural boundary is unclear.
- a config migration affects persisted user data.
- a backend change seems to need product knowledge.
- a test failure reveals a mismatch between docs and source.
- Cursor proposes broad refactors outside the task.
- two sources of truth appear to exist.
- a planned future feature needs a new model rather than a patch.

## Documentation maintenance with AI

When a phase changes architecture:

- update durable docs.
- update specs if contracts changed.
- update roadmap phase status.
- update future feature inventory if an idea is deferred.
- update `docs/AI_COENGINEERING.md` when illumination or overlay-readability shipped scope changes (agent guidance must match runtime).
- update Cursor rules if the mistake is likely to recur.

Do not rely on chat history as project memory. Important decisions belong in repo docs.
