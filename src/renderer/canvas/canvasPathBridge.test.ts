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
  drawRenderPath2DItemOnCanvas,
  path2DFromRenderClipPayload,
  path2DFromRenderPathDescriptor,
} from "./canvasPathBridge.ts";
import type { RenderPath2DItem } from "../renderPlan/renderPlanTypes.ts";
import { annularSectorPath2D, annularSectorPathDescriptor } from "../../glyphs/glyphGeometry.ts";

describe("canvasPathBridge", () => {
  it("drawRenderPath2DItemOnCanvas fills and strokes with lineCap butt", () => {
    const path = new Path2D();
    path.rect(0, 0, 4, 4);
    const item: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "path2d",
      path,
      fill: "#f00",
      stroke: "#00f",
      strokeWidthPx: 2,
    };
    const ctx = {
      lineCap: "",
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      fill: vi.fn(),
      stroke: vi.fn(),
    };
    drawRenderPath2DItemOnCanvas(ctx as unknown as CanvasRenderingContext2D, item);
    expect(ctx.lineCap).toBe("butt");
    expect(ctx.fillStyle).toBe("#f00");
    expect(ctx.strokeStyle).toBe("#00f");
    expect(ctx.lineWidth).toBe(2);
    expect(ctx.fill).toHaveBeenCalledWith(path);
    expect(ctx.stroke).toHaveBeenCalledWith(path);
  });

  it("clips with Path2D clip payload before drawing path", () => {
    const clipPath = new Path2D();
    const path = new Path2D();
    const item: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "path2d",
      path,
      fill: "#000",
      clip: { clipPathKind: "path2d", clipPath },
    };
    const clip = vi.fn();
    const ctx = {
      clip,
      lineCap: "butt",
      fillStyle: "",
      fill: vi.fn(),
      stroke: vi.fn(),
    };
    drawRenderPath2DItemOnCanvas(ctx as unknown as CanvasRenderingContext2D, item);
    expect(clip).toHaveBeenCalledWith(clipPath);
  });

  it("clips with descriptor clip payload (built Path2D passed to ctx.clip)", () => {
    const clipDescriptor = {
      commands: [
        { kind: "moveTo" as const, x: 0, y: 0 },
        { kind: "lineTo" as const, x: 4, y: 0 },
        { kind: "lineTo" as const, x: 4, y: 4 },
        { kind: "closePath" as const },
      ],
    };
    const builtClip = path2DFromRenderClipPayload({
      clipPathKind: "descriptor",
      clipPathDescriptor: clipDescriptor,
    });
    const path = new Path2D();
    const item: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "path2d",
      path,
      fill: "#000",
      clip: { clipPathKind: "descriptor", clipPathDescriptor: clipDescriptor },
    };
    const clip = vi.fn();
    const ctx = { clip, lineCap: "butt", fillStyle: "", fill: vi.fn(), stroke: vi.fn() };
    drawRenderPath2DItemOnCanvas(ctx as unknown as CanvasRenderingContext2D, item);
    expect(clip).toHaveBeenCalledWith(builtClip);
  });

  it("descriptor primary path with Path2D clip payload", () => {
    const clipPath = new Path2D();
    const pathDescriptor = {
      commands: [
        { kind: "moveTo" as const, x: 1, y: 1 },
        { kind: "lineTo" as const, x: 3, y: 1 },
        { kind: "lineTo" as const, x: 2, y: 3 },
        { kind: "closePath" as const },
      ],
    };
    const item: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "descriptor",
      pathDescriptor,
      fill: "#0f0",
      clip: { clipPathKind: "path2d", clipPath },
    };
    const primary = path2DFromRenderPathDescriptor(pathDescriptor);
    const clip = vi.fn();
    const ctx = { clip, lineCap: "", fillStyle: "", fill: vi.fn(), stroke: vi.fn() };
    drawRenderPath2DItemOnCanvas(ctx as unknown as CanvasRenderingContext2D, item);
    expect(clip).toHaveBeenCalledWith(clipPath);
    expect(ctx.fill).toHaveBeenCalledWith(primary);
  });

  it("path2DFromRenderPathDescriptor maps moveTo, lineTo, arc, closePath", () => {
    const desc = {
      commands: [
        { kind: "moveTo" as const, x: 10, y: 20 },
        { kind: "lineTo" as const, x: 30, y: 40 },
        {
          kind: "arc" as const,
          cx: 0,
          cy: 0,
          r: 2,
          start: 0,
          end: Math.PI / 2,
          ccw: false,
        },
        { kind: "closePath" as const },
      ],
    };
    const p = path2DFromRenderPathDescriptor(desc);
    expect(p).toBeInstanceOf(Path2D);
  });

  it("descriptor-only path2d item fills and strokes built Path2D", () => {
    const pathDescriptor = {
      commands: [
        { kind: "moveTo" as const, x: 0, y: 0 },
        { kind: "lineTo" as const, x: 4, y: 0 },
        { kind: "lineTo" as const, x: 4, y: 4 },
        { kind: "closePath" as const },
      ],
    };
    const item: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "descriptor",
      pathDescriptor,
      fill: "#0f0",
      stroke: "#f00",
      strokeWidthPx: 1,
    };
    const built = path2DFromRenderPathDescriptor(pathDescriptor);
    const ctx = {
      lineCap: "",
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      fill: vi.fn(),
      stroke: vi.fn(),
    };
    drawRenderPath2DItemOnCanvas(ctx as unknown as CanvasRenderingContext2D, item);
    expect(ctx.fill).toHaveBeenCalledWith(built);
    expect(ctx.stroke).toHaveBeenCalledWith(built);
  });

  it("annularSectorPathDescriptor encodes the same arc parameters as the SVG Path2D builder", () => {
    const cx = 50;
    const cy = 40;
    const rInner = 10;
    const rOuter = 30;
    const t0 = 0.2;
    const t1 = 0.9;
    const x0o = cx + Math.cos(t0) * rOuter;
    const y0o = cy + Math.sin(t0) * rOuter;
    const x1i = cx + Math.cos(t1) * rInner;
    const y1i = cy + Math.sin(t1) * rInner;
    const desc = annularSectorPathDescriptor(cx, cy, rInner, rOuter, t0, t1);
    expect(desc.commands.map((c) => c.kind)).toEqual(["moveTo", "arc", "lineTo", "arc", "closePath"]);
    expect(desc.commands[0]).toEqual({ kind: "moveTo", x: x0o, y: y0o });
    expect(desc.commands[1]).toMatchObject({
      kind: "arc",
      cx,
      cy,
      r: rOuter,
      start: t0,
      end: t1,
      ccw: false,
    });
    expect(desc.commands[2]).toEqual({ kind: "lineTo", x: x1i, y: y1i });
    expect(desc.commands[3]).toMatchObject({
      kind: "arc",
      cx,
      cy,
      r: rInner,
      start: t1,
      end: t0,
      ccw: true,
    });
    const svgPath = annularSectorPath2D(cx, cy, rInner, rOuter, t0, t1);
    expect(svgPath).toBeInstanceOf(Path2D);
  });
});
