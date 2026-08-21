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
2. After load, `html`/`body` `overflow: hidden` and `margin: 0` (the UA 8px body margin otherwise locks the canvas ~16px short of 1920); set the scene canvas CSS to `100%` width/height and dispatch `resize` so remaining slack is absorbed.
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
| `twilight-presentation` | `2026-09-09T03:53:00.000Z` (default `twilightCase=c`) | Full-world solar shading at a documented Knoxville product time. Optional DEV `twilightCase=a\|b\|c` (`2026-08-21T00:57Z` / `2026-08-24T04:34Z` / `2026-09-09T03:53Z`) and `nightVeilCurve=smootherstep\|linearSmooth\|twilightAnchored\|smoothstep` (factory is twilight-anchored) | Solar twilight / night-veil presentation; solar-only vs moonlight interaction |
| `night` | `2026-12-21T06:00:00.000Z` | Near December solstice at 06:00 UTC (subsolar near 90°E; Americas in night); illustrative moonlight and emissive night lights | Dark-side composition, night lights, readability over dark substrate |
| `readability` | `2026-06-21T12:00:00.000Z` | Köppen–Geiger climate substrate (`equirect-world-climate-koppen-beck-v1`) plus grid, city pins, subsolar/sublunar markers, solar shading, and analemma | Labels/overlays, contrast, clutter, chrome/scene interaction, clipping |
| `lunar-track` | `2026-01-16T22:00:00.000Z` | Lunar ground track on (24 h past + 24 h future), sublunar marker on, analemma off, grid on; Moon near 170°W at high southern latitude so a dateline crossing and latitude excursion are in view | Lunar track alignment, past/future styling, seam/wrap, overlay readability |
| `lunar-locus` | `2026-01-16T22:00:00.000Z` (default `locusEpoch=recent`) | Production Lunar locus overlay on, Moon marker on, ground track off, analemma off. Optional DEV `locusEpoch=standstill\|minor\|baseline` | Compact lunar locus vs solar analemma and vs the 48 h ground-track weave; standstill amplitude; dateline wrap; accelerated demo through a full Moon traversal with no migrating seam/cusp on the exposed line (cycle seam under the Moon glyph) |
| `moon-libration` | `2021-12-10T00:00:00.000Z` (default `librationEpoch=diagonal`) | Production Moon glyph with optical-libration **ring** on, **observer-oriented** following the chrome reference city. Optional DEV `librationEpoch=zero\|lonEast\|lonWest\|latNorth\|latSouth\|diagonal\|new\|quarter\|full`, `observerCity=knoxville\|london\|sydney\|tokyo\|sao_paulo\|none`, `librationOrientation=map\|observer`, `librationStyle=ring\|crosshair` | Phase vs libration independence; two-pass contrast over new/quarter/full; map vs observer orientation; reference-city switch; ring/crosshair; fallback when `observerCity=none`; Moon sizes; accelerated demo motion; pause freeze |
| `iss-presentation` | `2026-08-06T01:17:00.000Z` | ISS overlay on from a recorded TLE (in-process SGP4, no network); Layer masters ISS enabled; Space objects factory presentation; clouds/earthquakes off. DEV-only; not a production live fallback | Immediate Space objects ISS presentation: orbit track, past/future, **horizons (minutes and orbits)**, colors, thickness, glyph type/size/color, silhouette color, label |
| `planetary-objects` | `2026-08-19T15:30:00.000Z` | Planets master on; Mercury through Neptune plus Pluto enabled; factory shared presentation (current subpoints/labels on, tracks/loci off); clouds/earthquakes/ISS off. Offline ephemeris | All current planet glyphs/labels; Space objects Planets controls; representative ground tracks and loci; per-body locus toggles; Demo jumps |
| `milky-way` | `2026-08-19T06:00:00.000Z` | Milky Way master on; factory enabled ribbon (plane, Normal band, ribs, Galactic center + label, night-side emphasis; anticenter off) **plus Galactic-center altitude contours** (30/45/60/75° on, horizon off, astronomical-night emphasis and moonlight de-emphasis on) **plus viewing events on**. Clouds/earthquakes/ISS/Planets off. Optional DEV `observerCity=knoxville\|sao_paulo\|tokyo\|none`. Offline IAU geometry | Zenith ribbon vs shading; nested GC altitude contours; southern-hemisphere advantage; night/day contour alpha; dateline wrap; Demo jumps six hours apart; **reference-city Viewing Window status** |
| `solar-eclipse-total` | `2024-04-08T18:17:15.000Z` | Production solar eclipse overlay at NASA 2024 Apr 08 greatest eclipse (total); live-only horizon; alignment beam on by default. Optional DEV `observerCity=knoxville\|tokyo\|sao_paulo\|none` | Path across Mexico / US / Canada; umbral band vs broader partial region; **alignment ribbon from Sun/Moon glyphs to live umbra**; **global path and beam must not change when observerCity changes**; Knoxville local partial vs Tokyo not-visible locally |
| `solar-eclipse-annular` | `2023-10-14T17:59:27.300Z` | Production solar eclipse overlay at NASA 2023 Oct 14 greatest eclipse (annular). Optional DEV `observerCity=` | Annularity band (not totality styling); path geography; alignment beam targets live antumbra, not totality styling |
| `solar-eclipse-partial` | `2022-10-25T11:00:06.900Z` | Production solar eclipse overlay at NASA 2022 Oct 25 greatest eclipse (partial-only). Optional DEV `observerCity=` | Partial footprint without a false central band or centerline; **no fabricated central alignment beam** (local glyph-field only) |
| `solar-eclipse-dateline` | `2016-03-09T01:57:09.400Z` | Production solar eclipse overlay at NASA 2016 Mar 09 Pacific total; live-only horizon. Optional DEV `observerCity=` | Seam/wrap: no map-spanning fill, coherent centerline, band, and alignment ribbon |
| `solar-eclipse-2017` | `2017-08-21T18:25:29.700Z` (default `eclipseStation=ge`) | 2017 Aug 21 total with **7-day horizon** so the event corridor stays in view. Showcase: Extra Large Moon, Event labels off, Dramatic alignment, Large ground marker. Optional DEV `eclipseStation=upcoming\|preCentral\|earlyCentral\|ge\|lateCentral\|postCentral\|after`, A–F `stationA`…`stationF`, raster-boundary `rasterPreStart\|rasterWest\|rasterMid\|rasterEast\|rasterLate`, horizon/illumination `horizonA`…`horizonE` plus `horizonWest1420`…`horizonWest1445` and `horizonEast1940`…`horizonEast2005`, `horizon=`, `observerCity=` | Full-event lifecycle: corridor continuity, forecast vs live partial, beam/marker entry and exit, live footprint motion, obscuration-field ingress/egress limbs, terminator/horizon composition. Stations: upcoming `14:51Z`, pre-central `15:56Z`, early central `16:58Z`, GE `18:25:29.700Z`, late central `18:48:44Z`, post-central `20:21Z`, after `21:10Z`; raster `15:39:02Z` / `16:45:01Z` / `17:06:33Z` / `19:22:59Z` / `19:56:08Z`; horizon A–E `14:30:00Z` / `16:33:24Z` / `17:10:15Z` / `19:22:26Z` / `19:55:32Z` |
| `solar-eclipse-forecast` | `2024-04-03T18:00:00.000Z` | Upcoming 2024 Apr 08 total, 7-day forecast horizon, five days before greatest eclipse. Optional DEV `observerCity=` | Event corridor Mexico → US → Canada; no live umbra or beam; event information and nearest-event label; local circumstances may say not visible / partial / total without hiding the corridor |
| `solar-eclipse-forecast-annular` | `2023-10-09T18:00:00.000Z` | Upcoming 2023 Oct 14 annular, 7-day horizon. Optional DEV `observerCity=` | Annular forecast corridor; not totality styling |
| `solar-eclipse-forecast-partial` | `2022-10-20T11:00:00.000Z` | Upcoming 2022 Oct 25 partial-only, 7-day horizon. Optional DEV `observerCity=` | Partial forecast region; no fabricated central corridor |
| `solar-eclipse-forecast-multiple` | `2023-10-01T00:00:00.000Z` | 365-day horizon with more than one upcoming solar eclipse. Optional DEV `observerCity=` | Multi-event density; nearest event emphasized |
| `lunar-eclipse-total` | `2022-05-16T04:11:29.000Z` | Production lunar eclipse overlay at NASA 2022 May 16 greatest eclipse (total). Optional DEV `observerCity=knoxville\|tokyo\|none`. Optional DEV `eclipsePhase=pre\|penumbral\|partial\|nearTotal\|total\|egress` selects a 2022-05-16 station (P1 01:32:08Z, U1 02:27:53Z, U2 03:29:02Z, GE 04:11:29Z, U3 04:53:56Z, U4 05:55:05Z, P4 06:50:50Z) | Earth-shadow on the Moon glyph; **static lunar eclipse visibility footprint line** (not a Moon-visible fill or moving horizon); **Earth-shadow directional cue into the Moon, not a terrestrial path or emitted beam**; Knoxville locally visible vs Tokyo GE below horizon; moonlight attenuation and spatial umbra bite |
| `lunar-eclipse-partial` | `2008-08-16T21:10:06.000Z` | Production lunar eclipse overlay at NASA 2008 Aug 16 greatest eclipse (partial). Optional DEV `observerCity=` | Partial umbra only; no false totality tint; static visibility footprint (not Moon-visible now); cue weaker than totality |
| `lunar-eclipse-horizon` | `2015-04-04T12:00:15.000Z` | Production lunar eclipse overlay at NASA 2015 Apr 04 greatest eclipse (dateline zenith). Optional DEV `observerCity=` | Moon near ±180°; static footprint line with no world-spanning chord; no inverted fill |
| `lunar-eclipse-forecast-total` | `2022-05-13T04:00:00.000Z` | Upcoming 2022 May 16 total, 7-day lunar forecast horizon, three days before greatest eclipse. Optional DEV `observerCity=` `horizon=` | Upcoming Moon glyph/event label; **same static visibility footprint as during the event**; no Earth-shadow Moon treatment; no lunar Earth-shadow cue; event info/status; Knoxville locally visible vs Tokyo not visible without changing global presentation |
| `lunar-eclipse-2029` | `2029-06-26T03:22:05.000Z` (default `eclipseStation=total`) | NASA 2029 Jun 26 total; 7-day horizon so upcoming events stay in view. Optional DEV `eclipseStation=upcoming\|preActive\|early\|deepPartial\|total\|egress\|after`, `observerCity=` | Primary LIB-054 sequence: static closed visibility footprint from first eligible forecast through P4−1s; gone after; no Moon-visible fill. Event label vs Moon vs São Paulo; Earth-shadow cue into the Moon; physically attenuated moonlight. Stations: upcoming `2029-06-25T18:00Z`, pre-active `00:29:32Z`, early `00:50Z`, deep partial `02:20Z`, GE `03:22:05Z`, egress `04:40Z`, after `06:20Z` |

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
- Confirm night-side moonlight does not brighten when the eclipse begins; totality is darker than pre-eclipse; there is no terrestrial Moon-visible fill lifting or darkening a hemisphere.
- Confirm `Total lunar eclipse` map text does not run through the Moon glyph/halo, and that Event labels OFF still removes it.

