# LIB-001 — Cursor-native visual verification

| Field | Value |
|-------|-------|
| ID | LIB-001 |
| Status | complete |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (modernization M4, authorized at program level) |
| Completed | 2026-08-14 |

Human-authorized modernization stage M4. Complete.

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

## Completion record

**Implementation summary**

DEV-only `?scenario=<id>` is applied once from `src/main.tsx` before mount. `src/dev/visualScenarios.ts` resolves a named fixture to a normalized `LibrationConfigV2` plus paused demo time. `src/App.tsx` seeds ordinary `resolveStartupWorkingV2(null, …)` and `createPausedDemoPlaybackState`. `persistWorkingV2` is a no-op while a scenario is applied. Unknown ids fail visibly and do not substitute another scenario. Canonical scenarios: `baseline`, `terminator`, `night`, `readability`. During visual inspection the `night` UTC was corrected from `18:00` to `06:00` so the Americas are actually in night. Procedure: `docs/VISUAL_VERIFICATION.md`.

**Commands run**

- `npx vitest run src/dev/visualScenarios.test.ts src/config/v2/workingV2Persistence.test.ts src/app/demoPlayback.test.ts` — 38 passed
- `npx tsc --noEmit` — clean
- `npm test` — 1 failed / 1494 passed / 163 files (same known M5 failure)
- `npm run build` — succeeded; production JS/CSS contain no scenario registry, banner copy, or `visual-scenario-banner` rules

**Actual results**

Known pre-existing failure unchanged: `src/App.configPhase2.test.ts` / `src/renderer/dlu1VisibilityRenderReadiness.test.ts:23`. No new test failure. Production bundle omits `src/dev/visualScenarios.ts`.

**Visual verification**

Browser: Cursor in-editor Browser (`cursor-ide-browser`), tab `90d956`.

Viewport: CDP `Emulation.setDeviceMetricsOverride` set `window.innerWidth`×`innerHeight` to **1920×1080**. The webview pane’s canvas client size remained ~673×770 CSS pixels; screenshots show that pane (often a North-America crop of the equirectangular scene). Exact physical 1920×1080 paint was **not** achieved.

Visual verification:
- Scenario: baseline
- Viewport: JS 1920×1080; canvas client ~673×770
- Browser: Cursor built-in browser
- Inspected: banner `scenario: baseline · 2030-06-15T12:00:00.000Z · persistence isolated`; satellite substrate; top hour/NATO chrome; bottom HUD June 15 2030 / 8:00:00 AM; grid; city pins (LA 5:00:00 AM, Knoxville/NY 8:00:00 AM); terminator; Config launcher
- Result: PASS
- Observations: no unexpected clipping of chrome vs scene; city labels legible; frozen UTC represented in pin times and HUD

Visual verification:
- Scenario: terminator
- Viewport: same as above
- Browser: Cursor built-in browser
- Inspected: banner `scenario: terminator · 2026-03-20T12:00:00.000Z · persistence isolated`; solar day/night split through North America; twilight gradient; grid; city times still 5:00/8:00 AM at 12:00 UTC; chrome/scene layout
- Result: PASS
- Observations: terminator visible as a soft vertical night/day boundary; no seam break in the inspected crop; chrome reserved space intact

Visual verification:
- Scenario: night (after UTC correction)
- Viewport: same as above
- Browser: Cursor built-in browser
- Inspected: banner `scenario: night · 2026-12-21T06:00:00.000Z · persistence isolated`; dark-side Americas; yellow urban emissive lights; city times LA 10:00:00 PM / Knoxville & NY 1:00:00 AM; grid; chrome
- Result: PASS after correction
- Observations: first inspection at 18:00 UTC showed Americas in afternoon daylight (LA 10:00 AM / NY 1:00 PM), which did not meet the scenario’s night-side purpose. UTC changed to 06:00. Reinspection showed dark land, city lights, and night civil times.

Visual verification:
- Scenario: readability
- Viewport: same as above
- Browser: Cursor built-in browser
- Inspected: banner `scenario: readability · 2026-06-21T12:00:00.000Z · persistence isolated`; Köppen chromatic substrate (distinct color blocks, not satellite); grid; city pins with contrast treatment over yellow/green/blue fills; terminator on the west coast; chrome
- Result: PASS
- Observations: labels remained readable over the dense climate coloring; no clipping of chrome; analemma/subsolar not confirmed in the North-America-centered crop

Reload/repeatability (`baseline`): navigating again to `?scenario=baseline` returned the same banner, UTC, satellite substrate, and frozen 5:00/8:00 AM pin times. Persisted ordinary political map did not replace it.

Invalid ID `?scenario=does-not-exist`: yellow banner `unknown scenario “does-not-exist” — ordinary startup; the requested scenario was not applied`; live wall-clock pin times (~4:34 PM LA); no `data-visual-scenario` id; did not masquerade as another named scenario.

Persistence isolation (live):
1. Ordinary `http://localhost:1420/` had no banner; map style was World (legacy, shaded).
2. Changed Map style to World political; reload ordinary still showed tan political land and city lights (live ~4:36 PM).
3. `?scenario=baseline` showed satellite legacy map and frozen 2030-06-15 12:00 UTC, not political.
4. In baseline, changed Map style to World topography.
5. Returned to ordinary `http://localhost:1420/`: still World political (tan land, city lights, live ~4:37 PM); topography did not persist. Config combobox confirmed `World political`.
6. Restored Map style to World (legacy, shaded) so the user’s prior ordinary setting was not left altered.

Normal-mode regression: after all scenario work, `http://localhost:1420/` had no scenario banner, live pin times (~4:38:59 PM), restored satellite/legacy substrate, intact top chrome and grid, Config launcher present.

**Not verified**

- Exact physical 1920×1080 CSS-pixel paint of the webview (JS metrics were overridden; canvas client stayed ~673×770)
- Full-globe framing in screenshots (pane showed a North-America crop of the equirectangular map)
- Analemma and subsolar/sublunar markers in the `readability` crop
- Astronomical precision of terminator geometry beyond qualitative inspection
- Production runtime with `?scenario=` (bundle inspection only)

**Discovered, not done**

- Pre-existing M5 items unchanged (test glob, Data-tab copy, package name, `index.html` title, scratch files)
- Cursor Browser pane does not physically match `Emulation.setDeviceMetricsOverride` canvas layout size
- City-pin labels for nearby cities (Knoxville/New York) can sit close together in the inspected crop; not an M4 defect
