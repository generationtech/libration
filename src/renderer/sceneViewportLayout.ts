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

import type { SceneLayerViewportPx, Viewport } from "./types";

/**
 * Clamps reserved top chrome height to the viewport so scene layout stays well-defined.
 * {@link DisplayChromeState.topBand.height} is passed through this before scene compositing.
 */
export function clampedTopChromeReservedHeightPx(
  viewportHeightPx: number,
  topChromeReservedHeightPx: number,
): number {
  const h = Math.max(0, viewportHeightPx);
  const t = Math.max(0, topChromeReservedHeightPx);
  return Math.min(t, h);
}

/**
 * Scene/map strip as a CSS pixel rectangle: full width, height excludes reserved top chrome.
 * {@link DisplayChromeState.topBand.height} should be passed as {@code topChromeReservedHeightPx}.
 */
export function sceneLayerViewportRectPx(
  fullViewport: Viewport,
  topChromeReservedHeightPx: number,
): SceneLayerViewportPx {
  const top = clampedTopChromeReservedHeightPx(fullViewport.height, topChromeReservedHeightPx);
  return {
    x: 0,
    y: top,
    width: Math.max(0, fullViewport.width),
    height: Math.max(0, fullViewport.height - top),
  };
}

/**
 * Viewport for scene/map layer plans (width/height match {@link sceneLayerViewportRectPx}; includes DPR).
 * Used by plan builders that take a {@link Viewport}; compositing still uses the rect + origin from the caller.
 */
export function sceneLayerViewport(
  fullViewport: Viewport,
  topChromeReservedHeightPx: number,
): Viewport {
  const rect = sceneLayerViewportRectPx(fullViewport, topChromeReservedHeightPx);
  const dpr = fullViewport.devicePixelRatio > 0 ? fullViewport.devicePixelRatio : 1;
  return {
    width: rect.width,
    height: rect.height,
    devicePixelRatio: dpr,
  };
}
