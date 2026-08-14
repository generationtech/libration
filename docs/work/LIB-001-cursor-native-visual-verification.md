# LIB-001 — Cursor-native visual verification

| Field | Value |
|-------|-------|
| ID | LIB-001 |
| Status | blocked |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (modernization M4, authorized at program level) |
| Completed | |

Human-authorized modernization stage M4. Implementation of the scenario mechanism and documentation is in place. The item is **blocked** on Cursor Browser inspection, which this agent session could not perform.

## Objective

Establish a Cursor-native way to verify visual changes against the running application: a written verification workflow, and a narrow development-only `?scenario=<id>` mechanism that can open the app in a known visual state.

## Scope

**In scope**

- Create `docs/VISUAL_VERIFICATION.md` (canonical viewport, inspection checklist, evidence format).
- Implement a development-only `?scenario=<id>` startup seed, tree-shaken from production (`import.meta.env.DEV`).
- A small scenario registry that produces a normalized `LibrationConfigV2` from defaults plus overrides.
- Bypass `localStorage` for both startup resolution and persistence while a scenario is active, so scenario sessions do not overwrite the user’s saved configuration.
- Four canonical scenarios: `baseline`, `terminator`, `night`, `readability`. Cap the set; adding scenarios later requires a work item.
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
- Hard containment: DEV-only; no renderer knowledge; no persisted scenario id; production builds must not include the registry.

## Acceptance criteria

- `docs/VISUAL_VERIFICATION.md` exists and a fresh agent can follow it.
- In the Vite dev server, `?scenario=<id>` opens a documented visual state without using the user’s `localStorage` document.
- Production / non-DEV builds do not expose the scenario mechanism.
- Editing config during a scenario session does not write `libration.workingConfigV2.v1`.
- The initial scenario set is documented, capped, and covered by tests at the seed boundary.
- `AGENTS.md` points visual work at `docs/VISUAL_VERIFICATION.md` without a broken link.
- Canonical scenarios were actually inspected in Cursor’s built-in browser at (or as close as possible to) 1920×1080 CSS pixels.

## Verification plan

- Focused tests: startup seed, persistence suppression, DEV-only guard.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — the change touches an application entry path and must confirm production tree-shaking.
- Visual verification: follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md); inspect all four canonical scenarios plus ordinary startup.

## Documentation impact

- `docs/VISUAL_VERIFICATION.md` (create)
- `AGENTS.md` (visual reading path)
- `docs/WORKFLOW.md` and `docs/work/TEMPLATE.md` (activate visual evidence)
- `docs/IMPLEMENTATION.md` §2 (DEV-only startup branch)
- `docs/STATE.md` and `docs/DEVELOPMENT_LOG.md` on completion

## Blocker

Cursor’s built-in Agent Browser (`cursor-ide-browser` MCP: `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`) is **not available in this agent session**. `GetMcpTools` returned no MCP servers; calling `browser_navigate` failed with “MCP server does not exist: cursor-ide-browser.”

M4 requires that those tools actually inspect the four canonical scenarios. HTML fetch of `http://localhost:1420/?scenario=baseline` only proves the Vite shell (`#root`); the canvas scene and scenario banner are client-rendered and were not visually inspected.

**Resume:** in a local Agent chat with **Settings → Tools & MCP → Browser Automation → Browser Tab** enabled, inspect:

1. `http://localhost:1420/?scenario=baseline`
2. `http://localhost:1420/?scenario=terminator`
3. `http://localhost:1420/?scenario=night`
4. `http://localhost:1420/?scenario=readability`
5. Reload at least one scenario
6. `http://localhost:1420/` without `?scenario=`

Use 1920×1080 CSS pixels if the browser can be sized; otherwise report the achieved viewport. Then complete this item. Do not start M5 until this item is `complete`.

## Completion record

**Implementation summary**

DEV-only `?scenario=<id>` is applied once from `src/main.tsx` before mount. `src/dev/visualScenarios.ts` resolves a named fixture to a normalized `LibrationConfigV2` plus paused demo time. `src/App.tsx` seeds ordinary `resolveStartupWorkingV2(null, …)` and `createPausedDemoPlaybackState`. `persistWorkingV2` is a no-op while a scenario is applied. Unknown ids fail visibly and do not substitute another scenario. Canonical scenarios: `baseline`, `terminator`, `night`, `readability`. Procedure: `docs/VISUAL_VERIFICATION.md`.

**Commands run**

- `npx vitest run src/dev/visualScenarios.test.ts src/config/v2/workingV2Persistence.test.ts src/app/demoPlayback.test.ts` — 38 passed
- `npx tsc --noEmit` — clean
- `npm test` — 1 failed / 1494 passed / 163 files (same known M5 failure)
- `npm run build` — succeeded; production JS/CSS contain no scenario registry, banner copy, or `visual-scenario-banner` rules
- `curl http://localhost:1420/?scenario=baseline` — HTTP 200 Vite shell only (not visual inspection)

**Actual results**

Known pre-existing failure unchanged: `src/App.configPhase2.test.ts` / `src/renderer/dlu1VisibilityRenderReadiness.test.ts:23`. No new test failure. Production bundle omits `src/dev/visualScenarios.ts`.

**Visual verification**

Not performed. Cursor built-in browser MCP was not available in this session. Dev server was running at `http://localhost:1420/` (HMR picked up the new modules).

**Not verified**

- Actual rendered output of the four canonical scenarios
- Viewport 1920×1080 CSS pixels
- Reload repeatability in a browser
- Normal-mode visual regression after scenario use
- Interactive persistence isolation in a live browser (unit tests cover the persistence boundary)

**Discovered, not done**

- Cursor Browser Automation is not enabled (or not exposed) in this agent session; required for M4 completion
- Production CSS previously included unused banner rules when they lived in `App.css`; moved to `src/dev/visualScenarioBanner.css` imported only from the DEV registry
- Pre-existing M5 items unchanged (test glob, Data-tab copy, package name, `index.html` title, scratch files)
