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
  resolvedHourMarkerLayoutSizeMultiplier,
} from "../config/appConfig.ts";
import { resolveEffectiveTopBandHourMarkers } from "../config/topBandHourMarkersResolver.ts";
import {
  buildDisplayChromeState,
  computeTopBandCircleStackMetrics,
  computeTopBandCircleStackMetricsForCanonicalDiskRow,
  computeUtcCircleMarkerRadius,
  computeUtcTopScaleRowMetrics,
  solveCanonicalHourMarkerDiskBandHeightPx,
  sumTopBandCircleStackHeightPx,
  TOP_BAND_GLYPH_DISK_CONTENT_SCALE,
} from "./displayChrome.ts";
import { computeHourDiskLabelSizePx, getTopChromeStyle } from "../config/topChromeStyle.ts";
import { defaultFontAssetRegistry } from "../config/chromeTypography.ts";
import { createTimeContext } from "../core/time.ts";

describe("hour-marker canonical indicator disk band", () => {
  it("keeps tick and timezone band heights from the viewport baseline row split; circle band matches canonical stack sum", () => {
    const top = 61;
    const baseRows = computeUtcTopScaleRowMetrics(top, DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const layoutLargeText = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
        layout: { sizeMultiplier: 2 },
      },
    };
    const sel = effectiveTopBandHourMarkerSelection(layoutLargeText);
    const eff = resolveEffectiveTopBandHourMarkers(layoutLargeText);
    const baseStack = computeTopBandCircleStackMetrics(baseRows.circleBandH);
    const { diskBandHeightPx: diskH, intrinsicContentHeightPx } = solveCanonicalHourMarkerDiskBandHeightPx({
      viewportWidthPx: 960,
      hourDiskLabelTokens: getTopChromeStyle("neutral").hourDiskLabel,
      layout: layoutLargeText,
      selection: sel,
      hourMarkerLayout: eff.layout,
      fontRegistry: defaultFontAssetRegistry,
      topBandMode: DEFAULT_DISPLAY_TIME_CONFIG.topBandMode,
      baseDiskBandGuessPx: baseStack.diskBandH,
    });
    expect(diskH).toBeGreaterThan(0);
    expect(intrinsicContentHeightPx).toBeGreaterThan(0);
    const stack = computeTopBandCircleStackMetricsForCanonicalDiskRow(diskH);
    expect(stack.diskBandH).toBe(diskH);
    const circleBandH = sumTopBandCircleStackHeightPx(stack);
    const rowMetrics = {
      topBandHeightPx: circleBandH + baseRows.tickBandH + baseRows.timezoneBandH,
      circleBandH,
      tickBandH: baseRows.tickBandH,
      timezoneBandH: baseRows.timezoneBandH,
    };
    expect(rowMetrics.tickBandH).toBe(baseRows.tickBandH);
    expect(rowMetrics.timezoneBandH).toBe(baseRows.timezoneBandH);
    expect(rowMetrics.circleBandH).toBe(sumTopBandCircleStackHeightPx(stack));
  });

  it("uses a larger nominal glyph disk factor than 1× text for default glyph selection", () => {
    expect(TOP_BAND_GLYPH_DISK_CONTENT_SCALE).toBeGreaterThan(1.15);
  });

  it("does not change intrinsic scale (text) when explicit top padding crosses ~11 with bottom Auto (1.5× repro)", () => {
    const baseRows = computeUtcTopScaleRowMetrics(61, DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const baseStack = computeTopBandCircleStackMetrics(baseRows.circleBandH);
    const vw = 960;
    const sw = vw / 24;
    const tokens = getTopChromeStyle("neutral").hourDiskLabel;
    const solve = (topPad: number) => {
      const layout = {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: {
            sizeMultiplier: 1.5,
            contentPaddingTopPx: topPad,
            // bottom omitted → Auto (fraction of intrinsic)
          },
        },
      };
      return solveCanonicalHourMarkerDiskBandHeightPx({
        viewportWidthPx: vw,
        hourDiskLabelTokens: tokens,
        layout,
        selection: effectiveTopBandHourMarkerSelection(layout),
        hourMarkerLayout: resolveEffectiveTopBandHourMarkers(layout).layout,
        fontRegistry: defaultFontAssetRegistry,
        topBandMode: DEFAULT_DISPLAY_TIME_CONFIG.topBandMode,
        baseDiskBandGuessPx: baseStack.diskBandH,
      });
    };
    const a = solve(10.5);
    const b = solve(11);
    expect(a.intrinsicContentHeightPx).toBe(b.intrinsicContentHeightPx);
    expect(computeUtcCircleMarkerRadius(a.intrinsicContentHeightPx, sw)).toBe(
      computeUtcCircleMarkerRadius(b.intrinsicContentHeightPx, sw),
    );
    expect(b.diskBandHeightPx - a.diskBandHeightPx).toBe(1);
  });

  it("product chrome state: same final disk label + marker content px at 10.5 vs 11 top pad (1.5×, bottom Auto)", () => {
    const now = Date.UTC(2026, 3, 12, 15, 30, 0);
    const vw = 960;
    const sw = vw / 24;
    const mk = (topPad: number) =>
      buildDisplayChromeState({
        time: createTimeContext(now, 0, false),
        viewport: { width: vw, height: 700, devicePixelRatio: 1 },
        frame: { frameNumber: 1, now, deltaMs: 0 },
        displayTime: DEFAULT_DISPLAY_TIME_CONFIG,
        displayChromeLayout: {
          ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
          hourMarkers: {
            ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
            layout: {
              sizeMultiplier: 1.5,
              contentPaddingTopPx: topPad,
            },
          },
        },
      });
    const chromeLo = mk(10.5);
    const chromeHi = mk(11);
    const ihLo = chromeLo.utcTopScale.hourMarkerDiskRowIntrinsicContentHeightPx;
    const ihHi = chromeHi.utcTopScale.hourMarkerDiskRowIntrinsicContentHeightPx;
    expect(ihLo).toBeDefined();
    expect(ihHi).toBe(ihLo);
    const st = getTopChromeStyle(chromeLo.displayChromeLayout.topChromePalette);
    const rLo = computeUtcCircleMarkerRadius(ihLo!, sw);
    const rHi = computeUtcCircleMarkerRadius(ihHi!, sw);
    expect(rLo).toBe(rHi);
    const diskLo = computeHourDiskLabelSizePx(rLo, vw, st.hourDiskLabel);
    const diskHi = computeHourDiskLabelSizePx(rHi, vw, st.hourDiskLabel);
    expect(diskLo).toBe(diskHi);
    const sm = resolvedHourMarkerLayoutSizeMultiplier(chromeLo.displayChromeLayout);
    expect(diskLo * sm).toBe(diskHi * sm);
  });

  it("does not change intrinsic scale (text) when explicit padding crosses the former early-exit threshold region", () => {
    const baseRows = computeUtcTopScaleRowMetrics(61, DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const baseStack = computeTopBandCircleStackMetrics(baseRows.circleBandH);
    const vw = 960;
    const sw = vw / 24;
    const tokens = getTopChromeStyle("neutral").hourDiskLabel;
    const solve = (pad: number) => {
      const layout = {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: {
            sizeMultiplier: 1,
            contentPaddingTopPx: pad,
            contentPaddingBottomPx: pad,
          },
        },
      };
      return solveCanonicalHourMarkerDiskBandHeightPx({
        viewportWidthPx: vw,
        hourDiskLabelTokens: tokens,
        layout,
        selection: effectiveTopBandHourMarkerSelection(layout),
        hourMarkerLayout: resolveEffectiveTopBandHourMarkers(layout).layout,
        fontRegistry: defaultFontAssetRegistry,
        topBandMode: DEFAULT_DISPLAY_TIME_CONFIG.topBandMode,
        baseDiskBandGuessPx: baseStack.diskBandH,
      });
    };
    const low = solve(5);
    const high = solve(8);
    expect(low.intrinsicContentHeightPx).toBe(high.intrinsicContentHeightPx);
    const rLow = computeUtcCircleMarkerRadius(low.intrinsicContentHeightPx, sw);
    const rHigh = computeUtcCircleMarkerRadius(high.intrinsicContentHeightPx, sw);
    expect(rLow).toBe(rHigh);
    expect(high.diskBandHeightPx - low.diskBandHeightPx).toBe(6);
  });

  it("with Auto/Auto padding, canonical disk band height grows when hour marker size multiplier increases", () => {
    const baseRows = computeUtcTopScaleRowMetrics(61, DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const baseStack = computeTopBandCircleStackMetrics(baseRows.circleBandH);
    const baseLayout = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
        layout: { sizeMultiplier: 1 },
      },
    };
    const largeLayout = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
        layout: { sizeMultiplier: 2 },
      },
    };
    const solve = (layout: typeof baseLayout) =>
      solveCanonicalHourMarkerDiskBandHeightPx({
        viewportWidthPx: 960,
        hourDiskLabelTokens: getTopChromeStyle("neutral").hourDiskLabel,
        layout,
        selection: effectiveTopBandHourMarkerSelection(layout),
        hourMarkerLayout: resolveEffectiveTopBandHourMarkers(layout).layout,
        fontRegistry: defaultFontAssetRegistry,
        topBandMode: DEFAULT_DISPLAY_TIME_CONFIG.topBandMode,
        baseDiskBandGuessPx: baseStack.diskBandH,
      });
    const small = solve(baseLayout);
    const large = solve(largeLayout);
    expect(large.diskBandHeightPx).toBeGreaterThan(small.diskBandHeightPx);
    expect(large.intrinsicContentHeightPx).toBeGreaterThan(small.intrinsicContentHeightPx);
  });
});

