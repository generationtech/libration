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

import { longitudeDegFromMapX } from "../../core/equirectangularProjection";
import {
  IDENTITY_SCENE_CAMERA,
  sceneDestRectsFromIdentityWorldWrapped,
  type SceneCamera,
} from "../../core/sceneCamera";
import type { CloudParticipationPresentationMode } from "../../core/cloudParticipationPolicy";
import type { EmissiveNightLightsPresentationMode } from "../../core/emissiveNightLightsPolicy";
import type { MoonlightPolicy } from "../../core/moonlightPolicy";
import {
  DEFAULT_CLOUD_PARTICIPATION_PRESENTATION_INTENSITY,
} from "../../core/cloudParticipationPresentationDefaults";
import {
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT,
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY,
} from "../../core/emissiveNightLightsPresentationDefaults";
import {
  DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE,
  DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
} from "../../core/sceneIlluminationPresentationDefaults";
import type { CloudOpacitySampleBuffer } from "../../lifecycle/dynamicCloudOpacityMaterializer";
import { sampleCloudOpacity01 } from "../../lifecycle/dynamicCloudOpacityMaterializer";
import type { EmissiveRasterSampleBuffer } from "../emissiveIlluminationRaster";
import { sampleEquirectEmissiveRadianceLinear01 } from "../emissiveIlluminationRaster";
import { sampleIlluminationRgba8 } from "../illuminationShading";
import type { RenderPlan } from "./renderPlanTypes";

function wrapLonDeg(lonDeg: number): number {
  let lon = lonDeg;
  while (lon < -180) {
    lon += 360;
  }
  while (lon >= 180) {
    lon -= 360;
  }
  return lon;
}

function sampleDaylightTransmission01(
  field:
    | {
        lonSamples: number;
        latSamples: number;
        transmission01: Float32Array;
      }
    | undefined,
  longitudeDeg: number,
  latitudeDeg: number,
): number {
  if (!field || field.lonSamples < 2 || field.latSamples < 2) {
    return 1;
  }
  const { lonSamples, latSamples, transmission01 } = field;
  const lon = wrapLonDeg(longitudeDeg);
  const lat = Math.max(-90, Math.min(90, latitudeDeg));
  const lonPos = ((lon + 180) / 360) * lonSamples;
  const latPos = ((90 - lat) / 180) * (latSamples - 1);
  let i0 = Math.floor(lonPos);
  const tLon = lonPos - i0;
  i0 = ((i0 % lonSamples) + lonSamples) % lonSamples;
  const i1 = (i0 + 1) % lonSamples;
  const j0 = Math.max(0, Math.min(latSamples - 2, Math.floor(latPos)));
  const j1 = j0 + 1;
  const tLat = Math.max(0, Math.min(1, latPos - j0));
  const a = transmission01[j0 * lonSamples + i0] ?? 1;
  const b = transmission01[j0 * lonSamples + i1] ?? 1;
  const c = transmission01[j1 * lonSamples + i0] ?? 1;
  const d = transmission01[j1 * lonSamples + i1] ?? 1;
  const top = a + (b - a) * tLon;
  const bottom = c + (d - c) * tLon;
  return Math.max(0, Math.min(1, top + (bottom - top) * tLat));
}

/** Matches historical canvas pass: half-res sampling then smooth upscale to the viewport.
 * Sample centers are `(i + 0.5) / sw` on a full-world equirect grid — not a moving
 * bbox, and not dependent on lifecycle or the current sublunar point.
 */
export const SOLAR_SHADING_PLAN_DOWNSAMPLE = 2;

/**
 * Builds the solar illumination / night-side mask for the equirectangular scene strip
 * (day/night plus a continuous solar-altitude twilight gradient field in {@link sampleIlluminationRgba8}).
 * Twilight is not a separate layer or `RenderPlan` kind; the canvas executor only blits one {@link rasterPatch}.
 */
