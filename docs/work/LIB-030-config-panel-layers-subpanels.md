# LIB-030 — Config panel Layers tab subpanels

| Field | Value |
|-------|-------|
| ID | LIB-030 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release.

## Objective

Reorganize the Layers configuration tab into Chrome-style topic subpanels so unrelated controls are no longer one long scroll, without changing configuration behaviour, defaults, persistence, or rendering.

## Scope

**In scope**

- UI-only Layers topic selector (not persisted).
- Relocate existing Layers controls into: Layer masters, Map, Illumination, Eclipse, Moon & libration, Astronomy paths, Advanced.
- Default topic: Layer masters. Inactive topics unmount, matching Chrome.
- Tests, IMPLEMENTATION §11, STATE, DEVELOPMENT_LOG, this completion record.
- Mark FUTURE_FEATURES “improved settings organization” as satisfied for this Layers organization; leave other QoL backlog items untouched.

**Out of scope**

- Search/filter, undo/redo, export/import, presets redesign, layer drag/drop, opacity controls, Geography/Chrome merging.
- Renaming settings, new options, schema-driven settings, config model changes.
- Pins, Chrome, Geography, Data, General redesign.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics stay upstream of `RenderPlan`; this is panel layout only.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) §7 and §11 — `updateConfig` → `commitWorkingV2Update` remains the only mutation path.

## Acceptance criteria

- Six top-level config tabs unchanged; panel width/height tokens unchanged.
- Layers default topic is Layer masters (layer enable checkboxes).
- Every previously exposed Layers control remains reachable in a topic; same labels and `updateConfig` paths.
- Switching topics does not mutate config.
- Type-check and full test suite pass.
- Visual verification: Config panel Layers topics only; scene rendering unchanged.

## Verification plan

- Focused tests: `LayersTab.test.tsx`, `App.configPhase3.test.tsx` Layers cases
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: no — UI-only, no bundling/entry change
- Visual verification: required — Cursor Browser, Config panel open, Layers topics

## Documentation impact

- This work item
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) §11
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — only “improved settings organization”
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)

## Completion record

**Implementation summary**

Layers tab now uses a Chrome-style UI-only topic selector (not persisted). Default topic is Layer masters (the 15 enable checkboxes). Map, Illumination, Eclipse (`EclipseSystemSection` relocated unchanged), Moon & libration, Astronomy paths, and Advanced (overlay-readability pilots) unmount when inactive. Same `updateConfig` paths, labels, and defaults. Other tabs unchanged. Panel CSS width token remains `min(22rem, 40vw)`.

**Commands run**

- `npx vitest run src/components/config/LayersTab.test.tsx src/App.configPhase3.test.tsx src/components/config/ConfigShell.test.tsx src/components/config/BaseMapStyleControl.test.tsx --reporter=dot`
- `npx tsc --noEmit`
- `npm test`

**Actual results**

- Focused: 4 files / 90 passed
- Type-check: clean
- Full suite: 206 files / 1968 passed / 0 failed

**Visual verification**

Cursor Browser, `http://localhost:1420/?scenario=baseline`. Viewport limitation: Cursor pane ~703×769 CSS (not 1920×1080). Config open, Layers selected.

- Default Layers topic: Layer masters; 15 layer checkboxes; no Map style / Event information / libration color.
- Topic select Map: Map style + preview + brightness/contrast/gamma/saturation; masters unmounted.
- Topic select Eclipse: existing Eclipse System controls (event information, solar/lunar, alignment, appearance); masters and Map unmounted.
- CDP cycle Illumination / Moon & libration / Astronomy paths / Advanced: only the matching controls mounted (`Moonlight appearance`, `Libration color`, `Lunar ground track past color`, overlay veil). Returning to Layer masters restores Solar eclipses and hides Map style.
- Panel computed width stayed 281.29px (`min(22rem, 40vw)` at this viewport). Six top-level tabs unchanged. Scene map/chrome unchanged aside from the panel layout.

**Not verified**

- 1920×1080 canonical viewport (Cursor pane smaller).
- Persistence across a real browser reload (DEV scenario isolates `localStorage`; unit tests cover `commitWorkingV2Update`).
- `npm run build` (UI-only; not required).

**Discovered, not done**

None. Search/filter, undo/redo, export/import, presets redesign, layer drag/drop, opacity controls, and Geography/Chrome merging remain FUTURE_FEATURES candidates.
