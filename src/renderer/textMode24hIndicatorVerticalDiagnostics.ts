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
import type { TextMode24hIndicatorRenderDiagnosticsPayload } from "./renderPlan/renderPlanTypes.ts";

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
  /** Same as {@link yDiskRow0Px} — disk-row top Y in viewport space. */
  diskRowTopYPx: number;
  /** Disk-row bottom Y ({@link yDiskRow0Px} + {@link diskBandHeightPx}). */
  diskRowBottomYPx: number;
  diskBandHeightPx: number;
  /** Same as {@link diskBandHeightPx} — disk-row height. */
  diskRowHeightPx: number;
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
  /** Authoritative text core height for layout (px); matches nominal disk label size (or font metrics when provided). */
  textCoreHeightPx: number;
  /** Total top padding above the text core inside the disk row (px) — same as configured top inset. */
  topPadInsideDiskPx: number;
  /** Total bottom padding below the text core inside the disk row (px) — same as configured bottom inset. */
  bottomPadInsideDiskPx: number;
  /** Same as {@link textAnchorYPx}: vertical center of the laid-out text (px). */
  textCenterYPx: number;
  /** Row height from the vertical model: {@code textCoreHeightPx + top + bottom} (px). */
  rowHeightPx: number;
  /** Emitted font size for disk numerals (px); equals {@link markerContentSizePx} (style inset not applied on emit). */
  effectiveFontSizePx: number;
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
  /** Same as {@link effectiveFontSizePx} (disk row uses full {@link markerContentSizePx}). */
  emitEffectiveFontSizePx: number;
  /** Y passed to Canvas {@code fillText} for centered disk text (after baseline shift). */
  emitFillTextAnchorYPx: number;
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
  const baselineShiftFrac = gStyle.text.baselineShiftFrac ?? 0;
  const emitShift = markerContentSizePx * baselineShiftFrac;
  const emitFont = markerContentSizePx;

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
    diskRowTopYPx: yDiskRow0,
    diskRowBottomYPx: yDiskRow0 + diskBandH,
    diskBandHeightPx: diskBandH,
    diskRowHeightPx: diskBandH,
    diskRowMidYPx: diskRowMidY,
    textAnchorBaselineYPx: textAnchorBaselineY,
    userTextTopInsetPx,
    userTextBottomInsetPx,
    structuralDiskRowSlackPx: vmLayout.structuralDiskRowSlackPx,
    intrinsicDiskBandForSizingPx,
    solvedMarkerRadiusPx: markerRadiusPx,
    textAnchorYPx: textAnchorY,
    textCenterYPx: textAnchorY,
    opticalOffsetPx,
    diskLabelSizePx,
    markerContentSizePx,
    textCoreHeightPx: vmLayout.textCoreHeightPx,
    topPadInsideDiskPx: vmLayout.topPadInsideDiskPx,
    bottomPadInsideDiskPx: vmLayout.bottomPadInsideDiskPx,
    rowHeightPx: textRowH,
    effectiveFontSizePx: emitFont,
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
    emitFillTextAnchorYPx: textAnchorY + emitShift,
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

// --- Runtime Canvas diagnostics (representative hour marker, dev console) ---

/** Sub-pixel tolerance when treating visible gaps as zero (device pixels + float math). */
export const TEXT_MODE_24H_VERTICAL_GAP_EPS_PX = 0.75;

/**
 * 24h disk numeral path: {@code layout.cy + baselineShift} is the intended vertical center; Canvas
 * {@code textBaseline: "alphabetic"} anchor is the baseline. This maps center → {@code fillText} Y
 * using measured {@link TextMetrics.actualBoundingBoxAscent} / {@link TextMetrics.actualBoundingBoxDescent}.
 */
export function computeAlphabeticFillTextYForLayoutCenterYPx(
  layoutCenterYPx: number,
  metrics: TextMetrics,
): number {
  const a = metrics.actualBoundingBoxAscent;
  const d = metrics.actualBoundingBoxDescent;
  const ascent = typeof a === "number" && Number.isFinite(a) ? a : 0;
  const descent = typeof d === "number" && Number.isFinite(d) ? d : 0;
  return layoutCenterYPx + (ascent - descent) / 2;
}

/**
 * Single structured snapshot for devtools: row bounds, layout, Canvas {@code measureText} glyph box, visible gaps.
 * Field {@link baselineYPx} is the actual Canvas {@code fillText} Y (alphabetic baseline after measured centering when used).
 */
