# LIB-060 — Earthquake hover labels

| Field | Value |
|-------|-------|
| ID | LIB-060 |
| Status | complete |
| Created | 2026-08-21 |
| Approved | 2026-08-21 (human; this request) |
| Completed | 2026-08-21 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037 or LIB-058.

## Objective

Add an earthquake presentation option **Show label on hover** so a visible marker can reveal the same compact `M4.6 · place` label on pointer hover without requiring persistent labels, without duplicating an already-persistent label, and without network activity.

## Scope

**In scope**

- Durable `showLabelOnHover` on earthquake presentation (Layers → Earthquakes → Labels).
- Smallest earthquake-specific point-marker hover seam: prepared visible markers → screen-space hit descriptors → pointer hit-test → transient hover id → RenderPlan temporary label.
- Persistent labels unchanged; hover independent of the persistent label-magnitude threshold.
- Hover only for markers that already pass magnitude, age, and type filters and that the overlay would paint.
- Deterministic overlap pick; offset label placement (right/left/above/below); CSS/DPR-correct pointer mapping.
- Clear hover on pointer leave, layer disable, historical suppression, snapshot removal, and filter removal.
- Focused tests, visual verification, proportional docs.

**Out of scope**

- Click selection, detail placards, USGS URL openers, sticky selection.
- Generic map hit-test/selection framework, tooltip chrome, DOM popovers, clustering.
- New provider, feed change, poll cadence, acquisition, or persisted hover state.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; no network in the render path; backends must not decide product behaviour.
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- LIB-059 presentation/provenance remains the filter and paint authority.

## Design notes

**Config.** `EarthquakePresentation.showLabelOnHover` factory **ON**. Hover is useful detail without default map clutter. Missing persisted keys normalize to ON (same factory as other earthquake presentation keys).

**Label content.** Reuse `formatEarthquakeMarkerLabel` (`M4.6 · place`). No second hover format.

**Hit radius.** `max(renderedRadius + 2 CSS px, 7 CSS px)`.

**Overlap.** Nearest marker center, then larger magnitude, then newer `eventTimeMs`, then stable id.

**Lifecycle.** Hover id and pointer are session-only. Pointermove stores CSS scene coordinates; the existing rAF frame re-hit-tests against current projected markers (handles viewport/time change with a stationary pointer). Canvas does not interpret earthquake semantics.

## Acceptance criteria

- Show label on hover exists under Layers → Earthquakes → Labels, after Label minimum magnitude.
- Factory default is defined (ON).
- Persistent labels unchanged.
- Hover works when persistent labels are off and below the persistent label threshold.
- Persistent label is not duplicated on hover.
- Filtered-out, unpaintable, loading, unavailable, excessively stale, and historical-Demo markers are not hoverable.
- One hover label maximum; overlap resolution is deterministic.
- Label placement is offset and readable; pointer leave / layer disable / time suppression / snapshot removal clear hover.
- Config toggle updates immediately (no refetch, no Demo restart, no layer toggle).
- No network on pointer interaction; no durable hover state; no click/detail architecture.
- Canvas/DPR coordinates are CSS-scene, not backing-store pixels.
- Focused tests, `npx tsc --noEmit`, `npm test`, `npm run build` pass; DEV scenario ids absent from dist.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: hover option normalize/default; eligible / below-threshold / labels-off / hover-off; duplicate suppression; filtered not hoverable; age-out / type-filter / layer disable / historical Demo / unavailable clear hover; overlap; canvas-edge placement; CSS/DPR pointer mapping; no network
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — presentation, overlay, RenderPlan, Layers, App pointer seam
- Visual verification: required, [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item, [`docs/STATE.md`](../STATE.md), [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md), [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — hover labels become production; selection/detail remains future
- ADR: none expected unless a reusable Canvas hit-test boundary becomes durable

## Completion record

**Implementation summary**

Durable `showLabelOnHover` (factory ON) under Layers → Earthquakes → Labels. Prepared visible markers project to CSS-scene hit discs (`max(paintedRadius + 2 px, 7 px)`); App stores pointer CSS scene coords on `pointermove` / clears on leave; the existing rAF frame re-hit-tests and annotates a transient `hoverLabel` on the earthquake payload; RenderPlan paints one offset compact `M4.6 · place` label (weight 600) when the event has no persistent label. Canvas does not decide earthquake semantics. No click/selection, no network, no persisted hover id.

**Commands run**

- `npx tsc --noEmit` — clean
- `npm test` — 260 files / 2432 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-CNchYm_V.js`); `earthquake-presentation` / `visualScenarios` absent from `dist/`

**Actual results**

Hover option normalizes missing keys to ON and persists with SceneConfig. Persistent labels unchanged. Hover independent of label-minimum magnitude. Filtered-out, unpaintable, historical-Demo, and unavailable snapshots produce no hover. Overlap pick is nearest center → larger magnitude → newer event → stable id. Pointer mapping uses the canvas CSS layout box, not backing-store/DPR pixels.

**Visual verification**

Cursor Browser tab on `http://localhost:1420` (inner pane ~744×770 CSS, not canonical 1920×1080).

`?scenario=earthquake-presentation` (UTC `2026-08-21T16:00:00.000Z`, persistence isolated, status DEV fixture): factory M4+ persistent (`M4.4 Alaska`, `M4.0 Hawaii`, `M4.6 Aegean`, `M5.2 Taiwan`); smaller markers unlabeled. Hover Japan M2.5 and Chile M3.2 showed compact `M#.# · place` cream text with dark halo, offset from the disc. Labels OFF + hover ON: marker-only map except one Chile hover label. Both OFF: pointer over Chile produced no label. Min mag 5+ dropped orange clusters with status remaining DEV fixture (no refetch).

Ordinary `http://localhost:1420/`: historical Demo 2017-08-21 with Earthquakes checked showed `Live-only data is hidden while viewing another product time.` — no markers, no hover. Current time: `Earthquake data live · 1 min old`. Factory 2.5+ / 24 h / labels 4+ / hover on: worldwide orange markers with compact M4+ labels (examples: `M4.6 · 130 km W of Pangai, Tonga`, `M5.1 · south of Tonga`, `M4.4 · 17 km SSW of Tambo, Peru`). Synthetic pointermove over a visible marker: USGS `performance` resource count stayed 0.

**Not verified**

Canonical 1920×1080 viewport. Exact live GeoJSON acquired/visible/label counts. Forced first-fail / later-fail USGS in the browser. Forced stale (>10 min) live snapshot hover in the browser (unit tests cover unpaintable/unavailable). Native pointerleave screenshot after synthetic hover (coords persist in the session ref until leave; unit tests cover clear). Hover-label vs other persistent-label overlap (no collision engine).

**Discovered, not done**

Click selection, detail placard, USGS URL opener, sticky selected earthquake, generic map tooltips/DOM popovers, clustering, depth/color/age fading, PAGER/tsunami, historical FDSN, Event Playback, snapshot-store eviction, clouds/IR fixture policy. Long hover labels can overlap other persistent labels. LIB-037 and LIB-058 stay proposed.
