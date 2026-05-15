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

/**
 * Composition-aware overlay readability frame: derives terminator / night veil signals from
 * subsolar geometry, plus a deterministic **emissive policy** legibility pressure (v1.1) from
 * SceneConfig-resolved night-light mode and presentation — no emissive raster sampling here.
 *
 * Global `scene.overlayReadability.presentation` is applied when the shell builds the frame; optional
 * `scene.overlayReadability.perLayer` entries for default stack rows (see `SCENE_OVERLAY_READABILITY_PER_LAYER_PILOT_KEYS` in `sceneConfig`) repeat the same veil/lift scalars
 * upstream in those layers only (after the global frame).
 */

import type { BaseMapPresentationConfig } from "../config/baseMapPresentation";
import type { SceneOverlayReadabilityPresentationConfig } from "../config/v2/sceneConfig";
import {
  getEmissiveNightLightsPolicy,
  type EmissiveNightLightsPresentationMode,
} from "./emissiveNightLightsPolicy";
import { DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT } from "./emissiveNightLightsPresentationDefaults";
import { illuminationNightVeil01FromSolarAltitudeDeg } from "./nightVeilFromSolarAltitude";
import { subsolarPoint } from "./subsolarPoint";
import { solarAltitudeDegFromSurfaceSunDotProduct } from "./solarTwilight";
import {
  SUBSTRATE_OVERLAY_READABILITY_LIFT_SCALE_MIN,
  type SubstrateReadabilityCatalogHint,
  deriveSubstrateOverlayReadabilityLiftScale01,
} from "./substrateOverlayReadabilityLiftScale";

const SAMPLE_LAT_DEG = [-67.5, -22.5, 22.5, 67.5] as const;
const SAMPLE_LON_DEG = [-135, -45, 45, 135] as const;

/** Scene illumination inputs used only for upstream overlay readability (policy, not asset paths). */
export type EmissiveOverlayReadabilityInputs = {
  mode: EmissiveNightLightsPresentationMode;
  presentationIntensity?: number;
  presentationDriverExponent?: number;
};

/** Resolved base-map substrate signals for overlay lift attenuation (no raster sampling). */
export type SubstrateOverlayReadabilityFrameInputs = Readonly<{
  presentation: BaseMapPresentationConfig;
  catalogHint?: SubstrateReadabilityCatalogHint | null;
}>;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) {
    return 0;
  }
  return Math.max(0, Math.min(1, x));
}

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const PRESENTATION_INTENSITY_MIN = 0;
const PRESENTATION_INTENSITY_MAX = 4;

function clampPresentationIntensity(n: number | undefined): number {
  if (n === undefined) {
    return 1;
  }
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(PRESENTATION_INTENSITY_MIN, Math.min(PRESENTATION_INTENSITY_MAX, n));
}

const DRIVER_EXPONENT_MIN = 0.15;
const DRIVER_EXPONENT_MAX = 0.55;

function clampDriverExponent(n: number | undefined): number {
  if (n === undefined || !Number.isFinite(n)) {
    return DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT;
  }
  return Math.max(DRIVER_EXPONENT_MIN, Math.min(DRIVER_EXPONENT_MAX, n));
}

/**
 * 0 = no extra overlay lift from emissive policy; 1 = strongest policy-driven readability pressure.
 * Uses the same mode gains as composition (`radianceGain`) so illustrative / enhanced tracks busier night imagery.
 */
export function computeEmissiveLegibilityPressure01(
  input: EmissiveOverlayReadabilityInputs | undefined,
): number {
  if (!input || input.mode === "off") {
    return 0;
  }
  const policy = getEmissiveNightLightsPolicy(input.mode);
  if (!policy.contributesEmissive) {
    return 0;
  }

  const intensity = clampPresentationIntensity(input.presentationIntensity);
  const driver = clampDriverExponent(input.presentationDriverExponent);

  const modeFactor = policy.radianceGain / 2.35;
  const intensityFactor = 0.42 + 0.58 * Math.min(1, intensity / 2);
  const driverSpan = DRIVER_EXPONENT_MAX - DRIVER_EXPONENT_MIN;
  const driverNorm = driverSpan > 0 ? (driver - DRIVER_EXPONENT_MIN) / driverSpan : 0;
  const driverFactor = 0.9 + 0.22 * clamp01(driverNorm);

  return clamp01(modeFactor * intensityFactor * driverFactor * 0.68);
}

const EMISSIVE_READABILITY_LIFT_MAX = 0.36;

/**
 * Merges subsolar night veil with emissive policy pressure for overlay stroke / cssFilter scaling.
 * Emissive lift applies only where the solar veil already indicates night-side treatment.
 */
export function combineReadabilityVeil01(solarNightVeil01: number, emissivePressure01: number): number {
  const s = clamp01(solarNightVeil01);
  const p = clamp01(emissivePressure01);
  if (p <= 0) {
    return s;
  }
  const nightEnvelope = smoothstep01(0.1, 0.9, s);
  const lift = EMISSIVE_READABILITY_LIFT_MAX * p * nightEnvelope;
  return clamp01(s + lift);
}

/** Per-frame veil field for overlay legibility; may be attached on the render tick time object. */
export interface OverlayReadabilityFrame {
  /** Coarse global average of subsolar-only night veil (same sampling grid as v1). */
  readonly globalNightVeil01: number;
  /** Policy-only pressure from emissive night-light mode + presentation (no raster sampling). */
  readonly globalEmissiveLegibilityPressure01: number;
  /** Global combined veil for full-viewport overlays that use a single scalar. */
  readonly globalReadabilityVeil01: number;
  /**
   * 1 = full overlay readability lift at a given veil; lower when base-map presentation (and optional
   * catalog capabilities) already make the substrate visually strong.
   */
  readonly substrateOverlayReadabilityLiftScale01: number;
  nightVeil01At(latDeg: number, lonDeg: number): number;
  /** Solar night veil plus bounded emissive policy lift (for vectors, pins, and merged raster filters). */
  readabilityVeil01At(latDeg: number, lonDeg: number): number;
}

