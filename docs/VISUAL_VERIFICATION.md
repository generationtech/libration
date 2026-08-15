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
| `lunar-locus` | `2026-01-16T22:00:00.000Z` (default `locusEpoch=recent`) | Production Lunar locus overlay on, Moon marker on, ground track off, analemma off. Optional DEV `locusEpoch=standstill\|minor\|baseline` | Compact lunar locus vs solar analemma and vs the 48 h ground-track weave; standstill amplitude; dateline wrap |

Adding a scenario requires a work item. Do not grow this set casually.

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
