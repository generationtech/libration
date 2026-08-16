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
  it("projects optional labels to text items without astronomy names", () => {
    const plan = buildEquirectRegionOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        labels: [{ latDeg: 0, lonDeg: 0, text: "Total solar eclipse" }],
      }),
    });
    const texts = plan.items.filter((item) => item.kind === "text");
    expect(texts).toHaveLength(1);
    expect(texts[0]).toMatchObject({ text: "Total solar eclipse", x: 180, y: 90 });
  });

  it("offsets a label that intersects a glyph avoid disc", () => {
    const plan = buildEquirectRegionOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        labels: [{ latDeg: 0, lonDeg: 0, text: "Total lunar eclipse" }],
        labelAvoidDiscs: [{ latDeg: 0, lonDeg: 0, haloMultiplier: 2.4 }],
      }),
    });
    const texts = plan.items.filter((item) => item.kind === "text");
    expect(texts).toHaveLength(1);
    expect(texts[0]?.kind).toBe("text");
    if (texts[0]?.kind === "text") {
      expect(texts[0].x).not.toBe(180);
      expect(texts[0].textAlign).toBe("left");
    }
  });

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

  it("projects a dateline-crossing thin corridor without a world-spanning fill", () => {
    const ring = [
      { latDeg: 8, lonDeg: 170 },
      { latDeg: 10, lonDeg: 175 },
      { latDeg: 12, lonDeg: -178 },
      { latDeg: 14, lonDeg: -170 },
      { latDeg: 12, lonDeg: -168 },
      { latDeg: 10, lonDeg: -176 },
      { latDeg: 8, lonDeg: 176 },
      { latDeg: 6, lonDeg: 172 },
      { latDeg: 8, lonDeg: 170 },
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
      expect(Math.max(...px) - Math.min(...px)).toBeLessThan(120);
    }
  });

  it("emits a circular point marker at the projected geographic center", () => {
    const plan = buildEquirectRegionOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        pointMarkers: [
          {
            latDeg: 0,
            lonDeg: 0,
            radiusScale: 1,
            fill: "rgba(212, 90, 60, 0.9600)",
            stroke: "rgba(212, 90, 60, 1.0000)",
            underStroke: "rgba(18, 26, 40, 0.88)",
            haloFill: "rgba(212, 90, 60, 0.1600)",
          },
        ],
      }),
    });
    const discs = plan.items.filter((i) => i.kind === "path2d") as RenderPath2DItem[];
    expect(discs.length).toBeGreaterThanOrEqual(3);
    const filled = discs.filter((i) => i.fill);
    expect(filled.some((i) => i.fill?.includes("212, 90, 60"))).toBe(true);
    const cx = 180;
    const cy = 90;
    const firstMove = discs.flatMap((item) =>
      item.pathKind === "descriptor"
        ? item.pathDescriptor.commands.filter((c) => c.kind === "moveTo")
        : [],
    );
    expect(firstMove.some((c) => c.kind === "moveTo" && Math.abs(c.x - cx) < 20 && Math.abs(c.y - cy) < 1)).toBe(
      true,
    );
  });

  it("places a dateline marker on the visible copy rather than inventing an opposite-side duplicate", () => {
    const plan = buildEquirectRegionOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        pointMarkers: [
          {
            latDeg: 0,
            lonDeg: 179,
            radiusScale: 1,
            fill: "rgba(212, 90, 60, 0.9600)",
            stroke: "rgba(212, 90, 60, 1.0000)",
            underStroke: "rgba(18, 26, 40, 0.88)",
          },
        ],
      }),
    });
    const discs = plan.items.filter((i) => i.kind === "path2d") as RenderPath2DItem[];
    const xsAll = discs.flatMap((item) => xs(item));
    expect(xsAll.length).toBeGreaterThan(0);
    expect(Math.max(...xsAll)).toBeGreaterThan(300);
    expect(xsAll.every((x) => x > -40 && x < 400)).toBe(true);
  });
});
