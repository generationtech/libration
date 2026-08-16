# LIB-021 — Lunar eclipse visual reconciliation

| Field | Value |
|-------|-------|
| ID | LIB-021 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized post-LIB-020 eclipse presentation reconciliation. Authorized to create, approve, activate, implement, verify, and complete in the same request. This is not E7 and does not reopen eclipse astronomy. Do not commit, push, tag, branch, or release.

## Objective

Move dynamic eclipse event information out of Configuration into a compact lower-right map panel; attenuate ambient moonlight from authoritative lunar-eclipse coverage; replace whole-disc Moon tints with spatial Earth-shadow geometry; keep phase, libration, observer orientation, Moon size, and Moon-over-Sun ordering intact; and offset eclipse map labels that collide with Sun/Moon glyphs.

## Scope

**In scope**

- Relocate live event-information rows from Layers/Config into a dismissible lower-right eclipse information panel, reusing the existing projection and Event information toggle.
- Derive a continuous moonlight transmission scalar from E3 lunar disc/shadow coverage and apply it to the existing illumination plan without changing phase.
- Spatial penumbra/umbra treatment on the Moon glyph, with restrained red/brown totality emerging from umbral coverage.
- Tune the Moon-visible region fill so it does not masquerade as moonlight.
- Small deterministic glyph-avoidance offset for eclipse map labels.
- DEV `eclipsePhase=` stations on the existing 2022-05-16 lunar scenario; focused tests; type-check; full suite; build; Cursor visual verification; documentation.

**Out of scope**

- Atmospheric radiative transfer; Danjon color; terrain/refraction; generalized inspector; eclipse history/browser; notifications; generic Astronomical Events; symbolic maria; supermoon/perigee; lunar nodes; standalone Moon visibility overlay; standalone altitude/azimuth chrome; new authority sources; WebGL; broad collision engine.
- Reopening eclipse authority, event discovery, global/reference-city semantics, or the Eclipse System architecture unless a genuine defect requires it.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant; illumination composes into one `rasterPatch`.
- [ADR 0008](../decisions/0008-bundled-nasa-solar-eclipse-authority.md), [ADR 0009](../decisions/0009-cached-solar-eclipse-event-corridor.md), [ADR 0010](../decisions/0010-eclipse-events-global-circumstances-derived.md).
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md).
- Predecessor: [LIB-020](LIB-020-eclipse-reconciliation-and-lunar-forecast.md).
- Global event truth is never filtered by reference city. Canvas remains astronomy-neutral.

## Acceptance criteria

- Config/Layers contains only controls and helper copy; live Event/Date/magnitudes/geography rows are gone.
- Event information ON makes the lower-right panel available for upcoming/active solar and lunar events, including derived reference-city circumstances; OFF hides it. Labels and persistent status remain independent.
- Lunar eclipse attenuates ordinary moonlight continuously (penumbral slight, partial stronger, totality much darker); never brightens the night side; egress restores; phase value unchanged.
- Moon glyph shows spatial Earth-shadow (curved penumbra/umbra, bright uneclipsed region while partial); totality is restrained red/brown from coverage, not a flat state switch; libration readable; observer orientation and Moon size preserved; Moon paints above Sun.
- Event labels avoid Sun/Moon glyph halos with stable candidate order; labels OFF still emits none.
- Solar and lunar forecast/active behaviour remain green. Runtime stays offline. Documentation/state/log transaction complete. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: transmission, spatial shadow geometry, glyph draw order, info panel, label avoidance, solar/lunar regression
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — App overlay, scenarios, production containment
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: [0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) — lunar-eclipse moonlight attenuation is physical illumination, independent of informational overlays.

## Completion record

**Implementation summary**

Post-LIB-020 presentation reconciliation, not E7. Live Event/Date/magnitude rows left Layers; the same `buildEclipseEventInformation` projection now feeds a dismissible lower-right map panel gated by Event information. Ordinary moonlight is multiplied by a coverage-derived transmission scalar from E3 disc/shadow overlap (uneclipsed 1, penumbra-only 0.78, umbra 0.05), even when Lunar eclipses overlays are off ([ADR 0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md)). The Moon-visible fill is a dark informational overlay, not a light lift. Moon-glyph Earth-shadow is spatial (clipped penumbra gradient + umbra bite + coverage-scaled totality red in the same observer χ as libration). Map labels offset a Sun/Moon halo with a fixed candidate order. DEV `eclipsePhase=` stations on 2022-05-16.

