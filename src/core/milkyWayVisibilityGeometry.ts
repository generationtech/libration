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
 * Galactic-center altitude contours: small circles around the LIB-049 zenith
 * subpoint. A point on the 60° contour sees the Galactic center 60° above the
 * geometric horizon. Not brightness, transparency, or observing quality.
 */

import { lunarEclipseMoonlightTransmission } from "./eclipse/lunarEclipseMoonlightTransmission";
import type { LunarEclipseLiveGeometry } from "./eclipse/lunarEclipseTypes";
import {
  moonIncidenceStrength,
  moonPhaseStrengthFromIlluminatedFraction,
} from "./lunarIllumination";
import { approximateLunarPhase } from "./lunarPhase";
import type { MilkyWayGcAltitudeContourDeg } from "./milkyWayPresentation";
import { getMoonlightPolicy } from "./moonlightPolicy";
import { wrapSigned180, type PlanetarySubpointDeg } from "./planetarySubpoint";
import { ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG } from "./solarTwilight";
import { sublunarPoint } from "./sublunarPoint";
import { subsolarPoint } from "./subsolarPoint";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Azimuth step around each small circle (degrees). */
export const MILKY_WAY_VISIBILITY_CONTOUR_STEP_DEG = 2;

/** Line-alpha multiplier on the day side (Sun ≥ 0°). */
export const MILKY_WAY_VISIBILITY_DAY_NIGHT_FACTOR = 0.2;
/** Line-alpha multiplier at astronomical night (Sun ≤ −18°). */
export const MILKY_WAY_VISIBILITY_NIGHT_NIGHT_FACTOR = 1;

/**
 * Strong moonlight reduces contour alpha to this floor. Geometry never disappears.
 * Moon below the horizon keeps factor 1.
 */
export const MILKY_WAY_VISIBILITY_MOON_FACTOR_MIN = 0.55;

const NATURAL_MOONLIGHT = getMoonlightPolicy("natural");

export type MilkyWayVisibilitySample = PlanetarySubpointDeg & {
  readonly solarAltitudeDeg: number;
  readonly moonFactor: number;
};

export type MilkyWayAltitudeContour = {
  readonly altitudeDeg: MilkyWayGcAltitudeContourDeg;
  readonly points: readonly MilkyWayVisibilitySample[];
};

export type MilkyWayVisibilityGeometry = {
  readonly galacticCenter: PlanetarySubpointDeg;
  readonly contours: readonly MilkyWayAltitudeContour[];
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function toVec(latDeg: number, lonDeg: number): [number, number, number] {
  const φ = latDeg * DEG;
  const λ = lonDeg * DEG;
  const c = Math.cos(φ);
  return [c * Math.cos(λ), c * Math.sin(λ), Math.sin(φ)];
}

function fromVec(x: number, y: number, z: number): PlanetarySubpointDeg {
  const r = Math.hypot(x, y, z);
  if (!(r > 0) || !Number.isFinite(r)) {
    return { latDeg: 0, lonDeg: 0 };
  }
  const latDeg = Math.asin(Math.max(-1, Math.min(1, z / r))) * RAD;
  const lonDeg = wrapSigned180(Math.atan2(y, x) * RAD);
  return {
    latDeg: Math.max(-90, Math.min(90, latDeg)),
    lonDeg,
  };
}

function normalize(x: number, y: number, z: number): [number, number, number] {
  const n = Math.hypot(x, y, z);
  if (!(n > 1e-12)) {
    return [1, 0, 0];
  }
  return [x / n, y / n, z / n];
}

/**
 * Angular separation on the unit sphere, degrees.
 */
export function angularDistanceDeg(
  a: PlanetarySubpointDeg,
  b: PlanetarySubpointDeg,
): number {
  const [ax, ay, az] = toVec(a.latDeg, a.lonDeg);
  const [bx, by, bz] = toVec(b.latDeg, b.lonDeg);
  return Math.acos(Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz))) * RAD;
}

