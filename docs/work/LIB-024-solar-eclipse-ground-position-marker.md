# LIB-024 — Solar eclipse live ground-position marker + 2017 README recapture

| Field | Value |
|-------|-------|
| ID | LIB-024 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Resumed 2026-08-16 by explicit human request after LIB-025–LIB-029 eclipse presentation work was accepted. Marker implementation remains in the tree; this activation is README recapture only.

Human-authorized item. Authorized to create, approve, activate, diagnose, implement, recapture the 2017 README screenshots, verify, and complete in the same request. Do not commit, push, tag, branch, or release.

## Objective

Make the instantaneous authoritative ground position of a live central solar eclipse unmistakable with one configurable marker at the E1 shadow-axis intersection, then recapture the six 2017 README screenshots with Extra Large Moon, Event labels off, Dramatic alignment, and a Large high-contrast ground marker.

## Scope

**In scope**

- Diagnose the existing small circle in the live central path.
- Implement or enhance one authoritative live ground-position marker (total / annular / hybrid; none for partial-only, upcoming, or completed).
- Durable enable / size / color controls in the existing Solar eclipses / Eclipse appearance groups.
- Automatic contrasting under-ring; no duplicate target calculation vs the E5 beam.
- Tests: geometry, movement, config, beam coincidence, dateline, polar (structural).
- Cursor Browser visual iteration of default color/size.
- Recapture the six `docs/images/eclipse-2017/` PNGs via the LIB-023 canvas PNG pipeline.
- Proportional docs, STATE, DEVELOPMENT_LOG, and this completion record.

**Out of scope**

- README.md edits.
- Animation / GIF / video.
- New ADR unless a durable architecture boundary is introduced.
- Commits, pushes, tags, branches, or releases.
- Changing production Moon size, Event label, or alignment-intensity factory defaults to the screenshot-session values.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; backends must not decide product behaviour.
- ADR 0008 (NASA solar authority); ADR 0009 (cached corridor); ADR 0010 (global vs derived circumstances).
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — marker is presentation, not authority truth.
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — Cursor Browser; canvas `toDataURL` for README PNGs.
- Predecessors: [LIB-014](LIB-014-solar-eclipse-live-footprint.md) … [LIB-023](LIB-023-repair-readme-screenshot-capture.md).

## Acceptance criteria

- Existing small-circle artifact is identified; no second overlapping marker with the same semantics.
- One live ground-position marker at the authoritative E1 central point when a central shadow exists.
- Total / annular / hybrid show it; partial-only / upcoming / after-event do not.
- Marker moves with product UTC along the corridor; same UTC → same position.
- Marker coincides with the E5 beam target; lies at/inside the live central footprint.
- Enable (default on), size, and color persist / normalize / reset; Solar off disables the controls.
- Automatic contrast under-ring; Canvas remains astronomy-neutral.
- Six 2017 README PNGs recaptured (genuine canvas export; Extra Large Moon; Event labels off; Dramatic on active frames; Large marker; high-contrast default color).
- Type-check, full suite, and production build pass. Repository returns to AWAITING SCOPE. README.md is not edited.

## Verification plan

- Focused tests: ground-position marker, solar live layer, beam alignment, config/persistence, RenderPlan, solar scenarios
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production must exclude DEV scenario/capture machinery
- Visual verification: required — Cursor Browser color/size iteration plus README-scale review of the six PNGs

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) only if an existing deferred “current location marker” idea is fulfilled
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)

## Completion record

**Implementation summary**

Ground-position marker implementation was already in the tree from the paused first session (vermilion `#d45a3c`, Large size, Dramatic alignment, Extra Large Moon, Event labels off via `solar-eclipse-2017` showcase). This completion is the deferred README recapture after LIB-025–LIB-029 were accepted. Replaced all six `docs/images/eclipse-2017/` PNGs via the LIB-023 canvas `toDataURL` pipeline from `?scenario=solar-eclipse-2017` at the LIB-022 station UTCs. No eclipse architecture, product factory defaults, or README.md edits. Capture session CSS now also zeros `html`/`body` margin so the UA 8px body margin cannot lock the canvas at 1904px.

**Commands run**

