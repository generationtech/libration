# LIB-025 — Solar eclipse lifecycle + shading presentation reconciliation

| Field | Value |
|-------|-------|
| ID | LIB-025 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized item. Authorized to create, approve, activate, diagnose, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not regenerate README media.

LIB-024 remains approved and paused: its ground-position marker is in the tree; README recapture is deferred until after this lifecycle reconciliation.

## Objective

Make the full solar eclipse progression read continuously and coherently from advance forecast through central-shadow entry, live transit, central-shadow exit, and final partial-eclipse completion. Keep the event corridor as stable geographic context while live partial shading, the central footprint, alignment beam, and ground-position marker follow their own authoritative lifecycles.

## Scope

**In scope**

- Diagnose 2017-08-21 overlay stack (corridor, forecast/live partial, beam, marker, ordinary solar shading).
- Derive presentation phases from existing EclipseFrame / geometry fields (no second eclipse truth model).
- Corridor continuity through upcoming, global-active pre-central, central-active, and global-active post-central.
- Re-evaluate E2 active-corridor quieting; keep path limits legible without competing with the live marker.
- Forecast representative partial region vs live partial ownership during active state.
- Alignment-beam and ground-marker lifecycle coherence (targeted beam only while a terrestrial central target exists).
- Regression tests: corridor continuity, forecast-vs-live partial, live partial continuity, beam/marker, small-step boundaries, dateline / annular / partial / hybrid.
- Cursor Browser 2017 playback and station inspection. DEV 2017 lifecycle stations if needed for verification.
- Proportional docs, STATE, DEVELOPMENT_LOG, and this completion record.

**Out of scope**

- NASA authority, Besselian math, local circumstances, or event identity unless a genuine defect is found.
- Atmospheric eclipse daylight dimming; terrain/refraction; event history; notifications; generic Astronomical Events.
- New map projection; generalized opacity animation; lunar eclipse changes.
- README edits; GIF/video; screenshot / media regeneration.
- Commits, pushes, tags, branches, or releases.
- Completing LIB-024 README recapture.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; backends must not decide product behaviour.
- ADR 0008 / 0009 / 0010 — existing authority, cached corridor, global vs derived circumstances. No new ADR unless a durable boundary is introduced.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — presentation lifecycle is not a second authority.
- Predecessors: [LIB-014](LIB-014-solar-eclipse-live-footprint.md) … [LIB-024](LIB-024-solar-eclipse-ground-position-marker.md).

## Acceptance criteria

- Root cause of apparent corridor disappearance identified and fixed.
- Sources of large changing translucent shading identified; double forecast+live partial shading removed or given a deliberate rule.
- Global-active vs central-shadow-on-Earth is an explicit presentation distinction derived from existing fields.
- Corridor remains visibly continuous through intended event phases and is not effectively invisible during central activity.
- Corridor visibility is independent of beam/marker presence.
- Forecast representative partial geography has a deliberate active-state rule; live partial owns current active partial shading.
- Alignment beam and ground marker remain scientifically correct: present only while a terrestrial central target exists; beam target coincides with the marker.
- Ordinary solar shading is not modified. No eclipse-induced daylight dimming.
- 2017 deterministic stations, small-step transitions, continuous playback, plus 2016 / 2023 annular / 2022 partial / 2023 hybrid regressions.
- Existing eclipse and ground-marker config remain intact. Canvas stays astronomy-neutral.
- Type-check, full suite, and production build pass. No README/media regenerated. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: presentation lifecycle, solar live layer, alignment, corridor continuity, config copy if changed
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production must exclude DEV scenario machinery
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) for 2017 playback and stations; alignment intensity comparison; dateline/annular/partial as budget allows

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: only if a new durable architecture boundary is introduced (expected: none).

## Completion record

**Implementation summary**

Root cause of the disappearing 2017 path: at global start (`upcoming` → `active`) E2 dropped corridor fill from 0.28 to 0.12 and stopped drawing the forecast centerline, while the live centerline exists only once `centralPoint` is on Earth. Pre-central therefore had no path stroke and a near-invisible fill. Large changing translucent regions were the live penumbral footprint, Dramatic alignment ribbons (glyph cluster → umbra), and ordinary terminator motion — not a second NASA model. Forecast GE partial was already upcoming-only in the layer; that rule is now explicit.