When inspecting the post-E6 reconciliation:

- Confirm Event labels OFF removes on-map eclipse text immediately on a solar forecast scene and a lunar forecast scene; Event information and Persistent eclipse status may remain.
- Confirm Event information OFF hides the inspectable panel while labels and persistent status follow their own toggles.
- Confirm Persistent eclipse status OFF removes the lower-left contextual row and restores the ordinary two-line date/time spacing.
- Confirm the eclipse status row sits below date/time with a clear gap for short (`Eclipse · Partial 89%`), medium (`Lunar eclipse · Total · visible`), and long (`Eclipse not visible from Knoxville`) copy.
- Confirm factory/reset Solar and Lunar masters are checked, and an ordinary no-event date stays clean.
- Confirm `lunar-eclipse-forecast-total` then `observerCity=tokyo`: global Moon presentation unchanged; local status says not visible.
- Confirm forecast → active by jumping to `lunar-eclipse-total`: Earth-shadow and alignment appear; the GE forecast region is replaced by live geometry.

When inspecting E6:

- Confirm `baseline` (ordinary supported date, factory eclipse masters on) has no eclipse geography, no empty chrome, and no empty event panel.
- Confirm the 2024-04-08 workflow: outside the 7-day horizon → no solar effects; `solar-eclipse-forecast` → corridor + event information + Knoxville partial; `solar-eclipse-total` → live footprint + corridor context + alignment + label; after last contact → no stale event UI.
- Confirm `lunar-eclipse-total` then `observerCity=tokyo`: global Moon treatment unchanged; local status becomes not visible.
- Confirm `solar-eclipse-forecast-multiple`: multiple restrained corridors, nearest event emphasized, one primary label.
- Confirm product UTC outside 1900–2100 shows “Eclipse data unavailable outside 1900–2100.” when Solar or Lunar eclipses are enabled, and does not imply that no eclipse exists.
- Confirm Layers groups disable child controls when the parent is off, and that forecast corridor/partial disable when the horizon is Live only.
- Confirm hybrid events say Hybrid solar eclipse and penumbral events say Penumbral lunar eclipse.

