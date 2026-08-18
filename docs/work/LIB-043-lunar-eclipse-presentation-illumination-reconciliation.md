# LIB-043 — Lunar eclipse presentation + illumination reconciliation

| Field | Value |
|-------|-------|
| ID | LIB-043 |
| Status | complete |
| Created | 2026-08-17 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-17 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Make a lunar eclipse read as one coherent physical event: Moon-glyph-aware event labels that clear the Moon and city names, an informational current-instant Moon-visible hemisphere, one physical moonlight pipeline attenuated by Earth-shadow coverage, continuous artifact-free terrestrial illumination, and a short Earth-shadow directional cue that points into the Moon instead of the previous rotating map beam.

## Scope

**In scope**

- Lunar event-label placement around the Moon glyph (collision-aware candidates; São Paulo-style city-label clearance; cue bounds when practical).
- Explicit active vs forecast Moon-visible semantics; numerical hemisphere / continuity / wrap / polar checks.
- Physical vs informational split: moonlight × eclipse transmission in the existing illumination raster; Moon-visible fill and the new cue are overlays only.
- Remove duplicate physical-looking lunar shading (geographic alignment ribbons / totality wash on the map).
- Diagnose and repair blocky / jumping large-area shading.
- Replace the lunar alignment “beam” with a short Moon-local Earth-shadow directional cue; rename UI copy; keep the stored boolean.
- 2029 June 25–26 visual regression stations; partial and penumbral fixtures; Knoxville/Tokyo independence.
- Focused tests, type-check, full suite, build, Cursor visual verification, proportional docs.

**Out of scope**

- NASA/Espenak authority, contact timing, classification, Besselian/geometry truth.
- Solar eclipse behaviour, solar alignment beam, HUD/placard redesign.
- Atmospheric radiative transfer, event browser/history, generalized label engine.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant; illumination composes into one `rasterPatch`.
- [ADR 0010](../decisions/0010-eclipse-events-global-circumstances-derived.md) — global truth; reference city never selects geography.
- [ADR 0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) — lunar eclipse attenuation is physical illumination; Moon-visible remains informational.
- Canvas remains astronomy-neutral. No new ADR unless a genuinely new cross-cutting rule appears.

## Design notes

- **Active Moon-visible:** locations where the Moon is geometrically above the local horizon at the current product instant (spherical `lunarDot ≥ 0` around ambient `sublunarPoint`). Not selected by the reference city.
- **Forecast Moon-visible:** representative Moon-above-horizon hemisphere at greatest eclipse (authority zenith; cached `lunar-forecast-visibility-v1`). Not a path of totality and not visibility at every contact.
- **Physical illumination:** `ordinaryMoonlight × lunarEclipseTransmission`, then existing solar/night composition. Transmission from E3 disc/shadow coverage, not contact-label switches. Zero moonlight where the Moon is below the horizon. Day side is not darkened by a lunar eclipse.
- **Informational overlays:** Moon-visible fill/boundary, event label, Moon-glyph Earth-shadow, Earth-shadow directional cue. Overlay on/off must not change physical illumination samples.
- **Cue:** short tapered shadow-axis indicator, origin on the Earth-shadow side, terminal at the Moon disc; screen-space; behind Moon details; active eclipse only; strength from coverage.

## Acceptance criteria

See the authorizing request completion criteria 1–41. In short: labels clear Moon and São Paulo; visibility semantics and tests hold; one moonlight pipeline; no overlay-driven physical luminance change; blocky/jump root cause identified and repaired; beam replaced by cue; solar beam unchanged; HUD/placard/LIB-042 wording preserved; tsc/test/build green; AWAITING SCOPE.

## Verification plan

- Focused tests: label collision (incl. São Paulo), visibility hemisphere/continuity/polar/wrap, illumination ownership, attenuation stations, moon-below-horizon, day-side, cue orientation/lifecycle, Knoxville/Tokyo global identity
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm DEV scenario ids absent from production bundle
- Visual verification: required — 2029 ingress→totality→egress plus partial/penumbral/forecast fixtures. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — no unrelated changes
- ADR: none expected (reinforce ADR 0011)

## Completion record

**Implementation summary**

Lunar map labels use `placement: "lunar-glyph"` (right/left/above/below/diagonals/farther radial, 40–64 px) with Moon-halo and optional city-name box rejection — not solar path-opposite. Active Moon-visible remains current-instant `lunarDot ≥ 0`; forecast remains the GE hemisphere. Physical illumination stays `ordinaryMoonlight × lunarEclipseTransmission` in the existing `rasterPatch` (ADR 0011). The geographic lunar alignment ribbon (`lunarAxisEffect` tapered lat/lon bands + Moon-halo + totality wash as `equirectRegionOverlay` fills) was the blocky/jumping large-area shading and the “beam from the Moon”; it is gone (`buildEclipseAlignmentPresentation` returns `lunar: null`). Replacement is a short Moon-local Earth-shadow cue (cool gray wedge, origin on the shadow side, tip at the disc, behind phase/shadow/libration; strength `1 − moonlightTransmission`; active eclipse only). UI copy: Lunar Earth-shadow cue / Lunar shadow-axis color; stored `lunarEnabled` unchanged. Default visibility fill alpha 0.12. No new ADR. NASA/Espenak, contacts, solar beam, HUD/placard LIB-042 wording unchanged.

