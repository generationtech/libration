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

/** Near-terminator tint (legacy name; civil band start). */
export const TWILIGHT_R = 26;
export const TWILIGHT_G = 30;
export const TWILIGHT_B = 42;

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

/**
 * Sub-horizon overlay RGB (0–255). Smooth across civil / nautical / astronomical, then to black
 * in deep night (solar altitude below about −18°).
 */
function twilightBandOverlayRgb(altitudeDeg: number): { r: number; g: number; b: number } {
  if (altitudeDeg > 0) {
    return { r: 0, g: 0, b: 0 };
  }
  const below = -altitudeDeg;
  if (below >= ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG) {
    return { r: 0, g: 0, b: 0 };
  }
  if (below <= CIVIL_TWILIGHT_HORIZON_OFFSET_DEG) {
    const t = smoothstep(0, CIVIL_TWILIGHT_HORIZON_OFFSET_DEG, below);
    return {
      r: lerpChannel(C_HORIZON.r, C_CIVIL_END.r, t),
      g: lerpChannel(C_HORIZON.g, C_CIVIL_END.g, t),
      b: lerpChannel(C_HORIZON.b, C_CIVIL_END.b, t),
    };
  }
  if (below <= NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG) {
    const t = smoothstep(
      CIVIL_TWILIGHT_HORIZON_OFFSET_DEG,
      NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG,
      below,
    );
    return {
      r: lerpChannel(C_CIVIL_END.r, C_NAUT.r, t),
      g: lerpChannel(C_CIVIL_END.g, C_NAUT.g, t),
      b: lerpChannel(C_CIVIL_END.b, C_NAUT.b, t),
    };
  }
  const t = smoothstep(
    NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG,
    ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG,
    below,
  );
  return {
    r: lerpChannel(C_NAUT.r, C_ASTRO.r, t),
    g: lerpChannel(C_NAUT.g, C_ASTRO.g, t),
    b: lerpChannel(C_NAUT.b, C_ASTRO.b, t),
  };
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
