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
 * Per base-map-family visual tuning. Applies to the whole family (including all month rasters
 * for month-aware maps); does not change assets, projection, or layer semantics.
 */

import type { BaseMapCatalogEntry } from "./baseMapCatalog";

export type BaseMapPresentationConfig = {
  brightness: number;
  contrast: number;
  /**
   * Per-RGB power-curve display adjustment. Omitted from `baseMapPresentationToCssFilterString`;
   * the canvas base-map `imageBlit` applies it when γ ≠ 1 (see `applyBaseMapGammaToRgba8`).
   */
  gamma: number;
  saturation: number;
};

export type BaseMapPresentationByMapId = Record<string, BaseMapPresentationConfig>;

export const DEFAULT_BASE_MAP_PRESENTATION: BaseMapPresentationConfig = {
  brightness: 1,
  contrast: 1,
  gamma: 1,
  saturation: 1,
};

const B_MIN = 0.5;
const B_MAX = 2.0;
const C_MIN = 0.5;
const C_MAX = 2.0;
const G_MIN = 0.5;
const G_MAX = 2.5;
const S_MIN = 0.0;
const S_MAX = 2.0;
const O_MIN = 0;
const O_MAX = 1;

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function normalizedMapIdOrNull(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const id = raw.trim();
  return id === "" ? null : id;
}

function clamp(p: number, lo: number, hi: number): number {
  if (!Number.isFinite(p)) {
    return lo;
  }
  return Math.max(lo, Math.min(hi, p));
}

/**
 * Clamps `scene.baseMap.opacity` / catalog default to [0, 1].
 * Exported for tests and {@link resolveEffectiveBaseMapPresentation}.
 */
export function clampBaseMapOpacity(n: unknown, fallback: number = 1): number {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    if (typeof fallback === "number" && Number.isFinite(fallback)) {
      return Math.max(O_MIN, Math.min(O_MAX, fallback));
    }
    return 1;
  }
  return Math.max(O_MIN, Math.min(O_MAX, n));
}

function numOr(
  v: unknown,
  fallback: number,
  lo: number,
  hi: number,
): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return clamp(v, lo, hi);
  }
  return fallback;
}

/**
 * Coerces partial/unknown persisted `scene.baseMap.presentation` into a clamped shape.
 * Defaults match prior behavior (no net color change).
 */
export function normalizeBaseMapPresentation(input: unknown): BaseMapPresentationConfig {
  if (!isPlainObject(input)) {
    return { ...DEFAULT_BASE_MAP_PRESENTATION };
  }
  return {
    brightness: numOr(input.brightness, DEFAULT_BASE_MAP_PRESENTATION.brightness, B_MIN, B_MAX),
    contrast: numOr(input.contrast, DEFAULT_BASE_MAP_PRESENTATION.contrast, C_MIN, C_MAX),
    gamma: numOr(input.gamma, DEFAULT_BASE_MAP_PRESENTATION.gamma, G_MIN, G_MAX),
    saturation: numOr(
      input.saturation,
      DEFAULT_BASE_MAP_PRESENTATION.saturation,
      S_MIN,
      S_MAX,
    ),
  };
}

/**
 * Normalizes persisted per-family presentation map.
 * Invalid keys are dropped; each entry is clamped via {@link normalizeBaseMapPresentation}.
 */
export function normalizeBaseMapPresentationByMapId(input: unknown): BaseMapPresentationByMapId {
  if (!isPlainObject(input)) {
    return {};
  }
  const out: BaseMapPresentationByMapId = {};
  for (const [rawId, rawPresentation] of Object.entries(input)) {
    const id = normalizedMapIdOrNull(rawId);
    if (id === null) {
      continue;
    }
    out[id] = normalizeBaseMapPresentation(rawPresentation);
  }
  return out;
}

/**
 * Returns normalized presentation for a base-map family id, preferring `presentationByMapId`.
 * Falls back to legacy `scene.baseMap.presentation`, then defaults.
 */
