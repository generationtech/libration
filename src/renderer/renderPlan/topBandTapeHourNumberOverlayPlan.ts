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
 * Optional boxed hour numerals on the tick rail, centered under phased disk columns (glyph companion feature).
 */

import { alignCrispLineX } from "../crispLines";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../../glyphs/glyphToRenderPlan.ts";
import type { TextGlyph } from "../../glyphs/glyphTypes.ts";
import { topBandWrapOffsetsForCenteredExtent } from "../topBandWrapOffsets";
import type { RenderPlan } from "./renderPlanTypes";
import type { TopBandTimeMode } from "../../config/appConfig.ts";
import { topBandCircleLabel } from "../displayChrome.ts";

/**
 * Paints after the tick rail so ticks show through; boxes sit low in the band so the tall hour tick remains visible above.
 */
export function buildTopBandTapeHourNumberOverlayRenderPlan(options: {
  viewportWidthPx: number;
  /** Baseline of the tick rail (y, CSS px). */
  tickBaselineY: number;
  tickBandHeightPx: number;
  markers: readonly { centerX: number; structuralHour0To23: number }[];
  topBandMode: TopBandTimeMode;
  textFill: string;
  boxFill: string;
  boxStroke: string;
  fontSizePx: number;
  glyphRenderContext: GlyphRenderContext;
}): RenderPlan {
  const vw = options.viewportWidthPx;
  const items: RenderPlan["items"] = [];
  if (!(vw > 0) || options.tickBandHeightPx <= 0) {
    return { items };
  }

  const bandH = options.tickBandHeightPx;
  const yBot = options.tickBaselineY;
  const fs = Math.max(6, Math.min(11, options.fontSizePx));
  const padX = Math.max(1.5, fs * 0.22);
  const padY = Math.max(1, fs * 0.14);
  const boxH = fs + padY * 2;
  const boxBottomMarginPx = Math.max(1.25, bandH * 0.06);
  const cy = yBot - boxBottomMarginPx - boxH * 0.5;

  for (const m of options.markers) {
    const label = topBandCircleLabel(m.structuralHour0To23, options.topBandMode);
    const halfW = fs * 0.52 * Math.max(1, label.length * 0.55) + padX;
    for (const wrapK of topBandWrapOffsetsForCenteredExtent(m.centerX, halfW, vw)) {
      const cx = m.centerX + wrapK * vw;
      const left = cx - halfW;
      const top = cy - boxH * 0.5;
      items.push({
        kind: "rect",
        x: alignCrispLineX(left),
        y: top,
        width: halfW * 2,
        height: boxH,
        fill: options.boxFill,
        stroke: options.boxStroke,
        strokeWidthPx: 1,
      });
      const glyph: TextGlyph = {
        kind: "text",
        text: label,
        role: "chromeHourPrimary",
        fill: options.textFill,
      };
      emitGlyphToRenderPlan(glyph, { cx, cy, size: fs }, options.glyphRenderContext, items);
    }
  }

  return { items };
}
