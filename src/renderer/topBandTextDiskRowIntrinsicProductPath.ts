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
 * Single source for text hour-disk **intrinsic content height** on the product path: prefer Canvas ink measurement
 * when available, else typography — must match {@link solveCanonicalHourMarkerDiskBandHeightPx} and semantic layout.
 */

import type { EffectiveTopBandHourMarkerSelection } from "../config/appConfig.ts";
import {
  resolveTopBandHourMarkerTextIntrinsicContentHeightPxFromTypography,
  resolveTopBandHourMarkerTextResolvedStyleForLayout,
} from "../topBandHourMarkerTextIntrinsicHeight.ts";
import type { FontAssetRegistry } from "../typography/fontAssetRegistry.ts";
import {
  tryCreateOffscreenCanvas2dContext,
  tryMeasureMaxTopBandHourMarkerTextInkHeightPx,
} from "./topBandHourMarkerTextInkMeasure.ts";

export function resolveTopBandTextDiskRowIntrinsicContentHeightPxForProductPath(args: {
  fontRegistry: FontAssetRegistry;
  selection: EffectiveTopBandHourMarkerSelection;
  markerLayoutBoxSizePx: number;
  /** Same 24 labels used for layout (tape column hour strings); drives max ink height across the dial. */
  hourDiskLabelsWestToEast: readonly string[];
}): number {
  if (args.selection.kind !== "text") {
    throw new Error(
      "resolveTopBandTextDiskRowIntrinsicContentHeightPxForProductPath: expected text hour-marker selection",
    );
  }
  const resolvedStyle = resolveTopBandHourMarkerTextResolvedStyleForLayout({
    fontRegistry: args.fontRegistry,
    selection: args.selection,
    markerLayoutBoxSizePx: args.markerLayoutBoxSizePx,
  });
  const measureCtx = tryCreateOffscreenCanvas2dContext();
  const measured =
    measureCtx !== undefined
      ? tryMeasureMaxTopBandHourMarkerTextInkHeightPx({
          ctx: measureCtx,
          resolvedStyle,
          labels: args.hourDiskLabelsWestToEast,
        })
      : undefined;
  if (measured !== undefined && measured > 0) {
    return measured;
  }
  return resolveTopBandHourMarkerTextIntrinsicContentHeightPxFromTypography({
    fontRegistry: args.fontRegistry,
    selection: args.selection,
    markerLayoutBoxSizePx: args.markerLayoutBoxSizePx,
  });
}
