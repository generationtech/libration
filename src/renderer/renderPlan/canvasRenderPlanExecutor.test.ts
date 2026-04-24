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

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getGammaAdjustedCanvasForImage } from "../canvas/canvasGammaRasterCache.ts";
import { executeRenderPlanOnCanvas } from "./canvasRenderPlanExecutor";
import type { RenderFontStyle, RenderPlan } from "./renderPlanTypes";

vi.mock("../canvas/canvasGammaRasterCache.ts", () => ({
  getGammaAdjustedCanvasForImage: vi.fn().mockReturnValue(null),
}));

/** Minimal valid font for executor tests — explicit `family` pins Canvas string (bridge bypasses displayName). */
function testCanvasFont(overrides: Partial<RenderFontStyle> & Pick<RenderFontStyle, "sizePx" | "weight">): RenderFontStyle {
  return {
    assetId: "test-font-asset",
    displayName: "Test Font",
    family: "sans-serif",
    style: "normal",
    ...overrides,
  };
}

/** Minimal 2D context mock — happy-dom canvas lacks full CanvasRenderingContext2D. */
function createMockCanvas2DContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() };
  const c = {
    save: vi.fn(),
    restore: vi.fn(),
    globalAlpha: 1,
    filter: "none",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    textAlign: "start",
    textBaseline: "alphabetic",
    fillStyle: "",
    strokeStyle: "",
    font: "",
    letterSpacing: "",
    lineWidth: 1,
    lineCap: "butt",
    fillText: vi.fn(),
    strokeText: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    arc: vi.fn(),
    clip: vi.fn(),
  };
  return c as unknown as CanvasRenderingContext2D;
}

