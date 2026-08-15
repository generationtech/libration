# LIB-014 — Solar eclipse event truth and live geographic footprint

| Field | Value |
|-------|-------|
| ID | LIB-014 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized first Eclipse System implementation slice (E1). Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not implement E2+ (forecast, lunar eclipses, beam, reference-city circumstances, labels).

## Objective

At an arbitrary authoritative Libration product UTC during a known solar eclipse, Libration resolves the NASA/Espenak–Meeus solar eclipse event and renders scientifically credible live geographic eclipse geometry on the world map.

## Scope

**In scope**

- Development-time ingest of NASA GSFC Five Millennium Canon/Catalog solar Besselian elements for 1900-01-01T00:00:00.000Z ≤ T < 2101-01-01T00:00:00.000Z.
- Versioned, provenance-bearing bundled authority asset; deterministic regeneration; no runtime network.
- `EclipseAuthority` + minimal `EclipseEventService` for support-span checks, event-by-id, and active solar event at product UTC.
- Besselian polynomial evaluation and standard Besselian-to-geographic reduction (central point, centerline, totality/annularity band, partial footprint).
- Production solar-eclipse presentation layer through existing scene/`RenderPlan` architecture.
- Minimal durable controls: master enable (default off); central line / central band / partial region (default on when the layer is enabled).
- DEV visual scenarios for total, annular, partial, and a dateline-sensitive event, using the production implementation.
- Focused tests, type-check, full suite, build, and Cursor visual verification.

**Out of scope**

