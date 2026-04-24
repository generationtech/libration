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
import { applyBaseMapGammaToRgba8 } from "./applyBaseMapGammaToRgba8";

function clone(b: Uint8ClampedArray): Uint8ClampedArray {
  return new Uint8ClampedArray(b);
}

describe("applyBaseMapGammaToRgba8", () => {
  it("leaves bytes unchanged for gamma 1", () => {
    const d = new Uint8ClampedArray([10, 20, 30, 255, 0, 0, 0, 0]);
    const before = clone(d);
    applyBaseMapGammaToRgba8(d, 1);
    expect(d).toEqual(before);
  });

  it("leaves bytes unchanged for non-finite gamma (no-op guard)", () => {
    const d = new Uint8ClampedArray([10, 20, 30, 255]);
    const before = clone(d);
    applyBaseMapGammaToRgba8(d, Number.NaN);
    expect(d).toEqual(before);
  });

  it("preserves alpha bytes", () => {
    const d = new Uint8ClampedArray([100, 100, 100, 200, 50, 50, 50, 0]);
    applyBaseMapGammaToRgba8(d, 1.5);
    expect(d[3]).toBe(200);
    expect(d[7]).toBe(0);
  });

  it("leaves fully transparent pixel RGB untouched", () => {
    const d = new Uint8ClampedArray([99, 99, 99, 0]);
    const before = clone(d);
    applyBaseMapGammaToRgba8(d, 0.4);
    expect(d).toEqual(before);
  });

  it("with gamma > 1, darkens midtones (expected direction)", () => {
    const c = 128;
    const d = new Uint8ClampedArray([c, c, c, 255]);
    applyBaseMapGammaToRgba8(d, 2.0);
    const out = d[0] ?? 0;
    expect(out).toBeLessThan(c);
    const expected = Math.round(255 * (128 / 255) ** 2.0);
    expect(out).toBe(expected);
  });

  it("with gamma < 1, lightens midtones (expected direction)", () => {
    const c = 128;
    const d = new Uint8ClampedArray([c, c, c, 255]);
    applyBaseMapGammaToRgba8(d, 0.5);
    const out = d[0] ?? 0;
    expect(out).toBeGreaterThan(c);
    const expected = Math.round(255 * (128 / 255) ** 0.5);
    expect(out).toBe(expected);
  });

  it("does not re-expand clamped 0/255 to invalid values (output stays 0-255)", () => {
    const d = new Uint8ClampedArray([0, 255, 128, 255]);
    applyBaseMapGammaToRgba8(d, 3.0);
    for (const ch of [0, 1, 2]) {
      const v = d[ch] ?? -1;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });
});
