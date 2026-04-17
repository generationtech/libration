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

import type {
  FrameContext,
  RenderableLayerState,
  SceneRenderInput,
  SceneVisualContext,
  Viewport,
} from "../renderer/types";

export {
  buildDisplayChromeState,
  renderDisplayChrome,
  type DisplayChromeState,
} from "../renderer/displayChrome";

export function createViewportFromWindow(): Viewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  };
}

/**
 * Viewport matching the canvas element’s layout box (CSS pixels × device pixel ratio).
 * Used by the shell when the map surface is not full-window (e.g. side configuration panel).
 */
export function createViewportFromCanvas(canvas: HTMLCanvasElement): Viewport {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const dpr =
    typeof window !== "undefined" && window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;
  return {
    width: Math.max(1, w),
    height: Math.max(1, h),
    devicePixelRatio: dpr,
  };
}

export function buildSceneRenderInput(options: {
  frame: FrameContext;
  viewport: Viewport;
  layers: RenderableLayerState[];
  scene?: SceneVisualContext;
  /** Must match {@link DisplayChromeState.topBand.height} from the same-frame chrome build. */
  topChromeReservedHeightPx?: number;
}): SceneRenderInput {
  return {
    frame: options.frame,
    viewport: options.viewport,
    layers: options.layers,
    scene: options.scene ?? {},
    ...(options.topChromeReservedHeightPx !== undefined
      ? { topChromeReservedHeightPx: options.topChromeReservedHeightPx }
      : {}),
  };
}
