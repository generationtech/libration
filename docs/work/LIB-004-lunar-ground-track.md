# LIB-004 — Toggleable lunar ground track

| Field | Value |
|-------|-------|
| ID | LIB-004 |
| Status | complete |
| Created | 2026-08-14 |
| Approved | 2026-08-14 (human) |
| Completed | 2026-08-14 |

Human-authorized next ordinary product item after LIB-003. Do not activate in the planning session that created this file; activate only when selected for execution.

## Objective

Add a toggleable **Lunar Ground Track** overlay: the geographic trajectory of the **sublunar point** across Earth around the current authoritative product time. The existing Moon marker remains the instantaneous sublunar point and must lie on that track. There is one lunar-position truth: every sample, including the current point, uses `sublunarPoint` from `src/core/sublunarPoint.ts` — the same function the marker already uses. Do not introduce a second lunar ephemeris.

This is a **ground track**, not a lunar analemma. The solar analemma is a year-long locus at one UTC clock time per day. This overlay is a time-windowed open path (past → now → future) of the moving sublunar point.

## Scope

**In scope**

- Durable Layers-tab enable/disable for **Lunar ground track**, default **off**.
- Independent visibility from the sublunar marker (either, both, or neither).
- Sample `sublunarPoint` at relative offsets from `TimeContext.now` for a configurable past window, the current instant, and a configurable future window.
- Default window: **24 h past + 24 h future** (48 h total), unless implementation visual inspection shows that window is too dense; if shortened, document why under **Discovered, not done** only if the default itself must change, otherwise record the chosen default in the completion record.
- Independent past/future extent controls from a bounded set: 6 h, 12 h, 24 h, 48 h, 72 h.
- Internal sampling interval (not a user control). Start near **10 minutes**; tighten toward 5 minutes only if the curve is visibly faceted at canonical 1920×1080.
- Past vs future rendered with different prominence (past quieter; future normal; current Moon marker separates them when that marker is on).
- Correct equirectangular dateline/seam behaviour using existing unwrap / short-strip machinery.
- Latitude from the live lunar model at each sample (no tropical clamp, no fixed lunar-latitude envelope).
- Product-time behaviour: real time, demo playback, pause, and rewind/advance all flow through the canonical instant. No `Date.now()` in the overlay path.
- Config ownership, normalization defaults, and persistence round-trip for the new stack row and extent parameters.
- DEV-only `?scenario=lunar-track` fixture (fifth canonical scenario), plus Cursor-native visual verification.
- Tests at config, sampler, seam, time, and RenderPlan boundaries.
- Proportional `docs/IMPLEMENTATION.md` and `docs/VISUAL_VERIFICATION.md` updates on completion.

**Out of scope**

- Lunar standstill envelope; 18.6-year nodal visualization; lunar analemma; Moon orbit in space.
- Lunar rise/set lines; eclipse prediction; lunar libration visualization.
- Major improvements to the underlying lunar ephemeris.
- General satellite-track framework redesign; solar analemma redesign.
- Renderer refactoring; GPU work; unrelated overlay styling; general config-panel redesign.
- New overlay-readability `perLayer` pilot (the six-key pilot set stays closed unless the track is unreadable without one; if so, stop and record it).
- User-facing sampling-interval or arbitrary numeric quality control.
- Mandatory time labels along the track.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant per frame; product semantics resolve upstream of rendering; `RenderPlan` is the hard boundary; `SceneConfig` is authoritative for scene content; backends do not decide product behaviour.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md) — plan builders may know overlay geometry; the Canvas backend executes primitives only.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md) — overlay time is `TimeContext.now` only.
- Cursor rules `010` (RenderPlan), `020` (scene system), `060` (visual verification).

Expected flow:

```
TimeContext.now
→ sample sublunarPoint at relative offsets
→ semantic lunar-ground-track geometry (core)
→ layer state / RenderPlan line (and optional tick) primitives
→ existing backend execution
```

The Canvas backend must not learn lunar astronomy, past/future semantics, or product time. Do not call `Date.now()` inside the sampler, layer, or plan builder.

### Design decisions from planning inspection

These are binding unless source inspection during implementation finds a documented reason to stop.

**Relationship to the solar analemma.** Architectural precedent only: derived astronomy vector, `SceneConfig` stack row, factory product dispatch, overlay-readability frame, equirect polyline seam handling. Do **not** clone analemma sampling (year-long closed daily locus, optional frozen `utcHour`). Do not name this overlay a lunar analemma.

