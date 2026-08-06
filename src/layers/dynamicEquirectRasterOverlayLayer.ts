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
 * DLC-1 Model B: global equirect clouds / IR overlay layer.
 * Reads sync-prepared lifecycle views only — never fetches in getState.
 */

import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import {
  getOverlayReadabilityFrameOrCompute,
} from "../core/overlayReadabilityFrame";
import { getDynamicDataLifecycleAttachment } from "../lifecycle/dynamicDataLifecycleHost";
import type { DynamicSourceId } from "../lifecycle/dynamicSnapshotTypes";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECTANGULAR_RASTER_KIND,
  type EquirectangularRasterPayload,
} from "./rasterPayload";

const updatePolicy: UpdatePolicy = { type: "onDemand" };

export function runtimeIdForDynamicEquirectSceneLayer(sceneLayerId: string): string {
  return `layer.dynamicEquirectRaster.${sceneLayerId}`;
}

export type CreateDynamicEquirectRasterOverlayLayerOptions = {
  /** {@link SceneLayerInstance.id} — names the runtime layer id. */
  sceneLayerId: string;
  /** Durable lifecycle source id (SceneConfig `source.sourceId`). */
  sourceId: DynamicSourceId;
  zIndex?: number;
  opacity?: number;
  name?: string;
};

/**
 * Full-viewport equirectangular raster driven by lifecycle-prepared bytes.
 * Invisible when no prepared view exists for the product instant.
 */
export function createDynamicEquirectRasterOverlayLayer(
  options: CreateDynamicEquirectRasterOverlayLayerOptions,
): Layer {
  const opacity = options.opacity ?? 1;
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const id = runtimeIdForDynamicEquirectSceneLayer(options.sceneLayerId);
  const { sourceId } = options;

  return {
    id,
    name: options.name ?? "Dynamic equirect overlay",
    enabled: true,
    zIndex,
    type: "raster",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const attachment = getDynamicDataLifecycleAttachment(time);
      const prepared = attachment?.getPreparedEquirectRaster(sourceId) ?? null;
      if (prepared === null) {
        return {
          visible: false,
          opacity,
          data: null,
          metadata: {
            dynamicSourceId: sourceId,
            reason: "missing-prepared-view",
          },
        };
      }

      const frame = getOverlayReadabilityFrameOrCompute(time);
      const data: EquirectangularRasterPayload = {
        kind: EQUIRECTANGULAR_RASTER_KIND,
        src: prepared.src,
        readability: {
          nightVeil01: frame.globalReadabilityVeil01,
          overlayReadabilityLiftScale01: frame.substrateOverlayReadabilityLiftScale01,
        },
      };
      return {
        visible: true,
        opacity,
        data,
        metadata: {
          dynamicSourceId: prepared.sourceId,
          versionId: prepared.versionId,
          validTimeMs: prepared.validTimeMs,
          freshness: prepared.freshness,
          ...(prepared.attribution !== undefined
            ? { attribution: prepared.attribution }
            : {}),
        },
      };
    },
  };
}
