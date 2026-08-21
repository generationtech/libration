# LIB-057 — Milky Way viewing event simplification, viewing footprint, and HUD event notices

| Field | Value |
|-------|-------|
| ID | LIB-057 |
| Status | complete |
| Created | 2026-08-20 |
| Approved | 2026-08-20 (human; this request) |
| Completed | 2026-08-20 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Replace the three user-facing Milky Way quality classes (Viewing / Strong / Prime) with one reference-city **Milky Way viewing window**, add a static line-only global favorable-viewing footprint at the event peak, keep Data as the sole event-playback owner, and give the lower-left HUD a bounded multi-family event-notice stack.

## Scope

**In scope**

- Audit v1 Viewing / Strong / Prime; collapse to one primary event family with policy `milky-way-viewing-v2`.
- Safe persistence migration of old class/level keys.
- Static peak-UTC Milky Way viewing footprint (closed boundary lines, no fill).
- Layers presentation controls for the footprint; Data playback remains one MW source with incremental next/previous.
- Presentation-level event-notice arbiter for solar, lunar, and Milky Way HUD lines.
- Focused tests, visual verification, docs, ADR for the simplified event definition.

**Out of scope**

- Weather, clouds, transparency, light pollution, Bortle.
- Whole-band (Cygnus/Cassiopeia) viewing events.
- New world shading / observing-quality raster.
- Second product clock; moving playback back to Layers.
- Event drawer / clickable overflow.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one canonical UTC instant.
- [ADR 0017](../decisions/0017-offline-iau-galactic-zenith-projection-authority.md) — Galactic geometry authority.
- [ADR 0018](../decisions/0018-milky-way-viewing-window-is-a-reference-city-event.md) — superseded for three-level product states by ADR 0021; reference-city ownership remains.
- [ADR 0019](../decisions/0019-domain-event-playback-belongs-to-data.md) / [ADR 0020](../decisions/0020-event-playback-merges-enabled-domain-sources.md) — Data = when, Layers = what; merged incremental playback.
- [ADR 0002](../decisions/0002-single-upstream-planetary-illumination-rasterpatch.md) — no new illumination raster.
- HUD notices are presentation arbitration only; they do not become event authority.

## Design notes

v1 Viewing / Strong / Prime (policy `milky-way-viewing-v1`) were overlapping quality partitions of the same geometry. The user-facing question is the old Prime core: Galactic center usefully elevated near the local nightly maximum, astronomical darkness, and conservative modeled moonlight. Moon phase is explanatory copy only.

The footprint answers: at this reference-city window’s peak UTC, where else on Earth are the same core conditions favorable? It is not the zenith ribbon, not GC altitude contours, and not a weather/light-pollution map.

## Acceptance criteria

1. User-facing Viewing / Strong / Prime controls and labels are gone unless retention is strongly justified in this item.
2. One primary MW viewing event: GC geometry + Sun ≤ −18° + low modeled moonlight.
3. Near-new Moon and Moon-down naturally qualify; bright Moon above the horizon can disqualify; no phase-only shortcut.
4. Data playback owns navigation; Layers owns MW event presentation (label + footprint).
5. Static line-only footprint at event peak UTC; Knoxville lies inside its own event footprint; after the event, footprint and labels disappear.
6. Lower-left HUD arbitrates multiple event notices (max visible bound + overflow); active outranks upcoming; playback filters do not control HUD/map presentation.
7. Focused tests, `npx tsc --noEmit`, `npm test`, and `npm run build` pass. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: v2 policy, windows, footprint, notices, migration, playback
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — Config/DEV scenario; confirm scenario registry absent from production bundle
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- ADR 0021 (and status marks on 0018 / 0020)

## Completion record

**Implementation summary**

Collapsed user-facing Viewing / Strong / Prime into one **Milky Way viewing window** (`milky-way-viewing-v2` = former Prime core: GC ≥ 15°, ≥ 90% local nightly max, Sun ≤ −18°, moonlight ≤ 0.08). Added a static line-only **viewing footprint** at event peak UTC. Data Event playback remains one MW source with incremental next/previous. Lower-left HUD now ranks solar/lunar/MW notices (max 2 + overflow). ADR 0021; ADR 0018 three-level product states and ADR 0020 MW level filters superseded.

**Commands run**

- `npx tsc --noEmit`
- focused vitest (18 files)
- `npm test`
- `npm run build`
- Cursor Browser: `?scenario=milky-way`, `mwEvent=active`, `observerCity=sao_paulo`, Layers Space objects, Data Event playback, Demo 2026-08-21

**Actual results**

- `npx tsc --noEmit` clean
- focused 18 files / 269 passed
- `npm test` 255 files / 2383 passed / 0 failed
- `npm run build` succeeded (`dist/assets/index-DdH2SErU.js` 1,540.21 kB). `visualScenarios`, `?scenario=`, `mwEvent` absent from `dist/`. Policy token `milky-way-viewing-v2` present as expected.

**Visual verification**

Cursor Browser (pane ~964×998 CSS px, not canonical 1920×1080). Upcoming Knoxville: `Knoxville · Milky Way · tonight` at GC, rose footprint over eastern North America, HUD `Milky Way viewing · tonight`. Active: `Knoxville · Milky Way viewing`, same static footprint, HUD `Milky Way viewing`. São Paulo at the fixture UTC: no window inside 2d/7d (v2 is strict); Knoxville label/footprint gone. Layers: events/labels/footprint controls, no Viewing/Strong/Prime. Data: one MW playback checkbox, Start/Next/Previous/Loop/Pause/Reset/Stop. After the Aug 20 window (Demo 2026-08-21 2:00 AM): MW label and footprint gone; HUD `Lunar eclipse · Partial · in 6d 19h` without overlap.

**Not verified**

Canonical 1920×1080 viewport. Live Start→Next freeze walk on the merged catalog (array/live lookup tests cover it). Custom footprint color on the map (control + render-plan stroke test). Three simultaneous HUD notices in the browser (arbiter tests cover overflow).

**Discovered, not done**

Observing-quality forecast (weather/light pollution). Whole-band (Cygnus/Cassiopeia) events. Clickable HUD overflow. Event-whole footprint union.
