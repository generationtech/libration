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
 * SceneConfig v1 (Phase 1): normalized scene domain for LibrationConfigV2.
 * See `ARCHITECTURE.md` and `docs/ROADMAP.md` for scene authority; this module implements the normalized runtime subset.
 */
import type { LayerEnableFlags } from "../appConfig";
import {
  DEFAULT_LUNAR_GROUND_TRACK_FUTURE_HOURS,
  DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS,
  normalizeLunarGroundTrackExtentHours,
} from "../../core/lunarGroundTrack";
import {
  DEFAULT_LUNAR_GROUND_TRACK_FUTURE_COLOR,
  DEFAULT_LUNAR_GROUND_TRACK_PAST_COLOR,
  normalizeLunarGroundTrackStrokeCss,
} from "../../core/lunarGroundTrackAppearance";
import {
  DEFAULT_ASTRONOMY_PATH_THICKNESS,
  DEFAULT_SOLAR_ANALEMMA_STROKE_RGB,
  normalizeAstronomyPathColorCss,
  normalizeAstronomyPathThicknessId,
} from "../../core/astronomyOverlayStrokeAppearance";
import { DEFAULT_LUNAR_LOCUS_STROKE_RGB } from "../../core/lunarLocus";
import {
  DEFAULT_SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS,
  DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_BAND,
  DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_LINE,
  DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_CORRIDOR,
  DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_PARTIAL_REGION,
  DEFAULT_SOLAR_ECLIPSE_SHOW_PARTIAL_REGION,
  normalizeSolarEclipsePresentation,
} from "../../core/eclipse/solarEclipseAppearance";
import {
  DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  normalizeSublunarMarkerAppearance,
  type SublunarMarkerAppearance,
} from "../../core/sublunarMarkerAppearance";
import {
  BASE_MAP_OPTION_CATEGORY_ORDER,
  DEFAULT_EQUIRECT_BASE_MAP_ID as DEFAULT_EQUIRECT_BASE_MAP_ID_VALUE,
  EQUIRECT_BASE_MAP_OPTIONS,
  calendarMonthUtc1To12FromUnixMs,
  canonicalEquirectBaseMapIdForPersistence,
  getEquirectBaseMapCatalogEntry,
  getEquirectBaseMapOptionForId,
  resolveEquirectBaseMapAsset,
  resolveEquirectBaseMapImageSrc,
  SUPPORTED_EQUIRECT_BASE_MAP_IDS,
} from "../baseMapAssetResolve";
import type { BaseMapOption, BaseMapResolveContext } from "../baseMapAssetResolve";
import {
  type BaseMapPresentationConfig,
  type BaseMapPresentationByMapId,
  DEFAULT_BASE_MAP_PRESENTATION,
  getBaseMapPresentationForMapId,
  normalizeBaseMapPresentation,
  normalizeBaseMapPresentationByMapId,
  setBaseMapPresentationForMapId,
} from "../baseMapPresentation";
import {
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT,
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY,
} from "../../core/emissiveNightLightsPresentationDefaults";
import {
  CLOUD_PARTICIPATION_PRESENTATION_INTENSITY_MAX,
  CLOUD_PARTICIPATION_PRESENTATION_INTENSITY_MIN,
  DEFAULT_CLOUD_PARTICIPATION_PRESENTATION_INTENSITY,
} from "../../core/cloudParticipationPresentationDefaults";
import {
  isCloudParticipationPresentationMode,
  type CloudParticipationPresentationMode,
} from "../../core/cloudParticipationPolicy";
import {
  DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE,
  DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
  DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE,
} from "../../core/sceneIlluminationPresentationDefaults";
import {
  isEmissiveNightLightsPresentationMode,
  type EmissiveNightLightsPresentationMode,
} from "../../core/emissiveNightLightsPolicy";
import {
  DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID,
  resolveEmissiveCompositionAssetIdToCanonicalId,
} from "../emissiveCompositionAssetResolve";
import {
  isMoonlightPresentationMode,
  type MoonlightPresentationMode,
} from "../../core/moonlightPolicy";

/** Durable lifecycle source for Model A cloud participation (same as DLC-1 Model B). */
export const DEFAULT_CLOUD_PARTICIPATION_SOURCE_ID = "global-clouds-ir-v1";

export {
  DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID as DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID,
  isEmissiveNightLightsPresentationMode,
  type EmissiveNightLightsPresentationMode,
};
export { isMoonlightPresentationMode, type MoonlightPresentationMode };
export {
  isCloudParticipationPresentationMode,
  type CloudParticipationPresentationMode,
};
export {
  DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE,
  DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
  DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE,
} from "../../core/sceneIlluminationPresentationDefaults";

export type { BaseMapOption, BaseMapResolveContext };
export {
  BASE_MAP_OPTION_CATEGORY_ORDER,
  EQUIRECT_BASE_MAP_OPTIONS,
  calendarMonthUtc1To12FromUnixMs,
  canonicalEquirectBaseMapIdForPersistence,
  getEquirectBaseMapCatalogEntry,
  getEquirectBaseMapOptionForId,
  resolveEquirectBaseMapImageSrc,
  resolveEquirectBaseMapAsset,
  SUPPORTED_EQUIRECT_BASE_MAP_IDS,
};
export { sortSceneLayersForRender, zIndexForSceneStackIndex } from "../sceneLayerOrder";
export {
  type BaseMapPresentationByMapId,
  type BaseMapPresentationConfig,
  DEFAULT_BASE_MAP_PRESENTATION,
  baseMapPresentationEqual,
  baseMapPresentationToCssFilterString,
  clampBaseMapOpacity,
  getBaseMapPresentationForMapId,
  normalizeBaseMapPresentation,
  normalizeBaseMapPresentationByMapId,
  resolveEffectiveBaseMapPresentation,
  setBaseMapPresentationForMapId,
} from "../baseMapPresentation";
export {
  planSceneStackComposition,
  type SceneBaseMapCompositePart,
  type SceneOverlayCompositePart,
  type SceneStackCompositionPlan,
} from "../sceneStackComposition";
export {
  LUNAR_GROUND_TRACK_EXTENT_HOURS,
  DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS,
  DEFAULT_LUNAR_GROUND_TRACK_FUTURE_HOURS,
  type LunarGroundTrackExtentHours,
} from "../../core/lunarGroundTrack";
export {
  DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR,
  DEFAULT_LUNAR_GROUND_TRACK_PAST_COLOR,
  DEFAULT_LUNAR_GROUND_TRACK_FUTURE_COLOR,
  normalizeLunarGroundTrackStrokeCss,
} from "../../core/lunarGroundTrackAppearance";

export const DEFAULT_SCENE_PROJECTION_ID = "equirectangular";
export const DEFAULT_SCENE_VIEW_MODE = "fullWorldFixed" as const;
export const DEFAULT_SCENE_ORDERING_MODE = "user" as const;
export const SCENE_CONFIG_VERSION = 1 as const;
/** Default base map id: maps to the shipped equirectangular world raster. */
export const DEFAULT_EQUIRECT_BASE_MAP_ID = DEFAULT_EQUIRECT_BASE_MAP_ID_VALUE;

export type SceneViewMode = "fullWorldFixed";
export type SceneOrderingMode = "user";

export type BaseMapConfig = {
  id: string;
  visible: boolean;
  opacity?: number;
  /**
   * Visual-only tuning for the active base-map family (not per month file).
   * Omitted in partial input; always clamped in {@link normalizeSceneConfig}.
   */
  presentation?: BaseMapPresentationConfig;
  /**
   * Authoritative per-base-map-family visual tuning keyed by `baseMap.id`.
   * Month-aware families share one entry for the family id.
   */
  presentationByMapId?: BaseMapPresentationByMapId;
  styleVariant?: string;
  metadata?: Record<string, unknown>;
};

