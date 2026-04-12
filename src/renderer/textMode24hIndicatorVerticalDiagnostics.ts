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
 * Investigation-only vertical geometry for the top 24h **text** hour-indicator row (not glyph realizations).
 * Mirrors {@link buildDisplayChromeState} + {@link layoutSemanticTopBandHourMarkers} math so tests can
 * snapshot numbers without Canvas.
 */

import {
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_DISPLAY_TIME_CONFIG,
  effectiveTopBandHourMarkerSelection,
  resolvedHourMarkerLayoutSizeMultiplier,
  type DisplayChromeLayoutConfig,
} from "../config/appConfig.ts";
import { createTimeContext } from "../core/time.ts";
import { hourMarkerRepresentationSpecForTopBandEffectiveSelection } from "../config/topBandVisualPolicy.ts";
import { resolveHourMarkerGlyphStyle } from "../glyphs/glyphStyles.ts";
import { computeHourDiskLabelSizePx, getTopChromeStyle } from "../config/topChromeStyle.ts";
import {
  computeTextIndicatorRowHeightPx,
  estimateTextCoreHeightForOpticalLayoutPx,
  TEXT_INDICATOR_OPTICAL_CENTER_BIAS,
} from "../config/topBandHourMarkersLayout.ts";
import type { FrameContext, Viewport } from "./types.ts";
import type { TimeContext } from "../layers/types.ts";
import {
  buildDisplayChromeState,
  collapseTopBandHourIndicatorAreaRows,
  computeTextIndicatorCircleBandExpansionPx,
  computeTopBandCircleStackMetrics,
  computeUtcCircleMarkerRadius,
  computeUtcTopScaleRowMetrics,
  expandTopBandCircleBandPreservingLowerBands,
  resolveTextIndicatorCircleStackMetrics,
  sumTopBandCircleStackMetricsPx,
  topBandTickRailMajorTickVerticalSpan,
  type TopBandCircleStackMetrics,
  type UtcTopScaleRowMetrics,
} from "./displayChrome.ts";

/** Matches private {@code computeBandHeights} top term in {@link buildDisplayChromeState} — keep in sync. */
function chromeTopBandHeightFromViewportPx(viewportHeightPx: number): number {
  const h = viewportHeightPx > 0 ? viewportHeightPx : 1;
  return Math.max(56, Math.min(118, Math.round(h * 0.102)));
}

export type TextMode24hIndicatorVerticalSnapshot = {
  viewportWidthPx: number;
  viewportHeightPx: number;
  sizeMultiplier: number;
  /** Chrome top strip height (same as {@link DisplayChromeState.topBand.height}). */
  topBandHeightPx: number;
  /** Row split after text-led circle-band expansion (same as {@link UtcTopScaleLayout.rows}). */
  rowMetrics: UtcTopScaleRowMetrics;
  /** {@link computeUtcTopScaleRowMetrics} before expansion. */
  baseRowMetrics: UtcTopScaleRowMetrics;
  /** Pixels added to the circle band for text-led stack fit. */
  circleBandExpansionPx: number;
  /** Authoritative stack from {@link buildDisplayChromeState} / {@link buildUtcTopScaleLayout}. */
  circleStack: TopBandCircleStackMetrics;
  /** Sum of stack slices — should match {@link rowMetrics.circleBandH} when consistent. */
  circleStackSumPx: number;
  /** {@link rowMetrics.circleBandH} − {@link circleStackSumPx} (non-zero ⇒ partition vs band height mismatch). */
  circleBandHeightVsStackSumDeltaPx: number;
  /** Fallback stack if {@link UtcTopScaleLayout.circleStack} were missing in {@link renderDisplayChrome}. */
  renderFallbackTextLedStack: TopBandCircleStackMetrics;
  /** True when fallback differs materially from {@link circleStack} (layout object always present in normal path). */
  renderFallbackStackDiffers: boolean;
  indicatorAreaTopPx: number;
  indicatorAreaBottomPx: number;
  indicatorAreaHeightPx: number;
  yDiskRow0Px: number;
  diskBandHeightPx: number;
  diskRowMidYPx: number;
  textAnchorYPx: number;
  opticalOffsetPx: number;
  diskLabelSizePx: number;
  markerContentSizePx: number;
  /** Core height used by {@link computeTextIndicatorRowHeightPx} (fontMetrics omitted → {@code fontSizePx * 1.125}). */
  textRowCoreHeightForBandAllocationPx: number;
  /** {@link computeTextIndicatorRowHeightPx} total (disk row budget). */
  textIndicatorRowHeightPx: number;
  /** {@link estimateTextCoreHeightForOpticalLayoutPx} — used only for optical bias, not band height. */
  textCoreHeightEstimatePx: number;
  /** Estimated box half-height using {@link textCoreHeightEstimatePx}. */
  textEstimatedHalfHeightPx: number;
  /** Estimated glyph box top: {@link textAnchorYPx} − half of {@link textCoreHeightEstimatePx}. */
  textEstimatedTopPx: number;
  /** Estimated glyph box bottom: {@link textAnchorYPx} + half of {@link textCoreHeightEstimatePx}. */
  textEstimatedBottomPx: number;
  /** Space inside the disk row from disk-row top to estimated text top (positive ⇒ text starts below row top). */
  marginAboveTextInDiskRowPx: number;
  /** Space inside the disk row from estimated text bottom to disk-row bottom. */
  marginBelowTextInDiskRowPx: number;
  /** Gap + annotation + pad below disk row inside the circle band (down to {@link yCircleBottomPx}). */
  belowDiskRowInsideCircleBandPx: number;
  yCircleBottomPx: number;
  tickBandHeightPx: number;
  tickTapeMajorTickTopPx: number;
  tickTapeBaselineYPx: number;
  yTickBandBottomPx: number;
  /** Estimated text bottom to circle-band bottom (annotation strip + padding below numerals). */
  estimatedTextBottomToCircleBandBottomPx: number;
  /** Estimated text bottom to top of major tick graphics (tick band interior). */
  estimatedTextBottomToMajorTickTopPx: number;
  /** Emit path: {@link emitTextGlyph} uses {@code layout.cy + layout.size * baselineShiftFrac}. */
  emitTextBaselineShiftPx: number;
  /** Emit path: {@code layout.size * (1 - 2 * insetFrac)} → resolved font size. */
  emitEffectiveFontSizePx: number;
};

