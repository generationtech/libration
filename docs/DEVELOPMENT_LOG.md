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

## 2026-08-15 — LIB-018 complete

E5 live eclipse alignment / beam: semantic presentation from existing `EclipseFrame` plus ambient glyphs. Solar ribbon to live umbra/antumbra (partial-only = local bloom, no fabricated target). Lunar Sun→Earth→Moon axis from E3 geometry. Active-only, product-time driven, independently disableable. No new ADR. No E6+.

Verified: `npx tsc --noEmit` clean; `npm test` 191 files / 1777 passed / 0 failed; `npm run build` succeeded with no scenario registry in `dist/`. Cursor Browser: 2024 total / 2023 annular / 2022 partial / 2016 dateline / forecast-only, 2022 total lunar / 2008 partial lunar, Tokyo vs Knoxville, intensity, 7200× demo, ordinary startup.

## 2026-08-15 — LIB-019 complete

E6 Eclipse System product polish: grouped Layers configuration, presentation-only type filters, event information, restrained labels, independent styling, factory solar/lunar masters on, honest unsupported-range copy. No new ADR. No E7.

Verified: `npx tsc --noEmit` clean; `npm test` 194 files / 1799 passed / 0 failed; `npm run build` succeeded with no scenario registry in `dist/`. Cursor Browser: baseline quiet, 2024 forecast→active, annular naming, 2022 lunar Knoxville/Tokyo, multi-event nearest label, ordinary startup.

## 2026-08-16 — LIB-020 complete

Post-E6 Eclipse reconciliation: Event labels rebuild the layer registry; HUD eclipse status is a separate row; factory Solar/Lunar ON diagnosed as already correct (observed Lunar OFF is persisted/preset); lunar forecast on the existing EclipseEventService (separate 7-day horizon, GE Moon-visible region). No new ADR. Not E7.

Verified: `npx tsc --noEmit` clean; `npm test` 195 files / 1826 passed / 0 failed; `npm run build` succeeded with no scenario registry in `dist/`. Cursor Browser: lunar forecast total Knoxville/Tokyo, labels OFF, Live only, active 2022 total, solar forecast labels ON/OFF, baseline quiet.

## 2026-08-16 — LIB-021 complete

Post-LIB-020 lunar eclipse visual reconciliation: event information moved to a dismissible lower-right map panel; moonlight attenuated from E3 disc coverage independently of lunar overlays (ADR 0011); spatial Earth-shadow on the Moon glyph; Moon-visible fill darkened; map labels offset Sun/Moon halos. Not E7.

Verified: `npx tsc --noEmit` clean; `npm test` 199 files / 1851 passed / 0 failed; `npm run build` succeeded with no scenario registry in `dist/`. Cursor Browser: 2022-05-16 pre/penumbral/partial/total/egress, Tokyo vs Knoxville, solar forecast and live, Config controls-only, Event information OFF, Hide/chip.

## 2026-08-16 — LIB-022 complete

README-candidate PNG set of the 2017-08-21 total solar eclipse (`nasa-5mcse-solar-9546`) from the existing production Eclipse System. Six captures under `docs/images/eclipse-2017/`. No product source changes; no README/GIF/video.

Verified: authority stations via `npx tsx`; Cursor Browser CDP 1920×1080 PNGs (forecast 2017-08-16T18:00Z, overview 18:00Z, Oregon 17:16:44Z, GE 18:25:30Z, Carolina 18:48:44Z, beam crop of GE). Suite not rerun (no source changes).

## 2026-08-16 — LIB-023 complete

Replaced the malformed LIB-022 2017 eclipse PNGs. Root cause was Chromium `Page.captureScreenshot` tiling the Cursor pane compositor surface under a 1920×1080 device-metrics override, not product world wrap. Capture is now `canvas.toDataURL` after metrics-before-reload; full frames 1919×1079, beam crop 680×540. No product source changes; README.md not edited.

