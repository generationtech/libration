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
import {
  cloneHourMarkersConfig,
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_DISPLAY_TIME_CONFIG,
  effectiveTopBandHourMarkerSelection,
} from "../config/appConfig.ts";
import { resolveEffectiveTopBandHourMarkers } from "../config/topBandHourMarkersResolver.ts";
import {
  buildDisplayChromeState,
  collapseTopBandHourIndicatorAreaRows,
  computeHourMarkerCircleBandExpansionPx,
  computeTextIndicatorCircleBandExpansionPx,
  computeUtcTopScaleRowMetrics,
  expandTopBandCircleBandPreservingLowerBands,
  resolveTextIndicatorCircleStackMetrics,
  sumTopBandCircleStackMetricsPx,
  TOP_BAND_GLYPH_DISK_CONTENT_SCALE,
} from "./displayChrome.ts";
import { TOP_CHROME_STYLE } from "../config/topChromeStyle.ts";
import { createTimeContext } from "../core/time.ts";

describe("hour-marker circle-band expansion", () => {
  it("increases only circle band height; tick and timezone bands stay fixed", () => {
    const top = 61;
    const baseRows = computeUtcTopScaleRowMetrics(top, DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const layoutLargeText = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
        layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: 2 },
      },
    };
    const delta = computeTextIndicatorCircleBandExpansionPx({
      baseRows,
      viewportWidthPx: 960,
      hourDiskLabelTokens: TOP_CHROME_STYLE.hourDiskLabel,
      layout: layoutLargeText,
    });
    expect(delta).toBeGreaterThan(0);
    const expanded = expandTopBandCircleBandPreservingLowerBands(baseRows, delta);
    expect(expanded.topBandHeightPx).toBe(baseRows.topBandHeightPx + delta);
    expect(expanded.circleBandH).toBe(baseRows.circleBandH + delta);
    expect(expanded.tickBandH).toBe(baseRows.tickBandH);
    expect(expanded.timezoneBandH).toBe(baseRows.timezoneBandH);
  });

  it("derives text circle-band need from sum(direct text-led stack), not stack-solver disk-band binary search", () => {
    const baseRows = computeUtcTopScaleRowMetrics(72, DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const stack = resolveTextIndicatorCircleStackMetrics({
      viewportWidthPx: 960,
      hourDiskLabelTokens: TOP_CHROME_STYLE.hourDiskLabel,
      layout: DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      seedCircleBandHeightPx: baseRows.circleBandH,
    });
    const needCircleH = sumTopBandCircleStackMetricsPx(stack);
    const delta = computeTextIndicatorCircleBandExpansionPx({
      baseRows,
      viewportWidthPx: 960,
      hourDiskLabelTokens: TOP_CHROME_STYLE.hourDiskLabel,
      layout: DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    });
    expect(delta).toBe(Math.max(0, Math.round(needCircleH - baseRows.circleBandH)));
  });

  it("uses a larger nominal glyph disk factor than 1× text for default glyph selection", () => {
    expect(TOP_BAND_GLYPH_DISK_CONTENT_SCALE).toBeGreaterThan(1.15);
  });

  it("glyph hour markers still use disk-head expansion, not the text-led path", () => {
    const baseRows = computeUtcTopScaleRowMetrics(80, DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const layoutGlyph = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
        realization: { kind: "radialLine" as const, appearance: {} },
      },
    };
    const delta = computeHourMarkerCircleBandExpansionPx({
      baseRows,
      viewportWidthPx: 960,
      hourDiskLabelTokens: TOP_CHROME_STYLE.hourDiskLabel,
      layout: layoutGlyph,
      selection: effectiveTopBandHourMarkerSelection(layoutGlyph),
    });
    expect(resolveEffectiveTopBandHourMarkers(layoutGlyph).realization.kind).toBe("radialLine");
    expect(delta).toBeGreaterThanOrEqual(0);
  });
});

describe("hour marker indicator area visibility", () => {
  it("collapsing the circle band preserves tick + NATO heights and shortens total top band", () => {
    const rows = computeUtcTopScaleRowMetrics(72, DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const collapsed = collapseTopBandHourIndicatorAreaRows(rows);
    expect(collapsed.circleBandH).toBe(0);
    expect(collapsed.tickBandH).toBe(rows.tickBandH);
    expect(collapsed.timezoneBandH).toBe(rows.timezoneBandH);
    expect(collapsed.topBandHeightPx).toBe(rows.tickBandH + rows.timezoneBandH);
  });

  it("buildDisplayChromeState omits tick tape geometry when tickTapeVisible is false", () => {
    const now = Date.UTC(2024, 5, 1, 12, 0, 0);
    const hidden = buildDisplayChromeState({
      time: createTimeContext(now, 0, false),
      viewport: { width: 960, height: 700, devicePixelRatio: 1 },
      frame: { frameNumber: 1, now, deltaMs: 0 },
      displayTime: DEFAULT_DISPLAY_TIME_CONFIG,
      displayChromeLayout: {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        tickTapeVisible: false,
      },
    });
    expect(hidden.utcTopScale.rows?.tickBandH).toBe(0);
    expect(hidden.topBand.height).toBe(
      (hidden.utcTopScale.rows?.circleBandH ?? 0) + (hidden.utcTopScale.rows?.timezoneBandH ?? 0),
    );
  });

  it("buildDisplayChromeState omits circle band when hourMarkers.visible is false", () => {
    const now = Date.UTC(2024, 5, 1, 12, 0, 0);
    const hidden = buildDisplayChromeState({
      time: createTimeContext(now, 0, false),
      viewport: { width: 960, height: 700, devicePixelRatio: 1 },
      frame: { frameNumber: 1, now, deltaMs: 0 },
      displayTime: DEFAULT_DISPLAY_TIME_CONFIG,
      displayChromeLayout: {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          visible: false,
        },
      },
    });
    expect(hidden.utcTopScale.rows?.circleBandH).toBe(0);
    expect(hidden.effectiveTopBandHourMarkers.enabled).toBe(false);
    expect(hidden.topBand.height).toBe(
      (hidden.utcTopScale.rows?.tickBandH ?? 0) + (hidden.utcTopScale.rows?.timezoneBandH ?? 0),
    );
  });
});

describe("buildDisplayChromeState hour-marker row", () => {
  it("raises top band height when structured hour markers need a taller disk row", () => {
    const now = Date.UTC(2024, 5, 1, 12, 0, 0);
    const base = buildDisplayChromeState({
      time: createTimeContext(now, 0, false),
      viewport: { width: 960, height: 700, devicePixelRatio: 1 },
      frame: { frameNumber: 1, now, deltaMs: 0 },
      displayTime: DEFAULT_DISPLAY_TIME_CONFIG,
      displayChromeLayout: DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    });
    const tall = buildDisplayChromeState({
      time: createTimeContext(now, 0, false),
      viewport: { width: 960, height: 700, devicePixelRatio: 1 },
      frame: { frameNumber: 1, now, deltaMs: 0 },
      displayTime: DEFAULT_DISPLAY_TIME_CONFIG,
      displayChromeLayout: {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout, sizeMultiplier: 2 },
        },
      },
    });
    expect(tall.topBand.height).toBeGreaterThan(base.topBand.height);
  });
});
