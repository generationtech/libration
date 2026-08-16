/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 */

/**
 * Solar eclipse visual-family classification from presentation paint tokens.
 * Used by tests inspecting layer payloads and RenderPlan items. Canvas does not
 * import this module.
 */

export type SolarEclipseVisualFamily =
  | "forecast-partial"
  | "event-path-fill"
  | "event-path-limit"
  | "live-partial"
  | "live-central-umbra"
  | "live-central-antumbra"
  | "alignment-outer"
  | "alignment-mid"
  | "alignment-core"
  | "alignment-axis"
  | "path-centerline"
  | "ground-marker"
  | "ground-marker-under"
  | "ground-marker-halo";

export type ParsedRgba = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};

export function parseCssRgba(css: string): ParsedRgba | null {
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/.exec(css.trim());
  if (!m) {
    return null;
  }
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: Number(m[4]) };
}

function rgbNear(a: ParsedRgba, r: number, g: number, b: number, tol = 2): boolean {
  return Math.abs(a.r - r) <= tol && Math.abs(a.g - g) <= tol && Math.abs(a.b - b) <= tol;
}

export function classifySolarEclipseFillFamily(css: string): SolarEclipseVisualFamily | null {
  const c = parseCssRgba(css);
  if (!c) {
    return null;
  }
  if (rgbNear(c, 47, 109, 120)) {
    return c.a < 0.135 ? "forecast-partial" : "live-partial";
  }
  if (rgbNear(c, 72, 48, 140)) {
    return "event-path-fill";
  }
  if (rgbNear(c, 176, 96, 36)) {
    return c.a < 0.3 ? "event-path-fill" : "live-central-antumbra";
  }
  if (rgbNear(c, 40, 24, 72) || rgbNear(c, 48, 28, 92)) {
    return "live-central-umbra";
  }
  if (rgbNear(c, 255, 214, 150)) {
    return "alignment-outer";
  }
  if (rgbNear(c, 255, 228, 176)) {
    return "alignment-mid";
  }
  if (rgbNear(c, 255, 244, 220)) {
    return "alignment-core";
  }
  if (rgbNear(c, 212, 90, 60)) {
    if (c.a < 0.4) {
      return "ground-marker-halo";
    }
    return "ground-marker";
  }
  return null;
}

export function classifySolarEclipseStrokeFamily(css: string): SolarEclipseVisualFamily | null {
  const c = parseCssRgba(css);
  if (!c) {
    return null;
  }
  if (rgbNear(c, 47, 109, 120)) {
    return "live-partial";
  }
  if (rgbNear(c, 220, 208, 255)) {
    return "event-path-limit";
  }
  if (rgbNear(c, 236, 220, 255)) {
    return "path-centerline";
  }
  if (rgbNear(c, 255, 236, 200)) {
    return "alignment-axis";
  }
  if (rgbNear(c, 212, 90, 60)) {
    return "ground-marker";
  }
  if (rgbNear(c, 18, 26, 40) || rgbNear(c, 236, 240, 246)) {
    return "ground-marker-under";
  }
  return null;
}
