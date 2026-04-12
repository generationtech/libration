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
  fallbackHourDiskTextGlyphInkMetricsFromNominalFontSizePx,
  hourDiskTextGlyphInkMetricsFromMeasureTextLike,
} from "./hourDiskTextGlyphInkMetrics.ts";
import {
  computeTextModeLayoutDiskBandVerticalMetrics,
  computeTextModeIntrinsicDiskBandVerticalMetrics,
} from "./topBandHourMarkersLayout.ts";

describe("hourDiskTextGlyphInkMetrics (Option A)", () => {
  it("uses ascent+descent as glyphInkHeightPx when measured", () => {
    const m = hourDiskTextGlyphInkMetricsFromMeasureTextLike(
      { actualBoundingBoxAscent: 9, actualBoundingBoxDescent: 5 },
      14,
    );
    expect(m.source).toBe("measured");
    expect(m.glyphInkHeightPx).toBe(14);
    expect(m.actualBoundingBoxAscent).toBe(9);
    expect(m.actualBoundingBoxDescent).toBe(5);
  });

  it("falls back when measureText lacks valid ink", () => {
    const m = hourDiskTextGlyphInkMetricsFromMeasureTextLike({}, 14.2);
    expect(m.source).toBe("fallback");
    expect(m.glyphInkHeightPx).toBe(14);
  });

  it("layout row height = glyphInkHeightPx + top + bottom insets (no nominal font rounding)", () => {
    const ink = hourDiskTextGlyphInkMetricsFromMeasureTextLike(
      { actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 4 },
      14,
    );
    const vm = computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: 14,
      sizeMultiplier: 1,
      rowTopInsetPx: 3,
      rowBottomInsetPx: 2,
      glyphInkMetrics: ink,
    });
    expect(vm.textCoreHeightPx).toBe(12);
    expect(vm.diskBandH).toBe(12 + 3 + 2);
    expect(vm.textCenterYFromDiskRowTopPx).toBe(3 + 6);
  });

  it("0/0 insets: layout core fills row with no extra slack vs insets (model)", () => {
    const ink = hourDiskTextGlyphInkMetricsFromMeasureTextLike(
      { actualBoundingBoxAscent: 7, actualBoundingBoxDescent: 5 },
      12,
    );
    const vm = computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: 12,
      sizeMultiplier: 1,
      rowTopInsetPx: 0,
      rowBottomInsetPx: 0,
      glyphInkMetrics: ink,
    });
    expect(vm.topPadInsideDiskPx).toBe(0);
    expect(vm.bottomPadInsideDiskPx).toBe(0);
    expect(vm.diskBandH).toBe(vm.textCoreHeightPx);
    const yCenterFromTop = vm.textCenterYFromDiskRowTopPx;
    const half = vm.textCoreHeightPx * 0.5;
    const marginTopModel = yCenterFromTop - half;
    const marginBottomModel = vm.diskBandH - (yCenterFromTop + half);
    expect(marginTopModel).toBe(0);
    expect(marginBottomModel).toBe(0);
  });

  it("top-only inset increases row height and shifts center Y without changing ink core height", () => {
    const ink = hourDiskTextGlyphInkMetricsFromMeasureTextLike(
      { actualBoundingBoxAscent: 6, actualBoundingBoxDescent: 6 },
      12,
    );
    const base = computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: 12,
      sizeMultiplier: 1,
      rowTopInsetPx: 0,
      rowBottomInsetPx: 0,
      glyphInkMetrics: ink,
    });
    const topOnly = computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: 12,
      sizeMultiplier: 1,
      rowTopInsetPx: 4,
      rowBottomInsetPx: 0,
      glyphInkMetrics: ink,
    });
    expect(topOnly.diskBandH - base.diskBandH).toBe(4);
    expect(topOnly.textCoreHeightPx).toBe(base.textCoreHeightPx);
    expect(topOnly.textCenterYFromDiskRowTopPx - base.textCenterYFromDiskRowTopPx).toBe(4);
  });

  it("symmetric insets add symmetric vertical space to row height", () => {
    const ink = hourDiskTextGlyphInkMetricsFromMeasureTextLike(
      { actualBoundingBoxAscent: 5, actualBoundingBoxDescent: 5 },
      11,
    );
    const a = computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: 11,
      sizeMultiplier: 1,
      rowTopInsetPx: 2,
      rowBottomInsetPx: 2,
      glyphInkMetrics: ink,
    });
    expect(a.topPadInsideDiskPx).toBe(a.bottomPadInsideDiskPx);
    expect(a.diskBandH).toBe(a.textCoreHeightPx + 4);
  });

  it("intrinsic sizing disk height ignores glyph ink and configured insets", () => {
    const ink = hourDiskTextGlyphInkMetricsFromMeasureTextLike(
      { actualBoundingBoxAscent: 9, actualBoundingBoxDescent: 3 },
      14,
    );
    const intrinsic = computeTextModeIntrinsicDiskBandVerticalMetrics({ fontSizePx: 14, sizeMultiplier: 1 });
    const intrinsic2 = computeTextModeIntrinsicDiskBandVerticalMetrics({ fontSizePx: 14, sizeMultiplier: 1 });
    expect(intrinsic.diskBandH).toBe(intrinsic2.diskBandH);
    const layout = computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: 14,
      sizeMultiplier: 1,
      rowTopInsetPx: 0,
      rowBottomInsetPx: 0,
      glyphInkMetrics: ink,
    });
    expect(layout.diskBandH).not.toBe(intrinsic.diskBandH);
  });
});

describe("fallbackHourDiskTextGlyphInkMetricsFromNominalFontSizePx", () => {
  it("marks source fallback and uses rounded nominal height", () => {
    const f = fallbackHourDiskTextGlyphInkMetricsFromNominalFontSizePx(13.7);
    expect(f.source).toBe("fallback");
    expect(f.glyphInkHeightPx).toBe(14);
  });
});
