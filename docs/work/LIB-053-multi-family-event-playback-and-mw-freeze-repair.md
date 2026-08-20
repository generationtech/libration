# LIB-053 — Multi-family event playback, MW freeze repair, contour label control

| Field | Value |
|-------|-------|
| ID | LIB-053 |
| Status | complete |
| Created | 2026-08-19 |
| Approved | 2026-08-19 (human; this request) |
| Completed | 2026-08-19 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Make Data → Event playback a single forward-marching chronological sequence over any combination of solar eclipses, lunar eclipses, and Milky Way viewing windows. Repair Milky Way Start freeze by replacing full-range enumeration with incremental next/previous discovery. Add an independent Layers toggle for Galactic-center contour numeric labels.

## Scope

**In scope**

- Remove Event family submode; enable Solar / Lunar / MW as a set.
- Shared date range, loop, lead-in, post-wait; merged next/previous/autoplay.
- Incremental MW (and merged) next-event search so Start does not freeze.
- LIB-052 config migration; factory defaults for fresh config.
- `showVisibilityContourLabels` under Layers → Milky Way Visibility.
- Tests, docs, ADR for multi-source merge, visual verification.

**Out of scope**

- Second product clock; generic astronomical event engine.
- Eclipse or MW viewing-window astronomy changes.
- Tying map-label presentation to Data playback selection.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — one canonical UTC instant; Layers = what, Data = when.
- [ADR 0015](../decisions/0015-domain-tour-sequencer-drives-shared-demo-time.md) — sequencer commands Demo time.
- [ADR 0018](../decisions/0018-milky-way-viewing-window-is-a-reference-city-event.md) — MW windows remain reference-city events.
- [ADR 0019](../decisions/0019-domain-event-playback-belongs-to-data.md) — Data vs Layers ownership (single-family selection superseded).
- New ADR 0020 — enabled event sources merge into one chronological Demo-time stream.

## Acceptance criteria

See authorizing request completion criteria 1–46. In short: MW Start does not freeze; Event playback is a merged chronological stream; contour value labels are independently togglable; tsc/test/build green; AWAITING SCOPE.

## Verification plan

- Focused tests: freeze/incremental MW lookup, merged sequence, Previous/Next cross-family, loop, no-types, MW-levels-empty, reference-city, overlap monotonicity, contour labels, config migration
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
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- ADR 0019 status note + new ADR 0020

## Completion record

**Implementation summary**

Data → Event playback is one chronological Demo-time stream over any combination of solar eclipses, lunar eclipses, and Milky Way viewing windows. The Event family selector is gone. Start uses incremental next-event discovery (MW search in 30/90/365-day chunks) instead of enumerating through 2499. Shared range, loop, lead-in, and post-wait apply to all enabled types. Layers → Milky Way Visibility gains **Show contour values** (factory on); lines stay when labels are off. [ADR 0020](../decisions/0020-event-playback-merges-enabled-domain-sources.md); ADR 0019 Data vs Layers ownership retained.

**Commands run**

- Focused event-playback / contour / migration tests — passed during implementation
- `npx tsc --noEmit` — clean (`npm run build` runs `tsc && vite build`)
- `npm test` — 250 files / 2305 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-Ctb9mxSl.js` 1,527.97 kB). `visualScenarios` and `?scenario=` absent from `dist/`
- Cursor Browser: ordinary `http://localhost:1420/` Event playback Start/Pause/Next/Previous/Stop; `?scenario=milky-way` contour-value toggle

**Actual results**

MW Start with end 2499-12-31 remained responsive; first event `Milky Way · Strong` Aug 21 2026 Knoxville. Merged Mar–Sep 2026 walk: Total lunar Mar 3 → MW nights → Total solar Aug 12 (Event 147) → Previous to `Milky Way · Prime` Aug 12 (Event 146). Loop wrap observed (Sep MW Prime → Mar 3 lunar). Contour values off: same nested rings, no `30°`/`75°` numbers; `Knoxville · MW Prime · tomorrow` unchanged.

**Visual verification**

- Ordinary mode `http://localhost:1420/` and `?scenario=milky-way` (2026-08-19T06:00Z). Viewport: Cursor Browser pane (not guaranteed 1920×1080).
- Inspected: no Event family selector; Solar/Lunar/MW checkboxes factory on; Layers Eclipse presentation only; contour labels on then off.
- Interaction: Start on default 2499 end; Pause immediately; Next/Previous cross families; Show contour values off.

**Not verified**

- In-browser Reset to current-event lead-in, Return-to-present while playback is running, and reference-city change while MW is enabled (covered by sequencer/fingerprint tests, not this Browser session).
- Waiting through an automatic post-wait jump without using Next (Next/loop wrap were exercised instead).
- Exact 1920×1080 canonical viewport.

**Discovered, not done**

- Eclipse subtype filters remain presentation-coupled (LIB-047); Data owns Solar/Lunar type toggles only.
- Optional overlap status such as “Also active: …” was not added.
- Full matching counts remain omitted by design when MW is enabled.
