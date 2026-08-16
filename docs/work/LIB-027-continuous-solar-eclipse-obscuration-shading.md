# LIB-027 — Continuous solar-eclipse obscuration shading

| Field | Value |
|-------|-------|
| ID | LIB-027 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not regenerate README media.

LIB-024 remains approved and paused: ground-position marker is in the tree; README recapture waits for an explicit later request.

## Objective

Replace the active solar eclipse’s flat live-partial fill with a continuous, physically grounded local-obscuration field that attenuates daylight in the planetary illumination raster. Forecast geography stays informational teal; the active eclipse should read as sunlight being removed.

## Scope

**In scope**

- Reuse E4/Besselian local-circumstance geometry for instantaneous local solar-disc obscuration (area fraction).
- Active-only geographic obscuration field with horizon gating; compose into existing illumination `rasterPatch`.
- Nonlinear visual transmission mapping; Subtle / Normal / Dramatic intensity tokens; default ON / Normal.
- Physical attenuation independent of the Solar eclipses overlay master; gated with ordinary solar shading.
- Retire competing active teal live-partial fill by default; keep upcoming forecast partial; optional restrained live boundary.
- Config persistence, focused tests, Cursor Browser verification, proportional docs, ADR if the illumination boundary is adopted.
- 2017 time-series probes, GE cross-track profile, annular / partial-only / hybrid / dateline / polar regressions.

**Out of scope**

- Atmospheric radiative transfer, corona, sky color, Purkinje, shadow bands, refraction.
- New ephemeris, network, workers, README/media, animation.
- Completing LIB-024 README recapture.
- Commits, pushes, tags, branches, or releases.
- Fake centerline-distance darkness if real obscuration can be computed.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one `rasterPatch` for illumination.
- [ADR 0002](../decisions/0002-single-upstream-planetary-illumination-rasterpatch.md), [ADR 0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md).
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md).
- Predecessors: [LIB-014](LIB-014-solar-eclipse-live-footprint.md) … [LIB-026](LIB-026-solar-eclipse-visual-semantics-reconciliation.md).

## Acceptance criteria

- Active broad eclipse darkening derives from continuous local obscuration using bundled Besselian geometry.
- E4 local circumstances and the map field share the same obscuration math; reference-city agreement within grid tolerance.
- Effect is zero outside physical eclipse visibility and does not darken the night side.
- Upcoming forecast teal remains informational; active teal flat fill does not compete by default.
- Compact umbra/antumbra, vermilion marker, gold beam, and violet corridor remain distinct and readable.
- 2017 shading evolves continuously (probes + GE transect + stations A–F + playback).
- Annular center stays incomplete; partial-only is explained by the field alone; hybrid/dateline/polar remain coherent.
- Normal is clearly stronger than the former 0.16 teal fill; Dramatic is strong but not night-like at moderate obscuration.
- Performance suitable for ambient display; same UTC deterministic; Canvas astronomy-neutral; runtime offline.
- Type-check, full suite, and production build pass. No README/media. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: obscurationAt, field profile/continuity, E4 agreement, illumination integration, config, lifecycle/visual-family regressions
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production must exclude DEV scenario machinery
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — remove fulfilled ambient solar-shading bullet
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: evaluate; expected if illumination independence is adopted.

## Completion record

**Implementation summary**

Active solar eclipses no longer use a flat teal live-partial fill. Instantaneous local solar-disc *area* obscuration is computed from the same Besselian observer-plane identities as E4 (`Rs=(L1'+L2')/2`, `Rm=(L1'−L2')/2`, circle-overlap fraction), sampled on a 288×145 (~1.25°) equirect grid, bilinearly interpolated, and mapped with `visualDarkening = maxDarken × obscuration^γ` (Normal 0.56/1.45; Subtle 0.34/1.7; Dramatic 0.74/1.22). Remaining daylight in `sampleIlluminationRgba8` is multiplied by that transmission. Below-horizon samples are 0. Upcoming events stay informational teal; completed events contribute nothing. Physical attenuation follows solar shading even when Solar eclipses overlays are hidden ([ADR 0012](../decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md)). Compact umbra, vermilion marker, gold beam, and violet corridor remain overlay families. No live-partial outline: a closed-ring stroke unwrapped to a world-spanning path. No README/media. LIB-024 remains paused.

**Commands run**

