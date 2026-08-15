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
 * Apparent lunar-north orientation for a terrestrial observer.
 * Optical libration magnitudes stay in {@link opticalLunarLibration}; this module supplies the
 * rotation from the map/celestial-north frame into the observer's local-vertical frame.
 *
 * χ = C − q, with C the Meeus ch. 53 position angle of the lunar axis and q the parallactic angle
 * (Meeus ch. 14). Below-horizon geometry is still computed. Does not read the system clock.
 */

import { LUNAR_MEAN_EQUATOR_INCLINATION_DEG } from "./lunarOpticalLibration";
import {
  moonEclipticLatitudeDeg,
  moonEclipticLongitudeDeg,
  moonEquatorialRaDecGmst,
  moonMeanAscendingNodeLongitudeDeg,
} from "./sublunarPoint";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const NEAR_ZENITH_SIN_ALT = 0.9995;
const PARALLACTIC_SINGULAR_EPS = 1e-12;

export function wrapSigned180(deg: number): number {
  if (!Number.isFinite(deg)) {
    return 0;
  }
  let x = ((deg + 180) % 360) + 360;
  x = (x % 360) - 180;
  return x;
}

/**
 * Continuity helper: map a newly wrapped angle onto the previous unwrapped value
 * so +179° → −179° is a 2° step, not a 358° spin.
 */
export function unwrapAngleDeg(previous: number | undefined, current: number): number {
  const wrapped = wrapSigned180(current);
  if (previous === undefined || !Number.isFinite(previous)) {
    return wrapped;
  }
  const delta = wrapSigned180(wrapped - wrapSigned180(previous));
  const next = previous + delta;
  return Number.isFinite(next) ? next : wrapped;
}

/** Local hour angle of the Moon at observer longitude (east positive), degrees in (−180, 180]. */
export function moonLocalHourAngleDeg(utcMs: number, observerLonDeg: number): number {
  const eq = moonEquatorialRaDecGmst(utcMs);
  const lstDeg = eq.gmstDeg + observerLonDeg;
  return wrapSigned180(lstDeg - eq.raDeg);
}

/**
 * Parallactic angle q (Meeus 14.1): position angle of the zenith from celestial north, toward east.
 * Near zenith/nadir the formula is singular; returns 0 (finite) in that neighborhood.
 */
export function parallacticAngleDeg(options: {
  hourAngleDeg: number;
  observerLatDeg: number;
  declinationDeg: number;
}): number {
  const h = options.hourAngleDeg * D2R;
  const phi = options.observerLatDeg * D2R;
  const dec = options.declinationDeg * D2R;
  const sinAlt =
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h);
  if (Math.abs(sinAlt) > NEAR_ZENITH_SIN_ALT) {
    return 0;
  }
  const y = Math.sin(h);
  const x = Math.tan(phi) * Math.cos(dec) - Math.sin(dec) * Math.cos(h);
  if (!Number.isFinite(y) || !Number.isFinite(x) || Math.hypot(y, x) < PARALLACTIC_SINGULAR_EPS) {
    return 0;
  }
  const q = Math.atan2(y, x) * R2D;
  return Number.isFinite(q) ? q : 0;
}

/**
 * Position angle C of the lunar axis (Meeus 53), eastward from celestial north, degrees.
 */
export function lunarAxisPositionAngleDeg(utcMs: number): number {
  const lambdaDeg = moonEclipticLongitudeDeg(utcMs);
  const betaDeg = moonEclipticLatitudeDeg(utcMs);
  const omegaDeg = moonMeanAscendingNodeLongitudeDeg(utcMs);
  const I = LUNAR_MEAN_EQUATOR_INCLINATION_DEG * D2R;
  const W = (lambdaDeg - omegaDeg) * D2R;
  const beta = betaDeg * D2R;
  const y = Math.sin(I) * Math.sin(W);
  const x = Math.cos(I) * Math.cos(beta) - Math.sin(I) * Math.sin(beta) * Math.cos(W);
  if (!Number.isFinite(y) || !Number.isFinite(x) || Math.hypot(y, x) < PARALLACTIC_SINGULAR_EPS) {
    return 0;
  }
  const c = Math.atan2(y, x) * R2D;
  return Number.isFinite(c) ? c : 0;
}

/**
 * Apparent position angle of lunar north from the local vertical (zenith-up when facing the Moon).
 * χ = C − q. Positive χ rotates the LIB-010 map frame from north toward east (clockwise on the map glyph).
 */
export function apparentLunarNorthPositionAngleDeg(
  utcMs: number,
  observerLatDeg: number,
  observerLonDeg: number,
): number {
  if (
    !Number.isFinite(utcMs) ||
    !Number.isFinite(observerLatDeg) ||
    !Number.isFinite(observerLonDeg)
  ) {
    return 0;
  }
  const eq = moonEquatorialRaDecGmst(utcMs);
  const hourAngleDeg = wrapSigned180(eq.gmstDeg + observerLonDeg - eq.raDeg);
  const q = parallacticAngleDeg({
    hourAngleDeg,
    observerLatDeg,
    declinationDeg: eq.decDeg,
  });
  const c = lunarAxisPositionAngleDeg(utcMs);
  const chi = c - q;
  return Number.isFinite(chi) ? chi : 0;
}
