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

import type { AppConfig } from "../config/appConfig";
import { getActiveAppConfig } from "../config/displayPresets";
import { planSceneStackComposition } from "../config/sceneStackComposition";
import { createBaseMapLayer } from "../layers/baseMapLayer";
import { createLayerForSceneOverlayInstance } from "../layers/sceneOverlayLayerFactory";
import { LayerRegistry } from "../layers/LayerRegistry";

/**
 * Builds a {@link LayerRegistry} from the authoritative {@link AppConfig.scene}.
 * `AppConfig.layers` is kept in sync; only layer state reaches the renderer.
 * Composition order, opacity, and the foundational base map follow
 * {@link planSceneStackComposition} (see layer-composition-rules). Each overlay `zIndex` is
 * the scene model’s; layers do not define stacking policy.
 */
export function createLayerRegistryFromConfig(
  config: AppConfig = getActiveAppConfig(),
): LayerRegistry {
  const registry = new LayerRegistry();
  const { baseMap: basePart, overlays } = planSceneStackComposition(config.scene);
  if (basePart) {
    registry.register(
      createBaseMapLayer({
        sceneBaseMapId: config.scene.baseMap.id,
        opacity: basePart.opacity,
        zIndex: basePart.zIndex,
      }),
    );
  }
  for (const part of overlays) {
    const inst = config.scene.layers.find((L) => L.id === part.layerId);
    if (!inst) {
      continue;
    }
    const layer = createLayerForSceneOverlayInstance(
      inst,
      { zIndex: part.zIndex, opacity: part.opacity },
      config,
    );
    if (layer) {
      registry.register(layer);
    }
  }
  return registry;
}
