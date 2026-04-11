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
 * Radial-line realization adapter: laid-out semantic top-band radial lines → {@link RadialLineGlyph} via
 * {@link createHourMarkerGlyph} → {@link emitGlyphToRenderPlan} (style token + selection / resolver color).
 */

import type { EffectiveTopBandHourMarkerSelection } from "../config/appConfig.ts";
import {
  hourMarkerRepresentationSpecForTopBandEffectiveSelection,
  resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection,
} from "../config/topBandVisualPolicy.ts";
import type { LaidOutSemanticTopBandRadialLineMarker } from "../config/topBandHourMarkersLayout.ts";
import type { EffectiveTopBandHourMarkers } from "../config/topBandHourMarkersTypes.ts";
import { createHourMarkerGlyph } from "../glyphs/glyphFactory.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../glyphs/glyphToRenderPlan.ts";
import type { HourMarkerContent } from "../glyphs/hourMarkerContent.ts";
import { topBandWrapOffsetsForCenteredExtent } from "./topBandWrapOffsets.ts";
import type { RenderPlan } from "./renderPlan/renderPlanTypes.ts";

/**
 * Emits radial-line glyphs for each laid-out instance, including phased wrap duplicates at the viewport seam.
 */
export function emitLaidOutSemanticTopBandRadialLineMarkersToRenderPlan(
  laidOut: readonly LaidOutSemanticTopBandRadialLineMarker[],
  viewportWidthPx: number,
  effectiveTopBandHourMarkerSelection: EffectiveTopBandHourMarkerSelection,
  effectiveTopBandHourMarkers: EffectiveTopBandHourMarkers,
  glyphRenderContext: GlyphRenderContext,
  out: RenderPlan["items"],
): void {
  const realization = effectiveTopBandHourMarkers.realization;
  if (realization.kind !== "radialLine") {
    return;
  }
  const markerColor = realization.resolvedAppearance.lineColor;

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