- Focused: `npx vitest run` on obscuration / field / appearance / shading / eclipse-layer / lifecycle / visual-semantics / illumination-plan / illuminationShading / workingV2Commit / sceneConfig tests
- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npx tsx -e` probe/E4/field-cost measurement (not committed)
- Cursor Browser visual inspection of 2017 A–F, post-central, after, GE Normal and Dramatic, overlay-off, annular, partial-only, dateline, ordinary startup

**Actual results**

- Focused: 11 files / 244 passed
- `npx tsc --noEmit` clean
- `npm test`: 205 files / 1938 passed / 0 failed
- `npm run build` succeeded; `dist/` contains no `solar-eclipse-2017` / `eclipseStation` / `visualScenarios`
- 2017 2-minute probe maxima: Oregon 1.000 @ 17:20Z; Nebraska 1.000 @ 17:58Z; Kentucky 1.000 @ 18:24Z; Knoxville 0.9986 @ 18:34Z; New York 0.7155 @ 18:44Z; Africa control 0
- E4 Knoxville 2017 exact agreement 1e-9 (both 0.99881888…); GE field vs exact at Knoxville 0.8933 vs 0.8946 (Δ 0.0013)
- Field: 288×145 = 41 760 samples, 167 040 bytes Float32; warmed build 10.88 ms; cache hit 0.025 ms
- Normal darkening at obscuration 0.50 = 0.205 (stronger than former 0.16 teal); Dramatic 0.50 = 0.318; Dramatic 0.97 = 0.713

**Visual verification**

- App: `npm run dev` at http://localhost:1420; Cursor Browser; `Emulation.setDeviceMetricsOverride` 1920×1080; innerWidth 1920×1080; canvas bitmap ~1888×1079 / CSS ~1889×1080
- Diagnosis config: Solar shading ON, Active eclipse shading ON, intensity Normal (factory), Event labels OFF, Extra Large Moon, Large vermilion marker; scenario Alignment Dramatic (Normal shading inspected A–F/GE; Dramatic shading+alignment inspected at GE)
- A `14:42:59Z`: corridor + informational teal forecast partial; ordinary Pacific night; no physical eclipse field; no marker/beam/umbra
- B `15:56:19Z`: continuous dark field over Pacific approaching the west coast; corridor visible; terminator distinct; no marker; no targeted beam; no umbra on Earth
- C `17:05:58Z`: dark field already present; vermilion marker Pacific NW; compact umbra; gold beam; corridor unchanged; no teal live fill
- D `17:52:57Z`: dark field over central US; marker on path; gold beam to Moon glyph; corridor limits readable
- E `18:36:03Z`: dark field over eastern US; marker near KY/TN; beam and corridor readable
- F `19:55:15Z`: field continues toward Atlantic; marker near path end; corridor remains
- `postCentral` `20:21Z`: field continues over eastern US/Atlantic; corridor remains; vermilion marker gone (Moon glyph remains)
- `after` `21:10Z`: no eclipse overlays; no event panel; Pacific darkness is ordinary night
- GE Normal: charcoal daylight attenuation, not a teal polygon; compact umbra/marker/beam/corridor distinct
- GE Dramatic + Dramatic alignment: stronger field, still readable; basemap visible
- Overlay off / shading on at GE: field remains; corridor/marker/beam gone
- `solar-eclipse-annular`: dark field, incomplete center, antumbra/marker/beam/corridor, no totality black
- `solar-eclipse-partial`: dark field on the Europe/Atlantic side of the Americas crop; no corridor/marker/targeted beam/umbra
- `solar-eclipse-dateline`: one Pacific dark field; corridor from the west; no double-darken / world-spanning polygon
- Ordinary `http://localhost:1420/`: title Libration, no scenario banner
- Result: PASS

**Not verified**

- Pixel-golden screenshots
- Exact 1920×1080 CSS canvas vs device-metrics override (inner 1920×1080; canvas CSS width ~1889)
- Polar 2021-12-04 visually (automated finite/continuity tests passed; demo-time entry did not accept 2:34 AM in this session; no DEV polar scenario)
- Hybrid 2023-04-20 visually (automated 2-minute central-point continuity passed)
- Continuous 400× Cursor playback from upcoming (Resume did not advance product UTC in this session; station A–F plus post/after cover the progression)
- Pause-freeze of the field during an active eclipse (product UTC freeze is existing demo transport; not separately exercised)
- Exact last-central ±60 s and global-end ±60 s frames in the browser (automated; visual used F, `postCentral` 20:21Z, `after` 21:10Z)

**Discovered, not done**

- LIB-024 README recapture remains deferred until an explicit later request.
- Event-information geography legend still lists configured families (including forecast partial / live central) while they are not drawn; not this item’s overlay-copy surface.
- A thin live-partial outline was rejected: closed-ring stroke unwrapped to a world-spanning path (LIB-026-class wrap).
- Atmospheric color, corona, refraction, and photometric lux remain out of scope.
