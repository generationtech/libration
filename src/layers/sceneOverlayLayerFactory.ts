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
  type AppConfig,
  resolveCitiesForPins,
  resolveEnabledCustomPinsForMap,
} from "../config/appConfig";
import { displayTimeModeFromTopBandTimeMode } from "../core/displayTimeMode";
import {
  resolvePinCityNameTextFontAssetId,
  resolvePinDateTimeTextFontAssetId,
} from "../config/productTextFont";
import type { SceneLayerInstance } from "../config/v2/sceneConfig";
import { createCityPinsLayer } from "./cityPinsLayer";
import { createLatLonGridLayer } from "./latLonGridLayer";
import { createSolarShadingLayer } from "./solarShadingLayer";
import { createSublunarMarkerLayer } from "./sublunarMarkerLayer";
import { createSubsolarMarkerLayer } from "./subsolarMarkerLayer";
import { createStaticEquirectRasterOverlayLayer } from "./staticEquirectRasterOverlayLayer";
import type { Layer } from "./types";

type OverlayPart = { zIndex: number; opacity: number };

/**
 * Creates one composited overlay from a scene row. Dispatch is by
 * {@link SceneLayerInstance#source} (e.g. `staticRaster`, `derived` product), not by layer id,
 * so additional stack rows do not require bootstrap `switch` branches.
 */
export function createLayerForSceneOverlayInstance(
  inst: SceneLayerInstance,
  part: OverlayPart,
  config: AppConfig,
): Layer | null {
  const { zIndex, opacity } = part;
  const s = inst.source;
  if (s.kind === "staticRaster") {
    return createStaticEquirectRasterOverlayLayer({
      sceneLayerId: inst.id,
      src: s.src,
      zIndex,
      opacity,
    });
  }
  if (s.kind === "derived") {
    return createDerivedOverlayByProduct(s.product, { zIndex, opacity }, inst, config);
  }
  return null;
}

function createDerivedOverlayByProduct(
  product: string,
  part: OverlayPart,
  _inst: SceneLayerInstance,
  config: AppConfig,
): Layer | null {
  const { zIndex, opacity } = part;
  switch (product) {
    case "solarDayNightShading":
      return createSolarShadingLayer({ zIndex, opacity });
    case "latLonGrid":
      return createLatLonGridLayer({ zIndex, opacity });
    case "referenceAndCustomCityPins":
      return createCityPinsLayer(
        resolveCitiesForPins(config),
        resolveEnabledCustomPinsForMap(config),
        {
          ...config.pinPresentation,
          displayTimeMode: displayTimeModeFromTopBandTimeMode(config.displayTime.topBandMode),
        },
        resolvePinCityNameTextFontAssetId(config.displayChromeLayout, config.pinPresentation),
        resolvePinDateTimeTextFontAssetId(config.displayChromeLayout, config.pinPresentation),
        { zIndex, opacity },
      );
    case "subsolarPoint":
      return createSubsolarMarkerLayer({ zIndex, opacity });
    case "sublunarPoint":
      return createSublunarMarkerLayer({ zIndex, opacity });
    default:
      return null;
  }
}
