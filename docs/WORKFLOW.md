# Development workflow

This document owns how Libration work is defined, executed, verified, and closed.

Current development state lives only in [`docs/STATE.md`](STATE.md). This file does not track what is active.

The workflow supports both external design followed by in-editor implementation, and in-editor planning followed by implementation. Chat history is not project memory.

## Work items

Work lives in `docs/work/LIB-###-slug.md`, using a single ascending identifier sequence (`LIB-001`, `LIB-002`, …). Copy [`docs/work/TEMPLATE.md`](work/TEMPLATE.md).

### Lifecycle

```
proposed → approved → active → complete
```

Also valid: `blocked`, `abandoned`.

| Transition | Who |
|------------|-----|
| create `proposed` | Human, or an agent when instructed or when capturing a follow-up |
| `proposed` → `approved` | **Human only.** Agents never approve their own work. |
| `approved` → `active` | Agent or human, following activation below |
| `active` → `complete` | Agent or human, after the definition of done |
| `active` → `blocked` | Agent or human, when progress cannot continue |
| any → `abandoned` | Human |

Exactly one work item is `active` at a time unless a human explicitly changes that policy.

### Activation

When an approved item is selected:

1. Set its status to `active`.
2. Point `docs/STATE.md` at it.
3. Do only its authorized scope.

If several approved items exist, activate the **lowest identifier** unless `STATE.md` or a human names another.

Do not automatically activate the next item after completion unless this workflow still calls for it **and** an approved item exists.

### No approved work

If nothing is `active` or `approved`:

- `docs/STATE.md` status is **AWAITING SCOPE**.
- Stop. Do not start speculative work from [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md) or invent a product task.
- An agent may suggest or draft a `proposed` item. It must not start that item.

This is a normal, valid state.

### Scope control

The active work item owns its scope.

Discovered work is recorded under **Discovered, not done** on that item. Optionally convert it into a new `proposed` item or a [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md) entry. Never silently absorb it into the active task.

## `docs/STATE.md`

A snapshot, not a log. Ordinary size is about 40 lines.

It owns: overall status, the active item, the last completed item, blockers, known failing verification, awaiting-human-decision, and the exact next action.

Statuses:

| Status | Meaning |
|--------|---------|
| `ACTIVE` | A work item is being executed |
| `BLOCKED` | Work cannot proceed |
| `READY` | Approved work exists; none is active |
| `AWAITING SCOPE` | No approved or active item |

Never append history, embed the roadmap, duplicate architecture, or list completed work here.

## Definition of done

Required for every work item:

1. `npx tsc --noEmit`
2. Full test suite (`npm test`) before completion
3. `docs/STATE.md` update
4. Work-item completion record with actual evidence
5. Concise [`docs/DEVELOPMENT_LOG.md`](DEVELOPMENT_LOG.md) append

### Focused tests

Run the narrowest relevant tests while implementing. They are iteration aids, not a substitute for the completion suite.

### Build

Run `npm run build` when the change touches build configuration, dependencies, application entry points, `index.html`, the asset pipeline, or anything else where bundling behaviour is materially relevant. Do not require it for documentation-only changes.

### Visual verification

If a work item can alter rendered output, it cannot be completed without the visual-verification process once `docs/VISUAL_VERIFICATION.md` exists. That file is created by [`LIB-001`](work/LIB-001-cursor-native-visual-verification.md) (modernization M4). Until then, record visual impact under **Not verified** rather than inventing a process.

### Documentation

Update only the authoritative document whose durable truth actually changed. Do not synchronize a ledger across many files.

## Evidence

Completion records must include commands actually run, actual result summaries, visual evidence when applicable, and a **Not verified** line.

1. “Expected to pass” is not “passed.”
2. If a command was not run, say so.
3. Record the actual meaningful summary output.
4. Never hide a pre-existing failure.
5. Never classify a new failure as pre-existing without evidence.

A summary that says “complete” without this evidence is incomplete.

## Known-failure ratchet

Known failures are enumerated in `docs/STATE.md`. Each tolerated failure must already be approved or known, with an owning proposed/approved remediation item **or** a named later modernization stage.

- The list may shrink.
- The list may not grow without explicit human approval.
- A work item that introduces a new unenumerated failure is not complete.

## Completion transaction

1. Satisfy the item’s acceptance criteria.
2. Run required verification.
3. Fill the completion record with actual evidence.
4. Set the work item to `complete`.
5. Update `docs/STATE.md`.
6. Append a short `docs/DEVELOPMENT_LOG.md` entry.
7. Update any owning durable document whose truth changed.
8. Stop.

## When to stop

Stop and ask when: the architectural boundary is unclear; persisted user configuration would change; a backend change appears to need product knowledge; docs and source disagree; two sources of truth appear; the work needs a new model rather than a patch; or there is no approved item.
