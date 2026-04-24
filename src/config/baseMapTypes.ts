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
 * User-facing option model for the base map selector (editor and scene-facing UI).
 * Paired 1:1 with equirectangular base map catalog entries.
 */
export type BaseMapOption = {
  id: string;
  label: string;
  shortDescription?: string;
  category: "reference" | "scientific" | "terrain" | "political";
  attribution?: string;
  previewThumbnailSrc?: string;
  transitionalPlaceholder?: boolean;
};

/** `"static"` uses one URL; `"monthOfYear"` picks a month file from the catalog. */
export type BaseMapVariantMode = "static" | "monthOfYear";

/**
 * Static equirectangular base-map record for `SceneConfig.baseMap.id` resolution.
 */
export type EquirectBaseMapAsset = {
  id: string;
  src: string;
  projectionId: "equirectangular";
  extent: { minLat: -90; maxLat: 90; minLon: -180; maxLon: 180 };
  orientation: "north-up";
  hasPadding: false;
  /**
   * Transitional: id is real and supported, but currently points at a placeholder
   * raster until a distinct production asset is onboarded.
   */
  transitionalPlaceholder?: true;
  /** When `"monthOfYear"`, `resolveEquirectBaseMapImageSrc` uses product month + explicit paths. */
  variantMode?: BaseMapVariantMode;
};

export type BaseMapResolveContext = Readonly<{
  productInstantMs: number;
  excludedImageSrcs?: ReadonlySet<string>;
}>;
