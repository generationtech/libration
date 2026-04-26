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

import {
  ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG,
  CIVIL_TWILIGHT_HORIZON_OFFSET_DEG,
  NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG,
  solarAltitudeDegFromSurfaceSunDotProduct,
} from "../core/solarTwilight";

/**
 * Solar illumination sampling for the canvas equirectangular pass.
 * Inputs are the geometric dot product (surface normal · subsolar direction) and layer opacity.
 * Tuning lives here; layers only supply subsolar lat/lon. Twilight bands (civil, nautical,
 * astronomical) are expressed via solar altitude from that dot, ahead of the raster blit.
 */

/** Max night-side overlay opacity (straight alpha). */
export const NIGHT_DARKEN = 0.62;

/**
 * Obsolete: retained for early exit on the high day side. Altitude & band logic handle the limb.
 * @deprecated Kept in exports for test compatibility; still used as a day-veil threshold in dot space.
 */
export const NIGHT_RAMP_WIDTH = 0.3;

/**
 * Pre-terminator band: subtle veil while the sun is still low on the day side. Keeps map detail readable.
 */
export const DAY_TWILIGHT_DOT = 0.1;
export const DAY_TWILIGHT_MAX_ALPHA = 0.1;

/** Per-band overlay tints (restrained, instrument-like). */
const C_HORIZON = { r: 34, g: 40, b: 58 } as const;
const C_CIVIL_END = { r: 28, g: 36, b: 56 } as const;
const C_NAUT = { r: 20, g: 32, b: 54 } as const;
const C_ASTRO = { r: 10, g: 20, b: 42 } as const;
const C_NIGHT = { r: 0, g: 0, b: 0 } as const;

/**
 * Blend overlap around twilight thresholds to reduce visible segmentation at
 * civil/nautical/astronomical boundaries.
 */
export const TWILIGHT_BAND_BLEND_OVERLAP_DEG = 1.5;

/** Near-terminator tint (legacy name; civil band start). */
export const TWILIGHT_R = C_HORIZON.r;
export const TWILIGHT_G = C_HORIZON.g;
export const TWILIGHT_B = C_HORIZON.b;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerpChannel(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: lerpChannel(a.r, b.r, t),
    g: lerpChannel(a.g, b.g, t),
    b: lerpChannel(a.b, b.b, t),
  };
}

/**
 * Sub-horizon overlay RGB (0–255). Smooth across civil / nautical / astronomical, then to black
 * in deep night (solar altitude below about −18°).
 */
function twilightBandOverlayRgb(altitudeDeg: number): { r: number; g: number; b: number } {
  if (altitudeDeg > 0) {
    return C_NIGHT;
  }
  const below = -altitudeDeg;
  if (below >= ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG) {
    return C_NIGHT;
  }

  const civilColor = lerpColor(
    C_HORIZON,
    C_CIVIL_END,
    smoothstep(0, CIVIL_TWILIGHT_HORIZON_OFFSET_DEG, below),
  );
  const nauticalColor = lerpColor(
    C_CIVIL_END,
    C_NAUT,
    smoothstep(CIVIL_TWILIGHT_HORIZON_OFFSET_DEG, NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG, below),
  );
  const astronomicalColor = lerpColor(
    C_NAUT,
    C_ASTRO,
    smoothstep(
      NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG,
      ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG,
      below,
    ),
  );

  const overlap = TWILIGHT_BAND_BLEND_OVERLAP_DEG;
  const civilEdge = CIVIL_TWILIGHT_HORIZON_OFFSET_DEG;
  const nauticalEdge = NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG;
  const astroEdge = ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG;

  if (below < civilEdge - overlap) {
    return civilColor;
  }
  if (below <= civilEdge + overlap) {
    return lerpColor(
      civilColor,
      nauticalColor,
      smoothstep(civilEdge - overlap, civilEdge + overlap, below),
    );
  }
  if (below < nauticalEdge - overlap) {
    return nauticalColor;
  }
  if (below <= nauticalEdge + overlap) {
    return lerpColor(
      nauticalColor,
      astronomicalColor,
      smoothstep(nauticalEdge - overlap, nauticalEdge + overlap, below),
    );
  }
  if (below < astroEdge - overlap) {
    return astronomicalColor;
  }
  return lerpColor(
    astronomicalColor,
    C_NIGHT,
    smoothstep(astroEdge - overlap, astroEdge, below),
  );
}

/**
 * How far through twilight to full “night” mask, for alpha (0 = on horizon, 1 = at/after end of
 * astronomical twilight).
 */
function subHorizonMaskStrength(belowHorizonDeg: number): number {
  if (belowHorizonDeg <= 0) {
    return 0;
  }
  if (belowHorizonDeg >= ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG) {
    return 1;
  }
  return smootherstep(0, ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG, belowHorizonDeg);
}

export interface IlluminationRgba8 {
  r: number;
  g: number;
  b: number;
  /** Straight alpha, 0–255. */
  a: number;
}

/**
 * RGBA for one shading pixel given subsolar geometry dot product and layer opacity.
 */
export function sampleIlluminationRgba8(dot: number, layerOpacity: number): IlluminationRgba8 {
  const op = layerOpacity;
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;

  const d = Math.max(-1, Math.min(1, dot));

  if (d > 0 && d < DAY_TWILIGHT_DOT) {
    const u = smootherstep(DAY_TWILIGHT_DOT, 0, d);
    const falloff = smoothstep(0, 1, u);
    a = falloff * DAY_TWILIGHT_MAX_ALPHA * op;
    r = TWILIGHT_R;
    g = TWILIGHT_G;
    b = TWILIGHT_B;
  } else if (d <= 0) {
    const altDeg = solarAltitudeDegFromSurfaceSunDotProduct(d);
    const below = -altDeg;
    const aNorm = subHorizonMaskStrength(below) * NIGHT_DARKEN * op;
    const { r: rr, g: gg, b: bb } = twilightBandOverlayRgb(altDeg);
    r = rr;
    g = gg;
    b = bb;
    a = aNorm;
  }

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: Math.round(Math.min(1, Math.max(0, a)) * 255),
  };
}
