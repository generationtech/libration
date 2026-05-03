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

import type { RefObject } from "react";
import { createLayerRegistryFromConfig } from "./bootstrap";
import type { AppConfig, CustomPinConfig, LayerEnableFlags } from "../config/appConfig";
import { resolveDefaultProductTextFontAssetId } from "../config/productTextFont";
import type { LibrationConfigV2 } from "../config/v2/librationConfig";
import {
  DEFAULT_BASE_MAP_PRESENTATION,
  baseMapPresentationEqual,
} from "../config/baseMapPresentation";
import type { SceneConfig, SceneLayerInstance } from "../config/v2/sceneConfig";
import {
  normalizeLibrationConfig,
  v2ToAppConfig,
} from "../config/v2/librationConfig";
import {
  getLocalStorageIfAvailable,
  persistWorkingV2,
} from "../config/v2/workingV2Persistence";
import type { LayerRegistry } from "../layers/LayerRegistry";

const LAYER_FLAG_KEYS: (keyof LayerEnableFlags)[] = [
  "baseMap",
  "solarShading",
  "grid",
  "staticEquirectOverlay",
  "cityPins",
  "subsolarMarker",
  "sublunarMarker",
  "solarAnalemma",
];

function layerEnableFlagsEqual(a: LayerEnableFlags, b: LayerEnableFlags): boolean {
  return LAYER_FLAG_KEYS.every((k) => a[k] === b[k]);
}

/** Order-independent comparison; matches how pin resolution uses the id set. */
function visibleCityIdsSetEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((id, i) => id === sb[i]);
}

function customPinsEqual(a: readonly CustomPinConfig[], b: readonly CustomPinConfig[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.id !== y.id ||
      x.label !== y.label ||
      x.latitude !== y.latitude ||
      x.longitude !== y.longitude ||
      x.enabled !== y.enabled
    ) {
      return false;
    }
  }
  return true;
}

function pinPresentationEqual(
  a: AppConfig["pinPresentation"],
  b: AppConfig["pinPresentation"],
): boolean {
  return (
    a.showLabels === b.showLabels &&
    a.labelMode === b.labelMode &&
    a.scale === b.scale &&
    a.pinCityNameFontAssetId === b.pinCityNameFontAssetId &&
    a.pinDateTimeFontAssetId === b.pinDateTimeFontAssetId &&
    a.pinDateTimeDisplayMode === b.pinDateTimeDisplayMode
  );
}

function shallowRecordEqual(a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined): boolean {
  const aKeys = Object.keys(a ?? {});
  const bKeys = Object.keys(b ?? {});
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (const key of aKeys) {
    if (!Object.is(a?.[key], b?.[key])) {
      return false;
    }
  }
  return true;
}

function sceneLayerSourceEqual(a: SceneLayerInstance["source"], b: SceneLayerInstance["source"]): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "derived" && b.kind === "derived") {
    return (
      a.product === b.product &&
      shallowRecordEqual(a.parameters, b.parameters) &&
      shallowRecordEqual(a.metadata, b.metadata)
    );
  }
  if (a.kind === "staticRaster" && b.kind === "staticRaster") {
    return a.src === b.src && shallowRecordEqual(a.metadata, b.metadata);
  }
  if (a.kind === "custom" && b.kind === "custom") {
    return shallowRecordEqual(a.config, b.config);
  }
  return false;
}

