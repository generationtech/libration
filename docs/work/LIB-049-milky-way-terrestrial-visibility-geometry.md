# LIB-049 — Milky Way terrestrial visibility geometry

| Field | Value |
|-------|-------|
| ID | LIB-049 |
| Status | complete |
| Created | 2026-08-19 |
| Approved | 2026-08-19 (human; this request) |
| Completed | 2026-08-19 |

Human-authorized item. Authorized to create, approve, activate, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037.

## Objective

Extend Layers → Space objects with a deterministic geometric Milky Way presentation: IAU Galactic-plane and approximate-band zenith projections at `TimeContext.now`, plus Galactic center/anticenter subpoints and optional night-side emphasis. Not a star field, photographic texture, or world-map shading layer.

## Scope

**In scope**

- Offline IAU Galactic → equatorial → terrestrial zenith-projection geometry.
- Galactic plane, approximate band edges, sparse width/orientation ribs, Galactic center, optional anticenter.
- Conservative Space objects configuration under Layers; one Milky Way layer master (factory off).
- Night-side emphasis by alpha/weight using the existing solar subsolar/terminator authority.
- Honest zenith-projection vs above-horizon-visibility copy. No horizon-envelope if semantically ambiguous.
- Focused tests, visual verification, docs, ADR for the Galactic coordinate authority.

**Out of scope**

- Individual stars, constellations, photographic Milky Way imagery, star catalogs.
- Light-pollution, weather, moonlight, or observing-quality forecasts.
- A second illumination raster or generic celestial-sphere UI.
- A “Milky Way subpoint” as if the band were a point object.
- Config tab reorganization (Space objects naming strain is a discovery only).
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one canonical UTC instant; no network in the render path.
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0016](../decisions/0016-offline-planetary-ephemeris-authority.md) (reuse EQD/GAST machinery; do not distort the planetary-object abstraction).
- Illumination remains ADR 0002. Night-side emphasis samples the existing subsolar authority; it does not add a shading raster.

## Design notes

- Extended celestial structure, not a planetary body. Separate derived overlay `milkyWay` (order 2.6, after clouds, before solar eclipse). Do not invent a “Milky Way subpoint.”
- Authority: astronomy-engine IAU 1958 GAL → EQJ (`Rotation_GAL_EQJ`), then `Rotation_EQJ_EQD`, then `lat = Dec`, `lon = wrap180(RA − GAST)`. Support span 1600–2500 (same as ADR 0016).
- Map artifact is a **zenith-projection ribbon** (plane `b = 0°`, band edges at constant `|b|`, ribs every 20° Galactic longitude). Not above-horizon visibility. Horizon envelope deferred as semantically ambiguous.
- Band half-widths: Narrow ±5°, Normal ±10°, Wide ±15°. Longitude-dependent photometric width not used.
- Night-side emphasis: alpha from existing subsolar geometric horizon (day 0.28 / night 0.78). Copy: “Emphasize portions currently over Earth's night side.” Not observing quality.
- Factory master OFF. When enabled: plane, band (Normal), ribs, Galactic center + label, night emphasis ON; anticenter OFF.
- Glyphs: 4-point star (center), quieter open diamond (anticenter). Label via eclipse candidate placement. Draw order: band edges → ribs → plane → glyphs → label.

## Acceptance criteria

- Layers → Space objects includes Milky Way after Planets, with the conservative controls listed in the authorizing request.
- Factory master off; when enabled: plane on, band on (Normal ±10°), ribs on, Galactic center + label on, anticenter off, night-side emphasis on.
- Geometry follows `TimeContext.now` at arbitrary Demo times, including 1600–2500 with equator-of-date precession/nutation.
- Artifact is a zenith-projection ribbon, not “visible from Earth here.” UI helper text states that distinction.
- Seam-safe plane, band edges, and ribs. No world-spanning false lines.
- Ordinary Sun/Moon/eclipse/ISS/planetary behaviour unchanged when Milky Way is off.
- Focused tests, `npx tsc --noEmit`, `npm test`, and `npm run build` pass.
- Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: Galactic → EQJ/EQD; terrestrial zenith wrap; plane/band/ribs; night-side split; config normalization; unsupported dates; RenderPlan seam
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — new layer / DEV scenario; confirm scenario registry absent from production bundle
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- ADR: expected for the Galactic coordinate / zenith-projection authority

