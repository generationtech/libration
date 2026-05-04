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
 * CPU-side sampling of an equirectangular emissive composition raster (full world, north-up).
 * Used only by the upstream planetary illumination raster path.
 */

import { DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT } from "../core/emissiveNightLightsPresentationDefaults";
import { clampEmissiveRadianceTexelSample } from "../core/emissiveNightLightsPolicy";

export type EmissiveRasterSampleBuffer = Readonly<{
  width: number;
  height: number;
  /** Row-major RGBA8, length width * height * 4 */
  rgba: Uint8ClampedArray;
}>;

function srgbByteToLinear(u8: number): number {
  const u = u8 / 255;
  return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
}

function linearLumaFromSrgb888(r: number, g: number, b: number): number {
  return (
    0.2126 * srgbByteToLinear(r) + 0.7152 * srgbByteToLinear(g) + 0.0722 * srgbByteToLinear(b)
  );
}

/**
 * Default display-encoded luma lift for Black Marble–class JPEGs when config omits `driverExponent`.
 * Lower reveals faint lights more strongly; higher preserves hotspot tails.
 */
export const EMISSIVE_JPEG_LUMA_TO_COMPOSITION_DRIVER_EXPONENT =
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT;

function linearLumaToCompositionDriver01(linearLuma: number, driverExponent: number): number {
  if (!Number.isFinite(linearLuma) || linearLuma <= 0) {
    return 0;
  }
  const exp =
    Number.isFinite(driverExponent) && driverExponent > 0 ? driverExponent : EMISSIVE_JPEG_LUMA_TO_COMPOSITION_DRIVER_EXPONENT;
  const x = Math.min(1, linearLuma);
  return clampEmissiveRadianceTexelSample(Math.pow(x, exp));
}

function wrapLonDeg(lonDeg: number): number {
  let x = lonDeg;
  while (x < -180) {
    x += 360;
  }
  while (x > 180) {
    x -= 360;
  }
  return x;
}

/**
 * Reads decoded image pixels into an RGBA8 buffer (caller may cache).
 * Returns null when `document` is unavailable or dimensions are invalid.
 */
export function rgbaBufferFromHtmlImage(img: HTMLImageElement): EmissiveRasterSampleBuffer | null {
  if (typeof document === "undefined") {
    return null;
  }
  if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    return null;
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c2d = canvas.getContext("2d");
  if (!c2d) {
    return null;
  }
  c2d.drawImage(img, 0, 0);
  const id = c2d.getImageData(0, 0, w, h);
  return { width: w, height: h, rgba: id.data };
}

function sampleRgbaBilinear(buf: EmissiveRasterSampleBuffer, u: number, v: number): { r: number; g: number; b: number } {
  const { width: w, height: h, rgba } = buf;
  if (w <= 0 || h <= 0) {
    return { r: 0, g: 0, b: 0 };
  }
  const uu = Math.max(0, Math.min(1, u));
  const vv = Math.max(0, Math.min(1, v));
  const xf = uu * (w - 1);
  const yf = vv * (h - 1);
  const x0 = Math.floor(xf);
  const y0 = Math.floor(yf);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = xf - x0;
  const ty = yf - y0;
  const idx = (yy: number, xx: number) => (yy * w + xx) * 4;
  const p00 = idx(y0, x0);
  const p10 = idx(y0, x1);
  const p01 = idx(y1, x0);
  const p11 = idx(y1, x1);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const r =
    lerp(lerp(rgba[p00], rgba[p10], tx), lerp(rgba[p01], rgba[p11], tx), ty);
  const g =
    lerp(lerp(rgba[p00 + 1], rgba[p10 + 1], tx), lerp(rgba[p01 + 1], rgba[p11 + 1], tx), ty);
  const b =
    lerp(lerp(rgba[p00 + 2], rgba[p10 + 2], tx), lerp(rgba[p01 + 2], rgba[p11 + 2], tx), ty);
  return { r, g, b };
}

/**
 * Maps lon/lat (degrees, full-world equirect) to a bounded 0..1 **composition driver** (not calibrated
 * physical radiance): sRGB-linear luma from decoded texels, then `pow(luma, driverExponent)`.
 */
export function sampleEquirectEmissiveRadianceLinear01(
  buf: EmissiveRasterSampleBuffer,
  lonDeg: number,
  latDeg: number,
  driverExponent: number = EMISSIVE_JPEG_LUMA_TO_COMPOSITION_DRIVER_EXPONENT,
): number {
  const lon = wrapLonDeg(lonDeg);
  const lat = Math.max(-90, Math.min(90, latDeg));
  const u = (lon + 180) / 360;
  const v = (90 - lat) / 180;
  const { r, g, b } = sampleRgbaBilinear(buf, u, v);
  const linearLuma = linearLumaFromSrgb888(r, g, b);
  return linearLumaToCompositionDriver01(linearLuma, driverExponent);
}
