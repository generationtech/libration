# LIB-038 — Space objects configuration + ISS presentation controls

| Field | Value |
|-------|-------|
| ID | LIB-038 |
| Status | complete |
| Created | 2026-08-17 |
| Approved | 2026-08-17 (human; this request) |
| Completed | 2026-08-17 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Add a durable Layers topic **Space objects** as the configuration home for future tracked space objects, and implement user-facing ISS presentation controls (orbit track, past/future segments, colors, thickness, glyph, size, label) without changing ISS orbital authority, acquisition, provenance, freshness, product-time policy, or SGP4 correctness.

## Scope

**In scope**

- New Layers topic `Space objects` (UI-only navigation; not a new Config tab).
- ISS-only presentation subtree on the existing `orbitalTracks` / `dynamicTracks` row.
- Orbit-track master independent of the Layer masters ISS enable checkbox and of the current-position glyph.
- Independent past/future track toggles, colors, shared line thickness, glyph type/size/color, label toggle.
- Configurable past/future duration **within the existing acquired −60 / +30 minute window**, using sample timestamps vs `productUtcMs`.
- Internal vector ISS silhouette glyph (optional direction-of-travel rotation).
- Normalization, persistence, focused tests, visual verification, proportional docs.

**Out of scope**

- Other satellites, spacecraft, planets, or a generic space-object engine.
- New tracked objects or data providers.
- ISS TLE provider, freshness thresholds, fallback policy, SGP4, current-position calculation, dynamic current-only policy.
- Historical ISS support.
- Renderer expansion for dashed lines.
- Proposed LIB-037 (propagation timestamp audit) unless this item unexpectedly proves a propagation defect.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics resolve upstream of `RenderPlan`; no network in the render path.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md), [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- Presentation only. Do not move orbital truth into the backend.

## Design notes

- Layer masters keeps the single ISS visibility master (`orbitalTracks`). Space objects holds presentation for that enabled layer.
- Track past/future segmentation uses each sample’s `timeMs` relative to `productUtcMs`, not geometric midpoint or vertex index.
- **Duration decision:** expose discrete past/future extents that fit the existing acquisition window (−60 / +30 min at 2 min steps). Do not expand acquisition lookback/lookahead. Past options: 15 / 30 / 45 / 60 min (default 60). Future options: 15 / 30 min (default 30). “Off” is the independent Track past / Track future toggle, not a duration value. 90 min past and 45–60 min future are omitted because they would require changing acquisition.
- Orbit base color is the canonical ISS color: label family and missing-key fallback for past/future/dot/glyph colors. Past and future colors are stored explicitly.
- Factory defaults reproduce the current visual family (cyan/blue trail, lighter future alpha, current disc marker, `ISS` label on).

## Acceptance criteria

- Layers contains Space objects in the expected topic order; default topic remains Layer masters; topic navigation stays UI-only.
- ISS is the only object family in that topic.
- Orbit track can be disabled while the current ISS glyph remains.
- Past and future segments toggle and color independently; shared line thickness is configurable.
- User can choose Dot or ISS silhouette; size is configurable; colors are conditional; label is configurable (default on).
- Current position stays visually primary (drawn after track segments).
- Config persists/normalizes; missing keys receive defaults; explicit values survive.
- Historical/unavailable/excessively-stale ISS remains suppressed regardless of presentation config.
- Dateline wrap: no world-spanning false line; no duplicate current glyph except legitimate wrap.
- Focused tests, `npx tsc --noEmit`, full `npm test`, `npm run build`, and Cursor Browser visual verification pass.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: Layers topic order/navigation; ISS presentation normalize/persist; track/past/future gating; colors; thickness; glyph type/size; label; historical suppression; seam/wrap
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — Config / scene / RenderPlan / overlay
- Visual verification: required — ordinary current-time ISS if a live TLE is usable; otherwise a DEV fixture for presentation only, with that limitation recorded. Follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md). Restore defaults after testing.

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — Space objects topic, ISS presentation, temporal segmentation, glyph choices
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — Space objects as configuration home; do not mark other satellites/planets implemented
- ADR: none expected

## Completion record

Fill only when completing.

**Implementation summary**

Layers gained a UI-only **Space objects** topic (after Astronomy paths, before Advanced). ISS remains the only object family. Presentation lives on the existing `orbitalTracks` `dynamicTracks` `source.parameters` subtree (`IssOrbitalPresentation`); Layer masters still owns the visibility checkbox. Orbit track gates trajectory lines only. Past/future toggles, discrete durations inside the acquired −60/+30 min window, explicit base/past/future colors, shared thin/normal/thick stroke, Dot vs internal ISS silhouette (travel-heading rotation), glyph size, conditional colors, and Show ISS label were added. Acquisition, TLE provider, SGP4, provenance, freshness, and current-only policy were not changed. No ADR.

**Commands run**

- `npx tsc --noEmit`
- focused vitest covering presentation, Layers topics, overlay, RenderPlan, sceneConfig
- `npm test`
- `npm run build`
- Cursor Browser at `http://localhost:1420/` (ordinary current-time mode, no `?scenario=`)

**Actual results**

- `npx tsc --noEmit` clean
- focused vitest: 135 passed (after two assertion fixes: silhouette heading for wingspan-along-X; RenderPlan honors `pastEnabled`/`futureEnabled` even when segment samples are present)
- `npm test`: 216 files / 2046 passed / 0 failed
- `npm run build` succeeded (`dist/assets/index-CRKEA4Ve.js`)

**Visual verification**

Cursor Browser, ordinary `http://localhost:1420/`, Layers tab. Viewport ~703×769 CSS, dpr ~1.30 — not canonical 1920×1080. Topic list: Layer masters, Map, Illumination, Eclipse, Moon & libration, Astronomy paths, Space objects, Advanced. Default topic Layer masters. Space objects showed International Space Station (ISS) with Orbit & track and Current position; factory values as in the design notes. Orbit track OFF disabled track children; glyph and label stayed enabled. ISS glyph ISS silhouette hid ISS dot color and showed ISS glyph color; restored to Dot. Topic change to Advanced still used sticky nav. Defaults restored (track on, past/future on, 60/30 min, normal thickness, Dot, Medium, label on). CelesTrak `Failed to fetch`; Layers masters showed “ISS orbital track is unavailable.” No fixture painted on the map (LIB-036). No DEV ISS hatch was added, so map-level glyph/track appearance was not inspected.

**Not verified**

- Live ISS map appearance (CelesTrak unreachable this session)
- Canonical 1920×1080 viewport
- Silhouette rotation on a live dateline pass
- Independent past-off / future-off / custom-color / thickness-extrema / size-extrema / label-off on the map (covered by RenderPlan tests; not seen in pixels)

**Discovered, not done**

- 90 min past and 45–60 min future would need a longer acquisition window
- Other satellites, spacecraft, planets
- Proposed LIB-037 remains proposed