Verified: PIL uniqueness (no 912 px tile); visual inspection of all six; README-scale downsamples of the overview at 1200/800/600. Suite not rerun (no source changes).

## 2026-08-16 — LIB-025 complete

Reconciled solar eclipse presentation lifecycle. Root cause of the 2017 disappearing path: E2 dropped active corridor fill to 0.12 and hid the forecast centerline before the umbra reached Earth. Corridor now stays through globally active phases (~80% upcoming fill, stronger limits, pre/post-central centerline). Forecast GE partial is upcoming-only; live partial owns active shading. Targeted beam and ground marker exist only while a terrestrial central intersection exists. No ADR. No README recapture.

Verified: `npx tsc --noEmit` clean; `npm test` 202 files / 1888 passed / 0 failed; `npm run build` with no scenario registry in `dist/`. Cursor Browser: 2017 stations A–G plus 1200× playback; dateline/annular/partial scenarios; ordinary startup.

## 2026-08-16 — LIB-026 complete

Reconciled solar eclipse visual families after the 2017 corridor-continuity fix. The changing blue/gray wedges were a mix of hue collision (partial/corridor/umbra all violet stacked on cool night), a false Arctic fill from sequential unwrap of a closed penumbra ring, and a map-scale Dramatic beam. Live partial is now teal-slate; corridor stays violet; umbra is compact indigo; the beam is a narrower gold ribbon. Closed fill rings fold into the smallest longitude arc; overlapping wrap copies are dropped rather than alpha-stacked. No ADR. No README recapture.

Verified: `npx tsc --noEmit` clean; `npm test` 203 files / 1911 passed / 0 failed; `npm run build` with no scenario registry in `dist/`. Cursor Browser: exact 2017 A–F Knoxville UTCs, family isolation at D, Normal vs Dramatic at D/E, 400× playback, dateline/annular/partial, ordinary startup.

## 2026-08-16 — LIB-027 complete

Replaced the active solar eclipse’s flat teal live-partial fill with continuous local-obscuration daylight attenuation in the illumination raster. Obscuration reuses E4 Besselian observer-plane area overlap; a 288×145 grid is bilinearly sampled and mapped with `maxDarken × obscuration^γ` (default Normal). Upcoming forecast teal stays informational. Physical dimming follows solar shading independently of overlay geography ([ADR 0012](decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md)). No README recapture.

Verified: `npx tsc --noEmit` clean; `npm test` 205 files / 1938 passed / 0 failed; `npm run build` with no scenario registry in `dist/`. Cursor Browser: 2017 A–F / post-central / after / GE Normal and Dramatic / overlay-off, annular, partial-only, dateline, ordinary startup.

## 2026-08-16 — LIB-028 complete

Replaced the moving penumbra-outline bbox with a stable full-world 288×145 equirect obscuration field so 2017 ingress/egress no longer show a rectangular domain wall. Physical zeros outside the penumbra are physical zeros. Horizon gating of `obscuration01` was left for LIB-029. No README recapture.

Verified in-tree: field topology and wrap tests; successor LIB-029 owns remaining terminator-adjacent seams.

## 2026-08-16 — LIB-029 complete

Reconciled active solar-eclipse illumination with ordinary daylight. The west/east terminator seams were a horizon-masked obscuration raster plus `combinedAlpha = 1 − (1 − ordinaryAlpha) × transmission`, which jumped from eclipsed daylight to brighter twilight at altitude 0°. The field now stores physical overlap; E4 visibility stays horizon-gated; composition multiplies transmission into `1 − nightVeil` only. No new ADR. No README recapture.

Verified: `npx tsc --noEmit` clean; `npm test` 206 files / 1965 passed / 0 failed; `npm run build` with no scenario registry in `dist/`. Cursor Browser: 2017 horizon A–E / rasterWest / east 19:40Z and 20:05Z, annular, partial, dateline, ordinary startup; canvas transects at 16:45Z and 19:55:32Z.

## 2026-08-16 — LIB-024 complete

