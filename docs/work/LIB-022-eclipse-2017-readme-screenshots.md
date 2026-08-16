# LIB-022 — 2017 total solar eclipse README screenshot set

| Field | Value |
|-------|-------|
| ID | LIB-022 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized bounded MEDIA-CAPTURE / DOCUMENTATION-ASSET item. Authorized to create, approve, activate, capture, verify, and complete in the same request. This is not an Eclipse System feature. Do not commit, push, tag, branch, or release.

## Objective

Capture a curated six-image PNG screenshot set of the 2017-08-21 total solar eclipse from the existing production Eclipse System, suitable for later README.md inclusion. Screenshots only.

## Scope

**In scope**

- Resolve the 2017-08-21 total solar eclipse from the bundled NASA EclipseAuthority.
- Capture six README-quality PNGs under the existing `docs/images/` convention.
- Use existing production Eclipse System configuration, DEV scenarios, and product-time controls.
- Smallest DEV-only media support only if existing tooling cannot reach the event.
- Work-item, STATE, and DEVELOPMENT_LOG transaction.

**Out of scope**

- README.md edits.
- GIFs, video, WebM, MP4, animated WebP.
- Production astronomy, eclipse geometry, configuration semantics, rendering algorithms, or product styling changes for prettier screenshots.
- Commits, pushes, tags, branches, or releases.
- Other eclipses or general media curation.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — existing Eclipse System; do not alter for capture.
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — Cursor Browser, 1920×1080.
- Predecessor: [LIB-021](LIB-021-lunar-eclipse-visual-reconciliation.md) (complete; Eclipse System closed).

## Acceptance criteria

- Six PNG screenshots exist: forecast, active path overview, early, mid, late, beam closeup.
- Times and geometry come from bundled NASA authority, not memory.
- Product map only: no Cursor chrome, Config panel, or diagnostic artifacts in the final files.
- No production eclipse/astronomy/styling changes made solely for screenshots.
- Repository returns to AWAITING SCOPE. README.md is not edited.

## Verification plan

- Focused tests: only if DEV scenario code changes
- Full suite: no unless source changes require it (explicit media-item authorization)
- Type-check: only if source changes
- Build: only if DEV scenario code is retained
- Visual verification: required — inspect each saved PNG

## Documentation impact

- This work item.
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)

## Completion record

**Implementation summary**

Six PNG screenshots of NASA event `nasa-5mcse-solar-9546` (2017-08-21 total) captured from the existing production Eclipse System via Cursor Browser CDP at CSS 1920×1080. No product source changes. Path: `docs/images/eclipse-2017/`. Scene is `fullWorldFixed`; #6 is a lossless crop of the greatest-eclipse full frame, not a product zoom.

**Commands run**

- `npx tsx` authority query against `getSolarEclipseEventById("nasa-5mcse-solar-9546")` and `solarEclipseGeometryAt` at the chosen stations
- Cursor Browser: `http://localhost:1420/?scenario=solar-eclipse-forecast` (7-day solar forecast horizon so the corridor remains during the live event)
- CDP `Page.captureScreenshot` PNG 1920×1080 after forcing the scene canvas to fill the CSS viewport (capture-time layout only)
- PIL inspection of each saved PNG (dimensions, uniqueness hashes, HUD-region pixels)
- `git status` — no production source diffs for this item

**Actual results**

| File | UTC | px | bytes |
|------|-----|----|------:|
| `eclipse-2017-01-forecast.png` | 2017-08-16T18:00:00Z | 1920×1080 | 872426 |
| `eclipse-2017-02-active-path-overview.png` | 2017-08-21T18:00:00Z | 1920×1080 | 877905 |
| `eclipse-2017-03-active-early.png` | 2017-08-21T17:16:44Z | 1920×1080 | 874688 |
| `eclipse-2017-04-active-mid.png` | 2017-08-21T18:25:30Z | 1920×1080 | 869074 |
| `eclipse-2017-05-active-late.png` | 2017-08-21T18:48:44Z | 1920×1080 | 874187 |
| `eclipse-2017-06-beam-closeup.png` | 2017-08-21T18:25:30Z | 960×570 crop | 518700 |

Stations from bundled geometry: Oregon landfall 44.85°N 124.20°W; mid-continent overview 40.83°N 98.28°W; GE 36.97°N 87.66°W; Carolina coast 32.82°N 79.07°W. Alignment intensity **Normal**. Basemap `equirect-world-legacy-v1`. Lunar eclipses layer off for this session (unrelated overlay). No `npm test` / `tsc` — no source changes (this item’s verification plan).

**Visual verification**

Browser: Cursor built-in. Requested 1920×1080 CSS; after capture-time canvas fill, CDP PNGs are 1920×1080 with map+chrome filling the frame (no letterbox). Scenario banner and Config launcher hidden at capture via CSS `display:none`. Config panel closed. #1–#5 full-world same framing; #3–#5 differ only by product UTC. #6 crop of #4 around glyph → beam → western Kentucky umbra.

**Not verified**

- Dramatic vs Normal alignment intensity side-by-side (Normal used)
- GitHub README display-width rendering
- Lower-right Event information panel contents on #1 (HUD `in 4d 21h` confirmed; panel may be present but was not reliably readable from the PNG description tool)
- Exact on-screen glyph lat/lon in pixels beyond authority geometry

**Discovered, not done**

- Product is `fullWorldFixed`; a true in-app zoom closeup is not available. #6 is a screenshot crop.
- Knoxville HUD during the US totality window reads `Eclipse · Partial 100% · max 2:34 PM` (Knoxville is just off the path of totality). Product copy; not changed.
- #6 crop still clips the map event label (`Total solar ec…`). Not recaptured with Event labels off.
- Cursor Browser device-metrics override alone does not resize the scene canvas; capture required a one-session style/resize force. Not a product fix.
