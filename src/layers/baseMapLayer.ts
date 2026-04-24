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
  resolveEquirectBaseMapImageSrc,
  resolveEquirectBaseMapImageSrcForFixedWorldSrc,
} from "../config/baseMapAssetResolve";
import { getEquirectBaseMapImageSrcExclusionSetForResolve } from "./baseMapEquirectImageExclusions";
import type { BaseMapPresentationConfig } from "../config/baseMapPresentation";
import { SCENE_BASE_MAP_Z_INDEX } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECTANGULAR_RASTER_KIND,
  type EquirectangularRasterPayload,
} from "./rasterPayload";

const BASE_MAP_ID = "layer.baseMap.world";

/** Served from `public/maps/` (Vite root URL). */
export const WORLD_EQUIRECTANGULAR_SRC = "/maps/world-equirectangular.jpg";

const updatePolicy: UpdatePolicy = { type: "onDemand" };

export type CreateBaseMapLayerOptions = {
  /**
   * Persisted `SceneConfig.baseMap.id` (canonical or legacy alias). When set, raster `src` is
   * resolved each frame from the effective product instant (`TimeContext.now`).
   */
  sceneBaseMapId?: string;
  /** Fixed raster URL; used when `sceneBaseMapId` is omitted. */
  src?: string;
  opacity?: number;
  zIndex?: number;
  /** From `SceneConfig.baseMap.presentation` (family-level, not per month file). */
  presentation?: BaseMapPresentationConfig;
};

/**
 * Static equirectangular world map base layer (no live data).
 * Pass `sceneBaseMapId` so month-aware families track {@link TimeContext.now}; otherwise `src`
 * defaults to the legacy bundled asset.
 */
export function createBaseMapLayer(options: CreateBaseMapLayerOptions = {}): Layer {
  const sceneBaseMapId = options.sceneBaseMapId;
  const staticSrc = options.src ?? WORLD_EQUIRECTANGULAR_SRC;
  const opacity = options.opacity ?? 1;
  const presentation = options.presentation;
  const z = options.zIndex ?? SCENE_BASE_MAP_Z_INDEX;
  return {
    id: BASE_MAP_ID,
    name: "World map (base)",
    enabled: true,
    zIndex: z,
    type: "raster",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const ex = getEquirectBaseMapImageSrcExclusionSetForResolve();
      const ctx = { productInstantMs: time.now, excludedImageSrcs: ex };
      const src =
        sceneBaseMapId !== undefined
          ? resolveEquirectBaseMapImageSrc(sceneBaseMapId, ctx)
          : resolveEquirectBaseMapImageSrcForFixedWorldSrc(staticSrc, ctx);
      const data: EquirectangularRasterPayload = {
        kind: EQUIRECTANGULAR_RASTER_KIND,
        src,
        ...(presentation !== undefined ? { presentation } : {}),
        emitLoadFailure: true,
      };
      return {
        visible: true,
        opacity,
        data,
      };
    },
  };
}
