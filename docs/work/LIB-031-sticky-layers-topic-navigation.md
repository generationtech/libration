# LIB-031 — Sticky Layers topic navigation

| Field | Value |
|-------|-------|
| ID | LIB-031 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release.

## Objective

Keep the compact Layers topic selector visible while scrolling a topic’s settings, and reset the Layers tab scroller to the top when the topic changes, without changing configuration behaviour.

## Scope

**In scope**

- Sticky CSS for the compact Layers topic selector inside the existing `.config-tab-panel` scroller.
- UI-only scroll-to-top when the Layers topic changes.
- Focused tests, visual verification, STATE, DEVELOPMENT_LOG, IMPLEMENTATION §11 if it already describes topic navigation, this completion record.

**Out of scope**

- Search/filter, undo/redo, export/import, presets redesign, layer drag/drop, opacity controls, Geography/Chrome merging.
- Pins, Chrome, Geography, Data, General redesign.
- Config schema, persistence, defaults, normalization, RenderPlan, or `updateConfig` for topic navigation.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics stay upstream of `RenderPlan`; this is panel layout only.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) §7 and §11 — `updateConfig` → `commitWorkingV2Update` remains the only mutation path. Topic navigation stays outside it.

## Acceptance criteria

- Layers topic selector remains visible while scrolling topic settings.
- Scene layers heading and explanatory copy are not sticky.
- Selector sticks inside the existing tab scroller, not the browser viewport.
- Config panel size unchanged; no second scrollbar.
- Native topic dropdown remains usable while sticky.
- Topic switching remains UI-only and does not write config.
- Topic change resets the Layers tab content scroll to the top; ordinary setting edits do not.
- Layer masters remains the default topic; topic order unchanged.
- Other config tabs unchanged.
- Type-check and full test suite pass.
- Visual verification on `?scenario=baseline` Config → Layers.

## Verification plan

- Focused tests: `LayersTab.test.tsx`, `App.configPhase3.test.tsx` Layers cases
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: no — UI-only, no bundling/entry change
- Visual verification: required — Cursor Browser, Config panel Layers sticky selector and topic-switch scroll

## Documentation impact

- This work item
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) §11 — only the Layers topic navigation sentence
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — do not touch

## Completion record

**Implementation summary**

The compact Layers topic selector (label + native `<select>`) is wrapped in `.layers-topic-nav` with `position: sticky; top: calc(-1 * var(--config-shell-space-lg, 1rem))` so it pins inside the existing `.config-tab-panel` scroller, covering the panel’s 1rem padding strip. Heading and explanatory copy stay in normal flow. On `layersTopic` change, `useLayoutEffect` sets that panel’s `scrollTop` to 0. Topic state remains React `useState` only; `updateConfig` is unused for navigation. Other tabs unchanged. Panel width token remains `min(22rem, 40vw)`.

**Commands run**

- `npx vitest run src/components/config/LayersTab.test.tsx src/App.configPhase3.test.tsx src/components/config/ConfigShell.test.tsx --reporter=dot`
- `npx tsc --noEmit`
- `npm test`

**Actual results**

- Focused: 3 files / 79 passed
- Type-check: clean
- Full suite: 206 files / 1970 passed / 0 failed

**Visual verification**

Cursor Browser, `http://localhost:1420/?scenario=baseline`. Viewport limitation: Cursor pane 703×769 CSS (not 1920×1080). Config open, Layers selected.

- Default topic Layer masters; heading and hint visible; selector in normal flow (nav top 299px vs heading 135px); no extra sticky offset.
- Advanced, scroll 1812px: heading offscreen (top −1677); `.layers-topic-nav` pinned at panel top (gap 0); no topic-control peeking in the padding strip; native select fully visible; not overlapping the panel scrollbar (`clientWidth` 266 vs `offsetWidth` 281).
- Eclipse, scroll 2582px: selector remains under the tab strip with appearance controls (live line/band colors) in the body; one panel scrollbar.
- Topic switch Advanced → Moon & libration and Moon → Eclipse: `scrollTop` 0, heading visible, new topic mounted at top. Canvas `toDataURL` length unchanged; `localStorage` working-v2 value unchanged (scenario persistence isolated). Setting `Moon size` while scrolled did not reset `scrollTop`.
- Chrome major-area row remains `position: static`. Six top-level tabs unchanged. Shell width 281.29px (`min(22rem, 40vw)` at this viewport). `aria-label="Layers topic"` preserved; select focused after click while sticky.
- Native `showPicker()` requires a user gesture; OS dropdown list is not in the DOM snapshot. Closed control remained unclipped (`overflow: visible` on the sticky wrapper).

**Not verified**

- 1920×1080 canonical viewport (Cursor pane smaller; 22rem / ~352px panel width not realized here; 40vw case was).
- OS-native `<select>` open menu pixels (Chromium paints that UI outside the page; not captured in Cursor Browser screenshots).
- Persistence across a real browser reload (DEV scenario isolates `localStorage`; unit tests cover `commitWorkingV2Update`).
- `npm run build` (UI-only; not required).

**Discovered, not done**

None. Search/filter, undo/redo, export/import, presets redesign, layer drag/drop, opacity controls, and Geography/Chrome merging remain FUTURE_FEATURES candidates.