Resumed after LIB-025–LIB-029. Marker implementation was already in the tree. Recaptured the six 2017 README PNGs from `solar-eclipse-2017` showcase (Extra Large Moon, Event labels off, Dramatic alignment, Large vermilion marker) via canvas `toDataURL` at 1919×1079; #6 is a 680×540 lossless crop. README.md not edited. No eclipse architecture changes.

Verified: `npx tsc --noEmit` clean; `npm test` 206 files / 1965 passed / 0 failed; `npm run build` with no scenario registry in `dist/`. Cursor Browser canvas exports at the six LIB-022 station UTCs; left-vs-+912 uniqueness confirmed.

## 2026-08-16 — LIB-030 complete

Layers tab topic subpanels (Chrome-style UI-only selector, not persisted). Default Layer masters; Map / Illumination / Eclipse / Moon & libration / Astronomy paths / Advanced unmount when inactive. No config, default, or persistence changes. Other tabs unchanged.

Verified: focused Layers/config tests 90 passed; `npx tsc --noEmit` clean; `npm test` 206 files / 1968 passed / 0 failed. Cursor Browser `?scenario=baseline`: Config open, Layers topics switch without changing panel width token.

## 2026-08-16 — LIB-031 complete

Sticky Layers topic selector inside the existing `.config-tab-panel` scroller; topic change resets that panel’s scroll to the top. Heading/hint stay in normal flow. No config, persistence, or other-tab changes.

Verified: focused Layers/config tests 79 passed; `npx tsc --noEmit` clean; `npm test` 206 files / 1970 passed / 0 failed. Cursor Browser `?scenario=baseline`: Config → Layers, Advanced/Eclipse scrolled with selector pinned; Moon & libration / Eclipse open at top.

## 2026-08-16 — LIB-032 complete

Chrome tab unified topic subpanels (sticky UI-only selector, not persisted). Default Reference & clock; Bottom HUD / Hour indicators / Tick tape / NATO time zones unmount when inactive. Old Chrome-area selector removed. No config, default, or persistence changes. Other tabs unchanged.

Verified: focused Chrome/Layers/config tests 126 then 81 passed after guard-test update; `npx tsc --noEmit` clean; `npm test` 206 files / 1970 passed / 0 failed; `npm run build` succeeded with no scenario registry in `dist/`. Cursor Browser `?scenario=baseline`: Config → Chrome topics sticky and scroll-reset; Layers Advanced sticky still pinned.

## 2026-08-16 — LIB-033 complete

Survey-only reconnaissance of dynamic / internet-sourced layers. No production source changes. The lifecycle (ADR 0005) and three optional live consumers (clouds/IR, earthquakes, ISS) already exist, default-off, with fixture fallback. Recommended next slice is earthquake hardening (live-vs-demo policy and failure UX), not a new feed or generic framework.

Verified: documentation-only; `tsc` / `npm test` / build / visual verification not run. Final STATE AWAITING SCOPE; no implementation LIB created.

## 2026-08-16 — LIB-034 complete

Ordinary Layer masters for clouds/IR, earthquakes, and ISS were inert because DEV StrictMode disposed the lifecycle host while the App ref survived, so `ensure*` no-op’d. Revive-on-arm restores acquisition. All three live providers succeeded in the browser (USGS, CelesTrak, GIBS); no new feeds or hardening.

Verified: focused activation tests 7 passed (plus LayersTab/scenario isolation); `npx tsc --noEmit` clean; `npm test` 207 files / 1979 passed / 0 failed; `npm run build` succeeded. Cursor Browser ordinary non-scenario mode: enable/wait/visible/disable for each layer; `?scenario=baseline` still isolates live feeds.

## 2026-08-16 — LIB-035 complete

Current-only live layers (clouds/IR, earthquakes, ISS) hide when product time is outside ±5 minutes of wall-clock now, without mutating enablement; ISS marker is SGP4 at the product instant (−60/+30 min track). Factory HUD seconds and city-pin times default off; pin time format defaults to no seconds.