- Forecast window, upcoming-event rendering, imminent state.
- Lunar eclipses, reference-city circumstances, local contacts, magnitude/obscuration UI.
- Eclipse labels, event list, Mars Attacks beam, Sun/Moon authority snapping.
- Style customization beyond a restrained initial production treatment.
- Generic Astronomical Events framework; lunar horizon overlay; lunar nodes.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant; no network in the render path.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0003](../decisions/0003-bundled-base-map-catalog-with-durable-family-ids.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md).
- Intended structure and selected authority: [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) §22.
- Product intent: [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md#eclipse-system).
- Predecessors: [LIB-012](LIB-012-eclipse-system-architecture.md), [LIB-013](LIB-013-eclipse-authority-evaluation.md).
- Visual verification: [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Acceptance criteria

- NASA-derived solar eclipse authority is bundled offline for 1900–2100 with durable provenance/version metadata.
- Ingest/regeneration is deterministic and documented; runtime never fetches eclipse authority.
- Authority distinguishes total, annular, partial, and preserves hybrid if present.
- Outside-span state is explicitly unsupported and is not collapsed into “no eclipse.”
- Active solar event resolves at arbitrary product UTC (`TimeContext.now`); paused demo is stable; accelerated demo progresses geography.
- Besselian evaluation and geographic reduction meet LIB-013 tolerances against NASA fixtures.
- Total/annular events show central line and central band; partial-only events show partial footprint without fabricating a central band.
- Dateline/world-wrap and polar/difficult geometry are not obviously broken.
- Canvas knows no eclipse astronomy; `RenderPlan` remains the rendering boundary.
- Initial durable solar-eclipse controls exist; defaults documented.
- DEV scenarios use the production layer; production bundle contains no DEV-only scenario selectors.
- No E2+ work is implemented.

## Verification plan

- Focused tests: authority ingest/provenance, lookup, Besselian evaluation, geographic geometry, time, config, RenderPlan, production containment
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — new bundled asset, layer, and Vite entry wiring
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) for maintained eclipse scenarios plus accelerated-demo progression and pause

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — now-real production eclipse flow.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — E1 decisions now implemented.
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — eclipse scenario catalog.
- [`docs/ROADMAP.md`](../ROADMAP.md) — E1 no longer pending.
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — implementation pointer only if product intent is unchanged.
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: evaluate whether the implemented authority boundary merits a record.

## Completion record

**Implementation summary**

Bundled NASA/Espenak–Meeus solar Besselian authority (v1, 454 events, 1900–2100) with deterministic `eclipse:prep` ingest. Runtime resolves the active solar event at product UTC, evaluates polynomials, reduces to geographic live footprint, and draws through a generic `equirectRegionOverlay` / `RenderPlan` path. Master Solar eclipses control defaults off; central line / band / partial default on. DEV scenarios use the production layer. No E2+ work.

**Commands run**

- `npx tsc --noEmit` — clean
- Focused eclipse/config/scenario tests — 33 + 177 related passed during development
- `npm test` — 180 files / 1662 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-DCoRvgrd.js` 964.34 kB). `solar-eclipse-total` / `visualScenarios` absent from `dist/`
- Cursor Browser visual verification of the four eclipse scenarios plus accelerated demo and ordinary startup

**Actual results**

Authority `nasa-espenak-meeus-5mcse-solar` v1; SHA-256 pin `44460be3ed5a5c69a7627af6ffa875c82c70872f067e2907d20b49068e792b44`; 140 total / 146 annular / 155 partial / 13 hybrid. Geographic errors vs the same NASA dump: 2024-04-08 0.26 km / +0.99 km width; 2023-10-14 0.25 km / +1.96 km; 2016-03-09 0.25 km; 2021-12-04 0.17 km; 2022-10-25 limb 18.2 km (no central band). Lookup 1000 instants < 50 ms; first geometry eval ~12 ms (centerline cache), then ~2 ms/eval.

**Visual verification**

Viewport: `Emulation.setDeviceMetricsOverride` 1920×1080; canvas typically 1888×1079 CSS px (first paint of total was briefly ~673×770 until layout settled). Limitation: Cursor Browser panel is not a guaranteed 1920×1080 physical window.

```text
URL: http://localhost:1420/?scenario=solar-eclipse-total
Viewport: requested 1920×1080; canvas 1888×1079 after layout
Scenario banner: solar-eclipse-total · 2024-04-08T18:17:15.000Z · persistence isolated
Observations: violet partial disk over Pacific/North America; light centerline Mexico → US → Canada; compact live umbra on the path; overlay distinct from solar shading; Sun/Moon glyphs nearby but not on the umbra. Map readable. No map-spanning fill.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-annular
Viewport: canvas 1888×1079
Scenario banner: solar-eclipse-annular · 2023-10-14T17:59:27.300Z · persistence isolated
Observations: same machinery; centerline Oregon/US/Central America/Brazil; partial violet; small warm-amber antumbra blob (canvas sample: amber pixels present vs large violet partial). Not styled as totality.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-partial
Viewport: canvas 1888×1079
Scenario banner: solar-eclipse-partial · 2022-10-25T11:00:06.900Z · persistence isolated
Observations: violet partial region only; no centerline; no central band.
```

```text
URL: http://localhost:1420/?scenario=solar-eclipse-dateline
Viewport: canvas 1888×1079
Scenario banner: solar-eclipse-dateline · 2016-03-09T01:57:09.400Z · persistence isolated
Observations: Pacific total; centerline coherent; no giant cross-map fill or inverted band.
```

Accelerated demo (Data tab, speed 3600×) on the 2024 total: after resume the live umbra moved from the Mexico/Pacific segment of the path to the Great Lakes / northeastern US–Canada segment. Pause was requested; geometry remained an eclipse footprint rather than vanishing. Ordinary `http://localhost:1420/` had no scenario banner.

**Not verified**

- Dedicated visual scene for 2021-12-04 polar total (automated 0.17 km; no DEV scenario).
- Pixel-exact NASA printed-map corridor (E1 draws live umbra at T plus a full-event centerline, not a static path-width fill).
- Exact 1920×1080 physical browser chrome; closest controllable layout used.

**Discovered, not done**

- At full-world scale the live umbra/antumbra is a compact oval (~path width, a few pixels). The Mexico–Canada “band” impression comes mainly from the centerline. A NASA-style static path corridor would be later presentation work (E6), not an authority defect.
- Ambient Sun/Moon glyphs remain visualization-grade and sit near, not on, the umbra (expected; LIB-013). Not misleading enough to snap in E1.
- Forecast window, lunar eclipses, beam, labels, reference-city circumstances: E2+.

