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
 * Canonical internal vertical model for one hour-marker **content row** inside the circle-band disk strip
 * (the `diskBandH` slice from {@link TopBandCircleStackLayoutInput}).
 *
 * Renderer- and realization-agnostic: no Canvas types. Callers supply intrinsic height (measured text ink,
 * typography line box, or glyph head-disk diameter) and in-row padding; this module derives allocated height and the
 * content center measured from the top of that row.
 *
 * Omitted padding defaults live in {@link defaultHourMarkerContentRowPaddingPx} / {@link resolveHourMarkerContentRowPaddingPx},
 * proportional to intrinsic height for the 24-hour indicator row.
 */

import type { EffectiveTopBandHourMarkerLayout } from "./topBandHourMarkersTypes.ts";

/** Legacy vertical nudge applied to the hour-disk numeral/glyph center vs the geometric midline of the head disk. */
export const HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_CAP_PX = 0.55 as const;
export const HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_FRAC_OF_HEAD_D = 0.035 as const;

/** Authoring bounds for persisted {@link HourMarkersConfig.layout} content-row padding (px). Bottom may be negative to match legacy tight disk rows. */
export const HOUR_MARKER_CONTENT_ROW_PADDING_MIN_PX = -24 as const;
export const HOUR_MARKER_CONTENT_ROW_PADDING_MAX_PX = 48 as const;

export function clampHourMarkerContentRowPaddingPx(n: number): number {
  return Math.max(
    HOUR_MARKER_CONTENT_ROW_PADDING_MIN_PX,
    Math.min(HOUR_MARKER_CONTENT_ROW_PADDING_MAX_PX, n),
  );
}

/**
 * Auto (omitted) padding: each side is this fraction of {@link intrinsicContentHeightPx}, clamped to authoring bounds.
 * Tighter than the legacy slack-to-fixed-disk policy so the 24-hour indicator row tracks content height.
 */
export const HOUR_MARKER_AUTO_CONTENT_ROW_PADDING_FRAC_OF_INTRINSIC_PER_SIDE = 0.1 as const;

function autoContentRowPaddingOneSidePx(intrinsicContentHeightPx: number): number {
  const h = intrinsicContentHeightPx;
  return clampHourMarkerContentRowPaddingPx(h * HOUR_MARKER_AUTO_CONTENT_ROW_PADDING_FRAC_OF_INTRINSIC_PER_SIDE);
}

/**
 * Canonical default when **both** `contentPaddingTopPx` and `contentPaddingBottomPx` are omitted from config:
 * symmetric padding proportional to intrinsic content height (not tied to a pre-solved disk strip height).
 */
export function defaultHourMarkerContentRowPaddingPx(args: {
  intrinsicContentHeightPx: number;
}): { contentPaddingTopPx: number; contentPaddingBottomPx: number } {
  const p = autoContentRowPaddingOneSidePx(args.intrinsicContentHeightPx);
  return {
    contentPaddingTopPx: p,
    contentPaddingBottomPx: p,
  };
}

/**
 * Resolves final top/bottom content-row padding for {@link computeHourMarkerContentRowVerticalMetrics}.
 * When **both** sides are explicit in config, each side is clamped to authoring bounds only (sum is unconstrained).
 * When a side is omitted (Auto), that side uses {@link HOUR_MARKER_AUTO_CONTENT_ROW_PADDING_FRAC_OF_INTRINSIC_PER_SIDE}
 * of the current intrinsic height — not a fixed disk-band slack — so row height is intrinsic + resolved padding.
 */
export function resolveHourMarkerContentRowPaddingPx(args: {
  layout: EffectiveTopBandHourMarkerLayout;
  intrinsicContentHeightPx: number;
}): { contentPaddingTopPx: number; contentPaddingBottomPx: number } {
  const h = args.intrinsicContentHeightPx;
  const layout = args.layout;
  const hasTop = layout.contentPaddingTopPx !== undefined;
  const hasBottom = layout.contentPaddingBottomPx !== undefined;

  if (hasTop && hasBottom) {
    return {
      contentPaddingTopPx: clampHourMarkerContentRowPaddingPx(layout.contentPaddingTopPx!),
      contentPaddingBottomPx: clampHourMarkerContentRowPaddingPx(layout.contentPaddingBottomPx!),
    };
  }

  if (!hasTop && !hasBottom) {
    return defaultHourMarkerContentRowPaddingPx({ intrinsicContentHeightPx: h });
  }

  if (hasTop && !hasBottom) {
    const pt = clampHourMarkerContentRowPaddingPx(layout.contentPaddingTopPx!);
    const pb = autoContentRowPaddingOneSidePx(h);
    return {
      contentPaddingTopPx: pt,
      contentPaddingBottomPx: pb,
    };
  }

  const pb = clampHourMarkerContentRowPaddingPx(layout.contentPaddingBottomPx!);
  const pt = autoContentRowPaddingOneSidePx(h);
  return {
    contentPaddingTopPx: pt,
    contentPaddingBottomPx: pb,
  };
}

export type HourMarkerContentRowVerticalMetrics = {
  /** Height of the hour-marker content (text intrinsic / line box, procedural glyph box, or head-disk diameter for glyphs). */
  intrinsicContentHeightPx: number;
  contentPaddingTopPx: number;
  contentPaddingBottomPx: number;
  /** Height of the full content row; equals intrinsic + top + bottom padding when the model is consistent. */
  allocatedContentRowHeightPx: number;
  /** Y of the layout/emission center for the marker, measured from the top of the content row. */
  contentCenterYFromRowTopPx: number;
};

export type ComputeHourMarkerContentRowVerticalMetricsArgs = {
  intrinsicContentHeightPx: number;
  contentPaddingTopPx: number;
  contentPaddingBottomPx: number;
  /**
   * Optional offset from the geometric center of the intrinsic box (positive moves the emission center downward).
   * Used for the legacy hour-disk numeral tweak (see {@link HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_CAP_PX}).
   */
  contentCenterYOffsetFromIntrinsicMidPx?: number;
};

/**
 * Single shared row math: padding boxes intrinsic content; row height is the sum; center is intrinsic midline
 * plus optional offset (legacy numeral tweak).
 */
export function computeHourMarkerContentRowVerticalMetrics(
  args: ComputeHourMarkerContentRowVerticalMetricsArgs,
): HourMarkerContentRowVerticalMetrics {
  const h = args.intrinsicContentHeightPx;
  const pt = args.contentPaddingTopPx;
  const pb = args.contentPaddingBottomPx;
  const yOff = args.contentCenterYOffsetFromIntrinsicMidPx ?? 0;
  const allocated = pt + h + pb;
  return {
    intrinsicContentHeightPx: h,
    contentPaddingTopPx: pt,
    contentPaddingBottomPx: pb,
    allocatedContentRowHeightPx: allocated,
    contentCenterYFromRowTopPx: pt + h * 0.5 + yOff,
  };
}

/**
 * Intrinsic height for the disk **row** for **glyph** realizations: the fitted head diameter from
 * {@link hourCircleHeadMetrics}. Text hour markers use typography / measured ink via
 * {@link ../topBandHourMarkerTextIntrinsicHeight.ts} instead.
 */
export function resolveHourMarkerDiskRowIntrinsicContentHeightPx(args: { headDiameterPx: number }): number {
  return args.headDiameterPx;
}
