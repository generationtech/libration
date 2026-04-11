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
import { BOTTOM_CHROME_STYLE } from "../../config/bottomChromeStyle";
import {
  BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX,
  computeBottomHudMapFadeHeightPx,
  computeBottomHudMapFadeOverlayRect,
} from "../bottomChromeLayout";
import { executeRenderPlanOnCanvas } from "./canvasRenderPlanExecutor";
import { buildBottomHudMapFadeRenderPlan } from "./bottomHudMapFadePlan";

describe("buildBottomHudMapFadeRenderPlan", () => {
  const o = BOTTOM_CHROME_STYLE.overlay;

  it("emits a single linearGradientRect with legacy seam geometry and ordered stops when the fade band is non-empty", () => {
    const seamY = 100;
    const hudTop = 900;
    const vw = 1200;
    const vh = 1080;
    const fadeRect = computeBottomHudMapFadeOverlayRect({
      seamYPx: seamY,
      hudTopYPx: hudTop,
      viewportWidthPx: vw,
      viewportHeightPx: vh,
    });
    expect(fadeRect).not.toBeNull();

    const plan = buildBottomHudMapFadeRenderPlan({
      seamYPx: seamY,
      hudTopYPx: hudTop,
      viewportWidthPx: vw,
      viewportHeightPx: vh,
      fadeColorTop: o.mapHudBoundaryFadeColorTop,
      fadeColorBottom: o.mapHudBoundaryFadeColorBottom,
    });

    expect(plan.items.map((i) => i.kind)).toEqual(["linearGradientRect"]);
    const item = plan.items[0];
    expect(item.kind).toBe("linearGradientRect");
    if (item.kind !== "linearGradientRect") {
      return;
    }
    expect(item).toMatchObject({
      x: 0,
      y: fadeRect!.fadeTopYPx,
      width: vw,
      height: fadeRect!.heightPx,
      x1: 0,
      y1: fadeRect!.fadeTopYPx,
      x2: 0,
      y2: hudTop + BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX,
      stops: [
        { offset: 0, color: o.mapHudBoundaryFadeColorTop },
        { offset: 1, color: o.mapHudBoundaryFadeColorBottom },
      ],
    });
  });

  it("returns an empty plan when the HUD top is not below the seam (no drawable interval)", () => {
    const plan = buildBottomHudMapFadeRenderPlan({
      seamYPx: 200,
      hudTopYPx: 200,
      viewportWidthPx: 800,
      viewportHeightPx: 600,
      fadeColorTop: o.mapHudBoundaryFadeColorTop,
      fadeColorBottom: o.mapHudBoundaryFadeColorBottom,
    });
    expect(plan.items).toHaveLength(0);
  });

  it("returns an empty plan when viewport width is zero", () => {
    const plan = buildBottomHudMapFadeRenderPlan({
      seamYPx: 0,
      hudTopYPx: 500,
      viewportWidthPx: 0,
      viewportHeightPx: 800,
      fadeColorTop: o.mapHudBoundaryFadeColorTop,
      fadeColorBottom: o.mapHudBoundaryFadeColorBottom,
    });
    expect(plan.items).toHaveLength(0);
  });

  it("matches computeBottomHudMapFadeOverlayRect vertical span (fade top through HUD top)", () => {
    const seamY = 110;
    const hudTop = 880;
    const vw = 1000;
    const vh = 900;
    const rect = computeBottomHudMapFadeOverlayRect({
      seamYPx: seamY,
      hudTopYPx: hudTop,
      viewportWidthPx: vw,
      viewportHeightPx: vh,
    });
    expect(rect).not.toBeNull();
    const fadeH = computeBottomHudMapFadeHeightPx(vh);
    expect(rect!.fadeTopYPx).toBe(Math.max(seamY, hudTop - fadeH));
    expect(rect!.fadeTopYPx + rect!.heightPx).toBe(hudTop);

    const plan = buildBottomHudMapFadeRenderPlan({
      seamYPx: seamY,
      hudTopYPx: hudTop,
      viewportWidthPx: vw,
      viewportHeightPx: vh,
      fadeColorTop: "#a",
      fadeColorBottom: "#b",
    });
    const g = plan.items[0];
    expect(g.kind).toBe("linearGradientRect");
    if (g.kind !== "linearGradientRect") {
      return;
    }
    expect(g.y + g.height).toBe(hudTop);
  });
});

describe("executeRenderPlanOnCanvas bottom HUD map fade", () => {
  it("applies linearGradientRect with gradient endpoints past the HUD top (mechanical executor)", () => {
    const addColorStop = vi.fn();
    const gradient = { addColorStop };
    const createLinearGradient = vi.fn(() => gradient);
    const fillRect = vi.fn();
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      createLinearGradient,
      fillRect,
    } as unknown as CanvasRenderingContext2D;

    const seamY = 0;
    const hudTop = 40;
    const vw = 100;
    const vh = 80;
    const plan = buildBottomHudMapFadeRenderPlan({
      seamYPx: seamY,
      hudTopYPx: hudTop,
      viewportWidthPx: vw,
      viewportHeightPx: vh,
      fadeColorTop: "#f00",
      fadeColorBottom: "#00f",
    });
    expect(plan.items).toHaveLength(1);

    executeRenderPlanOnCanvas(ctx, plan);

    const fadeRect = computeBottomHudMapFadeOverlayRect({
      seamYPx: seamY,
      hudTopYPx: hudTop,
      viewportWidthPx: vw,
      viewportHeightPx: vh,
    });
    expect(fadeRect).not.toBeNull();
    expect(createLinearGradient).toHaveBeenCalledWith(
      0,
      fadeRect!.fadeTopYPx,
      0,
      hudTop + BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX,
    );
    expect(addColorStop).toHaveBeenCalledWith(0, "#f00");
    expect(addColorStop).toHaveBeenCalledWith(1, "#00f");
    expect(fillRect).toHaveBeenCalledWith(0, fadeRect!.fadeTopYPx, vw, fadeRect!.heightPx);
  });
});
