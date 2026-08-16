# LIB-023 — Repair README screenshot capture pipeline and recapture 2017 eclipse set

| Field | Value |
|-------|-------|
| ID | LIB-023 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized bounded MEDIA-CAPTURE / DOCUMENTATION-ASSET item. Authorized to create, approve, activate, diagnose, recapture, verify, and complete in the same request. This is not an Eclipse System feature. Do not commit, push, tag, branch, or release.

## Objective

Diagnose why LIB-022’s 1920×1080 PNGs contain horizontally repeated Libration viewports, establish a truthful reproducible capture method that records one complete application viewport, and replace the six malformed 2017-08-21 README screenshots.

## Scope

**In scope**

- Reproduce the LIB-022 capture defect and identify its cause from runtime evidence.
- Establish a capture procedure that records one Libration viewport (prefer genuine 1920×1080; otherwise the largest clean single-view size Cursor Browser can actually render).
- Replace all six `docs/images/eclipse-2017/` PNGs with clean recaptures at the same canonical filenames.
- Small capture-procedure note in an existing docs owner if appropriate.
- Optional smallest DEV-only screenshot helper only if session/browser automation cannot produce a clean capture.
- Work-item, STATE, and DEVELOPMENT_LOG transaction.

**Out of scope**

- README.md edits.
- GIFs, video, WebM, MP4, animated WebP.
- Production astronomy, eclipse geometry, configuration semantics, rendering algorithms, or product styling changes for prettier screenshots.
- Changing product wrap/viewMode behavior solely to make screenshots easier.
- Commits, pushes, tags, branches, or releases.
- Other eclipses or general media curation.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant; backends must not decide product behaviour.
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — Cursor Browser; canonical 1920×1080 is preferred but must not be faked.
- Predecessor: [LIB-022](LIB-022-eclipse-2017-readme-screenshots.md) (complete; capture set is malformed).

## Acceptance criteria

- Root cause of the dual/repeated-view captures is identified from DOM/canvas/runtime evidence, not guessed.
- Six PNG screenshots exist at the LIB-022 canonical names, each containing exactly one Libration viewport (one top chrome, one scene, one bottom chrome/HUD).
- Capture dimensions are truthful; no stretch, tile, stitch, or upscale to claim 1920×1080.
- No Config, DEV banner, or Cursor chrome in the final files.
- #2–#5 use identical framing; only product UTC changes.
- #6 is a lossless crop of a clean single-view frame (Event labels off if they would clip).
- No production product-behavior changes made solely for screenshots.
- A reproducible capture procedure is recorded on this work item.
- Repository returns to AWAITING SCOPE. README.md is not edited.

## Verification plan

- Focused tests: only if DEV helper code changes
- Full suite: yes if source changes; otherwise media/docs-only verification of the six PNGs
- Type-check: only if source changes
- Build: only if DEV helper code is retained
- Visual verification: required — inspect each saved PNG for single-view integrity

## Documentation impact

- This work item.
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — small capture-viewport note if that document owns the procedure.

## Capture procedure (reproducible)

Dev server: `npm run dev` → `http://localhost:1420/`. Scenario: `?scenario=solar-eclipse-forecast` (7-day solar horizon so the 2017 corridor remains during the live event).

1. CDP `Emulation.setDeviceMetricsOverride` `{width:1920, height:1080, deviceScaleFactor:1, mobile:false}` **before** navigation.
2. Navigate/reload `http://localhost:1420/?scenario=solar-eclipse-forecast`.
3. Session CSS: `html`/`body` `overflow:hidden`; hide `.visual-scenario-banner` and `.config-launcher`.
4. `canvas.style.width = canvas.style.height = '100%'`; `window.dispatchEvent(new Event('resize'))`; wait ~12 animation frames.
5. Session config (Config panel, then Escape): City pins **on**, Lunar eclipses **off**, Event labels **on** for #1–#5 / **off** for #6, Alignment **Normal** for #1–#5 / **Dramatic** for #6 only, basemap `equirect-world-legacy-v1`.
6. Set demo time via Data tab. `browser_fill` on the controlled time field is unreliable; commit ISO UTC through the React `onCommit` on `DemoTimeStartFields`, then click “Reset demo playback to configured start”.
7. Close Config. Verify one canvas, one `#root`, canvas CSS ~1920×1080, backing ~1919×1079.
8. Export **`canvas.toDataURL('image/png')`**. Extract the PNG from the CDP JSON. **Do not** use `Page.captureScreenshot`.
9. Confirm left vs +912 px columns are not pixel-identical. #6 is a lossless crop of a valid GE frame (Event labels off).