### Eclipse presentation semantics + label placement (LIB-042)

Use `?scenario=solar-eclipse-2017` (7-day horizon) plus `eclipseStation=`. The 2017 showcase still defaults Event labels **OFF**; turn Event labels ON to inspect map text. Viewport in Cursor’s side pane is acceptable; record that it is not canonical 1920×1080.

When inspecting:

- Confirm HUD, placard, and map label tell one story with different verbosity. HUD is local/reference-city. Placard distinguishes global vs local. Map label is global identity plus `upcoming` or `active` only.
- Confirm upcoming (`eclipseStation=upcoming`, 14:51Z / ~10:51 AM Knoxville): HUD `Eclipse · Partial 99.8% · begins 1:04 PM` (not `Partial 100%`, not a vague `in 50m` when C1 is known). Placard: Global event Total solar eclipse; Lifecycle Upcoming; Forecast path; **no** Current shadow row. Knoxville Local type Partial. Map: `Total solar eclipse · upcoming` near the Sun/Moon cluster, on the side opposite the US corridor, not printed on the path.
- Confirm early central (`earlyCentral`, 16:58Z / 12:58 PM): map `Total solar eclipse · active`; HUD still local Partial 99.8% with `max 2:34 PM`; placard Lifecycle Active with Current shadow appropriate to the live umbra.
- Confirm GE (`ge`, 18:25:29.700Z / 2:25 PM): placard Current shadow Totality (central shadow); Knoxville Local type Partial; HUD `Eclipse · Partial 99.8% · max 2:34 PM`; map `Total solar eclipse · active` next to the Pacific glyph, opposite the corridor.
- Confirm late central (`lateCentral`, 18:48:44Z / 2:48 PM): HUD `ends 3:58 PM`; map still `· active`; path/marker/beam remain readable.
- Confirm after (`after`, 21:10Z): geography gone; no `· ended` map label; HUD eclipse row gone.
- Confirm `observerCity=tokyo` at GE: HUD `Eclipse not visible from Tokyo`; placard local not-visible; global event/path/lifecycle unchanged.
- Confirm Event labels OFF removes map text while HUD/placard stay. Event information OFF hides the placard while HUD/map label stay. Persistent eclipse status OFF removes the HUD row while placard/map label stay.
- Confirm `solar-eclipse-dateline`: label stays with the glyph cluster; no opposite-hemisphere jump from ±180°.
- Confirm `solar-eclipse-partial`: `Partial solar eclipse · active` near the glyph; no fabricated central corridor.
- Confirm `lunar-eclipse-forecast-total` / `lunar-eclipse-total`: `Total lunar eclipse · upcoming` / `· active` near the Moon glyph; HUD remains lunar wording; do not apply solar path-opposite placement.

### Lunar eclipse presentation (LIB-043 / LIB-044 / LIB-046)

