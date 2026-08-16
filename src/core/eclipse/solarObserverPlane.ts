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
 * Instantaneous Besselian observer-plane geometry shared by E4 local
 * circumstances and the active solar-eclipse obscuration field.
 *
 * Magnitude and obscuration use the same Chauvenet / Espenak–Meeus identities
 * as {@link solveSolarLocalCircumstances}:
 *   Rs = (L1'+L2')/2, Rm = (L1'−L2')/2, separation m
 *   magnitude = (L1' − m) / (L1' + L2')
 *   obscuration = disk-intersection area fraction of the apparent Sun
 */

import type { EvaluatedBesselianElements } from "./besselianElements";
import { diskIntersectionFractionOfFirst } from "./circleOverlap";
import {
  EARTH_SIDEREAL_DEG_PER_SECOND,
  IAU1976_EARTH_ECCENTRICITY_SQ,
  IAU1976_POLAR_OVER_EQUATORIAL,
} from "./earthFigure";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const B2 = IAU1976_POLAR_OVER_EQUATORIAL * IAU1976_POLAR_OVER_EQUATORIAL;
const E2 = IAU1976_EARTH_ECCENTRICITY_SQ;

export const SOLAR_OBSERVER_CONE_RADIUS_MIN = 1e-8;

export type SolarObserverFixed = {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly rhoSinPhi1: number;
  readonly rhoCosPhi1: number;
  readonly rho: number;
  readonly sinPhi: number;
  readonly cosPhi: number;
};

export type SolarObserverPlaneInstant = {
  readonly m: number;
  readonly l1p: number;
  readonly l2p: number;
  readonly altitudeDeg: number;
  readonly zeta: number;
  readonly insideWindow: boolean;
};

export function solarObserverFixed(latitudeDeg: number, longitudeDeg: number): SolarObserverFixed {
  const phi = latitudeDeg * DEG;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const c = 1 / Math.sqrt(1 - E2 * sinPhi * sinPhi);
  const s = B2 * c;
  const rhoSinPhi1 = s * sinPhi;
  const rhoCosPhi1 = c * cosPhi;
  const rho = Math.hypot(rhoSinPhi1, rhoCosPhi1);
  return {
    latitudeDeg,
    longitudeDeg,
    rhoSinPhi1,
    rhoCosPhi1,
    rho,
    sinPhi,
    cosPhi,
  };
}

export function solarObserverPlaneInstant(
  el: EvaluatedBesselianElements,
  obs: SolarObserverFixed,
): SolarObserverPlaneInstant {
  const d = el.dDeg * DEG;
  const sind = Math.sin(d);
  const cosd = Math.cos(d);
  const hDeg =
    el.muDeg + obs.longitudeDeg - EARTH_SIDEREAL_DEG_PER_SECOND * el.deltaTSeconds;
  const h = hDeg * DEG;
  const sinh = Math.sin(h);
  const cosh = Math.cos(h);
  const xi = obs.rhoCosPhi1 * sinh;
  const eta = obs.rhoSinPhi1 * cosd - obs.rhoCosPhi1 * sind * cosh;
  const zeta = obs.rhoSinPhi1 * sind + obs.rhoCosPhi1 * cosd * cosh;
  const u = el.x - xi;
  const v = el.y - eta;
  const m = Math.hypot(u, v);
  const l1p = el.l1 - zeta * el.tanF1;
  const l2p = el.l2 - zeta * el.tanF2;
  const sinAlt = obs.rho > 0 ? zeta / obs.rho : 0;
  const altitudeDeg = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;
  return {
    m,
    l1p,
    l2p,
    altitudeDeg,
    zeta,
    insideWindow: el.insideElementWindow,
  };
}

export function solarEclipseMagnitudeFromPlane(
  l1p: number,
  l2p: number,
  m: number,
): number | null {
  const den = l1p + l2p;
  if (!(Math.abs(den) > 1e-12)) {
    return null;
  }
  return (l1p - m) / den;
}

/**
 * Apparent-Sun area fraction covered by the Moon. Returns 0 when the geometry
 * is invalid or the disks do not overlap.
 */
export function solarEclipseObscurationFromPlane(l1p: number, l2p: number, m: number): number {
  const rs = (l1p + l2p) / 2;
  const rm = (l1p - l2p) / 2;
  if (!(rs > 0) || !(rm >= 0) || !Number.isFinite(m) || m < 0) {
    return 0;
  }
  return diskIntersectionFractionOfFirst(rs, rm, m);
}

export function solarObserverSunAboveHorizon(altitudeDeg: number): boolean {
  return altitudeDeg >= 0;
}
