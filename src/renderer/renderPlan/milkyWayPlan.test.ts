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
import { DEFAULT_MILKY_WAY_PRESENTATION } from "../../core/milkyWayPresentation";
import type { MilkyWayGeometry, MilkyWayTaggedPoint } from "../../core/milkyWayGeometry";
import { MILKY_WAY_KIND, type MilkyWayPayload } from "../../layers/milkyWayPayload";
import { buildMilkyWayRenderPlan } from "./milkyWayPlan";

function pt(latDeg: number, lonDeg: number, night: boolean, lDeg = 0): MilkyWayTaggedPoint {
  return { latDeg, lonDeg, night, lDeg };
}

function geometry(partial: Partial<MilkyWayGeometry> = {}): MilkyWayGeometry {
  return {
    plane: [pt(10, 170, true, 0), pt(12, 176, true, 2), pt(11, -178, false, 4), pt(9, -170, false, 6)],
    northEdge: [pt(20, 170, true), pt(22, 176, true), pt(21, -178, false), pt(19, -170, false)],
    southEdge: [pt(0, 170, true), pt(2, 176, true), pt(1, -178, false), pt(-1, -170, false)],
    ribs: [
      { lDeg: 0, points: [pt(0, 170, true), pt(10, 170, true), pt(20, 170, true)] },
    ],
    galacticCenter: pt(10, 170, true, 0),
    galacticAnticenter: pt(-10, -10, false, 180),
    ...partial,
  };
}

function payload(partial: Partial<MilkyWayPayload> = {}): MilkyWayPayload {
  return {
    kind: MILKY_WAY_KIND,
    supported: true,
    presentation: DEFAULT_MILKY_WAY_PRESENTATION,
    geometry: geometry(),
    ...partial,
  };
}

describe("buildMilkyWayRenderPlan", () => {
  it("emits nothing when unsupported", () => {
    const plan = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({ supported: false, geometry: null }),
    });
    expect(plan.items).toHaveLength(0);
  });

  it("does not emit a world-spanning line across the dateline", () => {
    const plan = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload(),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines.length).toBeGreaterThan(0);
    for (const item of lines) {
      if (item.kind !== "line") {
        continue;
      }
      expect(Math.abs(item.x2 - item.x1)).toBeLessThan(180);
    }
  });

  it("draws band and ribs before the plane, then glyphs and the center label", () => {
    const plan = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        presentation: { ...DEFAULT_MILKY_WAY_PRESENTATION, galacticAnticenterEnabled: true },
      }),
    });
    const kinds = plan.items.map((item) => item.kind);
    const firstLine = kinds.indexOf("line");
    const firstPath = kinds.indexOf("path2d");
    const firstText = kinds.indexOf("text");
    expect(firstLine).toBeGreaterThanOrEqual(0);
    expect(firstPath).toBeGreaterThan(firstLine);
    expect(firstText).toBeGreaterThan(firstPath);
    expect(plan.items.filter((item) => item.kind === "text").some((t) => t.kind === "text" && t.text === "Galactic center")).toBe(
      true,
    );
  });

  it("omits the plane when disabled", () => {
    const withPlane = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload(),
    });
    const noPlane = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        presentation: {
          ...DEFAULT_MILKY_WAY_PRESENTATION,
          planeEnabled: false,
          galacticCenterEnabled: false,
          galacticCenterLabelEnabled: false,
        },
      }),
    });
    expect(noPlane.items.filter((i) => i.kind === "line").length).toBeLessThan(
      withPlane.items.filter((i) => i.kind === "line").length,
    );
  });

  it("uses a weaker day-side alpha when night emphasis is on", () => {
    const plan = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload(),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    const alphas = lines.map((item) => {
      if (item.kind !== "line") {
        return 0;
      }
      const m = /rgba\(\d+, \d+, \d+, ([0-9.]+)\)/.exec(item.stroke);
      return m ? Number(m[1]) : 0;
    });
    expect(Math.max(...alphas)).toBeGreaterThan(Math.min(...alphas) + 0.15);
  });
});
