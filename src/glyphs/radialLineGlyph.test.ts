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
import { hourToTheta, polarToCartesian } from "./glyphGeometry.ts";
import { emitGlyphToRenderPlan } from "./glyphToRenderPlan.ts";
import type { GlyphRenderable } from "./glyphTypes.ts";
import { resolveHourMarkerGlyphStyle } from "./glyphStyles.ts";

describe("hourToTheta", () => {
  it("maps civil hours 0, 3, 6, 9 to 12, 3, 6, 9 o'clock spokes (UP, RIGHT, DOWN, LEFT)", () => {
    const up = -Math.PI / 2;
    expect(hourToTheta(0)).toBeCloseTo(up, 8);
    expect(hourToTheta(12)).toBeCloseTo(up, 8);
    expect(hourToTheta(24)).toBeCloseTo(up, 8);

    expect(hourToTheta(3)).toBeCloseTo(0, 8);
    expect(hourToTheta(15)).toBeCloseTo(0, 8);

    expect(hourToTheta(6)).toBeCloseTo(Math.PI / 2, 8);

    expect(hourToTheta(9)).toBeCloseTo(Math.PI, 8);
    expect(hourToTheta(21)).toBeCloseTo(Math.PI, 8);
  });
});

describe("RadialLineGlyph emit", () => {
  const ctx = { fontRegistry: loadBundledFontAssetRegistry() };
  const layout = { cx: 100, cy: 80, size: 40 };
  const R = 40 * 0.5;
  const style = resolveHourMarkerGlyphStyle("topBandHourDefault").radialLine;
  const length = R * style.lengthRadiusFrac;

  it("line length respects style.lengthRadiusFrac", () => {
    const glyph: GlyphRenderable = { kind: "radialLine", hour: 0, styleId: "topBandHourDefault" };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe("line");
    const tip = polarToCartesian(layout.cx, layout.cy, length, hourToTheta(0));
    if (out[0]?.kind === "line") {
      expect(out[0].x1).toBe(layout.cx);
      expect(out[0].y1).toBe(layout.cy);
      expect(out[0].x2).toBeCloseTo(tip.x, 8);
      expect(out[0].y2).toBeCloseTo(tip.y, 8);
    }
  });

  it("applies stroke width and lineCap from style table", () => {
    const glyph: GlyphRenderable = { kind: "radialLine", hour: 6, styleId: "topBandHourDefault" };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    const line = out[0];
    expect(line).toMatchObject({
      kind: "line",
      strokeWidthPx: style.lineWidthPx,
      lineCap: style.lineCap,
      stroke: style.stroke,
    });
  });
});