Use `?scenario=lunar-eclipse-2029` plus `eclipseStation=`. Viewport in Cursor’s side pane is acceptable; record that it is not canonical 1920×1080. Preserve world framing and config across stations.

Stations (product UTC): upcoming `2029-06-25T18:00:00.000Z`; pre-active `2029-06-26T00:29:32.000Z`; early `00:50:00.000Z`; deep partial `02:20:00.000Z`; totality `03:22:05.000Z`; egress `04:40:00.000Z`; after `06:20:00.000Z`.

When inspecting:

- Confirm there is **no** giant dark Moon-visible terrestrial overlay and **no** white geometric lunar-horizon line at any station.
- Confirm the map label is `Total lunar eclipse · upcoming` then `· active`, anchored near the Moon, not through the glyph/halo, and not concatenated with São Paulo at GE (zenith ~23°S 50°W). Label placement must not depend on a painted horizon.
- Confirm ordinary solar/night illumination remains. Eclipse moonlight attenuation remains physically visible where applicable.
- Confirm no geographic lunar alignment line, “beam”, or ribbon on the map. The Earth-shadow cue is short, local to the Moon, origin on the shadow side, tip at the disc, behind Moon details.
- Confirm upcoming and after have no cue and no Earth-shadow Moon treatment; penumbral/early cue is faint; totality strongest but restrained; egress weaker.
- Confirm Knoxville vs Tokyo at the same UTC: Moon glyph, cue, illumination, and event label stay identical; only HUD/placard local rows differ. No visibility-map overlay exists in either case.
- Confirm Layers → Eclipse → Lunar eclipses has no Moon-visible region or Moon-visible boundary controls, and no Lunar visibility fill/opacity. Eclipse appearance has **Lunar visibility footprint color** / **thickness** for the event-static line only.
- Confirm the placard still describes visibility at greatest eclipse as event information and does not list “Moon-visible now” or “Boundary: geometric lunar horizon now”.
- Confirm `lunar-eclipse-partial` and `lunar-eclipse-total&eclipsePhase=penumbral` do not invent totality wash.
- Confirm accelerated demo or a dense station sweep does not show large-area shading shudder, tearing, or a snap from missing geography around upcoming→active or the contacts. Legitimate solar-terminator motion over hours is not the defect.

### Lunar eclipse visibility footprint color (LIB-055)

Use `?scenario=lunar-eclipse-2029` with the footprint visible, then the other lunar stations below. Viewport in Cursor’s side pane is acceptable; record that it is not canonical 1920×1080.

When inspecting:

- Confirm Config → Layers → Eclipse → Eclipse appearance has **Lunar visibility footprint color** defaulting to `#6a9aa8`, independent of **Lunar visibility footprint thickness**.
- Confirm changing the color to `#ff00ff` (or another unmistakable hue) repaints the existing closed line immediately: same geometry, no fill, no Demo/Event Playback restart, no product-time advance, no lunar-layer toggle.
- Confirm the same color change on upcoming (`eclipseStation=upcoming`), active/total (`total`), partial (`lunar-eclipse-partial` or `deepPartial`), and a penumbral station if practical (`lunar-eclipse-total&eclipsePhase=penumbral`). Geometry stays the event-static footprint.
- Confirm footprint checkbox off hides the line and disables the color control; after-event (`eclipseStation=after`) has no line regardless of color.

### Live eclipse alignment / beam (E5)

Existing eclipse scenarios enable the alignment field by default (`scene.eclipseAlignment` master / solar / lunar on, intensity normal). Do not add a second scenario catalog for the beam.

When inspecting E5:

- Confirm the solar beam connects the Sun/Moon glyph cluster to the **live** umbra (total) or antumbra (annular), not the forecast corridor and not the reference city.
- Confirm a partial-only solar event has no fabricated central beam.
- Confirm the lunar Earth-shadow cue is a short Moon-local indicator pointing into the Moon from the shadow side, not a solar-style Earth path and not a beam emitted by the Moon.
- Confirm the map, corridor/footprint, city pins, and glyphs remain readable.
- Confirm Moon still paints above Sun when the glyphs overlap.
- Confirm changing `observerCity` does not move the beam.
- Confirm forecast-only scenarios have no beam.
- If checking intensity, use Layers: Subtle / Normal / Dramatic. Each should be useful; dramatic must not obscure the map.

### Solar eclipse lifecycle + shading (LIB-025)

Use `?scenario=solar-eclipse-2017` (7-day horizon) plus `eclipseStation=` rather than live-only 2024 scenes when judging corridor continuity.

When inspecting:

- Confirm the Pacific→Atlantic corridor remains immediately legible at upcoming, pre-central, central, and post-central stations. It must not read as absent during the interesting part of the event.
- Confirm the representative forecast partial fill is present upcoming and gone once globally active; active partial darkening is the physical obscuration field in solar shading, not a competing teal live fill.
- Confirm the vermilion ground marker is absent until the umbra intersects Earth, tracks the live footprint, and disappears after the umbra leaves Earth — including while the event is still globally active.
- Confirm Dramatic alignment is a ribbon to the live marker during central-active stations, and is absent at pre-central and post-central (no stale target, no unexplained glyph-field wash).
- Confirm ordinary day/night shading continues to move with product time and is not rewritten by eclipse overlays.
- Confirm accelerated playback from `eclipseStation=upcoming` through global end has no corridor vanishing, no alpha flash, and no double forecast+live partial stack.
- Confirm `solar-eclipse-dateline`, `solar-eclipse-annular`, and `solar-eclipse-partial` still follow their existing wrap / antumbra / no-fabricated-central checks.

