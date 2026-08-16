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
 * Geometric Moon-above-horizon region on a spherical Earth (no refraction,
 * no flattening, no parallax). The boundary is the great circle of lunar
 * altitude = 0 around the current sublunar point.
 *
 * Reuses the same unit-sphere dot product as illumination `lunarDot`.
 * Not a solar-style path and not moonlight intensity.
 */

export type GeographicPoint = {
  readonly latDeg: number;
  readonly lonDeg: number;
};

const DEG = Math.PI / 180;
const HORIZON_SAMPLES = 180;
const EQUATORIAL_LAT_EPS_DEG = 0.25;

function wrapLonDeg(lonDeg: number): number {
  let x = lonDeg;
  while (x <= -180) x += 360;
  while (x > 180) x -= 360;
  return x;
}

/**
 * Cosine of the zenith angle to the Moon at a geographic point — identical
 * spherical incidence to illumination `lunarDot`. Positive ⇒ Moon above the
 * geometric horizon.
 */
export function sphericalMoonAltitudeCosine(
  latDeg: number,
  lonDeg: number,
  moonLatDeg: number,
  moonLonDeg: number,
): number {
  const phi = latDeg * DEG;
  const lam = lonDeg * DEG;
  const phiM = moonLatDeg * DEG;
  const lamM = moonLonDeg * DEG;
  return Math.sin(phi) * Math.sin(phiM) + Math.cos(phi) * Math.cos(phiM) * Math.cos(lam - lamM);
}

export function isMoonGeometricallyAboveHorizon(
  latDeg: number,
  lonDeg: number,
  moonLatDeg: number,
  moonLonDeg: number,
): boolean {
  return sphericalMoonAltitudeCosine(latDeg, lonDeg, moonLatDeg, moonLonDeg) >= 0;
}

/** Geometric center altitude in degrees. No refraction. */
export function geometricMoonAltitudeDeg(
  latDeg: number,
  lonDeg: number,
  moonLatDeg: number,
  moonLonDeg: number,
): number {
  const c = sphericalMoonAltitudeCosine(latDeg, lonDeg, moonLatDeg, moonLonDeg);
  return (Math.asin(Math.max(-1, Math.min(1, c))) / Math.PI) * 180;
}

/**
 * Initial great-circle bearing from the observer toward the sublunar point,
 * degrees clockwise from north (0…360). Geometric; no refraction.
 */
export function geometricMoonAzimuthDeg(
  latDeg: number,
  lonDeg: number,
  moonLatDeg: number,
  moonLonDeg: number,
): number {
  const phi = latDeg * DEG;
  const phiM = moonLatDeg * DEG;
  const dLam = (moonLonDeg - lonDeg) * DEG;
  const y = Math.sin(dLam) * Math.cos(phiM);
  const x = Math.cos(phi) * Math.sin(phiM) - Math.sin(phi) * Math.cos(phiM) * Math.cos(dLam);
  const az = (Math.atan2(y, x) / Math.PI) * 180;
  return ((az % 360) + 360) % 360;
}

function horizonLatitudeDeg(subLatDeg: number, deltaLonDeg: number): number {
  const phiM = subLatDeg * DEG;
  const dLam = deltaLonDeg * DEG;
  return (Math.atan((-Math.cos(phiM) / Math.sin(phiM)) * Math.cos(dLam)) / Math.PI) * 180;
}

const STRIP_LON_STEPS = 12;

function longitudeStripRing(subLonDeg: number): GeographicPoint[] {
  const west = subLonDeg - 90;
  const north: GeographicPoint[] = [];
  const south: GeographicPoint[] = [];
  for (let i = 0; i <= STRIP_LON_STEPS; i += 1) {
    const lon = west + (180 * i) / STRIP_LON_STEPS;
    north.push({ latDeg: 90, lonDeg: lon });
    south.push({ latDeg: -90, lonDeg: lon });
  }
  return [...north, ...south.reverse(), north[0]!];
}

function meridianPolyline(lonDeg: number): GeographicPoint[] {
  const pts: GeographicPoint[] = [];
  for (let i = 0; i <= 18; i += 1) {
    pts.push({ latDeg: 90 - (180 * i) / 18, lonDeg });
  }
  return pts;
}

/**
 * Closed lat/lon ring of the Moon-up hemisphere, suitable for generic
 * equirect region fill. Polar closing is hinted by {@link lunarVisibilityPolarCloseLatDeg}.
 */
export function lunarVisibilityRegionRing(
  moonLatDeg: number,
  moonLonDeg: number,
): GeographicPoint[] {
  if (!Number.isFinite(moonLatDeg) || !Number.isFinite(moonLonDeg)) {
    return [];
  }
  if (Math.abs(moonLatDeg) < EQUATORIAL_LAT_EPS_DEG) {
    return longitudeStripRing(moonLonDeg);
  }
  const ring: GeographicPoint[] = [];
  for (let i = 0; i < HORIZON_SAMPLES; i += 1) {
    const deltaLon = -180 + (360 * i) / HORIZON_SAMPLES;
    ring.push({
      latDeg: horizonLatitudeDeg(moonLatDeg, deltaLon),
      lonDeg: moonLonDeg + deltaLon,
    });
  }
  ring.push(ring[0]!);
  return ring;
}

/**
 * Horizon contour polylines (no polar-cap fill edges). Near the equator the
 * geometric horizon is two meridians; otherwise it is the great-circle ring.
 */
export function lunarHorizonBoundaryPolylines(
  moonLatDeg: number,
  moonLonDeg: number,
): GeographicPoint[][] {
  if (!Number.isFinite(moonLatDeg) || !Number.isFinite(moonLonDeg)) {
    return [];
  }
  if (Math.abs(moonLatDeg) < EQUATORIAL_LAT_EPS_DEG) {
    return [meridianPolyline(moonLonDeg - 90), meridianPolyline(moonLonDeg + 90)];
  }
  return [lunarVisibilityRegionRing(moonLatDeg, moonLonDeg)];
}

/**
 * Flattened horizon samples for geometric tests. Prefer
 * {@link lunarHorizonBoundaryPolylines} for rendering.
 */
export function lunarHorizonBoundary(
  moonLatDeg: number,
  moonLonDeg: number,
): GeographicPoint[] {
  return lunarHorizonBoundaryPolylines(moonLatDeg, moonLonDeg).flat();
}

export function lunarVisibilityPolarCloseLatDeg(moonLatDeg: number): number | undefined {
  if (Math.abs(moonLatDeg) < EQUATORIAL_LAT_EPS_DEG) {
    return undefined;
  }
  return moonLatDeg >= 0 ? 90 : -90;
}

export function wrapLongitudeDeg(lonDeg: number): number {
  return wrapLonDeg(lonDeg);
}
