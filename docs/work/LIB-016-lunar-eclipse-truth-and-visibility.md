# LIB-016 — Lunar eclipse truth and terrestrial visibility geometry

| Field | Value |
|-------|-------|
| ID | LIB-016 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized third Eclipse System implementation slice (E3). Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not implement E4+ (reference-city local circumstances, beam/alignment, lunar forecast, labels).

## Objective

At arbitrary authoritative Libration product UTC, resolve global lunar eclipse truth from the selected offline NASA/Espenak–Meeus authority, represent the Moon’s interaction with Earth’s penumbra/umbra, and show the terrestrial region from which the eclipsed Moon is actually above the geometric horizon.

## Scope

**In scope**

- Development-time ingest of NASA GSFC Five Millennium Catalog of Lunar Eclipses (Espenak & Meeus) for 1900-01-01T00:00:00.000Z ≤ T < 2101-01-01T00:00:00.000Z.
- Versioned, provenance-bearing bundled lunar authority asset behind the existing `EclipseAuthority` family; deterministic regeneration; no runtime network.
- Active lunar event lookup, optional contacts, magnitudes, circular Earth-shadow geometry at the Moon, and Moon-above-horizon terrestrial region.
- Production lunar-eclipse presentation: Moon-glyph Earth-shadow treatment plus visibility region/boundary through existing scene/`RenderPlan` architecture.
- Global presentation rule: when Sun and Moon glyphs overlap, Moon renders above Sun.
- Minimal durable controls: master Lunar eclipses (default off); Moon eclipse-shadow, visibility boundary, visibility region (default on).
- DEV visual scenarios for total and partial (and a horizon/visibility stress scene if useful), using the production implementation.
- Focused tests, type-check, full suite, build, and Cursor visual verification.

**Out of scope**

- Lunar forecast visualization / forecast horizon.
- Reference-city local contacts, magnitude/obscuration UI, altitude/azimuth chrome.
- Eclipse labels, event list, Mars Attacks beam, standalone Lunar Visibility overlay.
- Style editor; supermoon/nodes/maria; generic Astronomical Events framework.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant; no network in the render path.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0008](../decisions/0008-bundled-nasa-solar-eclipse-authority.md).
- Intended structure: [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) §10, §18 E3, §22.
- Predecessors: [LIB-013](LIB-013-eclipse-authority-evaluation.md), [LIB-014](LIB-014-solar-eclipse-live-footprint.md), [LIB-015](LIB-015-solar-eclipse-forecast.md).
- Visual verification: [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).

## Acceptance criteria

- NASA-derived lunar eclipse authority is bundled offline for 1900–2100 with durable provenance/version metadata.
- Ingest/regeneration is deterministic and documented; runtime never fetches lunar eclipse authority.
- Total and partial subtypes are authoritative; penumbral truth is preserved (not reclassified as partial).
- Contacts P1/U1/U2/GE/U3/U4/P4 are optional by subtype; invalid contacts are omitted, not invented.
- Active lunar event resolves at arbitrary product UTC; outside-span is explicit unsupported; no ambient fallback.
- Earth penumbra/umbra geometry at the Moon evolves with product time; Canvas does not calculate it.
- Moon glyph shows a restrained eclipse-shadow treatment distinct from phase shading; libration remains readable.
- Terrestrial Moon-above-horizon region and geometric horizon boundary are semantic geography upstream of `RenderPlan`.
- Dateline/world-wrap does not produce a giant false polygon or inverted hemisphere.
- Direct jumps, pause, and accelerated demo reconstruct from `TimeContext.now` with no wall-clock timers.
- Moon-over-Sun glyph ordering is global, not eclipse-gated.
- No E4+ behaviour; solar E1/E2 remain green.

## Verification plan

- Focused tests: lunar ingest/provenance, lookup, contacts vs NASA fixtures, shadow magnitudes, visibility in/out, glyph order, config, RenderPlan, scenarios, production containment
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — new bundled asset, layer, Moon-glyph treatment, and Vite production containment
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) for lunar eclipse scenarios plus accelerated-demo progression and pause

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — lunar authority, active lookup, shadow/visibility flow, Moon-glyph treatment.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — E3 decisions now implemented.
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — lunar eclipse scenario catalog.
- [`docs/ROADMAP.md`](../ROADMAP.md) — E3 no longer pending.
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — implementation pointer only if product intent is unchanged.
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: evaluate whether lunar Earth-shadow + visibility-hemisphere (not a solar-style path) merits a record.

## Completion record

**Implementation summary**

Bundled NASA/Espenak–Meeus Five Millennium lunar catalog (`nasa-espenak-meeus-5mcle-lunar` v1, 459 events 1900–2100) behind the existing `EclipseAuthority` family. Active-only lookup at product UTC; duration-symmetry contacts; circular Earth-shadow geometry at the Moon from catalog magnitudes and γ. Moon-glyph Earth-shadow overlay (penumbra / umbra / restrained totality) is independent of phase and sits under the libration mark. Terrestrial Moon-above-horizon region uses the existing spherical `lunarDot` horizon (no refraction, not a solar-style corridor). Master Lunar eclipses default off. No new ADR: the lunar map metaphor is already in the Eclipse System spec §10; authority family is ADR 0008. No E4+.

