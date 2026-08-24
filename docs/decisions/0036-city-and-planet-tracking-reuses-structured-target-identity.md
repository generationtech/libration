# 0036 — City and planet tracking reuse structured target identity

- **Status:** Accepted
- **Date:** 2026-08-24
- **Work item:** [LIB-092](../work/LIB-092-city-and-planet-tracking-targets.md)

## Context

[ADR 0032](0032-anchored-frames-target-a-trackable-map-object.md)–[ADR 0035](0035-click-to-track-uses-scene-space-semantic-hit-targets.md) already define trackable identity, resolution, orthogonal Target+Mode, anchored frames, auto-cover, and scene-space click-to-track. LIB-091 ships only Moon, Sun, and ISS as string identities. City pins and planetary current glyphs already have stable ids and the same mapped lon/lat used to paint them. Flattening every city and planet into a closed string union would not scale. Native `<select>` values are strings and must not become production identity.

Wrong generalizations remain: city-specific or planet-specific frame or camera math; a second planetary ephemeris; inventing city/planet ids; treating earthquakes as trackable; inventing a single Milky Way point; a searchable custom dropdown.

## Decision

1. **`TrackableMapObjectId` is a hybrid.** Named production identities remain `"moon" | "sun" | "iss"`. Cities and planets are structured `{ kind: "city"; id }` and `{ kind: "planet"; id }`, reusing `CityPinEntry.id` and `PlanetaryBodyId`. Identity is independent of coordinates. Semantic equality is `trackableMapObjectIdEquals` (kind+id), not object-reference equality.

2. **Native-select option values are UI encoding only.** Chrome maps targets through `trackingTargetSelectValue` / `tryParseTrackingTargetSelectValue` (`city:` + `encodeURIComponent`, `planet:` + body id). Those strings are not consumed by frame math, resolution, or renderers.

3. **Availability is not `Record<TrackableMapObjectId, boolean>`.** Named targets stay boolean fields. Cities and planets are available only when present in the per-frame catalog sets derived from the same payloads used to paint. Missing/invalid selected city or planet falls back to Earth-fixed, keeps remembered mode, and reinitializes camera policy — the ISS policy.

4. **Cities are static; eligible planets are dynamic.** City resolution uses the pin’s existing lon/lat. Planet resolution uses the current mapped subpoint already on the planetary payload for that frame instant. No new geography or ephemeris path. After lon/lat is resolved, longitude-lock, position-lock, continuity, wrap, camera, and auto-cover do not branch on target category.

5. **Click-to-track reuses the LIB-091 scene-space hit seam.** Visible city pins and current-planet glyphs emit hit targets with the structured identity. Wrapped copies share one id. Overlap: nearest center, then a deterministic category+id tie key (moon, sun, iss, then planets, then cities). Earthquakes remain hover-only. Milky Way is not a target.

6. **Target chrome scales with native `<optgroup>`.** Earth-fixed stays ungrouped. Celestial (Moon, Sun, eligible planets), Spacecraft (ISS), and Cities. Existing display names. No custom picker.

## Consequences

**Good.**

- Cities and planets are integrations on the proven stack, not new frame or camera kinds.
- Structured identity stays equality-safe and UI-encodable without flattening every pin into a union.
- Paint, resolution, and hit testing share one catalog of coordinates.

**Costs.**

- Call sites that compared targets with `===` must use `trackableMapObjectIdEquals`.
- Combined UI kinds remain Moon/Sun/ISS-only compatibility aliases; they do not name cities or planets.

**Non-decisions.** Milky Way / Galactic Center / Anticenter tracking; earthquake tracking; searchable target UI; clustering/chooser for overlapping pins; persistence or URL tracking state; new lock modes.