### Solar eclipse visual-semantics families (LIB-026)

Use the exact Knoxville-captured 2017 UTC stations (EDT = UTC−4). Do not substitute nearby lifecycle stations.

| Id | Knoxville wall | UTC | `eclipseStation=` |
|----|----------------|-----|-------------------|
| A | 10:42:59 AM EDT | `2017-08-21T14:42:59.000Z` | `stationA` |
| B | 11:56:19 AM EDT | `2017-08-21T15:56:19.000Z` | `stationB` |
| C | 1:05:58 PM EDT | `2017-08-21T17:05:58.000Z` | `stationC` |
| D | 1:52:57 PM EDT | `2017-08-21T17:52:57.000Z` | `stationD` |
| E | 2:36:03 PM EDT | `2017-08-21T18:36:03.000Z` | `stationE` |
| F | 3:55:15 PM EDT | `2017-08-21T19:55:15.000Z` | `stationF` |

Showcase config for this sequence: Extra Large Moon, Event labels OFF, Alignment Dramatic, Ground marker ON Large, solar shading ON.

When inspecting:

- Confirm each visible translucent region belongs to one family: violet event path, informational teal forecast partial (upcoming only), compact indigo central shadow, warm gold alignment ribbon, vermilion marker, ordinary cool night raster, plus a continuous charcoal daylight-attenuation field while the eclipse is active.
- Isolate families at D or E with production toggles (solar shading only; then corridor; then central footprint; then alignment; then marker). A large changing wedge must be attributable to one family.
- Confirm corridor geometry does not change across A–F; corridor limits remain readable over the moving dark field.
- Confirm B (pre-central) has the dark obscuration field + path, no marker, no targeted beam, and no unexplained alignment wedge.
- Confirm C–F keep marker/beam target agreement; E is the primary near-GE acceptance station.
- Confirm wrap copies do not darken the same geography twice on `solar-eclipse-dateline` and polar 2021 (`2021-12-04`).
- Confirm continuous accelerated playback through the 2017 event: the dark field evolves smoothly, beam follows the marker, path stays put, terminator stays a separate night family.

### Continuous solar-eclipse obscuration shading (LIB-027)

Use `?scenario=solar-eclipse-2017` with Solar shading ON, Active eclipse shading ON, intensity **Normal** first, Event labels OFF, Extra Large Moon, Large vermilion marker, Alignment Normal first.

When inspecting:

- Confirm the active broad effect is a continuous dark field, not a flat teal polygon turning on/off.
- Confirm A upcoming still uses informational teal forecast partial; no physical darkening days early.
- Confirm B pre-central already darkens where the eclipse is partial; corridor visible; no marker; no targeted beam; no umbra on Earth.
- Confirm C central entry is additive: the dark field is already present, then compact umbra, marker, and beam appear without a style-family switch.
- Confirm D–F keep one continuous dark field; marker/beam/umbra remain readable over it; corridor limits remain readable.
- Confirm just after last central intersection: field continues where partial remains; marker/beam/umbra gone.
- Confirm global end clears the field continuously into ordinary daylight.
- Confirm Dramatic shading + Dramatic alignment at 2017 central phases is striking but still readable (do not recapture README media).
- Confirm `solar-eclipse-annular` center is strongly dark but not totality-black; antumbra/marker remain distinct.
- Confirm `solar-eclipse-partial` is explained by the dark field alone (no corridor/marker/targeted beam/umbra).
- Confirm `solar-eclipse-dateline` does not duplicate or seam-darken near ±180°.
- Confirm polar 2021 (`2021-12-04`) stays continuous near the pole with no false cap fill.
- Confirm Solar eclipses overlay OFF with solar shading ON still physically darkens during an active eclipse.

### Solar eclipse obscuration raster boundary (LIB-028)

Use `?scenario=solar-eclipse-2017` with Solar shading ON, Active eclipse shading ON, intensity **Normal** first, Event labels OFF, Extra Large Moon, Large vermilion marker, Alignment Normal first. Diagnostic stations: `eclipseStation=rasterPreStart` (15:39:02Z, before global start), `rasterWest` (16:45:01Z), `rasterMid` (17:06:33Z), `rasterEast` (19:22:59Z), `rasterLate` (19:56:08Z).

When inspecting:

- Confirm `rasterPreStart` has no physical eclipse field (event has not started; forecast teal may still be present).
- Confirm `rasterWest` has no rectangular west-edge shadow slab. The dark field should fade into ordinary Pacific daylight / night at the true penumbral/horizon limb, not at a longitude column.
- Confirm `rasterMid` remains a continuous field; central progression coherent; no new seam.
- Confirm `rasterEast` / `rasterLate` have no rectangular east-edge shadow slab. The eastern limb fades; do not accept a vertical dark wall.
- Confirm west–east visual transects through the former artifact regions approach transmission 1 smoothly. A physical sunrise/sunset terminator coinciding with high obscuration must merge into ordinary twilight; do not accept a second hard band beside the terminator.

### Solar eclipse horizon / illumination composition (LIB-029)

Use `?scenario=solar-eclipse-2017` with Solar shading ON, Active eclipse shading ON, intensity **Normal** first, Event labels OFF, Extra Large Moon, Large vermilion marker, Alignment Normal first. Horizon stations: `eclipseStation=horizonA` (14:30:00Z), `horizonB` (16:33:24Z), `horizonC` (17:10:15Z), `horizonD` (19:22:26Z), `horizonE` (19:55:32Z). West time steps: `horizonWest1420`…`horizonWest1445`. East time steps: `horizonEast1940`…`horizonEast2005`.

