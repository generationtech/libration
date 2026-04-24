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

import { applyBaseMapGammaToRgba8 } from "./applyBaseMapGammaToRgba8.ts";

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Key for the gamma offscreen cache: URL + **natural** pixel dimensions (device pixels of the
 * decoded bitmap) + effective γ. Recomputes only when any of these change.
 */
export function buildGammaRasterCacheKey(
  imageSrc: string,
  naturalWidthPx: number,
  naturalHeightPx: number,
  gamma: number,
): string {
  const g = Math.round(gamma * 1_000_000) / 1_000_000;
  return `${imageSrc}\u0000${naturalWidthPx}\u0000${naturalHeightPx}\u0000${g}`;
}

/**
 * Returns a (possibly cached) canvas holding full-resolution, gamma-adjusted pixels for an
 * already-decoded image. The source `HTMLImageElement` is not mutated. Alpha is preserved by
 * {@link applyBaseMapGammaToRgba8}. Caller draws this surface through the same CSS `filter` path
 * as the raw image.
 */
export function getGammaAdjustedCanvasForImage(
  img: HTMLImageElement,
  imageSrc: string,
  gamma: number,
): HTMLCanvasElement | null {
  if (gamma === 1 || !Number.isFinite(gamma)) {
    return null;
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w <= 0 || h <= 0) {
    return null;
  }
  const key = buildGammaRasterCacheKey(imageSrc, w, h, gamma);
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }

  const doc = globalThis.document;
  if (!doc?.createElement) {
    return null;
  }
  const canvas = doc.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const sctx = canvas.getContext("2d");
  if (!sctx) {
    return null;
  }
  sctx.drawImage(img, 0, 0);
  let imageData: ImageData;
  try {
    imageData = sctx.getImageData(0, 0, w, h);
  } catch {
    // Typical cause: tainted canvas (cross-origin image without CORS). Fall back to no adjustment.
    return null;
  }
  applyBaseMapGammaToRgba8(imageData.data, gamma);
  sctx.putImageData(imageData, 0, 0);
  cache.set(key, canvas);
  return canvas;
}

export function __clearGammaRasterCacheForTests(): void {
  cache.clear();
}
