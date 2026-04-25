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
- update Cursor rules if the mistake is likely to recur.

Do not rely on chat history as project memory. Important decisions belong in repo docs.