export type LayerSourceConfig =
  | {
      kind: "derived";
      product: string;
      parameters?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }
  | { kind: "staticRaster"; src: string; metadata?: Record<string, unknown> }
  | {
      /** DLC-1: Model B dynamic equirect — durable lifecycle source id (not a CDN URL). */
      kind: "dynamicEquirectRaster";
      sourceId: string;
      metadata?: Record<string, unknown>;
    }
  | {
      /** DLC-2: Model B dynamic point features — durable lifecycle source id (not a CDN URL). */
      kind: "dynamicPointFeatures";
      sourceId: string;
      metadata?: Record<string, unknown>;
    }
  | {
      /** DLC-3: Model B dynamic tracks — durable lifecycle source id (not a CDN URL). */
      kind: "dynamicTracks";
      sourceId: string;
      metadata?: Record<string, unknown>;
    }
  | { kind: "custom"; config: Record<string, unknown> };

export type SceneLayerFamily =
  | "environment"
  | "astronomy"
  | "annotation"
  | "reference"
  | "mobility"
  | "custom";

export type SceneLayerType =
  | "environmentRaster"
  | "astronomyVector"
  | "referenceGrid"
  | "annotationPoints"
  | "staticRaster"
  | "custom";

export type SceneLayerInstance = {
  id: string;
  family: SceneLayerFamily;
  type: SceneLayerType;
  enabled: boolean;
  opacity?: number;
  order: number;
  source: LayerSourceConfig;
  presentation?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type SceneMoonlightConfig = {
  mode: MoonlightPresentationMode;
};

/** User-facing tuning for emissive night-light read (normalized; always present on {@link SceneEmissiveNightLightsConfig}). */
export type SceneEmissiveNightLightsPresentationConfig = {
  /** Multiplies policy contribution after mode gain and gates; 0..4. */
  intensity: number;
  /**
   * Display-encoded luma lift on decoded Black Marble–class texels: `pow(linearLuma, exponent)`.
   * Lower reveals faint lights more strongly; higher preserves urban hotspots. Clamped 0.35..1.
   */
  driverExponent: number;
};

export const EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MIN = 0;
export const EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MAX = 4;
export const EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MIN = 0.35;
export const EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MAX = 1;

export {
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT,
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY,
};

export const DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION: SceneEmissiveNightLightsPresentationConfig =
  Object.freeze({
    intensity: DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY,
    driverExponent: DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT,
  });

export function clampEmissiveNightLightsPresentationIntensity(n: number): number {
  if (!Number.isFinite(n)) {
    return DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY;
  }
  return Math.max(
    EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MIN,
    Math.min(EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MAX, n),
  );
}

export function clampEmissiveNightLightsDriverExponent(n: number): number {
  if (!Number.isFinite(n)) {
    return DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT;
  }
  return Math.max(
    EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MIN,
    Math.min(EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MAX, n),
  );
}

export type SceneEmissiveNightLightsConfig = {
  mode: EmissiveNightLightsPresentationMode;
  /** Durable semantic composition-input id; resolved via catalog in Phase 2 (not a base-map selector). */
  assetId: string;
  presentation: SceneEmissiveNightLightsPresentationConfig;
};

export type SceneCloudParticipationPresentationConfig = {
  /** Scales Model A cloud attenuation; clamped 0..2; default 1. */
  intensity: number;
};

export type SceneCloudParticipationConfig = {
  mode: CloudParticipationPresentationMode;
  /**
   * Durable lifecycle source id (equirect raster). Default {@link DEFAULT_CLOUD_PARTICIPATION_SOURCE_ID}
   * (same fixture / feed as DLC-1 Model B).
   */
  sourceId: string;
  presentation: SceneCloudParticipationPresentationConfig;
};

export type SceneIlluminationConfig = {
  moonlight: SceneMoonlightConfig;
  emissiveNightLights: SceneEmissiveNightLightsConfig;
  /** DLC-4 Model A: modulate planetary illumination from lifecycle-prepared cloud opacity. */
  cloudParticipation: SceneCloudParticipationConfig;
};

/**
 * User-facing scaling of the derived overlay readability frame (post-process in the shell).
 * Defaults preserve shipped v1 + v1.1 + substrate behavior.
 */
export type SceneOverlayReadabilityPresentationConfig = {
  /**
   * Multiplies combined readability veil (subsolar + emissive policy) before overlay hints / filters.
   * Clamped 0..1.5; default 1.
   */
  readabilityVeilScale01: number;
  /**
   * Multiplies substrate-derived overlay lift scale before clamp to [substrate min, 1].
   * Clamped 0.65..1.35; default 1.
   */
  overlayLiftMultiplier01: number;
};

/**
 * Keys for optional per-stack-row overlay readability pilots (veil/lift scalars after the global shell frame).
 * Applied after global {@link SceneOverlayReadabilityConfig#presentation} when building that layer's hints.
 */
export const SCENE_OVERLAY_READABILITY_PER_LAYER_PILOT_KEYS = [
  "grid",
  "solarAnalemma",
  "subsolarMarker",
  "sublunarMarker",
  "cityPins",
  "staticEquirectOverlay",
] as const;

export type SceneOverlayReadabilityPerLayerPilotKey =
  (typeof SCENE_OVERLAY_READABILITY_PER_LAYER_PILOT_KEYS)[number];

/**
 * Optional per-stack-layer readability presentation (pilots for default stack rows).
 */
export type SceneOverlayReadabilityPerLayerMap = {
  grid?: SceneOverlayReadabilityPresentationConfig;
  solarAnalemma?: SceneOverlayReadabilityPresentationConfig;
  subsolarMarker?: SceneOverlayReadabilityPresentationConfig;
  sublunarMarker?: SceneOverlayReadabilityPresentationConfig;
  cityPins?: SceneOverlayReadabilityPresentationConfig;
  staticEquirectOverlay?: SceneOverlayReadabilityPresentationConfig;
};

export type SceneOverlayReadabilityConfig = {
  presentation: SceneOverlayReadabilityPresentationConfig;
  /** Omitted when empty or identity-only after normalization. */
  perLayer?: SceneOverlayReadabilityPerLayerMap;
};

export const OVERLAY_READABILITY_VEIL_SCALE_MIN = 0;
export const OVERLAY_READABILITY_VEIL_SCALE_MAX = 1.5;
export const OVERLAY_READABILITY_LIFT_MULT_MIN = 0.65;
export const OVERLAY_READABILITY_LIFT_MULT_MAX = 1.35;

export const DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION: SceneOverlayReadabilityPresentationConfig =
  Object.freeze({
    readabilityVeilScale01: 1,
    overlayLiftMultiplier01: 1,
  });

export function clampReadabilityVeilScale01(n: number): number {
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(
    OVERLAY_READABILITY_VEIL_SCALE_MIN,
    Math.min(OVERLAY_READABILITY_VEIL_SCALE_MAX, n),
  );
}

export function clampOverlayLiftMultiplier01(n: number): number {
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(
    OVERLAY_READABILITY_LIFT_MULT_MIN,
    Math.min(OVERLAY_READABILITY_LIFT_MULT_MAX, n),
  );
}

export type SceneConfig = {
  version: 1;
  projectionId: string;
  viewMode: SceneViewMode;
  baseMap: BaseMapConfig;
  layers: readonly SceneLayerInstance[];
  orderingMode: SceneOrderingMode;
  /** Presentation-only illumination controls (resolved upstream of RenderPlan). */
  illumination: SceneIlluminationConfig;
  /**
   * Overlay legibility presentation: global veil/lift scaling in the shell, plus optional per-layer pilots
   * (`perLayer` keys in {@link SCENE_OVERLAY_READABILITY_PER_LAYER_PILOT_KEYS}).
   * Always present on normalized configs.
   */
  overlayReadability: SceneOverlayReadabilityConfig;
  metadata?: Record<string, unknown>;
};

export const SCENE_STACK_LAYER_IDS = [
  "solarShading",
  "grid",
  "staticEquirectOverlay",
  "globalCloudsIr",
  "solarEclipse",
  "earthquakes",
  "orbitalTracks",
  "cityPins",
  "subsolarMarker",
  "lunarGroundTrack",
  "lunarLocus",
  "sublunarMarker",
  "solarAnalemma",
] as const;

export type SceneStackLayerId = (typeof SCENE_STACK_LAYER_IDS)[number];

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function normalizeSceneEmissiveNightLightsPresentationInput(raw: unknown): SceneEmissiveNightLightsPresentationConfig {
  if (!isPlainObject(raw)) {
    return { ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION };
  }
  const iRaw = raw.intensity;
  const eRaw = raw.driverExponent;
  const intensity =
    typeof iRaw === "number" && Number.isFinite(iRaw)
      ? clampEmissiveNightLightsPresentationIntensity(iRaw)
      : DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY;
  const driverExponent =
    typeof eRaw === "number" && Number.isFinite(eRaw)
      ? clampEmissiveNightLightsDriverExponent(eRaw)
      : DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT;
  return { intensity, driverExponent };
}

function clampOpacity(n: number): number {
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(0, Math.min(1, n));
}

function normalizeSceneEmissiveNightLightsInput(raw: unknown): SceneEmissiveNightLightsConfig {
  if (!isPlainObject(raw)) {
    return {
      mode: DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
      assetId: resolveEmissiveCompositionAssetIdToCanonicalId(""),
      presentation: { ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION },
    };
  }
  const mode = isEmissiveNightLightsPresentationMode(raw.mode)
    ? raw.mode
    : DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE;
  const rawId = typeof raw.assetId === "string" ? raw.assetId : "";
  const assetId = resolveEmissiveCompositionAssetIdToCanonicalId(rawId);
  const presentation = normalizeSceneEmissiveNightLightsPresentationInput(
    "presentation" in raw ? raw.presentation : undefined,
  );
  return { mode, assetId, presentation };
}

export const DEFAULT_CLOUD_PARTICIPATION_PRESENTATION: SceneCloudParticipationPresentationConfig =
  Object.freeze({
    intensity: DEFAULT_CLOUD_PARTICIPATION_PRESENTATION_INTENSITY,
  });

export function clampCloudParticipationPresentationIntensity(n: number): number {
  if (!Number.isFinite(n)) {
    return DEFAULT_CLOUD_PARTICIPATION_PRESENTATION_INTENSITY;
  }
  return Math.max(
    CLOUD_PARTICIPATION_PRESENTATION_INTENSITY_MIN,
    Math.min(CLOUD_PARTICIPATION_PRESENTATION_INTENSITY_MAX, n),
  );
}

function normalizeSceneCloudParticipationPresentationInput(
  input: unknown,
): SceneCloudParticipationPresentationConfig {
  if (!isPlainObject(input)) {
    return { ...DEFAULT_CLOUD_PARTICIPATION_PRESENTATION };
  }
  const intensityRaw = input.intensity;
  const intensity =
    typeof intensityRaw === "number" && Number.isFinite(intensityRaw)
      ? clampCloudParticipationPresentationIntensity(intensityRaw)
      : DEFAULT_CLOUD_PARTICIPATION_PRESENTATION_INTENSITY;
  return { intensity };
}

function normalizeCloudParticipationSourceId(raw: unknown): string {
  if (typeof raw !== "string") {
    return DEFAULT_CLOUD_PARTICIPATION_SOURCE_ID;
  }
  const trimmed = raw.trim();
  // Durable semantic ids only — reject URLs / empty.
  if (trimmed === "" || trimmed.includes("://") || /\s/.test(trimmed)) {
    return DEFAULT_CLOUD_PARTICIPATION_SOURCE_ID;
  }
  return trimmed;
}

/**
 * Missing `cloudParticipation` → mode off (legacy illumination unchanged).
 * Unknown modes / bad source ids fall back to defaults.
 */
export function normalizeSceneCloudParticipationInput(
  input: unknown,
): SceneCloudParticipationConfig {
  if (!isPlainObject(input)) {
    return {
      mode: DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE,
      sourceId: DEFAULT_CLOUD_PARTICIPATION_SOURCE_ID,
      presentation: { ...DEFAULT_CLOUD_PARTICIPATION_PRESENTATION },
    };
  }
  const mode = isCloudParticipationPresentationMode(input.mode)
    ? input.mode
    : DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE;
  const sourceId = normalizeCloudParticipationSourceId(
    "sourceId" in input ? input.sourceId : undefined,
  );
  const presentation = normalizeSceneCloudParticipationPresentationInput(
    "presentation" in input ? input.presentation : undefined,
  );
  return { mode, sourceId, presentation };
}

/**
 * Persisted scenes without `illumination` keep prior moonlight appearance (`illustrative`).
 * Missing `emissiveNightLights` under `illumination` normalizes like a greenfield subtree:
 * {@link DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE}.
 * Missing `cloudParticipation` normalizes to {@link DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE} (`off`).
 * {@link buildDefaultSceneConfigFromLayerFlags} uses illustrative moonlight and illustrative emissive night lights.
 */
export function normalizeSceneIlluminationInput(
  input: Record<string, unknown>,
): SceneIlluminationConfig {
  const legacyMoon = (): SceneMoonlightConfig => ({ mode: DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE });
  const emptyEmissive = (): SceneEmissiveNightLightsConfig =>
    normalizeSceneEmissiveNightLightsInput(undefined);
  const emptyCloud = (): SceneCloudParticipationConfig =>
    normalizeSceneCloudParticipationInput(undefined);

  if (!("illumination" in input)) {
    return {
      moonlight: legacyMoon(),
      emissiveNightLights: emptyEmissive(),
      cloudParticipation: emptyCloud(),
    };
  }
  const ill = input.illumination;
  if (!isPlainObject(ill)) {
    return {
      moonlight: legacyMoon(),
      emissiveNightLights: emptyEmissive(),
      cloudParticipation: emptyCloud(),
    };
  }
  let moonlight: SceneMoonlightConfig = legacyMoon();
  const ml = ill.moonlight;
  if (isPlainObject(ml) && isMoonlightPresentationMode(ml.mode)) {
    moonlight = { mode: ml.mode };
  } else if (isPlainObject(ml)) {
    moonlight = { mode: DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE };
  }
  const emissiveNightLights = normalizeSceneEmissiveNightLightsInput(
    "emissiveNightLights" in ill ? ill.emissiveNightLights : undefined,
  );
  const cloudParticipation = normalizeSceneCloudParticipationInput(
    "cloudParticipation" in ill ? ill.cloudParticipation : undefined,
  );
  return { moonlight, emissiveNightLights, cloudParticipation };
}

function normalizeOverlayReadabilityPresentationFields(
  pres: unknown,
  fallbacks: SceneOverlayReadabilityPresentationConfig,
): SceneOverlayReadabilityPresentationConfig {
  if (!isPlainObject(pres)) {
    return { ...fallbacks };
  }
  const vsRaw = pres.readabilityVeilScale01;
  const lmRaw = pres.overlayLiftMultiplier01;
  const readabilityVeilScale01 =
    typeof vsRaw === "number" && Number.isFinite(vsRaw)
      ? clampReadabilityVeilScale01(vsRaw)
      : fallbacks.readabilityVeilScale01;
  const overlayLiftMultiplier01 =
    typeof lmRaw === "number" && Number.isFinite(lmRaw)
      ? clampOverlayLiftMultiplier01(lmRaw)
      : fallbacks.overlayLiftMultiplier01;
  return { readabilityVeilScale01, overlayLiftMultiplier01 };
}

function isIdentityOverlayReadabilityPresentation(
  pres: SceneOverlayReadabilityPresentationConfig,
): boolean {
  return (
    pres.readabilityVeilScale01 === DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION.readabilityVeilScale01 &&
    pres.overlayLiftMultiplier01 === DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION.overlayLiftMultiplier01
  );
}

function normalizePerLayerOverlayReadabilityPilot(
  raw: unknown,
): SceneOverlayReadabilityPresentationConfig | undefined {
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const normalized = normalizeOverlayReadabilityPresentationFields(
    raw,
    DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
  );
  return isIdentityOverlayReadabilityPresentation(normalized) ? undefined : normalized;
}

function normalizeSceneOverlayReadabilityInput(input: Record<string, unknown>): SceneOverlayReadabilityConfig {
  const defaults = (): SceneOverlayReadabilityConfig => ({
    presentation: { ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION },
  });
  const raw = input.overlayReadability;
  if (!isPlainObject(raw)) {
    return defaults();
  }
  const presentation = normalizeOverlayReadabilityPresentationFields(
    raw.presentation,
    DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
  );
  let perLayer: SceneOverlayReadabilityPerLayerMap | undefined;
  if (isPlainObject(raw.perLayer)) {
    const pl = raw.perLayer;
    const grid = normalizePerLayerOverlayReadabilityPilot(pl.grid);
    const solarAnalemma = normalizePerLayerOverlayReadabilityPilot(pl.solarAnalemma);
    const subsolarMarker = normalizePerLayerOverlayReadabilityPilot(pl.subsolarMarker);
    const sublunarMarker = normalizePerLayerOverlayReadabilityPilot(pl.sublunarMarker);
    const cityPins = normalizePerLayerOverlayReadabilityPilot(pl.cityPins);
    const staticEquirectOverlay = normalizePerLayerOverlayReadabilityPilot(pl.staticEquirectOverlay);
    if (
      grid !== undefined ||
      solarAnalemma !== undefined ||
      subsolarMarker !== undefined ||
      sublunarMarker !== undefined ||
      cityPins !== undefined ||
      staticEquirectOverlay !== undefined
    ) {
      perLayer = {
        ...(grid !== undefined ? { grid } : {}),
        ...(solarAnalemma !== undefined ? { solarAnalemma } : {}),
        ...(subsolarMarker !== undefined ? { subsolarMarker } : {}),
        ...(sublunarMarker !== undefined ? { sublunarMarker } : {}),
        ...(cityPins !== undefined ? { cityPins } : {}),
        ...(staticEquirectOverlay !== undefined ? { staticEquirectOverlay } : {}),
      };
    }
  }
  return {
    presentation,
    ...(perLayer ? { perLayer } : {}),
  };
}

export function resolveMoonlightPresentationMode(scene: SceneConfig): MoonlightPresentationMode {
  return scene.illumination.moonlight.mode;
}

const SOLAR: SceneLayerInstance = {
  id: "solarShading",
  family: "astronomy",
  type: "astronomyVector",
  enabled: true,
  order: 0,
  source: { kind: "derived", product: "solarDayNightShading" },
};

const GRID: SceneLayerInstance = {
  id: "grid",
  family: "reference",
  type: "referenceGrid",
  enabled: true,
  order: 1,
  source: { kind: "derived", product: "latLonGrid" },
};

/** Phase 3: data-driven static raster; default off so legacy views are unchanged. */
const STATIC_EQUIRECT: SceneLayerInstance = {
  id: "staticEquirectOverlay",
  family: "environment",
  type: "staticRaster",
  enabled: false,
  order: 2,
  opacity: 0.4,
  source: {
    kind: "staticRaster",
    // Placeholder: same shipped equirect as base map; enable + opacity in scene for visible blend tests.
    src: "/maps/world-equirectangular.jpg",
  },
};

/**
 * DLC-1: Model B global equirect clouds / IR — lifecycle sourceId, default off.
 * Acquisition is outside rAF; layer reads sync-prepared views only.
 */
const GLOBAL_CLOUDS_IR: SceneLayerInstance = {
  id: "globalCloudsIr",
  family: "environment",
  type: "environmentRaster",
  enabled: false,
  order: 2.5,
  opacity: 0.45,
  source: {
    kind: "dynamicEquirectRaster",
    sourceId: "global-clouds-ir-v1",
  },
};

/** NASA-derived solar eclipse overlay: live footprint plus optional forecast corridor. Default off. */
const SOLAR_ECLIPSE_ROW: SceneLayerInstance = {
  id: "solarEclipse",
  family: "astronomy",
  type: "astronomyVector",
  enabled: false,
  order: 2.7,
  source: {
    kind: "derived",
    product: "solarEclipseLiveFootprint",
    parameters: {
      showCentralLine: DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_LINE,
      showCentralBand: DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_BAND,
      showPartialRegion: DEFAULT_SOLAR_ECLIPSE_SHOW_PARTIAL_REGION,
      showForecastCorridor: DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_CORRIDOR,
      showForecastPartialRegion: DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_PARTIAL_REGION,
      forecastHorizonDays: DEFAULT_SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS,
    },
  },
};

/**
 * DLC-2: Model B earthquake point features — lifecycle sourceId, default off.
 * Acquisition is outside rAF; layer reads sync-prepared views only.
 */
const EARTHQUAKES: SceneLayerInstance = {
  id: "earthquakes",
  family: "annotation",
  type: "annotationPoints",
  enabled: false,
  order: 3.5,
  opacity: 0.95,
  source: {
    kind: "dynamicPointFeatures",
    sourceId: "usgs-earthquakes-v1",
  },
};

/**
 * DLC-3: Model B ISS orbital tracks — lifecycle sourceId, default off.
 * Acquisition is outside rAF; layer reads sync-prepared views only.
 */
const ORBITAL_TRACKS: SceneLayerInstance = {
  id: "orbitalTracks",
  family: "mobility",
  type: "astronomyVector",
  enabled: false,
  order: 3.6,
  opacity: 0.95,
  source: {
    kind: "dynamicTracks",
    sourceId: "iss-orbital-track-v1",
  },
};

const CITY: SceneLayerInstance = {
  id: "cityPins",
  family: "annotation",
  type: "annotationPoints",
  enabled: true,
  order: 3,
  source: { kind: "derived", product: "referenceAndCustomCityPins" },
};

const SUBSOLAR: SceneLayerInstance = {
  id: "subsolarMarker",
  family: "astronomy",
  type: "astronomyVector",
  enabled: true,
  order: 4,
  source: { kind: "derived", product: "subsolarPoint" },
};

const LUNAR_GROUND_TRACK_ROW: SceneLayerInstance = {
  id: "lunarGroundTrack",
  family: "astronomy",
  type: "astronomyVector",
  enabled: false,
  order: 4.5,
  source: {
    kind: "derived",
    product: "sublunarGroundTrack",
    parameters: {
      pastHours: DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS,
      futureHours: DEFAULT_LUNAR_GROUND_TRACK_FUTURE_HOURS,
      pastColor: DEFAULT_LUNAR_GROUND_TRACK_PAST_COLOR,
      futureColor: DEFAULT_LUNAR_GROUND_TRACK_FUTURE_COLOR,
    },
  },
};

const LUNAR_LOCUS_ROW: SceneLayerInstance = {
  id: "lunarLocus",
  family: "astronomy",
  type: "astronomyVector",
  enabled: false,
  order: 4.75,
  source: {
    kind: "derived",
    product: "sublunarLocus",
    parameters: {
      strokeColor: DEFAULT_LUNAR_LOCUS_STROKE_RGB,
      strokeThickness: DEFAULT_ASTRONOMY_PATH_THICKNESS,
    },
  },
};

const SUBLUNAR: SceneLayerInstance = {
  id: "sublunarMarker",
  family: "astronomy",
  type: "astronomyVector",
  enabled: true,
  order: 5,
  source: {
    kind: "derived",
    product: "sublunarPoint",
    parameters: { ...DEFAULT_SUBLUNAR_MARKER_APPEARANCE },
  },
};

/** Phase 4: equation-of-time ground track; default off so the legacy stack is visually unchanged. */
const SOLAR_ANALEMMA_ROW: SceneLayerInstance = {
  id: "solarAnalemma",
  family: "astronomy",
  type: "astronomyVector",
  enabled: false,
  order: 6,
  source: {
    kind: "derived",
    product: "solarAnalemmaGroundTrack",
    parameters: {
      strokeColor: DEFAULT_SOLAR_ANALEMMA_STROKE_RGB,
      strokeThickness: DEFAULT_ASTRONOMY_PATH_THICKNESS,
    },
  },
};

const DEFAULT_STACK: readonly SceneLayerInstance[] = [
  SOLAR,
  GRID,
  STATIC_EQUIRECT,
  GLOBAL_CLOUDS_IR,
  SOLAR_ECLIPSE_ROW,
  CITY,
  EARTHQUAKES,
  ORBITAL_TRACKS,
  SUBSOLAR,
  LUNAR_GROUND_TRACK_ROW,
  LUNAR_LOCUS_ROW,
  SUBLUNAR,
  SOLAR_ANALEMMA_ROW,
];

function mapLayerIdToKey(id: string): keyof LayerEnableFlags | "base" | null {
  switch (id) {
    case "solarShading":
      return "solarShading";
    case "grid":
      return "grid";
    case "cityPins":
      return "cityPins";
    case "subsolarMarker":
      return "subsolarMarker";
    case "lunarGroundTrack":
      return "lunarGroundTrack";
    case "lunarLocus":
      return "lunarLocus";
    case "sublunarMarker":
      return "sublunarMarker";
    case "staticEquirectOverlay":
      return "staticEquirectOverlay";
    case "globalCloudsIr":
      return "globalCloudsIr";
    case "solarEclipse":
      return "solarEclipse";
    case "earthquakes":
      return "earthquakes";
    case "orbitalTracks":
      return "orbitalTracks";
    case "solarAnalemma":
      return "solarAnalemma";
    default:
      return null;
  }
}

/**
 * Initial scene stack that mirrors current layer enable flags (one row per legacy boolean, sans base map).
 */
export function buildDefaultSceneConfigFromLayerFlags(layers: LayerEnableFlags): SceneConfig {
  const withFlags: SceneLayerInstance[] = DEFAULT_STACK.map((def) => {
    const k = mapLayerIdToKey(def.id);
    const en = k && k !== "base" ? layers[k] : true;
    return {
      ...def,
      enabled: en,
      opacity: 1,
    };
  });
  return {
    version: 1,
    projectionId: DEFAULT_SCENE_PROJECTION_ID,
    viewMode: DEFAULT_SCENE_VIEW_MODE,
    orderingMode: DEFAULT_SCENE_ORDERING_MODE,
    baseMap: {
      id: DEFAULT_EQUIRECT_BASE_MAP_ID,
      visible: layers.baseMap,
      opacity: 1,
      presentation: { ...DEFAULT_BASE_MAP_PRESENTATION },
    },
    layers: withFlags,
    illumination: {
      moonlight: { mode: DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE },
      emissiveNightLights: {
        mode: DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
        assetId: DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID,
        presentation: { ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION },
      },
      cloudParticipation: {
        mode: DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE,
        sourceId: DEFAULT_CLOUD_PARTICIPATION_SOURCE_ID,
        presentation: { ...DEFAULT_CLOUD_PARTICIPATION_PRESENTATION },
      },
    },
    overlayReadability: {
      presentation: { ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION },
    },
  };
}

export function deriveLayerEnableFlagsFromScene(scene: SceneConfig): LayerEnableFlags {
  const out: LayerEnableFlags = {
    baseMap: scene.baseMap.visible,
    solarShading: false,
    grid: false,
    staticEquirectOverlay: false,
    globalCloudsIr: false,
    solarEclipse: false,
    earthquakes: false,
    orbitalTracks: false,
    cityPins: false,
    subsolarMarker: false,
    lunarGroundTrack: false,
    lunarLocus: false,
    sublunarMarker: false,
    solarAnalemma: false,
  };
  for (const inst of scene.layers) {
    const k = mapLayerIdToKey(inst.id);
    if (k && k !== "base") {
      out[k] = inst.enabled;
    }
  }
  return out;
}

/**
 * Updates enable flags in an existing scene to match `layers` (base map uses `baseMap.visible`).
 * Preserves order and other scene fields.
 */
export function applyLayerEnableFlagsToScene(
  scene: SceneConfig,
  layers: LayerEnableFlags,
): SceneConfig {
  const nextLayers: SceneLayerInstance[] = scene.layers.map((def) => {
    const k = mapLayerIdToKey(def.id);
    if (!k || k === "base") {
      return { ...def };
    }
    return { ...def, enabled: layers[k] };
  });
  return {
    ...scene,
    baseMap: {
      ...scene.baseMap,
      visible: layers.baseMap,
    },
    layers: nextLayers,
  };
}

export function lunarGroundTrackExtentsFromScene(scene: SceneConfig): {
  pastHours: number;
  futureHours: number;
} {
  const row = scene.layers.find((l) => l.id === "lunarGroundTrack");
  const params = row?.source.kind === "derived" ? row.source.parameters : undefined;
  return {
    pastHours: normalizeLunarGroundTrackExtentHours(params?.pastHours),
    futureHours: normalizeLunarGroundTrackExtentHours(params?.futureHours),
  };
}

export function lunarGroundTrackColorsFromScene(scene: SceneConfig): {
  pastColor: string;
  futureColor: string;
} {
  const row = scene.layers.find((l) => l.id === "lunarGroundTrack");
  const params = row?.source.kind === "derived" ? row.source.parameters : undefined;
  return {
    pastColor: normalizeLunarGroundTrackStrokeCss(params?.pastColor),
    futureColor: normalizeLunarGroundTrackStrokeCss(params?.futureColor),
  };
}

export function applyLunarGroundTrackExtentToScene(
  scene: SceneConfig,
  which: "pastHours" | "futureHours",
  hours: unknown,
): SceneConfig {
  const nextHours = normalizeLunarGroundTrackExtentHours(hours);
  return {
    ...scene,
    layers: scene.layers.map((row) => {
      if (row.id !== "lunarGroundTrack" || row.source.kind !== "derived") {
        return row;
      }
      return {
        ...row,
        source: withNormalizedSublunarGroundTrackParameters({
          ...row.source,
          parameters: {
            ...(row.source.parameters ?? {}),
            [which]: nextHours,
          },
        }),
      };
    }),
  };
}

export function applyLunarGroundTrackColorToScene(
  scene: SceneConfig,
  which: "pastColor" | "futureColor",
  color: unknown,
): SceneConfig {
  const nextColor = normalizeLunarGroundTrackStrokeCss(color);
  return {
    ...scene,
    layers: scene.layers.map((row) => {
      if (row.id !== "lunarGroundTrack" || row.source.kind !== "derived") {
        return row;
      }
      return {
        ...row,
        source: withNormalizedSublunarGroundTrackParameters({
          ...row.source,
          parameters: {
            ...(row.source.parameters ?? {}),
            [which]: nextColor,
          },
        }),
      };
    }),
  };
}

export function sublunarMarkerAppearanceFromScene(scene: SceneConfig): SublunarMarkerAppearance {
  const row = scene.layers.find((l) => l.id === "sublunarMarker");
  const params = row?.source.kind === "derived" ? row.source.parameters : undefined;
  return normalizeSublunarMarkerAppearance(params);
}

export function applySublunarMarkerAppearanceToScene(
  scene: SceneConfig,
  patch: Partial<SublunarMarkerAppearance>,
): SceneConfig {
  const current = sublunarMarkerAppearanceFromScene(scene);
  const next = normalizeSublunarMarkerAppearance({ ...current, ...patch });
  return {
    ...scene,
    layers: scene.layers.map((row) => {
      if (row.id !== "sublunarMarker" || row.source.kind !== "derived") {
        return row;
      }
      return {
        ...row,
        source: withNormalizedSublunarPointParameters({
          ...row.source,
          parameters: { ...(row.source.parameters ?? {}), ...next },
        }),
      };
    }),
  };
}

export function solarEclipsePresentationFromScene(scene: SceneConfig) {
  const row = scene.layers.find((l) => l.id === "solarEclipse");
  const params = row?.source.kind === "derived" ? row.source.parameters : undefined;
  return normalizeSolarEclipsePresentation(params);
}

export function applySolarEclipsePresentationToScene(
  scene: SceneConfig,
  patch: Partial<{
    showCentralLine: boolean;
    showCentralBand: boolean;
    showPartialRegion: boolean;
    showForecastCorridor: boolean;
    showForecastPartialRegion: boolean;
    forecastHorizonDays: number;
  }>,
): SceneConfig {
  const current = solarEclipsePresentationFromScene(scene);
  const next = normalizeSolarEclipsePresentation({ ...current, ...patch });
  return {
    ...scene,
    layers: scene.layers.map((row) => {
      if (row.id !== "solarEclipse" || row.source.kind !== "derived") {
        return row;
      }
      return {
        ...row,
        source: withNormalizedSolarEclipseParameters({
          ...row.source,
          parameters: { ...(row.source.parameters ?? {}), ...next },
        }),
      };
    }),
  };
}

export function lunarLocusStrokeFromScene(scene: SceneConfig): {
  strokeColor: string;
  strokeThickness: ReturnType<typeof normalizeAstronomyPathThicknessId>;
} {
  const row = scene.layers.find((l) => l.id === "lunarLocus");
  const params = row?.source.kind === "derived" ? row.source.parameters : undefined;
  return {
    strokeColor: normalizeAstronomyPathColorCss(params?.strokeColor, DEFAULT_LUNAR_LOCUS_STROKE_RGB),
    strokeThickness: normalizeAstronomyPathThicknessId(params?.strokeThickness),
  };
}

export function applyLunarLocusStrokeToScene(
  scene: SceneConfig,
  patch: { strokeColor?: unknown; strokeThickness?: unknown },
): SceneConfig {
  const current = lunarLocusStrokeFromScene(scene);
  const next = {
    strokeColor: normalizeAstronomyPathColorCss(
      patch.strokeColor !== undefined ? patch.strokeColor : current.strokeColor,
      DEFAULT_LUNAR_LOCUS_STROKE_RGB,
    ),
    strokeThickness: normalizeAstronomyPathThicknessId(
      patch.strokeThickness !== undefined ? patch.strokeThickness : current.strokeThickness,
    ),
  };
  return {
    ...scene,
    layers: scene.layers.map((row) => {
      if (row.id !== "lunarLocus" || row.source.kind !== "derived") {
        return row;
      }
      return {
        ...row,
        source: withNormalizedSublunarLocusParameters({
          ...row.source,
          parameters: { ...(row.source.parameters ?? {}), ...next },
        }),
      };
    }),
  };
}

export function solarAnalemmaStrokeFromScene(scene: SceneConfig): {
  strokeColor: string;
  strokeThickness: ReturnType<typeof normalizeAstronomyPathThicknessId>;
} {
  const row = scene.layers.find((l) => l.id === "solarAnalemma");
  const params = row?.source.kind === "derived" ? row.source.parameters : undefined;
  return {
    strokeColor: normalizeAstronomyPathColorCss(
      params?.strokeColor,
      DEFAULT_SOLAR_ANALEMMA_STROKE_RGB,
    ),
    strokeThickness: normalizeAstronomyPathThicknessId(params?.strokeThickness),
  };
}

export function applySolarAnalemmaStrokeToScene(
  scene: SceneConfig,
  patch: { strokeColor?: unknown; strokeThickness?: unknown },
): SceneConfig {
  const current = solarAnalemmaStrokeFromScene(scene);
  const next = {
    strokeColor: normalizeAstronomyPathColorCss(
      patch.strokeColor !== undefined ? patch.strokeColor : current.strokeColor,
      DEFAULT_SOLAR_ANALEMMA_STROKE_RGB,
    ),
    strokeThickness: normalizeAstronomyPathThicknessId(
      patch.strokeThickness !== undefined ? patch.strokeThickness : current.strokeThickness,
    ),
  };
  return {
    ...scene,
    layers: scene.layers.map((row) => {
      if (row.id !== "solarAnalemma" || row.source.kind !== "derived") {
        return row;
      }
      return {
        ...row,
        source: withNormalizedSolarAnalemmaParameters({
          ...row.source,
          parameters: { ...(row.source.parameters ?? {}), ...next },
        }),
      };
    }),
  };
}

/**
 * Shallow clone for preset / AppConfig snapshots.
 */
export function cloneSceneConfig(scene: SceneConfig): SceneConfig {
  return {
    version: 1,
    projectionId: scene.projectionId,
    viewMode: scene.viewMode,
    orderingMode: scene.orderingMode,
    baseMap: {
      ...scene.baseMap,
      metadata: scene.baseMap.metadata ? { ...scene.baseMap.metadata } : undefined,
      presentation: scene.baseMap.presentation
        ? { ...scene.baseMap.presentation }
        : { ...DEFAULT_BASE_MAP_PRESENTATION },
      presentationByMapId: scene.baseMap.presentationByMapId
        ? Object.fromEntries(
            Object.entries(scene.baseMap.presentationByMapId).map(([id, presentation]) => [
              id,
              { ...presentation },
            ]),
          )
        : undefined,
    },
    layers: scene.layers.map((L) => ({
      ...L,
      opacity: L.opacity,
      source: isPlainObject(L.source) ? ({ ...L.source } as LayerSourceConfig) : L.source,
      presentation: L.presentation ? { ...L.presentation } : undefined,
      metadata: L.metadata ? { ...L.metadata } : undefined,
    })),
    illumination: {
      moonlight: { mode: scene.illumination.moonlight.mode },
      emissiveNightLights: {
        mode: scene.illumination.emissiveNightLights.mode,
        assetId: scene.illumination.emissiveNightLights.assetId,
        presentation: { ...scene.illumination.emissiveNightLights.presentation },
      },
      cloudParticipation: {
        mode: scene.illumination.cloudParticipation.mode,
        sourceId: scene.illumination.cloudParticipation.sourceId,
        presentation: { ...scene.illumination.cloudParticipation.presentation },
      },
    },
    overlayReadability: {
      presentation: { ...scene.overlayReadability.presentation },
      ...(scene.overlayReadability.perLayer &&
      SCENE_OVERLAY_READABILITY_PER_LAYER_PILOT_KEYS.some(
        (k) => scene.overlayReadability.perLayer![k] !== undefined,
      )
        ? {
            perLayer: {
              ...(scene.overlayReadability.perLayer.grid
                ? { grid: { ...scene.overlayReadability.perLayer.grid } }
                : {}),
              ...(scene.overlayReadability.perLayer.solarAnalemma
                ? { solarAnalemma: { ...scene.overlayReadability.perLayer.solarAnalemma } }
                : {}),
              ...(scene.overlayReadability.perLayer.subsolarMarker
                ? { subsolarMarker: { ...scene.overlayReadability.perLayer.subsolarMarker } }
                : {}),
              ...(scene.overlayReadability.perLayer.sublunarMarker
                ? { sublunarMarker: { ...scene.overlayReadability.perLayer.sublunarMarker } }
                : {}),
              ...(scene.overlayReadability.perLayer.cityPins
                ? { cityPins: { ...scene.overlayReadability.perLayer.cityPins } }
                : {}),
              ...(scene.overlayReadability.perLayer.staticEquirectOverlay
                ? {
                    staticEquirectOverlay: {
                      ...scene.overlayReadability.perLayer.staticEquirectOverlay,
                    },
                  }
                : {}),
            },
          }
        : {}),
    },
    metadata: scene.metadata ? { ...scene.metadata } : undefined,
  };
}

function normalizeBaseMap(input: unknown, fallbacks: LayerEnableFlags): BaseMapConfig {
  const d = buildDefaultSceneConfigFromLayerFlags(fallbacks).baseMap;
  if (!isPlainObject(input)) {
    return { ...d };
  }
  const id = typeof input.id === "string" && input.id.trim() !== "" ? input.id.trim() : d.id;
  const vis =
    typeof input.visible === "boolean" ? input.visible : d.visible;
  let opacity: number | undefined;
  const oRaw = input.opacity;
  if (typeof oRaw === "number" && Number.isFinite(oRaw)) {
    opacity = clampOpacity(oRaw);
  }
  const styleVariant =
    typeof input.styleVariant === "string" && input.styleVariant.trim() !== ""
      ? input.styleVariant.trim()
      : undefined;
  const presentation = normalizeBaseMapPresentation(
    isPlainObject(input) ? input.presentation : undefined,
  );
  const presentationByMapIdFromInput = normalizeBaseMapPresentationByMapId(
    isPlainObject(input) ? input.presentationByMapId : undefined,
  );
  const effectivePresentation = getBaseMapPresentationForMapId(
    id,
    presentationByMapIdFromInput,
    presentation,
  );
  const presentationByMapId = setBaseMapPresentationForMapId(
    presentationByMapIdFromInput,
    id,
    effectivePresentation,
  );
  return {
    id,
    visible: vis,
    presentation: effectivePresentation,
    presentationByMapId,
    ...(opacity !== undefined ? { opacity } : { opacity: 1 }),
    ...(styleVariant !== undefined ? { styleVariant } : {}),
  };
}

function withNormalizedSublunarGroundTrackParameters(source: LayerSourceConfig): LayerSourceConfig {
  if (source.kind !== "derived" || source.product !== "sublunarGroundTrack") {
    return source;
  }
  const pastHours = normalizeLunarGroundTrackExtentHours(source.parameters?.pastHours);
  const futureHours = normalizeLunarGroundTrackExtentHours(source.parameters?.futureHours);
  const pastColor = normalizeLunarGroundTrackStrokeCss(source.parameters?.pastColor);
  const futureColor = normalizeLunarGroundTrackStrokeCss(source.parameters?.futureColor);
  return {
    ...source,
    parameters: {
      ...(source.parameters ?? {}),
      pastHours,
      futureHours,
      pastColor,
      futureColor,
    },
  };
}

function withNormalizedSublunarPointParameters(source: LayerSourceConfig): LayerSourceConfig {
  if (source.kind !== "derived" || source.product !== "sublunarPoint") {
    return source;
  }
  const appearance = normalizeSublunarMarkerAppearance(source.parameters);
  return {
    ...source,
    parameters: {
      ...(source.parameters ?? {}),
      ...appearance,
    },
  };
}

function withNormalizedSublunarLocusParameters(source: LayerSourceConfig): LayerSourceConfig {
  if (source.kind !== "derived" || source.product !== "sublunarLocus") {
    return source;
  }
  return {
    ...source,
    parameters: {
      ...(source.parameters ?? {}),
      strokeColor: normalizeAstronomyPathColorCss(
        source.parameters?.strokeColor,
        DEFAULT_LUNAR_LOCUS_STROKE_RGB,
      ),
      strokeThickness: normalizeAstronomyPathThicknessId(source.parameters?.strokeThickness),
    },
  };
}

function withNormalizedSolarAnalemmaParameters(source: LayerSourceConfig): LayerSourceConfig {
  if (source.kind !== "derived" || source.product !== "solarAnalemmaGroundTrack") {
    return source;
  }
  const utcHour = source.parameters?.utcHour;
  return {
    ...source,
    parameters: {
      ...(source.parameters ?? {}),
      ...(typeof utcHour === "number" && Number.isFinite(utcHour) ? { utcHour } : {}),
      strokeColor: normalizeAstronomyPathColorCss(
        source.parameters?.strokeColor,
        DEFAULT_SOLAR_ANALEMMA_STROKE_RGB,
      ),
      strokeThickness: normalizeAstronomyPathThicknessId(source.parameters?.strokeThickness),
    },
  };
}

function withNormalizedSolarEclipseParameters(source: LayerSourceConfig): LayerSourceConfig {
  if (source.kind !== "derived" || source.product !== "solarEclipseLiveFootprint") {
    return source;
  }
  const p = normalizeSolarEclipsePresentation(source.parameters);
  return {
    ...source,
    parameters: {
      ...(source.parameters ?? {}),
      ...p,
    },
  };
}

function defaultSourceForLayerId(id: string): LayerSourceConfig {
  const m = new Map<string, LayerSourceConfig>(
    DEFAULT_STACK.map((s) => [s.id, s.source] as const),
  );
  return m.get(id) ?? { kind: "custom", config: { layerId: id } };
}

function defaultForLayerId(
  id: string,
  order: number,
  fallbacks: LayerEnableFlags,
): SceneLayerInstance {
  const d = DEFAULT_STACK.find((s) => s.id === id);
  if (!d) {
    return {
      id,
      family: "custom",
      type: "custom",
      enabled: true,
      order,
      source: { kind: "custom", config: { layerId: id } },
    };
  }
  const k = mapLayerIdToKey(d.id);
  const en = k && k !== "base" ? fallbacks[k] : true;
  return {
    ...d,
    order,
    enabled: en,
    opacity: 1,
  };
}

function parseLayerInstance(raw: unknown, fallbacks: LayerEnableFlags): SceneLayerInstance | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const id = raw.id;
  if (typeof id !== "string" || id.trim() === "") {
    return null;
  }
  const idNorm = id.trim();
  const k0 = mapLayerIdToKey(idNorm);
  const en =
    typeof raw.enabled === "boolean"
      ? raw.enabled
      : k0 && k0 !== "base"
        ? fallbacks[k0]
        : true;
  const or = raw.order;
  const order = typeof or === "number" && Number.isFinite(or) ? or : 0;
  const fam = raw.family;
  const family: SceneLayerFamily =
    fam === "environment" ||
    fam === "astronomy" ||
    fam === "annotation" ||
    fam === "reference" ||
    fam === "mobility" ||
    fam === "custom"
      ? fam
      : (DEFAULT_STACK.find((d) => d.id === idNorm)?.family ?? "custom");
  const typ = raw.type;
  const type: SceneLayerType =
    typ === "environmentRaster" ||
    typ === "astronomyVector" ||
    typ === "referenceGrid" ||
    typ === "annotationPoints" ||
    typ === "staticRaster" ||
    typ === "custom"
      ? typ
      : (DEFAULT_STACK.find((d) => d.id === idNorm)?.type ?? "custom");
  let source: LayerSourceConfig;
  const sRaw = raw.source;
  if (isPlainObject(sRaw) && sRaw.kind === "derived" && typeof sRaw.product === "string") {
    const params = isPlainObject(sRaw.parameters) ? { ...sRaw.parameters } : undefined;
    source = {
      kind: "derived",
      product: sRaw.product,
      ...(params ? { parameters: params } : {}),
    };
  } else if (isPlainObject(sRaw) && sRaw.kind === "staticRaster" && typeof sRaw.src === "string") {
    const srcT = sRaw.src.trim();
    const defSrc = DEFAULT_STACK.find((d) => d.id === idNorm);
    const fallback =
      defSrc?.source.kind === "staticRaster" ? defSrc.source.src : "/maps/world-equirectangular.jpg";
    source = {
      kind: "staticRaster",
      src: srcT !== "" ? srcT : fallback,
    };
  } else if (
    isPlainObject(sRaw) &&
    sRaw.kind === "dynamicEquirectRaster" &&
    typeof sRaw.sourceId === "string"
  ) {
    const sid = sRaw.sourceId.trim().toLowerCase();
    const defSrc = DEFAULT_STACK.find((d) => d.id === idNorm);
    const fallback =
      defSrc?.source.kind === "dynamicEquirectRaster"
        ? defSrc.source.sourceId
        : "global-clouds-ir-v1";
    source = {
      kind: "dynamicEquirectRaster",
      sourceId: sid !== "" ? sid : fallback,
    };
  } else if (
    isPlainObject(sRaw) &&
    sRaw.kind === "dynamicPointFeatures" &&
    typeof sRaw.sourceId === "string"
  ) {
    const sid = sRaw.sourceId.trim().toLowerCase();
    const defSrc = DEFAULT_STACK.find((d) => d.id === idNorm);
    const fallback =
      defSrc?.source.kind === "dynamicPointFeatures"
        ? defSrc.source.sourceId
        : "usgs-earthquakes-v1";
    source = {
      kind: "dynamicPointFeatures",
      sourceId: sid !== "" ? sid : fallback,
    };
  } else if (
    isPlainObject(sRaw) &&
    sRaw.kind === "dynamicTracks" &&
    typeof sRaw.sourceId === "string"
  ) {
    const sid = sRaw.sourceId.trim().toLowerCase();
    const defSrc = DEFAULT_STACK.find((d) => d.id === idNorm);
    const fallback =
      defSrc?.source.kind === "dynamicTracks"
        ? defSrc.source.sourceId
        : "iss-orbital-track-v1";
    source = {
      kind: "dynamicTracks",
      sourceId: sid !== "" ? sid : fallback,
    };
  } else if (isPlainObject(sRaw) && sRaw.kind === "custom") {
    source = { kind: "custom", config: isPlainObject(sRaw.config) ? { ...sRaw.config } : {} };
  } else {
    source = defaultSourceForLayerId(idNorm);
  }
  source = withNormalizedSublunarGroundTrackParameters(source);
  source = withNormalizedSublunarPointParameters(source);
  source = withNormalizedSublunarLocusParameters(source);
  source = withNormalizedSolarAnalemmaParameters(source);
  source = withNormalizedSolarEclipseParameters(source);
  let opacity: number | undefined;
  if (typeof raw.opacity === "number" && Number.isFinite(raw.opacity)) {
    opacity = clampOpacity(raw.opacity);
  }
  return {
    id: idNorm,
    family,
    type,
    enabled: en,
    ...(opacity !== undefined ? { opacity } : { opacity: 1 }),
    order,
    source,
  };
}

