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

import type { LayerId, LayerType } from "../layers/types";

export interface FrameContext {
  frameNumber: number;
  now: number;
  deltaMs: number;
}

export interface Viewport {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface RenderableLayerState {
  id: LayerId;
  name: string;
  type: LayerType;
  zIndex: number;
  visible: boolean;
  opacity: number;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export interface SceneVisualContext {
  backgroundColor?: string;
  projectionMode?: string;
  showDebugOverlay?: boolean;
}

/**
 * Scene/map strip in CSS pixels within the canvas layout box (origin top-left).
 * Resolved upstream from the full viewport and display chrome (e.g. top band height).
 */
export interface SceneLayerViewportPx {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneRenderInput {
  frame: FrameContext;
  viewport: Viewport;
  layers: RenderableLayerState[];
  scene: SceneVisualContext;
  /** Resolved scene strip for map layers; clip origin and dimensions for compositing. */
  sceneLayerViewportPx: SceneLayerViewportPx;
}
