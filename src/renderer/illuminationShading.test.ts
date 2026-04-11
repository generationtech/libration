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
import {
  DAY_TWILIGHT_DOT,
  NIGHT_DARKEN,
  NIGHT_RAMP_WIDTH,
  sampleIlluminationRgba8,
  smootherstep,
  smoothstep,
  TWILIGHT_B,
  TWILIGHT_G,
  TWILIGHT_R,
} from "./illuminationShading";

describe("smootherstep", () => {
  it("matches endpoints and has zero slope at edges vs linear ramp", () => {
    expect(smootherstep(0, 1, 0)).toBe(0);
    expect(smootherstep(0, 1, 1)).toBe(1);
    expect(smootherstep(2, 4, 3)).toBe(0.5);
  });
});

describe("smoothstep", () => {
  it("is 0 and 1 at edges", () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });
});

describe("sampleIlluminationRgba8", () => {
  it("is fully transparent on the day side away from the terminator", () => {
    expect(sampleIlluminationRgba8(1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(sampleIlluminationRgba8(DAY_TWILIGHT_DOT, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("uses twilight tint on the day-side civil band", () => {
    const mid = sampleIlluminationRgba8(DAY_TWILIGHT_DOT * 0.5, 1);
    expect(mid.r).toBe(TWILIGHT_R);
    expect(mid.g).toBe(TWILIGHT_G);
    expect(mid.b).toBe(TWILIGHT_B);
    expect(mid.a).toBeGreaterThan(0);
    expect(mid.a).toBeLessThanOrEqual(255);
  });

  it("has zero alpha exactly at the terminator from the night branch", () => {
    expect(sampleIlluminationRgba8(0, 1).a).toBe(0);
  });

  it("ramps to full night darken deep on the night side", () => {
    const deep = sampleIlluminationRgba8(-1, 1);
    expect(deep.a).toBe(Math.round(NIGHT_DARKEN * 255));
    expect(deep.r).toBe(0);
    expect(deep.g).toBe(0);
    expect(deep.b).toBe(0);
  });

  it("scales alpha by layer opacity", () => {
    const deep = sampleIlluminationRgba8(-1, 0.5);
    expect(deep.a).toBe(Math.round(NIGHT_DARKEN * 0.5 * 255));
  });

  it("produces partial night alpha inside the ramp width", () => {
    const t = sampleIlluminationRgba8(-NIGHT_RAMP_WIDTH * 0.5, 1);
    expect(t.a).toBeGreaterThan(0);
    expect(t.a).toBeLessThan(Math.round(NIGHT_DARKEN * 255));
  });
});
