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
import {
  hourMarkerRepresentationSpecForTopBandEffectiveSelection,
  resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection,
} from "../config/topBandVisualPolicy.ts";
import type { LaidOutSemanticTopBandHourTextMarker } from "../config/topBandHourMarkersLayout.ts";
import type { EffectiveTopBandHourMarkers } from "../config/topBandHourMarkersTypes.ts";
import { createHourMarkerGlyph } from "../glyphs/glyphFactory.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../glyphs/glyphToRenderPlan.ts";
import type { HourMarkerContent } from "../glyphs/hourMarkerContent.ts";
import { topBandWrapOffsetsForCenteredExtent } from "./topBandWrapOffsets.ts";
import type { RenderPlan } from "./renderPlan/renderPlanTypes.ts";

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
): void {
  const realization = effectiveTopBandHourMarkers.realization;
  if (realization.kind !== "text") {
    return;
  }
  const markerColor = realization.resolvedAppearance.color;

  const hourSpec = hourMarkerRepresentationSpecForTopBandEffectiveSelection(effectiveTopBandHourMarkerSelection);
  const typographyOverrides =
    resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection(effectiveTopBandHourMarkerSelection);

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
      emitGlyphToRenderPlan(glyph, { cx, cy: inst.centerY, size: inst.sizePx }, glyphRenderContext, out);
    }
  }
}
