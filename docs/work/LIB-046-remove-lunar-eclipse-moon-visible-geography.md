# LIB-046 — Remove lunar eclipse Moon-visible map geography

| Field | Value |
|-------|-------|
| ID | LIB-046 |
| Status | complete |
| Created | 2026-08-17 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-18 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Remove the lunar-eclipse-specific terrestrial Moon-visible hemisphere fill and geometric lunar-horizon boundary from configuration and map presentation. Ordinary Moon-above-horizon astronomy used by illumination, sublunar geometry, local circumstances, and other non-eclipse systems must remain.

## Scope

**In scope**

- Remove Moon-visible region and Moon-visible boundary Config controls and their appearance tokens.
- Stop emitting eclipse-specific visibility fill and horizon stroke from `createLunarEclipseLayer`.
- Accept legacy visibility keys on load and omit them from normalized/current output.
- Clean stale placard/map-legend copy that describes painted geography.
- Audit label-placement dependence on horizon path hints; prefer removal if glyph/city/edge avoidance is enough.
- Focused tests, docs, and 2029 visual verification.

**Out of scope**

- Ordinary moonlight, `lunarDot` horizon masking, eclipse transmission, sublunar point, Moon glyph/phase/libration/paths.
- Moon-local Earth-shadow cue, Moon Earth-shadow treatment, HUD, event labels, reference-city circumstances.
- Solar eclipses, eclipse authority, generalized label engines, ambient Lunar Visibility overlay.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant.
- [ADR 0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) — physical moonlight attenuation is preserved; this item only removes informational presentation.
- No new ADR. Removed: eclipse-specific Moon-visible presentation. Preserved: ordinary astronomical Moon visibility mechanics.

## Design notes

- **Removed presentation:** `showVisibilityRegion` / `showVisibilityBoundary` and their paint tokens. No replacement global lunar line.
- **Migration:** accept deleted keys (including legacy `showForecastVisibility*`) without failure; ignore them; omit from normalized output. No visual replacement.
- **Labels:** prefer dropping `labelPathHints` from lunar placement if Moon-glyph candidates already clear the glyph, city names, and screen edges. Restore only minimal invisible geometry if São Paulo/Moon placement regresses. Do not restore visible paint.
- **Placard:** keep event visibility facts (including visibility at greatest eclipse). Remove legend rows that describe unpainted map geography.

## Acceptance criteria

See the authorizing request completion criteria 1–30. In short: both map overlays and their Config controls gone; physical moonlight and ordinary Moon systems unchanged; labels still clear Moon and São Paulo without visible horizon paint; legacy keys tolerated; tsc/test/build green; AWAITING SCOPE.

## Verification plan

- Focused tests: layer emits no visibility fill/boundary; legacy key omit; LayersTab UI; placard legend; illumination identity; label placement; scene equality; solar 2017
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm DEV scenario ids absent from production bundle
- Visual verification: required — 2029 upcoming→after plus Config UI. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — current-behavior wording only
- ADR: none expected

## Completion record

**Implementation summary**

Removed lunar-eclipse Moon-visible region/boundary Config controls, paint tokens, and RenderPlan fill/stroke. `createLunarEclipseLayer` now emits labels only (no terrestrial hemisphere, no white geometric horizon). Legacy `showVisibilityRegion` / `showVisibilityBoundary` / `showForecastVisibility*` / visibility color tokens are accepted on load and omitted from normalized output. Lunar event labels keep glyph/city/edge avoidance and no longer pass horizon `labelPathHints`. Placard keeps visibility at greatest eclipse; map legend no longer lists unpainted geography. Physical moonlight (`lunarDot ≥ 0`, eclipse transmission) is unchanged. No new ADR.

**Commands run**

- `npx tsc --noEmit`
- focused lunar appearance / layer / continuity / sceneConfig / LayersTab / persistence / commit / event-information / illumination / label tests
- `npm test`
- `npm run build`
- Cursor Browser 2029 upcoming / preActive / early / deepPartial / total / egress / after; Tokyo at total; Layers → Eclipse UI; solar-eclipse-2017 GE; night

**Actual results**

- `npx tsc --noEmit` clean
- focused: 15 files / 243 passed
- `npm test`: 226 files / 2128 passed / 0 failed
- `npm run build` succeeded (`dist/assets/index-9IHxAAp_.js`); `lunar-eclipse-2029` / `eclipseStation` / `iss-presentation` absent from `dist/`
- Layer at 2022/2029 stations: fillCount 0, strokeCount 0, no `labelPathHints`; labels still follow `sublunarPoint`

**Visual verification**

```text
Visual verification:
- Scenario: lunar-eclipse-2029 stations upcoming / preActive / early /
  deepPartial / total / egress / after; observerCity=tokyo at total;
  Layers topic Eclipse; solar-eclipse-2017&eclipseStation=ge; night
- Viewport: Cursor built-in browser pane ~673×770 CSS (not canonical 1920×1080)
- Browser: Cursor built-in browser; npm run dev http://localhost:1420
- Inspected: no Moon-visible region/boundary UI; no map-legend overlay copy;
  2029 sequence without terrestrial visibility fill; Earth-shadow cue legend
  while active; São Paulo/Moon label at GE; solar 2017 geography; ordinary night
- Result: PASS
- Observations:
  - Layers → Eclipse Lunar eclipses: Forecast horizon, type filters, Moon
    Earth-shadow treatment. No Moon-visible region/boundary. Appearance has
    no Lunar visibility color/thickness/opacity. Lunar Earth-shadow cue remains
  - upcoming 2029-06-25T18:00Z: Upcoming / in 6h 35m; placard Visibility at
    greatest eclipse (night-side hemisphere wording); no Map geography legend
  - preActive 00:29:32Z: still Upcoming / in 5m; no overlay legend
  - early 00:50Z: Active / Penumbral; Map geography Earth-shadow cue only
  - deepPartial 02:20Z: Active / Partial umbral; cue legend only
  - total 03:22:05Z: Active / Total; cue legend; HUD Lunar eclipse · Total ·
    visible; label Total lunar eclipse · active; no Moon-visible now / horizon
    legend rows
  - egress 04:40Z: Active / Partial umbral; cue legend only
  - after 06:20Z: no eclipse panel or HUD eclipse row
  - Tokyo at GE: HUD/placard local Not visible from Tokyo; global event/cue
    legend unchanged
  - 2017 solar GE: Forecast path / live central / Alignment legend unchanged
  - night: no eclipse furniture
```

**Not verified**

- Canonical 1920×1080 viewport
- Continuous 100× demo playback through P1 this session (deterministic P1± layer/illumination tests used instead; geography primitives are gone)
- Writable Config toggle session (visual scenarios isolate persistence and render Config read-only)
- Dedicated polar visual scene

**Discovered, not done**

- `lunarEclipseEventForecastGeometry` is still attached to lunar forecast selections on the eclipse frame; map and placard do not paint it
- Proposed LIB-037 remains proposed

