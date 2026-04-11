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
 * Render-plan builder: reference-meridian present-time vertical strokes (halo + core) with seam wrap tiling.
 * Product layout ({@link nowX}, spans, wrap extent, stroke widths/colors) is resolved upstream; executor draws lines only.
 */

import { alignCrispLineX } from "../crispLines";
import { topBandWrapOffsetsForCenteredExtent } from "../topBandWrapOffsets";
import type { RenderLineItem, RenderPlan } from "./renderPlanTypes";

function pushPresentTimeSpanLines(
  items: RenderLineItem[],
  options: {
    nowX: number;
    viewportWidthPx: number;
    wrapHalfExtentPx: number;
    yTop: number;
    yBottom: number;
    coreLineWidthPx: number;
    haloLineWidthPx: number;
    coreStroke: string;
    haloStroke: string;
  },
): void {
  const vw = options.viewportWidthPx;
  if (!(vw > 0) || !(options.yBottom > options.yTop)) {
    return;
  }
  const { nowX, wrapHalfExtentPx } = options;
  for (const wrapK of topBandWrapOffsetsForCenteredExtent(nowX, wrapHalfExtentPx, vw)) {
    const xi = alignCrispLineX(nowX + wrapK * vw);
    const y1 = options.yTop;
    const y2 = options.yBottom;
    items.push(
      {
        kind: "line",
        x1: xi,
        y1,
        x2: xi,
        y2,
        stroke: options.haloStroke,
        strokeWidthPx: options.haloLineWidthPx,
        lineCap: "butt",
      },
      {
        kind: "line",
        x1: xi,
        y1,
        x2: xi,
        y2,
        stroke: options.coreStroke,
        strokeWidthPx: options.coreLineWidthPx,
        lineCap: "butt",
      },
    );
  }
}

/**
 * Vertical present-time indicator: one or more axis-aligned spans (tick rail, optional circle cap), each tiled at ±viewport width.
 */
export function buildTopBandPresentTimeTickRenderPlan(options: {
  nowX: number;
  viewportWidthPx: number;
  wrapHalfExtentPx: number;
  verticalSpans: readonly { yTop: number; yBottom: number }[];
  coreLineWidthPx: number;
  haloLineWidthPx: number;
  coreStroke: string;
  haloStroke: string;
}): RenderPlan {
  const items: RenderLineItem[] = [];
  for (const span of options.verticalSpans) {
    pushPresentTimeSpanLines(items, {
      nowX: options.nowX,
      viewportWidthPx: options.viewportWidthPx,
      wrapHalfExtentPx: options.wrapHalfExtentPx,
      yTop: span.yTop,
      yBottom: span.yBottom,
      coreLineWidthPx: options.coreLineWidthPx,
      haloLineWidthPx: options.haloLineWidthPx,
      coreStroke: options.coreStroke,
      haloStroke: options.haloStroke,
    });
  }
  return { items };
}
