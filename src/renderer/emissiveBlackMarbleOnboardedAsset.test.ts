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

/** Node-only: avoids happy-dom `Image` + large data URL timeouts. */
// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Vitest runs with cwd at the repo root. */
const REPO_ROOT = process.cwd();
const BLACK_MARBLE_JPG = path.join(
  REPO_ROOT,
  "public/maps/composition/equirect-world-night-lights-viirs-v1.jpg",
);

/**
 * Reads width/height from the first SOF0/SOF1/SOF2 segment (baseline/progressive JPEG).
 * Does not decode scan data; sufficient to assert 2:1 equirect geometry on disk.
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

/** Locks the vetted NASA Black Marble 1° grayscale export; update when replacing the raster. */
const BLACK_MARBLE_SHA256_HEX =
  "4d2158f59123dadf0696a1cf8909c45018a1de8d0daab40da04122a5aa7f27c6";

describe("onboarded Black Marble emissive raster", () => {
  it("is a JPEG with SOF-reported 3600×1800 (exact 2:1 equirect)", () => {
    const bytes = readFileSync(BLACK_MARBLE_JPG);
    const { width, height } = readJpegSofDimensions(bytes);
    expect(width).toBe(3600);
    expect(height).toBe(1800);
    expect(width).toBe(2 * height);
  });

  it("matches the locked SHA-256 of the shipped NASA VIIRS Black Marble asset", () => {
    const bytes = readFileSync(BLACK_MARBLE_JPG);
    const digest = createHash("sha256").update(bytes).digest("hex");
    expect(digest).toBe(BLACK_MARBLE_SHA256_HEX);
  });
});
