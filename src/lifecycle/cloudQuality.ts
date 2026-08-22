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
 * Observational viewing quality is independent of coverage and cloud signal.
 *
 * coverageMask: the provider has a valid observation at this pixel.
 * qualityWeight: how geometrically desirable that observation is.
 * cloudSignal: derived IR highlight appearance.
 *
 * Quality never turns valid coverage into no-data. quality == 0 means
 * extreme viewing geometry, not missing data. A q=0 observation that is
 * the only coverage at a pixel still paints.
 *
 * Quality planes are Earth-fixed for a given provider SSP and grid.
 * Cache them; do not recompute inside rAF.
 */

import {
  latitudeDegFromMapY,
  longitudeDegFromMapX,
} from "../core/equirectangularProjection";
import {
  CLOUDS_SECTOR_SPECS,
  type CloudsSectorId,
} from "./cloudsSectors";

/** WGS84 equatorial radius used by the WEATHER-4.2 spherical GEO model. */
export const CLOUDS_GEO_EARTH_RADIUS_KM = 6378.137;
/** Geostationary orbital height above the equator. */
export const CLOUDS_GEO_ORBIT_HEIGHT_KM = 35786;
/** (R + h) / R */
export const CLOUDS_GEO_RADIUS_RATIO =
  (CLOUDS_GEO_EARTH_RADIUS_KM + CLOUDS_GEO_ORBIT_HEIGHT_KM) / CLOUDS_GEO_EARTH_RADIUS_KM;

export const CLOUDS_QUALITY_ZENITH_FULL_DEG = 55;
export const CLOUDS_QUALITY_ZENITH_ZERO_DEG = 75;

const DEG = Math.PI / 180;
const GEO_LIMB_CENTRAL_RAD = Math.acos(1 / CLOUDS_GEO_RADIUS_RATIO);

const qualityPlaneCache = new Map<string, Uint8Array>();

function clampUnit(x: number): number {
  if (x > 1) return 1;
  if (x < -1) return -1;
  return x;
}

function smoothstep01(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Short-arc longitude difference in degrees, dateline-safe, range (−180, 180]. */
export function wrapLongitudeDeltaDeg(longitudeDeg: number, sspLongitudeDeg: number): number {
  let d = longitudeDeg - sspLongitudeDeg;
  d = ((((d + 180) % 360) + 360) % 360) - 180;
  return d;
}

/**
 * Satellite viewing zenith angle θ at the surface, degrees.
 * Returns 90° at and beyond the geometric limb (δ ≥ arccos(1/r)).
 * Always finite for finite lat/lon/SSP.
 */
export function geostationaryViewingZenithDeg(
  latitudeDeg: number,
  longitudeDeg: number,
  sspLongitudeDeg: number,
): number {
  if (
    !Number.isFinite(latitudeDeg) ||
    !Number.isFinite(longitudeDeg) ||
    !Number.isFinite(sspLongitudeDeg)
  ) {
    return 90;
  }
  const phi = latitudeDeg * DEG;
  const dLon = wrapLongitudeDeltaDeg(longitudeDeg, sspLongitudeDeg) * DEG;
  const cosDelta = clampUnit(Math.cos(phi) * Math.cos(dLon));
  const delta = Math.acos(cosDelta);
  if (!(delta < GEO_LIMB_CENTRAL_RAD)) return 90;
  const r = CLOUDS_GEO_RADIUS_RATIO;
  const denom = Math.sqrt(1 + r * r - 2 * r * cosDelta);
  if (!(denom > 0) || !Number.isFinite(denom)) return 90;
  const cosTheta = clampUnit((r * cosDelta - 1) / denom);
  const thetaDeg = Math.acos(cosTheta) / DEG;
  return Number.isFinite(thetaDeg) ? thetaDeg : 90;
}

/**
 * Presentation-independent quality in [0, 1]:
 * 1 at θ ≤ 55°, 0 at θ ≥ 75°, smoothstep between.
 */
export function geostationaryQuality01(zenithDeg: number): number {
  if (!Number.isFinite(zenithDeg) || zenithDeg >= CLOUDS_QUALITY_ZENITH_ZERO_DEG) {
    return 0;
  }
  if (zenithDeg <= CLOUDS_QUALITY_ZENITH_FULL_DEG) return 1;
  return 1 - smoothstep01(
    CLOUDS_QUALITY_ZENITH_FULL_DEG,
    CLOUDS_QUALITY_ZENITH_ZERO_DEG,
    zenithDeg,
  );
}

export function geostationaryQualityU8(
  latitudeDeg: number,
  longitudeDeg: number,
  sspLongitudeDeg: number,
): number {
  return Math.round(
    geostationaryQuality01(
      geostationaryViewingZenithDeg(latitudeDeg, longitudeDeg, sspLongitudeDeg),
    ) * 255,
  );
}

export function equirectPixelCenterLatLonDeg(
  x: number,
  y: number,
  width: number,
  height: number,
): { latitudeDeg: number; longitudeDeg: number } {
  return {
    longitudeDeg: longitudeDegFromMapX(x + 0.5, width),
    latitudeDeg: latitudeDegFromMapY(y + 0.5, height),
  };
}

function qualityPlaneCacheKey(
  sectorId: CloudsSectorId,
  width: number,
  height: number,
): string {
  return `${sectorId}:${width}x${height}`;
}

/**
 * Build a Uint8 quality plane (round(quality01 × 255)) for a regional GEO
 * sector. Returns null for the ring (no single SSP).
 */
export function buildCloudsQualityPlane(
  sectorId: CloudsSectorId,
  width: number,
  height: number,
): Uint8Array | null {
  const ssp = CLOUDS_SECTOR_SPECS[sectorId].geoSubSatellite;
  if (ssp === undefined) return null;
  if (!(width > 0) || !(height > 0)) return null;
  const plane = new Uint8Array(width * height);
  const sspLon = ssp.longitudeDeg;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { latitudeDeg, longitudeDeg } = equirectPixelCenterLatLonDeg(
        x,
        y,
        width,
        height,
      );
      plane[y * width + x] = geostationaryQualityU8(
        latitudeDeg,
        longitudeDeg,
        sspLon,
      );
    }
  }
  return plane;
}

/**
 * Earth-fixed quality plane, cached by sector and grid. Safe to call from
 * acquisition / composition (outside rAF). The ring yields null.
 */
export function getCloudsQualityPlane(
  sectorId: CloudsSectorId,
  width: number,
  height: number,
): Uint8Array | null {
  const key = qualityPlaneCacheKey(sectorId, width, height);
  const cached = qualityPlaneCache.get(key);
  if (cached !== undefined) return cached;
  const built = buildCloudsQualityPlane(sectorId, width, height);
  if (built === null) return null;
  qualityPlaneCache.set(key, built);
  return built;
}
