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
 * Text-specific intrinsic **content height** for the hour-disk content row (Phase 4).
 *
 * Mirrors the effective font size used by {@link glyphs/glyphToRenderPlan.ts!emitTextGlyph} for hour-disk
 * {@link glyphs/glyphTypes.ts!TextGlyph}: role + typography overrides from selection, glyph-style inset, then
 * {@link typography/typographyResolver.ts!resolveTextStyle}.
 *
 * Canvas / backend measurement is optional and lives in
 * {@link renderer/topBandHourMarkerTextInkMeasure.ts!tryMeasureMaxTopBandHourMarkerTextInkHeightPx}; this module stays
 * layout-model neutral.
 */

import type { EffectiveTopBandHourMarkerSelection } from "./config/appConfig.ts";
import { omitRendererDefaultSentinelFromTypographyOverrides } from "./config/productTextFont.ts";
import {
  hourMarkerRepresentationSpecForTopBandEffectiveSelection,
  resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection,
} from "./config/topBandVisualPolicy.ts";
import { resolveHourMarkerGlyphStyle } from "./glyphs/glyphStyles.ts";
import type { FontAssetRegistry } from "./typography/fontAssetRegistry.ts";
import { resolveTextStyle } from "./typography/typographyResolver.ts";
import type { ResolvedTextStyle } from "./typography/typographyTypes.ts";

/**
 * When the role does not specify `lineHeightPx`, scale resolved font size by this factor to obtain a deterministic
 * nominal line-box / intrinsic height for single-line hour labels (renderer-agnostic).
 */
export const TOP_BAND_HOUR_MARKER_TEXT_FALLBACK_INTRINSIC_HEIGHT_EM = 1 as const;

export function nominalTextIntrinsicContentHeightPxFromResolvedStyle(style: ResolvedTextStyle): number {
  if (style.lineHeightPx !== undefined) {
    return style.lineHeightPx;
  }
  return style.fontSizePx * TOP_BAND_HOUR_MARKER_TEXT_FALLBACK_INTRINSIC_HEIGHT_EM;
}

/**
 * Effective font size and resolved style for hour-disk text, aligned with
 * {@link glyphs/glyphToRenderPlan.ts!emitTextGlyph} (inset + typography overrides).
 */
export function resolveTopBandHourMarkerTextResolvedStyleForLayout(args: {
  fontRegistry: FontAssetRegistry;
  selection: EffectiveTopBandHourMarkerSelection;
  markerLayoutBoxSizePx: number;
}): ResolvedTextStyle {
  if (args.selection.kind !== "text") {
    throw new Error(
      "resolveTopBandHourMarkerTextResolvedStyleForLayout: expected text hour-marker selection",
    );
  }
  const spec = hourMarkerRepresentationSpecForTopBandEffectiveSelection(args.selection);
  const typographyOverrides =
    resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection(args.selection);
  const resolveOverrides = omitRendererDefaultSentinelFromTypographyOverrides(typographyOverrides);
  const hints = resolveHourMarkerGlyphStyle(spec.glyphStyleId).text ?? {};
  const insetFrac = Math.max(0, hints.insetFrac ?? 0);
  const effectiveSizePx = args.markerLayoutBoxSizePx * (1 - 2 * insetFrac);
  return resolveTextStyle(args.fontRegistry, spec.textRole, {
    fontSizePx: effectiveSizePx,
    ...resolveOverrides,
  });
}

/**
 * Deterministic text intrinsic height for the canonical content-row model when Canvas ink measurement is unavailable
 * or skipped (tests, SSR, non-Canvas backends).
 */
export function resolveTopBandHourMarkerTextIntrinsicContentHeightPxFromTypography(args: {
  fontRegistry: FontAssetRegistry;
  selection: EffectiveTopBandHourMarkerSelection;
  markerLayoutBoxSizePx: number;
}): number {
  const resolved = resolveTopBandHourMarkerTextResolvedStyleForLayout(args);
  return nominalTextIntrinsicContentHeightPxFromResolvedStyle(resolved);
}