/**
 * Applies normalized {@link SceneOverlayReadabilityPresentationConfig} on top of the derived frame
 * (subsolar + emissive policy + substrate lift scale). Identity when both scalars are 1.
 */
export function applySceneOverlayReadabilityPresentationToFrame(
  frame: OverlayReadabilityFrame,
  presentation: SceneOverlayReadabilityPresentationConfig,
): OverlayReadabilityFrame {
  const veilScale = presentation.readabilityVeilScale01;
  const liftMult = presentation.overlayLiftMultiplier01;
  const globalReadabilityVeil01 = clamp01(frame.globalReadabilityVeil01 * veilScale);
  const substrateOverlayReadabilityLiftScale01 = Math.max(
    SUBSTRATE_OVERLAY_READABILITY_LIFT_SCALE_MIN,
    Math.min(1, frame.substrateOverlayReadabilityLiftScale01 * liftMult),
  );
  return {
    globalNightVeil01: frame.globalNightVeil01,
    globalEmissiveLegibilityPressure01: frame.globalEmissiveLegibilityPressure01,
    globalReadabilityVeil01,
    substrateOverlayReadabilityLiftScale01,
    nightVeil01At: frame.nightVeil01At,
    readabilityVeil01At(latDeg: number, lonDeg: number): number {
      return clamp01(frame.readabilityVeil01At(latDeg, lonDeg) * veilScale);
    },
  };
}

function surfaceSunDotProduct(
  latDeg: number,
  lonDeg: number,
  subsolarLatDeg: number,
  subsolarLonDeg: number,
): number {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const latS = (subsolarLatDeg * Math.PI) / 180;
  const lonS = (subsolarLonDeg * Math.PI) / 180;
  return (
    Math.cos(lat) * Math.cos(latS) * Math.cos(lon - lonS) + Math.sin(lat) * Math.sin(latS)
  );
}

/**
 * Global average night veil (coarse lat/lon samples) plus point queries for markers.
 * When `emissiveReadability` is omitted or mode is `off`, behavior matches v1 (subsolar-only hints).
 * When `substrate` is omitted, {@link OverlayReadabilityFrame#substrateOverlayReadabilityLiftScale01} is 1.
 * When `sceneOverlayPresentation` is set, applies SceneConfig readability presentation scaling (shell).
 */
export function computeOverlayReadabilityFrameFromTimeMs(
  nowMs: number,
  emissiveReadability?: EmissiveOverlayReadabilityInputs,
  substrate?: SubstrateOverlayReadabilityFrameInputs | null,
  sceneOverlayPresentation?: SceneOverlayReadabilityPresentationConfig | null,
): OverlayReadabilityFrame {
  const { latDeg: subLat, lonDeg: subLon } = subsolarPoint(nowMs);
  const pressure = computeEmissiveLegibilityPressure01(emissiveReadability);
  const substrateOverlayReadabilityLiftScale01 =
    substrate === undefined || substrate === null
      ? 1
      : deriveSubstrateOverlayReadabilityLiftScale01(substrate.presentation, substrate.catalogHint);

  let sum = 0;
  let n = 0;
  for (const lat of SAMPLE_LAT_DEG) {
    for (const lon of SAMPLE_LON_DEG) {
      const d = surfaceSunDotProduct(lat, lon, subLat, subLon);
      const alt = solarAltitudeDegFromSurfaceSunDotProduct(d);
      sum += illuminationNightVeil01FromSolarAltitudeDeg(alt);
      n += 1;
    }
  }
  const globalNightVeil01 = n > 0 ? sum / n : 0;
  const globalReadabilityVeil01 = combineReadabilityVeil01(globalNightVeil01, pressure);

  function nightVeil01At(latDeg: number, lonDeg: number): number {
    const d = surfaceSunDotProduct(latDeg, lonDeg, subLat, subLon);
    return illuminationNightVeil01FromSolarAltitudeDeg(solarAltitudeDegFromSurfaceSunDotProduct(d));
  }

  function readabilityVeil01At(latDeg: number, lonDeg: number): number {
    return combineReadabilityVeil01(nightVeil01At(latDeg, lonDeg), pressure);
  }

  const base: OverlayReadabilityFrame = {
    globalNightVeil01,
    globalEmissiveLegibilityPressure01: pressure,
    globalReadabilityVeil01,
    substrateOverlayReadabilityLiftScale01,
    nightVeil01At,
    readabilityVeil01At,
  };
  return sceneOverlayPresentation
    ? applySceneOverlayReadabilityPresentationToFrame(base, sceneOverlayPresentation)
    : base;
}

/**
 * Reuses `overlayReadabilityFrame` on the time object when the shell attached one for this tick;
 * otherwise computes from `now` (for tests and narrow callers). Optional emissive inputs are only
 * applied when the shell precomputes the frame; this fallback stays subsolar-only.
 */
export function getOverlayReadabilityFrameOrCompute(time: {
  now: number;
  overlayReadabilityFrame?: OverlayReadabilityFrame;
}): OverlayReadabilityFrame {
  return time.overlayReadabilityFrame ?? computeOverlayReadabilityFrameFromTimeMs(time.now);
}
