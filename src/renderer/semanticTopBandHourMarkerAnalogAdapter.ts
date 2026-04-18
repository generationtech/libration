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
 * Analog-clock realization adapter: laid-out semantic static-zone analog clocks → {@link ClockFaceGlyph} →
 * {@link RenderPlan} items (default style token + optional selection color).
 */

import type { EffectiveTopBandHourMarkerSelection } from "../config/appConfig.ts";
import { hourMarkerRepresentationSpecForTopBandEffectiveSelection } from "../config/topBandVisualPolicy.ts";
import type { LaidOutSemanticTopBandAnalogClockMarker } from "../config/topBandHourMarkersLayout.ts";
import type { EffectiveTopBandHourMarkers } from "../config/topBandHourMarkersTypes.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../glyphs/glyphToRenderPlan.ts";
import { topBandWrapOffsetsForCenteredExtent } from "./topBandWrapOffsets.ts";
import type { RenderPlan } from "./renderPlan/renderPlanTypes.ts";

/**
 * Emits clock-face glyphs for each laid-out analog instance, including phased wrap duplicates at the viewport seam.
 */
export function emitLaidOutSemanticTopBandAnalogClockMarkersToRenderPlan(
  laidOut: readonly LaidOutSemanticTopBandAnalogClockMarker[],
  viewportWidthPx: number,
  effectiveTopBandHourMarkerSelection: EffectiveTopBandHourMarkerSelection,
  effectiveTopBandHourMarkers: EffectiveTopBandHourMarkers,
  glyphRenderContext: GlyphRenderContext,
  out: RenderPlan["items"],
): void {
  const spec = hourMarkerRepresentationSpecForTopBandEffectiveSelection(effectiveTopBandHourMarkerSelection);
  if (spec.mode !== "analogClock") {
    return;
  }
  const eff = effectiveTopBandHourMarkers.realization;
  if (eff.kind !== "analogClock") {
    return;
  }
  const ra = eff.resolvedAppearance;

  for (const inst of laidOut) {
    for (const wrapK of topBandWrapOffsetsForCenteredExtent(
      inst.centerX,
      inst.wrapHalfExtentPx,
      viewportWidthPx,
    )) {
      const cx = inst.centerX + wrapK * viewportWidthPx;
      const layout = { cx, cy: inst.centerY, size: inst.sizePx };
      emitGlyphToRenderPlan(
        {
          kind: "clockFace",
          hour: inst.continuousHour0To24,
          minute: inst.continuousMinute0To60,
          styleId: spec.glyphStyleId,
          showMinuteHand: true,
          ringStrokeOverride: ra.ringStroke,
          handStrokeOverride: ra.handStroke,
          faceFillOverride: ra.faceFill,
        },
        layout,
        glyphRenderContext,
        out,
      );
    }
  }
}