export function buildSolarShadingIlluminationRenderPlan(options: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  subsolarLatDeg: number;
  subsolarLonDeg: number;
  sublunarLatDeg: number;
  sublunarLonDeg: number;
  lunarIlluminatedFraction: number;
  /** 0–1 scalar on ordinary moonlight; omitted means 1. */
  moonlightTransmission01?: number;
  layerOpacity: number;
  moonlightPolicy: MoonlightPolicy;
  /**
   * When omitted, defaults to {@link DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE}
   * (aligned with normalized `SceneConfig`). Raster sampling still yields zero when `emissiveRaster` is null.
   */
  emissiveNightLightsMode?: EmissiveNightLightsPresentationMode;
  /** Decoded emissive equirect RGBA; when null/omitted, emissive radiance is treated as zero. */
  emissiveRaster?: EmissiveRasterSampleBuffer | null;
  /** Scene `presentation.intensity`; omitted defaults per {@link DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY}. */
  emissivePresentationIntensity?: number;
  /** Scene `presentation.driverExponent`; omitted defaults per {@link DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT}. */
  emissiveDriverExponent?: number;
  /**
   * When omitted, defaults to {@link DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE} (`off`).
   * Sampling still yields zero modulation when `cloudOpacityRaster` is null.
   */
  cloudParticipationMode?: CloudParticipationPresentationMode;
  /** Prepared cloud opacity field; when null/omitted, Model A contribution is zero. */
  cloudOpacityRaster?: CloudOpacitySampleBuffer | null;
  /** Scene `cloudParticipation.presentation.intensity`; omitted defaults to 1. */
  cloudParticipationIntensity?: number;
  /** Optional equirect 0–1 daylight transmission field; omitted means 1. */
  daylightTransmissionField?: {
    lonSamples: number;
    latSamples: number;
    transmission01: Float32Array;
  };
}): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (w <= 0 || h <= 0) {
    return { items: [] };
  }

  const latS = (options.subsolarLatDeg * Math.PI) / 180;
  const lonS = (options.subsolarLonDeg * Math.PI) / 180;
  const cosLatS = Math.cos(latS);
  const sinLatS = Math.sin(latS);
  const latM = (options.sublunarLatDeg * Math.PI) / 180;
  const lonM = (options.sublunarLonDeg * Math.PI) / 180;
  const cosLatM = Math.cos(latM);
  const sinLatM = Math.sin(latM);

  const sw = Math.max(1, Math.ceil(w / SOLAR_SHADING_PLAN_DOWNSAMPLE));
  const sh = Math.max(1, Math.ceil(h / SOLAR_SHADING_PLAN_DOWNSAMPLE));
  const dests = sceneDestRectsFromIdentityWorldWrapped(
    w,
    h,
    options.camera ?? IDENTITY_SCENE_CAMERA,
  );

  const rgba = new Uint8ClampedArray(sw * sh * 4);
  const op = options.layerOpacity;
  const emissiveMode =
    options.emissiveNightLightsMode ?? DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE;
  const emissiveRaster = options.emissiveRaster ?? null;
  const emissivePresentationIntensity =
    options.emissivePresentationIntensity ?? DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY;
  const emissiveDriverExponent =
    options.emissiveDriverExponent ?? DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT;
  const cloudMode =
    options.cloudParticipationMode ?? DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE;
  const cloudOpacityRaster = options.cloudOpacityRaster ?? null;
  const cloudParticipationIntensity =
    options.cloudParticipationIntensity ?? DEFAULT_CLOUD_PARTICIPATION_PRESENTATION_INTENSITY;
  let p = 0;
  for (let j = 0; j < sh; j++) {
    const latDeg = 90 - ((j + 0.5) / sh) * 180;
    const phi = (latDeg * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    for (let i = 0; i < sw; i++) {
      const lonDeg = longitudeDegFromMapX(i + 0.5, sw);
      const lam = (lonDeg * Math.PI) / 180;
      const solarDot = cosPhi * cosLatS * Math.cos(lam - lonS) + sinPhi * sinLatS;
      const lunarDot = cosPhi * cosLatM * Math.cos(lam - lonM) + sinPhi * sinLatM;
      const radianceLinear01 =
        emissiveRaster && emissiveMode !== "off"
          ? sampleEquirectEmissiveRadianceLinear01(
              emissiveRaster,
              lonDeg,
              latDeg,
              emissiveDriverExponent,
            )
          : 0;
      const emissiveInputs =
        emissiveMode !== "off"
          ? {
              radianceLinear01,
              emissiveMode,
              presentationIntensity: emissivePresentationIntensity,
            }
          : undefined;
      const cloudInputs =
        cloudMode !== "off" && cloudOpacityRaster
          ? {
              opacity01: sampleCloudOpacity01(cloudOpacityRaster, lonDeg, latDeg),
              cloudMode,
              presentationIntensity: cloudParticipationIntensity,
            }
          : undefined;
      const { r, g, b, a } = sampleIlluminationRgba8(
        solarDot,
        op,
        {
          lunarDot,
          lunarIlluminatedFraction: options.lunarIlluminatedFraction,
          moonlightTransmission01: options.moonlightTransmission01,
        },
        options.moonlightPolicy,
        emissiveInputs,
        cloudInputs,
        sampleDaylightTransmission01(options.daylightTransmissionField, lonDeg, latDeg),
      );
      rgba[p++] = r;
      rgba[p++] = g;
      rgba[p++] = b;
      rgba[p++] = a;
    }
  }

  return {
    items: dests.map((dest) => ({
      kind: "rasterPatch" as const,
      x: dest.x,
      y: dest.y,
      destWidth: dest.width,
      destHeight: dest.height,
      widthPx: sw,
      heightPx: sh,
      rgba,
    })),
  };
}
