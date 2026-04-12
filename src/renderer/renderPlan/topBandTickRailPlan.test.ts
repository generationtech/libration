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
import { DEFAULT_DISPLAY_TIME_CONFIG } from "../../config/appConfig";
import {
  buildUtcTopScaleLayout,
  resolveTopBandTimeFromConfig,
  topBandTickRailMajorTickVerticalSpan,
} from "../displayChrome";
import { topBandWrapOffsetsForCenteredExtent } from "../topBandWrapOffsets";
import { executeRenderPlanOnCanvas } from "./canvasRenderPlanExecutor";
import { buildTopBandTickRailRenderPlan, topBandTickRailVerticalTickBottomY } from "./topBandTickRailPlan";

const RESOLVED_UTC_UTC24 = resolveTopBandTimeFromConfig({
  ...DEFAULT_DISPLAY_TIME_CONFIG,
  referenceTimeZone: { source: "fixed", timeZone: "UTC" },
  topBandMode: "utc24",
  topBandAnchor: { mode: "auto" },
});

function expectedTickRailLineCount(
  vw: number,
  minorXs: readonly number[],
  quarterXs: readonly number[],
  majorXs: readonly number[],
): number {
  let n = 1; // baseline
  for (const xs of [minorXs, quarterXs, majorXs]) {
    for (const x of xs) {
      n += topBandWrapOffsetsForCenteredExtent(x, 1, vw).length;
    }
  }
  return n;
}

