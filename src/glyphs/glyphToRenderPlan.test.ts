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
import type { GlyphRenderable } from "./glyphTypes.ts";

describe("emitGlyphToRenderPlan", () => {
  const ctx = { fontRegistry: loadBundledFontAssetRegistry() };
  const layout = { cx: 120, cy: 44, size: 18 };

  it("uses TextGlyph letterSpacingEm override instead of hour-disk spacing when set", () => {
    const glyph: GlyphRenderable = {
      kind: "text",
      text: "X",
      role: "chromeHourPrimary",
      letterSpacingEm: 0.12,
    };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out[0]?.kind).toBe("text");
    if (out[0]?.kind === "text") {
      expect(out[0].letterSpacingEm).toBe(0.12);
    }
  });

  it("passes TextGlyph shadow to render plan text item", () => {
    const shadow = {
      color: "rgba(0,0,0,0.5)",
      blurPx: 4,
      offsetXPx: 0,
      offsetYPx: 1,
    };
    const glyph: GlyphRenderable = {
      kind: "text",
      text: "Z",
      role: "chromeZoneLabel",
      shadow,
    };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out[0]?.kind).toBe("text");
    if (out[0]?.kind === "text") {
      expect(out[0].shadow).toEqual(shadow);
    }
  });

  it("applies optional TextGlyph fill override", () => {
    const glyph: GlyphRenderable = {
      kind: "text",
      text: "A",
      role: "chromeZoneLabel",
      fill: "rgba(200, 220, 240, 0.9)",
    };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out[0]?.kind).toBe("text");
    if (out[0]?.kind === "text") {
      expect(out[0].fill).toBe("rgba(200, 220, 240, 0.9)");
    }
  });

  it("emits deterministic text primitives for TextGlyph", () => {
    const glyph: GlyphRenderable = {
      kind: "text",
      text: "12",
      role: "chromeHourPrimary",
      styleId: "topBandHourDefault",
    };
    const out: RenderPlan["items"] = [];
    const out2: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    emitGlyphToRenderPlan(glyph, layout, ctx, out2);
    expect(out).toEqual(out2);
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe("text");
    if (out[0]?.kind === "text") {
      expect(out[0].text).toBe("12");
      expect(out[0].font.assetId).toBe("zeroes-one");
      expect(out[0].font.displayName.toLowerCase()).toContain("zeroes");
      expect(out[0].font.family).toBeUndefined();
      expect(out[0].y).toBe(layout.cy);
    }
  });

  it("applies segment glyph style baselineShiftFrac to emitted y (planner cy unchanged in layout input)", () => {
    const glyph: GlyphRenderable = {
      kind: "text",
      text: "8",
      role: "chromeSegment",
      styleId: "topBandHourSegment",
    };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out[0]?.kind).toBe("text");
    if (out[0]?.kind === "text") {
      expect(out[0].y).toBeCloseTo(layout.cy + layout.size * 0.03, 8);
    }
  });

  it("applies terminal insetFrac to effective font size", () => {
    const glyph: GlyphRenderable = {
      kind: "text",
      text: "03",
      role: "chromeDenseMono",
      styleId: "topBandHourTerminal",
    };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out[0]?.kind).toBe("text");
    if (out[0]?.kind === "text") {
      const effective = layout.size * (1 - 2 * 0.06);
      expect(out[0].font.sizePx).toBeCloseTo(effective, 8);
    }
  });

  it("omitStyleTextInset uses full layout size as font size despite terminal insetFrac", () => {
    const glyph: GlyphRenderable = {
      kind: "text",
      text: "03",
      role: "chromeDenseMono",
      styleId: "topBandHourTerminal",
      omitStyleTextInset: true,
    };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out[0]?.kind).toBe("text");
    if (out[0]?.kind === "text") {
      expect(out[0].font.sizePx).toBeCloseTo(layout.size, 8);
      expect(out[0].textBaseline).toBe("alphabetic");
      expect(out[0].textMode24hGlyphCenterFromLayoutY).toBe(true);
    }
  });

  it("combines dotmatrix role letter spacing with glyph trackingPx in letterSpacingEm", () => {
    const glyph: GlyphRenderable = {
      kind: "text",
      text: "11",
      role: "chromeDotMatrix",
      styleId: "topBandHourDotMatrix",
    };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out[0]?.kind).toBe("text");
    if (out[0]?.kind === "text") {
      const fs = out[0].font.sizePx;
      const expectedEm = 0.02 + (0.25 + 0.35) / fs;
      expect(out[0].letterSpacingEm).toBeCloseTo(expectedEm, 8);
    }
  });

  it("emits path2d + line for ClockFaceGlyph", () => {
    const glyph: GlyphRenderable = { kind: "clockFace", hour: 6 };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out.map((i) => i.kind)).toEqual(["path2d", "line"]);
    const ring = out[0];
    expect(ring?.kind).toBe("path2d");
    if (ring?.kind === "path2d" && ring.pathKind === "descriptor") {
      expect(ring.pathDescriptor.commands.map((c) => c.kind)).toContain("arc");
    }
    if (out[1]?.kind === "line") {
      expect(out[1].strokeWidthPx).toBe(2);
    }
  });

  it("emits line for RadialLineGlyph with style-driven stroke", () => {
    const glyph: GlyphRenderable = { kind: "radialLine", hour: 9, styleId: "topBandHourDefault" };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe("line");
    if (out[0]?.kind === "line") {
      expect(out[0].strokeWidthPx).toBeGreaterThan(0);
      expect(out[0].lineCap).toBe("round");
    }
  });

  it("emits path2d for RadialWedgeGlyph", () => {
    const glyph: GlyphRenderable = { kind: "radialWedge", hour: 11 };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe("path2d");
    const wedge = out[0];
    if (wedge?.kind === "path2d" && wedge.pathKind === "descriptor") {
      expect(wedge.fill).toBeDefined();
      expect(wedge.pathDescriptor.commands.length).toBeGreaterThan(0);
    }
  });
});
