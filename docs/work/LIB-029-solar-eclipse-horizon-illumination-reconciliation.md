# LIB-029 — Solar-eclipse horizon / illumination composition reconciliation

| Field | Value |
|-------|-------|
| ID | LIB-029 |
| Status | complete |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | 2026-08-16 |

Human-authorized item. Authorized to create, approve, activate, diagnose, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not regenerate README media.

LIB-024 remains approved and paused: ground-position marker is in the tree; README recapture waits for an explicit later request.

Predecessor [LIB-028](LIB-028-solar-eclipse-obscuration-raster-boundary.md) is complete (full-world 288×145 field). Remaining 2017 west/east terminator seams are this item.

## Objective

During an active solar eclipse, authoritative obscuration must attenuate only the daylight that actually exists at each point. Crossing the solar horizon must not produce a visible seam, brightness jump, or scalloped compositing boundary, while the strong continuous daylight-side eclipse darkening from LIB-027 is preserved.

## Scope

**In scope**

- Diagnose the remaining 2017 west (14:30Z) and east (19:55:32Z) terminator-adjacent seams and record which quantity jumps.
- Separate physical obscuration from E4 local-visibility horizon gating if they currently share one branch.
- Compose eclipse transmission with the existing ordinary daylight/night-veil quantity; do not store a boolean horizon mask that bilinear interpolation cannot repair.
- Keep Subtle / Normal / Dramatic curves; do not globally weaken shading to hide the seam.
- Focused tests for final illumination continuity, night-side invariance, no-eclipse terminator, A/E transects, partial/annular/dateline/polar.
- Cursor Browser visual verification of A–E, west/east time steps, annular, partial-only, dateline; polar automated (visual if practical).
- Proportional docs, STATE, DEVELOPMENT_LOG, this completion record.

**Out of scope**

- Atmospheric radiative transfer, twilight-sky color, corona, Purkinje, terrain/refraction, lux.
- New eclipse authority, event browser, notifications, lunar changes.
- Retuning γ / maxDarken to hide a terminator seam; arbitrary blur; a second full-world expensive solar field.
- README/media; GIF/video; completing LIB-024 recapture.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one `rasterPatch`.
- [ADR 0012](../decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md) — eclipse attenuation is physical illumination of available daylight. No new ADR unless a broader durable rule is established.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md).
- Predecessors: [LIB-027](LIB-027-continuous-solar-eclipse-obscuration-shading.md), [LIB-028](LIB-028-solar-eclipse-obscuration-raster-boundary.md). Preserve E4 identities and LIB-027 response curves.

## Acceptance criteria

- Root cause of the west/east terminator seams identified and recorded.
- Map eclipse attenuation composes with ordinary daylight availability; no hard visual cutoff at solar altitude = 0.
- Eclipse does not darken ordinary night; turning attenuation off at the horizon does not brighten relative to immediately above it.
- Ordinary no-eclipse terminator unchanged; Active eclipse shading OFF leaves ordinary solar shading unchanged.
- 2017 A and E artifacts gone; B/C/D central behaviour preserved; west/east small-step sequences move continuously.
- Partial-only, annular, dateline, and polar horizon composition remain coherent.
- Normal remains pronounced; Dramatic remains strong; Canvas eclipse-neutral; same UTC deterministic.
- Type-check, full suite, and production build pass. No README/media. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: physical vs E4 horizon, illumination composition, A/E transects, night invariance, no-eclipse terminator, polar/dateline/annular/partial
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production must exclude DEV scenario machinery
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: only if a broader durable rule is established (expected: none; clarify ADR 0012 realization in implementation docs)

## Completion record

**Implementation summary**

The remaining 2017 west/east terminator seams were not Besselian geometry. They were a compositing discontinuity: `solarEclipseObscurationAt` zeroed `obscuration01` when Besselian altitude &lt; 0, the 288×145 field stored that mask, bilinear interpolation between masked night cells and eclipsed day cells made a scalloped limb, and `combinedAlpha = 1 − (1 − ordinaryAlpha) × transmission` then jumped because ordinary twilight at altitude 0 still has `nightVeil ≈ 0.045` (almost full daylight). Just above the horizon, Normal transmission ~0.64 produced overlay alpha ~96; immediately below, transmission 1 restored ordinary twilight alpha ~7–15 — a dark-to-bright handoff. Physical overlap across that same cut was continuous (~0.73).

Fix: keep E4 `obscuration01` horizon-gated for local visibility; store `physicalObscuration01` in the illumination field; compose with ordinary daylight availability `dayClear = 1 − nightVeil` via `eclipseDaylightFactor = 1 − dayClear × (1 − transmission)` then `overlayAlpha = 1 − (1 − ordinaryOverlayAlpha) × eclipseDaylightFactor`. Settled night is unchanged. LIB-027 curves unchanged. No new ADR; ADR 0012 clarified. No README/media. LIB-024 remains paused.