When inspecting:

- Confirm `horizonA` (14:30Z) is still upcoming: no physical eclipse field; ordinary Pacific terminator only. Global start is 15:46Z.
- Confirm `horizonB` has no vertical dark slab beside the western terminator. Eclipsed daylight should fade into ordinary twilight/night without a second hard band. This is the primary west-side acceptance check (the captured 14:30Z wall clock is before the event; the seam appears once the field is active).
- Confirm `horizonC` remains a strong continuous central field; marker/beam/corridor unchanged.
- Confirm `horizonD` has a strong coherent field without a premature eastern horizon wall.
- Confirm `horizonE` has no scalloped/vertical dark wall near the eastern terminator / Africa side. Ordinary sunset/night owns the night side. This is the primary east-side acceptance check.
- Confirm west time steps 14:20–14:45Z (upcoming) do not invent a field; after global start, the west terminator/eclipse intersection must move continuously (use `horizonB` / `rasterWest` plus 5-minute demo steps around 16:30–16:50Z if needed).
- Confirm east time steps 19:40–20:05Z move continuously; no topology switch at the terminator.
- Confirm solar-altitude ±1° numerical behaviour: overlay alpha changes smoothly; E4 visibility may still switch at 0°.
- Confirm `solar-eclipse-partial`, `solar-eclipse-annular`, and `solar-eclipse-dateline` have no terminator seam and no ±180° seam.
- Confirm polar 2021 (`2021-12-04`) has no stair-step horizon mask or false polar cap.
- Confirm a non-eclipse date and Active eclipse shading OFF leave the ordinary terminator unchanged.
- Then inspect Dramatic at `horizonB` and `horizonE` — stronger field, still no horizon seam.
- Confirm `solar-eclipse-dateline` has no ±180° transmission seam or doubled darkening.
- Do **not** accept a visible rectangular transmission-patch or field-bbox bound as “the eclipse edge.”
- Then inspect Dramatic at `rasterWest` and `rasterLate` — stronger field, still no domain rectangle.
- Confirm annular (`solar-eclipse-annular`) and partial-only (`solar-eclipse-partial`) keep smooth outer fades with no bbox line.

When inspecting E4:

- Open the same eclipse scene twice, changing only `observerCity`.
- Confirm **global-path immutability**: solar live footprint / forecast corridor / lunar Moon-shadow stay geographically the same. Only local chrome, Layers details, and other reference-city decorations may change.
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

### Event playback smoke (LIB-047 / LIB-052 / LIB-053)

Does not require a new `?scenario=` id. Use a range that includes at least one solar eclipse, one lunar eclipse, and several Milky Way windows (for example 2026-03-01 … 2026-09-01).

1. Open Config → Data → Event playback. Confirm **no** Event family selector. Event types: Solar, Lunar, and Milky Way viewing windows, all factory on. Layers → Eclipse has **no** Eclipse Tour section. Data → Time still has generic Demo.
2. Factory: Loop on, lead-in 1 day, post-wait 1 hour, speed same as Data → Time, MW levels Viewing off / Strong+Prime on, playback inactive.
3. With Milky Way enabled, Start must remain responsive (no multi-second freeze). Product time jumps to the first matching event lead-in; Demo plays. Pause works immediately.
4. Next/Previous and autoplay cross families without changing UI mode. Status names the navigation event (`Total solar eclipse`, `Milky Way · Prime`, …) as `Event N` without `of M`.
5. Reset returns to that event’s lead-in, not the range start. Stop leaves product time paused and deactivates sequencing.
6. Data → Time pause/speed stay in sync. Editing Demo start, **Use current time**, or leaving Demo mode, deactivates playback.
7. Same-UTC check: 2017-08-21 GE via Data → Time vs via Event playback at the same instant — eclipse overlay equivalent; live-only ISS/clouds/quakes remain suppressed on historical instants.

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

### Ordinary-mode live dynamic layers

DEV `?scenario=` fixtures force Global clouds / IR, Earthquakes, ISS orbital track, and cloud participation **off**. That isolation is intentional and applies only when a scenario is applied.

To verify those three overlays, use **ordinary non-scenario** current-time mode (`http://localhost:1420/` with no `?scenario=`). Enable one Layer masters checkbox at a time, wait for acquisition, then confirm a visible map change without toggling unrelated controls. Classify each source as live-provider success, fixture fallback, or blocked provider. Disable must remove the presentation; re-enable must show it again.

Do not treat a DEV scenario session as evidence that live layers work.

### ISS fresh-process first paint

Ordinary non-scenario current time, **new process** (`http://localhost:1420/` with no `?scenario=`, ISS unchecked at factory defaults):

1. Open Config → Layers → Layer masters.
2. Check ISS orbital track. Do not wait for a 2-hour tick, resize, or unrelated edit.
3. Expect a concise “ISS orbital track is loading…” hint while there is no usable in-memory TLE.
4. Within a few seconds of a responsive live TLE (or about one 8 s primary timeout plus secondary latency when CelesTrak hangs): ISS marker/track on the map, loading hint gone. Or, promptly, “ISS orbital track is unavailable.” with no fixture orbit.
5. Disable ISS for ~5 s, then re-enable. If a usable live TLE is still in memory, the overlay returns immediately; a background refresh may still run.
6. Historical Demo (for example 2017-08-21) with ISS still checked: no loading hint implying it should appear; live-only suppression copy; no ISS on the map. Return to current: acquisition/reuse starts without re-checking the box.

