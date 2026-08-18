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
import {
  eclipseAlignmentPresentationFromScene,
  eclipseInfoPresentationFromScene,
  issOrbitalPresentationFromScene,
  lunarEclipsePresentationFromScene,
  resolveMoonlightPresentationMode,
  solarEclipsePresentationFromScene,
  sublunarMarkerAppearanceFromScene,
} from "../config/v2/sceneConfig";
import { createCityPinsLayer } from "./cityPinsLayer";
import { createLatLonGridLayer } from "./latLonGridLayer";
import { createLunarEclipseLayer } from "./lunarEclipseLayer";
import { createLunarGroundTrackLayer } from "./lunarGroundTrackLayer";
import { createLunarLocusLayer } from "./lunarLocusLayer";
import { createSolarAnalemmaLayer } from "./solarAnalemmaLayer";
import { createSolarEclipseLayer } from "./solarEclipseLayer";
import { createSolarShadingLayer } from "./solarShadingLayer";
import { createSublunarMarkerLayer } from "./sublunarMarkerLayer";
import { createSubsolarMarkerLayer } from "./subsolarMarkerLayer";
import { createStaticEquirectRasterOverlayLayer } from "./staticEquirectRasterOverlayLayer";
import { createDynamicEquirectRasterOverlayLayer } from "./dynamicEquirectRasterOverlayLayer";
import { createDynamicPointFeaturesOverlayLayer } from "./dynamicPointFeaturesOverlayLayer";
import { createDynamicTracksOverlayLayer } from "./dynamicTracksOverlayLayer";
import type { Layer } from "./types";
import {
  DEFAULT_ASTRONOMY_PATH_THICKNESS,
  DEFAULT_SOLAR_ANALEMMA_STROKE_RGB,
  normalizeAstronomyPathColorCss,
  normalizeAstronomyPathThicknessId,
  type AstronomyPathThicknessId,
} from "../core/astronomyOverlayStrokeAppearance";
import { normalizeSolarEclipsePresentation } from "../core/eclipse/solarEclipseAppearance";
import { normalizeLunarEclipsePresentation } from "../core/eclipse/lunarEclipseAppearance";
import { DEFAULT_LUNAR_LOCUS_STROKE_RGB } from "../core/lunarLocus";
import { normalizeSublunarMarkerAppearance } from "../core/sublunarMarkerAppearance";
import { resolveReferenceCityObserverLocation } from "../core/referenceCityObserver";

type OverlayPart = { zIndex: number; opacity: number };

