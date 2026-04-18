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
 * Radial-wedge realization adapter: laid-out semantic top-band radial wedges → {@link RadialWedgeGlyph} via
 * {@link createHourMarkerGlyph} → {@link emitGlyphToRenderPlan} (style token + selection / resolver color).
 */

import type { EffectiveTopBandHourMarkerSelection } from "../config/appConfig.ts";
import {
  hourMarkerRepresentationSpecForTopBandEffectiveSelection,
  resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection,
} from "../config/topBandVisualPolicy.ts";
import type { LaidOutSemanticTopBandRadialWedgeMarker } from "../config/topBandHourMarkersLayout.ts";
import type { EffectiveTopBandHourMarkers } from "../config/topBandHourMarkersTypes.ts";
import { createHourMarkerGlyph } from "../glyphs/glyphFactory.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../glyphs/glyphToRenderPlan.ts";
import type { HourMarkerContent } from "../glyphs/hourMarkerContent.ts";
import { topBandWrapOffsetsForCenteredExtent } from "./topBandWrapOffsets.ts";
import type { RenderPlan } from "./renderPlan/renderPlanTypes.ts";

/**
 * Emits radial-wedge glyphs for each laid-out instance, including phased wrap duplicates at the viewport seam.
 */
export function emitLaidOutSemanticTopBandRadialWedgeMarkersToRenderPlan(
  laidOut: readonly LaidOutSemanticTopBandRadialWedgeMarker[],
  viewportWidthPx: number,
  effectiveTopBandHourMarkerSelection: EffectiveTopBandHourMarkerSelection,
  effectiveTopBandHourMarkers: EffectiveTopBandHourMarkers,
  glyphRenderContext: GlyphRenderContext,
  out: RenderPlan["items"],
): void {
  const realization = effectiveTopBandHourMarkers.realization;
  if (realization.kind !== "radialWedge") {
    return;
  }
  const fillColor = realization.resolvedAppearance.fillColor;
  const strokeColor = realization.resolvedAppearance.strokeColor;
  const faceFill = realization.resolvedAppearance.faceFill;

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
      const layout = { cx, cy: inst.centerY, size: inst.sizePx };
      const hourContent: HourMarkerContent = {
        structuralHour0To23: inst.structuralHour0To23,
        displayLabel: inst.displayLabel,
      };
      const glyph = createHourMarkerGlyph(
        hourContent,
        hourSpec,
        typographyOverrides,
        fillColor,
        strokeColor,
        faceFill,
      );
      emitGlyphToRenderPlan(glyph, layout, glyphRenderContext, out);
    }
  }
}