**Lunar model.** `sublunarPoint(utcMs)` is the sole geographic source. The marker already uses it plus `approximateLunarPhase` for the glyph. The track does not need phase. Assert that the sample at offset 0 equals `sublunarPoint(now)` (and therefore the marker coordinates) within ordinary floating-point tolerance.

**Motion scale.** The sublunar point circumnavigates Earth roughly once per day (Earth rotation minus lunar orbital motion, on the order of 14–15° of longitude per hour). A 48 h window therefore wraps the map nearly twice. That is why seam handling and past/future distinction matter, and why implementation may shorten the default after visual inspection.

**Configuration owner.** `SceneConfig` is authoritative.

| Concern | Owner |
|---------|--------|
| Enable/disable | New stack row `lunarGroundTrack` on `scene.layers[]`; mirror boolean `layers.lunarGroundTrack` on `LayerEnableFlags` (same dual surface as `solarAnalemma`) |
| Past/future extent | `source.parameters` on that derived row (`pastHours` / `futureHours`), not `LayerEnableFlags` |
| Sampling interval | Internal constant or bounded internal quality choice — not persisted |
| Layer opacity | Existing `SceneLayerInstance.opacity` only; no new thickness/dash framework |

Normalization must insert the missing stack row with **enabled false**, past **24**, future **24**, for existing persisted documents. Invalid extents clamp to the allowed set. `sceneRuntimeAffectingEqual` already compares derived `source.parameters`; keep it that way.

**Stack order.** Insert `lunarGroundTrack` immediately **before** `sublunarMarker` in `SCENE_STACK_LAYER_IDS` so the Moon marker draws on top of the track. Family `astronomy`, type `astronomyVector`, derived product id `sublunarGroundTrack`. Default `enabled: false`, matching `solarAnalemma`.

**UI.** Layers tab, beside **Sublunar marker** and **Solar analemma (ground track)**. User-facing name: **Lunar ground track**. Helper text: *Shows the geographic path of the point on Earth directly beneath the Moon around the current product time.* Independent past and future `<select>` controls (6 / 12 / 24 / 48 / 72 h). Do not use a single symmetric duration control: the Layers tab already hosts per-overlay extras, and independent windows are the product intent.

**Moon-marker independence.** Independent toggles. The track must not force the marker on.

**Presets.** Keep the track **off** in `full`, `minimal`, `celestial`, and `featuredCities`. Explicit preset layer objects must include the new flag as `false` so they type-check; that is a supporting seam, not a product enablement.

**Presentation.** Reuse layer opacity and the global `OverlayReadabilityFrame` (veil/lift), as the analemma polyline does. Do **not** reuse the analemma’s hardcoded warm stroke (`rgba(255, 200, 120, …)` in `equirectPolylineOverlayPlan.ts`) as the lunar identity — the two overlays must remain distinguishable. Prefer a cooler treatment consistent with the existing Moon marker / ISS-track overlay language, without prescribing exact hex in this item. Past segment: lower alpha and/or lighter stroke than future. A single undifferentiated line is allowed only if past/future styling is visually worse at 1920×1080; record that choice.

**Seams.** Reuse unwrap + short-strip pairing from `equirectPolylineOverlayPlan.ts` and/or `sceneDynamicTracksPlan.ts`. Extract a shared helper if both copies would be touched; do not add a third wrap system. Open polyline (`closed: false`). A longitude jump across ±180° must not emit a world-spanning segment.

**Payload / plan.** Implementation may (a) extend the equirect polyline payload with a small upstream-resolved style/series split, (b) emit two polylines, or (c) add a dedicated lunar-ground-track plan builder that still uses existing `line` primitives. Do not teach `CanvasRenderBackend` product names. Do not add RenderPlan primitive kinds.

**Caching.** `LayerRegistry.getRenderableState` calls `getState` every frame even for `interval` policies, so do not rely on `UpdatePolicy` to skip work. Memoize samples keyed by a product-time bucket (sample interval or 1 minute) plus extent/config. Recompute when the bucket or configuration changes. Do not invent a new derived-state subsystem. Blind 60 FPS full-track rebuild while paused is not acceptable.

**Interval markers.** Include **unlabeled 6-hour ticks** if they stay visually clean (they help read overlapping wraps). Realize them as existing point or short-line primitives in the same upstream plan, not a new marker type. Defer labeled offsets (`-12h`, `+6h`) and any extra “current” marker — the Moon glyph is the current point. If ticks clutter, omit them and record that under **Discovered, not done**.

