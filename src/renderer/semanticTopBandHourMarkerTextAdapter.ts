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
 * Text realization adapter: laid-out semantic top-band hour-disk text → existing hour-marker text glyph →
 * {@link RenderPlan} items (typography from selection; fill from {@link EffectiveTopBandHourMarkers} resolution).
 */

import type { EffectiveTopBandHourMarkerSelection } from "../config/appConfig.ts";
import type { HourDiskTextGlyphInkMetrics } from "../config/hourDiskTextGlyphInkMetrics.ts";
import { computeTextModeLayoutDiskBandVerticalMetrics } from "../config/topBandHourMarkersLayout.ts";
import {
  hourMarkerRepresentationSpecForTopBandEffectiveSelection,
  resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection,
} from "../config/topBandVisualPolicy.ts";
import type { LaidOutSemanticTopBandHourTextMarker } from "../config/topBandHourMarkersLayout.ts";
import type { EffectiveTopBandHourMarkers } from "../config/topBandHourMarkersTypes.ts";
import { createHourMarkerGlyph } from "../glyphs/glyphFactory.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../glyphs/glyphToRenderPlan.ts";
import { resolveHourMarkerGlyphStyle } from "../glyphs/glyphStyles.ts";
import type { HourMarkerContent } from "../glyphs/hourMarkerContent.ts";
import { topBandWrapOffsetsForCenteredExtent } from "./topBandWrapOffsets.ts";
import type { RenderPlan } from "./renderPlan/renderPlanTypes.ts";

/** Disk-row Y bounds + layout insets for dev-only 24h vertical diagnostics (representative structural hour 12). */
export type SemanticTopBandHourTextDiskRowDiagnosticsContext = {
  yDiskRow0Px: number;
  diskBandHPx: number;
  diskLabelSizePx: number;
  markerContentSizePx: number;
  layout: EffectiveTopBandHourMarkers["layout"];
  /** Option A: same glyph ink as {@link resolveTextIndicatorCircleStackMetrics} / semantic row layout. */
  text24hLayoutGlyphInkMetrics?: HourDiskTextGlyphInkMetrics;
};

/**
 * Emits hour-disk text glyphs for each laid-out instance, including phased wrap duplicates at the viewport seam.
 */
export function emitLaidOutSemanticTopBandHourTextMarkersToRenderPlan(
  laidOut: readonly LaidOutSemanticTopBandHourTextMarker[],
  viewportWidthPx: number,
  effectiveTopBandHourMarkerSelection: EffectiveTopBandHourMarkerSelection,
  effectiveTopBandHourMarkers: EffectiveTopBandHourMarkers,
  glyphRenderContext: GlyphRenderContext,
  out: RenderPlan["items"],
  diskRowDiagnostics?: SemanticTopBandHourTextDiskRowDiagnosticsContext,
): void {
  const realization = effectiveTopBandHourMarkers.realization;
  if (realization.kind !== "text") {
    return;
  }
  const markerColor = realization.resolvedAppearance.color;

  const hourSpec = hourMarkerRepresentationSpecForTopBandEffectiveSelection(effectiveTopBandHourMarkerSelection);
  const typographyOverrides =
    resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection(effectiveTopBandHourMarkerSelection);

  const baselineShiftFrac =
    resolveHourMarkerGlyphStyle(hourSpec.glyphStyleId ?? "topBandHourDefault").text.baselineShiftFrac ?? 0;

  let diskRowVm:
    | ReturnType<typeof computeTextModeLayoutDiskBandVerticalMetrics>
    | undefined;
  if (diskRowDiagnostics !== undefined) {
    const d = diskRowDiagnostics;
    const sm = d.diskLabelSizePx > 0 ? d.markerContentSizePx / d.diskLabelSizePx : 1;
    diskRowVm = computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: d.markerContentSizePx,
      sizeMultiplier: sm,
      rowTopInsetPx: Math.max(0, Math.round(d.layout.textTopMarginPx)),
      rowBottomInsetPx: Math.max(0, Math.round(d.layout.textBottomMarginPx)),
      glyphInkMetrics: d.text24hLayoutGlyphInkMetrics,
    });
  }

  for (const inst of laidOut) {
    for (const wrapK of topBandWrapOffsetsForCenteredExtent(
      inst.centerX,
      inst.wrapHalfExtentPx,
      viewportWidthPx,
    )) {
      const cx = inst.centerX + wrapK * viewportWidthPx;
      const hourContent: HourMarkerContent = {
        structuralHour0To23: inst.structuralHour0To23,
        displayLabel: inst.displayLabel,
      };
      const glyph = createHourMarkerGlyph(
        hourContent,
        hourSpec,
        typographyOverrides,
        markerColor,
      );
      if (glyph.kind === "text") {
        glyph.omitStyleTextInset = true;
        if (
          diskRowDiagnostics !== undefined &&
          diskRowVm !== undefined &&
          inst.structuralHour0To23 === 12 &&
          wrapK === 0
        ) {
          const d = diskRowDiagnostics;
          const baselineShiftPx = inst.sizePx * baselineShiftFrac;
          glyph.verticalDiagnostics24h = {
            structuralHour0To23: 12,
            diskRowTopYPx: d.yDiskRow0Px,
            diskRowBottomYPx: d.yDiskRow0Px + d.diskBandHPx,
            diskRowHeightPx: d.diskBandHPx,
            layoutSizePx: inst.sizePx,
            textCoreHeightPx: diskRowVm.textCoreHeightPx,
            textCenterYPx: inst.centerY,
            baselineShiftPx,
            fillTextAnchorYPx: inst.centerY + baselineShiftPx,
            topInsetPx: diskRowVm.topPadInsideDiskPx,
            bottomInsetPx: diskRowVm.bottomPadInsideDiskPx,
          };
        }
      }
      emitGlyphToRenderPlan(glyph, { cx, cy: inst.centerY, size: inst.sizePx }, glyphRenderContext, out);
    }
  }
}
