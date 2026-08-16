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

## 2026-08-14 — LIB-006 complete

Development-only lunar-day locus experiment: sampling `sublunarPoint` at the model mean lunar day (~24h 50m 28s) for 28 points yields a compact residual figure-8 near the current Moon, with nodal-cycle amplitude change. DEV scenario `lunar-locus` kept; no production overlay.

Verified: `npx tsc --noEmit` clean; `npm test` 169 files / 1545 passed / 0 failed; `npm run build` succeeded with no `lunar-locus` in `dist/`. Cursor Browser at 1920×1080: `lunar-locus` glyph dots and dots-line, geographic mode, standstill/minor epochs, `lunar-track` weave comparison, `readability` solar analemma, `baseline`, ordinary startup.

## 2026-08-14 — LIB-007 complete

Production Lunar locus overlay: mean-lunar-day samples of `sublunarPoint` (~24 h 50 m 28 s, 28 points, ~27.3-day cycle) as a line-only compact figure. Layers toggle default off. Stroke matches solar-analemma weight in lunar `#6e849e`. DEV `lunar-locus` uses the production layer.

Verified: `npx tsc --noEmit` clean; `npm test` 170 files / 1560 passed / 0 failed; `npm run build` succeeded with no experiment selectors in `dist/`. Cursor Browser at 1920×1080: recent/standstill/minor/baseline epochs, animation/pause, night substrate, analemma+ground-track coexistence, disabled, ordinary startup.

## 2026-08-14 — LIB-008 complete

Lunar locus no longer forces Catmull-Rom closure through the merely-near `k = −13` / `k = +14` pair. Open interpolation uses real neighbors outside the rendered window; the path is cropped at one sidereal month and merged onto the start so the traveling opposite-Moon zigzag is gone.

Verified: `npx tsc --noEmit` clean; `npm test` 170 files / 1576 passed / 0 failed; `npm run build` succeeded. Cursor Browser at 1920×1080: `?scenario=lunar-locus` recent (pre-fix kink visible, then gone), standstill, minor, baseline; interpolator month sweep at 6 h steps.

## 2026-08-15 — LIB-009 complete

Lunar locus is no longer forced into a false remote closure. The displayed cycle is an open one-sidereal-month path whose seam is the current Moon; a small quasi-periodic endpoint mismatch stays under the Moon glyph instead of traveling as a hook opposite it.

Verified: focused lunar-locus tests 40 passed; `npx tsc --noEmit` clean; `npm test` 170 files / 1581 passed / 0 failed; `npm run build` succeeded. Cursor Browser at inner 1920×1080: `?scenario=lunar-locus` recent/standstill/minor/baseline plus accelerated demo at 86400×.

## 2026-08-15 — LIB-010 complete

Production Moon glyph now shows optical libration (Meeus ch. 53, no physical libration) as a displaced internal ring by default, optional crosshair, with durable Moon size and independent Lunar locus / Solar analemma stroke color and thickness. Apparent lunar-north rotation recorded in `docs/FUTURE_FEATURES.md` only.

Verified: `npx tsc --noEmit` clean; `npm test` 172 files / 1607 passed / 0 failed; `npm run build` succeeded with no `moon-libration` / `librationEpoch` in `dist/`. Cursor Browser at inner 1920×1080: `?scenario=moon-libration` epochs, sizes, ring/crosshair, accelerated demo/pause, alt path styles, ordinary startup.

## 2026-08-15 — LIB-011 complete

Moon libration ring/crosshair now uses an automatic contrasting under-stroke plus the user color, and can present in map-oriented or observer-oriented frames (default observer, following the chrome reference city; map-oriented fallback when no city is resolved).

Verified: `npx tsc --noEmit` clean; `npm test` 174 files / 1631 passed / 0 failed; `npm run build` succeeded with no `moon-libration` / `librationEpoch` / `observerCity` in `dist/`. Cursor Browser at inner 1920×1080: new/full/diagonal epochs, Knoxville vs Sydney vs map vs `observerCity=none`, live city switch, 86400× pause, ordinary startup.

## 2026-08-15 — LIB-012 complete

Eclipse System reconnaissance and architecture: inventory of existing solar/lunar capability; intended structure in `docs/specs/scene/eclipse-system.md`. No production eclipse behaviour. No implementation LIB created.

Verified: documentation/process checks; `npx tsc --noEmit` clean; `npm test` 174 files / 1631 passed / 0 failed. Visual verification not applicable.

## 2026-08-15 — LIB-013 complete

Eclipse authority selected: bundled NASA/Espenak–Meeus Five Millennium Canon/Catalog (solar Besselian polynomials + lunar catalog events) behind one offline `EclipseAuthority`; span 1900–2100; explicit outside-range state. Recorded in `docs/specs/scene/eclipse-system.md` §22. No production eclipse behaviour. No E1 LIB created.

Verified: documentation/research checks; `npx tsc --noEmit` clean; `npm test` 174 files / 1631 passed / 0 failed. Visual verification not applicable.

## 2026-08-15 — LIB-014 complete

E1 solar eclipse live footprint: bundled NASA Besselian authority v1 (454 events, 1900–2100), product-UTC lookup, geographic reduction, production overlay through `equirectRegionOverlay`/`RenderPlan`. Master default off. DEV scenarios `solar-eclipse-total|annular|partial|dateline`. ADR 0008.

Verified: `npx tsc --noEmit` clean; `npm test` 180 files / 1662 passed / 0 failed; `npm run build` succeeded with no eclipse scenario ids in `dist/`. Cursor Browser: four eclipse scenarios, 3600× demo progression on 2024 total, ordinary startup.

## 2026-08-15 — LIB-015 complete

E2 solar eclipse forecast window: product-UTC range lookup, durable horizon (default 7 days; 0 = live-only), cached event corridor distinct from the live E1 footprint, representative GE partial forecast, nearest-event emphasis. ADR 0009. No E3+.

Verified: `npx tsc --noEmit` clean; `npm test` 181 files / 1682 passed / 0 failed; `npm run build` succeeded with no forecast scenario ids in `dist/`. Cursor Browser: forecast total/annular/partial/multiple, dateline live-only, 2024 jump into active+corridor, 3600× motion and pause, ordinary startup.

## 2026-08-15 — LIB-016 complete

E3 lunar eclipse truth and terrestrial visibility: bundled NASA/Espenak–Meeus lunar catalog v1 (459 events, 1900–2100), active-event Earth-shadow on the Moon glyph, Moon-above-horizon region (not a solar-style path). Master default off. DEV scenarios `lunar-eclipse-total|partial|horizon`. No new ADR. No E4+.

Verified: `npx tsc --noEmit` clean; `npm test` 184 files / 1711 passed / 0 failed; `npm run build` succeeded with no lunar eclipse scenario ids in `dist/`. Cursor Browser: total/partial/horizon, 3600× demo progression and post-event jump, ordinary startup.

## 2026-08-15 — LIB-017 complete

E4 reference-city eclipse circumstances: Besselian local solar contacts/magnitude/obscuration, lunar per-contact altitude and local-visible maximum, inspectable Layers details plus optional bottom-HUD status, same chrome catalog city as LIB-011. Global eclipse geography is never filtered by the city. ADR 0010. No E5+.

Verified: `npx tsc --noEmit` clean; `npm test` 189 files / 1742 passed / 0 failed; `npm run build` succeeded with no scenario registry in `dist/`. Cursor Browser: Knoxville/Tokyo/none solar, forecast local status, lunar visible/not-visible, city switch, chrome/details toggles, 3600× demo, ordinary startup.