describe("executeRenderPlanOnCanvas", () => {
  beforeEach(() => {
    vi.mocked(getGammaAdjustedCanvasForImage).mockReturnValue(null);
  });

  it("draws text items with shadow, font, and alignment applied", () => {
    const ctx = createMockCanvas2DContext();

    const plan: RenderPlan = {
      items: [
        {
          kind: "text",
          x: 10,
          y: 20,
          text: "hello",
          fill: "rgba(255, 0, 0, 0.5)",
          font: testCanvasFont({ sizePx: 14, weight: 600 }),
          textAlign: "left",
          textBaseline: "middle",
          shadow: {
            color: "rgba(0,0,0,0.8)",
            blurPx: 4,
            offsetXPx: 0,
            offsetYPx: 1,
          },
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).toHaveBeenCalledWith("hello", 10, 20);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("draws stroked text outline before fill when stroke is set", () => {
    const ctx = createMockCanvas2DContext();

    const plan: RenderPlan = {
      items: [
        {
          kind: "text",
          x: 5,
          y: 6,
          text: "Tokyo",
          fill: "rgba(240, 240, 250, 0.94)",
          font: testCanvasFont({ sizePx: 12, weight: 500 }),
          textAlign: "left",
          textBaseline: "top",
          stroke: {
            color: "rgba(0, 0, 0, 0.85)",
            widthPx: 3,
            lineJoin: "round",
            miterLimit: 2,
          },
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.strokeText).toHaveBeenCalledTimes(1);
    expect(ctx.strokeText).toHaveBeenCalledWith("Tokyo", 5, 6);
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).toHaveBeenCalledWith("Tokyo", 5, 6);
  });

  it("draws rect fill and line stroke mechanically", () => {
    const ctx = createMockCanvas2DContext();

    const plan: RenderPlan = {
      items: [
        {
          kind: "rect",
          x: 1,
          y: 2,
          width: 10,
          height: 20,
          fill: "#112233",
        },
        {
          kind: "line",
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 50,
          stroke: "#abcdef",
          strokeWidthPx: 2,
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.fillRect).toHaveBeenCalledWith(1, 2, 10, 20);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 50);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("applies line lineCap from shared RenderLineItem when set", () => {
    const ctx = createMockCanvas2DContext();

    const plan: RenderPlan = {
      items: [
        {
          kind: "line",
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 0,
          stroke: "#000",
          strokeWidthPx: 2,
          lineCap: "square",
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.lineCap).toBe("square");
  });

  it("runs band plate rect before text when both appear in plan order", () => {
    const ctx = createMockCanvas2DContext();

    const plan: RenderPlan = {
      items: [
        {
          kind: "rect",
          x: 0,
          y: 100,
          width: 200,
          height: 40,
          fill: "rgba(0, 0, 0, 0)",
        },
        {
          kind: "text",
          x: 10,
          y: 120,
          text: "t",
          fill: "#fff",
          font: testCanvasFont({ sizePx: 12, weight: 400 }),
          textAlign: "left",
          textBaseline: "middle",
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.fillRect).toHaveBeenCalledBefore(ctx.fillText as unknown as Mock);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 100, 200, 40);
    expect(ctx.fillText).toHaveBeenCalledWith("t", 10, 120);
  });

  it("draws path2d fill and stroke when both are set", () => {
    const ctx = createMockCanvas2DContext();
    const p = new Path2D();
    p.rect(1, 2, 3, 4);

    const plan: RenderPlan = {
      items: [
        {
          kind: "path2d",
          pathKind: "path2d",
          path: p,
          fill: "#00a",
          stroke: "#bcd",
          strokeWidthPx: 1.15,
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.fill).toHaveBeenCalledTimes(1);
    expect(ctx.fill).toHaveBeenCalledWith(p);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    expect(ctx.stroke).toHaveBeenCalledWith(p);
  });

  it("draws path2d from descriptor payload", () => {
    const ctx = createMockCanvas2DContext();
    const pathDescriptor = {
      commands: [
        { kind: "moveTo" as const, x: 0, y: 0 },
        { kind: "lineTo" as const, x: 10, y: 0 },
        { kind: "lineTo" as const, x: 10, y: 10 },
        { kind: "closePath" as const },
      ],
    };
    const plan: RenderPlan = {
      items: [
        {
          kind: "path2d",
          pathKind: "descriptor",
          pathDescriptor,
          fill: "#00a",
          stroke: "#bcd",
          strokeWidthPx: 2,
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.fill).toHaveBeenCalledTimes(1);
    expect((ctx.fill as Mock).mock.calls[0]![0]).toBeInstanceOf(Path2D);
    expect(ctx.fillStyle).toBe("#00a");
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    expect((ctx.stroke as Mock).mock.calls[0]![0]).toBeInstanceOf(Path2D);
    expect(ctx.strokeStyle).toBe("#bcd");
    expect(ctx.lineWidth).toBe(2);
  });

  it("draws linearGradientRect with createLinearGradient, stops, and fillRect", () => {
    const ctx = createMockCanvas2DContext();

    const plan: RenderPlan = {
      items: [
        {
          kind: "linearGradientRect",
          x: 0,
          y: 10,
          width: 100,
          height: 8,
          x1: 0,
          y1: 10,
          x2: 0,
          y2: 18,
          stops: [
            { offset: 0, color: "#111" },
            { offset: 1, color: "#222" },
          ],
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 10, 0, 18);
    const grad = (ctx.createLinearGradient as Mock).mock.results[0].value as {
      addColorStop: Mock;
    };
    expect(grad.addColorStop).toHaveBeenCalledWith(0, "#111");
    expect(grad.addColorStop).toHaveBeenCalledWith(1, "#222");
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 10, 100, 8);
  });

  it("draws radialGradientFill with createRadialGradient, clip, and fillRect", () => {
    const ctx = createMockCanvas2DContext();
    const gradient = { addColorStop: vi.fn() };
    (ctx.createRadialGradient as Mock).mockReturnValue(gradient);

    const plan: RenderPlan = {
      items: [
        {
          kind: "radialGradientFill",
          x0: 10,
          y0: 20,
          r0: 2,
          x1: 10,
          y1: 20,
          r1: 40,
          stops: [
            { offset: 0, color: "#abc" },
            { offset: 1, color: "#def" },
          ],
          clipCx: 10,
          clipCy: 20,
          clipR: 40,
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.createRadialGradient).toHaveBeenCalledWith(10, 20, 2, 10, 20, 40);
    expect(gradient.addColorStop).toHaveBeenCalledWith(0, "#abc");
    expect(gradient.addColorStop).toHaveBeenCalledWith(1, "#def");
    expect(ctx.arc).toHaveBeenCalledWith(10, 20, 40, 0, Math.PI * 2);
    expect(ctx.clip).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("applies Path2D clip payload before path2d fill", () => {
    const ctx = createMockCanvas2DContext();
    const clipP = new Path2D();
    const fillP = new Path2D();
    fillP.rect(0, 0, 4, 4);

    const plan: RenderPlan = {
      items: [
        {
          kind: "path2d",
          pathKind: "path2d",
          path: fillP,
          fill: "#123",
          clip: { clipPathKind: "path2d", clipPath: clipP },
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.clip).toHaveBeenCalledWith(clipP);
    expect(ctx.fill).toHaveBeenCalledWith(fillP);
  });

  it("applies descriptor clip payload before path2d fill (descriptor primary path)", () => {
    const ctx = createMockCanvas2DContext();
    const pathDescriptor = {
      commands: [
        { kind: "moveTo" as const, x: 0, y: 0 },
        { kind: "lineTo" as const, x: 10, y: 0 },
        { kind: "lineTo" as const, x: 5, y: 8 },
        { kind: "closePath" as const },
      ],
    };
    const clipDescriptor = {
      commands: [
        { kind: "moveTo" as const, x: -1, y: -1 },
        { kind: "lineTo" as const, x: 11, y: -1 },
        { kind: "lineTo" as const, x: 11, y: 9 },
        { kind: "lineTo" as const, x: -1, y: 9 },
        { kind: "closePath" as const },
      ],
    };

    const plan: RenderPlan = {
      items: [
        {
          kind: "path2d",
          pathKind: "descriptor",
          pathDescriptor,
          fill: "#abc",
          clip: { clipPathKind: "descriptor", clipPathDescriptor: clipDescriptor },
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.clip).toHaveBeenCalled();
    const clipArg = (ctx.clip as Mock).mock.calls[0]![0];
    expect(clipArg).toBeInstanceOf(Path2D);
    expect(ctx.fill).toHaveBeenCalledTimes(1);
    expect((ctx.fill as Mock).mock.calls[0]![0]).toBeInstanceOf(Path2D);
  });

  it("draws rasterPatch via offscreen canvas putImageData and drawImage upscale", () => {
    const putImageData = vi.fn();
    const drawImage = vi.fn();
    const subCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        createImageData: (w: number, h: number) => {
          const data = new Uint8ClampedArray(w * h * 4);
          return { data, width: w, height: h };
        },
        putImageData,
      })),
    };
    vi.stubGlobal("document", {
      createElement: (tag: string) => {
        if (tag === "canvas") {
          return subCanvas;
        }
        throw new Error(`unexpected element ${tag}`);
      },
    });

    const ctx = createMockCanvas2DContext();
    Object.assign(ctx, { drawImage });

    const w = 4;
    const h = 3;
    const rgba = new Uint8ClampedArray(w * h * 4);
    rgba[3] = 200;

    const plan: RenderPlan = {
      items: [
        {
          kind: "rasterPatch",
          x: 0,
          y: 0,
          destWidth: 80,
          destHeight: 60,
          widthPx: w,
          heightPx: h,
          rgba,
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(subCanvas.getContext).toHaveBeenCalledWith("2d");
    expect(putImageData).toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledWith(subCanvas, 0, 0, w, h, 0, 0, 80, 60);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("skips rasterPatch when buffer length does not match dimensions", () => {
    vi.stubGlobal("document", {
      createElement: vi.fn(() => {
        throw new Error("should not allocate");
      }),
    });
    const ctx = createMockCanvas2DContext();

    const plan: RenderPlan = {
      items: [
        {
          kind: "rasterPatch",
          x: 0,
          y: 0,
          destWidth: 10,
          destHeight: 10,
          widthPx: 2,
          heightPx: 2,
          rgba: new Uint8ClampedArray(4),
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.drawImage).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("draws imageBlit via resolveRasterImage and drawImage with destination rect", () => {
    const ctx = createMockCanvas2DContext();
    const fakeImg = {} as HTMLImageElement;
    const resolveRasterImage = vi.fn(() => fakeImg);

    const plan: RenderPlan = {
      items: [
        {
          kind: "imageBlit",
          src: "/maps/world.jpg",
          x: 0,
          y: 0,
          width: 640,
          height: 360,
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan, { resolveRasterImage });

    expect(resolveRasterImage).toHaveBeenCalledWith("/maps/world.jpg");
    expect(ctx.drawImage).toHaveBeenCalledWith(fakeImg, 0, 0, 640, 360);
  });

  it("applies cssFilter on the context for imageBlit, then restores previous filter", () => {
    const ctx = createMockCanvas2DContext();
    (ctx as unknown as { filter: string }).filter = "blur(1px)";
    const fakeImg = {} as HTMLImageElement;
    const filterWhenDrawImageRuns: string[] = [];
    (ctx.drawImage as Mock).mockImplementation(() => {
      filterWhenDrawImageRuns.push((ctx as unknown as { filter: string }).filter);
    });

    const plan: RenderPlan = {
      items: [
        {
          kind: "imageBlit",
          src: "/maps/world.jpg",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          cssFilter: "brightness(1.1) contrast(0.95)",
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan, { resolveRasterImage: () => fakeImg });

    expect(filterWhenDrawImageRuns).toEqual(["brightness(1.1) contrast(0.95)"]);
    expect((ctx as unknown as { filter: string }).filter).toBe("blur(1px)");
  });

  it("skips imageBlit when resolveRasterImage returns null", () => {
    const ctx = createMockCanvas2DContext();

    const plan: RenderPlan = {
      items: [
        {
          kind: "imageBlit",
          src: "/maps/missing.jpg",
          x: 0,
          y: 0,
          width: 100,
          height: 50,
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan, { resolveRasterImage: () => null });

    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("skips imageBlit when no resolveRasterImage is provided", () => {
    const ctx = createMockCanvas2DContext();

    const plan: RenderPlan = {
      items: [
        {
          kind: "imageBlit",
          src: "/maps/world.jpg",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan);

    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("skips imageBlit when destination width or height is non-positive", () => {
    const ctx = createMockCanvas2DContext();
    const fakeImg = {} as HTMLImageElement;

    executeRenderPlanOnCanvas(
      ctx,
      {
        items: [
          {
            kind: "imageBlit",
            src: "/a.jpg",
            x: 0,
            y: 0,
            width: 0,
            height: 10,
          },
        ],
      },
      { resolveRasterImage: () => fakeImg },
    );
    executeRenderPlanOnCanvas(
      ctx,
      {
        items: [
          {
            kind: "imageBlit",
            src: "/b.jpg",
            x: 0,
            y: 0,
            width: 5,
            height: -1,
          },
        ],
      },
      { resolveRasterImage: () => fakeImg },
    );

    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("imageBlit with default gamma does not call the gamma cache helper", () => {
    const ctx = createMockCanvas2DContext();
    const fakeImg = {} as HTMLImageElement;
    const plan: RenderPlan = {
      items: [
        {
          kind: "imageBlit",
          src: "/maps/world.jpg",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ],
    };
    executeRenderPlanOnCanvas(ctx, plan, { resolveRasterImage: () => fakeImg });
    expect(getGammaAdjustedCanvasForImage).not.toHaveBeenCalled();
  });

  it("imageBlit with gamma 1 does not call the gamma cache helper", () => {
    const ctx = createMockCanvas2DContext();
    const fakeImg = {} as HTMLImageElement;
    const plan: RenderPlan = {
      items: [
        {
          kind: "imageBlit",
          src: "/maps/world.jpg",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          gamma: 1,
        },
      ],
    };
    executeRenderPlanOnCanvas(ctx, plan, { resolveRasterImage: () => fakeImg });
    expect(getGammaAdjustedCanvasForImage).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(fakeImg, 0, 0, 100, 100);
  });

  it("imageBlit with gamma != 1 uses processed surface from cache helper when provided", () => {
    const ctx = createMockCanvas2DContext();
    const fakeImg = {} as HTMLImageElement;
    const processed = { tag: "gamma" } as unknown as HTMLCanvasElement;
    vi.mocked(getGammaAdjustedCanvasForImage).mockReturnValue(processed);

    const plan: RenderPlan = {
      items: [
        {
          kind: "imageBlit",
          src: "/maps/world.jpg",
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          gamma: 1.1,
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan, { resolveRasterImage: () => fakeImg });

    expect(getGammaAdjustedCanvasForImage).toHaveBeenCalledWith(
      fakeImg,
      "/maps/world.jpg",
      1.1,
    );
    expect(ctx.drawImage).toHaveBeenCalledWith(processed, 0, 0, 200, 100);
  });

  it("applies cssFilter to imageBlit after gamma (processed draw still gets B/C/S filter)", () => {
    const ctx = createMockCanvas2DContext();
    (ctx as unknown as { filter: string }).filter = "none";
    const fakeImg = {} as HTMLImageElement;
    const processed = { tag: "gamma" } as unknown as HTMLCanvasElement;
    vi.mocked(getGammaAdjustedCanvasForImage).mockReturnValue(processed);
    const filterWhenDrawImageRuns: string[] = [];
    (ctx.drawImage as Mock).mockImplementation(() => {
      filterWhenDrawImageRuns.push((ctx as unknown as { filter: string }).filter);
    });

    const plan: RenderPlan = {
      items: [
        {
          kind: "imageBlit",
          src: "/m.jpg",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          gamma: 1.2,
          cssFilter: "brightness(1.1) contrast(0.9)",
        },
      ],
    };

    executeRenderPlanOnCanvas(ctx, plan, { resolveRasterImage: () => fakeImg });

    expect(filterWhenDrawImageRuns).toEqual(["brightness(1.1) contrast(0.9)"]);
  });
});