## Completion record

**Implementation summary**

LIB-022 dual/repeated views were **not** product map wrap, duplicate React roots, or CSS background-repeat. Cursor Browser’s compositor surface stays at the embedded pane size (~673×770). `Page.captureScreenshot` under a 1920×1080 device-metrics override tiled that surface (exact 912 px period, including chrome). The canvas bitmap after a pre-load metrics override + `100%` fill + `resize` is one genuine full-world viewport. Replaced all six `docs/images/eclipse-2017/` files via `canvas.toDataURL`. No production or DEV source changes.

**Commands run**

- Cursor Browser CDP: DOM/canvas metrics before and after device-metrics override; `Page.captureScreenshot` reproduction of the 912 px tile; `canvas.toDataURL` exports for stations #1–#6
- PIL: dimensions, SHA-256, left-vs-+912 uniqueness (`exact=False`, meanAbs ~59–62 on #1–#5), HUD-region uniqueness, #2–#5 framing diffs (meanAbs 3.9–8.2 vs #4; same 1919×1079)
- Lossless #6 crop from Dramatic unlabeled GE frame, box `(220,90,900,630)` → 680×540
- Temporary README-scale downsamples of #2 at 1200 / 800 / 600 px (not saved as canonical)
- `git status` — media + docs only; no `src/` diffs
- Suite not rerun (no source changes). Full suite was green at activation: `npm test` 199 files / 1851 passed

**Actual results**

| File | UTC | px | bytes | sha256 prefix |
|------|-----|----|------:|---------------|
| `eclipse-2017-01-forecast.png` | 2017-08-16T18:00:00Z | 1919×1079 | 2697407 | `b23040bdf0e8c6c9` |
| `eclipse-2017-02-active-path-overview.png` | 2017-08-21T18:00:00Z | 1919×1079 | 2682658 | `21280c61ccc1e40d` |
| `eclipse-2017-03-active-early.png` | 2017-08-21T17:16:44Z | 1919×1079 | 2686602 | `61d91216ba337266` |
| `eclipse-2017-04-active-mid.png` | 2017-08-21T18:25:30Z | 1919×1079 | 2679421 | `876d903ed785982c` |
| `eclipse-2017-05-active-late.png` | 2017-08-21T18:48:44Z | 1919×1079 | 2683506 | `4257dd5699590605` |
| `eclipse-2017-06-beam-closeup.png` | 2017-08-21T18:25:30Z | 680×540 crop | 421092 | `414f4cfb55a02f55` |

Honest backing 1919×1079 (`Math.floor(1920 * dpr)` at dpr slightly under 1). Not upscaled to 1920×1080. #6 Dramatic, Event labels off; #1–#5 Alignment Normal, Event labels on.

**Visual verification**

- Scenario: `solar-eclipse-forecast` (session demo times as above)
- Viewport: requested 1920×1080 CSS; canvas export 1919×1079; Cursor pane remains ~670×770 and must not be captured with `Page.captureScreenshot`
- Browser: Cursor built-in
- Inspected: single top ruler, single HUD, one equirect world, no 912 px tile, no Config/DEV banner/Cursor chrome, forecast vs live stations, #2–#5 matching framing, #6 crop (no clipped `Total solar ec…`, no duplicated-scene seam)
- Result: PASS
- Observations: 24-hour ruler showing 1–12 twice is product design. Far-right ±360° wrap sliver on full-world frames is intended seam handling, not the capture bug.

**Not verified**

- Physical 1920×1080 OS window outside Cursor Browser
- GitHub live README rendering (only local 1200/800/600 downsamples)
- Pixel-perfect Dramatic vs Normal glyph geometry beyond localized meanAbs ~0.28 on a same-crop compare
- Event information DOM panel (absent from canvas export)

**Discovered, not done**

- Knoxville HUD during the US totality window reads `Eclipse · Partial 100% · max 2:34 PM` (just off the path). Product copy; not changed.
- `fullWorldFixed` only — #6 remains a screenshot crop.
- `applyViewport` inline pixel CSS lock is genuine layout behaviour; not changed for screenshots.
- City pins at README ~600 px width: Knoxville/New York labels crowd; path and HUD remain readable.
