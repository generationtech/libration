# LIB-055 — Configurable lunar eclipse footprint line color

| Field | Value |
|-------|-------|
| ID | LIB-055 |
| Status | complete |
| Created | 2026-08-20 |
| Approved | 2026-08-20 (human; this request) |
| Completed | 2026-08-20 |

Human-authorized follow-on to [LIB-054](LIB-054-static-lunar-eclipse-visibility-footprint.md). Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Let the user customize the stroke color of the LIB-054 static lunar eclipse visibility footprint from Config → Layers → Eclipse → Eclipse appearance, as a presentation-only property. Factory default remains `#6a9aa8`. Changing color must repaint the existing line immediately without recomputing footprint geometry or reacquiring eclipse authority.

## Scope

**In scope**

- Inspect whether `visibilityFootprintColor` already exists and is wired; expose or repair, do not duplicate.
- Named control **Lunar visibility footprint color** with concise helper text.
- Persistence/normalization: missing → `#6a9aa8`; explicit colors survive save/reload; factory restore → `#6a9aa8`.
- Color and thickness remain independent. Line-only; no fill or opacity control.
- Automated regression: color-only change updates RenderPlan stroke, leaves geometry/hash, illumination, Moon glyph/Earth-shadow, and solar presentation unchanged.
- Visual verification of an unmistakable test color (`#ff00ff`) on existing footprint geometry.

**Out of scope**

- LIB-054 footprint definition, P1→P4/global interval, sampling, cache identity, forecast lifecycle, or eclipse astronomy.
- Reviving deleted LIB-046 Moon-visible-region/boundary configuration.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`.
- [ADR 0011](../decisions/0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) — footprint is informational overlay only.
- Pipeline: lunar event → cached static footprint geometry → configurable presentation stroke → `RenderPlan`.
- No new ADR expected.

## Acceptance criteria

1. Config → Layers → Eclipse → Eclipse appearance has **Lunar visibility footprint color**; it drives the footprint stroke.
2. Factory/default color is `#6a9aa8`. Missing persisted keys normalize to that; explicit colors round-trip; factory restore returns `#6a9aa8`.
3. Changing color updates the map immediately: no layer toggle, Demo/Event Playback restart, product-time advance, geometry recompute, or catalog reacquire.
4. Thickness remains independent. No fill-color or opacity control. No LIB-046 Moon-visible controls.
5. Automated regression proves color-only change: RenderPlan stroke changes; geometry/hash unchanged; illumination/raster unchanged; Moon glyph/Earth-shadow unchanged; solar presentation unchanged.
6. Visual verification covers upcoming, active, total, partial, penumbral if practical, footprint disabled, and after-event, including `#ff00ff` on identical geometry.
7. `npx tsc --noEmit` clean; `npm test` zero failures.

## Verification plan

- Focused tests: appearance/paint; sceneConfig persistence; LayersTab control; layer → RenderPlan isolation
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: no — no entry/bundle/scenario-registry change
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

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

LIB-054 already had `visibilityFootprintColor` (`#6a9aa8`), `resolveLunarEclipsePaint`, the Eclipse appearance color picker, and layer stroke wiring. The control was present, not a missing setting. This follow-up made factory identity explicit on the lunar eclipse row, set helper text to “Color of the event-wide lunar eclipse visibility boundary.”, and added persistence plus a color-only RenderPlan isolation regression. Color remains presentation: same cached `lunar-visibility-footprint-v1` boundary, independent of thickness. No duplicate path; no LIB-046 revival; no fill/opacity. No new ADR.

**Commands run**

- Focused: `npx vitest run` appearance / sceneConfig / workingV2Commit / lunarEclipseLayer / LayersTab / workingV2Persistence — 186 passed (6 files)
- `npx tsc --noEmit` — clean
- `npm test` — 251 files / 2325 passed / 0 failed
- Cursor Browser at `http://localhost:1420` (`npm run dev`)

**Actual results**

Missing `visibilityFootprintColor` normalizes to `#6a9aa8`; `#ff00ff` round-trips save/reload; factory document restores `#6a9aa8`. Color-only commit is scene-runtime-affecting (registry rebuild) without changing geometryHash; RenderPlan stroke becomes magenta RGB while path descriptors and thickness stay; solar shading payload, Moon Earth-shadow overlay/cue, and 2017 solar fills/strokes are unchanged. LayersTab: color and thickness independent; color disables when footprint is off.

**Visual verification**

- Browser: Cursor built-in (`cursor-ide-browser`). Vite `http://localhost:1420`.
- Viewport: Cursor pane ~774×769 CSS px (not canonical 1920×1080).
- `lunar-eclipse-2029&eclipseStation=upcoming`: factory cool closed line `#6a9aa8`; Config → Layers → Eclipse → Eclipse appearance **Lunar visibility footprint color** defaulted `#6a9aa8`; set `#ff00ff` — same closed geometry, immediately magenta; product UTC stayed `2029-06-25T18:00Z`; no layer toggle / Demo restart.
- Footprint checkbox off: line gone; color/thickness disabled.
- `eclipseStation=total`: magenta line, Earth-shadow Moon, physically darker night; geometry family unchanged.
- `lunar-eclipse-partial`: magenta closed line for the 2008 partial event.
- `lunar-eclipse-total&eclipsePhase=penumbral`: magenta line; Current phase Penumbral.
- `eclipseStation=after`: no line after setting `#ff00ff`; placard gone.

**Not verified**

- Canonical 1920×1080 compositor capture.
- Dedicated penumbral *event* visual (`nasa-5mcle-lunar-9420`); used 2022 total’s penumbral phase.
- Visual solar-eclipse scene after lunar color change (automated 2017 solar payload identity only).
- UI “factory reset” button (tested via `defaultLibrationConfigV2()` / null-storage startup).

**Discovered, not done**

- None.
