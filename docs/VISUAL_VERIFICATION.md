# Visual verification

This document owns how a Cursor coding agent verifies visual changes against the running Libration application.

It is a development procedure, not a screenshot-regression framework. Inspection is qualitative. Pixel-perfect comparison is not claimed and is not required.

## When visual verification is required

Perform it when a work item can materially alter rendered output, including changes to:

- rendering, `RenderPlan`, or backends
- scene layers, maps/substrates, illumination
- overlays, labels, chrome, layout
- typography, colors, opacity, compositing
- configuration controls whose visible behaviour changes
- visual assets, CSS, or UI presentation

Do not require it for changes that cannot affect rendered output, such as documentation-only work.

If it is uncertain whether a change can affect rendering, perform visual verification.

A work item that requires visual verification cannot be marked complete without it. If it cannot be performed, record the limitation and leave the item `active` or `blocked`.

## How to run Libration

```bash
npm run dev
```

The Vite dev server listens at **http://localhost:1420** (`strictPort: true`).

Named visual scenarios use:

```text
http://localhost:1420/?scenario=<id>
```

Example: `http://localhost:1420/?scenario=baseline`

Open that URL in **Cursor’s built-in browser**. Do not substitute Playwright, Puppeteer, MCP browser servers, or screenshot tooling.

## Canonical viewport

**1920 × 1080 CSS pixels** is the canonical verification viewport.

It is not the only supported resolution. Do not invent a device matrix.

If Cursor cannot programmatically guarantee that exact size, use the closest controllable 1920×1080 browser viewport and **report the limitation** rather than claiming exactness.

### README and docs PNG capture

A PNG that is nominally 1920×1080 is not proof of one Libration viewport. LIB-022’s `Page.captureScreenshot` files were 1920×1080 and still contained two full scene copies plus a partial third.

`CanvasRenderBackend.applyViewport` writes inline `style.width` / `style.height` in CSS pixels from the first layout. `Emulation.setDeviceMetricsOverride` after that load changes `window.innerWidth` but leaves the canvas locked to the Cursor pane size (~670×770). Forcing `canvas.style` to `100%` and dispatching `resize` does paint one genuine wide world on the **canvas bitmap**. Capturing the **compositor surface** with `Page.captureScreenshot` (`fromSurface: true`) under a 1920×1080 override then **tiles that smaller surface** across the PNG (LIB-022 period was an exact 912 px repeat, including duplicated chrome).

Do this instead:

1. Set device metrics to 1920×1080 **before** navigation/reload so layout initializes at that size.
2. After load, `html`/`body` `overflow: hidden`; set the scene canvas CSS to `100%` width/height and dispatch `resize` so remaining slack is absorbed.
3. Export with `canvas.toDataURL('image/png')`. Honest backing size may be 1919×1079 (`Math.floor(1920 * dpr)` at dpr slightly under 1). Do not upscale.
4. Confirm left vs +~900 px columns are **not** pixel-identical before accepting the file.

Do not stretch a pane-sized canvas without reload, tile/stitch viewports, or crop one repeated copy and scale it. Hide the DEV scenario banner and Config launcher only as session CSS; they are DOM overlays and are already absent from a canvas export. Procedure detail: [`docs/work/LIB-023-repair-readme-screenshot-capture.md`](work/LIB-023-repair-readme-screenshot-capture.md).

## Scenario selection

A work item does not mechanically need every scenario.

- Use `baseline` as a general smoke scene.
- Use the scenario(s) relevant to the changed behaviour.
- For broadly cross-cutting visual changes, inspect multiple relevant scenarios.

Do not ritualistically run every scene when they cannot reveal anything relevant.

## Scenario catalog

Scenarios are development-only fixtures. They feed ordinary configuration and demo-time inputs through existing startup boundaries. They are not a parallel renderer.

Activation is **startup/reload only**: change `?scenario=` and reload. Production builds ignore `?scenario=` and behave as ordinary Libration.

