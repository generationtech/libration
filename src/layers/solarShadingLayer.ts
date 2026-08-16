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

import { DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID } from "../config/emissiveCompositionAssetResolve";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import {
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT,
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY,
} from "../core/emissiveNightLightsPresentationDefaults";
import { DEFAULT_CLOUD_PARTICIPATION_PRESENTATION_INTENSITY } from "../core/cloudParticipationPresentationDefaults";
import {
  DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE,
  DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
  DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE,
} from "../core/sceneIlluminationPresentationDefaults";
import type { CloudParticipationPresentationMode } from "../core/cloudParticipationPolicy";
import type { EmissiveNightLightsPresentationMode } from "../core/emissiveNightLightsPolicy";
import type { MoonlightPresentationMode } from "../core/moonlightPolicy";
import { resolveEclipseFrame } from "../core/eclipse/eclipseEventService";
import { lunarEclipseMoonlightTransmission } from "../core/eclipse/lunarEclipseMoonlightTransmission";
import {
  DEFAULT_SOLAR_ECLIPSE_SHADING_ENABLED,
  DEFAULT_SOLAR_ECLIPSE_SHADING_INTENSITY,
  solarEclipseVisualTransmission01,
  type SolarEclipseShadingIntensityId,
} from "../core/eclipse/solarEclipseDaylightTransmission";
import { solarEclipseObscurationFieldAt } from "../core/eclipse/solarEclipseObscurationField";
import { approximateLunarPhase } from "../core/lunarPhase";
import { sublunarPoint } from "../core/sublunarPoint";
import { subsolarPoint } from "../core/subsolarPoint";
import { getDynamicDataLifecycleAttachment } from "../lifecycle/dynamicDataLifecycleHost";
import { GLOBAL_CLOUDS_IR_SOURCE_ID } from "../lifecycle/dynamicEquirectSourceCatalog";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { SOLAR_SHADING_KIND, type SolarShadingPayload } from "./solarShadingPayload";

const SOLAR_SHADING_ID = "layer.solarShading.dayNight";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Solar day/night shading over the equirectangular base map.
 * Model A cloud participation reads a lifecycle-prepared opacity buffer from TimeContext
 * (never acquires / fetches on this path).
 */
export function createSolarShadingLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    /**
     * Omitted uses {@link DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE} (same as normalized `SceneConfig`).
     * Low-level tests or direct callers bypassing config should pass explicit modes when diverging.
     */
    moonlightMode?: MoonlightPresentationMode;
    /**
     * Omitted uses {@link DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE} (same as normalized `SceneConfig`).
     */
    emissiveNightLightsMode?: EmissiveNightLightsPresentationMode;
    emissiveCompositionAssetId?: string;
    emissivePresentationIntensity?: number;
    emissiveDriverExponent?: number;
    /** DLC-4 Model A; omitted defaults to `off`. */
    cloudParticipationMode?: CloudParticipationPresentationMode;
    cloudParticipationSourceId?: string;
    cloudParticipationIntensity?: number;
    /**
     * Physical active-solar daylight attenuation. Independent of the Solar
     * eclipses overlay master. Omitted uses factory ON / Normal.
     */
    activeEclipseShadingEnabled?: boolean;
    activeEclipseShadingIntensity?: SolarEclipseShadingIntensityId;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const moonlightMode = options.moonlightMode ?? DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE;
  const emissiveNightLightsMode =
    options.emissiveNightLightsMode ?? DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE;
  const emissiveCompositionAssetId =
    options.emissiveCompositionAssetId ?? DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID;
  const emissivePresentationIntensity =
    options.emissivePresentationIntensity ?? DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY;
  const emissiveDriverExponent =
    options.emissiveDriverExponent ?? DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT;
  const cloudParticipationMode =
    options.cloudParticipationMode ?? DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE;
  const cloudParticipationSourceId =
    options.cloudParticipationSourceId ?? GLOBAL_CLOUDS_IR_SOURCE_ID;
  const cloudParticipationIntensity =
    options.cloudParticipationIntensity ?? DEFAULT_CLOUD_PARTICIPATION_PRESENTATION_INTENSITY;
  const activeEclipseShadingEnabled =
    options.activeEclipseShadingEnabled ?? DEFAULT_SOLAR_ECLIPSE_SHADING_ENABLED;
  const activeEclipseShadingIntensity =
    options.activeEclipseShadingIntensity ?? DEFAULT_SOLAR_ECLIPSE_SHADING_INTENSITY;
  return {
    id: SOLAR_SHADING_ID,
    name: "Solar shading (day/night)",
    enabled: true,
    zIndex,
    type: "illumination",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const { latDeg, lonDeg } = subsolarPoint(time.now);
      const { latDeg: moonLatDeg, lonDeg: moonLonDeg } = sublunarPoint(time.now);
      const phase = approximateLunarPhase(time.now);
      const eclipseFrame = time.eclipseFrame ?? resolveEclipseFrame(time.now, { horizonMs: 0 });
      const moonlightTransmission01 = lunarEclipseMoonlightTransmission(eclipseFrame.lunarGeometry);
      let daylightTransmissionField: SolarShadingPayload["daylightTransmissionField"];
      if (activeEclipseShadingEnabled && eclipseFrame.activeSolar) {
        const obscurationField = solarEclipseObscurationFieldAt(time.now, eclipseFrame.activeSolar);
        const transmission01 = new Float32Array(obscurationField.obscuration01.length);
        let anyAttenuation = false;
        for (let i = 0; i < obscurationField.obscuration01.length; i += 1) {
          const t = solarEclipseVisualTransmission01(
            obscurationField.obscuration01[i]!,
            activeEclipseShadingIntensity,
          );
          transmission01[i] = t;
          if (t < 0.999) {
            anyAttenuation = true;
          }
        }
        if (anyAttenuation) {
          daylightTransmissionField = {
            lonSamples: obscurationField.lonSamples,
            latSamples: obscurationField.latSamples,
            transmission01,
          };
        }
      }
      let cloudOpacityRaster: SolarShadingPayload["cloudOpacityRaster"] = null;
      if (cloudParticipationMode !== "off") {
        const attachment = getDynamicDataLifecycleAttachment(time);
        const prepared = attachment?.getPreparedCloudOpacity(cloudParticipationSourceId);
        cloudOpacityRaster = prepared?.buffer ?? null;
      }
      const data: SolarShadingPayload = {
        kind: SOLAR_SHADING_KIND,
        subsolarLatDeg: latDeg,
        subsolarLonDeg: lonDeg,
        sublunarLatDeg: moonLatDeg,
        sublunarLonDeg: moonLonDeg,
        lunarIlluminatedFraction: phase.illuminatedFraction,
        moonlightTransmission01,
        ...(daylightTransmissionField ? { daylightTransmissionField } : {}),
        moonlightMode,
        emissiveNightLightsMode,
        emissiveCompositionAssetId,
        emissivePresentationIntensity,
        emissiveDriverExponent,
        cloudParticipationMode,
        cloudParticipationSourceId,
        cloudParticipationIntensity,
        cloudOpacityRaster,
      };
      return {
        visible: true,
        opacity: op,
        data,
      };
    },
  };
}
