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
 * See `docs/specs/scene/scene-config-v1.md` — this module implements the minimal runtime subset.
 */
import type { LayerEnableFlags } from "../appConfig";
import {
  BASE_MAP_OPTION_CATEGORY_ORDER,
  DEFAULT_EQUIRECT_BASE_MAP_ID as DEFAULT_EQUIRECT_BASE_MAP_ID_VALUE,
  EQUIRECT_BASE_MAP_OPTIONS,
  calendarMonthUtc1To12FromUnixMs,
  canonicalEquirectBaseMapIdForPersistence,
  getEquirectBaseMapOptionForId,
  resolveEquirectBaseMapAsset,
  resolveEquirectBaseMapImageSrc,
  SUPPORTED_EQUIRECT_BASE_MAP_IDS,
} from "../baseMapAssetResolve";
import type { BaseMapOption, BaseMapResolveContext } from "../baseMapAssetResolve";
import {
  type BaseMapPresentationConfig,
  DEFAULT_BASE_MAP_PRESENTATION,
  normalizeBaseMapPresentation,
} from "../baseMapPresentation";

export type { BaseMapOption, BaseMapResolveContext };
export {
  BASE_MAP_OPTION_CATEGORY_ORDER,
  EQUIRECT_BASE_MAP_OPTIONS,
  calendarMonthUtc1To12FromUnixMs,
  canonicalEquirectBaseMapIdForPersistence,
  getEquirectBaseMapOptionForId,
  resolveEquirectBaseMapImageSrc,
  resolveEquirectBaseMapAsset,
  SUPPORTED_EQUIRECT_BASE_MAP_IDS,
};
export { sortSceneLayersForRender, zIndexForSceneStackIndex } from "../sceneLayerOrder";
export {
  type BaseMapPresentationConfig,
  DEFAULT_BASE_MAP_PRESENTATION,
  baseMapPresentationEqual,
  baseMapPresentationToCssFilterString,
  normalizeBaseMapPresentation,
} from "../baseMapPresentation";
export {
  planSceneStackComposition,
  type SceneBaseMapCompositePart,
  type SceneOverlayCompositePart,
  type SceneStackCompositionPlan,
} from "../sceneStackComposition";

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

export type SceneConfig = {
  version: 1;
  projectionId: string;
  viewMode: SceneViewMode;
  baseMap: BaseMapConfig;
  layers: readonly SceneLayerInstance[];
  orderingMode: SceneOrderingMode;
  metadata?: Record<string, unknown>;
};

export const SCENE_STACK_LAYER_IDS = [
  "solarShading",
  "grid",
  "staticEquirectOverlay",
  "cityPins",
  "subsolarMarker",
  "sublunarMarker",
  "solarAnalemma",
] as const;

export type SceneStackLayerId = (typeof SCENE_STACK_LAYER_IDS)[number];

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function clampOpacity(n: number): number {
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(0, Math.min(1, n));
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

const SUBLUNAR: SceneLayerInstance = {
  id: "sublunarMarker",
  family: "astronomy",
  type: "astronomyVector",
  enabled: true,
  order: 5,
  source: { kind: "derived", product: "sublunarPoint" },
};

/** Phase 4: equation-of-time ground track; default off so the legacy stack is visually unchanged. */
const SOLAR_ANALEMMA_ROW: SceneLayerInstance = {
  id: "solarAnalemma",
  family: "astronomy",
  type: "astronomyVector",
  enabled: false,
  order: 6,
  source: { kind: "derived", product: "solarAnalemmaGroundTrack" },
};

const DEFAULT_STACK: readonly SceneLayerInstance[] = [
  SOLAR,
  GRID,
  STATIC_EQUIRECT,
  CITY,
  SUBSOLAR,
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
    case "sublunarMarker":
      return "sublunarMarker";
    case "staticEquirectOverlay":
      return "staticEquirectOverlay";
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
  };
}

export function deriveLayerEnableFlagsFromScene(scene: SceneConfig): LayerEnableFlags {
  const out: LayerEnableFlags = {
    baseMap: scene.baseMap.visible,
    solarShading: false,
    grid: false,
    staticEquirectOverlay: false,
    cityPins: false,
    subsolarMarker: false,
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
    },
    layers: scene.layers.map((L) => ({
      ...L,
      opacity: L.opacity,
      source: isPlainObject(L.source) ? ({ ...L.source } as LayerSourceConfig) : L.source,
      presentation: L.presentation ? { ...L.presentation } : undefined,
      metadata: L.metadata ? { ...L.metadata } : undefined,
    })),
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
  return {
    id,
    visible: vis,
    presentation,
    ...(opacity !== undefined ? { opacity } : { opacity: 1 }),
    ...(styleVariant !== undefined ? { styleVariant } : {}),
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
  } else if (isPlainObject(sRaw) && sRaw.kind === "custom") {
    source = { kind: "custom", config: isPlainObject(sRaw.config) ? { ...sRaw.config } : {} };
  } else {
    source = defaultSourceForLayerId(idNorm);
  }
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
  return {
    version: 1,
    projectionId,
    viewMode,
    orderingMode,
    baseMap: { ...baseMap, opacity: baseMap.opacity ?? 1 },
    layers: merged,
    ...(metadata ? { metadata } : {}),
  };
}

