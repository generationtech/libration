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

/** Node-only: decodes ship JPEG via jpeg-js; avoids happy-dom Image timeouts. */
// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as jpeg from "jpeg-js";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const BATHYMETRY_JPG = path.join(REPO_ROOT, "public/maps/world-equirectangular-bathymetry.jpg");

/** Locks the ETOPO 2022–derived hypsometry export; update when intentionally replacing raster bytes. */
const BATHYMETRY_SHA256_HEX =
  "f00a4401ae184387285ed5474e63de706383f25ba732c18a855f7333daf9007a";

/**
 * Reads width/height from the first SOF0/SOF1/SOF2 segment (baseline/progressive JPEG).
 */
function readJpegSofDimensions(buf: Uint8Array): { width: number; height: number } {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error("not a JPEG (missing SOI)");
  }
  let p = 2;
  while (p + 1 < buf.length) {
    if (buf[p++] !== 0xff) {
      continue;
    }
    const marker = buf[p++];
    if (marker === 0xd9) {
      break;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      continue;
    }
    if (p + 2 > buf.length) {
      break;
    }
    const segLen = (buf[p] << 8) | buf[p + 1];
    if (segLen < 2 || p + segLen > buf.length) {
      break;
    }
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const h = (buf[p + 3] << 8) | buf[p + 4];
      const w = (buf[p + 5] << 8) | buf[p + 6];
      if (w <= 0 || h <= 0) {
        throw new Error("invalid SOF dimensions");
      }
      return { width: w, height: h };
    }
    p += segLen;
  }
  throw new Error("JPEG SOF0/SOF1/SOF2 not found");
}

type PatchStats = Readonly<{
  meanR: number;
  meanG: number;
  meanB: number;
  stdRgb: number;
  blueMinusRed: number;
}>;

/** 32×32 patch centered at (x, y) on decoded RGBA raster. */
function patchStatsAt(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  half = 16,
): PatchStats {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumDevSq = 0;
  let n = 0;
  for (let dy = -half; dy < half; dy++) {
    for (let dx = -half; dx < half; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || px >= width || py < 0 || py >= height) {
        continue;
      }
      const i = (py * width + px) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      sumR += r;
      sumG += g;
      sumB += b;
      n++;
    }
  }
  if (n === 0) {
    throw new Error("empty patch");
  }
  const meanR = sumR / n;
  const meanG = sumG / n;
  const meanB = sumB / n;
  for (let dy = -half; dy < half; dy++) {
    for (let dx = -half; dx < half; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || px >= width || py < 0 || py >= height) {
        continue;
      }
      const i = (py * width + px) * 4;
      const r = data[i]! - meanR;
      const g = data[i + 1]! - meanG;
      const b = data[i + 2]! - meanB;
      sumDevSq += r * r + g * g + b * b;
    }
  }
  const stdRgb = Math.sqrt(sumDevSq / (3 * n));
  return {
    meanR,
    meanG,
    meanB,
    stdRgb,
    blueMinusRed: meanB - meanR,
  };
}

/** Plate Carrée: x = ((lon + 180) / 360) * width. */
function xFromLongitudeDeg(lonDeg: number, width: number): number {
  return Math.floor(((lonDeg + 180) / 360) * width);
}

describe("onboarded ETOPO bathymetry base-map raster", () => {
  it("is a JPEG with SOF-reported 5400×2700 (exact 2:1 equirect)", () => {
    const bytes = readFileSync(BATHYMETRY_JPG);
    const { width, height } = readJpegSofDimensions(bytes);
    expect(width).toBe(5400);
    expect(height).toBe(2700);
    expect(width).toBe(2 * height);
  });

  it("matches the locked SHA-256 of the shipped bathymetry asset", () => {
    const bytes = readFileSync(BATHYMETRY_JPG);
    const digest = createHash("sha256").update(bytes).digest("hex");
    expect(digest).toBe(BATHYMETRY_SHA256_HEX);
  });

  it("registers longitude −180…+180 (west Pacific ocean hypsometry, not a flat gray west half)", () => {
    const bytes = readFileSync(BATHYMETRY_JPG);
    const { width, height, data } = jpeg.decode(bytes, { useTArray: true });
    const y = Math.floor(height / 2);

    const pacific = patchStatsAt(data, width, height, xFromLongitudeDeg(-150, width), y);
    expect(pacific.blueMinusRed).toBeGreaterThanOrEqual(80);
    expect(pacific.stdRgb).toBeGreaterThanOrEqual(2);
    expect(pacific.meanB).toBeGreaterThan(pacific.meanR);

    const americas = patchStatsAt(data, width, height, xFromLongitudeDeg(-90, width), y);
    expect(americas.stdRgb).toBeGreaterThanOrEqual(15);

    const indianOcean = patchStatsAt(data, width, height, xFromLongitudeDeg(90, width), y);
    expect(indianOcean.blueMinusRed).toBeGreaterThanOrEqual(80);
    expect(indianOcean.stdRgb).toBeGreaterThanOrEqual(5);
  });
});
