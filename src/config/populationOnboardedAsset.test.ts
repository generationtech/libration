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
const POPULATION_JPG = path.join(REPO_ROOT, "public/maps/world-equirectangular-population.jpg");

/** Locks the GPWv4 2020 log-scaled export; update when intentionally replacing raster bytes. */
const POPULATION_SHA256_HEX =
  "dbe390f7dbaa4857dee7f6d73e1549061188ede298bf1dc3bfc9d76ab74a5572";

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
  let n = 0;
  for (let dy = -half; dy < half; dy++) {
    for (let dx = -half; dx < half; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || px >= width || py < 0 || py >= height) {
        continue;
      }
      const i = (py * width + px) * 4;
      sumR += data[i]!;
      sumG += data[i + 1]!;
      sumB += data[i + 2]!;
      n++;
    }
  }
  if (n === 0) {
    throw new Error("empty patch");
  }
  return { meanR: sumR / n, meanG: sumG / n, meanB: sumB / n };
}

/** Plate Carrée: x = ((lon + 180) / 360) * width. */
function xFromLongitudeDeg(lonDeg: number, width: number): number {
  return Math.floor(((lonDeg + 180) / 360) * width);
}

/** Plate Carrée: y = ((90 - lat) / 180) * height. */
function yFromLatitudeDeg(latDeg: number, height: number): number {
  return Math.floor(((90 - latDeg) / 180) * height);
}

describe("onboarded GPW population density base-map raster", () => {
  it("is a JPEG with SOF-reported 5400×2700 (exact 2:1 equirect)", () => {
    const bytes = readFileSync(POPULATION_JPG);
    const { width, height } = readJpegSofDimensions(bytes);
    expect(width).toBe(5400);
    expect(height).toBe(2700);
    expect(width).toBe(2 * height);
  });

  it("matches the locked SHA-256 of the shipped population density asset", () => {
    const bytes = readFileSync(POPULATION_JPG);
    const digest = createHash("sha256").update(bytes).digest("hex");
    expect(digest).toBe(POPULATION_SHA256_HEX);
  });

  it("registers longitude −180…+180 (Delhi dense, Sahara sparse, Pacific ocean nodata)", () => {
    const bytes = readFileSync(POPULATION_JPG);
    const { width, height, data } = jpeg.decode(bytes, { useTArray: true });

    const delhi = patchStatsAt(
      data,
      width,
      height,
      xFromLongitudeDeg(77.2, width),
      yFromLatitudeDeg(28.6, height),
    );
    expect(delhi.meanR).toBeGreaterThan(120);
    expect(delhi.meanG).toBeGreaterThan(150);

    const sahara = patchStatsAt(
      data,
      width,
      height,
      xFromLongitudeDeg(10, width),
      yFromLatitudeDeg(25, height),
    );
    expect(sahara.meanR).toBeLessThan(25);
    expect(sahara.meanG).toBeLessThan(35);

    const pacific = patchStatsAt(
      data,
      width,
      height,
      xFromLongitudeDeg(-150, width),
      yFromLatitudeDeg(0, height),
    );
    expect(pacific.meanR).toBeLessThan(12);
    expect(pacific.meanB).toBeLessThan(30);
  });
});