**Commands run**

- `npx tsc --noEmit` — clean (exit 0)
- Focused eclipse/scene tests — 175 passed / 0 failed
- `npm test` — 184 files / 1711 passed / 0 failed (28.37s)
- `npm run build` — succeeded (`dist/assets/index-nl_hlylW.js` 1,280.46 kB). `lunar-eclipse-total`, `lunar-eclipse-partial`, `lunar-eclipse-horizon`, and `visualScenarios` absent from `dist/`
- Cursor Browser visual verification of total/partial/horizon scenarios, 3600× demo progression, post-event time jump, and ordinary startup

**Actual results**

Lunar asset 297,252 bytes; SHA-256 of ingest `5MKLEcatalog.txt` pinned `d47586fc9c1c59338f234b3c6634c31744739887169f58d411ac766f3861fcf2`. Event counts 166 total / 122 partial / 171 penumbral. 2022-05-16 GE `2022-05-16T04:11:29.000Z`, γ=-0.2532, Pm=2.3726, Um=1.4137; 2008-08-16 partial Um=0.8076 with U2/U3 omitted. 1000 `activeLunarEclipseAt` queries < 50 ms. Contact phase interpolation within one minute of NASA duration-symmetry times. Knoxville inside / Tokyo outside at 2022 GE. Equatorial dateline strip splits via world copies (no 360° inverted fill).

**Visual verification**

Viewport: `Emulation.setDeviceMetricsOverride` 1920×1080; canvas typically 1888×1079 CSS px. Limitation: Cursor Browser panel is not a guaranteed physical 1920×1080 window, so some screenshots crop the left/Americas portion of the equirect map.

```text
URL: http://localhost:1420/?scenario=lunar-eclipse-total
Viewport: requested 1920×1080; canvas 1888×1079
Scenario banner: lunar-eclipse-total · 2022-05-16T04:11:29.000Z · persistence isolated
Inspected: Moon-glyph totality, visibility hemisphere, Knoxville in / Tokyo out, Layers controls
Result: PASS
Observations: reddish-brown Moon over South America (~19°S 64°W); broad cool visibility fill over the Americas/Atlantic/Europe/Africa with a thin lunar-colored horizon curve distinct from the solar terminator. Knoxville (12:11 AM) inside the region; Tokyo (1:11 PM) outside. Layers: Lunar eclipses on; Moon eclipse-shadow / visibility boundary / visibility region on; Solar eclipses off; Moon libration ring observer-oriented. Map readable.
```

```text
URL: http://localhost:1420/?scenario=lunar-eclipse-partial
Inspected: partial (not totality) + visibility region
Result: PASS
Observations: 2008-08-16T21:10:06.000Z banner. Thin white horizon curve in the Atlantic with a quiet fill on the Moon-up (eastern) side. No totality red Moon in the Americas crop (Moon is over ~13°S 43°E). Automated geometry: phase partial-umbral, Um=0.8076, no U2/U3.
```

```text
URL: http://localhost:1420/?scenario=lunar-eclipse-horizon
Inspected: dateline zenith / wrap
Result: PASS
Observations: 2015-04-04T12:00:15.000Z. Moon glyph on the left map edge near 5°S 180°W with totality tint; visibility fill over the Pacific / western Americas; horizon curve without a world-spanning inverted polygon.
```

```text
Interaction: lunar-eclipse-total, Data tab, speed 3600×, Resume then Pause; demo start 8:00 AM + Reset
Inspected: accelerated progression through contacts; post-event jump clears overlay
Result: PASS
Observations: Resume became Pause; product clock advanced (Knoxville city pin left 12:11 AM totality). After Reset to 8:00 AM (≈12:00 UTC, after P4), city pins read afternoon local times and the lunar visibility overlay was gone. Scenario banner remained the static seed UTC.
```

```text
URL: http://localhost:1420/ (no scenario)
Inspected: ordinary startup containment
Result: PASS
Observations: no scenario banner; city pins and Sun/Moon present; no lunar visibility overlay; Moon is an ordinary dark phase disc. Lunar eclipses remain off by default.
```

**Not verified**

- Pixel-level libration-ring contrast on the tiny Moon disc at world-map scale (plan-builder tests assert Earth-shadow fills before the libration stroke; visual: totality disc remained outlined).
- Dedicated visual of a penumbral-only event (truth and penumbral overlay are tested; no DEV scenario).
- Wall-clock watch of every named contact on 2022-05-16 (accelerated demo plus geometry tests at P1/U1/U2/GE/U3/U4/P4).
- Physical 1920×1080 window; Cursor panel crops.

**Discovered, not done**

- Reference-city in/out is geometrically answerable from `isMoonGeometricallyAboveHorizon` plus contact times; local-contact UI remains E4.
- A standing ambient Lunar Visibility overlay would reuse the same contour; still a separate backlog item.
- Lunar forecast presentation remains later; `lunarEclipsesIntersecting` exists on the authority but has no UI.
