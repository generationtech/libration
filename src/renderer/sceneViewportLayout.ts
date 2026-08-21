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

/**
 * Map a pointer's client coordinates into scene-strip CSS pixels.
 * Uses the canvas layout box and CSS viewport size — not backing-store pixels or DPR.
 * Returns null when the point is outside the scene strip (including the top chrome band).
 */
export function canvasClientPointToSceneCss(args: {
  clientX: number;
  clientY: number;
  canvasRect: { left: number; top: number; width: number; height: number };
  canvasCssWidth: number;
  canvasCssHeight: number;
  sceneLayerViewportPx: SceneLayerViewportPx;
}): { x: number; y: number } | null {
  const { canvasRect, canvasCssWidth, canvasCssHeight, sceneLayerViewportPx } =
    args;
  if (
    !(canvasRect.width > 0) ||
    !(canvasRect.height > 0) ||
    !(canvasCssWidth > 0) ||
    !(canvasCssHeight > 0) ||
    !(sceneLayerViewportPx.width > 0) ||
    !(sceneLayerViewportPx.height > 0)
  ) {
    return null;
  }
  const canvasX =
    ((args.clientX - canvasRect.left) / canvasRect.width) * canvasCssWidth;
  const canvasY =
    ((args.clientY - canvasRect.top) / canvasRect.height) * canvasCssHeight;
  const x = canvasX - sceneLayerViewportPx.x;
  const y = canvasY - sceneLayerViewportPx.y;
  if (
    x < 0 ||
    y < 0 ||
    x > sceneLayerViewportPx.width ||
    y > sceneLayerViewportPx.height
  ) {
    return null;
  }
  return { x, y };
}
