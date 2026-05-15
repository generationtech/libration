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
  type BaseMapPresentationConfig,
  baseMapPresentationToCssFilterString,
} from "../../config/baseMapPresentation";
import { mergeCssFilterParts, overlayReadabilityCssFilterAppend } from "../../core/overlayReadabilityRasterFilter";
import type { RenderPlan } from "./renderPlanTypes";

/**
 * Full-viewport equirectangular base map: placement and coverage are resolved here;
 * {@link executeRenderPlanOnCanvas} performs mechanical {@link imageBlit} once the backend
 * resolves the image.
 */
export function buildBaseRasterMapRenderPlan(options: {
  src: string;
  viewportWidthPx: number;
  viewportHeightPx: number;
  /** Family-level display tuning; same for every concrete month URL in a month-aware family. */
  presentation?: BaseMapPresentationConfig;
  /**
   * Optional derived solar night veil (0–1), aligned with planetary illumination; merged into
   * `cssFilter` for static overlay legibility on the night side.
   */
  readabilityNightVeil01?: number;
  /** Substrate-aware attenuation of readability css lift (0.35–1); defaults to 1. */
  overlayReadabilityLiftScale01?: number;
}): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (w <= 0 || h <= 0) {
    return { items: [] };
  }
  const pres = options.presentation;
  const presFilter =
    pres !== undefined ? baseMapPresentationToCssFilterString(pres) : undefined;
  const readFilter = overlayReadabilityCssFilterAppend(options.readabilityNightVeil01 ?? 0, {
    liftScale01: options.overlayReadabilityLiftScale01,
  });
  const cssFilter = mergeCssFilterParts(presFilter, readFilter);
  const gamma = pres !== undefined && pres.gamma !== 1 ? pres.gamma : undefined;
  return {
    items: [
      {
        kind: "imageBlit",
        src: options.src,
        x: 0,
        y: 0,
        width: w,
        height: h,
        ...(cssFilter !== undefined ? { cssFilter } : {}),
        ...(gamma !== undefined ? { gamma } : {}),
      },
    ],
  };
}
