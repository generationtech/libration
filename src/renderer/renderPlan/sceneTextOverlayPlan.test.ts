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
import { executeRenderPlanOnCanvas } from "./canvasRenderPlanExecutor";
import { RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID } from "./renderPlanTypes";
import { buildSceneTextOverlayRenderPlan } from "./sceneTextOverlayPlan";

describe("buildSceneTextOverlayRenderPlan", () => {
  it("returns no items for non-positive viewport width", () => {
    expect(
      buildSceneTextOverlayRenderPlan({
        viewportWidthPx: 0,
        layerOpacity: 1,
        placement: "top-left",
        label: "UTC",
        primary: "12:00",
      }).items,
    ).toEqual([]);
  });

  it("emits label then primary for top-left with left alignment and UTC primary weight 600", () => {
    const vw = 800;
    const pad = Math.min(28, vw * 0.04);
    const sizeUtc = Math.min(34, Math.max(20, vw * 0.042));
    const plan = buildSceneTextOverlayRenderPlan({
      viewportWidthPx: vw,
      layerOpacity: 1,
      placement: "top-left",
      label: "UTC",
      primary: "14:32:05",
    });

    expect(plan.items).toHaveLength(2);
    const [a, b] = plan.items;
    expect(a?.kind).toBe("text");
    expect(b?.kind).toBe("text");
    if (a?.kind !== "text" || b?.kind !== "text") {
      return;
    }

    expect(a.text).toBe("UTC");
    expect(a.x).toBe(pad);
    expect(a.y).toBe(pad);
    expect(a.textAlign).toBe("left");
    expect(a.textBaseline).toBe("top");
    expect(a.font.assetId).toBe(RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID);
    expect(a.font.displayName).toBe("System UI stack");
    expect(a.font.family).toContain("system-ui");
    expect(a.font.weight).toBe(500);
    expect(a.font.sizePx).toBe(13);
    expect(a.shadow).toEqual({
      color: "rgba(0, 8, 24, 0.75)",
      blurPx: 6,
      offsetXPx: 0,
      offsetYPx: 1,
    });
    expect(a.opacity).toBe(1);

    expect(b.text).toBe("14:32:05");
    expect(b.x).toBe(pad);
    expect(b.y).toBe(pad + 20);
    expect(b.textAlign).toBe("left");
    expect(b.font.weight).toBe(600);
    expect(b.font.sizePx).toBe(sizeUtc);
    expect(b.opacity).toBe(1);
  });

  it("uses top-right anchor and weight 500 primary sizing for local placement", () => {
    const vw = 800;
    const pad = Math.min(28, vw * 0.04);
    const sizeLocal = Math.min(28, Math.max(17, vw * 0.036));
    const plan = buildSceneTextOverlayRenderPlan({
      viewportWidthPx: vw,
      layerOpacity: 0.75,
      placement: "top-right",
      label: "Local",
      primary: "09:15",
    });

    expect(plan.items).toHaveLength(2);
    const [a, b] = plan.items;
    expect(a?.kind).toBe("text");
    expect(b?.kind).toBe("text");
    if (a?.kind !== "text" || b?.kind !== "text") {
      return;
    }

    const x = vw - pad;
    expect(a.text).toBe("LOCAL");
    expect(a.x).toBe(x);
    expect(a.textAlign).toBe("right");
    expect(b.x).toBe(x);
    expect(b.textAlign).toBe("right");
    expect(b.font.weight).toBe(500);
    expect(b.font.sizePx).toBe(sizeLocal);
    expect(a.opacity).toBe(0.75);
    expect(b.opacity).toBe(0.75);
  });

  it("uppercases label text", () => {
    const plan = buildSceneTextOverlayRenderPlan({
      viewportWidthPx: 400,
      layerOpacity: 1,
      placement: "top-left",
      label: "utc",
      primary: "x",
    });
    const first = plan.items[0];
    expect(first?.kind).toBe("text");
    if (first?.kind === "text") {
      expect(first.text).toBe("UTC");
    }
  });
});

describe("executeRenderPlanOnCanvas scene text overlay", () => {
  it("issues two fillText calls for a corner overlay plan", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      fillStyle: "",
      font: "",
      textAlign: "left" as CanvasTextAlign,
      textBaseline: "alphabetic" as CanvasTextBaseline,
      letterSpacing: "0",
      fillText: vi.fn(),
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    } as unknown as CanvasRenderingContext2D;

    const plan = buildSceneTextOverlayRenderPlan({
      viewportWidthPx: 600,
      layerOpacity: 1,
      placement: "top-right",
      label: "Local",
      primary: "03:00:00",
    });

    executeRenderPlanOnCanvas(ctx, plan);
    expect(ctx.fillText).toHaveBeenCalledTimes(2);
    expect(ctx.fillText).toHaveBeenNthCalledWith(1, "LOCAL", 600 - Math.min(28, 24), Math.min(28, 24));
    expect(ctx.fillText).toHaveBeenNthCalledWith(
      2,
      "03:00:00",
      600 - Math.min(28, 24),
      Math.min(28, 24) + 20,
    );
  });
});
