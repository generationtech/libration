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

/**
 * Render-plan builders: fixed top-band framing (strip/tick bed fills, inter-band hairlines, viewport vertical edges).
 * Layout, visibility, and stroke/fill tokens are resolved upstream; executor applies rects/lines only.
 */

import { alignCrispLineX, alignCrispLineY } from "../crispLines";
import type { RenderLineItem, RenderPlan, RenderRectItem } from "./renderPlanTypes";

/**
 * Full top-band strip fill, then tick-rail band fill (legacy paint order — tick band paints over strip in the middle).
 */
export function buildTopBandChromeBackgroundRenderPlan(options: {
  topBandOriginXPx: number;
  topBandYPx: number;
  topBandWidthPx: number;
  topBandHeightPx: number;
  circleBandBottomYPx: number;
  tickBandHeightPx: number;
  stripBackgroundFill: string;
  tickRailBackgroundFill: string;
}): RenderPlan {
  const items: RenderRectItem[] = [];
  const x = options.topBandOriginXPx;
  const w = options.topBandWidthPx;
  const stripH = options.topBandHeightPx;
  if (w > 0 && stripH > 0) {
    items.push({
      kind: "rect",
      x,
      y: options.topBandYPx,
      width: w,
      height: stripH,
      fill: options.stripBackgroundFill,
    });
  }
  const tickH = options.tickBandHeightPx;
  if (w > 0 && tickH > 0) {
    items.push({
      kind: "rect",
      x,
      y: options.circleBandBottomYPx,
      width: w,
      height: tickH,
      fill: options.tickRailBackgroundFill,
    });
  }
  return { items };
}

/**
 * Horizontal hairlines at the circle↔tick and (optionally) tick↔zone boundaries.
 */
export function buildTopBandInterBandSeamLinesRenderPlan(options: {
  viewportWidthPx: number;
  topBandOriginXPx: number;
  circleBandBottomYPx: number;
  tickZoneBoundaryYPx: number;
  drawTickToZoneSeam: boolean;
  circleToTickStroke: string;
  tickToZoneStroke: string;
  seamLineWidthPx: number;
}): RenderPlan {
  const vw = options.viewportWidthPx;
  if (!(vw > 0)) {
    return { items: [] };
  }
  const x0 = options.topBandOriginXPx;
  const x1 = options.topBandOriginXPx + vw;
  const yCircle = alignCrispLineY(options.circleBandBottomYPx);
  const items: RenderLineItem[] = [
    {
      kind: "line",
      x1: x0,
      y1: yCircle,
      x2: x1,
      y2: yCircle,
      stroke: options.circleToTickStroke,
      strokeWidthPx: options.seamLineWidthPx,
      lineCap: "butt",
    },
  ];
  if (options.drawTickToZoneSeam) {
    const yTick = alignCrispLineY(options.tickZoneBoundaryYPx);
    items.push({
      kind: "line",
      x1: x0,
      y1: yTick,
      x2: x1,
      y2: yTick,
      stroke: options.tickToZoneStroke,
      strokeWidthPx: options.seamLineWidthPx,
      lineCap: "butt",
    });
  }
  return { items };
}

/**
 * Left/right vertical strokes on the top band (viewport edges of the instrument strip).
 */
export function buildTopBandVerticalEdgeBezelRenderPlan(options: {
  viewportWidthPx: number;
  topBandOriginXPx: number;
  topBandTopYPx: number;
  topBandBottomYPx: number;
  verticalEdgeStroke: string;
  bezelLineWidthPx: number;
}): RenderPlan {
  const vw = options.viewportWidthPx;
  if (!(vw > 0)) {
    return { items: [] };
  }
  const ox = options.topBandOriginXPx;
  const leftX = alignCrispLineX(ox + 0.5);
  const rightX = alignCrispLineX(ox + vw - 0.5);
  const y0 = options.topBandTopYPx;
  const y1 = options.topBandBottomYPx;
  return {
    items: [
      {
        kind: "line",
        x1: leftX,
        y1: y0,
        x2: leftX,
        y2: y1,
        stroke: options.verticalEdgeStroke,
        strokeWidthPx: options.bezelLineWidthPx,
        lineCap: "butt",
      },
      {
        kind: "line",
        x1: rightX,
        y1: y0,
        x2: rightX,
        y2: y1,
        stroke: options.verticalEdgeStroke,
        strokeWidthPx: options.bezelLineWidthPx,
        lineCap: "butt",
      },
    ],
  };
}