Repeat from a fresh `npm run dev` at least once so React StrictMode remount is included.

### ISS presentation controls (`iss-presentation`)

Use `http://localhost:1420/?scenario=iss-presentation`. Confirm the DEV banner id and UTC `2026-08-06T01:17:00.000Z`. Open Config → Layers → Space objects. Each control must change the map on the next frame; do not wait for a TLE refresh, resize, or an unrelated edit. Restore factory values after each extreme.

- Orbit track OFF: trajectory lines gone; current glyph and `ISS` label remain. ON: lines return immediately.
- Distinct past (red) and future (green): both on; past off leaves only future; future off leaves only past; each restore is immediate.
- Past horizon 60 min → 15 min → 1 orbit → 3 orbits → 6 orbits (and matching future): line extent grows immediately from local SGP4, without a TLE fetch. Distant revolutions are fainter. No world-spanning seam lines.
- 1 orbit / 1 orbit: one previous revolution and one future revolution around the current marker; Earth-rotation ground-track shift; no false world-spanning lines.
- 3 orbits / 3 orbits: multiple sinusoidal passes; older/farther tracks fade; current glyph remains obvious; map stays readable.
- 6 orbits / 6 orbits: no renderer failure; fading still quietens distant passes; no giant seam lines; acceptable interaction.
- Asymmetric: past 6 orbits / future 1 orbit, then the reverse. Independent extents and colors.
- Silhouette glyph Extra large: `#ff00ff` then `#00ff00` must visibly recolor the station; restore default cyan family and Medium / Dot afterward. Dot color must remain independent.
- Orbit base color: label (and past track when still linked to that color) changes immediately.
- Line thickness Thin / Normal / Thick.
- Glyph Dot ↔ ISS silhouette; size Small / Medium / Large / Extra large; conditional dot vs silhouette color.
- Show ISS label OFF removes the text immediately; ON restores it; the marker remains.

This scenario must not fetch CelesTrak or Where the ISS at. Production ordinary mode still hides ISS when no live TLE can be acquired.

### Planetary objects (`planetary-objects`)

Use `http://localhost:1420/?scenario=planetary-objects`. Confirm the DEV banner id and UTC `2026-08-19T15:30:00.000Z`. Open Config → Layers → Space objects. Each control must change the map on the next frame. These are geographic sub-object visualizations, not orbits around Earth and not solar analemmas.

- All eight bodies plus Pluto: distinct glyphs/labels at plausible subpoints; astronomical-symbol glyphs; no projection NaNs.
- Show current subpoints OFF: glyphs/labels gone; enabling a locus still shows that body's trace. ON restores glyphs.
- Show planet labels OFF/ON.
- Glyph Astronomical symbol → Dot → Astronomical symbol; size Small / Medium / Large / Extra large. Immediate; no astronomy hitch.
- Mars color magenta: Mars glyph, label, track, and locus follow; other bodies unchanged.
- Planet ground tracks ON with Mars, Venus, Jupiter: 1 day past/future; smooth westward motion; future fainter than past; no world-spanning seam lines. 7-day horizon remains readable.
- Planetary loci: Mercury 1y/2y; Venus 1y/2y/5y; Mars 1y/2y/5y; at least Jupiter, Saturn, Neptune, Pluto at 1y/5y/10y. Uniform locus color (no past/future split). Daily same-time sampling; current glyph sits on the figure when current subpoints are on.
- Per-body locus: all loci OFF, then Mercury locus only, then add Venus, then Mercury locus OFF (Venus remains). Body master OFF hides that body's glyph/track/locus and restores the locus checkbox when turned back ON.
- All-loci 10-year stress: all bodies and loci on; map remains interactive after the first cache fill; no giant dateline segments.
- Demo 1950 / present-ish / 2050 reconstruct; dates outside 1600–2500 show “Planetary positions unavailable outside 1600–2500.” and hide planetary features.
- Moderate Demo acceleration: current glyphs/short tracks move; loci do not shudder from per-frame rebuilds.

Factory defaults keep Planets off. ISS presentation in the same topic must remain unchanged.

### Milky Way (`milky-way`)

Use `http://localhost:1420/?scenario=milky-way`. Confirm the DEV banner id and UTC `2026-08-19T06:00:00.000Z`. Open Config → Layers → Space objects → Milky Way. Each control must change the map on the next frame.

The ribbon is a **zenith projection**: it shows where Galactic-plane and approximate-band directions are directly overhead. It is not “where the Milky Way is visible.” Night-side emphasis is not an observing-quality forecast.

Galactic-center **altitude contours** are a second line presentation: a point on the 60° contour sees the Galactic center 60° above the geometric horizon at this instant. They are nested small circles around the GC marker. Higher altitude → smaller circle. No fill. Astronomical-night emphasis strengthens segments where the Sun is low; moonlight de-emphasis quiets moonlit segments using the existing moonlight model. This is still not a single visibility score.

**Viewing windows** are one reference-city event family (no Viewing / Strong / Prime product classes). Map labels and the static peak-UTC **viewing footprint** are Layers presentation; sequencing is Data → Event playback. The scenario enables events so labels, footprint, and HUD notices are visible; factory default remains off.

