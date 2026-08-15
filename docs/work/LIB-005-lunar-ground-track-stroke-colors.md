# LIB-005 — Lunar ground track past and future stroke colors

| Field | Value |
|-------|-------|
| ID | LIB-005 |
| Status | complete |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (human) |
| Completed | 2026-08-14 |

Human-authorized follow-on to [LIB-004](LIB-004-lunar-ground-track.md): durable Layers-tab color controls for the past and future lunar ground-track polylines. Authorized to create, approve, activate, and execute in the same request.

## Objective

Let the user choose the **RGB identity** of the lunar ground track’s **past** (before product time) and **future** (after product time) lines, independently. Defaults must match the LIB-004 cool stroke so an unmodified document looks the same. Past remains quieter than future via the existing alpha/veil treatment, not via a second alpha control.

## Scope

**In scope**

- Durable `source.parameters` on the `lunarGroundTrack` derived row: `pastColor` and `futureColor`, persisted as canonical `#rrggbb`.
- Normalization: missing or invalid values become the LIB-004 default cool RGB (`#aacdf0`, i.e. `rgb(170, 205, 240)`).
- Layers-tab `type="color"` controls beside the existing past/future extent selects. Independent pickers; no single shared color.
- Colors reach the Canvas backend only as resolved `line.stroke` strings on existing primitives. No new RenderPlan kinds. Backend learns no product names.
- Tests at config/normalization, factory/payload, and RenderPlan stroke boundaries.
- Proportional `docs/IMPLEMENTATION.md` update.
- Cursor-native visual verification on `?scenario=lunar-track` (default look unchanged; a color change is visible).

**Out of scope**

- Tick-disc color, stroke width, dash, or a third “current” marker color.
- Alpha / opacity pickers; overlay-readability `perLayer` for this overlay.
- Solar analemma color; general overlay-color framework; config-panel redesign.
- Sampler, extents, ephemeris, or seam-unwrap changes.
- A new visual scenario.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of rendering; `SceneConfig` authoritative; `RenderPlan` is the hard boundary.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md) — plan builder may resolve stroke CSS; backend executes primitives.
- Cursor rules `010`, `020`, `060`.

```
SceneConfig source.parameters.pastColor / futureColor
→ layer payload (already-resolved CSS)
→ plan builder applies existing past/future alpha + veil
→ line.stroke on RenderPlan
→ existing backend execution
```

Do not call `Date.now()`. Do not teach `CanvasRenderBackend` lunar or color-policy knowledge.

### Binding decisions

- **Owner:** `SceneConfig` derived-row `parameters`, same dual-surface pattern as `pastHours` / `futureHours`. Not `LayerEnableFlags`.
- **Canonical persist form:** lowercase `#rrggbb`. HTML color inputs emit that form. `#rgb`, `rgb()`, and `rgba()` (alpha discarded) canonicalize on normalize; anything else → default.
- **Default:** both past and future `#aacdf0`. Past/future distinction stays the existing quieter/stronger alpha in `lunarGroundTrackPlan.ts`.
- **Ticks:** keep the current unlabeled cool discs. No tick color control.
- **Rebuild:** `sceneRuntimeAffectingEqual` already compares derived `parameters`; changing a color must rebuild the layer registry the same way extents do.
- **Local decisions:** exact Layers-tab labels; whether a tiny `lunarGroundTrackAppearance` helper lives in `src/core/` (preferred: keep sampling out of presentation).

## Acceptance criteria

1. Layers tab has independent past and future color controls for the lunar ground track.
2. Default colors match the LIB-004 cool RGB; default `lunar-track` scene still looks like that cool track.
3. Missing/invalid persisted colors normalize to the default `#aacdf0`.
4. Changing past color changes only the past polyline hue (future unchanged) at the RenderPlan stroke; vice versa for future.
5. Past remains lower-alpha than future at the same veil/opacity when both use the default (and when both use the same custom RGB).
6. Backend still dispatches on payload kind and executes `line` primitives; no product-name or astronomy branch.
7. `npx tsc --noEmit` clean; `npm test` zero failures.
8. Visual verification per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) on `lunar-track`: default cool track; then a distinct past vs future color pick is visible; chrome unharmed.

## Verification plan

- Focused tests: normalization/round-trip; factory payload carries colors; plan strokes contain the configured RGB and keep past alpha < future alpha.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: no — no entry/bundle/scenario-registry change.
- Visual verification: required — `?scenario=lunar-track` at canonical 1920×1080 in Cursor’s browser. Interact with the new color controls. No new scenario.

## Documentation impact

- `docs/IMPLEMENTATION.md` — lunar ground track layer notes: `pastColor` / `futureColor`.
- `docs/STATE.md` and `docs/DEVELOPMENT_LOG.md` on completion.
- This work item’s completion record.
- `docs/ROADMAP.md` — no approved-not-started entry (this item is activated immediately).

## Completion record

**Implementation summary**

Past and future lunar ground-track RGB identities persist on the derived row as `pastColor` / `futureColor` (`#rrggbb`, default `#aacdf0`). Layers tab has independent `type="color"` pickers. The plan builder applies the existing quieter-past / stronger-future alpha and veil to those RGBs. Ticks stay the unlabeled cool discs. Invalid colors normalize to the default.

**Commands run**

- `npx tsc --noEmit`
- `npx vitest run` (focused LIB-005 files)
- `npm test`
- Cursor Browser: `http://localhost:1420/?scenario=lunar-track` at 1920×1080

**Actual results**

- `npx tsc --noEmit`: exit 0 (clean)
- Focused vitest: 8 files / 129 passed
- `npm test`: 167 files / 1530 passed / 0 failed

**Visual verification**

- Scenario: lunar-track
- Viewport: 1920×1080 (CDP; `innerWidth`/`innerHeight` 1920×1080)
- Browser: Cursor built-in browser
- Inspected: default cool track; Layers color controls present at `#aacdf0`; past `#ff3300` and future `#22cc66` change the rendered polylines; reload restores default; Moon on path; chrome unharmed
- Result: PASS
- Observations: banner `scenario: lunar-track · 2026-01-16T22:00:00.000Z · persistence isolated`. Default track remains the LIB-004 cool light stroke. After setting past to `#ff3300` and future to `#22cc66`, overlapping wraps showed both hues (reddish and green) with the Moon still on the path. Reload restored the cool default. Unlabeled tick discs stayed the original cool treatment.

**Not verified**

- Ordinary startup without `?scenario=` (no persistence/startup change in this item)
- Native OS color-picker UI (values set through the Layers color inputs)

**Discovered, not done**

- Tick discs do not follow the polyline colors. Left as the existing cool unlabeled ticks; a tick-color control was out of scope.

