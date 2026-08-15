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
import { EQUIRECT_REGION_OVERLAY_KIND, type EquirectRegionOverlayPayload } from "../../layers/equirectRegionPayload";
import { buildEquirectRegionOverlayRenderPlan } from "./equirectRegionPlan";
import { equirectRingToPathDescriptors } from "./equirectSeamRegion";
import type { RenderPath2DItem } from "./renderPlanTypes";

function payload(partial: Partial<EquirectRegionOverlayPayload> = {}): EquirectRegionOverlayPayload {
  return {
    kind: EQUIRECT_REGION_OVERLAY_KIND,
    fills: [],
    strokes: [],
    ...partial,
  };
}

function xs(item: RenderPath2DItem): number[] {
  if (item.pathKind !== "descriptor") {
    return [];
  }
  const out: number[] = [];
  for (const c of item.pathDescriptor.commands) {
    if (c.kind === "moveTo" || c.kind === "lineTo") {
      out.push(c.x);
    }
  }
  return out;
}

describe("equirect region RenderPlan", () => {
  it("emits nothing for an empty payload", () => {
    const plan = buildEquirectRegionOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload(),
    });
    expect(plan.items).toHaveLength(0);
  });

  it("does not emit a world-spanning fill across the dateline", () => {
    const ring = [
      { latDeg: 10, lonDeg: 170 },
      { latDeg: 12, lonDeg: 175 },
      { latDeg: 12, lonDeg: -175 },
      { latDeg: 10, lonDeg: -170 },
      { latDeg: 8, lonDeg: -175 },
      { latDeg: 8, lonDeg: 175 },
      { latDeg: 10, lonDeg: 170 },
    ];
    const descriptors = equirectRingToPathDescriptors(ring, 360, 180);
    expect(descriptors.length).toBeGreaterThan(0);
    for (const d of descriptors) {
      const px: number[] = [];
      for (const c of d.commands) {
        if (c.kind === "moveTo" || c.kind === "lineTo") {
          px.push(c.x);
        }
      }
      expect(Math.max(...px) - Math.min(...px)).toBeLessThan(180);
    }
    const plan = buildEquirectRegionOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        fills: [{ ring, fill: "rgba(0,0,0,0.2)" }],
        strokes: [{ points: ring, stroke: "rgba(1,1,1,1)", strokeWidthPx: 1 }],
      }),
    });
    const filled = plan.items.filter((i) => i.kind === "path2d") as RenderPath2DItem[];
    expect(filled.length).toBeGreaterThan(0);
    for (const item of filled) {
      const x = xs(item);
      expect(Math.max(...x) - Math.min(...x)).toBeLessThan(180);
    }
  });
});