**Commands run**

- `npx tsc --noEmit`
- focused label / visibility / illumination / cue / layer / scenario / LayersTab tests during implementation
- `npm test`
- `npm run build`
- Cursor Browser 2029 A–G plus partial, penumbral, forecast, dateline, Tokyo, 2017 solar GE
- `npx tsx` timing of visibility ring / transmission / cue strength

**Actual results**

- `npx tsc --noEmit` clean
- `npm test`: 223 files / 2106 passed / 0 failed
- `npm run build` succeeded (`dist/assets/index-DJxn5xw9.js`); `lunar-eclipse-2029` / `eclipseStation` / `iss-presentation` absent from `dist/`
- Visibility ring ~8 µs; horizon polylines ~7 µs; transmission ~0.4 µs; cue strength ~0.3 µs (no new workers; no moonlight time buckets)

**Visual verification**

```text
Visual verification:
- Scenario: lunar-eclipse-2029 stations upcoming / preActive / early /
  deepPartial / total / egress / after; observerCity=tokyo at total;
  lunar-eclipse-partial; lunar-eclipse-total&eclipsePhase=penumbral;
  lunar-eclipse-forecast-total; lunar-eclipse-horizon;
  solar-eclipse-2017&eclipseStation=ge
- Viewport: Cursor built-in browser pane ~703×769 CSS (canvas ~673×770);
  not canonical 1920×1080
- Browser: Cursor built-in browser; npm run dev http://localhost:1420
- Inspected: lunar label vs Moon vs São Paulo; Moon-visible overlay vs
  night shading; no geographic lunar ribbon; Earth-shadow cue into Moon;
  HUD/placard; Knoxville vs Tokyo; partial/penumbral/forecast/dateline;
  solar alignment beam still present
- Result: PASS
- Observations:
  - upcoming 2029-06-25T18:00Z: `Total lunar eclipse · upcoming`; HUD
    `Lunar eclipse · Total · in 6h 35m`; forecast Moon-visible at GE;
    no cue; no Earth-shadow Moon treatment
  - preActive 2029-06-26T00:29:32Z: still Upcoming / in 5m; forecast
    region; label clear of Moon and São Paulo
  - early 00:50Z: Active / Penumbral; current-instant Moon-visible;
    HUD `Lunar eclipse · Total · visible`; faint cue; label · active
  - deepPartial 02:20Z: Partial umbral; stronger cue; label left of Moon,
    clear of São Paulo
  - total 03:22:05Z: Current phase Total; dark/red Moon; cue into disc
    from shadow side; `Total lunar eclipse · active` right of Moon, not
    concatenated with São Paulo (zenith ~23°S 50°W)
  - egress 04:40Z: Partial umbral; cue weaker; label still · active
  - after 06:20Z: no eclipse geography, no cue, no map label, no HUD row
  - Tokyo at GE: HUD `Lunar eclipse not visible from Tokyo`; global
    Moon/cue/region/label unchanged
  - 2008 partial: Partial umbral, umbral mag 0.808, no totality wash
  - 2022 penumbral: Current phase Penumbral; no umbral bite / red wash
  - forecast-total: Upcoming; GE Moon-visible copy; no cue
  - 2015 horizon: wrap without a world-spanning false segment
  - 2017 solar GE: solar alignment beam still present
```

**Illumination ownership table**

| Effect | Kind | Changes physical luminance? | Should it? |
|--------|------|-----------------------------|------------|
| Solar daylight/night raster | physical | yes | yes |
| Ordinary moonlight in that raster | physical | yes, Moon-up night side | yes |
| `lunarEclipseTransmission` multiplier | physical | yes, same pipeline | yes |
| Moon-visible fill/boundary | informational overlay | no (overlay ON/OFF identical samples) | no |
| Event label | informational | no | no |
| Moon glyph Earth-shadow | Moon presentation | glyph only | yes on glyph |
| Earth-shadow directional cue | informational, Moon-local | glyph only | glyph only |
| Geographic lunar alignment ribbon | removed | it did (wrong) | no |

**Blocky/jitter root cause**

The old lunar alignment presentation emitted tapered geographic lat/lon bands plus a Moon-halo and totality wash as `equirectRegionOverlay` fills. That stacked with the Moon-visible hemisphere, rotated around the Moon (read as a beam emitted by it), and jumped when the ribbon origin switched (anti-solar vs offset at small separation). Repair: do not emit those fills. Remaining night-side softness is the existing half-res illumination `rasterPatch` with `imageSmoothingEnabled` — not a second lunar shade field. No moonlight/visibility time buckets.

**Not verified**

- Canonical 1920×1080 viewport
- Accelerated live playback (station sweep + numerical continuity used instead)
- Dedicated visual polar scene (automated polar geometry only)
- Pixel-exact cue-vs-label at every zoom (Moon halo multiplier 3.6 is the exclusion; no separate cue polygon)
- Info-panel DOM/canvas exclusion zone

**Discovered, not done**

- Equatorial `|lat| < 0.25°` visibility-strip construction left as-is (2029 Moon ~−23°)
- Generalized label engine still out of scope
- Proposed LIB-037 remains proposed
