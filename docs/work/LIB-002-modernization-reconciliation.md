# LIB-002 — Modernization reconciliation and green baseline

| Field | Value |
|-------|-------|
| ID | LIB-002 |
| Status | complete |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (modernization M5, authorized at program level) |
| Completed | 2026-08-14 |

Human-authorized modernization stage M5. Reconcile the finite deferred defects from M0/M1 and establish a green verification baseline before the independent M6 audit.

## Objective

Resolve the seven modernization defects deliberately deferred while M2–M4 established the new repository structure, then leave the repository with a truthful green verification baseline: clean type-check, zero failing tests, successful production build, and no tolerated known failures.

## Scope

**In scope**

- M5-1: architectural-boundary glob false-positive on renderer test files, without weakening the production guard.
- M5-2: stale `appConfig.ts` comment about production v2 loading.
- M5-3: inaccurate Data-tab copy claiming no live network feeds, plus Cursor-native visual verification of the corrected copy.
- M5-4: reconcile tracked `.staging/` scratch material.
- M5-5: reconcile tracked `.tmp-lc-png` temporary material.
- M5-6: replace generic `tauri-app` npm package identity with `libration`.
- M5-7: correct `index.html` document title to Libration.
- Bounded current-document and Cursor-rule consistency for contradictions created by or directly related to M2–M5.
- Bounded searches for stale current-state machinery, phantom climate id, leftover `tauri-app` identity, and surviving “no live network feeds” claims.

**Out of scope**

- M6 terminal modernization audit.
- CI, formatter, linter, dependency modernization, Tauri redesign/removal/desktop implementation.
- Renderer refactoring, illumination work, UI/visual redesign, new map substrates.
- Roadmap feature implementation, FUTURE_FEATURES, Playwright, screenshot baselines, MCP additions.
- Dead local Git branches, broad package/config cleanup, legacy layer-flag or alias cleanup.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of rendering; backends must not inspect configuration to decide product behaviour.
- The renderer / `app/bootstrap` v2-import guard remains a production-boundary check, not a test-source scan.
- Configuration architecture is not redesigned; Data tab is not redesigned; durable `assets-source/` and map provenance remain intact.

## Acceptance criteria

- The architectural-boundary test no longer false-positives on renderer test/support files.
- The same guard still rejects a real production-shaped `config/v2` import (demonstrated, not assumed).
- `appConfig.ts` comments match current v2 load behaviour.
- Data-tab copy accurately describes local product data vs optional live feeds.
- `.staging/` and `.tmp-lc-png` are reconciled (untracked scratch/temp, or documented if durable).
- Durable map provenance / `assets-source/` remains tracked.
- npm package identity is Libration-specific; `index.html` title identifies Libration.
- Current docs and Cursor rules contain no stale current-state machinery from the pre-modernization process.
- Phantom climate id `equirect-world-climate-koppen-letter-v1` does not survive in nonhistorical content.
- `npx tsc --noEmit` is clean; `npm test` has zero failures; `npm run build` succeeds.
- Known failing verification is none.
- Cursor Browser visual verification covers ordinary mode, Data tab, document title, and `?scenario=baseline`.

## Verification plan

- Focused tests: architectural-boundary guard (including a synthetic production violation); Data-tab copy if covered.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — package identity and `index.html` affect bundling.
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) for ordinary mode, Data tab, document title, and `baseline`.

## Documentation impact

- `docs/IMPLEMENTATION.md` if package identity, Data-tab ownership, or related current truth changes
- `docs/ROADMAP.md` if it still lists completed/active work
- `docs/STATE.md` and `docs/DEVELOPMENT_LOG.md` on completion
- This work item’s completion record

## Completion record

**Implementation summary**

