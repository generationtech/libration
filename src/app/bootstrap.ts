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
import { createBaseMapLayer } from "../layers/baseMapLayer";
import { createCityPinsLayer } from "../layers/cityPinsLayer";
import { createLatLonGridLayer } from "../layers/latLonGridLayer";
import { createSolarShadingLayer } from "../layers/solarShadingLayer";
import { createSublunarMarkerLayer } from "../layers/sublunarMarkerLayer";
import { createSubsolarMarkerLayer } from "../layers/subsolarMarkerLayer";
import { LayerRegistry } from "../layers/LayerRegistry";

/**
 * Builds a {@link LayerRegistry} according to application configuration.
 * Only enabled layers are registered; the renderer never sees config.
 */
export function createLayerRegistryFromConfig(
  config: AppConfig = getActiveAppConfig(),
): LayerRegistry {
  const registry = new LayerRegistry();
  const { layers } = config;

  if (layers.baseMap) {
    registry.register(createBaseMapLayer());
  }
  if (layers.solarShading) {
    registry.register(createSolarShadingLayer());
  }
  if (layers.grid) {
    registry.register(createLatLonGridLayer());
  }
  if (layers.cityPins) {
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
      ),
    );
  }
  if (layers.subsolarMarker) {
    registry.register(createSubsolarMarkerLayer());
  }
  if (layers.sublunarMarker) {
    registry.register(createSublunarMarkerLayer());
  }
  return registry;
}
