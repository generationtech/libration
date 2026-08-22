# LIB-067 — Weather-4.1: Clouds coverage-mask authority replacement

| Field | Value |
|-------|-------|
| ID | LIB-067 |
| Status | complete |
| Created | 2026-08-21 |
| Approved | 2026-08-21 (human; this request) |
| Completed | 2026-08-21 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-4.1. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, LIB-062, or LIB-066.

WEATHER-4 / [LIB-066](LIB-066-weather-4-cloud-mosaic-seam-investigation.md) proved that Clouds composition treats derived cloud-highlight alpha as source coverage. This item implements the coverage-authority repair. WEATHER-3 freshness-over-synchronization remains.

## Objective

Separate “this source has valid observation coverage here” from “this source wants to paint visible cloud here.” A valid source must own its selected footprint even when derived cloud signal is zero, so older ring or regional cloud cannot leak through a newer clear observation.

## Scope

**In scope**

- Per-source `coverageMask` distinct from `cloudSignal`.
- Provider alpha as coverage/no-data authority.
- Valid-clear regional observation replaces ring and earlier regional cloud (including zero signal).
- Ring remains a true backstop only where no selected regional has coverage.
- Regional overlap still uses WEATHER-3 freshness hysteresis / stable order, applied to coverage not highlight alpha.
- Replace-not-accumulate composition; one composed raster; one `imageBlit`.
- DEV coverage-authority diagnostic (not highlight-alpha footprints).
- Tests, visual verification, proportional docs.

**Out of scope**

- Overlap feathering, radiometric retuning, limb-saturation filtering, viewing-angle weighting.
- Cloud wash / smoothstep 100→195 redesign, visible+IR hybrid, optical-depth illumination, polar LEO fill.
- Freshness thresholds, poll cadence, source hierarchy, hysteresis, IR transfer, factory opacity.
- User coverage/ring/authority controls. Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-065](LIB-065-weather-3-high-cadence-best-current-cloud-composition.md)
- [LIB-066](LIB-066-weather-4-cloud-mosaic-seam-investigation.md)

## Acceptance criteria

See the authorizing WEATHER-4.1 completion criteria (coverage ≠ cloud signal; clear regional suppresses ring and earlier regional; no-data still falls back to ring; no additive overlap; heterogeneous times retained; no feathering/curve/opacity/priority change; Caribbean/Atlantic/Greenwich materially improved; ring ghost leak zero by construction; illumination and Historical Demo unchanged; tests/docs/state complete).

## Verification plan

- Focused tests: ghost-cloud, earlier-regional ghost, ring backstop, non-additive signal, multi-regional overlap, coverage vs signal, Greenwich stripe class, seam-metric bounds, WEATHER-3 heterogeneous times
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV coverage/sector debug
- Visual verification: required — Atlantic/Caribbean/Greenwich, clear-over-ring, cloudy region preserved, full world, other layers, illumination ON/OFF, Historical Demo, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md) consequence text if coverage-vs-signal is durable (no new ADR)

## Completion record

**Implementation summary**

Clouds composition now keeps a per-sector `Uint8` coverage mask (provider alpha > 0) separate from derived cloud-highlight RGBA. Later selected coverage replaces the destination including cloud signal 0 (authoritative clear). The EUMET ring fills only where no selected regional has coverage. IR transfer, opacity 0.42, freshness, hysteresis, and heterogeneous observation times are unchanged. DEV `?cloudsSectorDebug=1` tints coverage-authority footprints (`signal` / `leak` optional). No new ADR; [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md) consequence text now states coverage ≠ derived display alpha.

**Commands run**

- `npx tsc --noEmit` — clean
- Focused Clouds tests (`weather41CloudsCoverageAuthority`, `weather3CloudsComposition`, `weather1`, `weather2`, sector debug, visual scenarios) — 105 passed
- `npm test` — 265 files / 2496 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-Cv9XXP_8.js`); `cloudsSectorDebug` / `visualScenarios` / `scenario=clouds` absent from `dist/`
- Live WMS diagnostic (not in git): East/West `2026-08-22T02:10Z`, Himawari `02:00Z`, MSG `02:15Z`, ring `00:00Z`. Coverage plane 2,097,152 bytes/sector. Compose 32.8 ms. East-through-clear-MSG leftover Caribbean 89.1%→0%, Atlantic 71.9%→0%. Pairwise ring-ghost leak is 0 by construction.

**Actual results**

Valid-clear regional coverage zeros older ring and earlier regional cloud. No-data still falls back to the ring. Semi-transparent cloud signal replaces, it does not add. Greenwich earlier-source limb class: later valid-clear MSG owns the pixel (this capture East highlight at 6.06°E 18°N was already 0; old leftover alpha 3 → authority 0). MSG’s own saturated western rim may remain when MSG is the winner. Heterogeneous times retained (East 20:50 / West 20:40 / Meteosat 20:30 / Himawari 20:40 test). No feathering, curve, opacity, or source-priority change.

**Visual verification**

Cursor Browser on `http://localhost:1420` (inner pane **774×769 CSS px**, canvas bitmap 964×998). Session ~02:53–02:57 UTC 22 Aug 2026 (HUD 10:53–10:56 PM local 21 Aug 2026).

Ordinary live: Clouds on. **Clouds · observations 24–54 min old**. Weather: opacity **0.42**; GOES-West **44 min**, GOES-East **44 min**, Meteosat **24 min**, Himawari **54 min** (ring not listed). Grid, city pins, earthquakes, ISS, eclipse info, product clock coexist. Illumination: “Clouds are informational and do not participate in physical illumination.” No participation control.

`?cloudsSectorDebug=1`: coverage-authority tints (GOES-West sample cyan-ish); status **Clouds · observations 27–47 min old**.

Historical Demo 2017-08-21 paused: **Live-only data is hidden while viewing another product time.** Clouds checkbox stayed on. Disable demo restored **Clouds · observations 28–48 min old**.

`?scenario=clouds`: status **Clouds (DEV fixture)** (not live).

**Not verified**

Canonical 1920×1080 viewport. Re-running LIB-066’s exact Caribbean/Atlantic mean-|Δalpha| seam-ratio diagnostic on this capture (leftover-fraction is the metric recorded here). Canvas `drawImage` upsample of a 1 px selected-source MSG limb. Pixel-identical illumination raster ON vs OFF (copy and forced-off participation verified). Tauri binary. External licence counsel.

**Discovered, not done**

Overlap feathering in dual-coverage interiors. Radiometric normalization / smoothstep wash. GEO limb-saturation filtering for the selected source. Viewing-angle quality weighting. Polar LEO fill. GeoColor / optical-depth illumination. LIB-037, LIB-058, LIB-061, LIB-062, LIB-066 stay proposed.