- Cursor Browser CDP: `Emulation.setDeviceMetricsOverride` 1920×1080 before navigation; `canvas.toDataURL('image/png')` after `overflow:hidden`, `margin:0`, canvas `100%`, `resize`
- PIL: dimensions, SHA-256 prefixes, left-vs-+912 uniqueness, #2–#5 framing diffs
- Lossless #6 crop from GE frame, box `(220,90,900,630)` → 680×540 RGB
- `npx tsc --noEmit`
- `npm test`
- `npm run build` plus `dist/` scenario-registry check

**Actual results**

| File | UTC | px | bytes | sha256 prefix |
|------|-----|----|------:|---------------|
| `eclipse-2017-01-forecast.png` | 2017-08-16T18:00:00Z | 1919×1079 | 2678035 | `98ae8032d6b3c421` |
| `eclipse-2017-02-active-path-overview.png` | 2017-08-21T18:00:00Z | 1919×1079 | 2673455 | `5b2d2dcb026fb68a` |
| `eclipse-2017-03-active-early.png` | 2017-08-21T17:16:44Z | 1919×1079 | 2692993 | `c41b180cadabe380` |
| `eclipse-2017-04-active-mid.png` | 2017-08-21T18:25:29.700Z | 1919×1079 | 2671838 | `cf3c219daa561e3d` |
| `eclipse-2017-05-active-late.png` | 2017-08-21T18:48:44.000Z | 1919×1079 | 2682542 | `9d3d44a87061e84f` |
| `eclipse-2017-06-beam-closeup.png` | 2017-08-21T18:25:29.700Z | 680×540 crop | 426305 | `755bd89f02c25f19` |

Honest backing 1919×1079. Not upscaled. Showcase: Extra Large Moon, Event labels off, Dramatic alignment, Large vermilion marker, Active eclipse shading Normal, 7-day horizon. #2–#5 same full-world framing (full meanAbs 3.1–8.8). left-vs-+912 meanAbs 45–59 (not tiled). `npx tsc --noEmit` clean. `npm test` 206 files / 1965 passed / 0 failed. `npm run build` succeeded; `dist/` contains no `solar-eclipse-2017` / `eclipseStation` / `visualScenarios`.

**Visual verification**

- Scenario: `solar-eclipse-2017` (`eclipseStation=ge` / `lateCentral`; Data-tab demo start for forecast / 18:00Z / 17:16:44Z)
- Viewport: requested 1920×1080 CSS; canvas export 1919×1079; Cursor pane compositor must not be captured with `Page.captureScreenshot`
- Browser: Cursor built-in
- Inspected: single top ruler, single HUD, one equirect world, no 912 px tile, no Config/DEV banner/Cursor chrome; forecast corridor without marker/beam/physical field; Oregon landfall / Nebraska / Kentucky GE / Carolina marker motion; gold Dramatic beam on active central frames; violet corridor; compact umbra; Extra Large Moon; Knoxville HUD; west/east eclipse-domain walls absent; terminator remains ordinary night; #6 crop glyph→beam→umbra with no clipped event label
- Result: PASS
- Observations: HUD `2:25:29 PM` matches NASA GE `18:25:29.700Z` (Knoxville EDT). Knoxville still reads `Eclipse · Partial 100% · max 2:34 PM` (just off the path). Far-right ±360° wrap sliver is intended seam handling. City pins remain off (showcase scenario), so README-scale pin crowding from LIB-023 does not appear.

**Not verified**

- Physical 1920×1080 OS window outside Cursor Browser
- GitHub live README rendering (README.md does not currently include these files)
- Pixel-perfect Dramatic ribbon geometry vs Normal
- Event information DOM panel (absent from canvas export)

**Discovered, not done**

- README.md still does not embed the six eclipse PNGs (explicit out of scope, unchanged from LIB-022/023).
- `fullWorldFixed` only — #6 remains a screenshot crop.
- `applyViewport` inline pixel CSS lock is genuine layout behaviour; not changed for screenshots.
- Showcase `solar-eclipse-2017` has City pins off; LIB-023 session had turned them on. Recapture followed the showcase, not that session override.
- UA default `body { margin: 8px }` must be zeroed in capture-session CSS to reach 1919×1079; recorded in [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md).
