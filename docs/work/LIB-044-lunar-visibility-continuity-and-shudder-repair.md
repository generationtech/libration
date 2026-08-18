# LIB-044 — Lunar visibility continuity + temporal illumination shudder repair

| Field | Value |
|-------|-------|
| ID | LIB-044 |
| Status | complete |
| Created | 2026-08-17 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-17 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Keep lunar map geography on the current product instant through upcoming and active lifecycle, remove any remaining global lunar alignment line, and eliminate the large-area temporal shudder seen during lunar-eclipse playback.

## Scope

**In scope**

- Identify the remaining white global lunar line (layer, primitive, builder, semantics).
- Map Moon-visible region/boundary always from current-product-instant geometry (upcoming and active).
- Keep GE forecast visibility in placard/details only; do not freeze or switch map geography at activation.
- Remove any separate global lunar alignment line / axis / great-circle decoration; keep the Moon-local Earth-shadow cue.
- Diagnose and repair temporal illumination/shading shudder (cache buckets, mixed frame state, raster grid, wrap copies, smoothing).
- 2029 June 25–26 continuity, contact, dateline, polar, solar-alignment, label, and cue regressions.
- Focused tests, type-check, full suite, build, Cursor visual verification, proportional docs.

**Out of scope**

- NASA/Espenak authority, contact timing, subtype classification, Besselian/astronomical truth.
- Solar eclipse behaviour (alignment beam, umbra marker, corridor, shading) except regression.
- Atmospheric radiative transfer, event browser, generalized animation engine.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant; illumination composes into one `rasterPatch`.
- [ADR 0010](../decisions/0010-eclipse-events-global-circumstances-derived.md) — global truth; reference city never selects geography.
- [ADR 0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) — lunar eclipse attenuation is physical illumination; Moon-visible remains informational.
- Canvas remains astronomy-neutral. No new ADR unless a genuinely new cross-cutting rule appears. Durable map-time rule belongs in the eclipse spec.

## Design notes

- **Map Moon-visible (upcoming and active):** locations where the Moon is geometrically above the local horizon at the current product instant. No lifecycle-dependent authority switch.
- **Placard forecast:** may still describe visibility at greatest eclipse as event information.
- **Physical illumination:** one product-time astronomical state (solar + lunar + eclipse transmission) into the existing world-grid `rasterPatch`. Overlay on/off must not change physical samples.
- **Alignment:** solar beam unchanged; lunar alignment is the Moon-local Earth-shadow cue only.

## Acceptance criteria

See the authorizing request completion criteria 1–36. In short: white line identified; no separate global lunar alignment line; current-instant map visibility before and during the event; no lifecycle-driven geometry snap; shudder root cause identified and repaired; cue/labels/solar beam preserved; tsc/test/build green; AWAITING SCOPE.

## Verification plan

- Focused tests: upcoming/active current-instant identity, one-second activation continuity, no global lunar alignment primitive, cue present, placard GE copy, overlay-off physical identity, contact continuity, probe luminance, dateline/polar, solar 2017
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm DEV scenario ids absent from production bundle
- Visual verification: required — 2029 sequence plus accelerated playback or deterministic frame-step if playback cannot advance. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- ADR: none expected (reinforce ADR 0011 / product-time authority in the eclipse spec)

## Completion record

**Implementation summary**

The remaining white global lunar line is the Moon-visible geometric horizon stroke (`layer.lunarEclipse.visibility` / `equirectRegionOverlay` strokes from `lunarHorizonBoundaryPolylines`), not a leftover alignment ribbon. Map geography for upcoming and active now both use current-product-instant `sublunarPoint` (same algorithm, no GE freeze). Placard still describes visibility at greatest eclipse as event information. `buildEclipseAlignmentPresentation` still emits `lunar: null`; the Moon-local Earth-shadow cue is unchanged. Hemisphere fills use sequential unwrap when the ring spans most of the world so wrap-copy selection does not flicker as longitude crawls. Physical illumination is built from one `buildIlluminationFrameState(productUtcMs, lunarGeometry)` into the existing half-res full-world `rasterPatch` (no illumination time bucket, no moving bbox). No new ADR.

