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

import { describe, expect, it, vi } from "vitest";
import { alignCrispLineX, alignCrispLineY } from "../crispLines";
import { executeRenderPlanOnCanvas } from "./canvasRenderPlanExecutor";
import {
  buildTopBandChromeBackgroundRenderPlan,
  buildTopBandInterBandSeamLinesRenderPlan,
  buildTopBandVerticalEdgeBezelRenderPlan,
} from "./topBandFixedFramingPlan";

function createMockCanvas2DContext(): CanvasRenderingContext2D {
  const c = {
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
  return c as unknown as CanvasRenderingContext2D;
}

describe("buildTopBandChromeBackgroundRenderPlan", () => {
  it("emits strip then tick-rail rects with resolved fills and geometry", () => {
    const plan = buildTopBandChromeBackgroundRenderPlan({
      topBandOriginXPx: 0,
      topBandYPx: 10,
      topBandWidthPx: 800,
      topBandHeightPx: 72,
      circleBandBottomYPx: 50,
      tickBandHeightPx: 12,
      stripBackgroundFill: "#010203",
      tickRailBackgroundFill: "#aabbcc",
    });
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0]).toMatchObject({
      kind: "rect",
      x: 0,
      y: 10,
      width: 800,
      height: 72,
      fill: "#010203",
    });
    expect(plan.items[1]).toMatchObject({
      kind: "rect",
      x: 0,
      y: 50,
      width: 800,
      height: 12,
      fill: "#aabbcc",
    });
  });

  it("omits rects when dimensions collapse to non-drawable", () => {
    expect(
      buildTopBandChromeBackgroundRenderPlan({
        topBandOriginXPx: 0,
        topBandYPx: 0,
        topBandWidthPx: 0,
        topBandHeightPx: 40,
        circleBandBottomYPx: 30,
        tickBandHeightPx: 10,
        stripBackgroundFill: "#000",
        tickRailBackgroundFill: "#111",
      }).items,
    ).toHaveLength(0);

    expect(
      buildTopBandChromeBackgroundRenderPlan({
        topBandOriginXPx: 0,
        topBandYPx: 0,
        topBandWidthPx: 100,
        topBandHeightPx: 0,
        circleBandBottomYPx: 0,
        tickBandHeightPx: 0,
        stripBackgroundFill: "#000",
        tickRailBackgroundFill: "#111",
      }).items,
    ).toHaveLength(0);
  });
});

describe("buildTopBandInterBandSeamLinesRenderPlan", () => {
  it("emits circle↔tick and tick↔zone seams with crisp Y and band span on X", () => {
    const yCircle = 48.2;
    const yTick = 60.7;
    const plan = buildTopBandInterBandSeamLinesRenderPlan({
      viewportWidthPx: 640,
      topBandOriginXPx: 3,
      circleBandBottomYPx: yCircle,
      tickZoneBoundaryYPx: yTick,
      drawTickToZoneSeam: true,
      circleToTickStroke: "rgba(1,2,3,0.1)",
      tickToZoneStroke: "rgba(4,5,6,0.2)",
      seamLineWidthPx: 1,
    });
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0]).toMatchObject({
      kind: "line",
      x1: 3,
      x2: 643,
      y1: alignCrispLineY(yCircle),
      y2: alignCrispLineY(yCircle),
      stroke: "rgba(1,2,3,0.1)",
      strokeWidthPx: 1,
    });
    expect(plan.items[1]).toMatchObject({
      kind: "line",
      x1: 3,
      x2: 643,
      y1: alignCrispLineY(yTick),
      y2: alignCrispLineY(yTick),
      stroke: "rgba(4,5,6,0.2)",
    });
  });

  it("omits tick↔zone seam when drawTickToZoneSeam is false", () => {
    const plan = buildTopBandInterBandSeamLinesRenderPlan({
      viewportWidthPx: 400,
      topBandOriginXPx: 0,
      circleBandBottomYPx: 40,
      tickZoneBoundaryYPx: 55,
      drawTickToZoneSeam: false,
      circleToTickStroke: "#aaa",
      tickToZoneStroke: "#bbb",
      seamLineWidthPx: 1,
    });
    expect(plan.items).toHaveLength(1);
  });

  it("omits circle↔tick seam when drawCircleToTickSeam is false (tick band height zero)", () => {
    const yBoundary = 52;
    const plan = buildTopBandInterBandSeamLinesRenderPlan({
      viewportWidthPx: 400,
      topBandOriginXPx: 0,
      circleBandBottomYPx: yBoundary,
      tickZoneBoundaryYPx: yBoundary,
      drawCircleToTickSeam: false,
      drawTickToZoneSeam: true,
      circleToTickStroke: "#aaa",
      tickToZoneStroke: "#bbb",
      seamLineWidthPx: 1,
    });
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({
      kind: "line",
      y1: alignCrispLineY(yBoundary),
      stroke: "#bbb",
    });
  });

  it("returns empty plan when viewport width is zero", () => {
    expect(
      buildTopBandInterBandSeamLinesRenderPlan({
        viewportWidthPx: 0,
        topBandOriginXPx: 0,
        circleBandBottomYPx: 10,
        tickZoneBoundaryYPx: 20,
        drawTickToZoneSeam: true,
        circleToTickStroke: "#000",
        tickToZoneStroke: "#111",
        seamLineWidthPx: 1,
      }).items,
    ).toHaveLength(0);
  });
});

