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
import { cloneHourMarkersConfig, DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG } from "../config/appConfig.ts";
import { createTimeContext } from "../core/time.ts";
import { buildDisplayChromeState, sumTopBandCircleStackMetricsPx } from "./displayChrome.ts";
import { computeHourDiskLabelSizePx, TOP_CHROME_STYLE } from "../config/topChromeStyle.ts";
import { computeUtcCircleMarkerRadius } from "./displayChrome.ts";
import {
  compareTextMode24hIndicatorVerticalTickTape,
  computeTextMode24hIndicatorVerticalSnapshot,
} from "./textMode24hIndicatorVerticalDiagnostics.ts";

const VIEWPORT = { width: 1200, height: 800, devicePixelRatio: 1 } as const;

function snapshotForSizeMultiplier(sm: number) {
  return computeTextMode24hIndicatorVerticalSnapshot({
    viewport: VIEWPORT,
    displayChromeLayout: {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
        layout: { sizeMultiplier: sm, textTopMarginPx: 0, textBottomMarginPx: 0 },
      },
    },
  });
}

describe("textMode24hIndicatorVerticalDiagnostics tickTapeVisible vs chrome", () => {
  it("matches buildDisplayChromeState rows when tick tape is hidden (collapsed tick row)", () => {
    const sm = 1.2;
    const time = createTimeContext(Date.UTC(2026, 0, 1, 12, 0, 0, 0), 0, false);
    const chromeHidden = buildDisplayChromeState({
      time,
      viewport: VIEWPORT,
      frame: { frameNumber: 0, now: time.now, deltaMs: 0 },
      displayChromeLayout: {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        tickTapeVisible: false,
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: sm },
        },
      },
    });
    const snap = computeTextMode24hIndicatorVerticalSnapshot({
      viewport: VIEWPORT,
      time,
      displayChromeLayout: {
        tickTapeVisible: false,
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: sm },
        },
      },
    });
    expect(snap.rowMetrics).toEqual(chromeHidden.utcTopScale.rows);
    expect(snap.tickTapeVisibleEffective).toBe(false);
    expect(snap.tickBandHeightPx).toBe(0);
  });

  it("compareTextMode24hIndicatorVerticalTickTape: circle stack and lower-side slices unchanged when tape hidden", () => {
    const sm = 1.45;
    const cmp = compareTextMode24hIndicatorVerticalTickTape({
      viewport: VIEWPORT,
      displayChromeLayout: {
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: sm },
        },
      },
    });
    expect(cmp.circleStackIdentical).toBe(true);
    expect(cmp.textAndDiskVerticalMetricsIdentical).toBe(true);
    expect(cmp.delta.circleBandH).toBe(0);
    expect(cmp.delta.belowDiskRowInsideCircleBandPx).toBe(0);
    expect(cmp.delta.gapDiskToAnnotationPx).toBe(0);
    expect(cmp.delta.annotationH).toBe(0);
    expect(cmp.delta.padBottomPx).toBe(0);
    expect(cmp.delta.tickBandH).toBe(-cmp.tapeVisible.tickBandHeightPx);
    expect(cmp.delta.topBandHeightPx).toBe(cmp.delta.tickBandH);
    expect(cmp.tapeHidden.bottomSideNonRowSpaceInsideCircleBandPx).toBe(
      cmp.tapeVisible.bottomSideNonRowSpaceInsideCircleBandPx,
    );
    expect(cmp.tapeHidden.lowerSideStackSlicesPx).toEqual(cmp.tapeVisible.lowerSideStackSlicesPx);
  });

  it("compareTextMode24hIndicatorVerticalTickTape: 1.20x representative side-by-side numbers (tape on vs off)", () => {
    const sm = 1.2;
    const cmp = compareTextMode24hIndicatorVerticalTickTape({
      viewport: VIEWPORT,
      displayChromeLayout: {
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: sm },
        },
      },
    });
    const v = cmp.tapeVisible;
    const h = cmp.tapeHidden;
    const table = {
      on_topBand: v.topBandHeightPx,
      off_topBand: h.topBandHeightPx,
      on_circleH: v.rowMetrics.circleBandH,
      off_circleH: h.rowMetrics.circleBandH,
      on_tickH: v.tickBandHeightPx,
      off_tickH: h.tickBandHeightPx,
      on_diskRowH: v.diskBandHeightPx,
      off_diskRowH: h.diskBandHeightPx,
      on_bottomNonRow: v.belowDiskRowInsideCircleBandPx,
      off_bottomNonRow: h.belowDiskRowInsideCircleBandPx,
      on_gapAnn: v.lowerSideStackSlicesPx.gapDiskToAnnotationPx,
      on_ann: v.lowerSideStackSlicesPx.annotationH,
      on_padBot: v.lowerSideStackSlicesPx.padBottomPx,
      textBot_to_bandBot_on: v.estimatedTextBottomToCircleBandBottomPx,
      textBot_to_bandBot_off: h.estimatedTextBottomToCircleBandBottomPx,
      textBot_to_tickTop_on: v.estimatedTextBottomToMajorTickTopPx,
      textBot_to_tickTop_off: h.estimatedTextBottomToMajorTickTopPx,
    };
    // eslint-disable-next-line no-console -- diagnostic table for investigation runs
    console.table(table);
    expect(table.on_bottomNonRow).toBe(table.off_bottomNonRow);
  });

  it("compareTextMode24hIndicatorVerticalTickTape: 1.45x representative side-by-side numbers (tape on vs off)", () => {
    const sm = 1.45;
    const cmp = compareTextMode24hIndicatorVerticalTickTape({
      viewport: VIEWPORT,
      displayChromeLayout: {
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: sm },
        },
      },
    });
    const v = cmp.tapeVisible;
    const h = cmp.tapeHidden;
    const table = {
      on_topBand: v.topBandHeightPx,
      off_topBand: h.topBandHeightPx,
      on_circleH: v.rowMetrics.circleBandH,
      off_circleH: h.rowMetrics.circleBandH,
      on_tickH: v.tickBandHeightPx,
      off_tickH: h.tickBandHeightPx,
      on_diskRowH: v.diskBandHeightPx,
      off_diskRowH: h.diskBandHeightPx,
      on_bottomNonRow: v.belowDiskRowInsideCircleBandPx,
      off_bottomNonRow: h.belowDiskRowInsideCircleBandPx,
      on_gapAnn: v.lowerSideStackSlicesPx.gapDiskToAnnotationPx,
      on_ann: v.lowerSideStackSlicesPx.annotationH,
      on_padBot: v.lowerSideStackSlicesPx.padBottomPx,
      textBot_to_bandBot_on: v.estimatedTextBottomToCircleBandBottomPx,
      textBot_to_bandBot_off: h.estimatedTextBottomToCircleBandBottomPx,
    };
    // eslint-disable-next-line no-console -- diagnostic table for investigation runs
    console.table(table);
    expect(cmp.circleStackIdentical).toBe(true);
    expect(table.on_bottomNonRow).toBe(table.off_bottomNonRow);
  });
});

