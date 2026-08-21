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
 * Approximate IR-derived cloud highlight. Consumes a generic RGBA IR raster
 * (provider Band13 or a future world IR composite). Not a formal cloud mask.
 *
 * GIBS ABI/AHI Band13 Clean Infrared (live 2026-08-21 stack): colder / higher
 * cloud tops are brighter; warm land/ocean is darker. Provider alpha 0 is
 * missing coverage and stays transparent.
 */

/** Rec. 601 luma below this is treated as non-cloud (warm / surface-like). */
export const CLOUD_HIGHLIGHT_LUMA_LO = 100;
/** Rec. 601 luma at/above this maps to full derived cloud alpha. */
export const CLOUD_HIGHLIGHT_LUMA_HI = 195;

/** Factory highlight colour: restrained cool-white. */
export const CLOUD_HIGHLIGHT_RGB = {
  r: 248,
  g: 250,
  b: 252,
} as const;

export function rec601Luma8(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

function smoothstep01(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Derived cloud opacity 0..1 from IR luma. Monotonic increasing with luma
 * (colder → stronger highlight) inside the documented range.
 */
export function cloudHighlightAlpha01FromIrLuma(luma: number): number {
  if (!Number.isFinite(luma)) return 0;
  return smoothstep01(CLOUD_HIGHLIGHT_LUMA_LO, CLOUD_HIGHLIGHT_LUMA_HI, luma);
}

/**
 * In-place IR RGBA → white/gray cloud-highlight RGBA.
 * Provider alpha 0 remains 0. Output RGB never carries a science palette.
 */
export function applyCloudHighlightTransferInPlace(rgba: Uint8Array): void {
  const { r: hr, g: hg, b: hb } = CLOUD_HIGHLIGHT_RGB;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const srcA = rgba[i + 3]!;
    if (srcA === 0) {
      rgba[i] = 0;
      rgba[i + 1] = 0;
      rgba[i + 2] = 0;
      continue;
    }
    const luma = rec601Luma8(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
    const cloud01 = cloudHighlightAlpha01FromIrLuma(luma);
    rgba[i] = hr;
    rgba[i + 1] = hg;
    rgba[i + 2] = hb;
    rgba[i + 3] = Math.round(cloud01 * (srcA / 255) * 255);
  }
}

export function applyCloudHighlightTransfer(rgba: Uint8Array): Uint8Array {
  const out = rgba.slice();
  applyCloudHighlightTransferInPlace(out);
  return out;
}
