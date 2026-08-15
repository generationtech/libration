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
 * Besselian fundamental-plane coordinates → geographic lat/lon.
 * Chauvenet (1891) / Explanatory Supplement (1974) ellipsoidal reduction on the
 * IAU 1976 figure used by the NASA Five Millennium Canon.
 *
 * μ is the ephemeris Greenwich hour angle. Geographic east longitude adds the
 * sidereal rotation corresponding to catalog ΔT so the result is on the UT meridian.
 */

import {
  EARTH_SIDEREAL_DEG_PER_SECOND,
  IAU1976_EARTH_ECCENTRICITY_SQ,
  IAU1976_EARTH_EQUATORIAL_RADIUS_KM,
  IAU1976_POLAR_OVER_EQUATORIAL,
} from "./earthFigure";
import type { EvaluatedBesselianElements } from "./besselianElements";

export type GeographicPoint = {
  readonly latDeg: number;
  readonly lonDeg: number;
};

export type ShadowAxisIntersection = GeographicPoint & {
  readonly zeta: number;
  readonly rho: number;
  readonly onEarth: boolean;
};

const DEG = Math.PI / 180;
const B = IAU1976_POLAR_OVER_EQUATORIAL;
const E2 = IAU1976_EARTH_ECCENTRICITY_SQ;

export function wrapLongitudeDeg(lonDeg: number): number {
  let x = lonDeg;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

export function haversineKm(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number,
): number {
  const r = 6371;
  const p1 = lat1Deg * DEG;
  const p2 = lat2Deg * DEG;
  const dphi = p2 - p1;
  const dl = (lon2Deg - lon1Deg) * DEG;
  const h =
    Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

function geographicFromXiEta(
  xi: number,
  eta: number,
  dDeg: number,
  muDeg: number,
  deltaTSeconds: number,
  allowLimb: boolean,
): ShadowAxisIntersection | null {
  const d = dDeg * DEG;
  const sind = Math.sin(d);
  const cosd = Math.cos(d);
  let x = xi;
  let y = eta;
  let r2 = x * x + y * y;
  let rho = 1;
  let zeta: number;
  if (r2 > 1) {
    if (!allowLimb) {
      return null;
    }
    const s = 1 / Math.sqrt(r2);
    x *= s;
    y *= s;
    r2 = 1;
    zeta = 0;
  } else {
    zeta = Math.sqrt(Math.max(0, 1 - r2));
  }
  let phi = 0;
  for (let i = 0; i < 12; i += 1) {
    const sinPhi1 = Math.max(-1, Math.min(1, (y * cosd + zeta * sind) / rho));
    const phi1 = Math.asin(sinPhi1);
    phi =
      Math.abs(phi1) < Math.PI / 2 - 1e-12
        ? Math.atan(Math.tan(phi1) / (B * B))
        : Math.sign(phi1) * (Math.PI / 2);
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const C = 1 / Math.sqrt(1 - E2 * sinPhi * sinPhi);
    const S = B * B * C;
    rho = Math.hypot(S * sinPhi, C * cosPhi);
    const z2 = rho * rho - (x * x + y * y);
    if (z2 < 0) {
      if (!allowLimb) {
        return null;
      }
      zeta = 0;
      break;
    }
    zeta = Math.sqrt(z2);
  }
  const cosH = zeta * cosd - y * sind;
  const lamEph = Math.atan2(x, cosH) / DEG - muDeg;
  const lonDeg = wrapLongitudeDeg(lamEph + EARTH_SIDEREAL_DEG_PER_SECOND * deltaTSeconds);
  return {
    latDeg: phi / DEG,
    lonDeg,
    zeta,
    rho,
    onEarth: r2 <= 1 + 1e-12 && zeta >= -1e-9,
  };
}

export function shadowAxisIntersection(
  el: EvaluatedBesselianElements,
  options?: { allowLimb?: boolean },
): ShadowAxisIntersection | null {
  return geographicFromXiEta(el.x, el.y, el.dDeg, el.muDeg, el.deltaTSeconds, options?.allowLimb === true);
}

export function umbralRadiusInObserverPlane(el: EvaluatedBesselianElements, zeta: number): number {
  return el.l2 - zeta * el.tanF2;
}

export function penumbralRadiusInObserverPlane(el: EvaluatedBesselianElements, zeta: number): number {
  return el.l1 - zeta * el.tanF1;
}

/**
 * Path width (km) from umbral/antumbral radius and solar altitude (sin alt ≈ ζ/ρ).
 */
export function centralPathWidthKm(el: EvaluatedBesselianElements, zeta: number, rho: number): number {
  const l2p = umbralRadiusInObserverPlane(el, zeta);
  const sinAlt = rho > 0 ? zeta / rho : 0;
  if (!(sinAlt > 1e-6)) {
    return Number.NaN;
  }
  return (2 * Math.abs(l2p) * IAU1976_EARTH_EQUATORIAL_RADIUS_KM) / sinAlt;
}

function outlinePoint(
  el: EvaluatedBesselianElements,
  qRad: number,
  cone: "umbra" | "penumbra",
): GeographicPoint | null {
  const sinQ = Math.sin(qRad);
  const cosQ = Math.cos(qRad);
  const tanF = cone === "umbra" ? el.tanF2 : el.tanF1;
  const l0 = cone === "umbra" ? el.l2 : el.l1;
  let L = l0;
  let last: GeographicPoint | null = null;
  for (let i = 0; i < 7; i += 1) {
    const xi = el.x - L * sinQ;
    const eta = el.y - L * cosQ;
    const geo = geographicFromXiEta(xi, eta, el.dDeg, el.muDeg, el.deltaTSeconds, false);
    if (!geo) {
      return last;
    }
    last = { latDeg: geo.latDeg, lonDeg: geo.lonDeg };
    L = l0 - geo.zeta * tanF;
  }
  return last;
}

/**
 * Closed geographic outline of the umbral/antumbral or penumbral cone on Earth.
 * Off-Earth position angles are dropped; a fully on-Earth shadow yields one ring.
 */
export function shadowOutlineRing(
  el: EvaluatedBesselianElements,
  cone: "umbra" | "penumbra",
  stepDeg = 4,
): GeographicPoint[] {
  const pts: GeographicPoint[] = [];
  for (let q = 0; q < 360 - 1e-9; q += stepDeg) {
    const p = outlinePoint(el, q * DEG, cone);
    if (p) {
      pts.push(p);
    }
  }
  if (pts.length >= 3) {
    const first = pts[0]!;
    pts.push({ latDeg: first.latDeg, lonDeg: first.lonDeg });
  }
  return pts.length >= 4 ? pts : [];
}

export function isCentralShadowOnEarth(el: EvaluatedBesselianElements): boolean {
  return el.x * el.x + el.y * el.y <= 1;
}

export function penumbraIntersectsEarth(el: EvaluatedBesselianElements): boolean {
  return Math.hypot(el.x, el.y) <= 1 + el.l1 + 1e-6;
}