/**
 * Geometric altitude of a celestial direction whose terrestrial zenith subpoint
 * is `subpoint`. Identity: h = 90° − angularDistance(observer, subpoint).
 */
export function altitudeDegFromSubpoint(
  observer: PlanetarySubpointDeg,
  subpoint: PlanetarySubpointDeg,
): number {
  return 90 - angularDistanceDeg(observer, subpoint);
}

/**
 * Maximum altitude at culmination: h_max = 90° − |latitude − declination|.
 * For the Galactic center, declination-of-date equals the zenith-subpoint latitude.
 */
export function culminationAltitudeDeg(observerLatDeg: number, declinationDeg: number): number {
  return 90 - Math.abs(observerLatDeg - declinationDeg);
}

/**
 * Surface-normal · direction-to-body from two geographic points (sub-body identity).
 */
export function geographicDirectionDotProduct(
  latDeg: number,
  lonDeg: number,
  bodyLatDeg: number,
  bodyLonDeg: number,
): number {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const latB = bodyLatDeg * DEG;
  const lonB = bodyLonDeg * DEG;
  return (
    Math.cos(lat) * Math.cos(latB) * Math.cos(lon - lonB) + Math.sin(lat) * Math.sin(latB)
  );
}

export function solarAltitudeDegAt(
  latDeg: number,
  lonDeg: number,
  subsolar: PlanetarySubpointDeg,
): number {
  const dot = geographicDirectionDotProduct(latDeg, lonDeg, subsolar.latDeg, subsolar.lonDeg);
  return Math.asin(Math.max(-1, Math.min(1, dot))) * RAD;
}

/**
 * Night-emphasis multiplier from solar altitude.
 * Day (Sun ≥ 0°) → 0.20; astronomical night (Sun ≤ −18°) → 1.00;
 * twilight interpolates smoothly. −18° is full emphasis, not a hard seam.
 */
export function milkyWayVisibilityNightFactor(solarAltitudeDeg: number): number {
  const t = smoothstep(
    0,
    -ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG,
    solarAltitudeDeg,
  );
  return (
    MILKY_WAY_VISIBILITY_DAY_NIGHT_FACTOR +
    (MILKY_WAY_VISIBILITY_NIGHT_NIGHT_FACTOR - MILKY_WAY_VISIBILITY_DAY_NIGHT_FACTOR) * t
  );
}

/**
 * Local moonlight contribution in [0, 1] from the existing physical model:
 * phase strength × incidence strength × lunar-eclipse transmission.
 * Does not fold solar night eligibility (that is a separate contour factor).
 */
export function localMoonlightContribution01(
  surfaceMoonDot: number,
  lunarIlluminatedFraction: number,
  moonlightTransmission01: number,
): number {
  const phase = moonPhaseStrengthFromIlluminatedFraction(lunarIlluminatedFraction);
  const incidence = moonIncidenceStrength(Math.max(0, Math.min(1, surfaceMoonDot)), NATURAL_MOONLIGHT);
  return clamp01(phase * incidence * clamp01(moonlightTransmission01));
}

/**
 * Bounded contour alpha multiplier from local moonlight. Moon below the
 * geometric horizon → 1. Strong moonlight → {@link MILKY_WAY_VISIBILITY_MOON_FACTOR_MIN}.
 */
export function milkyWayVisibilityMoonFactor(localMoon01: number): number {
  return 1 - (1 - MILKY_WAY_VISIBILITY_MOON_FACTOR_MIN) * clamp01(localMoon01);
}

export type MilkyWayVisibilityMoonState = {
  readonly sublunar: PlanetarySubpointDeg;
  readonly lunarIlluminatedFraction: number;
  readonly moonlightTransmission01: number;
};

export function milkyWayVisibilityMoonStateAt(
  utcMs: number,
  lunarGeometry?: LunarEclipseLiveGeometry | null,
): MilkyWayVisibilityMoonState {
  return {
    sublunar: sublunarPoint(utcMs),
    lunarIlluminatedFraction: approximateLunarPhase(utcMs).illuminatedFraction,
    moonlightTransmission01: lunarEclipseMoonlightTransmission(lunarGeometry),
  };
}