export type TextMode24hIndicatorConsolidatedVerticalDiagnostics = {
  diskRowTopYPx: number;
  diskRowBottomYPx: number;
  diskRowHeightPx: number;
  textCenterYPx: number;
  /** {@code fillText} anchor Y after emit baseline shift (see {@link emitTextGlyph}). */
  baselineYPx: number;
  layoutSizePx: number;
  fontSizePx: number;
  textBaseline: string;
  glyphTopYPx: number;
  glyphBottomYPx: number;
  glyphHeightPx: number;
  visibleTopGapPx: number;
  visibleBottomGapPx: number;
  configuredTopInsetPx: number;
  configuredBottomInsetPx: number;
  textCoreHeightPx: number;
  baselineShiftPx: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
};

export type TextMode24hIndicatorVerticalGapInvariantReport = {
  config00: boolean;
  topGapApproximatelyZero: boolean;
  bottomGapApproximatelyZero: boolean;
  failures: string[];
  /** Short labels for which mechanism likely explains non-zero gaps (see task §4). */
  likelySources: ("A_baseline_math" | "B_glyph_vs_layout_height" | "C_canvas_textBaseline" | "D_font_metrics_asymmetry" | "E_rounding_or_snapping")[];
  notes: string[];
};

/**
 * HTML Canvas: distances from the anchor {@code y} to the glyph bounding box (see {@code TextMetrics}).
 */
export function glyphVerticalBoundsFromCanvasMeasureText(
  fillTextAnchorYPx: number,
  metrics: TextMetrics,
): {
  glyphTopYPx: number;
  glyphBottomYPx: number;
  glyphHeightPx: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
} {
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  const hasAsc = typeof ascent === "number" && Number.isFinite(ascent);
  const hasDesc = typeof descent === "number" && Number.isFinite(descent);
  const actualBoundingBoxAscent = hasAsc ? ascent : 0;
  const actualBoundingBoxDescent = hasDesc ? descent : 0;
  const glyphTopYPx = fillTextAnchorYPx - actualBoundingBoxAscent;
  const glyphBottomYPx = fillTextAnchorYPx + actualBoundingBoxDescent;
  const glyphHeightPx = Math.max(0, glyphBottomYPx - glyphTopYPx);
  return {
    glyphTopYPx,
    glyphBottomYPx,
    glyphHeightPx,
    actualBoundingBoxAscent,
    actualBoundingBoxDescent,
  };
}

/**
 * Merges pre-layout row payload with measured Canvas metrics and derived visible gaps.
 */
export function buildTextMode24hIndicatorConsolidatedVerticalDiagnostics(args: {
  pre: TextMode24hIndicatorRenderDiagnosticsPayload;
  fontSizePx: number;
  textBaseline: string;
  fillTextAnchorYPx: number;
  metrics: TextMetrics;
}): TextMode24hIndicatorConsolidatedVerticalDiagnostics {
  const { pre, fontSizePx, textBaseline, fillTextAnchorYPx, metrics } = args;
  const g = glyphVerticalBoundsFromCanvasMeasureText(fillTextAnchorYPx, metrics);
  const visibleTopGapPx = g.glyphTopYPx - pre.diskRowTopYPx;
  const visibleBottomGapPx = pre.diskRowBottomYPx - g.glyphBottomYPx;
  return {
    diskRowTopYPx: pre.diskRowTopYPx,
    diskRowBottomYPx: pre.diskRowBottomYPx,
    diskRowHeightPx: pre.diskRowHeightPx,
    textCenterYPx: pre.textCenterYPx,
    baselineYPx: fillTextAnchorYPx,
    layoutSizePx: pre.layoutSizePx,
    fontSizePx,
    textBaseline,
    glyphTopYPx: g.glyphTopYPx,
    glyphBottomYPx: g.glyphBottomYPx,
    glyphHeightPx: g.glyphHeightPx,
    visibleTopGapPx,
    visibleBottomGapPx,
    configuredTopInsetPx: pre.topInsetPx,
    configuredBottomInsetPx: pre.bottomInsetPx,
    textCoreHeightPx: pre.textCoreHeightPx,
    baselineShiftPx: pre.baselineShiftPx,
    actualBoundingBoxAscent: g.actualBoundingBoxAscent,
    actualBoundingBoxDescent: g.actualBoundingBoxDescent,
  };
}

/**
 * When both text insets are 0, visible gaps should be ~0; lists which checklist items apply if not.
 */
