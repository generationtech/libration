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
 * Local persistence for the working LibrationConfigV2 document (Phase 4).
 * Render-engine agnostic: only the durable v2 JSON shape is stored.
 */
import type { DisplayTimeConfig, LayerEnableFlags } from "../appConfig";
import type { LibrationConfigV2 } from "./librationConfig";
import type { SceneConfig } from "./sceneConfig";
import {
  normalizeData,
  normalizeDisplayChromeLayout,
  normalizeGeography,
  normalizeLibrationConfig,
  normalizePinPresentation,
} from "./librationConfig";

/** Storage key for the working v2 document; `v1` is the on-disk envelope revision. */
export const WORKING_V2_LOCAL_STORAGE_KEY = "libration.workingConfigV2.v1";

const LAYER_KEYS: (keyof LayerEnableFlags)[] = [
  "baseMap",
  "solarShading",
  "grid",
  "cityPins",
  "subsolarMarker",
  "sublunarMarker",
];

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isValidLayerEnableFlags(x: unknown): x is LayerEnableFlags {
  if (!isPlainObject(x)) {
    return false;
  }
  return LAYER_KEYS.every((k) => typeof x[k] === "boolean");
}

function validateDisplayTime(dt: unknown): DisplayTimeConfig | null {
  if (!isPlainObject(dt)) {
    return null;
  }
  const mode = dt.topBandMode;
  if (mode !== "local12" && mode !== "local24" && mode !== "utc24") {
    return null;
  }
  const tz = dt.referenceTimeZone;
  if (!isPlainObject(tz)) {
    return null;
  }
  let referenceTimeZone: DisplayTimeConfig["referenceTimeZone"];
  if (tz.source === "system") {
    referenceTimeZone = { source: "system" };
  } else if (tz.source === "fixed" && typeof tz.timeZone === "string") {
    referenceTimeZone = { source: "fixed", timeZone: tz.timeZone };
  } else {
    return null;
  }
  const anchorRaw = dt.topBandAnchor;
  if (!isPlainObject(anchorRaw)) {
    return null;
  }
  const am = anchorRaw.mode;
  let topBandAnchor: DisplayTimeConfig["topBandAnchor"];
  if (am === "auto") {
    topBandAnchor = { mode: "auto" };
  } else if (am === "fixedLongitude") {
    const lon = anchorRaw.longitudeDeg;
    if (typeof lon !== "number" || !Number.isFinite(lon)) {
      return null;
    }
    topBandAnchor = { mode: "fixedLongitude", longitudeDeg: lon };
  } else if (am === "fixedCity") {
    if (typeof anchorRaw.cityId !== "string") {
      return null;
    }
    topBandAnchor = { mode: "fixedCity", cityId: anchorRaw.cityId };
  } else {
    return null;
  }
  return {
    referenceTimeZone,
    topBandMode: mode,
    topBandAnchor,
  };
}

/**
 * Revives a parsed JSON value into a normalized v2 document, or null if unsafe / invalid.
 * Preserves Phase 0 domain layout; stub domains are filled by {@link normalizeLibrationConfig}.
 */
export function reviveLibrationConfigV2FromUnknown(parsed: unknown): LibrationConfigV2 | null {
  if (!isPlainObject(parsed)) {
    return null;
  }
  const meta = parsed.meta;
  if (!isPlainObject(meta) || meta.schemaVersion !== 2) {
    return null;
  }
  if (!isValidLayerEnableFlags(parsed.layers)) {
    return null;
  }
  const pins = parsed.pins;
  if (!isPlainObject(pins)) {
    return null;
  }
  const ref = pins.reference;
  if (!isPlainObject(ref) || !Array.isArray(ref.visibleCityIds)) {
    return null;
  }
  if (!ref.visibleCityIds.every((id: unknown) => typeof id === "string")) {
    return null;
  }
  if (!Array.isArray(pins.custom)) {
    return null;
  }
  const chrome = parsed.chrome;
  if (!isPlainObject(chrome)) {
    return null;
  }
  const displayTime = validateDisplayTime(chrome.displayTime);
  if (!displayTime) {
    return null;
  }
  if (!isPlainObject(parsed.geography) || parsed.geography === null) {
    return null;
  }
  if (!isPlainObject(parsed.data) || parsed.data === null) {
    return null;
  }

  try {
    const rawScene: SceneConfig | undefined = isPlainObject(
      (parsed as { scene?: unknown }).scene,
    )
      ? ((parsed as { scene: unknown }).scene as SceneConfig)
      : undefined;
    const candidate: LibrationConfigV2 = {
      meta: { ...meta, schemaVersion: 2 },
      layers: parsed.layers,
      scene: rawScene,
      pins: {
        reference: {
          visibleCityIds: [...ref.visibleCityIds],
        },
        custom: [...pins.custom],
        presentation: normalizePinPresentation(
          isPlainObject(pins.presentation) ? pins.presentation : {},
        ),
      },
      chrome: {
        displayTime,
        layout: normalizeDisplayChromeLayout(
          isPlainObject(chrome.layout) ? chrome.layout : {},
        ),
      },
      geography: normalizeGeography(parsed.geography),
      data: normalizeData(parsed.data),
    };
    return normalizeLibrationConfig(candidate);
  } catch {
    return null;
  }
}

export function getLocalStorageIfAvailable(): Storage | null {
  try {
    if (typeof globalThis === "undefined") {
      return null;
    }
    const ls = globalThis.localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

export function loadPersistedWorkingV2(storage: Storage): LibrationConfigV2 | null {
  let raw: string | null;
  try {
    raw = storage.getItem(WORKING_V2_LOCAL_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null || raw === "") {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  return reviveLibrationConfigV2FromUnknown(parsed);
}

export function persistWorkingV2(storage: Storage | null, doc: LibrationConfigV2): void {
  if (!storage) {
    return;
  }
  const normalized = normalizeLibrationConfig(doc);
  try {
    storage.setItem(WORKING_V2_LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Quota, private mode, or disabled storage
  }
}

/**
 * Startup seed: load validated v2 from storage, or normalize the fallback builder result.
 */
export function resolveStartupWorkingV2(
  storage: Storage | null,
  buildFallback: () => LibrationConfigV2,
): LibrationConfigV2 {
  const fallback = (): LibrationConfigV2 => normalizeLibrationConfig(buildFallback());
  if (!storage) {
    return fallback();
  }
  const loaded = loadPersistedWorkingV2(storage);
  return loaded ?? fallback();
}
