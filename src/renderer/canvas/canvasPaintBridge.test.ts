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
  addRenderGradientStopsToCanvasGradient,
  applyCanvasStrokeStateForRenderLine,
  createCanvasLinearGradientFromRenderItem,
  fillCanvasRectWithRenderLinearGradient,
} from "./canvasPaintBridge.ts";
import type { RenderLineItem, RenderLinearGradientRectItem } from "../renderPlan/renderPlanTypes.ts";

describe("canvasPaintBridge", () => {
  it("addRenderGradientStopsToCanvasGradient forwards offsets and colors", () => {
    const addColorStop = vi.fn();
    const g = { addColorStop } as unknown as CanvasGradient;
    addRenderGradientStopsToCanvasGradient(g, [
      { offset: 0, color: "#111" },
      { offset: 1, color: "#222" },
    ]);
    expect(addColorStop).toHaveBeenCalledWith(0, "#111");
    expect(addColorStop).toHaveBeenCalledWith(1, "#222");
  });

  it("applyCanvasStrokeStateForRenderLine sets stroke from shared fields including lineCap when set", () => {
    const ctx = {
      strokeStyle: "",
      lineWidth: 0,
      lineCap: "butt" as CanvasLineCap,
    };
    const item: RenderLineItem = {
      kind: "line",
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1,
      stroke: "#abc",
      strokeWidthPx: 3,
      lineCap: "round",
    };
    applyCanvasStrokeStateForRenderLine(ctx as unknown as CanvasRenderingContext2D, item);
    expect(ctx.strokeStyle).toBe("#abc");
    expect(ctx.lineWidth).toBe(3);
    expect(ctx.lineCap).toBe("round");
  });

  it("applyCanvasStrokeStateForRenderLine leaves lineCap unchanged when omitted (executor default)", () => {
    const ctx = {
      strokeStyle: "",
      lineWidth: 0,
      lineCap: "round" as CanvasLineCap,
    };
    const item: RenderLineItem = {
      kind: "line",
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1,
      stroke: "#000",
      strokeWidthPx: 1,
    };
    applyCanvasStrokeStateForRenderLine(ctx as unknown as CanvasRenderingContext2D, item);
    expect(ctx.lineCap).toBe("round");
  });

  it("createCanvasLinearGradientFromRenderItem builds gradient with stops", () => {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      createLinearGradient: vi.fn(() => gradient),
    };
    const item: RenderLinearGradientRectItem = {
      kind: "linearGradientRect",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 0,
      stops: [{ offset: 0.5, color: "red" }],
    };
    const g = createCanvasLinearGradientFromRenderItem(
      ctx as unknown as CanvasRenderingContext2D,
      item,
    );
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 10, 0);
    expect(g).toBe(gradient);
    expect(gradient.addColorStop).toHaveBeenCalledWith(0.5, "red");
  });

  it("fillCanvasRectWithRenderLinearGradient assigns fillStyle and fillRect", () => {
    const gradient = {};
    const ctx = {
      createLinearGradient: vi.fn(() => gradient),
      fillStyle: "" as string | CanvasGradient,
      fillRect: vi.fn(),
    };
    const item: RenderLinearGradientRectItem = {
      kind: "linearGradientRect",
      x: 1,
      y: 2,
      width: 30,
      height: 40,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 1,
      stops: [],
    };
    fillCanvasRectWithRenderLinearGradient(ctx as unknown as CanvasRenderingContext2D, item);
    expect(ctx.fillStyle).toBe(gradient);
    expect(ctx.fillRect).toHaveBeenCalledWith(1, 2, 30, 40);
  });
});
