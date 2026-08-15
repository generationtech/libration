# Development log

Append-only. One short entry per completed work item. Current state lives in [`docs/STATE.md`](STATE.md); do not duplicate it here.

Do not copy a work item’s full completion record. Do not import pre-modernization history from [`docs/history/`](history/).

## 2026-08-14 — Ratchet initialized

Installed the development ratchet after modernization M0–M2: `docs/STATE.md`, this log, `docs/WORKFLOW.md`, `docs/work/`, and a rewritten `docs/ROADMAP.md`. First work item is approved [`LIB-001`](work/LIB-001-cursor-native-visual-verification.md) (visual verification / M4). M0–M2 were not given LIB identifiers.

Verified: documentation/process checks plus `npx tsc --noEmit` (clean) and `npm test` (pre-existing 1 failed / 1478 passed; see `docs/STATE.md`).

## 2026-08-14 — LIB-001 complete (M4)

Installed Cursor-native visual verification: `docs/VISUAL_VERIFICATION.md`, DEV-only `?scenario=` fixtures (`baseline`, `terminator`, `night`, `readability`), persistence isolation, and workflow/template/AGENTS wiring. Visual inspection used Cursor’s in-editor Browser; `night` UTC was corrected from 18:00 to 06:00 so the Americas are actually in night.

Verified: focused scenario tests 38 passed; `npx tsc --noEmit` clean; `npm test` 1 failed / 1494 passed / 163 files (known M5 glob failure only); `npm run build` succeeded with no scenario registry in production assets.

## 2026-08-14 — LIB-002 complete (M5)

Reconciled deferred modernization defects and established a green verification baseline: renderer v2-import glob no longer scans test files (guard still rejects a synthetic production import), Data-tab live-feed copy corrected, package/`index.html` identity set to Libration, scratch `.staging/` and `.tmp-lc-png` untracked.

Verified: focused boundary+DataTab tests 12 passed; `npx tsc --noEmit` clean; `npm test` 163 files / 1499 passed / 0 failed; `npm run build` succeeded. Cursor Browser: ordinary mode, Data tab, title Libration, `?scenario=baseline`.

## 2026-08-14 — Repository modernization closed (terminal audit)

Independent audit of the modernization programme found no blockers, and the programme is closed. It has no successor stage and no LIB identifier. Documentation ownership, the LIB-### ratchet, Cursor-native visual verification, and the green verification baseline are the durable outcomes; ordinary work now proceeds through [`docs/WORKFLOW.md`](WORKFLOW.md).

Verified independently: `npx tsc --noEmit` clean; `npm test` 163 files / 1499 passed / 0 failed; `npm run build` succeeded. The renderer v2-import guard was mutation-tested — a real `config/v2` import added to `src/renderer/sceneViewportLayout.ts` failed the guard, and the mutation was reverted. Cursor Browser: `?scenario=baseline`, `?scenario=night` (meaningfully different night-side composition), and ordinary mode with no scenario leakage.

## 2026-08-14 — LIB-003 complete

Default solar analemma ground track now samples at the canonical UTC time-of-day so today’s vertex coincides with the live subsolar point; explicit `utcHour` remains a frozen-hour overlay.

Verified: focused analemma tests 13 passed; `npx tsc --noEmit` clean; `npm test` 163 files / 1504 passed / 0 failed. Cursor Browser: `?scenario=readability` (sun on northern vertex at 12:00 UTC) and `?scenario=night` with analemma enabled (figure-8 near 90°E, sun on southern vertex at 06:00 UTC).

## 2026-08-14 — LIB-004 complete

Toggleable lunar ground track: time-windowed `sublunarPoint` path (default 24 h past + 24 h future), independent of the Moon marker, default off. DEV scenario `lunar-track` added.

Verified: `npx tsc --noEmit` clean; `npm test` 166 files / 1525 passed / 0 failed; `npm run build` succeeded with no scenario registry in `dist/`. Cursor Browser at 1920×1080: `?scenario=lunar-track` (Moon on cool track near 170°W), `?scenario=baseline` (track off), `?scenario=night` with track enabled (readable on dark substrate), ordinary startup with no scenario banner.

## 2026-08-14 — LIB-005 complete

Lunar ground track past and future polyline RGB identities are independently configurable (`pastColor` / `futureColor`, default `#aacdf0`). Past remains quieter via existing plan-builder alpha.

Verified: `npx tsc --noEmit` clean; `npm test` 167 files / 1530 passed / 0 failed. Cursor Browser at 1920×1080: `?scenario=lunar-track` default cool track, then past `#ff3300` / future `#22cc66` visibly recolored; reload restored the default.