While a scenario is applied:

- persisted `libration.workingConfigV2.v1` is not read
- `persistWorkingV2` does not write
- dynamic network feeds are disabled
- product time is paused demo time at the documented UTC instant

Unknown ids fail visibly (HTML banner plus `console.error`) and **do not** substitute another scenario. Ordinary persisted startup is used instead, and persistence is not suppressed.

| ID | UTC | What it establishes | Useful for |
|----|-----|---------------------|------------|
| `baseline` | `2030-06-15T12:00:00.000Z` | Factory-default scene, chrome, and overlays; demo clock paused at the product default instant | General layout, map composition, chrome, ordinary overlays, smoke |
| `terminator` | `2026-03-20T12:00:00.000Z` | Near March equinox at 12:00 UTC (subsolar near 0°); solar shading on | Terminator geometry, twilight, seam/continuity, geographic illumination |
| `night` | `2026-12-21T06:00:00.000Z` | Near December solstice at 06:00 UTC (subsolar near 90°E; Americas in night); illustrative moonlight and emissive night lights | Dark-side composition, night lights, readability over dark substrate |
| `readability` | `2026-06-21T12:00:00.000Z` | Köppen–Geiger climate substrate (`equirect-world-climate-koppen-beck-v1`) plus grid, city pins, subsolar/sublunar markers, solar shading, and analemma | Labels/overlays, contrast, clutter, chrome/scene interaction, clipping |
| `lunar-track` | `2026-01-16T22:00:00.000Z` | Lunar ground track on (24 h past + 24 h future), sublunar marker on, analemma off, grid on; Moon near 170°W at high southern latitude so a dateline crossing and latitude excursion are in view | Lunar track alignment, past/future styling, seam/wrap, overlay readability |
| `lunar-locus` | `2026-01-16T22:00:00.000Z` (default `locusEpoch=recent`) | Production Lunar locus overlay on, Moon marker on, ground track off, analemma off. Optional DEV `locusEpoch=standstill\|minor\|baseline` | Compact lunar locus vs solar analemma and vs the 48 h ground-track weave; standstill amplitude; dateline wrap; accelerated demo through a full Moon traversal with no migrating seam/cusp on the exposed line (cycle seam under the Moon glyph) |
| `moon-libration` | `2021-12-10T00:00:00.000Z` (default `librationEpoch=diagonal`) | Production Moon glyph with optical-libration **ring** on, **observer-oriented** following the chrome reference city. Optional DEV `librationEpoch=zero\|lonEast\|lonWest\|latNorth\|latSouth\|diagonal\|new\|quarter\|full`, `observerCity=knoxville\|london\|sydney\|tokyo\|sao_paulo\|none`, `librationOrientation=map\|observer`, `librationStyle=ring\|crosshair` | Phase vs libration independence; two-pass contrast over new/quarter/full; map vs observer orientation; reference-city switch; ring/crosshair; fallback when `observerCity=none`; Moon sizes; accelerated demo motion; pause freeze |
| `solar-eclipse-total` | `2024-04-08T18:17:15.000Z` | Production solar eclipse overlay at NASA 2024 Apr 08 greatest eclipse (total); live-only horizon; alignment beam on by default. Optional DEV `observerCity=knoxville\|tokyo\|sao_paulo\|none` | Path across Mexico / US / Canada; umbral band vs broader partial region; **alignment ribbon from Sun/Moon glyphs to live umbra**; **global path and beam must not change when observerCity changes**; Knoxville local partial vs Tokyo not-visible locally |
| `solar-eclipse-annular` | `2023-10-14T17:59:27.300Z` | Production solar eclipse overlay at NASA 2023 Oct 14 greatest eclipse (annular). Optional DEV `observerCity=` | Annularity band (not totality styling); path geography; alignment beam targets live antumbra, not totality styling |
| `solar-eclipse-partial` | `2022-10-25T11:00:06.900Z` | Production solar eclipse overlay at NASA 2022 Oct 25 greatest eclipse (partial-only). Optional DEV `observerCity=` | Partial footprint without a false central band or centerline; **no fabricated central alignment beam** (local glyph-field only) |
| `solar-eclipse-dateline` | `2016-03-09T01:57:09.400Z` | Production solar eclipse overlay at NASA 2016 Mar 09 Pacific total; live-only horizon. Optional DEV `observerCity=` | Seam/wrap: no map-spanning fill, coherent centerline, band, and alignment ribbon |
| `solar-eclipse-forecast` | `2024-04-03T18:00:00.000Z` | Upcoming 2024 Apr 08 total, 7-day forecast horizon, five days before greatest eclipse. Optional DEV `observerCity=` | Event corridor Mexico → US → Canada; no live umbra or beam; event information and nearest-event label; local circumstances may say not visible / partial / total without hiding the corridor |
| `solar-eclipse-forecast-annular` | `2023-10-09T18:00:00.000Z` | Upcoming 2023 Oct 14 annular, 7-day horizon. Optional DEV `observerCity=` | Annular forecast corridor; not totality styling |
| `solar-eclipse-forecast-partial` | `2022-10-20T11:00:00.000Z` | Upcoming 2022 Oct 25 partial-only, 7-day horizon. Optional DEV `observerCity=` | Partial forecast region; no fabricated central corridor |
| `solar-eclipse-forecast-multiple` | `2023-10-01T00:00:00.000Z` | 365-day horizon with more than one upcoming solar eclipse. Optional DEV `observerCity=` | Multi-event density; nearest event emphasized |
| `lunar-eclipse-total` | `2022-05-16T04:11:29.000Z` | Production lunar eclipse overlay at NASA 2022 May 16 greatest eclipse (total). Optional DEV `observerCity=knoxville\|tokyo\|none`. Optional DEV `eclipsePhase=pre\|penumbral\|partial\|nearTotal\|total\|egress` selects a 2022-05-16 station (P1 01:32:08Z, U1 02:27:53Z, U2 03:29:02Z, GE 04:11:29Z, U3 04:53:56Z, U4 05:55:05Z, P4 06:50:50Z) | Earth-shadow on the Moon glyph; Moon-up visibility region **must not change when observerCity changes**; **lunar alignment axis toward the Moon, not a terrestrial path**; Knoxville locally visible vs Tokyo GE below horizon; moonlight attenuation and spatial umbra bite |
| `lunar-eclipse-partial` | `2008-08-16T21:10:06.000Z` | Production lunar eclipse overlay at NASA 2008 Aug 16 greatest eclipse (partial). Optional DEV `observerCity=` | Partial umbra only; no false totality tint; visibility region still present; alignment axis weaker than totality |
| `lunar-eclipse-horizon` | `2015-04-04T12:00:15.000Z` | Production lunar eclipse overlay at NASA 2015 Apr 04 greatest eclipse (dateline zenith). Optional DEV `observerCity=` | Broad Moon-up hemisphere near ±180°; no inverted fill |
| `lunar-eclipse-forecast-total` | `2022-05-13T04:00:00.000Z` | Upcoming 2022 May 16 total, 7-day lunar forecast horizon, three days before greatest eclipse. Optional DEV `observerCity=` `horizon=` | Quiet GE Moon-visible region; no Earth-shadow Moon treatment; no lunar alignment beam; event label/info/status; Knoxville locally visible vs Tokyo not visible without changing global geography |

