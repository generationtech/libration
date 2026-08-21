# 0021 — One primary Milky Way viewing event, peak-UTC footprint, and HUD notice arbitration

- **Status:** Accepted
- **Date:** 2026-08-20 (record written with [LIB-057](../work/LIB-057-milky-way-viewing-event-simplification-and-geography.md))

## Context

[ADR 0018](0018-milky-way-viewing-window-is-a-reference-city-event.md) defined a reference-city Milky Way Viewing Window and partitioned it into user-facing **Viewing / Strong / Prime** quality classes (`milky-way-viewing-v1`). [ADR 0020](0020-event-playback-merges-enabled-domain-sources.md) then exposed those classes as Data playback level filters.

Those three names were implementation partitions of one observing question: when is the bright Galactic-center Milky Way usefully placed from the reference city in astronomical darkness with low modeled moonlight? Exposing them as product states made the event model harder to use than solar or lunar eclipses.

Separately, lunar eclipses already have a static line-only visibility footprint. Milky Way events had no analogous “where else on Earth is comparable at this event’s best instant?” geography. The lower-left HUD could also receive solar, lunar, and Milky Way lines independently, so notices could collide.

## Decision

**There is one user-facing Milky Way event family: a Milky Way viewing window.**

Policy `milky-way-viewing-v2` is the former Prime core, not a composite score and not a lunar-phase shortcut:

| Gate | Threshold |
|------|-----------|
| Galactic-center altitude | ≥ 15° |
| Altitude quality | ≥ 0.90 of the local nightly maximum (`90° − \|lat − GC Dec\|`) |
| Sun | ≤ −18° (astronomical night) |
| Modeled local moonlight | `localMoonlightContribution01` ≤ 0.08 |

Moon below the horizon is moonlight 0 and therefore qualifies when the other gates pass. A thin crescent or new Moon qualifies through the same physical moonlight model. A bright Moon above the horizon can disqualify. Lunar-eclipse transmission still participates through that model. Clouds, weather, and light pollution are not inputs.

The reference city still owns event identity, start, end, peak (maximum GC altitude inside the interval), local status, and Data playback occurrence. Event ids are `milky-way:<city-id>:<startUtcMs>`. Changing city changes timing and therefore may change the footprint.

**The selected window’s peak UTC is the static geography instant.** At that UTC, every terrestrial location is included iff it satisfies the same v2 gates. The result is one or more closed boundary lines (no fill, no world shading, no illumination raster). Cache key is event id + policy version + peak UTC + geometry algorithm, not the current product-time bucket. Advance-notice and active presentation show that same geometry; after the event it disappears.

**Lower-left event notices are presentation arbitration only.** Domain authorities still own astronomy. Eligible solar, lunar, and Milky Way candidates are ranked (active before upcoming, then start time, then stable family rank, then id), bounded (two visible lines plus overflow copy), and independent of Data playback checkboxes. Eclipse HUD meaning is preserved; Milky Way copy is compact (`Milky Way viewing` / `Milky Way viewing · tonight`). Layers still own what is drawn; Data still owns when playback navigates ([ADR 0019](0019-domain-event-playback-belongs-to-data.md)).

This record supersedes ADR 0018 **only** for user-facing Viewing / Strong / Prime partitions and v1 policy tokens. Reference-city ownership, headless evaluation at product UTC, and exclusion of clouds/light pollution remain. It supersedes ADR 0020 **only** for MW playback level filters; merged incremental `findNext` / `findPrevious` is unchanged.

## Consequences

**Good.**

- One event reads like an eclipse opportunity: a bounded interval, a peak, a map label, a static footprint, and a HUD notice.
- Near-new-Moon and moon-down nights are favored without making phase the authority.
- Knoxville-like culmination (~25°) can still qualify via relative quality; high northern latitudes still have no GC windows.

**Costs.**

- v2 windows are shorter than v1 Viewing windows. That is intended.
- A peak-UTC footprint is not an event-whole union and is not a weather forecast.

**Explicitly not decided.** Observing-quality forecasts (clouds, light pollution), a whole-band (Cygnus/Cassiopeia) viewing event, clickable HUD overflow, or a second product clock.