Station A `14:30:00Z` is before global start (`15:46:43Z`); no physical field exists there. The west seam is the active-field terminator intersection (16:33Z / 16:45Z). East seam is `19:55:32Z` at ~20°N, ~24°W.

**Commands run**

- Private `npx tsx` diagnosis of A/E and rasterWest transects (deleted after the run)
- Focused: `npx vitest run` on obscuration, field, illuminationShading, solarEclipseHorizonIllumination, illumination plan, solarShadingLayer, visualScenarios
- `npx tsc --noEmit`
- `npm test` (first run: 2 timeouts under suite load; isolation pass; second full run clean)
- `npm run build`
- `npx tsx` field-build / cache / sample timing
- Cursor Browser visual inspection of horizon A–E, rasterWest, east 19:40Z / 20:05Z, annular, partial, dateline, ordinary startup; canvas `getImageData` transects at 16:45Z lat 45 and 19:55:32Z lat 20

**Actual results**

- Focused: after assertion fixes, 34+ related tests passed
- `npx tsc --noEmit` clean
- `npm test`: 206 files / 1965 passed / 0 failed (second run). First run 2 timed out (`landcoverOnboardedAsset` JPEG decode; `solarEclipseVisualSemantics` last-central); both passed in isolation (2.2 s / 2.5 s)
- `npm run build` succeeded; `dist/` contains no `solar-eclipse-2017` / `eclipseStation` / `visualScenarios`
- Field build 11.83 ms uncached; cache hit 0.024 ms; illumination sample with transmission ~0.52 µs vs quiet ~0.14 µs
- RasterWest lat 45: physical obscuration 0.719 below horizon vs 0.736 above; E4 0 vs 0.736; after fix canvas luminance along y=270 across −174…−167 stays ~290–305 (no handoff jump)
- Horizon E lat 20: canvas luminance across −26…−22 stays ~291–297 (terminator at ~−23.75°); isolated 100+ jumps were land/cloud specks, not the altitude sign change
- Dramatic at 2017 GE center overlay alpha &gt; 140 and stronger than Normal

**Visual verification**

- App: `npm run dev` at http://localhost:1420; Cursor Browser; `Emulation.setDeviceMetricsOverride` 1920×1080; innerWidth 1920×1080; canvas bitmap 1888×1079 / CSS 1889×1080
- Config: Solar shading ON, Active eclipse shading ON, intensity Normal, Event labels OFF, Extra Large Moon, Large vermilion marker (2017 scenario seed)
- `horizonA` `14:30:00Z`: upcoming; corridor + forecast teal; ordinary Pacific night/terminator; no physical eclipse field (global start 15:46Z)
- `horizonB` `16:33:24Z`: continuous dark field over Pacific/US; no second vertical dark slab beside the western terminator; corridor visible
- `horizonC` `17:10:15Z`: strong central field; vermilion marker Pacific NW; gold beam; corridor; no family regression
- `horizonD` `19:22:26Z`: strong coherent field; marker in Atlantic; no premature eastern wall
- `horizonE` `19:55:32Z`: field merges into eastern twilight/night; canvas transect across the former seam is continuous; no vertical dark wall
- `rasterWest` `16:45:01Z`: west terminator/eclipse intersection continuous in canvas pixels
- East steps `19:40Z` → `19:55:32Z` → `20:05Z`: field moves continuously; at 20:05Z (after last central 20:01Z) vermilion marker gone, Moon glyph remains, corridor remains
- `solar-eclipse-annular`: dark field, incomplete center, antumbra/marker/beam/corridor
- `solar-eclipse-partial`: field on the Europe/Atlantic side of the Americas crop; ordinary Americas night/terminator; no corridor/marker/targeted beam
- `solar-eclipse-dateline`: Pacific corridor from the west; Americas show ordinary terminator; no doubled field
- Ordinary `http://localhost:1420/`: title Libration, no scenario banner
- Result: PASS

**Not verified**

- Pixel-golden screenshots
- Exact 1920×1080 CSS canvas (inner 1920×1080; canvas CSS width ~1889)
- Dramatic intensity visually in the browser (automated: stronger than Normal at GE; visual used Normal)
- Polar 2021-12-04 visually (automated finite/continuity tests passed; no DEV polar scenario)
- Continuous 400× demo playback (5-minute / station stepping used instead)
- West 14:20–14:45Z as an *active* seam sequence — those times are all before global start; active west verified at 16:33Z and 16:45Z
- Pause-freeze of the field during an active eclipse

**Discovered, not done**

- LIB-024 README recapture remains deferred until an explicit later request.
- Captured Knoxville 10:30 AM EDT (`14:30:00Z`) is 76 minutes before 2017 global first contact. The west terminator/eclipse intersection the user photographed as “near the beginning” is the active field after 15:46Z (16:33Z / 16:45Z).
- Some suite tests sit near the 5 s timeout when the full suite is under load (`landcoverOnboardedAsset`, last-central visual-semantics). Not this item’s assertions; they pass in isolation.
