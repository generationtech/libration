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
  isEmissiveNightLightsPresentationMode,
  type EmissiveNightLightsPresentationMode,
} from "../core/emissiveNightLightsPolicy";
import {
  isCloudParticipationPresentationMode,
  type CloudParticipationPresentationMode,
} from "../core/cloudParticipationPolicy";
import { isMoonlightPresentationMode, type MoonlightPresentationMode } from "../core/moonlightPolicy";
import type { CloudOpacitySampleBuffer } from "../lifecycle/dynamicCloudOpacityMaterializer";

export const SOLAR_SHADING_KIND = "solarShading" as const;

/** Geographic 0–1 transmission field covering −180..180 / +90..−90. */
export type DaylightTransmissionField = {
  readonly lonSamples: number;
  readonly latSamples: number;
  readonly transmission01: Float32Array;
};

export function isDaylightTransmissionField(value: unknown): value is DaylightTransmissionField {
  if (value === undefined) {
    return true;
  }
  if (value === null || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    typeof o.lonSamples === "number" &&
    Number.isFinite(o.lonSamples) &&
    o.lonSamples >= 2 &&
    typeof o.latSamples === "number" &&
    Number.isFinite(o.latSamples) &&
    o.latSamples >= 2 &&
    o.transmission01 instanceof Float32Array &&
    o.transmission01.length === o.lonSamples * o.latSamples
  );
}

/**
 * Renderer-facing day/night mask parameters for an equirectangular map.
 * Computed in the layer using {@link subsolarPoint}; the illumination pass samples this into a render-plan raster patch upstream of canvas execution.
 */
export interface SolarShadingPayload {
  kind: typeof SOLAR_SHADING_KIND;
  subsolarLatDeg: number;
  subsolarLonDeg: number;
  sublunarLatDeg: number;
  sublunarLonDeg: number;
  lunarIlluminatedFraction: number;
  /**
   * Scalar on the ordinary moonlight contribution (0 = extinguished, 1 = unchanged).
   * Resolved upstream; omitted means 1.
   */
  moonlightTransmission01?: number;
  /**
   * Optional equirect daylight transmission field (1 = ordinary daylight).
   * Resolved upstream; omitted means 1 everywhere. Canvas does not interpret
   * the source of the field.
   */
  daylightTransmissionField?: DaylightTransmissionField;
  /** Scene-level moonlight presentation; resolved before the raster plan (not backend-owned). */
  moonlightMode: MoonlightPresentationMode;
  emissiveNightLightsMode: EmissiveNightLightsPresentationMode;
  /** Canonical emissive composition asset id from scene normalization. */
  emissiveCompositionAssetId: string;
  /** From `scene.illumination.emissiveNightLights.presentation.intensity` (0..4). */
  emissivePresentationIntensity: number;
  /** From `scene.illumination.emissiveNightLights.presentation.driverExponent` (0.35..1). */
  emissiveDriverExponent: number;
  /** DLC-4 Model A: scene `illumination.cloudParticipation.mode`. */
  cloudParticipationMode: CloudParticipationPresentationMode;
  /** Durable lifecycle source id for prepared cloud opacity (not a URL). */
  cloudParticipationSourceId: string;
  /** From `scene.illumination.cloudParticipation.presentation.intensity` (0..2). */
  cloudParticipationIntensity: number;
  /**
   * Sync-prepared opacity buffer from the lifecycle materializer (null when off / cold).
   * Never fetched in layer constructors or RenderPlan builders.
   */
  cloudOpacityRaster: CloudOpacitySampleBuffer | null;
}

export function isSolarShadingPayload(data: unknown): data is SolarShadingPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  const cloudRasterOk =
    o.cloudOpacityRaster === null ||
    (typeof o.cloudOpacityRaster === "object" &&
      o.cloudOpacityRaster !== null &&
      typeof (o.cloudOpacityRaster as { width?: unknown }).width === "number" &&
      typeof (o.cloudOpacityRaster as { height?: unknown }).height === "number" &&
      (o.cloudOpacityRaster as { opacityU8?: unknown }).opacityU8 instanceof Uint8Array);
  return (
    o.kind === SOLAR_SHADING_KIND &&
    typeof o.subsolarLatDeg === "number" &&
    typeof o.subsolarLonDeg === "number" &&
    typeof o.sublunarLatDeg === "number" &&
    typeof o.sublunarLonDeg === "number" &&
    typeof o.lunarIlluminatedFraction === "number" &&
    (o.moonlightTransmission01 === undefined ||
      (typeof o.moonlightTransmission01 === "number" && Number.isFinite(o.moonlightTransmission01))) &&
    isDaylightTransmissionField(o.daylightTransmissionField) &&
    typeof o.moonlightMode === "string" &&
    isMoonlightPresentationMode(o.moonlightMode) &&
    typeof o.emissiveNightLightsMode === "string" &&
    isEmissiveNightLightsPresentationMode(o.emissiveNightLightsMode) &&
    typeof o.emissiveCompositionAssetId === "string" &&
    o.emissiveCompositionAssetId.trim() !== "" &&
    typeof o.emissivePresentationIntensity === "number" &&
    Number.isFinite(o.emissivePresentationIntensity) &&
    typeof o.emissiveDriverExponent === "number" &&
    Number.isFinite(o.emissiveDriverExponent) &&
    typeof o.cloudParticipationMode === "string" &&
    isCloudParticipationPresentationMode(o.cloudParticipationMode) &&
    typeof o.cloudParticipationSourceId === "string" &&
    o.cloudParticipationSourceId.trim() !== "" &&
    typeof o.cloudParticipationIntensity === "number" &&
    Number.isFinite(o.cloudParticipationIntensity) &&
    cloudRasterOk
  );
}