**Commands run**

- `npx tsc --noEmit`
- focused lunar visibility / illumination continuity / layer / LayersTab / alignment / canvas executor tests during implementation
- `npm test`
- `npm run build`
- Cursor Browser 2029 upcoming / preActive / early / total, 100× demo playback through P1 into partial umbral, 2017 solar GE

**Actual results**

- `npx tsc --noEmit` clean
- `npm test`: 225 files / 2121 passed / 0 failed
- `npm run build` succeeded (`dist/assets/index-CTJiNTrR.js`); `lunar-eclipse-2029` / `eclipseStation` / `iss-presentation` absent from `dist/`
- 2029 P1±1 s: sublunar / boundary motion proportional to ~2 s of celestial motion (no hundreds-of-km snap)
- 60 s probe luminance through P1–P4: non-terminator `|Δα| < 12` (0–255)
- Half-res 180×90 raster build `< 750 ms` in tests; the 350-step 2029 sweep was 488 ms total (~1.4 ms per 90×45 patch)

**Visual verification**

```text
Visual verification:
- Scenario: lunar-eclipse-2029 stations upcoming / preActive / early /
  total; 100× demo resume from preActive through P1 into partial umbral;
  solar-eclipse-2017&eclipseStation=ge
- Viewport: Cursor built-in browser pane (not canonical 1920×1080)
- Browser: Cursor built-in browser; npm run dev http://localhost:1420
- Inspected: Moon-visible white horizon boundary vs current Moon;
  no GE-freeze snap at activation; no geographic lunar alignment
  ribbon; Earth-shadow cue; placard GE vs map-now copy; solar beam
- Result: PASS
- Observations:
  - upcoming 2029-06-25T18:00Z: `Total lunar eclipse · upcoming`; HUD
    `Lunar eclipse · Total · in 6h 35m`; placard keeps GE visibility
    row plus `Moon-visible now`; white line is the current-instant
    horizon (Moon over the Asian/Pacific night), not the 50°W GE freeze
  - preActive 00:29:32Z: still Upcoming / in 5m; boundary has moved
    with the Moon to the Atlantic/South America; no cue
  - early 00:50Z: Active / Penumbral; boundary only a few degrees from
    preActive (no family switch); faint Earth-shadow cue; label · active
  - total 03:22:05Z: Current phase Total; cue into Moon; label right of
    Moon, São Paulo separate
  - 100× playback from 8:29 PM through P1 to 9:54 PM Partial umbral:
    lifecycle became Active without a white-line snap; boundary tracked
    the Moon west; night shading evolved smoothly in sampled frames
  - 2017 solar GE: solar alignment beam still present (sun → umbra)
```

**White-line root cause**

Informational Moon-visible horizon stroke (`lunarHorizonBoundaryPolylines` on `layer.lunarEclipse.visibility`). Upcoming used cached GE zenith; active used `sublunarPoint(now)`. That is the activation snap.

**Shudder root cause**

1. Overlay family switch at P1 (GE-frozen fill/boundary + quieter forecast alpha → current-instant full paint) read as large-area shading replacement.
2. Hemisphere fill rings spanning ~360° of longitude were folded into the “smallest arc,” whose cut jumped among near-equal sample gaps, making wrap-copy selection flicker as the Moon moved.

Physical illumination itself had no mixed-frame time bucket; small-step raster probes through 2029 are continuous except at the solar terminator.

**Not verified**

- Canonical 1920×1080 viewport
- Continuous 400× playback of the entire 2029 event (100× through P1→partial umbral plus deterministic 60 s raster probes for the full contact window)
- Dedicated visual polar scene (automated polar geometry only)
- Pixel-exact cue-vs-label at every zoom

**Discovered, not done**

- Unused lunar forecast paint tokens (`forecastVisibility*` in `resolveLunarEclipsePaint`) remain for stored-style compatibility; map no longer uses them
- Proposed LIB-037 remains proposed

