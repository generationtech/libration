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
export const UTC_FOCUS_HALF_WINDOW_HOURS = UTC_FOCUS_WINDOW_HOURS * 0.5;
export const UTC_FOCUS_FULL_VISIBILITY_HALF_HOURS = 1;
export const UTC_FOCUS_ANNOTATION_TEXT = "UTC Global Time";
export const UTC_FOCUS_DEFAULT_CENTERED_ANNOTATION_SIDE = "right" as const;
export const UTC_FOCUS_ANNOTATION_HOUR_OFFSET = 2;

export type UtcFocusAnnotationSide = "left" | "right";

export interface UtcFocusWindow {
  readPointX: number;
  hourSpacingPx: number;
  halfWindowPx: number;
  minX: number;
  maxX: number;
}

export function buildUtcFocusWindow(readPointX: number, hourSpacingPx: number): UtcFocusWindow {
  const spacing = Math.max(0, hourSpacingPx);
  const halfWindowPx = spacing * UTC_FOCUS_HALF_WINDOW_HOURS;
  return {
    readPointX,
    hourSpacingPx: spacing,
    halfWindowPx,
    minX: readPointX - halfWindowPx,
    maxX: readPointX + halfWindowPx,
  };
}

export function utcFocusOpacityAtX(window: UtcFocusWindow, x: number): number {
  if (!(window.hourSpacingPx > 0)) {
    return 0;
  }
  const distanceHours = Math.abs((x - window.readPointX) / window.hourSpacingPx);
  if (distanceHours <= UTC_FOCUS_FULL_VISIBILITY_HALF_HOURS) {
    return 1;
  }
  if (distanceHours >= UTC_FOCUS_HALF_WINDOW_HOURS) {
    return 0;
  }
  const fadeSpan = UTC_FOCUS_HALF_WINDOW_HOURS - UTC_FOCUS_FULL_VISIBILITY_HALF_HOURS;
  if (!(fadeSpan > 0)) {
    return 0;
  }
  const t = (distanceHours - UTC_FOCUS_FULL_VISIBILITY_HALF_HOURS) / fadeSpan;
  return Math.max(0, Math.min(1, 1 - t));
}

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
