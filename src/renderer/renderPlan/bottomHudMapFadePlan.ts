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

import {
  BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX,
  computeBottomHudMapFadeOverlayRect,
} from "../bottomChromeLayout";
import type { RenderPlan } from "./renderPlanTypes";

/**
 * Map→HUD soft fade above the bottom instrument band: resolved geometry and vertical gradient stops.
 * Ordering: single fill, drawn before {@link renderBottomChrome} in {@link renderDisplayChrome}.
 */
export function buildBottomHudMapFadeRenderPlan(options: {
  seamYPx: number;
  hudTopYPx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  fadeColorTop: string;
  fadeColorBottom: string;
  /** Legacy seam-softening: gradient line extends past HUD top (see {@link BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX}). */
  gradientExtendBelowHudTopPx?: number;
}): RenderPlan {
  const extend =
    options.gradientExtendBelowHudTopPx ?? BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX;
  const fadeRect = computeBottomHudMapFadeOverlayRect({
    seamYPx: options.seamYPx,
    hudTopYPx: options.hudTopYPx,
    viewportWidthPx: options.viewportWidthPx,
    viewportHeightPx: options.viewportHeightPx,
  });
  if (!fadeRect) {
    return { items: [] };
  }
  const hudTop = options.hudTopYPx;
  return {
    items: [
      {
        kind: "linearGradientRect",
        x: 0,
        y: fadeRect.fadeTopYPx,
        width: fadeRect.widthPx,
        height: fadeRect.heightPx,
        x1: 0,
        y1: fadeRect.fadeTopYPx,
        x2: 0,
        y2: hudTop + extend,
        stops: [
          { offset: 0, color: options.fadeColorTop },
          { offset: 1, color: options.fadeColorBottom },
        ],
      },
    ],
  };
}
