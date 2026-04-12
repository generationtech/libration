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
import { computeTextMode24hIndicatorVerticalSnapshot } from "./textMode24hIndicatorVerticalDiagnostics.ts";

const VIEWPORT = { width: 1200, height: 800, devicePixelRatio: 1 } as const;

function snapshotForSizeMultiplier(sm: number) {
  return computeTextMode24hIndicatorVerticalSnapshot({
    viewport: VIEWPORT,
    displayChromeLayout: {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
        layout: { sizeMultiplier: sm },
      },
    },
  });
}

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
          layout: { sizeMultiplier: sm },
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
  });

  it("reports geometry for representative size multipliers (0.95, 1.45, 1.65)", () => {
    const sizes = [0.95, 1.45, 1.65] as const;
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
      };
    }
    // eslint-disable-next-line no-console -- diagnostic table for investigation runs
    console.table(rows);
  });
});