export function getBaseMapPresentationForMapId(
  mapId: string,
  presentationByMapId: unknown,
  legacyPresentation?: unknown,
): BaseMapPresentationConfig {
  const id = normalizedMapIdOrNull(mapId);
  const byMapId = normalizeBaseMapPresentationByMapId(presentationByMapId);
  if (id !== null && Object.prototype.hasOwnProperty.call(byMapId, id)) {
    return byMapId[id]!;
  }
  if (legacyPresentation !== undefined) {
    return normalizeBaseMapPresentation(legacyPresentation);
  }
  return { ...DEFAULT_BASE_MAP_PRESENTATION };
}

/**
 * Returns a normalized map-id presentation record with the given family id updated.
 */
export function setBaseMapPresentationForMapId(
  presentationByMapId: unknown,
  mapId: string,
  presentation: unknown,
): BaseMapPresentationByMapId {
  const next = normalizeBaseMapPresentationByMapId(presentationByMapId);
  const id = normalizedMapIdOrNull(mapId);
  if (id === null) {
    return next;
  }
  next[id] = normalizeBaseMapPresentation(presentation);
  return next;
}

export function baseMapPresentationEqual(
  a: BaseMapPresentationConfig,
  b: BaseMapPresentationConfig,
): boolean {
  return (
    a.brightness === b.brightness &&
    a.contrast === b.contrast &&
    a.gamma === b.gamma &&
    a.saturation === b.saturation
  );
}

/**
 * Encodes brightness, contrast, and saturation as a Canvas/CSS `filter` string.
 *
 * **Gamma is omitted** here: it is applied in the base-map `imageBlit` path via
 * `getGammaAdjustedCanvasForImage` (pixel pass), not as a CSS filter.
 */
/**
 * Merges {@link BaseMapCatalogEntry.defaultPresentation} with `scene.baseMap` (opacity and presentation),
 * then clamps with {@link normalizeBaseMapPresentation} so catalog and SceneConfig both contribute deterministically.
 */
export function resolveEffectiveBaseMapPresentation(
  catalogEntry: BaseMapCatalogEntry | null | undefined,
  sceneBaseMap: {
    id?: string;
    opacity?: number;
    presentation?: BaseMapPresentationConfig | unknown;
    presentationByMapId?: BaseMapPresentationByMapId | unknown;
  },
): { opacity: number } & BaseMapPresentationConfig {
  const d = catalogEntry?.defaultPresentation;
  const catalogSeed = {
    ...DEFAULT_BASE_MAP_PRESENTATION,
    brightness: d?.brightness ?? DEFAULT_BASE_MAP_PRESENTATION.brightness,
    contrast: d?.contrast ?? DEFAULT_BASE_MAP_PRESENTATION.contrast,
    gamma: d?.gamma ?? DEFAULT_BASE_MAP_PRESENTATION.gamma,
    saturation: d?.saturation ?? DEFAULT_BASE_MAP_PRESENTATION.saturation,
  };
  const pRaw = getBaseMapPresentationForMapId(
    sceneBaseMap.id ?? "",
    sceneBaseMap.presentationByMapId,
    sceneBaseMap.presentation,
  );
  const scenePart = isPlainObject(pRaw)
    ? (Object.fromEntries(
        Object.entries(pRaw).filter(([, v]) => v !== undefined),
      ) as Record<string, unknown>)
    : {};
  const presentation = normalizeBaseMapPresentation({ ...catalogSeed, ...scenePart });
  const opacity = clampBaseMapOpacity(sceneBaseMap.opacity, d?.opacity ?? 1);
  return { ...presentation, opacity };
}

export function baseMapPresentationToCssFilterString(
  p: BaseMapPresentationConfig,
): string | undefined {
  const { brightness, contrast, gamma: _g, saturation } = p;
  if (
    brightness === DEFAULT_BASE_MAP_PRESENTATION.brightness &&
    contrast === DEFAULT_BASE_MAP_PRESENTATION.contrast &&
    saturation === DEFAULT_BASE_MAP_PRESENTATION.saturation
  ) {
    return undefined;
  }
  const parts: string[] = [];
  if (brightness !== DEFAULT_BASE_MAP_PRESENTATION.brightness) {
    parts.push(`brightness(${brightness})`);
  }
  if (contrast !== DEFAULT_BASE_MAP_PRESENTATION.contrast) {
    parts.push(`contrast(${contrast})`);
  }
  if (saturation !== DEFAULT_BASE_MAP_PRESENTATION.saturation) {
    parts.push(`saturate(${saturation})`);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}