/**
 * Creates one composited overlay from a scene row. Dispatch is by
 * {@link SceneLayerInstance#source} (e.g. `staticRaster`, `dynamicEquirectRaster`,
 * `dynamicPointFeatures`, `dynamicTracks`, `derived` product), not by layer id, so additional stack rows
 * do not require bootstrap `switch` branches.
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
      staticEquirectOverlayReadabilityPresentation:
        config.scene.overlayReadability.perLayer?.staticEquirectOverlay,
    });
  }
  if (s.kind === "dynamicEquirectRaster") {
    return createDynamicEquirectRasterOverlayLayer({
      sceneLayerId: inst.id,
      sourceId: s.sourceId,
      zIndex,
      opacity,
      name: inst.id === "globalCloudsIr" ? "Global clouds / IR" : undefined,
    });
  }
  if (s.kind === "dynamicPointFeatures") {
    return createDynamicPointFeaturesOverlayLayer({
      sceneLayerId: inst.id,
      sourceId: s.sourceId,
      zIndex,
      opacity,
      name: inst.id === "earthquakes" ? "Earthquakes" : undefined,
    });
  }
  if (s.kind === "dynamicTracks") {
    return createDynamicTracksOverlayLayer({
      sceneLayerId: inst.id,
      sourceId: s.sourceId,
      zIndex,
      opacity,
      name: inst.id === "orbitalTracks" ? "ISS orbital track" : undefined,
      presentation:
        inst.id === "orbitalTracks"
          ? issOrbitalPresentationFromScene(config.scene)
          : undefined,
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

function lunarExtentHoursFromOptionalParameters(
  parameters: Readonly<Record<string, unknown>> | undefined,
  key: "pastHours" | "futureHours",
): number | undefined {
  if (!parameters) {
    return undefined;
  }
  const h = parameters[key];
  if (typeof h === "number" && Number.isFinite(h)) {
    return h;
  }
  return undefined;
}

function lunarStrokeCssFromOptionalParameters(
  parameters: Readonly<Record<string, unknown>> | undefined,
  key: "pastColor" | "futureColor",
): string | undefined {
  if (!parameters) {
    return undefined;
  }
  const c = parameters[key];
  return typeof c === "string" ? c : undefined;
}

function astronomyPathColorFromOptionalParameters(
  parameters: Readonly<Record<string, unknown>> | undefined,
  fallback: string,
): string {
  return normalizeAstronomyPathColorCss(parameters?.strokeColor, fallback);
}

function astronomyPathThicknessFromOptionalParameters(
  parameters: Readonly<Record<string, unknown>> | undefined,
): AstronomyPathThicknessId {
  return normalizeAstronomyPathThicknessId(
    parameters?.strokeThickness ?? DEFAULT_ASTRONOMY_PATH_THICKNESS,
  );
}

function createDerivedOverlayByProduct(
  source: Extract<SceneLayerInstance["source"], { kind: "derived" }>,
  part: OverlayPart,
  config: AppConfig,
): Layer | null {
  const { zIndex, opacity } = part;
  const utcH = utcHourFromOptionalParameters(source.parameters);
  switch (source.product) {
    case "solarDayNightShading": {
      const solarPresentation = solarEclipsePresentationFromScene(config.scene);
      return createSolarShadingLayer({
        zIndex,
        opacity,
        moonlightMode: resolveMoonlightPresentationMode(config.scene),
        emissiveNightLightsMode: config.scene.illumination.emissiveNightLights.mode,
        emissiveCompositionAssetId: config.scene.illumination.emissiveNightLights.assetId,
        emissivePresentationIntensity: config.scene.illumination.emissiveNightLights.presentation.intensity,
        emissiveDriverExponent: config.scene.illumination.emissiveNightLights.presentation.driverExponent,
        cloudParticipationMode: config.scene.illumination.cloudParticipation.mode,
        cloudParticipationSourceId: config.scene.illumination.cloudParticipation.sourceId,
        cloudParticipationIntensity: config.scene.illumination.cloudParticipation.presentation.intensity,
        activeEclipseShadingEnabled: solarPresentation.activeEclipseShadingEnabled,
        activeEclipseShadingIntensity: solarPresentation.activeEclipseShadingIntensity,
      });
    }
    case "latLonGrid":
      return createLatLonGridLayer({
        zIndex,
        opacity,
        gridReadabilityPresentation: config.scene.overlayReadability.perLayer?.grid,
      });
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
        {
          zIndex,
          opacity,
          cityPinsReadabilityPresentation: config.scene.overlayReadability.perLayer?.cityPins,
        },
      );
    case "subsolarPoint":
      return createSubsolarMarkerLayer({
        zIndex,
        opacity,
        subsolarMarkerReadabilityPresentation: config.scene.overlayReadability.perLayer?.subsolarMarker,
      });
    case "sublunarPoint":
      return createSublunarMarkerLayer({
        zIndex,
        opacity,
        appearance: normalizeSublunarMarkerAppearance(source.parameters),
        observer: resolveReferenceCityObserverLocation(config.displayTime),
        sublunarMarkerReadabilityPresentation: config.scene.overlayReadability.perLayer?.sublunarMarker,
        earthShadowEnabled:
          (config.scene.layers.find((l) => l.id === "lunarEclipse")?.enabled ?? false) &&
          lunarEclipsePresentationFromScene(config.scene).showMoonEclipseShadow,
        earthShadowCueEnabled:
          (config.scene.layers.find((l) => l.id === "lunarEclipse")?.enabled ?? false) &&
          eclipseAlignmentPresentationFromScene(config.scene).enabled &&
          eclipseAlignmentPresentationFromScene(config.scene).lunarEnabled,
        alignment: eclipseAlignmentPresentationFromScene(config.scene),
      });
    case "sublunarGroundTrack":
      return createLunarGroundTrackLayer({
        zIndex,
        opacity,
        pastHours: lunarExtentHoursFromOptionalParameters(source.parameters, "pastHours"),
        futureHours: lunarExtentHoursFromOptionalParameters(source.parameters, "futureHours"),
        pastColor: lunarStrokeCssFromOptionalParameters(source.parameters, "pastColor"),
        futureColor: lunarStrokeCssFromOptionalParameters(source.parameters, "futureColor"),
      });
    case "sublunarLocus":
      return createLunarLocusLayer({
        zIndex,
        opacity,
        strokeColor: astronomyPathColorFromOptionalParameters(
          source.parameters,
          DEFAULT_LUNAR_LOCUS_STROKE_RGB,
        ),
        strokeThickness: astronomyPathThicknessFromOptionalParameters(source.parameters),
        moonSize: sublunarMarkerAppearanceFromScene(config.scene).size,
      });
    case "solarAnalemmaGroundTrack":
      return createSolarAnalemmaLayer({
        zIndex,
        opacity,
        ...(utcH !== undefined ? { utcHour: utcH } : {}),
        strokeColor: astronomyPathColorFromOptionalParameters(
          source.parameters,
          DEFAULT_SOLAR_ANALEMMA_STROKE_RGB,
        ),
        strokeThickness: astronomyPathThicknessFromOptionalParameters(source.parameters),
        solarAnalemmaReadabilityPresentation: config.scene.overlayReadability.perLayer?.solarAnalemma,
      });
    case "solarEclipseLiveFootprint":
      return createSolarEclipseLayer({
        zIndex,
        opacity,
        presentation: normalizeSolarEclipsePresentation(source.parameters),
        alignment: eclipseAlignmentPresentationFromScene(config.scene),
        labelsEnabled: eclipseInfoPresentationFromScene(config.scene).labelsEnabled,
        lunarPresentation: lunarEclipsePresentationFromScene(config.scene),
      });
    case "lunarEclipseVisibility":
      return createLunarEclipseLayer({
        zIndex,
        opacity,
        presentation: normalizeLunarEclipsePresentation(source.parameters),
        alignment: eclipseAlignmentPresentationFromScene(config.scene),
        labelsEnabled: eclipseInfoPresentationFromScene(config.scene).labelsEnabled,
        solarPresentation: solarEclipsePresentationFromScene(config.scene),
        cityLabelHints:
          config.layers.cityPins && config.pinPresentation.showLabels
            ? [
                ...resolveCitiesForPins(config).map((c) => ({
                  latDeg: c.latitude,
                  lonDeg: c.longitude,
                  name: c.name,
                })),
                ...resolveEnabledCustomPinsForMap(config).map((p) => ({
                  latDeg: p.latitude,
                  lonDeg: p.longitude,
                  name: p.label,
                })),
              ]
            : [],
      });
    default:
      return null;
  }
}
