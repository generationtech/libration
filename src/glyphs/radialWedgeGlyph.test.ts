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
import { hourToTheta } from "./glyphGeometry.ts";
import { emitGlyphToRenderPlan } from "./glyphToRenderPlan.ts";
import type { GlyphRenderable } from "./glyphTypes.ts";
import { resolveHourMarkerGlyphStyle } from "./glyphStyles.ts";

describe("RadialWedgeGlyph geometry policy", () => {
  const rw = resolveHourMarkerGlyphStyle("topBandHourDefault").radialWedge;
  const halfSweepRad = (rw.sweepAngleDeg * Math.PI) / 180 / 2;

  it("wedge is centered on hourToTheta(hour) with symmetric sweep", () => {
    for (const hour of [0, 3, 6, 9, 14, 22]) {
      const theta = hourToTheta(hour);
      const t0 = theta - halfSweepRad;
      const t1 = theta + halfSweepRad;
      expect((t0 + t1) / 2).toBeCloseTo(theta, 8);
      expect(t1 - t0).toBeCloseTo(2 * halfSweepRad, 8);
    }
  });
});

describe("RadialWedgeGlyph emit", () => {
  const ctx = { fontRegistry: loadBundledFontAssetRegistry() };
  const layout = { cx: 120, cy: 44, size: 18 };

  it("emits a single path2d with fill and optional stroke from style", () => {
    const glyph: GlyphRenderable = { kind: "radialWedge", hour: 4, styleId: "topBandHourDefault" };
    const out: RenderPlan["items"] = [];
    emitGlyphToRenderPlan(glyph, layout, ctx, out);
    expect(out).toHaveLength(1);
    const spec = resolveHourMarkerGlyphStyle("topBandHourDefault").radialWedge;
    expect(out[0]).toMatchObject({
      kind: "path2d",
      pathKind: "descriptor",
      fill: spec.fill,
      stroke: spec.stroke,
      strokeWidthPx: spec.strokeWidthPx,
    });
  });
});
