# LIB-001 — Cursor-native visual verification

| Field | Value |
|-------|-------|
| ID | LIB-001 |
| Status | approved |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (modernization M4, authorized at program level) |
| Completed | |

Approved modernization stage M4. Do not execute until a human or later intent activates it.

## Objective

Establish a Cursor-native way to verify visual changes against the running application: a written verification workflow, and a narrow development-only `?scenario=<id>` mechanism that can open the app in a known visual state.

## Scope

**In scope**

- Create `docs/VISUAL_VERIFICATION.md` (canonical viewport, inspection checklist, evidence format).
- Implement a development-only `?scenario=<id>` startup seed, tree-shaken from production (`import.meta.env.DEV`).
- A small scenario registry that produces a normalized `LibrationConfigV2` from defaults plus overrides.
- Bypass `localStorage` for both startup resolution and persistence while a scenario is active, so scenario sessions do not overwrite the user’s saved configuration.
- An initial scenario set on the order of: baseline, day-terminator, night-lights, overlays-all, dynamic-offline, substrate-review. Cap the set; adding scenarios later requires a work item.
- Tests at the startup-seed / persistence-suppression boundary.
- Update `AGENTS.md` so visual work requires `docs/VISUAL_VERIFICATION.md`.

**Out of scope**

- Playwright, Puppeteer, MCP, CI, golden-image infrastructure.
- Changing production persistence or renderer behaviour when `?scenario=` is absent.
- Making the Canvas backend, layers, or `RenderPlan` aware of scenarios.
- M5 reconciliation (failing test glob, Data-tab copy, package name, `index.html` title, untracking scratch files).
- Product features unrelated to verification.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one UTC instant per frame; `SceneConfig` authority; no second config source of truth.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) §2 (startup) and §7 (commit / `localStorage`).
- Scenarios are **seeds**: they substitute the existing `resolveStartupWorkingV2` fallback. They are not a parallel configuration model.
- Persistence suppression is a bounded guard in the persistence module, not a new store.
- Hard containment from the M1 design: DEV-only; no renderer knowledge; no persisted scenario id; production builds must not include the registry.

## Acceptance criteria

- `docs/VISUAL_VERIFICATION.md` exists and a fresh agent can follow it.
- In the Vite dev server, `?scenario=<id>` opens a documented visual state without using the user’s `localStorage` document.
- Production / non-DEV builds do not expose the scenario mechanism.
- Editing config during a scenario session does not write `libration.workingConfigV2.v1`.
- The initial scenario set is documented, capped, and covered by tests at the seed boundary.
- `AGENTS.md` points visual work at `docs/VISUAL_VERIFICATION.md` without a broken link.

## Verification plan

- Focused tests: startup seed, persistence suppression, DEV-only guard.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — the change touches an application entry path and must confirm production tree-shaking.
- Visual verification: this item *installs* the process; exercise at least one scenario in the Cursor browser at 1600×900 CSS pixels and record evidence in the completion record.

## Documentation impact

- `docs/VISUAL_VERIFICATION.md` (create)
- `AGENTS.md` (visual reading path)
- `docs/IMPLEMENTATION.md` §2 if startup behaviour gains a documented DEV-only branch
- `docs/STATE.md` and `docs/DEVELOPMENT_LOG.md` on completion

## Completion record

*Not started.*