describe("buildTopBandVerticalEdgeBezelRenderPlan", () => {
  it("emits left and right verticals at crisp X for the top-band span", () => {
    const plan = buildTopBandVerticalEdgeBezelRenderPlan({
      viewportWidthPx: 500,
      topBandOriginXPx: 0,
      topBandTopYPx: 5,
      topBandBottomYPx: 77,
      verticalEdgeStroke: "rgba(200,210,220,0.3)",
      bezelLineWidthPx: 1,
    });
    expect(plan.items).toHaveLength(2);
    const leftX = alignCrispLineX(0.5);
    const rightX = alignCrispLineX(499.5);
    expect(plan.items[0]).toMatchObject({
      kind: "line",
      x1: leftX,
      x2: leftX,
      y1: 5,
      y2: 77,
      stroke: "rgba(200,210,220,0.3)",
      strokeWidthPx: 1,
    });
    expect(plan.items[1]).toMatchObject({
      kind: "line",
      x1: rightX,
      x2: rightX,
      y1: 5,
      y2: 77,
    });
  });

  it("offsets crisp X when topBandOriginXPx is non-zero", () => {
    const ox = 12;
    const vw = 100;
    const plan = buildTopBandVerticalEdgeBezelRenderPlan({
      viewportWidthPx: vw,
      topBandOriginXPx: ox,
      topBandTopYPx: 0,
      topBandBottomYPx: 40,
      verticalEdgeStroke: "#fff",
      bezelLineWidthPx: 1,
    });
    expect(plan.items[0]).toMatchObject({
      x1: alignCrispLineX(ox + 0.5),
      x2: alignCrispLineX(ox + 0.5),
    });
    expect(plan.items[1]).toMatchObject({
      x1: alignCrispLineX(ox + vw - 0.5),
      x2: alignCrispLineX(ox + vw - 0.5),
    });
  });

  it("returns empty plan when viewport width is zero", () => {
    expect(
      buildTopBandVerticalEdgeBezelRenderPlan({
        viewportWidthPx: 0,
        topBandOriginXPx: 0,
        topBandTopYPx: 0,
        topBandBottomYPx: 10,
        verticalEdgeStroke: "#000",
        bezelLineWidthPx: 1,
      }).items,
    ).toHaveLength(0);
  });
});

describe("top-band fixed framing + executeRenderPlanOnCanvas", () => {
  it("executes rect and line primitives in plan order (background → seams → vertical bezels)", () => {
    const ctx = createMockCanvas2DContext();
    const bg = buildTopBandChromeBackgroundRenderPlan({
      topBandOriginXPx: 0,
      topBandYPx: 0,
      topBandWidthPx: 100,
      topBandHeightPx: 40,
      circleBandBottomYPx: 28,
      tickBandHeightPx: 8,
      stripBackgroundFill: "#001",
      tickRailBackgroundFill: "#002",
    });
    const seams = buildTopBandInterBandSeamLinesRenderPlan({
      viewportWidthPx: 100,
      topBandOriginXPx: 0,
      circleBandBottomYPx: 28,
      tickZoneBoundaryYPx: 36,
      drawTickToZoneSeam: true,
      circleToTickStroke: "#003",
      tickToZoneStroke: "#004",
      seamLineWidthPx: 1,
    });
    const edges = buildTopBandVerticalEdgeBezelRenderPlan({
      viewportWidthPx: 100,
      topBandOriginXPx: 0,
      topBandTopYPx: 0,
      topBandBottomYPx: 40,
      verticalEdgeStroke: "#005",
      bezelLineWidthPx: 1,
    });
    executeRenderPlanOnCanvas(ctx, bg);
    executeRenderPlanOnCanvas(ctx, seams);
    executeRenderPlanOnCanvas(ctx, edges);
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    expect(ctx.stroke).toHaveBeenCalledTimes(4);
  });
});