Verified: `npx tsc --noEmit` clean; `npm test` 211 files / 2003 passed / 0 failed; `npm run build` succeeded. Cursor Browser: factory HUD/pins, current-mode USGS+GIBS, 2017 Demo suppression and re-arm, `?scenario=baseline` isolation. CelesTrak 403 this session; ISS propagator vs where-the-iss.at at 2026-08-17T03:16:20Z agreed to ~0.1 m.

## 2026-08-17 — LIB-036 complete

Production ISS no longer paints fixture as live. Provenance and TLE freshness (≤18 h live / 18–48 h degraded / >48 h hidden) resolve upstream of RenderPlan; CelesTrak failure with no usable live TLE hides the overlay. Marker remains SGP4 at product UTC. Clouds/IR and earthquakes unchanged.

Verified: focused ISS tests 78 passed; `npx tsc --noEmit` clean; `npm test` 212 files / 2018 passed / 0 failed; `npm run build` succeeded. Cursor Browser ordinary current mode: enable ISS → unavailable hint, no fixture on the map; 2017 Demo live-only hide with checkbox still on; return to now without re-enable. CelesTrak unreachable (curl timeout); LIB-037 stays proposed.

## 2026-08-17 — LIB-038 complete

Layers → Space objects is the ISS presentation home (orbit track, past/future segments and durations inside the existing −60/+30 min window, colors, thickness, Dot vs internal silhouette, size, label). Layer masters still owns ISS visibility. Orbital authority, provenance, and freshness were not changed.

Verified: `npx tsc --noEmit` clean; focused presentation tests 135 passed; `npm test` 216 files / 2046 passed / 0 failed; `npm run build` succeeded. Cursor Browser: Space objects topic order and controls, orbit-track-off gating, glyph Dot/silhouette conditional colors, defaults restored. CelesTrak unreachable; no fixture on the map; live ISS map appearance not verified. LIB-037 stays proposed.

## 2026-08-17 — LIB-039 complete

ISS Space objects presentation now invalidates immediately: `dynamicTracks` runtime equality includes `source.parameters`, so the overlay is reconstructed instead of keeping a constructor snapshot. Duration filtering stays local over the prepared samples. Orbit base color drives the on-map label and follows into past while past is still linked. DEV `?scenario=iss-presentation` uses a process-local recorded TLE (not production fixture-as-live).

Verified: `npx tsc --noEmit` clean; `npm test` 217 files / 2052 passed / 0 failed; `npm run build` succeeded with no `iss-presentation` in `dist/`. Cursor Browser `?scenario=iss-presentation`: every LIB-038 control changed the map on the next frame with 0 CelesTrak requests. Ordinary live ISS unavailable this session. LIB-037 stays proposed.

## 2026-08-17 — LIB-040 complete

ISS first enable now fetches immediately (it already did) with an 8 s timeout, ordered CelesTrak → Where the ISS at failover, 2-hour TLE cadence, loading/unavailable hints, and in-memory re-enable without a new download. CelesTrak hangs from this IP; secondary TLE paints in ~8.3 s (timeout-dominated). No fixture-as-live. ADR 0014.

Verified: focused ISS/host tests 33 passed; `npx tsc --noEmit` clean; `npm test` 218 files / 2065 passed / 0 failed; `npm run build` succeeded with no `iss-presentation` in `dist/`. Cursor Browser ordinary factory enable ×3: loading hint, WTIA failover, visible ISS; re-enable 0 extra fetches; 2017 Demo live-only hide; `?scenario=iss-presentation` network-free. LIB-037 stays proposed.

## 2026-08-17 — LIB-041 complete

ISS past/future tracks now use minute and orbit horizon tokens resolved from TLE mean motion (`1440 / n`), with local SGP4 expanding the sample window (no extra TLE fetch). Distant revolutions fade by orbit distance (alpha only). ISS silhouette glyph color is a two-pass understroke plus configured fill/stroke so color changes are visible immediately.

