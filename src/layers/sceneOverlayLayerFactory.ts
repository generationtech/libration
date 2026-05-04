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
import { resolveMoonlightPresentationMode } from "../config/v2/sceneConfig";
import { createCityPinsLayer } from "./cityPinsLayer";
import { createLatLonGridLayer } from "./latLonGridLayer";
import { createSolarAnalemmaLayer } from "./solarAnalemmaLayer";
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
    return createDerivedOverlayByProduct(s, { zIndex, opacity }, config);
  }
  return null;
}

function utcHourFromOptionalParameters(
  parameters: Readonly<Record<string, unknown>> | undefined,
): number | undefined {
  if (!parameters) {
    return undefined;
  }
  const h = parameters.utcHour;
  if (typeof h === "number" && Number.isFinite(h)) {
    return h;
  }
  return undefined;
}

function createDerivedOverlayByProduct(
  source: Extract<SceneLayerInstance["source"], { kind: "derived" }>,
  part: OverlayPart,
  config: AppConfig,
): Layer | null {
  const { zIndex, opacity } = part;
  const utcH = utcHourFromOptionalParameters(source.parameters);
  switch (source.product) {
    case "solarDayNightShading":
      return createSolarShadingLayer({
        zIndex,
        opacity,
        moonlightMode: resolveMoonlightPresentationMode(config.scene),
        emissiveNightLightsMode: config.scene.illumination.emissiveNightLights.mode,
        emissiveCompositionAssetId: config.scene.illumination.emissiveNightLights.assetId,
        emissivePresentationIntensity: config.scene.illumination.emissiveNightLights.presentation.intensity,
        emissiveDriverExponent: config.scene.illumination.emissiveNightLights.presentation.driverExponent,
      });
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
    case "solarAnalemmaGroundTrack":
      return createSolarAnalemmaLayer({ zIndex, opacity, ...(utcH !== undefined ? { utcHour: utcH } : {}) });
    default:
      return null;
  }
}
