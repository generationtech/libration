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
 * Render-plan builder: fixed top-band tick rail (baseline + wrapped vertical hour / quarter ticks).
 * Layout and visibility are resolved upstream; executor applies line strokes only.
 */

import { alignCrispLineX, alignCrispLineY } from "../crispLines";
import { topBandWrapOffsetsForCenteredExtent } from "../topBandWrapOffsets";
import type { RenderLineItem, RenderPlan } from "./renderPlanTypes";

/**
 * Bottom Y for tick-rail vertical marks: matches the horizontal baseline segment, which uses
 * {@link alignCrispLineY} on {@link tickBaselineY}. Hour/quarter/minor ticks and the present-time stroke must use this
 * so their vertical extent matches the resolved baseline (same as hour-boundary tick height).
 */
export function topBandTickRailVerticalTickBottomY(tickBaselineY: number): number {
  return alignCrispLineY(tickBaselineY);
}

function pushWrappedVerticalTicks(
  items: RenderLineItem[],
  xs: readonly number[],
  yTop: number,
  yBottom: number,
  viewportWidthPx: number,
  stroke: string,
  strokeWidthPx: number,
): void {
  const vw = viewportWidthPx;
  for (const x of xs) {
    for (const wrapK of topBandWrapOffsetsForCenteredExtent(x, 1, vw)) {
      const xi = alignCrispLineX(x + wrapK * vw);
      items.push({
        kind: "line",
        x1: xi,
        y1: yTop,
        x2: xi,
        y2: yBottom,
        stroke,
        strokeWidthPx,
        lineCap: "butt",
      });
    }
  }
}

/**
 * Tick rail: one horizontal baseline, then quarter-minor, quarter-major, and hour-boundary verticals (legacy paint order).
 * Each tick column is tiled at ±viewport width per {@link topBandWrapOffsetsForCenteredExtent}.
 */
export function buildTopBandTickRailRenderPlan(options: {
  viewportWidthPx: number;
  /** Baseline segment (legacy: 0 .. viewport width). */
  baselineX0: number;
  baselineX1: number;
  tickBaselineY: number;
  minorTickTopY: number;
  quarterMajorTickTopY: number;
  majorTickTopY: number;
  quarterMinorTickXs: readonly number[];
  quarterMajorTickXs: readonly number[];
  majorBoundaryXs: readonly number[];
  baselineStroke: string;
  baselineStrokeWidthPx: number;
  tickStroke: string;
  tickStrokeWidthPx: number;
}): RenderPlan {
  const vw = options.viewportWidthPx;
  const items: RenderLineItem[] = [];
  if (!(vw > 0)) {
    return { items };
  }

  const yBase = alignCrispLineY(options.tickBaselineY);
  items.push({
    kind: "line",
    x1: options.baselineX0,
    y1: yBase,
    x2: options.baselineX1,
    y2: yBase,
    stroke: options.baselineStroke,
    strokeWidthPx: options.baselineStrokeWidthPx,
    lineCap: "butt",
  });

  const tickStroke = options.tickStroke;
  const tickW = options.tickStrokeWidthPx;
  const yBot = topBandTickRailVerticalTickBottomY(options.tickBaselineY);

  pushWrappedVerticalTicks(
    items,
    options.quarterMinorTickXs,
    options.minorTickTopY,
    yBot,
    vw,
    tickStroke,
    tickW,
  );
  pushWrappedVerticalTicks(
    items,
    options.quarterMajorTickXs,
    options.quarterMajorTickTopY,
    yBot,
    vw,
    tickStroke,
    tickW,
  );
  pushWrappedVerticalTicks(items, options.majorBoundaryXs, options.majorTickTopY, yBot, vw, tickStroke, tickW);

  return { items };
}
