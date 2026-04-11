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
import { loadBundledFontAssetRegistry } from "../config/chromeTypography.ts";
import type { RenderPlan } from "../renderer/renderPlan/renderPlanTypes.ts";
import { emitGlyphToRenderPlan } from "./glyphToRenderPlan.ts";
import { resolveHourMarkerGlyphStyle } from "./glyphStyles.ts";

describe("resolveHourMarkerGlyphStyle", () => {
  it("returns deterministic clock-face tokens for topBandHourAnalogClock", () => {
    const spec = resolveHourMarkerGlyphStyle("topBandHourAnalogClock");
    expect(spec.clockFace.ringStrokeWidthPx).toBe(1.25);
    expect(spec.clockFace.handStrokeWidthPx).toBe(2);
    expect(spec.clockFace.handLengthRadiusFrac).toBe(0.52);
    expect(spec.clockFace.minuteHandLengthRadiusFrac).toBe(0.88);
    expect(spec.clockFace.minuteHandStrokeWidthPx).toBe(1.35);
    expect(spec.clockFace.ringInsetFrac).toBe(0);
    expect(spec.clockFace.lineCap).toBe("round");
  });

  it("includes radialLine and radialWedge tokens for topBandHourDefault", () => {
    const spec = resolveHourMarkerGlyphStyle("topBandHourDefault");
    expect(spec.radialLine.lengthRadiusFrac).toBe(0.85);
    expect(spec.radialLine.lineCap).toBe("round");
    expect(spec.radialLine.lineWidthPx).toBe(spec.clockFace.handStrokeWidthPx);
    expect(spec.radialWedge.outerRadiusFrac).toBe(0.95);
    expect(spec.radialWedge.innerRadiusFrac).toBe(0.55);
    expect(spec.radialWedge.sweepAngleDeg).toBe(20);
  });
});

describe("emitGlyphToRenderPlan clock styling", () => {
  const ctx = { fontRegistry: loadBundledFontAssetRegistry() };
  const layout = { cx: 120, cy: 44, size: 18 };

  it("emits line strokeWidth from style table, not hardcoded literals in emitter", () => {
    const expected = resolveHourMarkerGlyphStyle("topBandHourAnalogClock").clockFace.handStrokeWidthPx;
    const glyph = {
      kind: "clockFace" as const,
      hour: 6,
      styleId: "topBandHourAnalogClock" as const,
    };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    const line = out.find((i) => i.kind === "line");
    expect(line?.kind).toBe("line");
    if (line?.kind === "line") {
      expect(line.strokeWidthPx).toBe(expected);
    }
  });
});