describe("buildTopBandTickRailRenderPlan", () => {
  it("emits no items when viewport width is 0", () => {
    const plan = buildTopBandTickRailRenderPlan({
      viewportWidthPx: 0,
      baselineX0: 0,
      baselineX1: 800,
      tickBaselineY: 100,
      minorTickTopY: 90,
      quarterMajorTickTopY: 50,
      majorTickTopY: 20,
      quarterMinorTickXs: [10],
      quarterMajorTickXs: [20],
      majorBoundaryXs: [30],
      baselineStroke: "#a",
      baselineStrokeWidthPx: 1,
      tickStroke: "#b",
      tickStrokeWidthPx: 2,
    });
    expect(plan.items).toHaveLength(0);
  });

  it("draws baseline then quarter-minor, quarter-major, and hour ticks in order", () => {
    const plan = buildTopBandTickRailRenderPlan({
      viewportWidthPx: 800,
      baselineX0: 0,
      baselineX1: 800,
      tickBaselineY: 200,
      minorTickTopY: 180,
      quarterMajorTickTopY: 120,
      majorTickTopY: 40,
      quarterMinorTickXs: [100],
      quarterMajorTickXs: [300],
      majorBoundaryXs: [500],
      baselineStroke: "rgba(1,2,3,0.1)",
      baselineStrokeWidthPx: 0.78,
      tickStroke: "rgba(9,9,9,0.88)",
      tickStrokeWidthPx: 1.2,
    });
    expect(plan.items.length).toBe(4);
    const [base, minor, quarter, major] = plan.items;
    expect(base?.kind).toBe("line");
    expect(minor?.kind).toBe("line");
    expect(quarter?.kind).toBe("line");
    expect(major?.kind).toBe("line");
    if (
      base?.kind !== "line" ||
      minor?.kind !== "line" ||
      quarter?.kind !== "line" ||
      major?.kind !== "line"
    ) {
      return;
    }
    expect(base.y1).toBe(alignCrispLineY(200));
    expect(base.y2).toBe(alignCrispLineY(200));
    expect(base.strokeWidthPx).toBe(0.78);
    const tickBottom = topBandTickRailVerticalTickBottomY(200);
    expect(minor.y2).toBe(tickBottom);
    expect(quarter.y2).toBe(tickBottom);
    expect(major.y2).toBe(tickBottom);
    expect(minor.y1).toBe(180);
    expect(quarter.y1).toBe(120);
    expect(major.y1).toBe(40);
    expect(minor.strokeWidthPx).toBe(1.2);
    expect(quarter.strokeWidthPx).toBe(1.2);
    expect(major.strokeWidthPx).toBe(1.2);
  });

  it("matches full-layout tick counts with wrap expansion (192 + 72 + 25 verticals + baseline)", () => {
    const w = 1920;
    const t = Date.UTC(2024, 0, 1, 12, 0, 0);
    const layout = buildUtcTopScaleLayout(t, w, 80, RESOLVED_UTC_UTC24);
    const rows = layout.rows!;
    const yCircleBottom = rows.circleBandH;
    const { tickBaselineY, majorTickTopY } = topBandTickRailMajorTickVerticalSpan(yCircleBottom, rows.tickBandH);
    const tickH = rows.tickBandH;
    const minorTickTopY = tickBaselineY - tickH * 0.28;
    const quarterTickTopY = tickBaselineY - tickH * 0.67;

    const plan = buildTopBandTickRailRenderPlan({
      viewportWidthPx: w,
      baselineX0: 0,
      baselineX1: w,
      tickBaselineY,
      minorTickTopY,
      quarterMajorTickTopY: quarterTickTopY,
      majorTickTopY,
      quarterMinorTickXs: layout.quarterMinorTickXs,
      quarterMajorTickXs: layout.quarterMajorTickXs,
      majorBoundaryXs: layout.majorBoundaryXs,
      baselineStroke: "#b",
      baselineStrokeWidthPx: 1,
      tickStroke: "#t",
      tickStrokeWidthPx: 1,
    });

    const expected = expectedTickRailLineCount(
      w,
      layout.quarterMinorTickXs,
      layout.quarterMajorTickXs,
      layout.majorBoundaryXs,
    );
    expect(plan.items).toHaveLength(expected);
    expect(layout.quarterMinorTickXs).toHaveLength(192);
    expect(layout.quarterMajorTickXs).toHaveLength(72);
    expect(layout.majorBoundaryXs).toHaveLength(25);
  });

  it("uses crisp X alignment for wrapped duplicates near the seam", () => {
    const vw = 800;
    /** Fractional x near the left edge so both k=0 and k=1 intersect the strip (period tiling). */
    const xNearSeam = 0.25;
    const plan = buildTopBandTickRailRenderPlan({
      viewportWidthPx: vw,
      baselineX0: 0,
      baselineX1: vw,
      tickBaselineY: 100,
      minorTickTopY: 80,
      quarterMajorTickTopY: 50,
      majorTickTopY: 10,
      quarterMinorTickXs: [xNearSeam],
      quarterMajorTickXs: [],
      majorBoundaryXs: [],
      baselineStroke: "#b",
      baselineStrokeWidthPx: 1,
      tickStroke: "#t",
      tickStrokeWidthPx: 1,
    });
    const ks = topBandWrapOffsetsForCenteredExtent(xNearSeam, 1, vw);
    expect(ks.length).toBeGreaterThan(1);
    let idx = 1;
    for (const k of ks) {
      const line = plan.items[idx++];
      expect(line?.kind).toBe("line");
      if (line?.kind !== "line") {
        continue;
      }
      const xi = alignCrispLineX(xNearSeam + k * vw);
      expect(line.x1).toBe(xi);
      expect(line.x2).toBe(xi);
    }
  });

  it("resolves vertical tick bottom Y with topBandTickRailVerticalTickBottomY (same as horizontal baseline center)", () => {
    const tickBaselineY = 88.37;
    expect(topBandTickRailVerticalTickBottomY(tickBaselineY)).toBe(alignCrispLineY(tickBaselineY));
  });
});

describe("executeRenderPlanOnCanvas tick-rail lines", () => {
  it("executes one baseline stroke and one stroke per vertical line item", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const plan = buildTopBandTickRailRenderPlan({
      viewportWidthPx: 400,
      baselineX0: 0,
      baselineX1: 400,
      tickBaselineY: 88,
      minorTickTopY: 70,
      quarterMajorTickTopY: 40,
      majorTickTopY: 10,
      quarterMinorTickXs: [50, 150],
      quarterMajorTickXs: [200],
      majorBoundaryXs: [300],
      baselineStroke: "#b",
      baselineStrokeWidthPx: 0.5,
      tickStroke: "#c",
      tickStrokeWidthPx: 1.1,
    });
    executeRenderPlanOnCanvas(ctx, plan);
    expect(plan.items).toHaveLength(5);
    expect(ctx.stroke).toHaveBeenCalledTimes(5);
  });
});