export type TextMode24hIndicatorVerticalDiagnosticsOptions = {
  viewport: Viewport;
  /** Defaults to {@link DEFAULT_DISPLAY_TIME_CONFIG}. */
  displayTime?: typeof DEFAULT_DISPLAY_TIME_CONFIG;
  /** Merged into {@link DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG}; set {@code hourMarkers.layout.sizeMultiplier}. */
  displayChromeLayout?: Partial<DisplayChromeLayoutConfig>;
  time?: TimeContext;
  frame?: FrameContext;
};

/**
 * Single-frame vertical snapshot for text-mode 24h indicators: chrome rows, text-led stack, semantic anchor Y,
 * tick-rail span (same formulas as {@link renderDisplayChrome}).
 */
export function computeTextMode24hIndicatorVerticalSnapshot(
  options: TextMode24hIndicatorVerticalDiagnosticsOptions,
): TextMode24hIndicatorVerticalSnapshot {
  const viewport = options.viewport;
  const w = Math.max(0, viewport.width);
  const h = Math.max(0, viewport.height);
  const layout: DisplayChromeLayoutConfig = {
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    ...options.displayChromeLayout,
  };
  const hourMarkerSel = effectiveTopBandHourMarkerSelection(layout);
  if (hourMarkerSel.kind !== "text") {
    throw new Error("computeTextMode24hIndicatorVerticalSnapshot: hour markers must be text mode");
  }
  const sm = resolvedHourMarkerLayoutSizeMultiplier(layout);
  const st = getTopChromeStyle(layout.topChromePalette);
  const baseTop = chromeTopBandHeightFromViewportPx(h);
  const baseRows = computeUtcTopScaleRowMetrics(baseTop, layout);
  const rowsForExpansion =
    layout.hourMarkers.visible !== false ? baseRows : collapseTopBandHourIndicatorAreaRows(baseRows);
  const circleExpansionPx =
    layout.hourMarkers.visible !== false
      ? computeTextIndicatorCircleBandExpansionPx({
          baseRows: rowsForExpansion,
          viewportWidthPx: w,
          hourDiskLabelTokens: st.hourDiskLabel,
          layout,
        })
      : 0;
  const rowMetrics =
    circleExpansionPx > 0
      ? expandTopBandCircleBandPreservingLowerBands(rowsForExpansion, circleExpansionPx)
      : rowsForExpansion;

  const time =
    options.time ?? createTimeContext(Date.UTC(2026, 0, 1, 12, 0, 0, 0), 0, false);
  const frame = options.frame ?? { frameNumber: 0, now: time.now, deltaMs: 0 };
  const chrome = buildDisplayChromeState({
    time,
    viewport,
    frame,
    displayTime: options.displayTime ?? DEFAULT_DISPLAY_TIME_CONFIG,
    displayChromeLayout: options.displayChromeLayout,
  });

  const scale = chrome.utcTopScale;
  const rows = scale.rows ?? rowMetrics;
  const circleStack = scale.circleStack ?? resolveTextIndicatorCircleStackMetrics({
    viewportWidthPx: w,
    hourDiskLabelTokens: st.hourDiskLabel,
    layout,
    seedCircleBandHeightPx: rows.circleBandH,
  });
  const stackSum = sumTopBandCircleStackMetricsPx(circleStack);
  const fallbackStack = computeTopBandCircleStackMetrics(rows.circleBandH, "textLed");

  const y0 = chrome.topBand.y;
  const circleH = rows.circleBandH;
  const tickH = rows.tickBandH;
  const yCircleBottom = y0 + circleH;
  const { tickBaselineY, majorTickTopY } = topBandTickRailMajorTickVerticalSpan(yCircleBottom, tickH);
  const yTickBottom = yCircleBottom + tickH;

  const sw = w / 24;
  const markerRadiusPx = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
  const diskLabelSizePx = computeHourDiskLabelSizePx(markerRadiusPx, w, st.hourDiskLabel);
  const markerContentSizePx = diskLabelSizePx * sm;

  const fontSizePx = markerContentSizePx;
  const textRowCore = fontSizePx * 1.125;
  const textRowH = computeTextIndicatorRowHeightPx({ fontSizePx, sizeMultiplier: sm });
  const textCoreEst = estimateTextCoreHeightForOpticalLayoutPx(markerContentSizePx);
  const opticalOffsetPx = textCoreEst * TEXT_INDICATOR_OPTICAL_CENTER_BIAS;

  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;
  const diskRowMidY = yDiskRow0 + diskBandH * 0.5;
  const textAnchorY = diskRowMidY + opticalOffsetPx;

  const halfEst = textCoreEst * 0.5;
  const textEstTop = textAnchorY - halfEst;
  const textEstBottom = textAnchorY + halfEst;
  const marginAboveTextInDiskRow = textEstTop - yDiskRow0;
  const marginBelowTextInDiskRow = yDiskRow0 + diskBandH - textEstBottom;
  const belowDisk =
    circleStack.gapDiskToAnnotationPx + circleStack.annotationH + circleStack.padBottomPx;

  const spec = hourMarkerRepresentationSpecForTopBandEffectiveSelection(hourMarkerSel);
  const gStyle = resolveHourMarkerGlyphStyle(spec.glyphStyleId ?? "topBandHourDefault");
  const insetFrac = Math.max(0, gStyle.text.insetFrac ?? 0);
  const baselineShiftFrac = gStyle.text.baselineShiftFrac ?? 0;
  const emitShift = markerContentSizePx * baselineShiftFrac;
  const emitFont = markerContentSizePx * (1 - 2 * insetFrac);

  return {
    viewportWidthPx: w,
    viewportHeightPx: h,
    sizeMultiplier: sm,
    topBandHeightPx: chrome.topBand.height,
    rowMetrics: rows,
    baseRowMetrics: baseRows,
    circleBandExpansionPx: circleExpansionPx,
    circleStack,
    circleStackSumPx: stackSum,
    circleBandHeightVsStackSumDeltaPx: rows.circleBandH - stackSum,
    renderFallbackTextLedStack: fallbackStack,
    renderFallbackStackDiffers:
      fallbackStack.diskBandH !== circleStack.diskBandH ||
      fallbackStack.padTopPx !== circleStack.padTopPx ||
      fallbackStack.padBottomPx !== circleStack.padBottomPx,
    indicatorAreaTopPx: y0,
    indicatorAreaBottomPx: yCircleBottom,
    indicatorAreaHeightPx: circleH,
    yDiskRow0Px: yDiskRow0,
    diskBandHeightPx: diskBandH,
    diskRowMidYPx: diskRowMidY,
    textAnchorYPx: textAnchorY,
    opticalOffsetPx,
    diskLabelSizePx,
    markerContentSizePx,
    textRowCoreHeightForBandAllocationPx: textRowCore,
    textIndicatorRowHeightPx: textRowH,
    textCoreHeightEstimatePx: textCoreEst,
    textEstimatedHalfHeightPx: halfEst,
    textEstimatedTopPx: textEstTop,
    textEstimatedBottomPx: textEstBottom,
    marginAboveTextInDiskRowPx: marginAboveTextInDiskRow,
    marginBelowTextInDiskRowPx: marginBelowTextInDiskRow,
    belowDiskRowInsideCircleBandPx: belowDisk,
    yCircleBottomPx: yCircleBottom,
    tickBandHeightPx: tickH,
    tickTapeMajorTickTopPx: majorTickTopY,
    tickTapeBaselineYPx: tickBaselineY,
    yTickBandBottomPx: yTickBottom,
    estimatedTextBottomToCircleBandBottomPx: yCircleBottom - textEstBottom,
    estimatedTextBottomToMajorTickTopPx: majorTickTopY - textEstBottom,
    emitTextBaselineShiftPx: emitShift,
    emitEffectiveFontSizePx: emitFont,
  };
}
