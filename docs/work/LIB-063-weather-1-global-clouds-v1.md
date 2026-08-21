# LIB-063 — Weather-1: global near-current Clouds v1

| Field | Value |
|-------|-------|
| ID | LIB-063 |
| Status | complete |
| Created | 2026-08-21 |
| Approved | 2026-08-21 (human; this request) |
| Completed | 2026-08-21 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-1. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, or LIB-062.

Product direction comes from proposed [LIB-062](LIB-062-weather-architecture-and-global-clouds-v1-investigation.md). The black-screen diagnosis in proposed [LIB-061](LIB-061-global-clouds-ir-end-to-end-investigation.md) remains valid; do **not** repair MODIS CTT as the default Clouds product.

## Objective

Replace the broken user-facing Global clouds / IR experience with **Clouds**: a recent, intuitive, day/night-capable IR-derived cloud overlay on the existing dynamic-data lifecycle, with honest observation time, provenance, and partial coverage.

## Scope

**In scope**

- Reuse `DynamicSnapshotRecord`, catalogs, acquisition, resolver, `equirectRaster`, materializers, and RenderPlan `imageBlit`. No parallel Weather store or second clock.
- NASA GIBS WMS stack: GOES-East + GOES-West + Himawari Band13 Clean Infrared; explicit TIME; PNG + alpha; local IR→white/gray cloud-highlight materializer.
- Product time vs observation time vs acquisition time: `validTimeMs` = mosaic TIME, `acquiredAtMs` = fetch time, product time stays `TimeContext.now`.
- Production: no fixture-as-live; first failure unavailable; last-good live may stay stale within policy; >6 h observation suppresses.
- Layers master rename to **Clouds**; new Layers → **Weather** topic (Clouds opacity + status only). Physical cloud illumination participation forced off / non-operative.
- DEV `?scenario=clouds` fixture, labeled as fixture. Focused tests, visual verification, proportional docs. ADR if the three-time observational rule is a durable invariant.

**Out of scope**

- EUMETSAT / Meteosat / Africa–Europe gap fill (WEATHER-2).
- GeoColor, visible/IR hybrid, scientific CTT mode, historical GIBS TIME querying.
- Radar, wind, lightning, severe weather, tropical cyclones, Weather Event Playback, lower-left weather alerts.
- Parallel Weather snapshot store, second clock, empty Weather sections.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one product UTC instant; no network in the render path; backends do not decide product behaviour.
- [ADR 0002](../decisions/0002-single-upstream-planetary-illumination-rasterpatch.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md), [ADR 0019](../decisions/0019-domain-event-playback-belongs-to-data.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- ISS/earthquake provenance ([LIB-036](LIB-036-iss-live-provenance-freshness-and-fallback.md), [LIB-059](LIB-059-earthquake-live-presentation-and-provenance.md))

## Design notes

Preserve durable `sourceId` `global-clouds-ir-v1` and scene id `globalCloudsIr`. User-facing label becomes Clouds. Factory master remains **off**.

Clouds v1 is Model B overlay only. IR display brightness is not cloud optical depth; illumination participation must not attenuate sunlight or moonlight.

## Acceptance criteria

See the authorizing WEATHER-1 completion criteria (user-facing Clouds; GIBS Band13 stack; explicit TIME; PNG alpha; observation-age freshness; no production fixture-as-live; partial coverage honest; illumination raster unchanged by Clouds ON/OFF; historical Demo suppresses; docs/state complete).

## Verification plan

- Focused tests: TIME authority, PNG/alpha, coverage, IR transfer, provenance, no physical attenuation, config migration
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV scenario ids / diagnostic transfer selectors
- Visual verification: required — live GIBS if available, plus DEV `?scenario=clouds`, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) and/or ADR if observation-time semantics become a durable system boundary

## Completion record

**Implementation summary**

User-facing **Clouds** on durable `global-clouds-ir-v1`. NASA GIBS WMS 1.1.1 stacks GOES-West, GOES-East, Himawari Band13 Clean Infrared as transparent PNG 2048×1024 with explicit `TIME`. Common mosaic TIME is the earliest of the three GetCapabilities defaults, then walk-back 10-minute slots (max 18). `validTimeMs` = observation TIME; `acquiredAtMs` = fetch time. Freshness uses observation age (≤3 h recent / 3–6 h stale / >6 h suppress). Production `useFixtureFallback: false`. IR→cloud-highlight Rec.601 luma smoothstep 100→195 to RGB `(248, 250, 252)`. Factory opacity **0.42**. Physical illumination participation forced off. Layers → Weather after Earthquakes. DEV `?scenario=clouds`. ADR 0022.

**Commands run**

- `npx tsc --noEmit` — clean
- `npm test` — 261 files / 2443 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-CFvp1d3O.js`); `scenario=clouds` / `clouds-presentation-dev` / `visualScenarios` absent from `dist/`; GIBS layer names present as expected

**Actual results**

GetMap always includes `TIME`. Production never paints fixture as live. Partial coverage (`coverageKind: partial`) with Africa/Europe/polar holes remaining transparent. Clouds ON/OFF does not change the illumination raster. Historical Demo suppresses; return to now restores.

**Visual verification**

Cursor Browser on `http://localhost:1420` (inner pane, not canonical 1920×1080). Wall ~22:46 UTC 2026-08-21.

Ordinary live: enable Clouds → “Clouds loading…” → **Clouds · observed 2h ago · partial coverage**. GIBS defaults East/West `2026-08-21T20:40:00Z`, Himawari `2026-08-21T20:30:00Z` → first selected mosaic **20:30 UTC**. Independent curl GetMap of that TIME: HTTP 200 PNG **2,212,055 bytes** in **3.16 s**. A later 10-minute poll updated status to **Clouds · observed 80 min ago · partial coverage**. Map: white/gray translucent disks over Americas and Pacific/East Asia; Africa/Europe and polar holes transparent (not black, not inferred clear sky); night-side clouds remain; grid/city pins/earthquakes/ISS/eclipse footprint coexist. Factory opacity reset **0.42** (session had persisted 1.0). Illumination topic: “Clouds are informational and do not participate in physical illumination.” No participation control.

Historical Demo 2017-08-21 (paused): “Live-only data is hidden while viewing another product time.” Clouds checkbox stayed on. Return to now restored **Clouds · observed 2h ago · partial coverage**.

`?scenario=clouds` banner `2026-08-21T20:40:00.000Z`, persistence isolated, status **Clouds (DEV fixture)**. Fixture overlay with the same partial-coverage holes. Because wall clock was ~2 h after the frozen product UTC, the live-only hint also appeared; the fixture still painted and was labeled fixture.

**Not verified**

Canonical 1920×1080 viewport. In-browser Network timing of the app’s own GetMap (curl used instead). Pixel-level photometric seam equalization. Forced first-fail / later-fail GIBS in the Browser (unit/integration tests cover provenance). External GIBS raw vs Libration geographic comparison beyond gross disk placement. Canvas paint microseconds / per-snapshot heap.

**Discovered, not done**

WEATHER-2 Africa/Europe/polar coverage (EUMETSAT). GeoColor / visible-IR hybrid. Scientific CTT layer. Historical GIBS TIME. Physical optical-depth illumination. Radar/wind/lightning/severe/hurricanes. Weather Event Playback. Global snapshot-store eviction beyond Clouds’ ~4 in-memory versions. LIB-037, LIB-058, LIB-061, LIB-062 stay proposed.
