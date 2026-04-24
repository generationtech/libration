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
}): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (w <= 0 || h <= 0) {
    return { items: [] };
  }
  const cssFilter =
    options.presentation !== undefined
      ? baseMapPresentationToCssFilterString(options.presentation)
      : undefined;
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
      },
    ],
  };
}