## Completion record

**Implementation summary**

Offline IAU 1958 Galactic zenith ribbon (ADR 0017) as Layers → Space objects → Milky Way after Planets. Core: GAL→EQJ→EQD→GAST wrap; plane / ±band edges / 20° ribs / Galactic center (`l=0°, b=0°`) / optional anticenter (`l=180°, b=0°`). Cached EQJ samples; per-date EQD rebuild; per-call GAST shift + subsolar night tagging. RenderPlan line geometry only (no fill, no star field). Factory master off. DEV `?scenario=milky-way` at 2026-08-19T06:00:00.000Z, absent from production `dist/`.

**Commands run**

- `npx tsc --noEmit` — clean
- focused Galactic/geometry/presentation/layer/plan tests, then `npm test` — 241 files / 2216 passed / 0 failed
- `npm run build` — succeeded; `milky-way` / `visualScenarios` absent from `dist/`
- Cursor Browser `http://localhost:1420/?scenario=milky-way` then `?scenario=solar-eclipse-total` with Milky Way enabled (viewport ~703×769 CSS, dpr ~1.30; not 1920×1080)

**Actual results**

EQJ Galactic center vs published J2000 266.405°, −28.936° and NGP 192.859°, +27.128° agree to 1 decimal degree. Anticenter opposite the center (dot product −1). 1600 vs 2499 equator-of-date RA shift >8° and <20°. Six-hour Earth rotation moves the zenith subpoint ~90° west. Cold geometry ~8.2 ms; cached per-call ~0.20 ms; next-day rebuild ~0.38 ms; combined 4-planet 1y loci + Milky Way ~55 ms (this machine). Unsupported outside 1600–2500.

**Visual verification**

`http://localhost:1420/?scenario=milky-way` at 2026-08-19T06:00:00.000Z. Banner and HUD 2:00 AM. Ribbon is line geometry (plane + Normal band + ribs), not shading; night-side stronger alpha, day-side fainter; Galactic center 4-point star + offset “Galactic center” label in the South Pacific; anticenter off by default. Config → Layers → Space objects lists ISS, Planets, then Milky Way with the zenith vs visibility helper and night-emphasis copy. Plane-only (band off) removed edges/ribs (pixel diff vs default). Master off removed the ribbon. Anticenter on added a small unlabeled diamond (~28 px). Night emphasis off equalized day/night stroke alpha (~11k px). Wide ±15° plus Planets master on: ribbon stayed under planetary/Sun glyphs. Demo start +6 h (HUD 8:00 AM): terminator, Sun, and ribbon rotated (~58% map pixels changed); no world-spanning false line. Accelerated Demo at 21600× then pause (HUD 24 Aug 2026 7:06 AM): ribbon still coherent; a partial lunar eclipse placard coexisted. `?scenario=solar-eclipse-total` with Milky Way on: 2024-04-08 totality path remained the event overlay; the ribbon did not become a shading raster.

**Not verified**

Canonical 1920×1080 CSS viewport. Isolated Narrow-only still (Narrow is wired and tested; live stills used Normal, plane-only, and Wide). Dedicated 1600 / 2000 / ~2500 map screenshots (precession covered by unit tests). Dateline wrap-cut jitter under continuous accelerated playback (paused +6 h and multi-day jump were clean; no world-spanning false lines observed).

**Discovered, not done**

Horizon envelope / Galactic-center altitude thresholds. Observing-quality forecast (darkness, Moon, clouds, light pollution). Longitude-dependent band width. Rename “Space objects” → “Space & sky”. Stars, constellations, photographic Milky Way.