Reconciled the seven deferred M0/M1 defects and left a green verification baseline. The renderer v2-import guard now excludes `*.test.{ts,tsx}` from the production glob and still rejects a synthetic production-shaped `config/v2` import. Stale `appConfig.ts` comments were aligned with current v2 load behaviour. Data-tab copy now describes optional Layers-owned live feeds (off by default, fixture fallback). Tracked scratch `.staging/` and `.tmp-lc-png` were untracked and ignored; `assets-source/` and `public/maps` remain tracked. npm package name is `libration`; `index.html` and Tauri product/window titles identify Libration. Bounded docs/rule consistency: ROADMAP no longer lists completed work; IMPLEMENTATION package identity and Data-tab ownership; ADR 0006 scaffold-name sentence; history index banner now points at `STATE.md` as current owner.

**Commands run**

- `npx vitest run src/App.configPhase2.test.ts src/components/config/DataTab.test.tsx`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- Cursor in-editor Browser: `http://localhost:1420/`, Data tab, `document.title`, `http://localhost:1420/?scenario=baseline`
- `git rm -r .staging`; `git rm .tmp-lc-png`; `git check-ignore`; `git ls-files` for `assets-source` and `public/maps`

**Actual results**

- Focused tests: 2 files, 12 passed (7 boundary including glob exclusion, synthetic production violation, comment-only non-violation; 5 DataTab including corrected copy).
- `npx tsc --noEmit`: clean (exit 0).
- `npm test`: Test Files 163 passed / Tests 1499 passed / 0 failed.
- `npm run build`: success (`libration@0.1.0`; `dist/index.html` title `Libration`). Vite noted a >500 kB chunk warning (pre-existing bundling size, not a failure).
- Hygiene: `.staging/` and `.tmp-lc-png` untracked; ignore rules match; 18 `assets-source` files and 61 `public/maps` files still tracked.

**Visual verification**

```text
Visual verification:
- Scenario: ordinary (no query)
- Viewport: CSS inner 1920×1080 via CDP Emulation.setDeviceMetricsOverride;
  canvas client 1889×1080 (embedded pane does not physically paint a full
  1920-wide canvas)
- Browser: Cursor built-in browser (viewId 90d956)
- Inspected: application render, chrome/scene coherence, Config panel (C),
  document.title / tab title
- Result: PASS
- Observations: page title "Libration"; scene and chrome rendered; Config
  opened on Layers then Data

Visual verification:
- Scenario: Data tab (ordinary mode)
- Viewport: same 1920×1080 CSS inner; hint box 319×96 at (1570, 167); clipped=false
- Browser: Cursor built-in browser
- Inspected: Data-tab hint copy, layout
- Result: PASS
- Observations: visible text "Local product data and demo time. Live cloud,
  earthquake, and ISS feeds are optional Layers overlays — off by default,
  with bundled fixtures when a live fetch is unavailable." No clipping/overlap
  of the hint. Config tabs remain coherent.

Visual verification:
- Scenario: baseline
- Viewport: CSS inner 1920×1080; canvas client 1889×1080
- Browser: Cursor built-in browser
- Inspected: scenario banner, chrome/scene, city pin times, document title
- Result: PASS
- Observations: banner "scenario: baseline · 2030-06-15T12:00:00.000Z ·
  persistence isolated"; title "Libration"; LA 5:00:00 AM / Knoxville and
  New York 8:00:00 AM; terminator and overlays present
```

**Not verified**

- Tauri desktop packaging / `cargo` crate rename (`src-tauri` crate remains `tauri-app`; identifier `com.user.tauri-app`).
- Physical 1920×1080 canvas paint in the embedded Cursor pane (CDP metrics override inner size; canvas client stayed ~1889×1080).
- Four-scenario M4 rerun (not required; M5 did not change scene composition).

**Discovered, not done**

- Rust crate name `tauri-app` and bundle identifier `com.user.tauri-app` remain scaffold leftovers. Left in place to avoid a Tauri/Cargo identity change outside M5-6’s npm/package surface.
- Production Vite chunk-size warning (`index-*.js` ~586 kB). Pre-existing; not a test/build failure.
- Individual `docs/history/` document banners still say STATE would own current state “after M3”; the history index now states STATE owns it. Archive bodies were left verbatim.
