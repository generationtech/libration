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
import { alignCrispLineX } from "../crispLines";
import { topBandWrapOffsetsForCenteredExtent } from "../topBandWrapOffsets";
import { executeRenderPlanOnCanvas } from "./canvasRenderPlanExecutor";
import { buildTopBandPresentTimeTickRenderPlan } from "./topBandPresentTimeTickPlan";

describe("buildTopBandPresentTimeTickRenderPlan", () => {
  it("emits no items when viewport width is 0", () => {
    const plan = buildTopBandPresentTimeTickRenderPlan({
      nowX: 100,
      viewportWidthPx: 0,
      wrapHalfExtentPx: 4,
      verticalSpans: [{ yTop: 10, yBottom: 40 }],
      coreLineWidthPx: 2,
      haloLineWidthPx: 5,
      coreStroke: "#a00",
      haloStroke: "#000",
    });
    expect(plan.items).toHaveLength(0);
  });

  it("emits no lines for an inverted or flat vertical span", () => {
    const plan = buildTopBandPresentTimeTickRenderPlan({
      nowX: 50,
      viewportWidthPx: 800,
      wrapHalfExtentPx: 4,
      verticalSpans: [{ yTop: 40, yBottom: 40 }],
      coreLineWidthPx: 2,
      haloLineWidthPx: 5,
      coreStroke: "#a00",
      haloStroke: "#000",
    });
    expect(plan.items).toHaveLength(0);
  });

  it("emits halo then core for one wrap offset (two lines)", () => {
    const plan = buildTopBandPresentTimeTickRenderPlan({
      nowX: 400,
      viewportWidthPx: 800,
      wrapHalfExtentPx: 4,
      verticalSpans: [{ yTop: 20, yBottom: 50 }],
      coreLineWidthPx: 2.5,
      haloLineWidthPx: 6,
      coreStroke: "#f00",
      haloStroke: "#111",
    });
    expect(plan.items).toHaveLength(2);
    const [halo, core] = plan.items;
    expect(halo?.kind).toBe("line");
    expect(core?.kind).toBe("line");
    if (halo?.kind !== "line" || core?.kind !== "line") {
      return;
    }
    const xi = alignCrispLineX(400);
    expect(halo.x1).toBe(xi);
    expect(halo.x2).toBe(xi);
    expect(halo.y1).toBe(20);
    expect(halo.y2).toBe(50);
    expect(halo.stroke).toBe("#111");
    expect(halo.strokeWidthPx).toBe(6);
    expect(halo.lineCap).toBe("butt");
    expect(core.stroke).toBe("#f00");
    expect(core.strokeWidthPx).toBe(2.5);
    expect(core.lineCap).toBe("butt");
  });

  it("tiles wrapped duplicates with the same wrap policy as legacy strokeVerticalReferenceMeridianIndicator", () => {
    const nowX = 20;
    const vw = 800;
    const wrapHalf = 5;
    const ks = topBandWrapOffsetsForCenteredExtent(nowX, wrapHalf, vw);
    const plan = buildTopBandPresentTimeTickRenderPlan({
      nowX,
      viewportWidthPx: vw,
      wrapHalfExtentPx: wrapHalf,
      verticalSpans: [{ yTop: 0, yBottom: 10 }],
      coreLineWidthPx: 2,
      haloLineWidthPx: 5,
      coreStroke: "#c",
      haloStroke: "#h",
    });
    expect(plan.items).toHaveLength(ks.length * 2);
    let i = 0;
    for (const k of ks) {
      const xi = alignCrispLineX(nowX + k * vw);
      const halo = plan.items[i++]!;
      const core = plan.items[i++]!;
      expect(halo.kind).toBe("line");
      expect(core.kind).toBe("line");
      if (halo.kind !== "line" || core.kind !== "line") {
        continue;
      }
      expect(halo.x1).toBe(xi);
      expect(core.x1).toBe(xi);
    }
  });

  it("chains multiple vertical spans in order (tick rail then circle cap)", () => {
    const plan = buildTopBandPresentTimeTickRenderPlan({
      nowX: 100,
      viewportWidthPx: 400,
      wrapHalfExtentPx: 3,
      verticalSpans: [
        { yTop: 30, yBottom: 50 },
        { yTop: 10, yBottom: 20 },
      ],
      coreLineWidthPx: 2,
      haloLineWidthPx: 4,
      coreStroke: "#a",
      haloStroke: "#b",
    });
    expect(plan.items).toHaveLength(4);
    expect(plan.items[0]!.kind).toBe("line");
    expect(plan.items[0]!.kind === "line" && plan.items[0].y1).toBe(30);
    expect(plan.items[2]!.kind).toBe("line");
    expect(plan.items[2]!.kind === "line" && plan.items[2].y1).toBe(10);
  });
});

describe("executeRenderPlanOnCanvas present-time lines", () => {
  it("executes halo-then-core line pairs from the present-time plan", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const plan = buildTopBandPresentTimeTickRenderPlan({
      nowX: 32,
      viewportWidthPx: 64,
      wrapHalfExtentPx: 4,
      verticalSpans: [{ yTop: 8, yBottom: 56 }],
      coreLineWidthPx: 2,
      haloLineWidthPx: 5,
      coreStroke: "#f00",
      haloStroke: "#000",
    });
    executeRenderPlanOnCanvas(ctx, plan);
    expect(plan.items).toHaveLength(2);
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
  });
});
