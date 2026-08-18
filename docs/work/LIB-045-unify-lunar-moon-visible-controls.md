# LIB-045 — Unify lunar Moon-visible controls

| Field | Value |
|-------|-------|
| ID | LIB-045 |
| Status | complete |
| Created | 2026-08-17 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-17 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Remove the redundant Upcoming Moon-visible region/boundary controls. One Moon-visible region control and one Moon-visible boundary control must own current-product-time lunar eclipse map geography for both upcoming and active presentation, with no lifecycle paint switch at P1.

## Scope

**In scope**

- Remove user-facing Upcoming Moon-visible region/boundary controls.
- Make `showVisibilityRegion` / `showVisibilityBoundary` authoritative for upcoming and active lunar eclipse map geography.
- Migrate and omit deprecated `showForecastVisibilityRegion` / `showForecastVisibilityBoundary` from normalized config.
- Remove lifecycle-dependent upcoming opacity (`prominence01` scaling) unless it is already continuous to 1.0 at P1.
- Audit unused `forecastVisibility*` paint tokens and drop dead runtime semantics.
- Update focused tests, docs, and visual verification for the unified model.

**Out of scope**

- Removing the Moon-visible geography family.
- Physical moonlight / lunar eclipse attenuation.
- Eclipse authority, contact timing, Earth-shadow cue, labels, HUD, placard GE copy, solar eclipses, ordinary Moon systems.
- Generic visibility frameworks.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant.
- [ADR 0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) — Moon-visible remains informational.
- LIB-044 already established current-product-time map geography. This item removes duplicate config ownership. No new ADR expected.

## Design notes

- **Unified controls:** when a lunar eclipse is being presented, `showVisibilityRegion` / `showVisibilityBoundary` paint current-instant fill/boundary both before P1 and during the active event.
- **Migration:** for each pair, the unified flag is true only when neither the retained key nor the legacy forecast key is explicitly false (`false` wins). Missing keys default on. Normalized output omits the forecast booleans.
- **Opacity:** upcoming geography must use the same configured region/boundary paint as active geography. Do not keep a quieter upcoming alpha unless it reaches exactly 1.0 at P1.
- **Forecast horizon Live only:** hides upcoming events, but must not disable the unified visibility controls; they still apply during an active event.
- **Placard:** keep “Visibility at greatest eclipse” as event information. Map geography remains Moon-visible now.
- **Labels:** keep `labelPathHints` from `lunarHorizonBoundaryPolylines` even when the boundary is not painted.

## Acceptance criteria

See the authorizing request completion criteria 1–28. In short: Upcoming UI/keys gone; unified flags own upcoming+active; no P1 ownership/count/alpha jump; migration deterministic; Live-only does not disable active controls; placard/labels/illumination/solar/ordinary Moon unchanged; tsc/test/build green; AWAITING SCOPE.

## Verification plan

- Focused tests: migration matrix, unified lifecycle matrix, P1±1s count/alpha/geometry, Live-only, LayersTab UI, scene equality, placard GE copy, overlay-off illumination, solar 2017
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm DEV scenario ids absent from production bundle
- Visual verification: required — 2029 sequence plus Config UI. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — correct stale “representative GE Moon-visible region” current-behavior wording
- ADR: none expected

## Completion record

**Implementation summary**

Removed the duplicate Upcoming Moon-visible region/boundary controls. `showVisibilityRegion` / `showVisibilityBoundary` now own current-product-time fill and geometric-horizon stroke for both upcoming and active lunar eclipse presentation. Upcoming no longer scales paint by `prominence01`. Legacy `showForecastVisibility*` booleans are accepted on load, merged with the more restrictive value (`false` wins), and omitted from normalized config. Dead `forecastVisibility*` paint tokens were removed from `resolveLunarEclipsePaint`. No new ADR.

**Commands run**

- `npx tsc --noEmit`
- focused lunar appearance / continuity / layer / LayersTab / sceneConfig / persistence / commit / illumination / event-information tests during implementation
- `npm test`
- `npm run build`
- Cursor Browser 2029 upcoming / preActive / early / deepPartial / total, Layers → Eclipse UI, 2017 solar GE, night ordinary Moon

**Actual results**

- `npx tsc --noEmit` clean
- focused: 10 files / 199 passed
- `npm test`: 226 files / 2133 passed / 0 failed
- `npm run build` succeeded (`dist/assets/index-CppEASyD.js`); `lunar-eclipse-2029` / `eclipseStation` / `iss-presentation` absent from `dist/`
- 2029 P1−10s/−1s/P1/+1s/+10s: fillCount 1, strokeCount 1, fill `rgba(22, 34, 54, 0.12)`, stroke `rgba(186, 210, 236, 0.78)` unchanged; moon/ring longitude crawled ~0.04°/s

**Visual verification**

```text
Visual verification:
- Scenario: lunar-eclipse-2029 stations upcoming / preActive / early /
  deepPartial / total; Layers topic Eclipse; solar-eclipse-2017&eclipseStation=ge;
  night
- Viewport: Cursor built-in browser pane (not canonical 1920×1080)
- Browser: Cursor built-in browser; npm run dev http://localhost:1420
- Inspected: unified Moon-visible region/boundary UI (no Upcoming duplicates);
  current-instant fill/boundary before and after P1; placard GE vs map-now;
  solar corridor/beam; ordinary night Moon without eclipse geography
- Result: PASS
- Observations:
  - Layers → Eclipse Lunar eclipses: Forecast horizon, type filters, Moon
    Earth-shadow treatment, Moon-visible region, Moon-visible boundary. No
    “Upcoming Moon-visible…” rows
  - upcoming 2029-06-25T18:00Z: Upcoming / in 6h 35m; placard keeps Visibility
    at greatest eclipse plus Moon-visible now; white horizon follows current Moon
    over the Indian Ocean/SE Asia, not GE 50°W
  - preActive 00:29:32Z: still Upcoming / in 5m; hemisphere over the
    Atlantic/Americas
  - early 00:50Z: Active / Penumbral; same fill/boundary family, a few degrees
    west; Earth-shadow cue
  - deepPartial 02:20Z / total 03:22:05Z: Active; geography still present
  - 2017 solar GE: corridor, live footprint, alignment beam unchanged
  - Visual-scenario Config is read-only; region/boundary OFF was verified by
    tests, not by clicking in the scenario session
```

**Not verified**

- Canonical 1920×1080 viewport
- Clicking unified toggles in a writable Config session during the 2029 scenario (visual scenarios isolate persistence and render Config read-only)
- Continuous playback through P1 (deterministic P1± samples and station sweep used instead)
- Dedicated polar visual scene

**Discovered, not done**

- `lunarEclipseEventForecastGeometry` is still attached to lunar forecast selections on the eclipse frame; map and placard do not use it
- Proposed LIB-037 remains proposed

