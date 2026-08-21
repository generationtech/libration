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
import type { MilkyWayVisibilityGeometry, MilkyWayVisibilitySample } from "../../core/milkyWayVisibilityGeometry";
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
    visibility: null,
    eventLabel: null,
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

  it("draws visibility contours as lines without fill and without a world-spanning chord", () => {
    const sample = (latDeg: number, lonDeg: number, solarAltitudeDeg: number): MilkyWayVisibilitySample => ({
      latDeg,
      lonDeg,
      solarAltitudeDeg,
      moonFactor: 1,
    });
    const visibility: MilkyWayVisibilityGeometry = {
      galacticCenter: { latDeg: -29, lonDeg: 170 },
      contours: [
        {
          altitudeDeg: 60,
          points: [
            sample(-20, 165, -30),
            sample(-18, 175, -30),
            sample(-19, -175, 10),
            sample(-21, -165, 10),
            sample(-20, 165, -30),
          ],
        },
      ],
    };
    const plan = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        presentation: {
          ...DEFAULT_MILKY_WAY_PRESENTATION,
          planeEnabled: false,
          bandEnabled: false,
          ribsEnabled: false,
          galacticCenterEnabled: false,
          galacticCenterLabelEnabled: false,
          visibilityContoursEnabled: true,
        },
        visibility,
      }),
    });
    expect(plan.items.some((item) => item.kind === "rasterPatch")).toBe(false);
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines.length).toBeGreaterThan(0);
    for (const item of lines) {
      if (item.kind !== "line") {
        continue;
      }
      expect(Math.abs(item.x2 - item.x1)).toBeLessThan(180);
    }
    expect(plan.items.some((item) => item.kind === "text" && item.text === "60°")).toBe(true);
    const unlabeled = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        presentation: {
          ...DEFAULT_MILKY_WAY_PRESENTATION,
          planeEnabled: false,
          bandEnabled: false,
          ribsEnabled: false,
          galacticCenterEnabled: false,
          galacticCenterLabelEnabled: false,
          visibilityContoursEnabled: true,
          showVisibilityContourLabels: false,
        },
        visibility,
      }),
    });
    const unlabeledLines = unlabeled.items.filter((item) => item.kind === "line");
    expect(unlabeledLines.length).toBe(lines.length);
    expect(unlabeled.items.some((item) => item.kind === "text" && /\d+°/.test(item.text))).toBe(false);
  });

  it("places a viewing-event label from Galactic-center subpoint even without ribbon geometry", () => {
    const plan = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        geometry: null,
        presentation: {
          ...DEFAULT_MILKY_WAY_PRESENTATION,
          planeEnabled: false,
          bandEnabled: false,
          ribsEnabled: false,
          galacticCenterEnabled: false,
          galacticCenterLabelEnabled: false,
        },
        eventLabel: {
          text: "Knoxville · Milky Way · in 2d",
          latDeg: -29,
          lonDeg: 170,
          lifecycle: "upcoming",
          cityName: "Knoxville",
          windowId: "milky-way:city.knoxville:1",
          peakUtcMs: Date.UTC(2026, 7, 20, 2, 27, 16),
        },
      }),
    });
    const texts = plan.items.filter((item) => item.kind === "text");
    expect(texts.some((item) => item.kind === "text" && item.text === "Knoxville · Milky Way · in 2d")).toBe(
      true,
    );
  });

  it("draws viewing-footprint rings as strokes without fill", () => {
    const plan = buildMilkyWayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        geometry: null,
        presentation: {
          ...DEFAULT_MILKY_WAY_PRESENTATION,
          planeEnabled: false,
          bandEnabled: false,
          ribsEnabled: false,
          galacticCenterEnabled: false,
          galacticCenterLabelEnabled: false,
          viewingEventsEnabled: true,
          showViewingFootprint: true,
          viewingFootprintColor: "#c97ba8",
        },
        viewingFootprintRings: [
          [
            { latDeg: 10, lonDeg: -90 },
            { latDeg: 20, lonDeg: -80 },
            { latDeg: 10, lonDeg: -70 },
            { latDeg: 10, lonDeg: -90 },
          ],
        ],
      }),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines.length).toBeGreaterThan(0);
    expect(plan.items.every((item) => item.kind === "line")).toBe(true);
    expect(lines.every((item) => item.kind === "line" && item.stroke.includes("201"))).toBe(true);
    expect(plan.items.some((item) => item.kind === "rasterPatch" || item.kind === "radialGradientFill")).toBe(
      false,
    );
  });
});
