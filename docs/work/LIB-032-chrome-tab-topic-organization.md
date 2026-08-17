# LIB-032 — Chrome tab topic organization

| Field | Value |
|-------|-------|
| ID | LIB-032 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release.

## Objective

Give the Chrome configuration tab one coherent topic-based navigation model: a single sticky Chrome-topic selector and focused subpanels, matching Layers, without changing configuration behaviour, defaults, persistence, panel size, or the six top-level tabs.

## Scope

**In scope**

- UI-only Chrome topic selector (not persisted).
- Relocate existing Chrome controls into: Reference & clock, Bottom HUD, Hour indicators, Tick tape, NATO time zones.
- Default topic: Reference & clock. Inactive topics unmount, matching Layers.
- Remove the redundant Chrome-area selector that only switched Hour indicators / Tick tape / NATO.
- Sticky compact selector inside `.config-tab-panel`; topic-change scroll-to-top; ordinary edits do not reset scroll.
- Small shared presentation primitive for Layers/Chrome topic nav if it stays a thin wrapper.
- Tests, IMPLEMENTATION §11, STATE, DEVELOPMENT_LOG, this completion record.
- Note Layers + Chrome progress on FUTURE_FEATURES “improved settings organization” without claiming all organization is finished.

**Out of scope**

- Search/filter, undo/redo, export/import, presets redesign, layer drag/drop, opacity controls, Geography/Chrome merging.
- Moving Geography meridian controls into Chrome.
- Moving General product/config fonts into Chrome.
- New HUD, hour-marker, tick-tape, or NATO options.
- Config schema, persistence, defaults, normalization, RenderPlan, or `updateConfig` for topic navigation.
- Pins, Geography, Data, General redesign.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics stay upstream of `RenderPlan`; this is panel layout only.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) §7 and §11 — `updateConfig` → `commitWorkingV2Update` remains the only mutation path. Topic navigation stays outside it.

## Acceptance criteria

- Six top-level config tabs unchanged; panel width/height tokens unchanged.
- Chrome has one unified topic selector; the old Chrome-area selector is gone.
- Topics in order: Reference & clock, Bottom HUD, Hour indicators, Tick tape, NATO time zones.
- Default topic is Reference & clock.
- Every previously exposed Chrome control remains reachable in a topic; same labels and `updateConfig` paths.
- Switching topics does not mutate config or call `updateConfig`.
- Compact selector is sticky; heading/help copy are not.
- Topic change resets the Chrome tab scroller to the top; ordinary setting edits do not.
- No second scrollbar; no horizontal overflow in the current narrow panel.
- Geography, Pins, Data, General, and Layers topic behaviour unchanged.
- Type-check, full test suite, and production build pass.
- Visual verification: Config panel Chrome topics on `?scenario=baseline`.

## Verification plan

- Focused tests: `ChromeTab.test.tsx`, `LayersTab.test.tsx`, `App.configPhase3.test.tsx`, `ConfigShell.test.tsx`
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — broader Chrome rearrangement than LIB-031
- Visual verification: required — Cursor Browser, Config → Chrome topics, sticky nav, topic-switch scroll; then Layers sticky still works

## Documentation impact

- This work item
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) §11
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — only “improved settings organization”
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)

## Completion record

**Implementation summary**

Chrome tab now uses one UI-only topic selector (not persisted), sharing Layers’ sticky `.config-topic-nav` wrapper and native `ConfigTopicSelector`. Default topic is Reference & clock. Bottom HUD, Hour indicators, Tick tape, and NATO time zones unmount when inactive. The old three-option Chrome-area selector is gone. Same `updateConfig` paths, labels, and defaults. Other tabs unchanged. Panel CSS width token remains `min(22rem, 40vw)`.

**Commands run**

- Baseline before implementation: `npx tsc --noEmit`; `npm test` (206 files / 1970 passed)
- `npx vitest run src/components/config/ChromeTab.test.tsx src/components/config/LayersTab.test.tsx src/components/config/ConfigShell.test.tsx src/App.configPhase3.test.tsx src/components/config/HourMarkersEditor.test.tsx --reporter=dot`
- `npx vitest run src/App.configPhase3MutationsGuard.test.tsx src/App.configPhase3.test.tsx src/components/config/ChromeTab.test.tsx --reporter=dot`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

**Actual results**

- Focused (first pass): 5 files / 126 passed
- Focused after mutations-guard topic select: 3 files / 81 passed
- Type-check: clean
- Full suite: 206 files / 1970 passed / 0 failed
- Build: succeeded (`dist/` has no `scenario` string)

**Visual verification**

Cursor Browser, `http://localhost:1420/?scenario=baseline`. Viewport limitation: Cursor pane 703×769 CSS (not 1920×1080). Config open, Chrome selected.

- Default Chrome topic: Reference & clock; heading Instrument chrome + hint visible; selector in normal flow (nav top 323px vs heading 135px); hour-label / civil zone / Knoxville meridian controls mounted; HUD/hour/tick/NATO editors unmounted; no `chrome-major-area-select`.
- Bottom HUD: opens at `scrollTop` 0; visibility/date/time/seconds/size/font present.
- Hour indicators, scroll 682px of 1333: heading offscreen (top −547); `.config-topic-nav` pinned at panel top (gap 0); native select fully visible; not overlapping the panel scrollbar (`clientWidth` 266 vs `offsetWidth` 281; selectRight 658 vs panelRight 689). Only one `overflow: auto` descendant (the tab panel). Size edit 1.25→1.3 did not change `scrollTop`; restored to 1.25.
- Topic switch Hour indicators → Tick tape: `scrollTop` 0, heading visible, tick-tape editor mounted. NATO editor then Reference & clock restored hour format `local12`, zone `system`, city Knoxville.
- Canvas `toDataURL` length 1835394 unchanged after topic navigation; `localStorage` working-v2 remains null (scenario persistence isolated). Shell width 281.29px (`min(22rem, 40vw)` at this viewport). Six top-level tabs unchanged. Labels readable at ~281px; no horizontal overflow (`scrollWidth` = `clientWidth` 266).
- Layers afterward: Advanced, scroll 1812px; `.config-topic-nav` pinned (gap 0); heading offscreen; one panel scrollbar. `aria-label="Chrome topic"` / `aria-label="Layers topic"` preserved.

**Not verified**

- 1920×1080 canonical viewport (Cursor pane smaller; 22rem / ~352px panel width not realized here; 40vw case was).
- OS-native `<select>` open menu pixels (Chromium paints that UI outside the page; closed control remained unclipped).
- Persistence across a real browser reload (DEV scenario isolates `localStorage`; unit tests cover `commitWorkingV2Update`).
- Pins, Geography, Data, and General interiors beyond confirming the six tab labels and that those files were not edited.

**Discovered, not done**

None. Search/filter, undo/redo, export/import, presets redesign, layer drag/drop, opacity controls, and Geography/Chrome merging remain FUTURE_FEATURES candidates.
