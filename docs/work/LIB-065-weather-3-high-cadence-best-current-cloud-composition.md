# LIB-065 — Weather-3: high-cadence best-current cloud composition

| Field | Value |
|-------|-------|
| ID | LIB-065 |
| Status | complete |
| Created | 2026-08-21 |
| Approved | 2026-08-21 (human; this request) |
| Completed | 2026-08-21 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-3. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, or LIB-062.

WEATHER-2 / [LIB-064](LIB-064-weather-2-global-cloud-coverage.md) is complete. Product direction: freshness outranks temporal uniformity. This item also formalizes that doctrine for future radar/wind/lightning/tropical/severe work.

## Objective

Evolve Clouds from a single-time global mosaic into a continuously refreshed best-current observational composition: each geographic satellite sector uses its freshest authoritative observation independently; EUMET’s global ring remains a coverage backstop; status reports the visible observation-age range honestly.

## Scope

**In scope**

- Formalize Weather freshness-over-synchronization (architecture + ADR).
- Investigate and, if viable, compose freshest per-sector geostationary IR (GOES-East, GOES-West, Meteosat, Himawari) with EUMET `mumi:worldcloudmap_ir108` as backstop.
- Composite observation model on existing `DynamicSnapshotRecord` / prepared-view types (no parallel Weather store).
- Independent per-sector observation times, freshness, polling, atomic updates, overlap/fallback policy, composite status age range.
- Keep WEATHER-1/2 presentation (white/gray IR, opacity, informational only). Tests, visual verification, proportional docs.

**Out of scope**

- Temporal interpolation, motion-warping, nowcasting, GeoColor/visible-IR hybrid, polar LEO fill unless already trivial.
- Radar, lightning, wind, tropical, severe implementation (document future contracts only).
- User source selector, sync-mode toggle, historical mosaic reconstruction, Weather Event Playback.
- Physical cloud illumination. Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one product UTC instant; no network in the render path; backends do not decide product behaviour; persist durable ids.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0006](../decisions/0006-browser-first-spa-with-non-load-bearing-tauri-shell.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md), [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)

## Design notes

Preserve durable `sourceId` `global-clouds-ir-v1` and scene id `globalCloudsIr`. A composed Clouds product may contain multiple observation times. Do not force `min(latestEast, latestWest, latestMeteosat, latestHimawari)` as a common GetMap TIME. Component snapshots retain provider, observation time, acquisition time, freshness, coverage, provenance. Product `validTimeMs` on the composed store record must not hide that range.

## Acceptance criteria

See the authorizing WEATHER-3 completion criteria (sector source investigation and choice; independent observation times; no forced common timestamp; independent sector updates; EUMET backstop; honest composite age range; no interpolation/nowcast; no source selector; illumination unchanged; bandwidth/performance recorded; tests/docs/state complete).

## Verification plan

- Focused tests: heterogeneous times (defining test), independent sector update, fallback, status range from visible components only, no illumination change, historical suppression
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV scenario ids / source-boundary debug strings
- Visual verification: required — global mosaic, ordinary white-cloud view, observation-age summary, sector update if practical, backstop/failover, day/night, other overlays, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- New ADR if freshness-over-synchronization is a durable architectural principle

## Completion record

**Implementation summary**

Clouds remains `globalCloudsIr` / `global-clouds-ir-v1`. Live authority is a best-current composition: independent GIBS Band13 GOES-East, GOES-West, and Himawari TIME slots; EUMETView `msg_fes:ir108` (PT15M) for Europe/Africa; EUMET `mumi:worldcloudmap_ir108` as coverage backstop. No common GetMap TIME. Product `validTimeMs` is the newest contributing observation; `body.cloudComposite` retains per-sector observation/acquisition times. Status reports the visible age range only. Source-local freshness (GIBS GEO ≤2/4 h, MSG FES ≤45 min/2 h, ring ≤4/8 h) and 8 min poll. Shared white/gray IR highlight; MSG FES +20 luma, ring +12. Physical illumination stays off. [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md).

**Commands run**

- Live source audit (curl, ~00:49–00:53Z 2026-08-22): GIBS GOES-East/West default TIME 23:40Z (~70 min lag, ~1.29 MB PNG, CORS `*`); Himawari 23:30Z; EUMET MSG FES `msg_fes:ir108` default 00:30Z (~20 min lag, ~858 KB); ring 00:00Z (~1.83 MB). STAR GeoColor latest ~10.8 MB JPEG / GOES projection — rejected. NICT Himawari tiles, not `ACAO *`. MTG palette PNG — rejected.
- `npx tsc --noEmit` — clean
- Focused Clouds / Layers / scenario tests — passed
- `npm test` — 263 files / 2471 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-ChlQiENs.js`); `cloudsSectorDebug` / `visualScenarios` / `scenario=clouds` / `clouds-presentation-dev` absent from `dist/`

**Actual results**

Each sector uses its own latest valid TIME. Defining test: East 20:50 / West 20:40 / Meteosat 20:30 / Himawari 20:40 — all four latest, not min()=20:30. Ring backstop fills missing regionals only. Status ages exclude unused ring. Composite does not feed physical illumination. Historical Demo still live-only suppressed. DEV `?cloudsSectorDebug=1` tints footprints (ordinary current time only). No source selector.

**Visual verification**

Cursor Browser on `http://localhost:1420` (inner pane **774×769 CSS px**). Session ~01:24–01:26 UTC 2026-08-22 (HUD 9:24 PM local 21 Aug 2026).

Ordinary live (no `?scenario=`): Clouds on. Layer masters status **Clouds · observations 25–55 min old**. Weather topic: opacity **0.42**; Observation times **GOES-West 25 min**, **GOES-East 55 min**, **Meteosat 25 min**, **Himawari 55 min** (ring not listed). Attribution EUMETSAT FES + ring and NASA GIBS Band 13. Map: white/gray IR over Americas/Atlantic/Africa/Europe/Asia/Oceania with visible sector seams; polar edges transparent; night-side clouds remain; grid, city pins, earthquakes, ISS, eclipse footprint, product clock readable. Illumination: “Clouds are informational and do not participate in physical illumination.” No participation control.

Historical Demo 2017-08-21: HUD **August 21 2017, 6:54 PM**; Layer masters **Live-only data is hidden while viewing another product time**; Clouds checkbox stayed on. Disable demo restored **Clouds · observations 27–57 min old**.

`?scenario=clouds` banner `2026-08-21T20:40:00.000Z`, persistence isolated, status **Clouds (DEV fixture)** (not live).

**Not verified**

Canonical 1920×1080 viewport. Waiting a full GEO publication slot in-browser for one live sector update (independent-update unit tests cover this). Forced per-sector failure/recovery in the Browser (unit tests in `weather3CloudsComposition.test.ts`). In-app Network MB/hour while left open (curl sizes used: first load ~6 MB; if every GEO slot updates, ~20–28 MB/h). Canvas paint microseconds / per-snapshot heap. Pixel-level photometric histogram matching. Tauri desktop binary. External licence counsel beyond published EUMETSAT visualisation-WMS and NASA Earthdata attribution readings.

**Discovered, not done**

Fresher NOAA STAR / NICT paths remain CORS-blocked or wrong projection/product class. Polar LEO gap-fill. GeoColor / visible-IR hybrid. Scientific CTT layer. Historical TIME mosaics. Physical optical-depth illumination. Radar/wind/lightning/severe/hurricanes (doctrine documented only). Weather Event Playback. LIB-037, LIB-058, LIB-061, LIB-062 stay proposed.
