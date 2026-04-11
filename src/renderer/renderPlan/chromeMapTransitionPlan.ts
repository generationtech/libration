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

import { alignCrispLineY } from "../crispLines";
import type { RenderPlan } from "./renderPlanTypes";

/**
 * Chrome→map seam framing: 1px shadow under the top band, hairline highlight, optional map-face gradient bezel,
 * optional viewport side lines on the map strip. Ordering matches legacy {@link renderDisplayChrome} composition.
 */
export function buildChromeMapTransitionRenderPlan(options: {
  viewportWidthPx: number;
  seamYPx: number;
  bottomShadowFill: string;
  bottomHighlightStroke: string;
  mapFaceBezelDepthPx: number;
  mapFaceBezelColorTop: string;
  mapFaceBezelColorBottom: string;
  sideBezels:
    | null
    | {
        stroke: string;
        leftX: number;
        rightX: number;
        y0: number;
        y1: number;
      };
}): RenderPlan {
  const items: RenderPlan["items"] = [];
  const vw = options.viewportWidthPx;
  const seamY = options.seamYPx;

  items.push({
    kind: "rect",
    x: 0,
    y: seamY - 1,
    width: vw,
    height: 1,
    fill: options.bottomShadowFill,
  });

  const highlightY = alignCrispLineY(seamY - 1.5);
  items.push({
    kind: "line",
    x1: 0,
    y1: highlightY,
    x2: vw,
    y2: highlightY,
    stroke: options.bottomHighlightStroke,
    strokeWidthPx: 1,
  });

  const depth = Math.max(0, options.mapFaceBezelDepthPx);
  if (depth > 0 && vw > 0) {
    items.push({
      kind: "linearGradientRect",
      x: 0,
      y: seamY,
      width: vw,
      height: depth,
      x1: 0,
      y1: seamY,
      x2: 0,
      y2: seamY + depth,
      stops: [
        { offset: 0, color: options.mapFaceBezelColorTop },
        { offset: 1, color: options.mapFaceBezelColorBottom },
      ],
    });
  }

  const sb = options.sideBezels;
  if (sb) {
    const y0 = alignCrispLineY(sb.y0);
    const y1 = alignCrispLineY(sb.y1);
    items.push(
      {
        kind: "line",
        x1: sb.leftX,
        y1: y0,
        x2: sb.leftX,
        y2: y1,
        stroke: sb.stroke,
        strokeWidthPx: 1,
      },
      {
        kind: "line",
        x1: sb.rightX,
        y1: y0,
        x2: sb.rightX,
        y2: y1,
        stroke: sb.stroke,
        strokeWidthPx: 1,
      },
    );
  }

  return { items };
}