Verified: `npx tsc --noEmit` clean; focused 142 passed; `npm test` 220 files / 2081 passed / 0 failed; `npm run build` succeeded with no `iss-presentation` in `dist/`. Cursor Browser `?scenario=iss-presentation`: 1/3/6 orbits, asymmetric 6/1 and 1/6, silhouette magenta/green, 0 TLE fetches. Fixture period ≈ 92.9416 min; 6+6 ≈ 558 samples / ~4 ms SGP4. LIB-037 stays proposed.

## 2026-08-17 — LIB-042 complete

Reconciled eclipse HUD, placard, and map-label copy through one `EclipsePresentationState` projection. HUD is local (obscuration percent that never shows partial as `100%`; begins/max/ends). Placard distinguishes global vs local. Map labels are `{title} · upcoming|active` near the Sun/Moon cluster, opposite the solar path in screen space. No astronomy or ADR change.

Verified: `npx tsc --noEmit` clean; focused eclipse tests 114 passed; `npm test` 221 files / 2090 passed / 0 failed; `npm run build` succeeded with no `solar-eclipse-2017` / `iss-presentation` in `dist/`. Cursor Browser 2017 upcoming/earlyCentral/GE/lateCentral/after, dateline, partial, lunar forecast/total, Tokyo observer. LIB-037 stays proposed.

## 2026-08-17 — LIB-043 complete

Reconciled lunar eclipse presentation and illumination: glyph-anchored event labels with city-name clearance, explicit active vs forecast Moon-visible semantics, one physical moonlight pipeline (`ordinaryMoonlight × lunarEclipseTransmission`), removal of the geographic lunar alignment ribbon that caused blocky/jumping large-area shading, and a short Moon-local Earth-shadow directional cue. Solar alignment beam, NASA/Espenak authority, and LIB-042 HUD/placard wording unchanged. No new ADR (ADR 0011 reinforced).

Verified: `npx tsc --noEmit` clean; `npm test` 223 files / 2106 passed / 0 failed; `npm run build` succeeded with no `lunar-eclipse-2029` / `eclipseStation` in `dist/`. Cursor Browser 2029 A–G, Tokyo observer, partial, penumbral, forecast, dateline, 2017 solar GE. LIB-037 stays proposed.

## 2026-08-17 — LIB-044 complete

Map Moon-visible geography now follows the current product instant for both upcoming and active lunar eclipses (no frozen GE hemisphere, no activation snap). The remaining white global line was the Moon-visible horizon boundary; it is retained as current-instant geography. Hemisphere unwrap no longer flicker-cuts wrap copies. Physical illumination uses one product-time astronomical state. Placard still describes GE visibility. No new ADR.

Verified: `npx tsc --noEmit` clean; `npm test` 225 files / 2121 passed / 0 failed; `npm run build` succeeded with no `lunar-eclipse-2029` / `eclipseStation` in `dist/`. Cursor Browser 2029 upcoming/preActive/early/total, 100× playback through P1, 2017 solar GE. LIB-037 stays proposed.

## 2026-08-17 — LIB-045 complete

Removed redundant Upcoming Moon-visible region/boundary controls. One Moon-visible region flag and one Moon-visible boundary flag now own current-instant lunar eclipse map geography for both upcoming and active presentation, with no P1 ownership or opacity switch. Legacy forecast visibility booleans migrate with `false` wins and are omitted from normalized config.

Verified: `npx tsc --noEmit` clean; `npm test` 226 files / 2133 passed / 0 failed; `npm run build` succeeded with no `lunar-eclipse-2029` / `eclipseStation` in `dist/`. Cursor Browser 2029 upcoming/preActive/early/deepPartial/total, Layers Eclipse UI, 2017 solar GE. LIB-037 stays proposed.

## 2026-08-18 — LIB-046 complete

Lunar eclipse map presentation no longer paints a terrestrial Moon-visible hemisphere or geometric lunar-horizon boundary. Ordinary Moon-above-horizon astronomy remains for illumination and other non-eclipse behavior. Legacy visibility keys are ignored on load. No new ADR.

