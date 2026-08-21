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
 * Annotate a prepared earthquake point payload with a transient hover label.
 * Pure: no network, no config mutation.
 */

import { resolveEarthquakeHoverId } from "../core/earthquakeMarkerHover";
import type {
  DynamicPointFeatureMarker,
  DynamicPointFeaturesPayload,
} from "./dynamicPointFeaturesPayload";

export function applyEarthquakePointerHoverToPayload(
  payload: DynamicPointFeaturesPayload,
  options: {
    pointerSceneCss: { x: number; y: number } | null;
    viewportWidthPx: number;
    viewportHeightPx: number;
    showLabelOnHover: boolean;
  },
): DynamicPointFeaturesPayload {
  const hoveredId = resolveEarthquakeHoverId({
    features: payload.features,
    pointerSceneCss: options.pointerSceneCss,
    viewportWidthPx: options.viewportWidthPx,
    viewportHeightPx: options.viewportHeightPx,
    showLabelOnHover: options.showLabelOnHover,
  });

  let changed = false;
  const features: DynamicPointFeatureMarker[] = payload.features.map((feature) => {
    const persistent =
      feature.label !== undefined && feature.label.trim() !== "";
    const nextHover =
      hoveredId !== null &&
      feature.id === hoveredId &&
      !persistent &&
      feature.compactLabel !== undefined &&
      feature.compactLabel.trim() !== ""
        ? feature.compactLabel
        : undefined;
    if (feature.hoverLabel === nextHover) {
      return feature;
    }
    changed = true;
    if (nextHover === undefined) {
      if (feature.hoverLabel === undefined) {
        return feature;
      }
      const { hoverLabel: _removed, ...rest } = feature;
      return rest;
    }
    return { ...feature, hoverLabel: nextHover };
  });

  if (!changed) {
    return payload;
  }
  return { ...payload, features };
}
