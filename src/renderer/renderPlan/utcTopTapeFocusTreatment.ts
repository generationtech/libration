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

export const UTC_FOCUS_WINDOW_HOURS = 3;
export const UTC_FOCUS_ANNOTATION_TEXT = "UTC Global Time";
export const UTC_FOCUS_DEFAULT_CENTERED_ANNOTATION_SIDE = "right" as const;
export const UTC_FOCUS_ANNOTATION_HOUR_OFFSET = 2;
export const UTC_FOCUS_ANNOTATION_MIN_GAP_HOUR_SPACING_FRAC = 0.42;
export const UTC_FOCUS_ANNOTATION_MIN_GAP_LABEL_SIZE_FRAC = 0.72;
export const UTC_FOCUS_ANNOTATION_MIN_GAP_PX_FLOOR = 14;

export type UtcFocusAnnotationSide = "left" | "right";
export type HorizontalSpan = { minX: number; maxX: number };

export function utcFocusAnnotationSide(readPointX: number, viewportCenterX: number): UtcFocusAnnotationSide {
  if (readPointX < viewportCenterX) {
    return "right";
  }
  if (readPointX > viewportCenterX) {
    return "left";
  }
  return UTC_FOCUS_DEFAULT_CENTERED_ANNOTATION_SIDE;
}

export function clampUtcFocusAnnotationX(options: {
  preferredX: number;
  annotationSide: UtcFocusAnnotationSide;
  estimatedTextWidthPx: number;
  viewportWidthPx: number;
  marginPx: number;
}): number {
  const margin = Math.max(0, options.marginPx);
  const vw = Math.max(0, options.viewportWidthPx);
  const textWidth = Math.max(0, options.estimatedTextWidthPx);
  const half = textWidth * 0.5;
  const minCenter = margin + half;
  const maxCenter = Math.max(minCenter, vw - margin - half);
  const preferred = options.preferredX;
  if (options.annotationSide === "right") {
    return Math.min(maxCenter, Math.max(preferred, minCenter));
  }
  return Math.max(minCenter, Math.min(preferred, maxCenter));
}

export function utcFocusAnnotationMinGapPx(options: {
  hourSpacingPx: number;
  labelSizePx: number;
}): number {
  const spacingGap = Math.max(0, options.hourSpacingPx) * UTC_FOCUS_ANNOTATION_MIN_GAP_HOUR_SPACING_FRAC;
  const labelGap = Math.max(0, options.labelSizePx) * UTC_FOCUS_ANNOTATION_MIN_GAP_LABEL_SIZE_FRAC;
  return Math.max(UTC_FOCUS_ANNOTATION_MIN_GAP_PX_FLOOR, spacingGap, labelGap);
}

export function placeUtcFocusAnnotationXWithGap(options: {
  preferredX: number;
  annotationSide: UtcFocusAnnotationSide;
  annotationWidthPx: number;
  viewportWidthPx: number;
  marginPx: number;
  minGapPx: number;
  focusedHourClusterSpan: HorizontalSpan;
}): number {
  const half = Math.max(0, options.annotationWidthPx) * 0.5;
  const margin = Math.max(0, options.marginPx);
  const vw = Math.max(0, options.viewportWidthPx);
  const minCenter = margin + half;
  const maxCenter = Math.max(minCenter, vw - margin - half);
  const cluster = options.focusedHourClusterSpan;
  const minGap = Math.max(0, options.minGapPx);
  if (options.annotationSide === "right") {
    const minClearCenter = cluster.maxX + minGap + half;
    return Math.min(maxCenter, Math.max(options.preferredX, minCenter, minClearCenter));
  }
  const maxClearCenter = cluster.minX - minGap - half;
  return Math.max(minCenter, Math.min(options.preferredX, maxCenter, maxClearCenter));
}

export function utcFocusAnnotationCenterY(yDiskRow0: number, diskBandH: number): number {
  return yDiskRow0 + diskBandH * 0.5;
}

export function utcFocusAnnotationPreferredX(options: {
  focusedHourX: number;
  hourSpacingPx: number;
  annotationSide: UtcFocusAnnotationSide;
}): number {
  const spacing = Math.max(0, options.hourSpacingPx);
  const offsetPx = spacing * UTC_FOCUS_ANNOTATION_HOUR_OFFSET;
  if (options.annotationSide === "right") {
    return options.focusedHourX + offsetPx;
  }
  return options.focusedHourX - offsetPx;
}