Verified: `npx tsc --noEmit` clean; focused 15 files / 243 passed; `npm test` 226 files / 2128 passed / 0 failed; `npm run build` succeeded with no `lunar-eclipse-2029` / `eclipseStation` in `dist/`. Cursor Browser 2029 upcoming→after, Tokyo observer, Layers Eclipse UI, 2017 solar GE, night. LIB-037 stays proposed.

## 2026-08-18 — LIB-047 complete

Eclipse Tour under Layers → Eclipse sequences bundled solar/lunar catalog events by commanding the existing Demo-time controller. No second clock. Data/Demo stays domain-neutral. ADR 0015.

Verified: `npx tsc --noEmit` clean; focused catalog/sequence/runtime/commit/LayersTab 90 passed; `npm test` 229 files / 2150 passed / 0 failed; `npm run build` succeeded. Cursor Browser ordinary mode: factory inactive; 2017-08-01…2017-09-15 lunar then solar; Data Demo start/speed shared; present-time Demo start deactivates tour. LIB-037 stays proposed.

## 2026-08-19 — LIB-048 complete

Mercury–Neptune plus Pluto as terrestrial sub-object points, optional planet ground tracks, and independently enabled daily same-time planetary loci under Layers → Space objects. Bundled `astronomy-engine` 2.1.19 (ADR 0016). Factory Planets/bodies off. Not current-only live data.

Verified: `npx tsc --noEmit` clean; `npm test` 236 files / 2185 passed / 0 failed; `npm run build` succeeded with no `planetary-objects` scenario registry in `dist/`. Cursor Browser `?scenario=planetary-objects`: glyphs, 1-day tracks, inner-planet loci, 10y all-loci stress, Planets master off. JPL Horizons apparent RA/Dec check at 2026-08-19 15:30Z. LIB-037 stays proposed.

## 2026-08-19 — LIB-049 complete

Milky Way zenith-projection ribbon under Layers → Space objects: IAU 1958 Galactic plane, approximate band, sparse ribs, Galactic center, optional anticenter, night-side alpha. Offline, Demo-time, 1600–2500. Not a star field or visibility forecast. ADR 0017.

Verified: `npx tsc --noEmit` clean; `npm test` 241 files / 2216 passed / 0 failed; `npm run build` succeeded with no `milky-way` scenario registry in `dist/`. Cursor Browser `?scenario=milky-way` (plane/band/ribs/center/anticenter/night/Demo +6 h/accelerated playback) and `?scenario=solar-eclipse-total` with Milky Way on. LIB-037 stays proposed.

## 2026-08-19 — LIB-050 complete

Galactic-center altitude contours under Layers → Space objects → Milky Way: small circles of constant GC altitude (default 30/45/60/75°) around the LIB-049 subpoint, with astronomical-night line emphasis and optional moonlight de-emphasis. Not a score, raster, or ribbon replacement. No new ADR.

Verified: `npx tsc --noEmit` clean; `npm test` 242 files / 2231 passed / 0 failed; `npm run build` succeeded with no `milky-way` scenario registry in `dist/`. Cursor Browser `?scenario=milky-way`: nested contours, southern advantage, contour toggle, Demo +6 h. LIB-037 stays proposed.

## 2026-08-19 — LIB-051 complete

Reference-city Milky Way Viewing Window events: GC altitude ∩ solar darkness ∩ existing physical moonlight. Viewing / Strong / Prime with latitude-aware Prime. Config under Layers → Space objects → Milky Way. Go to next Prime uses existing Demo time. ADR 0018.

Verified: `npx tsc --noEmit` clean; `npm test` 245 files / 2266 passed / 0 failed; `npm run build` succeeded with no `visualScenarios` / `observerCity` / `?scenario=` in `dist/`. Cursor Browser `?scenario=milky-way` (Knoxville Prime 24.5°) and `observerCity=sao_paulo` (Prime 83.6°). LIB-037 stays proposed.