Adding a scenario requires a work item. Do not grow this set casually.

### Reference-city eclipse circumstances (E4)

Existing eclipse scenarios accept optional DEV `observerCity=` (same catalog ids as LIB-011). Production reference-city resolution still uses chrome `displayTime.topBandAnchor`. Do not add a second observer control to the production bundle.

### Eclipse product polish (E6)

Reuse the existing eclipse catalog. Do not add a second scenario family for labels, event information, or styling.

### Eclipse reconciliation (LIB-020)

### Lunar eclipse visual reconciliation (LIB-021)

When inspecting the post-LIB-020 visual reconciliation:

- Confirm Layers during `lunar-eclipse-forecast-total` or `lunar-eclipse-total` contains only controls and helper copy — no Event / Date / Greatest eclipse / magnitude readout rows.
- Confirm Event information ON shows a compact lower-right map panel; OFF removes it. Labels and persistent status stay independent.
- Confirm the panel does not overlap the lower-left HUD. When Config is open, the panel sits left of the Config shell.
- Confirm `lunar-eclipse-total&eclipsePhase=pre` is an ordinary near-full Moon; `penumbral` is a soft one-sided darkening; `partial` keeps a bright uneclipsed region with a curved umbral bite; `total` is restrained red/brown with readable libration; `egress` restores.
- Confirm night-side moonlight does not brighten when the eclipse begins; totality is darker than pre-eclipse; the Moon-visible region remains distinguishable without lifting the dark hemisphere.
- Confirm `Total lunar eclipse` map text does not run through the Moon glyph/halo, and that Event labels OFF still removes it.

