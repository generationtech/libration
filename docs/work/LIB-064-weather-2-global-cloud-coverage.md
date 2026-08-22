# LIB-064 — Weather-2: global cloud coverage completion

| Field | Value |
|-------|-------|
| ID | LIB-064 |
| Status | complete |
| Created | 2026-08-21 |
| Approved | 2026-08-21 (human; this request) |
| Completed | 2026-08-21 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-2. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, or LIB-062.

WEATHER-1 / [LIB-063](LIB-063-weather-1-global-clouds-v1.md) is complete. Product direction for EUMETSAT as the better global mosaic comes from proposed [LIB-062](LIB-062-weather-architecture-and-global-clouds-v1-investigation.md).

## Objective

Keep Clouds’ WEATHER-1 white/gray IR-derived presentation, and replace or honestly fall back from the GIBS three-disk stack so Africa/Europe is covered wherever a clean global observation authority (EUMETView `mumi:worldcloudmap_ir108`) can be acquired through an existing browser/Tauri/`fetchFn` seam.

## Scope

**In scope**

- Re-test EUMETView WMS (endpoint, TIME, CRS, PNG alpha, CORS in browser vs curl vs any existing Tauri/backend fetch).
- Prefer EUMET global geostationary-ring mosaic as Clouds primary when architecturally viable; keep GIBS 3-sat as honest partial fallback.
- Source-specific observation TIME, freshness, polling, coverage sanity, provenance/status (global mosaic vs partial fallback; polar gaps).
- Reuse existing IR→cloud-highlight materializer; provider-specific normalization only if histograms require it.
- Attribution/licensing check. Platform-difference honesty. Tests, visual verification, proportional docs. ADR only if a durable network/transport rule is established.

**Out of scope**

- External cloud proxy, new backend server, secrets service, remote relay.
- Making Tauri load-bearing unless an existing HTTP command already exists and is the smallest clean path.
- Visible/IR hybrid, GeoColor, radar, wind, lightning, severe, hurricanes, historical Clouds, Weather Event Playback.
- Polar LEO gap-fill. Physical cloud illumination. User-facing provider selector. Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one product UTC instant; no network in the render path; backends do not decide product behaviour; persist durable ids.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0006](../decisions/0006-browser-first-spa-with-non-load-bearing-tauri-shell.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md), [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)

## Design notes

Preserve durable `sourceId` `global-clouds-ir-v1` and scene id `globalCloudsIr`. Provider-specific internal ids may sit beneath the Clouds product. RenderPlan must not care which provider produced the highlight RGBA.

Transport preference: (A) existing browser `fetch` if CORS now works; (B) existing app-owned/Tauri fetch if already present; (C) existing generic `fetchFn`; (D) new minimal seam only if required and policy allows. Do not silently make Clouds desktop-only.

Source selection starting point: usable EUMET global (observation age ≤ its stale threshold and coverage sanity) beats fresher GIBS partial. Do not prefer “newer partial” solely on timestamp.

## Acceptance criteria

See the authorizing WEATHER-2 completion criteria (EUMET retest; transport chosen; Africa/Europe covered where viable; no synthetic fill; explicit TIME; source-specific freshness/polling; honest fallback status; no provider selector; illumination unchanged; tests/docs/state complete).

## Verification plan

- Focused tests: EUMET request, source selection, coverage, platform dispatch, no illumination change, config unchanged
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV scenario ids
- Visual verification: required — live global mosaic if usable, GIBS fallback comparison, day/night, failover if both providers, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- Architecture/network ADR if transport boundary changes

## Completion record

**Implementation summary**

Durable Clouds identity unchanged (`globalCloudsIr` / `global-clouds-ir-v1`). Primary live authority is EUMETSAT EUMETView WMS 1.3.0 `mumi:worldcloudmap_ir108` (Geostationary Ring IR 10.8 µm): explicit TIME, EPSG:4326 full-world BBOX lat,lon, PNG 2048×1024, TRANSPARENT=TRUE. GIBS 3-sat Band13 remains an honest partial fallback under the same product. Selection prefers usable EUMET (coverage OK, observation age ≤ 8 h) over a newer GIBS partial. Freshness: EUMET ≤4 h recent / 4–8 h stale / >8 h suppress; GIBS ≤3 h / 3–6 h / >6 h. Catalog poll 45 min (PT3H cadence). Shared Rec.601 smoothstep 100→195 → RGB (248,250,252); EUMET only applies +12 luma lift first. Production `useFixtureFallback: false`. Physical illumination participation remains off. Browser `fetch` (CORS `*` on GET); no Tauri HTTP command; no new proxy. ADR 0006 unchanged.

