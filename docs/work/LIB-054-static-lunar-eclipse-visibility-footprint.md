# LIB-054 — Static lunar eclipse visibility footprint

| Field | Value |
|-------|-------|
| ID | LIB-054 |
| Status | complete |
| Created | 2026-08-20 |
| Approved | 2026-08-20 (human; this request) |
| Completed | 2026-08-20 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Give lunar eclipses meaningful event geography: one static closed terrestrial boundary enclosing every location from which some part of the eclipse is geometrically visible at any time during the authoritative event interval. The footprint appears according to the existing lunar forecast horizon, stays invariant for the event id, and disappears after last contact.

## Scope

**In scope**

- Event-whole lunar eclipse visibility footprint (line-only, factory ON).
- Authoritative `globalStartMs`/`globalEndMs` interval (P1→P4 when those contacts exist).
- Cache by event id / authority / algorithm, not product time.
- Config, placard/legend copy, focused tests, visual verification, docs.

**Out of scope**

- Restoring instantaneous Moon-visible fill/horizon, lifecycle geometry switches, or terrestrial lunar shading.
- Changing lunar eclipse authority, physical moonlight, solar geography, or event-label architecture.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant.
- [ADR 0010](../decisions/0010-eclipse-events-global-circumstances-derived.md) — global geography; reference city never selects it.
- [ADR 0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) — footprint is informational overlay only.
- No new ADR expected; update the eclipse-system spec.

## Design notes

- **Definition:** location P belongs to the footprint iff there exists t in `[globalStartMs, globalEndMs]` with geometric lunar altitude ≥ 0° (spherical `lunarDot ≥ 0`, no refraction).
- **Not:** Moon-visible now, a moving horizon, a lunar shadow path, or a fill.
- **Lifecycle:** absent before forecast horizon; full eventual footprint from horizon entry through event end; gone after `globalEndMs`.
- **Construction:** sampled spherical union of Moon-up hemispheres along the sublunar track, extracted as one closed equirect ring around the visible band.

## Acceptance criteria

See the authorizing request completion criteria 1–38. In short: static line-only footprint; default ON; start/end/intermediate containment; forecast=active geometry; horizon appearance and end disappearance; no old moving overlay; total/partial/penumbral; dateline/polar/reference-city/illumination regressions; tsc/test/build green; AWAITING SCOPE.

## Verification plan

- Focused tests: footprint geometry, subset, static hash, config, layer lifecycle, legend, illumination identity, solar 2017
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — confirm DEV scenario ids absent from production bundle
- Visual verification: required — 2029 stations plus partial/penumbral/dateline. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

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

Lunar eclipses now have event-whole map geography: one static closed line enclosing every location where the Moon is geometrically above the horizon at any time in `[globalStartMs, globalEndMs]` (P1→P4 when those contacts exist, including penumbral). Construction `lunar-visibility-footprint-v1` samples the sublunar track at 2 min plus endpoints/GE/P1/P4, classifies meridians by max lunarDot, and extracts one equirect ring. Cached by `authorityVersion|algorithmId|sampleStepMs|eventId`, not product time. Factory checkbox **Lunar eclipse visibility footprint** ON (`#6a9aa8`, normal thickness). Appears with the existing lunar forecast horizon; identical through forecast and active; gone after last contact. Line only — LIB-046 removal of moving Moon-visible fill/horizon stays correct. No new ADR.

**Commands run**

- Focused footprint / layer / appearance / information / illumination / LayersTab / sceneConfig tests — 164 passed (9 files)
- `npx tsc --noEmit` — clean
- `npm test` — 251 files / 2320 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-Br2kB08x.js`). `lunar-eclipse-2029` / `eclipseStation` / `iss-presentation` / `visualScenarios` absent from `dist/`
- Cursor Browser at `http://localhost:1420` (`npm run dev`)

**Actual results**

P1→P4 authority for total `nasa-5mcle-lunar-9700`, partial `9668`, penumbral `9420`. Start / 25% / GE / 75% / end Moon-up interiors contained; GE zenith antipode excluded. City `locallyVisible` agrees with footprint membership. Same `geometryHash` for a given event id (cache identity). Cold 1+2+5 min builds &lt; 200 ms; cache hit &lt; 5 ms. Footprint ON/OFF: overlay stroke 1 vs 0; solar-shading payload identical.

**Visual verification**

- Browser: Cursor built-in (`cursor-ide-browser`). Vite `http://localhost:1420`.
- Viewport: Cursor pane ~774×769 CSS px (not guaranteed 1920×1080). One reload under `Emulation.setDeviceMetricsOverride` 1920×1080 (`window.innerWidth` 1920; canvas ~1888×1079) confirmed the same line locally; compositor screenshots of that override cropped to the pane, so remaining stations used the full-world pane view.
- `lunar-eclipse-2029`: upcoming / preActive / early / deepPartial / total / egress — one static cool closed line, no fill; after `06:20Z` — line and placard gone. `&horizon=0` at upcoming UTC — no line. Tokyo at GE — same global line; HUD not-visible-now. Placard: Visibility footprint / “Some part of this lunar eclipse is visible inside the boundary.”
- Config Layers → Eclipse: checkbox ON after type filters; color `#6a9aa8`; no Moon-visible region/boundary controls.
- `lunar-eclipse-partial`, `lunar-eclipse-horizon`, `lunar-eclipse-forecast-total`, `solar-eclipse-2017&eclipseStation=ge`, `night`.

**Not verified**

- Exact 1920×1080 compositor capture of the full world (pane limitation; override inner size was 1920×1080).
- Dedicated DEV scenario for a penumbral *event* (automated `nasa-5mcle-lunar-9420` only). 2022 `eclipsePhase=penumbral` is a phase of a total event.
- Dedicated P4−1s visual station (automated hash; visual used egress then after).
- Exact 7-day horizon-entry minute on the 2029 clock (automated layer test; visual used `horizon=0` vs default 7-day upcoming).
- Milky Way / planets z-order with the footprint in one composed scene (footprint is another eclipse overlay; no redesign).

**Discovered, not done**

- A dedicated penumbral-eclipse visual scenario was not added (catalog already covered in tests).
- Exact spherical envelope (Construction A) was not required; sampled union is the shipped algorithm.