- Galactic plane alone (band and ribs off): one thin great-circle-like curve, not a filled region, not a world-spanning false line.
- Plane + band edges: two flanking curves around the plane; Normal width clearly broader than Narrow and narrower than Wide.
- Ribs on: sparse cross-connectors communicate width and orientation without reading as a grid or fence.
- Galactic center marker and “Galactic center” label offset from the glyph/band; anticenter off by default, quieter when enabled, unlabeled.
- Night-side emphasis: night-side segments stronger than day-side; toggling it off equalizes alpha. This is the overhead projection on Earth’s night side, not visibility.
- Altitude contours (scenario default on): nested 30/45/60/75° circles centered on the GC marker; 75° smallest. Numeric labels such as `60°` are present when **Show contour values** is on (factory on). Turning values off leaves the same lines with no numbers. Southern latitudes near the GC subpoint sit inside the high-altitude rings; northern mid-latitudes sit outside or near 30°. Day-side contour strokes are quiet; astronomical-night stretches are strongest. Horizon 0° off by default.
- Toggle “Show Galactic-center altitude contours” off: rings disappear; ribbon remains. Toggle the ribbon structures off with contours on: rings remain.
- Demo jumps ~six hours apart: the ribbon **and** the contours rotate westward with the GC marker. 1600 / 2000 / current / ~2500 remain geometrically coherent.
- Combined Planets + Milky Way: planets remain readable; Milky Way stays under planetary glyphs.
- Combined eclipse scenario with Milky Way on: eclipse geography remains the event overlay; neither ribbon nor contours become a shading layer.
- **A.** Knoxville, `?scenario=milky-way` at 2026-08-19T06:00Z: upcoming map label near the GC marker (`Knoxville · Milky Way · tonight` or `in 1d`); rose/lavender **viewing footprint** closed line(s), thicker than 30/45/60/75° contours, no fill. Layers has no Viewing/Strong/Prime checkboxes and no Go to next Prime.
- **B/C.** `?scenario=milky-way&mwEvent=active` (2026-08-20T02:27:16Z): active label `Knoxville · Milky Way viewing` at the same GC-subpoint family — no geographical jump. Footprint geometry is the same peak-UTC snapshot as upcoming. HUD: `Milky Way viewing`.
- **D.** After the window (step Demo past the end): map label gone, footprint gone, MW HUD notice gone unless another window is in horizon.
- **E.** Show viewing footprint OFF: boundary gone; label may remain. ON restores the same line.
- **F.** Viewing footprint color `#ff00ff`: stroke recolors immediately; no geometry rebuild hitch. Restore `#c97ba8`.
- **G.** Knoxville event: Knoxville lies inside the footprint.
- **H.** `?scenario=milky-way&observerCity=sao_paulo`: southern latitude; higher peak GC; city copy and event times change; footprint is that city’s peak-UTC geography.
- **I.** Near-new-Moon nights in the August 2026 cluster: windows exist; footprint is broader where GC geometry and astronomical night still qualify — not the entire night side.
- **J.** Bright-Moon non-event: high GC with the Moon up and bright does not open a window; contours can still show elevation.
- **K.** Data → Event playback: one **Include Milky Way viewing windows** checkbox; Start / Next / Previous / Loop / Pause / Reset / Stop cycle solar, MW, and lunar chronologically without freeze.
- **L.** Lower-left HUD: date/time stay dominant; stacked event notices (eclipse + MW) do not overlap; two visible lines plus `+N more event(s)` when overflow applies. Narrow Config/map width: notices stay one line each.

Factory defaults keep Milky Way off. Enabling the master does **not** turn altitude contours or viewing events on. Data Event playback may still tour MW windows while Layers presentation is off.

### Current vs historical dynamic-layer smoke

Ordinary non-scenario current time (`http://localhost:1420/`, no `?scenario=`):

- Enable Earthquakes, Global clouds / IR, and ISS orbital track. Wait for acquisition.
- Confirm live USGS events, GIBS overlay, and an ISS track with a current-position marker labeled `ISS` that sits **on** the track (not at an arbitrary future endpoint unless the future window is 0).
- If CelesTrak is blocked, a secondary live TLE (Where the ISS at) may still succeed; classify the actual provider. If all live TLE sources fail, ISS is unavailable — do not treat a canned Africa/Pacific fixture as a live current position.

Historical Demo (for example 2017-08-21) with those three still checked:

- Earthquakes, cloud overlay, cloud illumination participation, and ISS must disappear. Fixture must not substitute.
- Layer masters checkboxes stay checked. Hint: “Live-only data is hidden while viewing another product time.”
- Return to current time (static mode or Demo reset to near-now) without re-toggling: the three sources restore.

### ISS live external comparison

At a recorded UTC, compare Libration’s product-instant SGP4 sample to a reputable tracker (NASA if accessible, otherwise where-the-iss.at or equivalent). Record TLE epoch, wall-clock age, Libration lat/lon, external lat/lon, and approximate ground distance. Target ≤ 100 km. A Japan-versus-Mongolia class disagreement is a failure, not a rounding difference.

### Default HUD and pin presentation

Factory/fresh config (missing `libration.workingConfigV2.v1`, or reset to defaults), ordinary mode:

- Bottom-left HUD time is HH:MM (or 24-hour equivalent) **without** seconds. Hour-tape labels are unchanged.
- City pins show city names without clocks.
- Enabling pin content “City name and local time” uses the default `time` format (no seconds) until the user picks `timeWithSeconds`.

Chrome → Bottom HUD still exposes “Show seconds on lower-left reference time.” Pins still expose label content and datetime format.

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
