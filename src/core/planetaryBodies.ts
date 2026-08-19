/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

/**
 * Supported planetary space-object bodies (Mercury–Neptune plus Pluto).
 * Earth is the map, not a rendered target.
 */

export const PLANETARY_BODY_IDS = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

export type PlanetaryBodyId = (typeof PLANETARY_BODY_IDS)[number];

/**
 * Approximate sidereal periods in Julian years, used only to derive mean synodic
 * periods versus Earth. Not osculating orbital elements.
 */
const SIDEREAL_PERIOD_JULIAN_YEARS: Record<PlanetaryBodyId, number> = {
  mercury: 0.2408467,
  venus: 0.61519726,
  mars: 1.8808476,
  jupiter: 11.862615,
  saturn: 29.447498,
  uranus: 84.016846,
  neptune: 164.79132,
  pluto: 247.92065,
};

const EARTH_SIDEREAL_PERIOD_JULIAN_YEARS = 1.0000174;
const DAYS_PER_JULIAN_YEAR = 365.256363;

function meanSynodicPeriodDays(siderealYears: number): number {
  const earth = 1 / EARTH_SIDEREAL_PERIOD_JULIAN_YEARS;
  const body = 1 / siderealYears;
  return DAYS_PER_JULIAN_YEAR / Math.abs(earth - body);
}

export type PlanetaryBodyMetadata = {
  readonly id: PlanetaryBodyId;
  readonly displayName: string;
  /** Traditional astronomical symbol (documentation / accessible text). Glyphs are vector paths. */
  readonly astronomicalSymbol: string;
  readonly defaultColor: string;
  /** astronomy-engine `Body` enum value. */
  readonly ephemerisId: string;
  readonly siderealPeriodJulianYears: number;
  /** Mean synodic period versus Earth, days. Outer planets sit near ~1 year. */
  readonly meanSynodicPeriodDays: number;
};

export const PLANETARY_BODY_METADATA: Record<PlanetaryBodyId, PlanetaryBodyMetadata> = {
  mercury: {
    id: "mercury",
    displayName: "Mercury",
    astronomicalSymbol: "☿",
    defaultColor: "#9aa0a6",
    ephemerisId: "Mercury",
    siderealPeriodJulianYears: SIDEREAL_PERIOD_JULIAN_YEARS.mercury,
    meanSynodicPeriodDays: meanSynodicPeriodDays(SIDEREAL_PERIOD_JULIAN_YEARS.mercury),
  },
  venus: {
    id: "venus",
    displayName: "Venus",
    astronomicalSymbol: "♀",
    defaultColor: "#e6d5a8",
    ephemerisId: "Venus",
    siderealPeriodJulianYears: SIDEREAL_PERIOD_JULIAN_YEARS.venus,
    meanSynodicPeriodDays: meanSynodicPeriodDays(SIDEREAL_PERIOD_JULIAN_YEARS.venus),
  },
  mars: {
    id: "mars",
    displayName: "Mars",
    astronomicalSymbol: "♂",
    defaultColor: "#c45c4a",
    ephemerisId: "Mars",
    siderealPeriodJulianYears: SIDEREAL_PERIOD_JULIAN_YEARS.mars,
    meanSynodicPeriodDays: meanSynodicPeriodDays(SIDEREAL_PERIOD_JULIAN_YEARS.mars),
  },
  jupiter: {
    id: "jupiter",
    displayName: "Jupiter",
    astronomicalSymbol: "♃",
    defaultColor: "#c4a574",
    ephemerisId: "Jupiter",
    siderealPeriodJulianYears: SIDEREAL_PERIOD_JULIAN_YEARS.jupiter,
    meanSynodicPeriodDays: meanSynodicPeriodDays(SIDEREAL_PERIOD_JULIAN_YEARS.jupiter),
  },
  saturn: {
    id: "saturn",
    displayName: "Saturn",
    astronomicalSymbol: "♄",
    defaultColor: "#d4c46a",
    ephemerisId: "Saturn",
    siderealPeriodJulianYears: SIDEREAL_PERIOD_JULIAN_YEARS.saturn,
    meanSynodicPeriodDays: meanSynodicPeriodDays(SIDEREAL_PERIOD_JULIAN_YEARS.saturn),
  },
  uranus: {
    id: "uranus",
    displayName: "Uranus",
    astronomicalSymbol: "♅",
    defaultColor: "#7ec8c8",
    ephemerisId: "Uranus",
    siderealPeriodJulianYears: SIDEREAL_PERIOD_JULIAN_YEARS.uranus,
    meanSynodicPeriodDays: meanSynodicPeriodDays(SIDEREAL_PERIOD_JULIAN_YEARS.uranus),
  },
  neptune: {
    id: "neptune",
    displayName: "Neptune",
    astronomicalSymbol: "♆",
    defaultColor: "#3d6db5",
    ephemerisId: "Neptune",
    siderealPeriodJulianYears: SIDEREAL_PERIOD_JULIAN_YEARS.neptune,
    meanSynodicPeriodDays: meanSynodicPeriodDays(SIDEREAL_PERIOD_JULIAN_YEARS.neptune),
  },
  pluto: {
    id: "pluto",
    displayName: "Pluto",
    astronomicalSymbol: "♇",
    defaultColor: "#8a6e9e",
    ephemerisId: "Pluto",
    siderealPeriodJulianYears: SIDEREAL_PERIOD_JULIAN_YEARS.pluto,
    meanSynodicPeriodDays: meanSynodicPeriodDays(SIDEREAL_PERIOD_JULIAN_YEARS.pluto),
  },
};

export function isPlanetaryBodyId(raw: unknown): raw is PlanetaryBodyId {
  return typeof raw === "string" && (PLANETARY_BODY_IDS as readonly string[]).includes(raw);
}

export function planetaryBodyMetadata(id: PlanetaryBodyId): PlanetaryBodyMetadata {
  return PLANETARY_BODY_METADATA[id];
}