export function analyzeTextMode24hVerticalGapInvariants(
  consolidated: TextMode24hIndicatorConsolidatedVerticalDiagnostics,
  epsPx: number = TEXT_MODE_24H_VERTICAL_GAP_EPS_PX,
): TextMode24hIndicatorVerticalGapInvariantReport {
  const failures: string[] = [];
  const notes: string[] = [];
  const likelySources: TextMode24hIndicatorVerticalGapInvariantReport["likelySources"] = [];

  const config00 =
    consolidated.configuredTopInsetPx === 0 && consolidated.configuredBottomInsetPx === 0;
  const topGapApproximatelyZero = Math.abs(consolidated.visibleTopGapPx) <= epsPx;
  const bottomGapApproximatelyZero = Math.abs(consolidated.visibleBottomGapPx) <= epsPx;

  if (config00 && !topGapApproximatelyZero) {
    failures.push(
      `visibleTopGapPx=${consolidated.visibleTopGapPx} (expected ~0 when insets are 0/0)`,
    );
  }
  if (config00 && !bottomGapApproximatelyZero) {
    failures.push(
      `visibleBottomGapPx=${consolidated.visibleBottomGapPx} (expected ~0 when insets are 0/0)`,
    );
  }

  const shift = consolidated.baselineShiftPx;
  if (Math.abs(shift) > epsPx) {
    likelySources.push("A_baseline_math");
    notes.push(`Non-zero emit baselineShiftPx=${shift} moves fillText Y away from layout textCenterYPx.`);
  }

  const layoutH = consolidated.layoutSizePx;
  const gh = consolidated.glyphHeightPx;
  if (Math.abs(gh - layoutH) > epsPx) {
    likelySources.push("B_glyph_vs_layout_height");
    notes.push(`glyphHeightPx=${gh} vs layoutSizePx=${layoutH} (layout uses nominal em/core height).`);
  }

  if (consolidated.textBaseline === "middle") {
    likelySources.push("C_canvas_textBaseline");
    notes.push(
      'Canvas "middle" anchors to the em-box vertical midpoint; TextMetrics bounding box may extend asymmetrically around that anchor.',
    );
  }

  const asc = consolidated.actualBoundingBoxAscent;
  const desc = consolidated.actualBoundingBoxDescent;
  if (Math.abs(asc - desc) > epsPx * 2) {
    likelySources.push("D_font_metrics_asymmetry");
    notes.push(`actualBoundingBoxAscent=${asc} vs descent=${desc} (font-specific vertical ink).`);
  }

  const halfLayout = consolidated.textCoreHeightPx * 0.5;
  const estTop = consolidated.textCenterYPx - halfLayout;
  const estBot = consolidated.textCenterYPx + halfLayout;
  const topSnap = Math.abs(consolidated.glyphTopYPx - estTop) > epsPx;
  const botSnap = Math.abs(consolidated.glyphBottomYPx - estBot) > epsPx;
  if (topSnap || botSnap) {
    likelySources.push("E_rounding_or_snapping");
    notes.push(
      `Layout estimated box [${estTop}, ${estBot}] vs measured glyph [${consolidated.glyphTopYPx}, ${consolidated.glyphBottomYPx}].`,
    );
  }

  return {
    config00,
    topGapApproximatelyZero,
    bottomGapApproximatelyZero,
    failures,
    likelySources: [...new Set(likelySources)],
    notes,
  };
}

const textMode24hDiagLoggedKeys = new Set<string>();

/**
 * Logs one consolidated object per session key (default one log per page load for the representative marker).
 */
export function logTextMode24hIndicatorVerticalDiagnosticsSnapshot(args: {
  consolidated: TextMode24hIndicatorConsolidatedVerticalDiagnostics;
  invariantReport: TextMode24hIndicatorVerticalGapInvariantReport;
  /** Dedupe when the same plan runs every frame; default "default". */
  sessionKey?: string;
}): void {
  if (!import.meta.env.DEV || import.meta.env.MODE === "test") {
    return;
  }
  const sessionKey = args.sessionKey ?? "default";
  if (textMode24hDiagLoggedKeys.has(sessionKey)) {
    return;
  }
  textMode24hDiagLoggedKeys.add(sessionKey);

  const { consolidated, invariantReport } = args;
  // eslint-disable-next-line no-console -- intentional dev-only instrumentation
  console.log("[Libration] textMode24hIndicatorVerticalDiagnostics", consolidated);
  // eslint-disable-next-line no-console -- intentional dev-only instrumentation
  console.log("[Libration] textMode24hIndicatorVerticalDiagnostics invariants", invariantReport);
}
