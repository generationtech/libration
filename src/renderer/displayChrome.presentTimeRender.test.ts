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
import { createTimeContext } from "../core/time";
import { TOP_CHROME_STYLE } from "../config/topChromeStyle.ts";
import * as canvasExecutor from "./renderPlan/canvasRenderPlanExecutor";
import type { RenderPlan } from "./renderPlan/renderPlanTypes";
import { buildDisplayChromeState, renderDisplayChrome } from "./displayChrome";

/** Enough of CanvasRenderingContext2D for {@link canvasExecutor.executeRenderPlanOnCanvas} under {@link renderDisplayChrome}. */
function createChromeTestCanvas2DContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() };
  const c = {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
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
    lineJoin: "miter",
    miterLimit: 10,
    fillText: vi.fn(),
    strokeText: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
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
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    measureText: vi.fn(() => ({ width: 8 })),
  };
  return c as unknown as CanvasRenderingContext2D;
}

function countPresentTimeCoreLineItems(plan: RenderPlan): number {
  const stroke = TOP_CHROME_STYLE.ticks.presentTimeStroke;
  return plan.items.filter(
    (i) =>
      i.kind === "line" &&
      "stroke" in i &&
      i.stroke === stroke &&
      i.x1 === i.x2,
  ).length;
}

describe("renderDisplayChrome — present-time tick instrumentation vs tick tape visibility", () => {
  it("emits no present-time vertical strokes when tick tape is hidden (NATO row on or off)", () => {
    const original = canvasExecutor.executeRenderPlanOnCanvas;
    let presentTimeCoreLines = 0;
    vi.spyOn(canvasExecutor, "executeRenderPlanOnCanvas").mockImplementation((ctx, plan) => {
      presentTimeCoreLines += countPresentTimeCoreLineItems(plan);
      return original.call(canvasExecutor, ctx, plan);
    });

    try {
      for (const timezoneLetterRowVisible of [false, true]) {
        presentTimeCoreLines = 0;
        const time = createTimeContext(1_704_067_200_000, 0, false);
        const viewport = { width: 800, height: 600, devicePixelRatio: 1 };
        const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
        const chrome = buildDisplayChromeState({
          time,
          viewport,
          frame,
          displayChromeLayout: {
            tickTapeVisible: false,
            timezoneLetterRowVisible,
          },
        });
        renderDisplayChrome(createChromeTestCanvas2DContext(), chrome, viewport);
        expect(presentTimeCoreLines).toBe(0);
      }
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("still emits present-time core lines when tick tape is visible", () => {
    const original = canvasExecutor.executeRenderPlanOnCanvas;
    let presentTimeCoreLines = 0;
    vi.spyOn(canvasExecutor, "executeRenderPlanOnCanvas").mockImplementation((ctx, plan) => {
      presentTimeCoreLines += countPresentTimeCoreLineItems(plan);
      return original.call(canvasExecutor, ctx, plan);
    });

    try {
      const time = createTimeContext(1_704_067_200_000, 0, false);
      const viewport = { width: 800, height: 600, devicePixelRatio: 1 };
      const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
      const chrome = buildDisplayChromeState({
        time,
        viewport,
        frame,
        displayChromeLayout: {
          tickTapeVisible: true,
          timezoneLetterRowVisible: false,
        },
      });
      renderDisplayChrome(createChromeTestCanvas2DContext(), chrome, viewport);
      expect(presentTimeCoreLines).toBeGreaterThan(0);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
