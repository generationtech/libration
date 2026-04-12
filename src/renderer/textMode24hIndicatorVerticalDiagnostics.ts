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
  resolvedHourMarkerLayoutTextBottomMargin,
  resolvedHourMarkerLayoutTextTopMargin,
  type DisplayChromeLayoutConfig,
} from "../config/appConfig.ts";
import { createTimeContext } from "../core/time.ts";
import { hourMarkerRepresentationSpecForTopBandEffectiveSelection } from "../config/topBandVisualPolicy.ts";
import { resolveHourMarkerGlyphStyle } from "../glyphs/glyphStyles.ts";
import { computeHourDiskLabelSizePx, TOP_CHROME_STYLE } from "../config/topChromeStyle.ts";
import {
  computeTextIndicatorRowHeightPx,
  computeTextModeLayoutDiskBandVerticalMetrics,
} from "../config/topBandHourMarkersLayout.ts";
import type { FrameContext, Viewport } from "./types.ts";
import type { TimeContext } from "../layers/types.ts";
import {
  alignTopBandRowsToExactCircleBandH,
  buildDisplayChromeState,
  collapseTopBandHourIndicatorAreaRows,
  collapseTopBandTickTapeRows,
  computeTextIndicatorCircleBandExpansionPx,
  computeTopBandCircleStackMetrics,
  computeUtcCircleMarkerRadius,
  computeUtcTopScaleRowMetrics,
  effectiveDiskBandHForMarkerRadiusPx,
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
  /** Row split after text-led circle-band alignment (same as {@link UtcTopScaleLayout.rows}). */
  rowMetrics: UtcTopScaleRowMetrics;
  /** {@link computeUtcTopScaleRowMetrics} before expansion. */
  baseRowMetrics: UtcTopScaleRowMetrics;
  /** Pixels {@link rowMetrics.circleBandH} − {@link baseRowMetrics.circleBandH} when positive (legacy “expansion” label). */
  circleBandExpansionPx: number;
  /** Authoritative stack from {@link buildDisplayChromeState} / {@link buildUtcTopScaleLayout}. */
  circleStack: TopBandCircleStackMetrics;
  /** Sum of stack slices — must match {@link rowMetrics.circleBandH} for text mode. */
  circleStackSumPx: number;
  /** {@link rowMetrics.circleBandH} − {@link circleStackSumPx} (must be 0 for text mode). */
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
  /** Same as {@link textAnchorYPx} (single placement path from layout metrics). */
  textAnchorBaselineYPx: number;
  /** Configured total top padding inside the disk row above the text core (px). */
  userTextTopInsetPx: number;
  /** Configured total bottom padding inside the disk row below the text core (px). */
  userTextBottomInsetPx: number;
  /**
   * Extra disk-row height (px) from the text disk-row floor when core + insets are below the minimum — not user padding.
   */
  structuralDiskRowSlackPx: number;
  /** Intrinsic disk-row height (px) used for marker-radius / nominal font solving — {@link circleStack.markerRadiusDiskBandHPx}. */
  intrinsicDiskBandForSizingPx: number;
  /** Solved marker radius (px) from {@link effectiveDiskBandHForMarkerRadiusPx} — independent of layout {@link diskBandHeightPx}. */
  solvedMarkerRadiusPx: number;
  /** Final text anchor Y from {@link computeTextModeLayoutDiskBandVerticalMetrics}. */
  textAnchorYPx: number;
  /** Legacy one-sided optical bias (px); always 0. */
  opticalOffsetPx: number;
  diskLabelSizePx: number;
  markerContentSizePx: number;
  /** Authoritative text core height for layout (px). */
  textCoreHeightPx: number;
  /** Total top padding above the text core inside the disk row (px) — same as configured top inset. */
  topPadInsideDiskPx: number;
  /** Total bottom padding below the text core inside the disk row (px) — same as configured bottom inset. */
  bottomPadInsideDiskPx: number;
  /** Layout disk-row height (px); matches {@link diskBandHeightPx} / {@link circleStack.diskBandH}. */
  textIndicatorRowHeightPx: number;
  /** Estimated box half-height using {@link textCoreHeightPx}. */
  textEstimatedHalfHeightPx: number;
  /** Estimated glyph box top: {@link textAnchorYPx} − half of {@link textCoreHeightPx}. */
  textEstimatedTopPx: number;
  /** Estimated glyph box bottom: {@link textAnchorYPx} + half of {@link textCoreHeightPx}. */
  textEstimatedBottomPx: number;
  /** Space inside the disk row from disk-row top to estimated text top (should match {@link topPadInsideDiskPx}). */
  marginAboveTextInDiskRowPx: number;
  /** Space inside the disk row from estimated text bottom to disk-row bottom (should match {@link bottomPadInsideDiskPx}). */
  marginBelowTextInDiskRowPx: number;
  /** Gap + annotation + pad below disk row inside the circle band (down to {@link yCircleBottomPx}). */
  belowDiskRowInsideCircleBandPx: number;
  /** Same as {@link belowDiskRowInsideCircleBandPx} — explicit “bottom-side non-row” label for reports. */
  bottomSideNonRowSpaceInsideCircleBandPx: number;
  /** Resolved lower-side stack slices (same as fields on {@link circleStack}). */
  lowerSideStackSlicesPx: {
    gapDiskToAnnotationPx: number;
    annotationH: number;
    padBottomPx: number;
  };
  /** Same as {@link marginAboveDiskRowInCircleBandPx} — pad + upper numeral row + gap above disk row. */
  topSideNonRowSpaceInsideCircleBandPx: number;
  /**
   * Inside the 24h indicator entries area (circle band): px from band top to estimated text core top
   * ({@link textEstimatedTopPx} − {@link indicatorAreaTopPx}).
   */
  indicatorAreaMarginAboveTextPx: number;
  /**
   * Inside the same area: px from estimated text core bottom to circle-band bottom
   * ({@link indicatorAreaBottomPx} − {@link textEstimatedBottomPx}).
   */
  indicatorAreaMarginBelowTextPx: number;
  /** Effective {@link DisplayChromeLayoutConfig.tickTapeVisible} after merge (mirrors chrome). */
  tickTapeVisibleEffective: boolean;
  /**
   * Pixels from circle-band top to disk-row top ({@code padTop + upperNumeral + gapNumeral→disk}).
   * Text-led polish (2026-04): typically ~+2 vs the pre-polish baseline (~7px for common disk heights) — more headroom above the row.
   */
  marginAboveDiskRowInCircleBandPx: number;
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
  const userTextTopInsetPx = resolvedHourMarkerLayoutTextTopMargin(layout);
  const userTextBottomInsetPx = resolvedHourMarkerLayoutTextBottomMargin(layout);
  const st = TOP_CHROME_STYLE;
  const baseTop = chromeTopBandHeightFromViewportPx(h);
  const baseRows = computeUtcTopScaleRowMetrics(baseTop, layout);
  let rowsForExpansion =
    layout.hourMarkers.visible !== false ? baseRows : collapseTopBandHourIndicatorAreaRows(baseRows);
  if (layout.tickTapeVisible === false) {
    rowsForExpansion = collapseTopBandTickTapeRows(rowsForExpansion);
  }
  const textStack =
    layout.hourMarkers.visible !== false && w > 0
      ? resolveTextIndicatorCircleStackMetrics({
          viewportWidthPx: w,
          hourDiskLabelTokens: st.hourDiskLabel,
          layout,
          seedCircleBandHeightPx: rowsForExpansion.circleBandH,
        })
      : undefined;
  const rowMetrics =
    layout.hourMarkers.visible !== false && textStack !== undefined
      ? alignTopBandRowsToExactCircleBandH(rowsForExpansion, sumTopBandCircleStackMetricsPx(textStack))
      : rowsForExpansion;
  const circleExpansionPx =
    layout.hourMarkers.visible !== false
      ? computeTextIndicatorCircleBandExpansionPx({
          baseRows: rowsForExpansion,
          viewportWidthPx: w,
          hourDiskLabelTokens: st.hourDiskLabel,
          layout,
        })
      : 0;

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
  const circleStack =
    scale.circleStack ??
    textStack ??
    resolveTextIndicatorCircleStackMetrics({
      viewportWidthPx: Math.max(1, w),
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
  const intrinsicDiskBandForSizingPx = effectiveDiskBandHForMarkerRadiusPx(circleStack);
  const markerRadiusPx = computeUtcCircleMarkerRadius(intrinsicDiskBandForSizingPx, sw);
  const diskLabelSizePx = computeHourDiskLabelSizePx(markerRadiusPx, w, st.hourDiskLabel);
  const markerContentSizePx = diskLabelSizePx * sm;

  const fontSizePx = markerContentSizePx;
  const vmLayout = computeTextModeLayoutDiskBandVerticalMetrics({
    fontSizePx,
    sizeMultiplier: sm,
    rowTopInsetPx: userTextTopInsetPx,
    rowBottomInsetPx: userTextBottomInsetPx,
  });
  const textRowH = computeTextIndicatorRowHeightPx({
    fontSizePx,
    sizeMultiplier: sm,
    textTopMarginPx: userTextTopInsetPx,
    textBottomMarginPx: userTextBottomInsetPx,
  });

  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;
  const diskRowMidY = yDiskRow0 + diskBandH * 0.5;
  const textAnchorBaselineY = yDiskRow0 + vmLayout.textCenterYFromDiskRowTopPx;
  const textAnchorY = textAnchorBaselineY;
  const opticalOffsetPx = 0;

  const halfCore = vmLayout.textCoreHeightPx * 0.5;
  const textEstTop = textAnchorY - halfCore;
  const textEstBottom = textAnchorY + halfCore;
  const marginAboveTextInDiskRow = textEstTop - yDiskRow0;
  const marginBelowTextInDiskRow = yDiskRow0 + diskBandH - textEstBottom;
  const belowDisk =
    circleStack.gapDiskToAnnotationPx + circleStack.annotationH + circleStack.padBottomPx;
  const marginAboveDiskRow =
    circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;

  const indicatorAreaMarginAboveTextPx = textEstTop - y0;
  const indicatorAreaMarginBelowTextPx = yCircleBottom - textEstBottom;

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
      fallbackStack.padBottomPx !== circleStack.padBottomPx ||
      fallbackStack.markerRadiusDiskBandHPx !== circleStack.markerRadiusDiskBandHPx,
    indicatorAreaTopPx: y0,
    indicatorAreaBottomPx: yCircleBottom,
    indicatorAreaHeightPx: circleH,
    yDiskRow0Px: yDiskRow0,
    diskBandHeightPx: diskBandH,
    diskRowMidYPx: diskRowMidY,
    textAnchorBaselineYPx: textAnchorBaselineY,
    userTextTopInsetPx,
    userTextBottomInsetPx,
    structuralDiskRowSlackPx: vmLayout.structuralDiskRowSlackPx,
    intrinsicDiskBandForSizingPx,
    solvedMarkerRadiusPx: markerRadiusPx,
    textAnchorYPx: textAnchorY,
    opticalOffsetPx,
    diskLabelSizePx,
    markerContentSizePx,
    textCoreHeightPx: vmLayout.textCoreHeightPx,
    topPadInsideDiskPx: vmLayout.topPadInsideDiskPx,
    bottomPadInsideDiskPx: vmLayout.bottomPadInsideDiskPx,
    textIndicatorRowHeightPx: textRowH,
    textEstimatedHalfHeightPx: halfCore,
    textEstimatedTopPx: textEstTop,
    textEstimatedBottomPx: textEstBottom,
    marginAboveTextInDiskRowPx: marginAboveTextInDiskRow,
    marginBelowTextInDiskRowPx: marginBelowTextInDiskRow,
    belowDiskRowInsideCircleBandPx: belowDisk,
    bottomSideNonRowSpaceInsideCircleBandPx: belowDisk,
    lowerSideStackSlicesPx: {
      gapDiskToAnnotationPx: circleStack.gapDiskToAnnotationPx,
      annotationH: circleStack.annotationH,
      padBottomPx: circleStack.padBottomPx,
    },
    topSideNonRowSpaceInsideCircleBandPx: marginAboveDiskRow,
    indicatorAreaMarginAboveTextPx,
    indicatorAreaMarginBelowTextPx,
    tickTapeVisibleEffective: layout.tickTapeVisible !== false,
    marginAboveDiskRowInCircleBandPx: marginAboveDiskRow,
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

/**
 * Side-by-side text-mode vertical metrics for tape on vs off (same merged config except
 * {@link DisplayChromeLayoutConfig.tickTapeVisible}).
 */
export type TextMode24hIndicatorTickTapeComparison = {
  viewportWidthPx: number;
  sizeMultiplier: number;
  tapeVisible: TextMode24hIndicatorVerticalSnapshot;
  tapeHidden: TextMode24hIndicatorVerticalSnapshot;
  /** Numeric deltas (tape hidden − tape visible). */
  delta: {
    topBandHeightPx: number;
    tickBandH: number;
    timezoneBandH: number;
    circleBandH: number;
    indicatorAreaHeightPx: number;
    circleStackSumPx: number;
    diskBandHeightPx: number;
    belowDiskRowInsideCircleBandPx: number;
    marginAboveDiskRowInCircleBandPx: number;
    gapDiskToAnnotationPx: number;
    annotationH: number;
    padBottomPx: number;
    textAnchorYPx: number;
    yDiskRow0Px: number;
    estimatedTextBottomToCircleBandBottomPx: number;
  };
  /** Resolved {@link TopBandCircleStackMetrics} matches byte-for-byte. */
  circleStackIdentical: boolean;
  /** In-band text/disk vertical metrics match (positions and lower stack). */
  textAndDiskVerticalMetricsIdentical: boolean;
};

export function compareTextMode24hIndicatorVerticalTickTape(
  options: TextMode24hIndicatorVerticalDiagnosticsOptions,
): TextMode24hIndicatorTickTapeComparison {
  const layoutBase: DisplayChromeLayoutConfig = {
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    ...options.displayChromeLayout,
  };
  const tapeVisible = computeTextMode24hIndicatorVerticalSnapshot({
    ...options,
    displayChromeLayout: { ...layoutBase, tickTapeVisible: true },
  });
  const tapeHidden = computeTextMode24hIndicatorVerticalSnapshot({
    ...options,
    displayChromeLayout: { ...layoutBase, tickTapeVisible: false },
  });
  const d = (a: number, b: number) => a - b;
  const csV = tapeVisible.circleStack;
  const csH = tapeHidden.circleStack;
  const circleStackIdentical =
    csV.padTopPx === csH.padTopPx &&
    csV.upperNumeralH === csH.upperNumeralH &&
    csV.gapNumeralToDiskPx === csH.gapNumeralToDiskPx &&
    csV.diskBandH === csH.diskBandH &&
    csV.gapDiskToAnnotationPx === csH.gapDiskToAnnotationPx &&
    csV.annotationH === csH.annotationH &&
    csV.padBottomPx === csH.padBottomPx &&
    csV.markerRadiusDiskBandHPx === csH.markerRadiusDiskBandHPx;
  const textAndDiskVerticalMetricsIdentical =
    circleStackIdentical &&
    tapeVisible.textAnchorYPx === tapeHidden.textAnchorYPx &&
    tapeVisible.yDiskRow0Px === tapeHidden.yDiskRow0Px &&
    tapeVisible.marginAboveTextInDiskRowPx === tapeHidden.marginAboveTextInDiskRowPx &&
    tapeVisible.marginBelowTextInDiskRowPx === tapeHidden.marginBelowTextInDiskRowPx &&
    tapeVisible.belowDiskRowInsideCircleBandPx === tapeHidden.belowDiskRowInsideCircleBandPx;
  return {
    viewportWidthPx: tapeVisible.viewportWidthPx,
    sizeMultiplier: tapeVisible.sizeMultiplier,
    tapeVisible,
    tapeHidden,
    delta: {
      topBandHeightPx: d(tapeHidden.topBandHeightPx, tapeVisible.topBandHeightPx),
      tickBandH: d(tapeHidden.tickBandHeightPx, tapeVisible.tickBandHeightPx),
      timezoneBandH: d(tapeHidden.rowMetrics.timezoneBandH, tapeVisible.rowMetrics.timezoneBandH),
      circleBandH: d(tapeHidden.rowMetrics.circleBandH, tapeVisible.rowMetrics.circleBandH),
      indicatorAreaHeightPx: d(tapeHidden.indicatorAreaHeightPx, tapeVisible.indicatorAreaHeightPx),
      circleStackSumPx: d(tapeHidden.circleStackSumPx, tapeVisible.circleStackSumPx),
      diskBandHeightPx: d(tapeHidden.diskBandHeightPx, tapeVisible.diskBandHeightPx),
      belowDiskRowInsideCircleBandPx: d(
        tapeHidden.belowDiskRowInsideCircleBandPx,
        tapeVisible.belowDiskRowInsideCircleBandPx,
      ),
      marginAboveDiskRowInCircleBandPx: d(
        tapeHidden.marginAboveDiskRowInCircleBandPx,
        tapeVisible.marginAboveDiskRowInCircleBandPx,
      ),
      gapDiskToAnnotationPx: d(
        tapeHidden.circleStack.gapDiskToAnnotationPx,
        tapeVisible.circleStack.gapDiskToAnnotationPx,
      ),
      annotationH: d(tapeHidden.circleStack.annotationH, tapeVisible.circleStack.annotationH),
      padBottomPx: d(tapeHidden.circleStack.padBottomPx, tapeVisible.circleStack.padBottomPx),
      textAnchorYPx: d(tapeHidden.textAnchorYPx, tapeVisible.textAnchorYPx),
      yDiskRow0Px: d(tapeHidden.yDiskRow0Px, tapeVisible.yDiskRow0Px),
      estimatedTextBottomToCircleBandBottomPx: d(
        tapeHidden.estimatedTextBottomToCircleBandBottomPx,
        tapeVisible.estimatedTextBottomToCircleBandBottomPx,
      ),
    },
    circleStackIdentical,
    textAndDiskVerticalMetricsIdentical,
  };
}