function sceneLayersRuntimeEqual(a: readonly SceneLayerInstance[], b: readonly SceneLayerInstance[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.id !== y.id ||
      x.enabled !== y.enabled ||
      x.order !== y.order ||
      (x.opacity ?? 1) !== (y.opacity ?? 1) ||
      !sceneLayerSourceEqual(x.source, y.source)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Scene is authoritative for runtime composition and overlay construction.
 * Legacy `layers` flags remain as transitional compatibility, but scene deltas
 * are the primary trigger surface for registry rebuilds.
 */
function sceneRuntimeAffectingEqual(a: SceneConfig, b: SceneConfig): boolean {
  return (
    a.projectionId === b.projectionId &&
    a.viewMode === b.viewMode &&
    a.orderingMode === b.orderingMode &&
    a.baseMap.id === b.baseMap.id &&
    a.baseMap.visible === b.baseMap.visible &&
    (a.baseMap.opacity ?? 1) === (b.baseMap.opacity ?? 1) &&
    a.baseMap.styleVariant === b.baseMap.styleVariant &&
    baseMapPresentationEqual(
      a.baseMap.presentation ?? { ...DEFAULT_BASE_MAP_PRESENTATION },
      b.baseMap.presentation ?? { ...DEFAULT_BASE_MAP_PRESENTATION },
    ) &&
    a.illumination.moonlight.mode === b.illumination.moonlight.mode &&
    a.illumination.emissiveNightLights.mode === b.illumination.emissiveNightLights.mode &&
    a.illumination.emissiveNightLights.assetId === b.illumination.emissiveNightLights.assetId &&
    sceneLayersRuntimeEqual(a.layers, b.layers)
  );
}

/** Derives runtime {@link AppConfig} from a normalized v2 document. */
export function deriveAppConfigFromV2(v2: LibrationConfigV2): AppConfig {
  return v2ToAppConfig(v2);
}

function applyCommittedWorkingV2(
  workingV2Ref: RefObject<LibrationConfigV2 | null>,
  derivedAppConfigRef: RefObject<AppConfig>,
  registryRef: RefObject<LayerRegistry>,
  next: LibrationConfigV2,
): void {
  workingV2Ref.current = next;

  const prevDerived = derivedAppConfigRef.current;
  const nextDerived = deriveAppConfigFromV2(next);
  derivedAppConfigRef.current = nextDerived;

  const pinPresentationChanged = !pinPresentationEqual(
    prevDerived.pinPresentation,
    nextDerived.pinPresentation,
  );
  /** City pins layer reads presentation at construction; rebuild only when that layer can be registered. */
  const pinPresentationRequiresRegistry =
    pinPresentationChanged && (prevDerived.layers.cityPins || nextDerived.layers.cityPins);

  const productDefaultFontChanged =
    resolveDefaultProductTextFontAssetId(prevDerived.displayChromeLayout) !==
    resolveDefaultProductTextFontAssetId(nextDerived.displayChromeLayout);
  const cityPinsFontRequiresRegistry =
    productDefaultFontChanged && (prevDerived.layers.cityPins || nextDerived.layers.cityPins);

  /** City pins layer captures hour-label policy at construction; rebuild when it changes. */
  const cityPinsHourLabelPolicyChanged =
    prevDerived.displayTime.topBandMode !== nextDerived.displayTime.topBandMode;
  const cityPinsHourLabelRequiresRegistry =
    cityPinsHourLabelPolicyChanged && (prevDerived.layers.cityPins || nextDerived.layers.cityPins);
  const sceneRuntimeChanged = !sceneRuntimeAffectingEqual(prevDerived.scene, nextDerived.scene);

  if (
    sceneRuntimeChanged ||
    !layerEnableFlagsEqual(prevDerived.layers, nextDerived.layers) ||
    !visibleCityIdsSetEqual(prevDerived.visibleCityIds, nextDerived.visibleCityIds) ||
    !customPinsEqual(prevDerived.customPins, nextDerived.customPins) ||
    pinPresentationRequiresRegistry ||
    cityPinsFontRequiresRegistry ||
    cityPinsHourLabelRequiresRegistry
  ) {
    registryRef.current = createLayerRegistryFromConfig(nextDerived);
  }

  persistWorkingV2(getLocalStorageIfAvailable(), next);
}

/**
 * Applies an in-place-style updater to a clone of the working v2 ref, re-normalizes,
 * updates derived AppConfig, and rebuilds the layer registry when scene runtime composition
 * changes (authoritative), or when transitional compatibility predicates (legacy flags/pins)
 * indicate constructor-level layer input changes.
 */
export function commitWorkingV2Update(
  workingV2Ref: RefObject<LibrationConfigV2 | null>,
  derivedAppConfigRef: RefObject<AppConfig>,
  registryRef: RefObject<LayerRegistry>,
  updater: (draft: LibrationConfigV2) => void,
): void {
  const prev = workingV2Ref.current;
  if (!prev) {
    return;
  }

  const draft = normalizeLibrationConfig(prev);
  updater(draft);
  const next = normalizeLibrationConfig(draft);
  applyCommittedWorkingV2(workingV2Ref, derivedAppConfigRef, registryRef, next);
}

/**
 * Replaces the working v2 document with a normalized snapshot (e.g. user preset load).
 * Same derived-config, registry, and working persistence path as {@link commitWorkingV2Update}.
 */
export function replaceWorkingV2FromSnapshot(
  workingV2Ref: RefObject<LibrationConfigV2 | null>,
  derivedAppConfigRef: RefObject<AppConfig>,
  registryRef: RefObject<LayerRegistry>,
  snapshot: LibrationConfigV2,
): void {
  if (!workingV2Ref.current) {
    return;
  }
  const next = normalizeLibrationConfig(snapshot);
  applyCommittedWorkingV2(workingV2Ref, derivedAppConfigRef, registryRef, next);
}
