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

import { describe, expect, it } from "vitest";
import { alignCrispLineY } from "../crispLines";
import { TOP_CHROME_STYLE } from "../../config/topChromeStyle.ts";
import { buildChromeMapTransitionRenderPlan } from "./chromeMapTransitionPlan";

describe("buildChromeMapTransitionRenderPlan", () => {
  it("emits seam shadow rect, highlight line, gradient bezel, then side lines in order", () => {
    const seamY = 120;
    const vw = 800;
    const depth = TOP_CHROME_STYLE.seams.mapFaceBezelDepthPx;
    const plan = buildChromeMapTransitionRenderPlan({
      viewportWidthPx: vw,
      seamYPx: seamY,
      bottomShadowFill: TOP_CHROME_STYLE.seams.bottomShadow,
      bottomHighlightStroke: TOP_CHROME_STYLE.seams.bottomHighlight,
      mapFaceBezelDepthPx: depth,
      mapFaceBezelColorTop: TOP_CHROME_STYLE.seams.mapFaceBezelColorTop,
      mapFaceBezelColorBottom: TOP_CHROME_STYLE.seams.mapFaceBezelColorBottom,
      sideBezels: {
        stroke: TOP_CHROME_STYLE.instrument.viewportSideBezelOnMap,
        leftX: 1.5,
        rightX: 800.5,
        y0: seamY,
        y1: 900,
      },
    });

    expect(plan.items.map((i) => i.kind)).toEqual([
      "rect",
      "line",
      "linearGradientRect",
      "line",
      "line",
    ]);

    expect(plan.items[0]).toMatchObject({
      kind: "rect",
      x: 0,
      y: seamY - 1,
      width: vw,
      height: 1,
      fill: TOP_CHROME_STYLE.seams.bottomShadow,
    });

    const highlightY = alignCrispLineY(seamY - 1.5);
    expect(plan.items[1]).toMatchObject({
      kind: "line",
      x1: 0,
      y1: highlightY,
      x2: vw,
      y2: highlightY,
      stroke: TOP_CHROME_STYLE.seams.bottomHighlight,
      strokeWidthPx: 1,
    });

    const grad = plan.items[2];
    expect(grad.kind).toBe("linearGradientRect");
    if (grad.kind !== "linearGradientRect") {
      return;
    }
    expect(grad).toMatchObject({
      x: 0,
      y: seamY,
      width: vw,
      height: depth,
      x1: 0,
      y1: seamY,
      x2: 0,
      y2: seamY + depth,
      stops: [
        { offset: 0, color: TOP_CHROME_STYLE.seams.mapFaceBezelColorTop },
        { offset: 1, color: TOP_CHROME_STYLE.seams.mapFaceBezelColorBottom },
      ],
    });

    const y0 = alignCrispLineY(seamY);
    const y1 = alignCrispLineY(900);
    expect(plan.items[3]).toMatchObject({
      kind: "line",
      x1: 1.5,
      y1: y0,
      x2: 1.5,
      y2: y1,
    });
    expect(plan.items[4]).toMatchObject({
      kind: "line",
      x1: 800.5,
      y1: y0,
      x2: 800.5,
      y2: y1,
    });
  });

  it("omits gradient and side lines when depth is zero and sideBezels is null", () => {
    const plan = buildChromeMapTransitionRenderPlan({
      viewportWidthPx: 600,
      seamYPx: 80,
      bottomShadowFill: "#000",
      bottomHighlightStroke: "#fff",
      mapFaceBezelDepthPx: 0,
      mapFaceBezelColorTop: "a",
      mapFaceBezelColorBottom: "b",
      sideBezels: null,
    });

    expect(plan.items.map((i) => i.kind)).toEqual(["rect", "line"]);
  });

  it("omits gradient when viewport width is zero even if depth > 0", () => {
    const plan = buildChromeMapTransitionRenderPlan({
      viewportWidthPx: 0,
      seamYPx: 50,
      bottomShadowFill: "#000",
      bottomHighlightStroke: "#fff",
      mapFaceBezelDepthPx: 12,
      mapFaceBezelColorTop: "a",
      mapFaceBezelColorBottom: "b",
      sideBezels: null,
    });

    expect(plan.items.map((i) => i.kind)).toEqual(["rect", "line"]);
  });
});
