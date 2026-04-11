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
import {
  meridianLongitudesDegForEquirectGrid,
  parallelLatitudesDegForEquirectGrid,
  parallelYFromLatitudeDeg,
} from "../../core/equirectangularGridSampling";
import { mapXFromLongitudeDeg } from "../../core/equirectangularProjection";
import { executeRenderPlanOnCanvas } from "./canvasRenderPlanExecutor";
import { buildEquirectangularGridOverlayRenderPlan } from "./equirectGridOverlayPlan";

describe("buildEquirectangularGridOverlayRenderPlan", () => {
  it("returns no items for non-positive viewport dimensions", () => {
    expect(
      buildEquirectangularGridOverlayRenderPlan({
        viewportWidthPx: 0,
        viewportHeightPx: 400,
        meridianStepDeg: 30,
        parallelStepDeg: 30,
        layerOpacity: 1,
      }).items,
    ).toEqual([]);
    expect(
      buildEquirectangularGridOverlayRenderPlan({
        viewportWidthPx: 800,
        viewportHeightPx: 0,
        meridianStepDeg: 30,
        parallelStepDeg: 30,
        layerOpacity: 1,
      }).items,
    ).toEqual([]);
  });

  it("emits meridians then parallels with major strokes at lon 0 and lat 0", () => {
    const w = 720;
    const h = 360;
    const meridianStepDeg = 30;
    const parallelStepDeg = 30;
    const plan = buildEquirectangularGridOverlayRenderPlan({
      viewportWidthPx: w,
      viewportHeightPx: h,
      meridianStepDeg,
      parallelStepDeg,
      layerOpacity: 1,
    });

    const lons = meridianLongitudesDegForEquirectGrid(meridianStepDeg);
    const lats = parallelLatitudesDegForEquirectGrid(parallelStepDeg);
    expect(plan.items.length).toBe(lons.length + lats.length);

    const lineMinor = "rgba(220, 230, 255, 0.07)";
    const lineMajor = "rgba(235, 242, 255, 0.16)";

    let idx = 0;
    for (const lon of lons) {
      const item = plan.items[idx++];
      expect(item?.kind).toBe("line");
      if (item?.kind !== "line") {
        return;
      }
      const x = mapXFromLongitudeDeg(lon, w);
      expect(item.x1).toBe(x);
      expect(item.x2).toBe(x);
      expect(item.y1).toBe(0);
      expect(item.y2).toBe(h);
      expect(item.stroke).toBe(lon === 0 ? lineMajor : lineMinor);
      expect(item.strokeWidthPx).toBe(1);
    }

    for (const lat of lats) {
      const item = plan.items[idx++];
      expect(item?.kind).toBe("line");
      if (item?.kind !== "line") {
        return;
      }
      const y = parallelYFromLatitudeDeg(lat, h);
      expect(item.x1).toBe(0);
      expect(item.x2).toBe(w);
      expect(item.y1).toBe(y);
      expect(item.y2).toBe(y);
      expect(item.stroke).toBe(lat === 0 ? lineMajor : lineMinor);
      expect(item.strokeWidthPx).toBe(1);
    }
  });

  it("scales rgba alphas by layer opacity (matches legacy stroke alpha formula)", () => {
    const plan = buildEquirectangularGridOverlayRenderPlan({
      viewportWidthPx: 100,
      viewportHeightPx: 50,
      meridianStepDeg: 180,
      parallelStepDeg: 90,
      layerOpacity: 0.5,
    });
    const minor = plan.items.find(
      (i) => i.kind === "line" && i.stroke.includes("220, 230, 255"),
    );
    const majorLon = plan.items.find(
      (i) =>
        i.kind === "line" &&
        i.stroke.includes("235, 242, 255") &&
        i.x1 === i.x2,
    );
    expect(minor?.kind).toBe("line");
    expect(majorLon?.kind).toBe("line");
    if (minor?.kind === "line") {
      expect(minor.stroke).toBe("rgba(220, 230, 255, 0.035)");
    }
    if (majorLon?.kind === "line") {
      expect(majorLon.stroke).toBe("rgba(235, 242, 255, 0.08)");
    }
  });
});

describe("executeRenderPlanOnCanvas equirect grid overlay lines", () => {
  it("issues one stroke per line item", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      strokeStyle: "",
      lineWidth: 1,
      lineCap: "butt",
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const plan = buildEquirectangularGridOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      meridianStepDeg: 90,
      parallelStepDeg: 90,
      layerOpacity: 1,
    });

    executeRenderPlanOnCanvas(ctx, plan);
    expect(ctx.stroke).toHaveBeenCalledTimes(plan.items.length);
  });
});