When inspecting the post-E6 reconciliation:

- Confirm Event labels OFF removes on-map eclipse text immediately on a solar forecast scene and a lunar forecast scene; Event information and Persistent eclipse status may remain.
- Confirm Event information OFF hides the inspectable panel while labels and persistent status follow their own toggles.
- Confirm Persistent eclipse status OFF removes the lower-left contextual row and restores the ordinary two-line date/time spacing.
- Confirm the eclipse status row sits below date/time with a clear gap for short (`Eclipse · Partial 89%`), medium (`Lunar eclipse · Total · visible`), and long (`Eclipse not visible from Knoxville`) copy.
- Confirm factory/reset Solar and Lunar masters are checked, and an ordinary no-event date stays clean.
- Confirm `lunar-eclipse-forecast-total` then `observerCity=tokyo`: global forecast region unchanged; local status says not visible.
- Confirm forecast → active by jumping to `lunar-eclipse-total`: Earth-shadow and alignment appear; the GE forecast region is replaced by live geometry.

When inspecting E6:

- Confirm `baseline` (ordinary supported date, factory eclipse masters on) has no eclipse geography, no empty chrome, and no empty event panel.
- Confirm the 2024-04-08 workflow: outside the 7-day horizon → no solar effects; `solar-eclipse-forecast` → corridor + event information + Knoxville partial; `solar-eclipse-total` → live footprint + corridor context + alignment + label; after last contact → no stale event UI.
- Confirm `lunar-eclipse-total` then `observerCity=tokyo`: global Moon-up region and Moon treatment unchanged; local status becomes not visible.
- Confirm `solar-eclipse-forecast-multiple`: multiple restrained corridors, nearest event emphasized, one primary label.
- Confirm product UTC outside 1900–2100 shows “Eclipse data unavailable outside 1900–2100.” when Solar or Lunar eclipses are enabled, and does not imply that no eclipse exists.
- Confirm Layers groups disable child controls when the parent is off, and that forecast corridor/partial disable when the horizon is Live only.
- Confirm hybrid events say Hybrid solar eclipse and penumbral events say Penumbral lunar eclipse.

### Live eclipse alignment / beam (E5)

Existing eclipse scenarios enable the alignment field by default (`scene.eclipseAlignment` master / solar / lunar on, intensity normal). Do not add a second scenario catalog for the beam.

When inspecting E5:

- Confirm the solar beam connects the Sun/Moon glyph cluster to the **live** umbra (total) or antumbra (annular), not the forecast corridor and not the reference city.
- Confirm a partial-only solar event has no fabricated central beam.
- Confirm the lunar axis reads as Sun→Earth→Moon near the Moon glyph, not a solar-style Earth path.
- Confirm the map, corridor/footprint, city pins, and glyphs remain readable.
- Confirm Moon still paints above Sun when the glyphs overlap.
- Confirm changing `observerCity` does not move the beam.
- Confirm forecast-only scenarios have no beam.
- If checking intensity, use Layers: Subtle / Normal / Dramatic. Each should be useful; dramatic must not obscure the map.

