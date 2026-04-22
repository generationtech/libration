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
import { planSceneStackComposition } from "../config/sceneStackComposition";
import { createBaseMapLayer } from "../layers/baseMapLayer";
import { createCityPinsLayer } from "../layers/cityPinsLayer";
import { createLatLonGridLayer } from "../layers/latLonGridLayer";
import { createSolarShadingLayer } from "../layers/solarShadingLayer";
import { createSublunarMarkerLayer } from "../layers/sublunarMarkerLayer";
import { createSubsolarMarkerLayer } from "../layers/subsolarMarkerLayer";
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
        src: resolveEquirectBaseMapImageSrc(config.scene.baseMap.id),
        opacity: basePart.opacity,
        zIndex: basePart.zIndex,
      }),
    );
  }
  for (const part of overlays) {
    const z = part.zIndex;
    const op = part.opacity;
    switch (part.layerId) {
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
    }
  }
  return registry;
}
