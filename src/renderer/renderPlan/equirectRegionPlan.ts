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

import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import type { EquirectRegionOverlayPayload } from "../../layers/equirectRegionPayload";
import { createDescriptorPathItem } from "./pathItemFactories";
import type { RenderPlan } from "./renderPlanTypes";
import { equirectPolylineToPathDescriptors, equirectRingToPathDescriptors } from "./equirectSeamRegion";

export interface EquirectRegionOverlayPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  layerOpacity: number;
  payload: EquirectRegionOverlayPayload;
}

function scaleRgba(css: string, opacity: number): string {
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/.exec(css);
  if (!m) {
    return css;
  }
  const a = Number(m[4]) * opacity;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${Math.max(0, Math.min(1, a)).toFixed(4)})`;
}

export function buildEquirectRegionOverlayRenderPlan(
  options: EquirectRegionOverlayPlanOptions,
): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (w <= 0 || h <= 0) {
    return { items: [] };
  }
  const veil = effectiveOverlayReadabilityLiftVeil01(
    options.payload.readability?.nightVeil01,
    options.payload.readability?.overlayReadabilityLiftScale01,
  );
  const op = options.layerOpacity * (0.82 + 0.18 * veil);
  const items: RenderPlan["items"] = [];
  for (const fill of options.payload.fills) {
    const color = scaleRgba(fill.fill, op);
    for (const pathDescriptor of equirectRingToPathDescriptors(fill.ring, w, h)) {
      items.push(createDescriptorPathItem({ pathDescriptor, fill: color }));
    }
  }
  for (const stroke of options.payload.strokes) {
    const color = scaleRgba(stroke.stroke, Math.min(1, op + 0.08));
    const width = stroke.strokeWidthPx * (1 + 0.25 * veil);
    for (const pathDescriptor of equirectPolylineToPathDescriptors(stroke.points, w, h)) {
      items.push(
        createDescriptorPathItem({
          pathDescriptor,
          stroke: color,
          strokeWidthPx: width,
        }),
      );
    }
  }
  return { items };
}