**Commands run**

- Baseline before changes: `npm test` — 195 files / 1826 passed / 0 failed
- Focused: 11 files / 150 passed
- `npx tsc --noEmit` — clean (exit 0)
- `npm test` after changes — 199 files / 1851 passed / 0 failed
- `npm run build` — succeeded; `dist/assets/index-DIsJOxzY.js` 1,339.92 kB (gzip 324.29 kB); no `eclipsePhase` / `lunar-eclipse-total` in `dist/`
- Representative costs (`npx tsx`): disc coverage 0.18 µs; transmission including geometry rebuild 0.55 µs; label placement 0.46 µs; event-information projection including frame resolve 17 µs
- Cursor Browser at http://localhost:1420

**Actual results**

Type-check clean. Full suite green. Production bundle has no DEV scenario registry. Night-side canvas luminance at a stable Americas sample never rose as the 2022-05-16 eclipse progressed (pre 67.0 → penumbral 66.4 → partial 61.8 → totality 46.8 → egress 57.8). Tokyo vs Knoxville totality luminance identical (46.8). Config Layers has zero `data-eclipse-info-row` live rows.

**Visual verification**

Browser: Cursor built-in browser. Actual pane ~703×769 CSS (canonical 1920×1080 requested; CDP device-metrics override faked `innerWidth` without resizing the scene canvas, so inspection used the real pane). Persistence isolated on `?scenario=` URLs.

| Scenario | UTC | Inspected | Result |
|----------|-----|-----------|--------|
| `lunar-eclipse-total&eclipsePhase=pre` | `2022-05-16T01:20:00.000Z` | Upcoming panel (12m); forecast Moon-visible; HUD `Lunar eclipse · Total · in 12m`; lower-right panel present | Pre-P1 ordinary near-full Moon; panel not in Config |
| `…&eclipsePhase=penumbral` | `2022-05-16T02:00:00.000Z` | Active / Current phase Penumbral; night-side slightly darker | Subtle ingress; no brightening |
| `…&eclipsePhase=partial` | `2022-05-16T02:50:00.000Z` | Current phase Partial umbral; curved umbral bite; bright uneclipsed remainder; label off the Moon | Key spatial-shadow criterion |
| `…&eclipsePhase=total` | `2022-05-16T04:11:29.000Z` | Current phase Total; restrained red/brown; Knoxville visible; night strongly darker | Totality from coverage, not a flat switch |
| `…&eclipsePhase=egress` | `2022-05-16T05:20:00.000Z` | Partial umbral egress; moonlight recovering | Smooth reverse |
| `lunar-eclipse-total&observerCity=tokyo` | `2022-05-16T04:11:29.000Z` | Global Total unchanged; `Not visible from Tokyo`; HUD not-visible; night lum identical to Knoxville | Global-first; illumination independent of city |
| `lunar-eclipse-forecast-total` | `2022-05-13T04:00:00.000Z` | Upcoming panel; Layers controls-only (no Event/Date/magnitude rows); Event information OFF removes overlay; labels remain | Config cleanup + toggle |
| same, Config open | same | Overlay class `--config-open`; panel shifted left of Config | Deliberate offset, not hide-behind |
| `solar-eclipse-forecast` | `2024-04-03T18:00:00.000Z` | Upcoming total; forecast path; Knoxville local Partial; label off glyphs | Solar panel |
| `solar-eclipse-total` | `2024-04-08T18:17:15.000Z` | Active; Current shadow Totality; alignment; Knoxville partial | Solar live |
| Hide then chip | totality | Hide → “Eclipse info” chip; chip restores panel | Dismissible |

**Not verified**

- Exact CSS 1920×1080 scene canvas in this Cursor pane (limitation recorded). At ~703×769 the offset-left panel can sit nearer the lower-left HUD when Config is open.
- Close-up Moon-over-Sun glyph overlap in Browser (ordering covered by plan tests).
- `eclipsePhase=nearTotal` Browser station (partial + total inspected; geometry tests cover U2).
- Pixel-perfect Danjon color (out of scope).
- Ordinary persisted startup without `?scenario=`.
- Wall-clock real-time mode.

**Discovered, not done**

- Atmospheric / ambient eclipse radiative transfer
- Event browser / history / notifications
- Generic Astronomical Events
- Generalized map inspector / collision engine
- Standing ambient Lunar Visibility overlay