function moonFactorAt(
  latDeg: number,
  lonDeg: number,
  moon: MilkyWayVisibilityMoonState | null,
): number {
  if (!moon) {
    return 1;
  }
  const dot = geographicDirectionDotProduct(latDeg, lonDeg, moon.sublunar.latDeg, moon.sublunar.lonDeg);
  const local = localMoonlightContribution01(
    dot,
    moon.lunarIlluminatedFraction,
    moon.moonlightTransmission01,
  );
  return milkyWayVisibilityMoonFactor(local);
}

/**
 * Sample a closed small circle of angular radius `radiusDeg` around `center`.
 * Cartesian construction stays finite at the poles.
 */
export function sampleSmallCircle(
  center: PlanetarySubpointDeg,
  radiusDeg: number,
  stepDeg: number = MILKY_WAY_VISIBILITY_CONTOUR_STEP_DEG,
): PlanetarySubpointDeg[] {
  const r = radiusDeg * DEG;
  const cosR = Math.cos(r);
  const sinR = Math.sin(r);
  const C = toVec(center.latDeg, center.lonDeg);
  let east = normalize(-C[1], C[0], 0);
  if (Math.hypot(east[0], east[1], east[2]) < 1e-8) {
    east = [1, 0, 0];
  }
  const north = normalize(
    C[1] * east[2] - C[2] * east[1],
    C[2] * east[0] - C[0] * east[2],
    C[0] * east[1] - C[1] * east[0],
  );
  const step = Math.max(0.5, stepDeg);
  const n = Math.max(8, Math.round(360 / step));
  const out: PlanetarySubpointDeg[] = [];
  for (let i = 0; i < n; i += 1) {
    const az = (i * 360) / n;
    const a = az * DEG;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    out.push(
      fromVec(
        C[0] * cosR + north[0] * sinR * ca + east[0] * sinR * sa,
        C[1] * cosR + north[1] * sinR * ca + east[1] * sinR * sa,
        C[2] * cosR + north[2] * sinR * ca + east[2] * sinR * sa,
      ),
    );
  }
  if (out[0]) {
    out.push({ ...out[0] });
  }
  return out;
}

function tagSample(
  point: PlanetarySubpointDeg,
  subsolar: PlanetarySubpointDeg,
  moon: MilkyWayVisibilityMoonState | null,
): MilkyWayVisibilitySample {
  return {
    latDeg: point.latDeg,
    lonDeg: point.lonDeg,
    solarAltitudeDeg: solarAltitudeDegAt(point.latDeg, point.lonDeg, subsolar),
    moonFactor: moonFactorAt(point.latDeg, point.lonDeg, moon),
  };
}

/**
 * Build altitude contours around the supplied Galactic-center subpoint.
 * Callers must pass the same subpoint used by the LIB-049 marker.
 */
export function sampleMilkyWayVisibilityContours(
  utcMs: number,
  galacticCenter: PlanetarySubpointDeg,
  altitudesDeg: readonly MilkyWayGcAltitudeContourDeg[],
  options: {
    tagSun?: boolean;
    tagMoon?: boolean;
    lunarGeometry?: LunarEclipseLiveGeometry | null;
  } = {},
): MilkyWayVisibilityGeometry {
  const tagSun = options.tagSun !== false;
  const tagMoon = options.tagMoon === true;
  const subsolar = tagSun ? subsolarPoint(utcMs) : { latDeg: 0, lonDeg: 0 };
  const moon = tagMoon ? milkyWayVisibilityMoonStateAt(utcMs, options.lunarGeometry) : null;
  const contours: MilkyWayAltitudeContour[] = [];
  for (const altitudeDeg of altitudesDeg) {
    const radiusDeg = 90 - altitudeDeg;
    const ring = sampleSmallCircle(galacticCenter, radiusDeg);
    contours.push({
      altitudeDeg,
      points: ring.map((p) => tagSample(p, subsolar, moon)),
    });
  }
  return { galacticCenter, contours };
}