describe("buildDisplayChromeState hour-marker row", () => {
  it("raises top band height when explicit content padding increases the canonical disk row", () => {
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
          layout: {
            sizeMultiplier: 1,
            contentPaddingTopPx: 18,
            contentPaddingBottomPx: 18,
          },
        },
      },
    });
    expect(tall.topBand.height).toBeGreaterThan(base.topBand.height);
  });

  it("does not change hour-disk marker radius when only content-row padding changes", () => {
    const now = Date.UTC(2024, 5, 1, 12, 0, 0);
    const base = buildDisplayChromeState({
      time: createTimeContext(now, 0, false),
      viewport: { width: 960, height: 700, devicePixelRatio: 1 },
      frame: { frameNumber: 1, now, deltaMs: 0 },
      displayTime: DEFAULT_DISPLAY_TIME_CONFIG,
      displayChromeLayout: DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    });
    const padded = buildDisplayChromeState({
      time: createTimeContext(now, 0, false),
      viewport: { width: 960, height: 700, devicePixelRatio: 1 },
      frame: { frameNumber: 1, now, deltaMs: 0 },
      displayTime: DEFAULT_DISPLAY_TIME_CONFIG,
      displayChromeLayout: {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          layout: {
            sizeMultiplier: 1,
            contentPaddingTopPx: 14,
            contentPaddingBottomPx: 14,
          },
        },
      },
    });
    const r0 = base.utcTopScale.circleMarkers[0]?.radiusPx;
    const r1 = padded.utcTopScale.circleMarkers[0]?.radiusPx;
    expect(r0).toBeGreaterThan(0);
    expect(r1).toBe(r0);
  });

  it("with tick tape and NATO strip hidden, circle band height is only the canonical disk row (no extra stack slack)", () => {
    const now = Date.UTC(2024, 5, 1, 12, 0, 0);
    const chrome = buildDisplayChromeState({
      time: createTimeContext(now, 0, false),
      viewport: { width: 960, height: 700, devicePixelRatio: 1 },
      frame: { frameNumber: 1, now, deltaMs: 0 },
      displayTime: DEFAULT_DISPLAY_TIME_CONFIG,
      displayChromeLayout: {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        tickTapeVisible: false,
        timezoneLetterRowVisible: false,
      },
    });
    const rows = chrome.utcTopScale.rows;
    expect(rows).toBeDefined();
    expect(rows!.tickBandH).toBe(0);
    expect(rows!.timezoneBandH).toBe(0);
    expect(rows!.circleBandH).toBe(rows!.topBandHeightPx);
    const stack = chrome.utcTopScale.circleStack!;
    expect(sumTopBandCircleStackHeightPx(stack)).toBe(rows!.circleBandH);
    expect(stack.padTopPx + stack.upperNumeralH + stack.gapNumeralToDiskPx).toBe(0);
    expect(stack.gapDiskToAnnotationPx + stack.annotationH + stack.padBottomPx).toBe(0);
    expect(stack.diskBandH).toBe(rows!.circleBandH);
  });
});