When inspecting E4:

- Open the same eclipse scene twice, changing only `observerCity`.
- Confirm **global-path immutability**: solar live footprint / forecast corridor / lunar Moon-shadow and visibility region stay geographically the same. Only local chrome, Layers details, and other reference-city decorations may change.
- Confirm local copy says the event is not visible from the city when that is true — never that the global event is absent.
- Confirm ordinary `http://localhost:1420/` has no empty eclipse chrome furniture when no eclipse is relevant.

## Cursor inspection loop

This is an iterative sub-loop. Use the rendered application as feedback; do not only capture a screenshot after implementation.

1. Start the dev server (`npm run dev`).
2. Open the relevant scenario URL in Cursor’s built-in browser.
3. Set or confirm the canonical viewport (or the closest achievable size).
4. Confirm the scenario banner shows the requested id and UTC instant (`scenario: <id> · <iso> · persistence isolated`).
5. Inspect the rendered application against the work item’s acceptance criteria and the checklist below.
6. Interact with controls only when the work item requires interaction verification.
7. If a defect is visible, return to implementation and correct it.
8. Reload the scenario and reinspect.
9. Repeat until the acceptance criteria are satisfied.
10. Record what was actually inspected (see evidence format).

Reload at least the scenario under change when checking repeatability.

After scenario work that touches startup or persistence, also open `http://localhost:1420/` **without** `?scenario=` and confirm ordinary startup (no scenario banner; persisted user configuration still applies).

## Visual acceptance checklist

Qualitative. Inspect as applicable:

### Intended result

- Is the feature or change actually visible?
- Does it visually match the work item’s acceptance criteria?

### Layout

- unexpected clipping
- overlap
- displacement
- incorrect reserved chrome space
- broken alignment

### Rendering

- seams
- discontinuities
- missing primitives
- unexpected blank regions
- compositing artifacts
- obvious incorrect ordering

### Readability

- labels/text remain legible
- overlays remain distinguishable
- contrast has not obviously degraded
- important scene information is not obscured

### Surrounding regressions

- adjacent UI/chrome remains coherent
- unaffected major scene components remain present
- no obvious new visual artifact was introduced

### Lunar locus cycle continuity

When the lunar locus is in view, accelerated demo playback through at least one complete Moon traversal of the figure must show no migrating cusp, hook, zigzag, visible seam, or endpoint tail on the exposed line. The one-cycle seam belongs under the Moon glyph. Pause at northern and southern extremes, the crossing, the lobes, and near the dateline.

### Scenario correctness

- the expected scenario is actually active (banner id and UTC)
- the expected product UTC/configuration is represented
- the view is not persisted normal-mode state

## Evidence in the work-item completion record

Record actual observations, not “looks fine”:

```text
Visual verification:
- Scenario: terminator
- Viewport: 1920×1080
- Browser: Cursor built-in browser
- Inspected: terminator geometry, twilight transition, seam continuity,
  chrome/scene layout
- Result: PASS
- Observations: no clipping, seam discontinuity, or unexpected layout shift observed
```

If multiple scenarios were inspected, record each. If visual verification was required but could not be performed, do not mark the work item complete.

## Containment (for implementers)

- Detection is centralized in `src/dev/visualScenarios.ts` and applied once from `src/main.tsx` under `import.meta.env.DEV`.
- `src/App.tsx` reads the process-local session and seeds ordinary `resolveStartupWorkingV2` / demo-playback inputs.
- Layers, `RenderPlan`, and the Canvas backend must not inspect URL parameters or scenario ids.
- Scenario configuration is not durable user configuration.

See [`docs/IMPLEMENTATION.md`](IMPLEMENTATION.md) §2 for the startup branch.
