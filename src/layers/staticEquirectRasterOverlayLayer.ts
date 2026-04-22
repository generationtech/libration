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

import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECTANGULAR_RASTER_KIND,
  type EquirectangularRasterPayload,
} from "./rasterPayload";
import { WORLD_EQUIRECTANGULAR_SRC } from "./baseMapLayer";

const updatePolicy: UpdatePolicy = { type: "onDemand" };

/**
 * Default URL for Phase 3 static overlay demos when none is set in scene source.
 * Same asset family as the base map; distinct {@link createStaticEquirectRasterOverlayLayer} id so it
 * composes as its own stack row.
 */
export const DEFAULT_STATIC_EQUIRECT_OVERLAY_SRC = WORLD_EQUIRECTANGULAR_SRC;

export function runtimeIdForStaticRasterSceneLayer(sceneLayerId: string): string {
  return `layer.staticRaster.${sceneLayerId}`;
}

export type CreateStaticEquirectRasterOverlayLayerOptions = {
  /** {@link SceneLayerInstance.id} — names the runtime layer id. */
  sceneLayerId: string;
  src: string;
  zIndex?: number;
  opacity?: number;
  /** Shown in debug / tooling; not a scene id. */
  name?: string;
};

/**
 * Full-viewport equirectangular raster in the scene overlay stack (static URL, no feeds).
 * SceneConfig supplies {@link CreateStaticEquirectRasterOverlayLayerOptions#src} via
 * `source: { kind: "staticRaster", src }`.
 */
export function createStaticEquirectRasterOverlayLayer(
  options: CreateStaticEquirectRasterOverlayLayerOptions,
): Layer {
  const src = options.src.trim() !== "" ? options.src : DEFAULT_STATIC_EQUIRECT_OVERLAY_SRC;
  const opacity = options.opacity ?? 1;
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const id = runtimeIdForStaticRasterSceneLayer(options.sceneLayerId);
  return {
    id,
    name: options.name ?? "Static equirect overlay",
    enabled: true,
    zIndex,
    type: "raster",
    updatePolicy,
    getState(_time: TimeContext): LayerState {
      const data: EquirectangularRasterPayload = {
        kind: EQUIRECTANGULAR_RASTER_KIND,
        src,
      };
      return {
        visible: true,
        opacity,
        data,
      };
    },
  };
}
