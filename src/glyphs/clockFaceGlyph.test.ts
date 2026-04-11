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
import { clockFaceHourHandTip } from "./glyphToRenderPlan.ts";
import { resolveHourMarkerGlyphStyle } from "./glyphStyles.ts";

describe("clockFaceHourHandTip", () => {
  const layout = { cx: 100, cy: 50, size: 40 };
  const cf = resolveHourMarkerGlyphStyle("topBandHourAnalogClock").clockFace;
  const R = 40 * 0.5;
  const reach = R * cf.handLengthRadiusFrac;

  it("hour 0 → 12 o'clock (straight up)", () => {
    const t = clockFaceHourHandTip(layout, 0, cf);
    expect(t.x).toBeCloseTo(100, 5);
    expect(t.y).toBeCloseTo(50 - reach, 5);
  });

  it("hour 3 → 3 o'clock", () => {
    const t = clockFaceHourHandTip(layout, 3, cf);
    expect(t.x).toBeCloseTo(100 + reach, 5);
    expect(t.y).toBeCloseTo(50, 5);
  });

  it("hour 6 → 6 o'clock", () => {
    const t = clockFaceHourHandTip(layout, 6, cf);
    expect(t.x).toBeCloseTo(100, 5);
    expect(t.y).toBeCloseTo(50 + reach, 5);
  });

  it("hour 9 → 9 o'clock", () => {
    const t = clockFaceHourHandTip(layout, 9, cf);
    expect(t.x).toBeCloseTo(100 - reach, 5);
    expect(t.y).toBeCloseTo(50, 5);
  });
});