describe("textMode24hIndicatorVerticalDiagnostics", () => {
  it("matches buildDisplayChromeState row heights and stack sum vs circle band", () => {
    const sm = 1.45;
    const s = snapshotForSizeMultiplier(sm);
    const time = createTimeContext(Date.UTC(2026, 0, 1, 12, 0, 0, 0), 0, false);
    const chrome = buildDisplayChromeState({
      time,
      viewport: VIEWPORT,
      frame: { frameNumber: 0, now: time.now, deltaMs: 0 },
      displayChromeLayout: {
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: sm },
        },
      },
    });
    expect(chrome.topBand.height).toBe(s.topBandHeightPx);
    expect(chrome.utcTopScale.rows).toEqual(s.rowMetrics);
    expect(chrome.utcTopScale.circleStack).toEqual(s.circleStack);
    const sumFromChrome = sumTopBandCircleStackMetricsPx(chrome.utcTopScale.circleStack!);
    expect(s.circleStackSumPx).toBe(sumFromChrome);
    expect(s.circleBandHeightVsStackSumDeltaPx).toBe(
      chrome.utcTopScale.rows!.circleBandH - sumFromChrome,
    );
    expect(s.circleBandHeightVsStackSumDeltaPx).toBe(0);
    expect(Math.abs(s.marginAboveTextInDiskRowPx - s.marginBelowTextInDiskRowPx)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(s.indicatorAreaMarginAboveTextPx - s.indicatorAreaMarginBelowTextPx),
    ).toBeLessThanOrEqual(1);
  });

  it("user text insets do not change solved disk row, marker radius, or nominal font size; they shift the anchor only", () => {
    const base = computeTextMode24hIndicatorVerticalSnapshot({
      viewport: VIEWPORT,
      displayChromeLayout: {
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { sizeMultiplier: 1.2, textTopMarginPx: 0, textBottomMarginPx: 0 },
        },
      },
    });
    const inset = computeTextMode24hIndicatorVerticalSnapshot({
      viewport: VIEWPORT,
      displayChromeLayout: {
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { sizeMultiplier: 1.2, textTopMarginPx: 5, textBottomMarginPx: 3 },
        },
      },
    });
    expect(inset.diskBandHeightPx).toBe(base.diskBandHeightPx);
    expect(inset.circleStack).toEqual(base.circleStack);
    expect(inset.markerContentSizePx).toBe(base.markerContentSizePx);
    expect(inset.emitEffectiveFontSizePx).toBe(base.emitEffectiveFontSizePx);
    const sw = VIEWPORT.width / 24;
    expect(computeUtcCircleMarkerRadius(inset.diskBandHeightPx, sw)).toBe(
      computeUtcCircleMarkerRadius(base.diskBandHeightPx, sw),
    );
    expect(
      computeHourDiskLabelSizePx(
        computeUtcCircleMarkerRadius(inset.diskBandHeightPx, sw),
        VIEWPORT.width,
        TOP_CHROME_STYLE.hourDiskLabel,
      ),
    ).toBe(
      computeHourDiskLabelSizePx(
        computeUtcCircleMarkerRadius(base.diskBandHeightPx, sw),
        VIEWPORT.width,
        TOP_CHROME_STYLE.hourDiskLabel,
      ),
    );
    expect(inset.textAnchorYPx - base.textAnchorYPx).toBe(2);
    expect(inset.textRowUserInsetTextCenterDeltaPx).toBe(2);
    expect(inset.textAnchorBaselineYPx).toBe(base.textAnchorBaselineYPx);
  });

  it("zero user insets match baseline anchor (no delta vs baseline layout)", () => {
    const s = computeTextMode24hIndicatorVerticalSnapshot({
      viewport: VIEWPORT,
      displayChromeLayout: {
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { sizeMultiplier: 1.35, textTopMarginPx: 0, textBottomMarginPx: 0 },
        },
      },
    });
    expect(s.textRowUserInsetTextCenterDeltaPx).toBe(0);
    expect(s.textAnchorYPx).toBe(s.textAnchorBaselineYPx);
  });

  it("text mode: indicator-area top/bottom margins around text match (≤1px) at 0.95–1.65×; unchanged when tape toggles", () => {
    const sizes = [0.95, 1.2, 1.45, 1.65] as const;
    for (const sm of sizes) {
      const on = computeTextMode24hIndicatorVerticalSnapshot({
        viewport: VIEWPORT,
        displayChromeLayout: {
          ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
          tickTapeVisible: true,
          hourMarkers: {
            ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
            layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: sm },
          },
        },
      });
      const off = computeTextMode24hIndicatorVerticalSnapshot({
        viewport: VIEWPORT,
        displayChromeLayout: {
          ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
          tickTapeVisible: false,
          hourMarkers: {
            ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
            layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: sm },
          },
        },
      });
      for (const s of [on, off]) {
        expect(
          Math.abs(s.indicatorAreaMarginAboveTextPx - s.indicatorAreaMarginBelowTextPx),
        ).toBeLessThanOrEqual(1);
      }
      expect(on.indicatorAreaMarginAboveTextPx).toBe(off.indicatorAreaMarginAboveTextPx);
      expect(on.indicatorAreaMarginBelowTextPx).toBe(off.indicatorAreaMarginBelowTextPx);
    }
  });

  it("reports geometry for representative size multipliers (0.95, 1.20, 1.45, 1.65)", () => {
    const sizes = [0.95, 1.2, 1.45, 1.65] as const;
    const rows: Record<
      string,
      {
        topBandHeightPx: number;
        circleBandH: number;
        stackSumVsBandDelta: number;
        diskBandH: number;
        textAnchorY: number;
        diskRowTop: number;
        diskRowBottom: number;
        marginAboveTextInDiskRow: number;
        marginBelowTextInDiskRow: number;
        opticalOffset: number;
        textCorePx: number;
        topPadInsideDisk: number;
        bottomPadInsideDisk: number;
        textRowHeight: number;
        majorTickTop: number;
        yCircleBottom: number;
        estTextBottomToTape: number;
        marginAboveDiskRow: number;
        marginBelowDiskBeforeTape: number;
      }
    > = {};
    for (const sm of sizes) {
      const s = snapshotForSizeMultiplier(sm);
      rows[String(sm)] = {
        topBandHeightPx: s.topBandHeightPx,
        circleBandH: s.rowMetrics.circleBandH,
        stackSumVsBandDelta: s.circleBandHeightVsStackSumDeltaPx,
        diskBandH: s.diskBandHeightPx,
        textAnchorY: s.textAnchorYPx,
        diskRowTop: s.yDiskRow0Px,
        diskRowBottom: s.yDiskRow0Px + s.diskBandHeightPx,
        marginAboveTextInDiskRow: s.marginAboveTextInDiskRowPx,
        marginBelowTextInDiskRow: s.marginBelowTextInDiskRowPx,
        opticalOffset: s.opticalOffsetPx,
        textCorePx: s.textCoreHeightPx,
        topPadInsideDisk: s.topPadInsideDiskPx,
        bottomPadInsideDisk: s.bottomPadInsideDiskPx,
        textRowHeight: s.textIndicatorRowHeightPx,
        majorTickTop: s.tickTapeMajorTickTopPx,
        yCircleBottom: s.yCircleBottomPx,
        estTextBottomToTape: s.estimatedTextBottomToMajorTickTopPx,
        marginAboveDiskRow: s.marginAboveDiskRowInCircleBandPx,
        marginBelowDiskBeforeTape: s.belowDiskRowInsideCircleBandPx,
      };
    }
    // eslint-disable-next-line no-console -- diagnostic table for investigation runs
    console.table(rows);
  });
});
