# LIB-048 — Planetary space objects, ground tracks, and loci

| Field | Value |
|-------|-------|
| ID | LIB-048 |
| Status | complete |
| Created | 2026-08-19 |
| Approved | 2026-08-19 (human; this request) |
| Completed | 2026-08-19 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Extend Layers → Space objects from the ISS to Mercury through Neptune plus Pluto: offline deterministic terrestrial sub-object points, optional continuous subplanet ground tracks, and independently enabled daily same-time planetary loci, driven by the existing product-time architecture.

## Scope

**In scope**

- Offline planetary apparent-position authority for Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto.
- Geographic sub-object points, short continuous ground tracks, and long daily same-time planetary loci.
- Conservative Space objects configuration: per-body enable/color/locus; shared glyph, track, and locus style.
- One Planets layer master; ISS presentation unchanged.
- Focused tests, visual verification, docs, ADR if a durable ephemeris authority is introduced.

**Out of scope**

- Earth as a rendered target.
- Other dwarf planets, moons, conjunction/event detection, local altitude/azimuth, planet-visible hemispheres.
- Runtime internet ephemeris.
- Generic celestial-object framework beyond a small reusable seam if the existing architecture requires it.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one canonical UTC instant; no network in the render path.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0008](../decisions/0008-bundled-nasa-solar-eclipse-authority.md) (eclipse authority remains independent).
- Sun/Moon visualization-grade models stay as they are. Planetary features use a documented planetary authority, not those series.

## Design notes

Recorded during implementation:

- Ephemeris authority, Pluto treatment, supported range, and accuracy: see ADR 0016 and the completion record.
- Locus window: centered on product-time UTC calendar date; sampled at the current UTC clock (hour through millisecond).
- Ground tracks and loci are distinct builders. Tracks are continuous hours/days; loci are daily same-time samples over years.
- Body master hides glyph, label, track, and locus; per-body locus preference is preserved.
- Factory: Planets master off; all bodies off; current subpoints/labels on; tracks and loci off.

## Acceptance criteria

- Mercury through Neptune plus Pluto can be shown as current terrestrial subpoints, optional ground tracks, and independently enabled planetary loci under Layers → Space objects.
- Earth is not a rendered target.
- Offline, deterministic, `TimeContext.now` only.
- Per-body locus toggles work; shared controls stay conservative.
- Unsupported ephemeris dates fail honestly.
- Ordinary Sun/Moon/eclipse/ISS behaviour unchanged.
- Focused tests, `npx tsc --noEmit`, `npm test`, and `npm run build` pass.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: ephemeris → RA/Dec; RA/Dec → subpoint; wrap; ground-track sampling; locus sampling; config normalization; per-body locus toggles; invalidation
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — new dependency / layer / DEV scenario; confirm scenario registry absent from production bundle
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- ADR: expected if a durable planetary ephemeris authority is introduced

## Completion record

**Implementation summary**

Offline planetary apparent positions from bundled `astronomy-engine` 2.1.19 (ADR 0016): truncated VSOP87 for Mercury–Neptune, library Pluto series, light-time + aberration, equator-of-date. Geographic subpoints reuse the Sun/Moon wrap (`lat = Dec`, `lon = wrap180(RA − GAST)`). One derived `planetaryObjects` layer under Layers → Space objects (Planets after ISS). Conservative shared controls; per-body enable/color/locus. Centered daily same-UTC-clock planetary loci (1/2/5/10 y + 1 synodic cycle). 15 min ground tracks, past stronger / future fainter alpha. Factory: Planets master off, all bodies off. Product span 1600–2500; outside that, hide and show Config status.

**Commands run**

- `npx tsc --noEmit` — clean
- focused planetary + wiring tests, then `npm test` — 236 files / 2185 passed / 0 failed
- `npm run build` — succeeded; `planetary-objects` / visual-scenario registry absent from `dist/`
- JPL Horizons geocentric airless apparent RA/Dec (QUANTITIES=2) at 2026-08-19 15:30 UTC vs engine gold
- Cursor Browser `?scenario=planetary-objects` (viewport ~703×769, not 1920×1080)

**Actual results**

Horizons vs engine at the pinned UTC: typically a few arcseconds (Neptune Dec ~15″ worst of the set); well inside the library’s ~1′ visualization-grade claim. Subpoints at that instant: Mercury 16.785°N 59.250°W; Venus 6.668°S 9.774°W; Mars 23.678°N 104.546°W; Jupiter 17.940°N 66.839°W; Saturn 3.224°N 173.648°E; Uranus 21.067°N 136.895°W; Neptune 0.282°N 163.682°E; Pluto 23.484°S 106.667°E. Cold costs (this machine): 8 current samples 1.7 ms; 1-day 15 min tracks all bodies ~50 ms; 1y loci all ~64 ms; 10y loci all ~552 ms; cached repeats are GAST-shift / bucket hits. astronomy-engine min.js 135 KB / ~49 KB gzip, eager in the production JS chunk.

**Visual verification**

`http://localhost:1420/?scenario=planetary-objects` at 2026-08-19T15:30:00.000Z. All eight bodies plus Pluto labeled at plausible subpoints; astronomical-symbol glyphs; ISS absent. 1-day tracks: westward terrestrial motion, future fainter, wrap without world-spanning false segments (1-day already ~two longitude circuits). Mercury 1y locus: multi-loop Atlantic figure. Venus/Mars: coherent loops. All-loci 10y: Mercury dense loops, Venus tight equatorial loops, outer planets slow nearly-horizontal bands; interactive after first fill; cluttered as expected for the stress case. Per-body Mercury/Venus/Mars locus toggles; Planets master OFF removed every planetary glyph/track/locus while Sun and Moon remained; restoring the master brought planets back. Space objects: ISS first, then Planets; helper “A planetary locus samples where each body is overhead at the same UTC each day.” Synodic-cycle option present in Locus duration.

**Not verified**

Canonical 1920×1080 CSS viewport (Cursor browser ~703×769). Accelerated Demo playback smoothness (scenario paused). 7-day ground-track visual (1-day already wraps twice; 7-day is supported and will be denser). Mars-color magenta and glyph Dot↔symbol on the live map (covered by tests + immediate Config wiring). 1950/2050/1500 on-map screenshots (ephemeris unit tests cover 1950/2050 and unsupported null). Per-duration 2y/5y inner-planet screenshots beyond 1y and the 10y stress.

**Discovered, not done**

Local altitude/azimuth, conjunction/event detection, planet-visible hemispheres, other dwarf planets, moons, spacecraft beyond the ISS. Lazy-splitting `astronomy-engine` from the main chunk. Per-body locus sampling cadence. Progressive locus age fading.