**Commands run**

- EUMETView retest (curl, `all` network, ~23:45Z 2026-08-21): GetCapabilities + GetMap 2048×1024; GET and OPTIONS `Access-Control-Allow-Origin: *`; opaque ratio ~87.4%; Africa/Europe 100% opaque; polar transparent beyond ~±79.4°; ~1.84 MB / ~1.34 s
- `npx tsc --noEmit` — clean
- Focused Clouds tests — passed
- `npm test` — 262 files / 2459 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-CAV8ZEQI.js`); `scenario=clouds` / `clouds-presentation-dev` / `visualScenarios` absent from `dist/`; `view.eumetsat.int` / `worldcloudmap_ir108` / GIBS strings present as expected

**Actual results**

Transport A: ordinary SPA `fetch` from `http://localhost:1420` GetCapabilities succeeded (HTTP 200, CORS not blocked). `src-tauri` still only `greet`. GetMap always includes TIME. `validTimeMs` is provider observation TIME. Africa/Europe covered on the global source; polar holes stay transparent. No synthetic gap fill. No user-facing provider selector. Clouds ON/OFF and provider switch do not change the illumination raster (tests). Historical Demo still live-only suppressed.

**Visual verification**

Cursor Browser on `http://localhost:1420` (inner pane **774×769 CSS px**, dpr ~1.30 — not canonical 1920×1080). Session ~00:08–00:15 UTC 2026-08-22 (HUD 8:08–8:10 PM local 21 Aug 2026).

Ordinary live (no `?scenario=`): Clouds already on from session config. Status **Clouds · global mosaic · observed 3h ago · polar gaps**. Layers → Weather: Cloud opacity **0.42**; attribution “Contains modified EUMETSAT Meteosat Geostationary Ring IR 10.8 µm data. NASA GIBS Band 13 when using partial fallback.” No NASA vs EUMETSAT control. Map: white/gray IR clouds over Americas, Atlantic, Africa, Europe, Asia, Oceania; polar edges transparent (not black); night-side clouds remain; grid, city pins, earthquakes, ISS, eclipse footprint, product clock readable. Africa/Europe hole from WEATHER-1 is gone.

Historical Demo 2017-08-21 with demo time enabled: HUD **August 21 2017, 6:50 PM**; clouds gone; status **Live-only data is hidden while viewing another product time**; Clouds checkbox stayed on. Disable demo time restored **Clouds · global mosaic · observed 3h ago · polar gaps** without re-checking.

`?scenario=clouds` banner `2026-08-21T20:40:00.000Z`, persistence isolated, status **Clouds (DEV fixture)** (not live). Fixture fills Africa/Europe; polar holes remain transparent. Illumination topic: “Clouds are informational and do not participate in physical illumination.” No participation control.

SPA-origin GetCapabilities fetch from the same tab: HTTP 200, `worldcloudmap_ir108` present, ~650 ms.

**Not verified**

Canonical 1920×1080 viewport. Live in-app Network timing of the production GetMap (curl + SPA GetCapabilities used instead). Forced EUMET→GIBS→EUMET failover in the Browser (unit tests in `weather2CloudsCoverage.test.ts` cover selection/recovery). Tauri desktop binary (no HTTP command exists; same `fetch` path as the SPA). Pixel-level photometric comparison of EUMET vs GIBS density. Canvas paint microseconds / per-snapshot heap. External EUMETSAT licence counsel beyond the published visualisation-WMS / attribution reading.

**Discovered, not done**

GIBS-fallback-specific 10-minute poll (Clouds remains one catalog timer at 45 min; fallback still tries EUMET first each cycle). Polar LEO gap-fill. GeoColor / visible-IR hybrid. Scientific CTT layer. Historical TIME. Physical optical-depth illumination. Radar/wind/lightning/severe/hurricanes. Weather Event Playback. Dual-cadence timer when living on GIBS fallback. LIB-037, LIB-058, LIB-061, LIB-062 stay proposed.
