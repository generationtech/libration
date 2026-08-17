# LIB-042 — Eclipse presentation semantics + path-aware event label placement

| Field | Value |
|-------|-------|
| ID | LIB-042 |
| Status | complete |
| Created | 2026-08-17 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-17 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Make HUD, eclipse placard, and map event label read as one coherent eclipse story with different verbosity, and move solar map labels off the path so they sit near the Sun/Moon glyph cluster on the side opposite the eclipse geography.

## Scope

**In scope**

- One structured eclipse presentation projection over existing EclipseFrame + reference-city circumstances.
- HUD: explicitly local/reference-city; fix misleading `Partial 100%`; actionable begins/max/ends wording when contacts exist.
- Placard: unmistakable global vs local wording; no current-shadow row while upcoming.
- Map label: global identity + `upcoming`/`active` lifecycle; no local magnitude; no countdown clutter.
- Solar label preferred anchor: Sun/Moon glyph cluster; preferred offset opposite the path in screen space; glyph halo and path clearance; edge fallback.
- Lunar: lifecycle wording consistency; keep Moon-glyph-aware placement (do not force solar path-opposite).
- Toggle independence (labels / event information / persistent status).
- Focused tests, 2017 visual verification, proportional docs.

**Out of scope**

- Eclipse authority, Besselian calculations, local-circumstance solvers, lunar eclipse truth, obscuration shading, alignment geometry, forecast/live geography.
- Event browser/history, broad placard redesign, style redesign.
- Generalized collision engine; DOM/info-panel pixel collision unless already available.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics resolve upstream of `RenderPlan`.
- [ADR 0010](../decisions/0010-reference-city-eclipse-circumstances-are-derived-and-must-not-filter-global-eclipse-truth.md)
- Presentation only. No astronomy in Canvas. No ADR expected unless a new cross-cutting rule appears.

## Design notes

- HUD percent is **obscuration** (Sun area covered), not magnitude. Integer below 99%; one decimal from 99% to <100% without rounding up to `100%`; `100%` only when the value is truly 1.0 (not for local partial).
- Upcoming + local C1: `begins {time}`. Upcoming without C1: keep relative `in 50m`. Active before max: `max {time}`. After max with C4: `ends {time}`.
- Solar label geographic preferred point is the Moon (Sun/Moon cluster); path direction uses nearest visible centerline/corridor sample in screen space, including wrapped copies. Lunar keeps existing glyph-avoid candidates.

## Acceptance criteria

- One presentation projection (or equivalent shared logic) feeds HUD, placard, and map label.
- HUD is local; placard distinguishes global vs local; map label is global + lifecycle.
- Knoxville 2017 local partial never shows `Partial 100%`.
- Solar map label is near the glyph cluster, opposite the path under normal conditions, off the corridor, with edge fallback.
- Dateline does not invert placement; partial-only has no fabricated central path.
- Lunar labels remain coherent; toggles stay independent; city switch does not change global map-label identity.
- Focused tests, `npx tsc --noEmit`, `npm test`, `npm run build` pass. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: presentation state (2017 global total / Knoxville partial / lifecycle / shadow / HUD percent / map label); city switch; opposite-path placement; edge fallback; dateline wrap; partial-only; toggle independence
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm DEV scenario ids absent from production bundle
- Visual verification: required — 2017 upcoming / early active / GE / late; dateline solar; partial-only; lunar. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — no unrelated changes
- ADR: none expected

## Completion record

**Implementation summary**

One `EclipsePresentationState` projection (`buildEclipsePresentationState`) over existing `EclipseFrame` + reference-city circumstances feeds HUD (`formatEclipseHudStatus`), placard rows (`buildEclipseEventInformation`), and map-label text (`solarEclipseMapLabel` / `lunarEclipseMapLabel`). HUD is local: obscuration percent (integer &lt;99%; one decimal 99–&lt;100% that never rounds a partial to `"100%"`); `begins` / `max` / `ends` when contacts exist. Placard uses Global event and Local type; Current shadow only while active. Map labels are `{title} · upcoming|active` with no countdown. Solar labels prefer the Moon glyph; screen-space opposite-path offset (~36–64 px) against nearest corridor/central/forecast sample with wrap copies; partial-only uses glyph fallback, no fabricated path. Lunar keeps Moon-glyph avoidance. Toggles stay independent. No astronomy/authority/geometry changes. No ADR.

