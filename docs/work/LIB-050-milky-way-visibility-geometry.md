# LIB-050 — Milky Way visibility geometry

| Field | Value |
|-------|-------|
| ID | LIB-050 |
| Status | complete |
| Created | 2026-08-19 |
| Approved | 2026-08-19 (human; this request) |
| Completed | 2026-08-19 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Add a second Milky Way presentation family: Galactic-center altitude contours on the terrestrial map, optionally emphasized by existing solar darkness and existing physical moonlight, so the map answers “how high is the Galactic center from here right now?” without a shading raster or a single visibility score.

## Scope

**In scope**

- Galactic-center altitude contours as seam-safe equirect line geometry centered on the LIB-049 Galactic-center subpoint.
- Contour levels 0° / 30° / 45° / 60° / 75°; default visible 30/45/60/75; horizon 0° default off.
- Astronomical-night line emphasis from existing solar altitude (subsolar geometric identity).
- Optional moonlight de-emphasis from existing phase × incidence × lunar-eclipse transmission, if that signal stays local and bounded.
- Conservative Visibility controls under Layers → Space objects → Milky Way; ribbon controls unchanged.
- Demo-time / 1600–2500 honesty; focused tests; visual verification; docs.

**Out of scope**

- A single good/bad or percent visibility score.
- Whole-band altitude-fraction contours (survey only).
- Light pollution, clouds, weather, or observing forecasts.
- A new illumination raster, filled heatmap, or world shading layer.
- Replacing the LIB-049 zenith ribbon.
- A second Galactic astronomy authority.
- A new ADR unless a durable observing-quality model is introduced (not planned).
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one canonical UTC instant; no network in the render path.
- [ADR 0017](../decisions/0017-offline-iau-galactic-zenith-projection-authority.md) — Galactic coordinate / zenith-subpoint authority. Contours are derived presentation from that subpoint plus existing solar/lunar geometry.
- Illumination remains [ADR 0002](../decisions/0002-single-upstream-planetary-illumination-rasterpatch.md). Contours must not add a raster.

## Design notes

Three distinct concepts:

1. **Galactic ribbon** (LIB-049): where the band is overhead.
2. **Galactic-center altitude contours** (this item): how high the bright central Milky Way is above the geometric horizon from each location.
3. **Observing favorability**: future aggregate (darkness, Moon, clouds, light pollution). Not this LIB.

A point on the 60° contour means an observer there sees the Galactic center 60° above the geometric horizon at this product instant. Not brightness, transparency, naked-eye certainty, or light-pollution quality.

Geometry: for celestial subpoint S, altitude h at P satisfies `angularDistance(P, S) = 90° − h`. Each contour is a small circle of radius `r = 90° − h` around the current Galactic-center subpoint. Verify against direct altitude from equator-of-date RA/Dec.

## Acceptance criteria

- Visibility contours are independently configurable from the zenith ribbon and from the Galactic-center marker.
- Default: master still factory off; when the master is on, contours remain off until the user enables them; 30/45/60/75 on, horizon off, night emphasis on.
- Contours nest around the same GC subpoint as the marker; no fill; no new raster.
- Night emphasis uses existing Sun geometry; moonlight de-emphasis uses the existing physical moonlight signal or is honestly deferred.
- Demo time drives geometry; unsupported outside 1600–2500.
- Southern-hemisphere GC-altitude advantage is numerically demonstrated.
- Focused tests, `npx tsc --noEmit`, `npm test`, and `npm run build` pass.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: small-circle vs direct altitude; contour nesting; night factor; moon factor if implemented; wrap; polar finiteness; config defaults; RenderPlan lines only
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — layer / DEV scenario; confirm scenario registry absent from production bundle
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- ADR: none expected (derived presentation from ADR 0017)

## Completion record

**Implementation summary**

Galactic-center altitude contours as a second Milky Way line presentation under Layers → Space objects → Milky Way. Each contour is a small circle of radius `90° − h` around the LIB-049 GC zenith subpoint (ADR 0017). Factory master still off; contours remain off until enabled (then 30/45/60/75 on, horizon 0° off). Astronomical-night emphasis multiplies stroke alpha from solar altitude along the contour (smooth 0.20 at Sun ≥ 0° to 1.00 at Sun ≤ −18°). Moonlight de-emphasis multiplies by the existing phase × incidence × lunar-eclipse transmission signal (floor 0.55). No fill, no raster, no visibility score. Ribbon and GC marker stay independently configurable. DEV `?scenario=milky-way` now also enables default contours.

**Commands run**

- `npx tsc --noEmit` — clean
- focused Galactic/visibility/layer/plan/config tests, then `npm test` — 242 files / 2231 passed / 0 failed
- `npm run build` — succeeded; `milky-way` / `visualScenarios` absent from `dist/`
- Cursor Browser `http://localhost:1420/?scenario=milky-way` (viewport Cursor pane, not 1920×1080)

**Actual results**

Small-circle radius matches `90° − h` and direct equator-of-date altitude to 1e-4 deg. At 2026-08-19T06:00:00.000Z, GC Dec ≈ −29.0°; culmination altitudes: 40°N ≈ 21.0°, 20°N ≈ 41.0°, 0° ≈ 61.0°, 20°S ≈ 81.0°, 29°S ≈ 90°, 40°S ≈ 79.0°. Six-hour Earth rotation moves the GC subpoint ~90° west with unchanged contour radii. Default four-contour sample with sun+moon tagging ~5 ms on this machine. Unsupported outside 1600–2500.

**Visual verification**

```text
Visual verification:
- Scenario: milky-way
- Viewport: Cursor built-in browser pane (not 1920×1080 CSS)
- Browser: Cursor built-in browser
- Inspected: nested GC altitude contours, southern-hemisphere advantage,
  night/day contour alpha, independent contour toggle, Demo +6 h
- Result: PASS
- Observations: at 2026-08-19T06:00:00.000Z HUD 2:00 AM, 30/45/60/75°
  lavender circles nested around the Galactic-center marker in the South
  Pacific; no fill; 75° smallest. Config → Layers → Space objects shows
  Reference geometry vs Visibility, horizon 0° off, night and moonlight
  copy. Toggling contours off removed the rings immediately; ribbon
  remained. Demo start 8:00 AM + Reset: HUD 8:00 AM; terminator and Sun
  shifted; contours translated west with the GC marker. No world-spanning
  chord observed.
```

**Not verified**

Canonical 1920×1080 CSS viewport. Isolated visual still of contours with the ribbon fully off (band was toggled off; plane click was intercepted). Live `?scenario=solar-eclipse-total` with Milky Way contours on. Isolated new-Moon vs full-Moon vs lunar-eclipse-totality contour-alpha comparison (moon factor is unit-tested). Continuous accelerated-playback video (speed was set to 21600×; movement evidence is the paused +6 h jump). Dedicated 1600 / 2000 / ~2500 map screenshots.

**Discovered, not done**

15° contour (skipped in v1 UI as clutter). Whole-band altitude-fraction contours. Aggregated observing-quality score (clouds, light pollution). Static “best latitude for GC culmination” helper. Rename “Space objects” → “Space & sky”.
