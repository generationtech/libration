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
 * Fixed display-colormap interpretation of NASA GIBS Band13 WMS RGB.
 *
 * The WMS PNG is a false-color visualization, not numeric brightness
 * temperature. Rec.601 luma of that RGB is not a physical axis. This module
 * projects a pixel onto the published ordered colormap and returns a
 * normalized canonical display-IR scalar.
 *
 * Distance is RGB Euclidean: this is provider-display matching, not
 * perceptual color science. WMS resampling is handled by projecting onto the
 * nearest colormap segment so blended colors stay on the legend order.
 * Unmatched colors still use that nearest segment — never a silent Rec.601
 * fallback.
 */

import {
  GIBS_BAND13_COLORMAP_AUTHORITY,
  GIBS_BAND13_COLORMAP_RGB_TC,
} from "./gibsBand13ColorMapData";

export { GIBS_BAND13_COLORMAP_AUTHORITY };

const TABLE = GIBS_BAND13_COLORMAP_RGB_TC;
const N = TABLE.length;

export const GIBS_BAND13_DISPLAY_C_COLD = TABLE[0]![3] / 100;
export const GIBS_BAND13_DISPLAY_C_WARM = TABLE[N - 1]![3] / 100;
const DISPLAY_C_SPAN = GIBS_BAND13_DISPLAY_C_WARM - GIBS_BAND13_DISPLAY_C_COLD;

/** 64³ cube: 4 RGB units per bin. Built once on first GIBS pixel. */
const LUT_RES = 64;
const LUT_SHIFT = 2;
const LUT_SIZE = LUT_RES * LUT_RES * LUT_RES;

let lut: Float32Array | null = null;
let exactByRgb: Map<number, number> | null = null;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function rgbKey(r: number, g: number, b: number): number {
  return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
}

/**
 * Canonical display IR from a colormap midpoint °C.
 * 0 = warm / surface-like; 1 = cold / high-cloud-like.
 * Not inverted Kelvin from the PNG.
 */
export function canonicalIR01FromGibsDisplayC(displayC: number): number {
  if (!Number.isFinite(displayC)) return 0;
  return clamp01((GIBS_BAND13_DISPLAY_C_WARM - displayC) / DISPLAY_C_SPAN);
}

function displayCAtIndex(i: number): number {
  return TABLE[i]![3] / 100;
}

/**
 * Project RGB onto the nearest ordered colormap segment.
 * Returns canonicalIR01 and squared Euclidean RGB distance to the projection.
 */
export function projectRgbOntoGibsBand13Colormap(
  r: number,
  g: number,
  b: number,
): { canonicalIR01: number; dist2: number } {
  let bestD2 = Infinity;
  let bestIR = 0;
  for (let i = 0; i < N - 1; i++) {
    const a = TABLE[i]!;
    const c = TABLE[i + 1]!;
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const abx = c[0] - ax;
    const aby = c[1] - ay;
    const abz = c[2] - az;
    const len2 = abx * abx + aby * aby + abz * abz;
    let u = 0;
    if (len2 > 1e-6) {
      u = ((r - ax) * abx + (g - ay) * aby + (b - az) * abz) / len2;
      if (u < 0) u = 0;
      else if (u > 1) u = 1;
    }
    const px = ax + abx * u;
    const py = ay + aby * u;
    const pz = az + abz * u;
    const dx = r - px;
    const dy = g - py;
    const dz = b - pz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      const t = displayCAtIndex(i) + (displayCAtIndex(i + 1) - displayCAtIndex(i)) * u;
      bestIR = canonicalIR01FromGibsDisplayC(t);
    }
  }
  return { canonicalIR01: bestIR, dist2: bestD2 };
}

function ensureTables(): void {
  if (lut !== null && exactByRgb !== null) return;
  const exact = new Map<number, number>();
  for (let i = 0; i < N; i++) {
    const e = TABLE[i]!;
    exact.set(rgbKey(e[0], e[1], e[2]), canonicalIR01FromGibsDisplayC(e[3] / 100));
  }
  exactByRgb = exact;
  const cube = new Float32Array(LUT_SIZE);
  for (let ri = 0; ri < LUT_RES; ri++) {
    const r = (ri << LUT_SHIFT) | 2;
    for (let gi = 0; gi < LUT_RES; gi++) {
      const g = (gi << LUT_SHIFT) | 2;
      const row = (ri * LUT_RES + gi) * LUT_RES;
      for (let bi = 0; bi < LUT_RES; bi++) {
        const b = (bi << LUT_SHIFT) | 2;
        const key = rgbKey(r, g, b);
        const hit = exact.get(key);
        cube[row + bi] =
          hit !== undefined ? hit : projectRgbOntoGibsBand13Colormap(r, g, b).canonicalIR01;
      }
    }
  }
  lut = cube;
}

/**
 * Canonical display IR for one GIBS Band13 WMS pixel.
 * Exact palette colors use the published entry; others use the 64³ LUT of
 * nearest-segment projections.
 */
export function canonicalIR01FromGibsRgb(r: number, g: number, b: number): number {
  ensureTables();
  const exact = exactByRgb!.get(rgbKey(r, g, b));
  if (exact !== undefined) return exact;
  const ri = r >> LUT_SHIFT;
  const gi = g >> LUT_SHIFT;
  const bi = b >> LUT_SHIFT;
  return lut![(ri * LUT_RES + gi) * LUT_RES + bi]!;
}

/** Test/diagnostic: squared RGB distance to the nearest colormap segment. */
export function gibsBand13ColormapDistance2(r: number, g: number, b: number): number {
  const exact = (exactByRgb ?? (ensureTables(), exactByRgb))!.get(rgbKey(r, g, b));
  if (exact !== undefined) return 0;
  return projectRgbOntoGibsBand13Colormap(r, g, b).dist2;
}

export function ensureGibsBand13ColorMapLut(): void {
  ensureTables();
}