**Commands run**

- `npx tsc --noEmit`
- focused eclipse presentation / placement / HUD / layer tests
- `npm test`
- `npm run build`
- Cursor Browser: `http://localhost:1420/?scenario=solar-eclipse-2017` stations plus dateline, partial, lunar forecast/total, Tokyo observer

**Actual results**

- Knoxville 2017 obscuration &lt; 1 (HUD **99.8%**; placard **99.9%** via circumstances `.toFixed(1)`); magnitude 0.997; C1 1:04:51 PM Knoxville
- `npx tsc --noEmit` clean
- focused eclipse tests 114 passed (during implementation)
- `npm test`: 221 files / 2090 passed / 0 failed
- `npm run build` succeeded (`dist/assets/index-C3Im4F3X.js`); `iss-presentation` / `solar-eclipse-2017` absent from `dist/`

**Visual verification**

```text
Visual verification:
- Scenario: solar-eclipse-2017 (upcoming / earlyCentral / ge / lateCentral / after),
  solar-eclipse-dateline, solar-eclipse-partial, lunar-eclipse-forecast-total,
  lunar-eclipse-total, solar-eclipse-2017&eclipseStation=ge&observerCity=tokyo
- Viewport: Cursor built-in browser pane (not canonical 1920×1080)
- Browser: Cursor built-in browser; npm run dev http://localhost:1420
- Inspected: HUD / placard / map-label copy; solar label vs glyph vs path;
  Current shadow upcoming vs active; Event labels / Event information /
  Persistent eclipse status toggles; Tokyo local vs global
- Result: PASS
- Observations:
  - upcoming 14:51Z: HUD `Eclipse · Partial 99.8% · begins 1:04 PM`;
    placard Global event Total, Lifecycle Upcoming, Forecast path, no Current shadow,
    Knoxville Local type Partial; map `Total solar eclipse · upcoming` left of
    Atlantic glyph, opposite the US corridor (Event labels ON)
  - earlyCentral 16:58Z: map `Total solar eclipse · active` near west-coast marker,
    opposite the trailing corridor; HUD Partial 99.8% · max 2:34 PM;
    placard Active, Current shadow Totality, Knoxville Partial
  - ge 18:25:29.700Z: HUD Partial 99.8% · max 2:34 PM; placard Current shadow
    Totality (central shadow), Knoxville Local type Partial; map
    `Total solar eclipse · active` left of Pacific glyph, not on the path
  - lateCentral 18:48:44Z: HUD Partial 99.8% · ends 3:58 PM; map still · active
  - after 21:10Z: no geography, no eclipse HUD row, no · ended label
  - Event information OFF: placard gone; HUD + map label remained
  - Persistent status OFF: HUD eclipse row gone; map label remained
  - dateline 2016-03-09: `Total solar eclipse · active` with glyph; HUD
    not visible from Knoxville; no opposite-hemisphere jump
  - partial 2022-10-25: `Partial solar eclipse · active` beside glyph;
    no central corridor
  - lunar forecast: `Total lunar eclipse · upcoming` near Moon; HUD
    `Lunar eclipse · Total · in 2d 21h`
  - lunar total: HUD `Lunar eclipse · Total · visible`; placard Active / Current phase Total
  - Tokyo at 2017 GE: HUD `Eclipse not visible from Tokyo`; placard local not-visible;
    global Total / Active / Totality / US path unchanged (2017 showcase labels OFF)
```

**Not verified**

- Canonical 1920×1080 viewport
- Pixel-exact path-clearance vs city-label bounds (no cross-layer city collision wiring)
- Info-panel DOM/canvas exclusion zone
- Pre-central ~12:05 PM Knoxville station (earlyCentral 12:58 PM used instead)
- Lunar map-label second-line wrap at every zoom (string is `· upcoming` / `· active`; long titles wrap)
- Performance timing of nearest-path search (decimated samples; not measured)

**Discovered, not done**

- City-label and EclipseInfoPanel pixel collision remain unused (glyph-anchored placement is the mitigation)
- 2017 showcase still defaults Event labels OFF (unchanged on purpose)
- Proposed LIB-037 remains proposed
