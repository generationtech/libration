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
 * Canvas {@link measureText} for 24-hour disk numerals — matches {@link emitTextGlyph} font + tracking for Option A layout.
 */

import type { EffectiveTopBandHourMarkerSelection } from "../config/appConfig.ts";
import {
  hourMarkerRepresentationSpecForTopBandEffectiveSelection,
  resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection,
} from "../config/topBandVisualPolicy.ts";
import {
  fallbackHourDiskTextGlyphInkMetricsFromNominalFontSizePx,
  hourDiskTextGlyphInkMetricsFromMeasureTextLike,
  type HourDiskTextGlyphInkMetrics,
} from "../config/hourDiskTextGlyphInkMetrics.ts";
import { resolveHourMarkerGlyphStyle } from "../glyphs/glyphStyles.ts";
import type { FontAssetRegistry } from "../typography/fontAssetRegistry.ts";
import { resolveTextStyle } from "../typography/typographyResolver.ts";
import type { RenderFontStyle } from "./renderPlan/renderPlanTypes.ts";
import { canvasFontStringFromRenderTextFont } from "./canvas/canvasTextFontBridge.ts";

/** Same as {@link glyphToRenderPlan} hour-disk base tracking (em). */
const HOUR_DISK_BASE_LETTER_SPACING_EM = 0.02;

/**
 * Representative label for vertical ink (two-digit hour; stable height vs single-digit columns).
 * Matches {@link dev/textMode24hInsetSweep} convention.
 */
export const HOUR_DISK_24H_GLYPH_INK_REPRESENTATIVE_TEXT = "12";

let cachedMeasureCtx: CanvasRenderingContext2D | null | undefined;

function getSharedMeasureContext2D(): CanvasRenderingContext2D | null {
  if (cachedMeasureCtx === undefined) {
    cachedMeasureCtx = null;
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      cachedMeasureCtx = ctx;
    }
  }
  return cachedMeasureCtx;
}

/**
 * Measures vertical glyph ink for the active hour-disk text style at {@link markerContentSizePx}.
 * Falls back to {@link fallbackHourDiskTextGlyphInkMetricsFromNominalFontSizePx} when Canvas is unavailable or metrics are invalid.
 */
export function measureHourDiskTextGlyphInkMetricsForLayout(args: {
  fontRegistry: FontAssetRegistry;
  markerContentSizePx: number;
  selection: EffectiveTopBandHourMarkerSelection;
  representativeText?: string;
}): HourDiskTextGlyphInkMetrics {
  const nominal = Math.max(1e-6, args.markerContentSizePx);
  if (args.selection.kind !== "text") {
    return fallbackHourDiskTextGlyphInkMetricsFromNominalFontSizePx(nominal);
  }
  const ctx = getSharedMeasureContext2D();
  if (ctx === null) {
    return fallbackHourDiskTextGlyphInkMetricsFromNominalFontSizePx(nominal);
  }
  const spec = hourMarkerRepresentationSpecForTopBandEffectiveSelection(args.selection);
  const typographyOverrides =
    resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection(args.selection);
  const style = resolveTextStyle(args.fontRegistry, spec.textRole, {
    fontSizePx: args.markerContentSizePx,
    ...typographyOverrides,
  });
  const hints = resolveHourMarkerGlyphStyle(spec.glyphStyleId ?? "topBandHourDefault").text;
  const trackingPx = hints.trackingPx ?? 0;
  const letterSpacingEm =
    HOUR_DISK_BASE_LETTER_SPACING_EM + (style.letterSpacingPx + trackingPx) / style.fontSizePx;
  const weight = style.fontWeight ?? 400;
  const font: RenderFontStyle = {
    assetId: style.fontAssetId,
    displayName: style.displayName,
    sizePx: style.fontSizePx,
    weight: typeof weight === "number" ? weight : weight,
    style: style.fontStyle,
    ...(style.lineHeightPx !== undefined ? { lineHeightPx: style.lineHeightPx } : {}),
  };
  ctx.font = canvasFontStringFromRenderTextFont(font);
  ctx.letterSpacing = `${letterSpacingEm}em`;
  ctx.textBaseline = "alphabetic";
  const text = args.representativeText ?? HOUR_DISK_24H_GLYPH_INK_REPRESENTATIVE_TEXT;
  const metrics = ctx.measureText(text);
  return hourDiskTextGlyphInkMetricsFromMeasureTextLike(metrics, nominal);
}
