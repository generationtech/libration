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
import { displayTimeModeFromTopBandTimeMode } from "../core/displayTimeMode";
import { resolveCitiesForPins, resolveEnabledCustomPinsForMap } from "../config/appConfig";
import {
  resolvePinCityNameTextFontAssetId,
  resolvePinDateTimeTextFontAssetId,
} from "../config/productTextFont";
import { getActiveAppConfig } from "../config/displayPresets";
import { resolveEquirectBaseMapImageSrc } from "../config/baseMapAssetResolve";
import { sortSceneLayersForRender, zIndexForSceneStackIndex } from "../config/sceneLayerOrder";
import { createBaseMapLayer } from "../layers/baseMapLayer";
import { createCityPinsLayer } from "../layers/cityPinsLayer";
import { createLatLonGridLayer } from "../layers/latLonGridLayer";
import { createSolarShadingLayer } from "../layers/solarShadingLayer";
import { createSublunarMarkerLayer } from "../layers/sublunarMarkerLayer";
import { createSubsolarMarkerLayer } from "../layers/subsolarMarkerLayer";
import { LayerRegistry } from "../layers/LayerRegistry";

/**
 * Builds a {@link LayerRegistry} from the authoritative {@link AppConfig.scene} (layer enablement,
 * z-order, base map, opacity). {@link AppConfig.layers} is kept in sync and may be used elsewhere.
 * Only active participants are registered; the renderer only sees layer state, not the config document.
 */
export function createLayerRegistryFromConfig(
  config: AppConfig = getActiveAppConfig(),
): LayerRegistry {
  const registry = new LayerRegistry();
  const { scene } = config;
  const baseOp = scene.baseMap.opacity ?? 1;
  if (scene.baseMap.visible && baseOp > 0) {
    registry.register(
      createBaseMapLayer({
        src: resolveEquirectBaseMapImageSrc(scene.baseMap.id),
        opacity: baseOp,
        zIndex: 0,
      }),
    );
  }
  const ordered = sortSceneLayersForRender([...scene.layers]);
  let stack = 0;
  for (const inst of ordered) {
    if (!inst.enabled) {
      continue;
    }
    const op = inst.opacity ?? 1;
    if (op <= 0) {
      continue;
    }
    const z = zIndexForSceneStackIndex(stack);
    stack++;
    switch (inst.id) {
      case "solarShading":
        registry.register(createSolarShadingLayer({ zIndex: z, opacity: op }));
        break;
      case "grid":
        registry.register(createLatLonGridLayer({ zIndex: z, opacity: op }));
        break;
      case "cityPins": {
        registry.register(
          createCityPinsLayer(
            resolveCitiesForPins(config),
            resolveEnabledCustomPinsForMap(config),
            {
              ...config.pinPresentation,
              displayTimeMode: displayTimeModeFromTopBandTimeMode(config.displayTime.topBandMode),
            },
            resolvePinCityNameTextFontAssetId(config.displayChromeLayout, config.pinPresentation),
            resolvePinDateTimeTextFontAssetId(config.displayChromeLayout, config.pinPresentation),
            { zIndex: z, opacity: op },
          ),
        );
        break;
      }
      case "subsolarMarker":
        registry.register(createSubsolarMarkerLayer({ zIndex: z, opacity: op }));
        break;
      case "sublunarMarker":
        registry.register(createSublunarMarkerLayer({ zIndex: z, opacity: op }));
        break;
      default:
        break;
    }
  }
  return registry;
}