/**
 * Coerces partial / unknown `scene` input and legacy `layers` into a normalized {@link SceneConfig}.
 */
export function normalizeSceneConfig(
  input: unknown,
  layerFallbacks: LayerEnableFlags,
): SceneConfig {
  if (!isPlainObject(input)) {
    return buildDefaultSceneConfigFromLayerFlags(layerFallbacks);
  }
  const ver = input.version;
  if (ver !== 1) {
    return buildDefaultSceneConfigFromLayerFlags(layerFallbacks);
  }
  const proj = input.projectionId;
  const projectionId =
    typeof proj === "string" && proj.trim() !== "" ? proj.trim() : DEFAULT_SCENE_PROJECTION_ID;
  const vm = input.viewMode;
  const viewMode: SceneViewMode = vm === "fullWorldFixed" ? "fullWorldFixed" : DEFAULT_SCENE_VIEW_MODE;
  const om = input.orderingMode;
  const orderingMode: SceneOrderingMode = om === "user" ? "user" : DEFAULT_SCENE_ORDERING_MODE;
  const baseMap = normalizeBaseMap(input.baseMap, layerFallbacks);
  const layersRaw = input.layers;
  const parsed: SceneLayerInstance[] = [];
  if (Array.isArray(layersRaw)) {
    for (const item of layersRaw) {
      const p = parseLayerInstance(item, layerFallbacks);
      if (p) {
        parsed.push(p);
      }
    }
  }
  const byId = new Map(parsed.map((l) => [l.id, l] as const));
  for (const id of SCENE_STACK_LAYER_IDS) {
    if (!byId.has(id)) {
      const d = defaultForLayerId(
        id,
        DEFAULT_STACK.find((s) => s.id === id)!.order,
        layerFallbacks,
      );
      byId.set(id, d);
    }
  }
  const mergedKnownRows: SceneLayerInstance[] = SCENE_STACK_LAYER_IDS.map((id) => {
    const got = byId.get(id);
    if (got) {
      return { ...got, opacity: got.opacity ?? 1 };
    }
    return defaultForLayerId(id, DEFAULT_STACK.find((s) => s.id === id)!.order, layerFallbacks);
  });
  const knownIds = new Set<string>(SCENE_STACK_LAYER_IDS);
  const mergedAdditionalRows: SceneLayerInstance[] = parsed
    .filter((row) => !knownIds.has(row.id))
    .map((row) => ({ ...row, opacity: row.opacity ?? 1 }));
  const merged: SceneLayerInstance[] = [...mergedKnownRows, ...mergedAdditionalRows];
  const metadata = isPlainObject(input.metadata) ? { ...input.metadata } : undefined;
  const illumination = normalizeSceneIlluminationInput(input);
  const overlayReadability = normalizeSceneOverlayReadabilityInput(input);
  return {
    version: 1,
    projectionId,
    viewMode,
    orderingMode,
    baseMap: { ...baseMap, opacity: baseMap.opacity ?? 1 },
    layers: merged,
    illumination,
    overlayReadability,
    ...(metadata ? { metadata } : {}),
  };
}

