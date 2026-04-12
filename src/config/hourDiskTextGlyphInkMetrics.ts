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
 * Renderer-agnostic vertical ink metrics for 24-hour disk numerals (Option A text row).
 * Used only for the text realization path — not global text layout.
 */

/** Subset of {@link TextMetrics} needed for Option A layout (no Canvas import). */
export type HourDiskTextGlyphInkTextMetricsLike = {
  actualBoundingBoxAscent?: number;
  actualBoundingBoxDescent?: number;
};

/**
 * Vertical ink box for one representative disk numeral string at a resolved font size.
 * {@link glyphInkHeightPx} is {@code actualBoundingBoxAscent + actualBoundingBoxDescent} from Canvas
 * {@code measureText} when {@link source} is {@code "measured"}.
 */
export type HourDiskTextGlyphInkMetrics = {
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
  /** Sum of ascent + descent — layout {@code textCoreHeightPx} for Option A. */
  glyphInkHeightPx: number;
  /** {@code "measured"} from Canvas when available; {@code "fallback"} when measurement is missing or invalid. */
  source: "measured" | "fallback";
};

/**
 * Builds ink metrics from Canvas {@link TextMetrics} (or test doubles).
 * If ascent/descent are missing or the ink height is non-positive, returns an explicit fallback from {@link nominalFontSizePx}.
 */
export function hourDiskTextGlyphInkMetricsFromMeasureTextLike(
  metrics: HourDiskTextGlyphInkTextMetricsLike,
  nominalFontSizePx: number,
): HourDiskTextGlyphInkMetrics {
  const a = metrics.actualBoundingBoxAscent;
  const d = metrics.actualBoundingBoxDescent;
  const ascent = typeof a === "number" && Number.isFinite(a) ? a : 0;
  const descent = typeof d === "number" && Number.isFinite(d) ? d : 0;
  const sum = ascent + descent;
  if (sum > 1e-6) {
    return {
      actualBoundingBoxAscent: ascent,
      actualBoundingBoxDescent: descent,
      glyphInkHeightPx: sum,
      source: "measured",
    };
  }
  return fallbackHourDiskTextGlyphInkMetricsFromNominalFontSizePx(nominalFontSizePx);
}

/**
 * Explicit fallback when Canvas measurement is unavailable (SSR, tests without ascent/descent) or returns invalid ink.
 * Uses rounded nominal font size as total ink height (legacy parity with pre–Option A rounded em core) and splits
 * ascent/descent 3:1 for bookkeeping only — layout uses {@link glyphInkHeightPx}, not these fractions alone.
 */
export function fallbackHourDiskTextGlyphInkMetricsFromNominalFontSizePx(
  nominalFontSizePx: number,
): HourDiskTextGlyphInkMetrics {
  const glyphInkHeightPx = Math.max(1, Math.round(nominalFontSizePx));
  const ascent = glyphInkHeightPx * 0.75;
  const descent = glyphInkHeightPx - ascent;
  return {
    actualBoundingBoxAscent: ascent,
    actualBoundingBoxDescent: descent,
    glyphInkHeightPx,
    source: "fallback",
  };
}