**Local decisions allowed during implementation:** sample interval within 5–10 minutes; exact module placement in `src/core/` + layer + plan builder; memoization key; exact line style via existing mechanisms; whether 6-hour ticks ship; exact `lunar-track` UTC after inspecting a dateline crossing and a useful latitude excursion.

**Must not be redefined:** authoritative product time; `sublunarPoint`; RenderPlan boundary; SceneConfig authority; this item’s scope. If a larger architectural change appears necessary, stop and record it under **Discovered, not done**.

## Acceptance criteria

1. Lunar Ground Track has a durable user-facing enable/disable control; default is **off**.
2. Existing persisted configurations load; missing row/parameters normalize to off / 24 h / 24 h.
3. Every track sample, including the current point, is `sublunarPoint` at the corresponding canonical instant; the rendered Moon marker lies on the track to the accuracy of that model when both are enabled.
4. The track is computed around `TimeContext.now` (real or demo). Display modes do not alter sampling except through that instant.
5. Past and future extents are independently configurable from {6, 12, 24, 48, 72} hours; default 24 + 24 unless visual inspection documents a different default.
6. Advancing, rewinding, and pausing product time update or freeze the geometry accordingly. Paused demo time is stable across frames.
7. Dateline crossings do not draw false world-spanning segments; wrap behaviour matches existing equirect seam conventions.
8. Latitude is unconstrained except by `sublunarPoint`; no tropical clamp.
9. Geometry is renderer-neutral and reaches the backend only as resolved `RenderPlan` primitives. The backend contains no lunar-position or product-time logic.
10. Moon marker and track visibility are independent.
11. Identical full-track geometry is not recomputed every animation frame when product time (bucket) and configuration are unchanged.
12. Disabled overlay emits no track primitives.
13. `npx tsc --noEmit` is clean; `npm test` has zero failures.
14. Cursor-native visual verification is performed per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md), including `baseline`, `night`, and `lunar-track`.
15. Visual inspection confirms: Moon-on-track alignment; smooth path; readable past/future; no dateline artifact; no chrome intrusion; updates with time; stable when paused; config changes visible; disable leaves no artifact.
16. No unrelated lunar, renderer, or config-panel redesign.

## Verification plan

- Focused tests:
  - Config: default off; normalization/migration of documents lacking the row; persistence round-trip of enable + extents; `deriveLayerEnableFlagsFromScene` / `applyLayerEnableFlagsToScene`; factory dispatch for product `sublunarGroundTrack`.
  - Sampler (`src/core/`): deterministic samples at a fixed UTC; sample at offset 0 equals `sublunarPoint(now)`; past/future span matches configured hours; sample count consistent with the chosen interval; latitude not clamped; no `Date.now()` in the module.
  - Time: geometry changes when `TimeContext.now` changes; identical `now` yields identical geometry (paused stability).
  - Seams: a synthetic or known dateline-crossing sequence does not produce a segment whose longitude delta is a world-spanning wrap.
  - RenderPlan: enabled → expected line (and optional tick) primitives; disabled → none. Do not add a second ephemeris gold standard.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — the change adds a DEV visual scenario and touches application config/entry-adjacent surfaces (`visualScenarios.ts` is imported from `main.tsx` in DEV). Confirm the production bundle still omits the scenario registry.
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md). Iterative loop: implement → render → inspect → correct → render again.

### Visual scenarios

| Scenario | Role |
|----------|------|
| `baseline` | Track off by default; no leftover geometry; ordinary overlays unchanged. |
| `night` | Enable the track (and marker) against dark-side / night-lights substrate; readability. |
| `lunar-track` | **New** DEV fixture (catalog today has four ids; LIB-001 requires a work item to add more — this item is that authorization). There is no documented eight-scenario cap. |

`lunar-track` requirements:

- Paused demo UTC chosen during implementation for a visible dateline crossing and a useful north/south excursion (do not guess the ISO here).
- Lunar ground track on, with both past and future extents at the default window.
- Sublunar marker on (alignment check). Solar analemma **off** so the two overlays are not confused.
- Substrate where the path is legible (factory default or another bundled family if default hides the line).
- Development fixture only; production ignores `?scenario=`.

Also inspect ordinary startup without `?scenario=` after scenario work, per the visual-verification procedure.

## Documentation impact

