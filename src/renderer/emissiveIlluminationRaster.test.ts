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

import { describe, expect, it } from "vitest";
import type { EmissiveRasterSampleBuffer } from "./emissiveIlluminationRaster";
import { sampleEquirectEmissiveRadianceLinear01 } from "./emissiveIlluminationRaster";

function solidRaster(w: number, h: number, rgb: [number, number, number]): EmissiveRasterSampleBuffer {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = rgb[0];
    rgba[i * 4 + 1] = rgb[1];
    rgba[i * 4 + 2] = rgb[2];
    rgba[i * 4 + 3] = 255;
  }
  return { width: w, height: h, rgba };
}

describe("sampleEquirectEmissiveRadianceLinear01", () => {
  it("samples white as high linear luma", () => {
    const buf = solidRaster(4, 4, [255, 255, 255]);
    const x = sampleEquirectEmissiveRadianceLinear01(buf, 0, 0);
    expect(x).toBeGreaterThan(0.95);
  });

  it("wraps longitude across the dateline", () => {
    const buf = solidRaster(8, 4, [200, 40, 40]);
    const a = sampleEquirectEmissiveRadianceLinear01(buf, -179, 0);
    const b = sampleEquirectEmissiveRadianceLinear01(buf, 181, 0);
    expect(a).toBeCloseTo(b, 5);
  });

  it("uses lower driverExponent to lift a dim texel more than a higher exponent", () => {
    const buf = solidRaster(4, 4, [22, 22, 22]);
    const lowExp = sampleEquirectEmissiveRadianceLinear01(buf, 0, 0, 0.35);
    const highExp = sampleEquirectEmissiveRadianceLinear01(buf, 0, 0, 1);
    expect(lowExp).toBeGreaterThan(highExp);
    expect(highExp).toBeGreaterThan(0);
  });
});
