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
 * Render-plan builder: structural NATO / timezone letter row (24 columns, seam-tiled) beneath the tick rail.
 * Layout and copy are resolved here; canvas only executes primitives.
 */

import type { GeographyConfig } from "../../config/appConfig";
import {
  resolveTimezoneStripCaptionPolicy,
  resolveTimezoneStripLetterPolicy,
} from "../../config/topBandVisualPolicy.ts";
import { createTopBandTextGlyph } from "../../glyphs/topBandTextGlyphFromPolicy.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../../glyphs/glyphToRenderPlan.ts";
import { alignCrispLineX } from "../crispLines";
import {
  geographyTimezoneStripReferenceLabel,
  type TopBandAnchorLongitudeSource,
} from "../topBandAnchorLongitude";
import { structuralHourIndexFromReferenceLongitudeDeg } from "../structuralLongitudeGrid";
import {
  TOP_CHROME_STYLE,
  computeTimezoneLetterSizePx,
  type TopChromeStyle,
} from "../../config/topChromeStyle.ts";
import { topBandWrapOffsetsForCenteredExtent, topBandWrapOffsetsForSpan } from "../topBandWrapOffsets";
import type { RenderPlan } from "./renderPlanTypes";

function truncateTimezoneStripCaption(s: string, maxChars: number): string {
  const t = s.trim();
  if (t.length <= maxChars) {
    return t;
  }
  if (maxChars <= 1) {
    return "…";
  }
  return `${t.slice(0, maxChars - 1)}…`;
}

export interface TimezoneLetterRowSegmentInput {
  hour: number;
  x0: number;
  x1: number;
  timezoneLetter: string;
}

/**
 * Resolved NATO letter row: phased column boundaries, per-column scale segments, labels, optional geography caption.
 */
export function buildTimezoneLetterRowRenderPlan(options: {
  viewportWidthPx: number;
  segments: readonly TimezoneLetterRowSegmentInput[];
  majorBoundaryXs: readonly number[];
  zoneTop: number;
  zoneH: number;
  bandBottom: number;
  /** Horizontal gutter (px) from phased layout; NATO scale fills ignore this and span full segments edge-to-edge. */
  segGapX: number;
  zonePadY: number;
  /** From phased layout; unused for rectangular scale segments (caller contract unchanged). */
  tabBottomR: number;
  diskLabelSizePx: number;
  referenceLongitudeDeg: number;
  geography?: GeographyConfig;
  anchorSource: TopBandAnchorLongitudeSource;
  timezoneLetterRowVisible: boolean;
  /**
   * When set, the present-time column’s zone letter uses this fill instead of {@link TopChromeStyle.zoneText.letter}
   * (automatic contrast split for the darker active cell).
   */
  activeCellLetterForeground?: string;
  /** Defaults to {@link TOP_CHROME_STYLE}. */
  chromeStyle?: TopChromeStyle;
  /** Bundled fonts + typography resolution for {@link TextGlyph} emission. */
  glyphRenderContext: GlyphRenderContext;
}): RenderPlan {
  const st = options.chromeStyle ?? TOP_CHROME_STYLE;
  const gctx = options.glyphRenderContext;
  const tzTab = st.timezoneTab;
  const vw = Math.max(0, options.viewportWidthPx);
  const items: RenderPlan["items"] = [];

  if (!options.timezoneLetterRowVisible || options.zoneH <= 0 || vw <= 0) {
    return { items };
  }

  const activeStructuralHour = structuralHourIndexFromReferenceLongitudeDeg(options.referenceLongitudeDeg);
  const geoCaption = geographyTimezoneStripReferenceLabel(options.geography, options.anchorSource);
  const zoneTop = options.zoneTop;
  const zoneH = options.zoneH;
  const bandBottom = options.bandBottom;

  for (const x of options.majorBoundaryXs) {
    for (const wrapK of topBandWrapOffsetsForCenteredExtent(x, 1, vw)) {
      const xi = alignCrispLineX(x + wrapK * vw);
      items.push({
        kind: "line",
        x1: xi,
        y1: zoneTop,
        x2: xi,
        y2: bandBottom,
        stroke: st.zoneBoundary,
        strokeWidthPx: 1,
        lineCap: "butt",
      });
    }
  }

  const fillTop = zoneTop + options.zonePadY;
  const fillH = Math.max(0, zoneH - options.zonePadY * 2);
  const zoneLetterSize = computeTimezoneLetterSizePx(options.diskLabelSizePx, fillH);

  // Fills use full structural [x0,x1] (ignore options.segGapX) so the row reads as one continuous scale; phased math in displayChrome is unchanged.

  for (const seg of options.segments) {
    const alt = seg.hour % 2 === 0;
    for (const wrapK of topBandWrapOffsetsForSpan(seg.x0, seg.x1, vw)) {
      const ox = wrapK * vw;
      const x0 = seg.x0 + ox;
      const x1 = seg.x1 + ox;
      const wSeg = Math.max(0, x1 - x0);
      if (wSeg <= 0) {
        continue;
      }
      const isActive = seg.hour === activeStructuralHour;
      const base = isActive ? tzTab.fillActive : alt ? tzTab.fillEven : tzTab.fillOdd;
      items.push({
        kind: "rect",
        x: x0,
        y: fillTop,
        width: wSeg,
        height: fillH,
        fill: base,
      });
    }
  }

  const baseLetterPolicy = resolveTimezoneStripLetterPolicy(st);
  const activeLetterFill = options.activeCellLetterForeground;

  for (const seg of options.segments) {
    for (const wrapK of topBandWrapOffsetsForSpan(seg.x0, seg.x1, vw)) {
      const ox = wrapK * vw;
      const x0 = seg.x0 + ox;
      const x1 = seg.x1 + ox;
      const wSeg = Math.max(0, x1 - x0);
      if (wSeg <= 0) {
        continue;
      }
      const cxLetter = (x0 + x1) * 0.5;
      const letterY = fillTop + fillH * tzTab.zoneLetterCenterFracOfBody;

      const isActiveCol = seg.hour === activeStructuralHour;
      const letterPolicy =
        isActiveCol && activeLetterFill !== undefined
          ? { ...baseLetterPolicy, fill: activeLetterFill }
          : baseLetterPolicy;
      const letterGlyph = createTopBandTextGlyph(seg.timezoneLetter, letterPolicy);
      emitGlyphToRenderPlan(
        letterGlyph,
        { cx: cxLetter, cy: letterY, size: zoneLetterSize },
        gctx,
        items,
      );

      if (geoCaption && seg.hour === activeStructuralHour) {
        const capSize = Math.max(7, Math.min(Math.round(zoneLetterSize * 0.34), 10));
        const capYTop = letterY + zoneLetterSize * 0.52;
        const capGlyph = createTopBandTextGlyph(
          truncateTimezoneStripCaption(geoCaption, 26),
          resolveTimezoneStripCaptionPolicy(st),
        );
        emitGlyphToRenderPlan(capGlyph, { cx: cxLetter, cy: capYTop, size: capSize }, gctx, items);
      }
    }
  }

  return { items };
}