- `docs/IMPLEMENTATION.md` — new overlay in the scene stack, sampling rule, config parameters, factory product.
- `docs/VISUAL_VERIFICATION.md` — add `lunar-track` to the scenario catalog when the fixture ships.
- `docs/ROADMAP.md` — move this item out of **Approved, not started** on activation/completion as workflow requires.
- `docs/STATE.md` and `docs/DEVELOPMENT_LOG.md` on completion.
- This work item’s completion record.

Do not create a shipped-feature ledger. Do not copy current status into architecture docs.

## Completion record

**Implementation summary**

Toggleable **Lunar ground track** overlay: `sampleLunarGroundTrack` samples `sublunarPoint` around `TimeContext.now` (default 24 h past + 24 h future, 10-minute interval, unlabeled 6-hour ticks). Scene stack row `lunarGroundTrack` (product `sublunarGroundTrack`) sits immediately before `sublunarMarker`. Layers tab owns enable plus independent past/future extents. Default and all named presets remain **off**. Dedicated payload/plan builder emits cool past/future polylines; Canvas backend dispatches on payload kind. Shared `equirectSeamPath.ts` unwraps dateline segments. Sampler cache is keyed by 1-minute product-time bucket plus extents; current point is always live `sublunarPoint(now)`. DEV scenario `lunar-track` at `2026-01-16T22:00:00.000Z`.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `rg lunar-track|visualScenarios dist/`
- Cursor Browser: `http://localhost:1420/?scenario=lunar-track`, `?scenario=baseline`, `?scenario=night`, then `http://localhost:1420/` (no query). Viewport `Emulation.setDeviceMetricsOverride` 1920×1080; CDP `innerWidth`/`innerHeight` confirmed 1920×1080 on `lunar-track`.

**Actual results**

- `npx tsc --noEmit`: exit 0 (clean)
- `npm test`: 166 files / 1525 passed / 0 failed
- `npm run build`: `tsc && vite build` succeeded (`dist/assets/index-Bk9mzrZr.js`)
- Production `dist/` contains neither `lunar-track` nor `visualScenarios`

**Visual verification**

- Scenario: lunar-track
- Viewport: 1920×1080 (CDP override; `innerWidth`/`innerHeight` 1920×1080)
- Browser: Cursor built-in browser
- Inspected: banner id/UTC; Moon-on-track alignment; past quieter than future; unlabeled 6-hour ticks; dateline/wrap (no world-spanning segment); chrome/scene layout; disable independence; past-extent 24→6 h
- Result: PASS
- Observations: banner `scenario: lunar-track · 2026-01-16T22:00:00.000Z · persistence isolated`. Cool nearly-horizontal southern track (expected 48 h wrap). Moon glyph on the path in the South Pacific near the dateline. Unlabeled tick discs along the path. Unchecking **Lunar ground track** removed the line; **Sublunar marker** stayed. Changing past extent to 6 h updated the Layers select and left the Moon on a shorter quieter past segment with future still extending east. Paused demo clock was frozen (scenario transport). Chrome did not clip the overlay.

- Scenario: baseline
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: default track off; ordinary overlays
- Result: PASS
- Observations: banner `scenario: baseline · 2030-06-15T12:00:00.000Z · persistence isolated`. No lunar ground-track geometry. Ordinary overlays and city pins unchanged.

- Scenario: night
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: default off; then Layers enable against dark-side / night-lights substrate
- Result: PASS
- Observations: banner `scenario: night · 2026-12-21T06:00:00.000Z · persistence isolated`. Track off until enabled. After enable, cool track readable over the dark Pacific; Moon on the path; past quieter west of the Moon, future stronger east; no seam artifact.

- Ordinary startup: `http://localhost:1420/` (no `?scenario=`)
- Viewport: same tab after scenario work
- Browser: Cursor built-in browser
- Inspected: no scenario banner; no scenario leakage into body text
- Result: PASS
- Observations: `location.search` empty; `document.body.innerText` started with Config only (`hasBanner: false`).

**Not verified**

- Live demo-time advance/rewind in the browser (pause stability observed via frozen scenario clock; `TimeContext.now` geometry change/identity covered by unit tests)
- Sub-pixel Moon-on-track coincidence (visual alignment plus sampler equality tests)

**Discovered, not done**

- Default 24 h + 24 h is a nearly horizontal overlapping band because the sublunar point circumnavigates ~once per day. Kept that default; it is readable and past/future remain distinguishable. Not a product change.
- No overlay-readability `perLayer` pilot was required.
- Labeled time offsets along the track remain out of scope.
