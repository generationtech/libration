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
 * temperature. Rec.601 luma of that RGB is not a physical axis.
 *
 * Chromatic pixels project onto the published ordered colormap (exact
 * palette hit or 64³ LUT of nearest-segment projections).
 *
 * Near-gray pixels do **not** use RGB-nearest palette lookup. GIBS Band13
 * reuses grayscale values on both warm and cold legend branches; WMS
 * interpolation can generate ambiguous near-gray pixels (an isolated gray
 * 102 in a 101/103 neighborhood is quantization, not −74 °C). Those pixels
 * invert along the warm-gray legend by luma.
 */

import {
  GIBS_BAND13_COLORMAP_AUTHORITY,
  GIBS_BAND13_COLORMAP_RGB_TC,
  GIBS_BAND13_WARM_GRAY_START_INDEX,
} from "./gibsBand13ColorMapData";

export { GIBS_BAND13_COLORMAP_AUTHORITY };
export {
  GIBS_BAND13_COLD_GRAY_END_INDEX,
  GIBS_BAND13_COLD_GRAY_START_INDEX,
  GIBS_BAND13_WARM_GRAY_START_INDEX,
} from "./gibsBand13ColorMapData";

const TABLE = GIBS_BAND13_COLORMAP_RGB_TC;
const N = TABLE.length;

export const GIBS_BAND13_DISPLAY_C_COLD = TABLE[0]![3] / 100;
export const GIBS_BAND13_DISPLAY_C_WARM = TABLE[N - 1]![3] / 100;
const DISPLAY_C_SPAN = GIBS_BAND13_DISPLAY_C_WARM - GIBS_BAND13_DISPLAY_C_COLD;

/**
 * Channel range at or below this is near-gray. Inclusive. Fixed; not
 * per-frame adaptive. WEATHER-5.4 India was bimodal (chroma 0 vs ≥17);
 * 8 vs 16 classified almost identically.
 */
export const GIBS_BAND13_NEAR_GRAY_CHROMA_MAX = 8;

/** 64³ cube: 4 RGB units per bin. Built once on first GIBS pixel. */
const LUT_RES = 64;
const LUT_SHIFT = 2;
const LUT_SIZE = LUT_RES * LUT_RES * LUT_RES;

let lut: Float32Array | null = null;
let exactByRgb: Map<number, number> | null = null;
let warmGrayLut: Float32Array | null = null;

export type GibsGrayInterpretationId = "hybrid" | "legacyLut";

export const PRODUCTION_GIBS_GRAY_INTERPRETATION_ID: GibsGrayInterpretationId =
  "hybrid";

let devGibsGrayOverride: GibsGrayInterpretationId | null = null;

export function setDevGibsGrayInterpretationOverride(
  id: GibsGrayInterpretationId | null,
): void {
  devGibsGrayOverride = id;
}

export function getActiveGibsGrayInterpretation(): GibsGrayInterpretationId {
  return devGibsGrayOverride ?? PRODUCTION_GIBS_GRAY_INTERPRETATION_ID;
}

export function parseGibsGrayInterpretationId(
  raw: string | null | undefined,
): GibsGrayInterpretationId | null {
  if (raw == null || raw === "") return null;
  const v = raw.trim().toLowerCase();
  if (v === "legacy" || v === "lut" || v === "wx5" || v === "nearest") {
    return "legacyLut";
  }
  if (v === "hybrid" || v === "warm" || v === "wx54" || v === "production") {
    return "hybrid";
  }
  return null;
}

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

/** Channel range: 0 = exact gray. */
export function gibsBand13Chroma(r: number, g: number, b: number): number {
  const mx = r >= g ? (r >= b ? r : b) : g >= b ? g : b;
  const mn = r <= g ? (r <= b ? r : b) : g <= b ? g : b;
  return mx - mn;
}

export function isGibsBand13NearGray(r: number, g: number, b: number): boolean {
  return gibsBand13Chroma(r, g, b) <= GIBS_BAND13_NEAR_GRAY_CHROMA_MAX;
}

/**
 * Scalar on the gray diagonal. Integer channel average.
 * For exact gray this equals R. Rec.601 is equivalent there; average is the
 * position on the RGB diagonal the warm-gray legend occupies.
 */
export function gibsBand13GrayLuma(r: number, g: number, b: number): number {
  return Math.round((r + g + b) / 3);
}

/**
 * Project RGB onto the nearest ordered colormap segment.
 * Returns canonicalIR01 and squared Euclidean RGB distance to the projection.
 *
 * Diagnostic / LUT-builder only. Production near-gray pixels must not use
 * this: first-min distance ties keep the earlier (cold) gray branch.
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

function buildWarmGrayLut(): Float32Array {
  const start = GIBS_BAND13_WARM_GRAY_START_INDEX;
  const count = N - start;
  const luma = new Uint8Array(count);
  const ir = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const e = TABLE[start + i]!;
    luma[i] = e[0]!;
    ir[i] = canonicalIR01FromGibsDisplayC(e[3] / 100);
  }
  const table = new Float32Array(256);
  const last = count - 1;
  const minLuma = luma[last]!;
  const maxLuma = luma[0]!;
  const irAtMin = ir[last]!;
  const irAtMax = ir[0]!;
  for (let L = 0; L < 256; L++) {
    if (L <= minLuma) {
      table[L] = irAtMin;
      continue;
    }
    if (L >= maxLuma) {
      table[L] = irAtMax;
      continue;
    }
    let lo = last;
    for (let i = last; i >= 0; i--) {
      if (luma[i]! <= L) lo = i;
      else break;
    }
    const hi = lo > 0 ? lo - 1 : 0;
    const lLo = luma[lo]!;
    const lHi = luma[hi]!;
    if (lHi === lLo) {
      table[L] = ir[lo]!;
      continue;
    }
    const u = (L - lLo) / (lHi - lLo);
    table[L] = ir[lo]! + u * (ir[hi]! - ir[lo]!);
  }
  return table;
}

function ensureTables(): void {
  if (lut !== null && exactByRgb !== null && warmGrayLut !== null) return;
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
  warmGrayLut = buildWarmGrayLut();
}

export function canonicalIR01FromGibsWarmGrayLuma(luma: number): number {
  ensureTables();
  const L = Number.isFinite(luma) ? Math.max(0, Math.min(255, Math.round(luma))) : 0;
  return warmGrayLut![L]!;
}

function canonicalIR01FromGibsRgbLut(r: number, g: number, b: number): number {
  const exact = exactByRgb!.get(rgbKey(r, g, b));
  if (exact !== undefined) return exact;
  const ri = r >> LUT_SHIFT;
  const gi = g >> LUT_SHIFT;
  const bi = b >> LUT_SHIFT;
  return lut![(ri * LUT_RES + gi) * LUT_RES + bi]!;
}

/**
 * Canonical display IR for one GIBS Band13 WMS pixel.
 *
 * Near-gray (chroma ≤ 8) uses the warm-gray legend by luma so WMS-resampled
 * gray 102 cannot snap onto the cold gray branch. Chromatic pixels use the
 * existing 64³ LUT (exact palette colors first). DEV `legacyLut` restores
 * the WEATHER-5.1 RGB-nearest path for side-by-side comparison.
 */
export function canonicalIR01FromGibsRgb(r: number, g: number, b: number): number {
  ensureTables();
  if (
    getActiveGibsGrayInterpretation() !== "legacyLut" &&
    isGibsBand13NearGray(r, g, b)
  ) {
    return warmGrayLut![gibsBand13GrayLuma(r, g, b)]!;
  }
  return canonicalIR01FromGibsRgbLut(r, g, b);
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
