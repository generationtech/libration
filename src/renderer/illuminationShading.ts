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
 * Solar illumination sampling for the canvas equirectangular pass.
 * Inputs are the geometric dot product (surface normal · subsolar direction) and layer opacity.
 * All tuning tokens stay renderer-local; layers only supply subsolar lat/lon.
 */

/** Max night-side overlay opacity (straight alpha). */
export const NIGHT_DARKEN = 0.62;

/**
 * Dot-product span (surface·subsolar) for ramping from terminator to full night.
 * Slightly widened so the twilight band reads more like an instrument terminator than a cut.
 */
export const NIGHT_RAMP_WIDTH = 0.3;

/**
 * Pre-terminator band: subtle veil while the sun is still slightly above the horizon
 * (civil twilight on the day side). Keeps map detail readable.
 */
export const DAY_TWILIGHT_DOT = 0.1;
export const DAY_TWILIGHT_MAX_ALPHA = 0.1;

/** Near-terminator tint (restrained cool gray; lerps toward black in deep night). */
export const TWILIGHT_R = 26;
export const TWILIGHT_G = 30;
export const TWILIGHT_B = 42;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Perlin/Ken smootherstep — zero 1st derivative at edges for softer terminator transitions. */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
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

  if (dot > 0 && dot < DAY_TWILIGHT_DOT) {
    const u = smootherstep(DAY_TWILIGHT_DOT, 0, dot);
    const falloff = smoothstep(0, 1, u);
    a = falloff * DAY_TWILIGHT_MAX_ALPHA * op;
    r = TWILIGHT_R;
    g = TWILIGHT_G;
    b = TWILIGHT_B;
  } else if (dot <= 0) {
    const neg = -dot;
    const u = smootherstep(0, NIGHT_RAMP_WIDTH, neg);
    a = u * NIGHT_DARKEN * op;
    const deep = smootherstep(NIGHT_RAMP_WIDTH * 0.12, NIGHT_RAMP_WIDTH * 0.86, neg);
    r = TWILIGHT_R * (1 - deep);
    g = TWILIGHT_G * (1 - deep);
    b = TWILIGHT_B * (1 - deep);
  }

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: Math.round(Math.min(1, Math.max(0, a)) * 255),
  };
}
