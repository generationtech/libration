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

import type { SceneCamera } from "../core/sceneCamera";
import type { SceneReferenceFrame } from "../core/sceneReferenceFrame";
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
  /**
   * Runtime view into already-projected scene space. Omitted means identity
   * (2.0.0 full-world). Not a projection, not persisted, not a reference frame.
   */
  sceneCamera?: SceneCamera;
  /**
   * Scene/map reference frame applied before projection. Omitted means
   * Earth-fixed identity. Runtime only — not persisted, not `viewMode`, not
   * civil-time reference. Production kinds: Earth-fixed (default) and Moon
   * longitude-lock (LIB-083).
   */
  sceneReferenceFrame?: SceneReferenceFrame;
}