Presentation phases are derived from existing `EclipseFrame` fields (`resolveSolarEclipsePresentationPhase`). Corridor stays through upcoming and all globally active phases (fill ~80% of upcoming; limits stronger). Forecast centerline remains in pre/post-central; live centerline during central-active. Forecast representative partial is upcoming-only; live partial owns active shading. Targeted beam and ground marker exist only while a terrestrial central intersection exists; partial-only keeps a local glyph field. No new ADR. No README/media regeneration.

**Commands run**

- `npx tsx` authority/overlay diagnosis for `nasa-5mcse-solar-9546` stations A–F plus first/last central intersection
- `npx vitest run` focused eclipse/lifecycle/scenario/config tests during implementation
- `npx tsc --noEmit` (clean)
- `npx tsx` frame/layer cost probe (upcoming / pre-central / central / post-central)
- `npm test` (full suite)
- `npm run build`
- Cursor Browser visual inspection of `solar-eclipse-2017` stations, 1200× playback, dateline/annular/partial, ordinary startup

**Actual results**

- 2017 authority: global `2017-08-21T15:46:43.920Z`–`20:58:49.700Z`; central on Earth `16:49:13.920Z`–`20:01:43.920Z`; GE `18:25:29.700Z`
- Focused tests green (lifecycle 12, phase helper 3, alignment 22, plus layer/appearance/scenario/Layers)
- `npx tsc --noEmit` clean
- Cached `resolveEclipseFrame` ~0.0002–0.0008 ms; `layer.getState` ~0.02 ms upcoming/pre/post, ~0.18 ms central (alignment geometry). Corridor cache unchanged.
- `npm test`: 202 files / 1888 passed / 0 failed
- `npm run build`: succeeded. `dist/` contains no `solar-eclipse-2017` / `eclipseStation` / `visualScenarios`

**Visual verification**

- App: `npm run dev` at http://localhost:1420; Cursor Browser; `Emulation.setDeviceMetricsOverride` 1920×1080; innerWidth 1920
- `?scenario=solar-eclipse-2017&eclipseStation=upcoming` (14:51Z): corridor + forecast partial; no marker/beam; banner UTC matches; Lifecycle Upcoming
- `preCentral` (15:56Z): corridor limits + centerline remain; forecast partial gone; live partial Pacific wedge; no marker; no targeted beam; Lifecycle Active
- `earlyCentral` (16:58Z): vermilion marker west of Oregon; corridor visible; live partial + Dramatic ribbon to marker
- `ge` (18:25:29.700Z): marker over interior US; corridor, live partial, beam, umbra separable
- `lateCentral` (18:48:44Z): marker Carolina side; corridor still present
- `postCentral` (20:21Z): corridor still across the US; marker and targeted beam gone; live partial remains; Lifecycle Active
- `after` (21:10Z): corridor and eclipse overlays gone (Sun/Moon glyphs remain)
- Playback: Data tab 1200× from upcoming; CDP saw Lifecycle Active / Current shadow Totality while time advanced; later frame was post-event (corridor gone, eastern terminator)
- `solar-eclipse-dateline&horizon=7`: Pacific corridor, no world-spanning fill
- `solar-eclipse-annular&horizon=7`: annular corridor, antumbra marker, beam to marker, no totality styling
- `solar-eclipse-partial&horizon=7`: no fabricated corridor/marker/targeted beam
- Ordinary `http://localhost:1420/`: title Libration, no scenario banner

**Not verified**

- Pixel-golden screenshots
- Exact 1920×1080 CSS layout of the Cursor pane vs device-metrics override (innerWidth was 1920)
- Hybrid 2023-04-20 visually (automated only)
- Alignment intensity A/B at the same UTC in the browser (Dramatic used on 2017 showcase; production default remains Normal). Automated tests cover beam on/off.
- Slow 30 s product-time visual stepping (automated 30 s structural samples around contacts)

**Discovered, not done**

- LIB-024 README recapture remains deferred until an explicit later request.
- Live penumbral outlines can look blocky at coarse Besselian rings; that is authority geometry, not a second truth model.
- Dramatic alignment ribbons remain large (E5 intent). Not retuned after inspection; they read as alignment at GE/annular rather than a stale map wash.
