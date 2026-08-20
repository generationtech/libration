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
 * Milky Way zenith-ribbon presentation (LIB-049) plus Galactic-center altitude
 * visibility contours (LIB-050). Conservative controls only.
 */

import {
  normalizeAstronomyPathColorCss,
  normalizeAstronomyPathThicknessId,
  type AstronomyPathThicknessId,
} from "./astronomyOverlayStrokeAppearance";
import type { MilkyWayViewingLevel } from "./milkyWayViewingPolicy";

export const MILKY_WAY_BAND_WIDTH_IDS = ["narrow", "normal", "wide"] as const;
export type MilkyWayBandWidthId = (typeof MILKY_WAY_BAND_WIDTH_IDS)[number];
export const DEFAULT_MILKY_WAY_BAND_WIDTH: MilkyWayBandWidthId = "normal";

/** Half-width in Galactic latitude degrees. Conservative angular envelope, not photometry. */
export const MILKY_WAY_BAND_HALF_WIDTH_DEG: Record<MilkyWayBandWidthId, number> = {
  narrow: 5,
  normal: 10,
  wide: 15,
};

export const DEFAULT_MILKY_WAY_PLANE_COLOR = "#c9bdd8";
export const DEFAULT_MILKY_WAY_BAND_COLOR = "#9aa3c0";
export const DEFAULT_MILKY_WAY_PLANE_THICKNESS: AstronomyPathThicknessId = "thin";
export const DEFAULT_MILKY_WAY_BAND_THICKNESS: AstronomyPathThicknessId = "thin";

/** Distinct from plane/band, still in the same cool-lavender family. Not white. */
export const DEFAULT_MILKY_WAY_VISIBILITY_COLOR = "#b8a0d4";
export const DEFAULT_MILKY_WAY_VISIBILITY_THICKNESS: AstronomyPathThicknessId = "thin";

export const MILKY_WAY_GC_ALTITUDE_CONTOUR_DEGS = [0, 30, 45, 60, 75] as const;
export type MilkyWayGcAltitudeContourDeg = (typeof MILKY_WAY_GC_ALTITUDE_CONTOUR_DEGS)[number];

/** Default-on levels once the user enables visibility contours. Horizon 0° stays off. */
export const DEFAULT_MILKY_WAY_VISIBLE_CONTOUR_DEGS: readonly MilkyWayGcAltitudeContourDeg[] = [
  30, 45, 60, 75,
];

export function milkyWayBandWidthLabel(id: MilkyWayBandWidthId): string {
  switch (id) {
    case "narrow":
      return "Narrow (±5°)";
    case "normal":
      return "Normal (±10°)";
    case "wide":
      return "Wide (±15°)";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export type MilkyWayPresentation = {
  planeEnabled: boolean;
  bandEnabled: boolean;
  bandWidth: MilkyWayBandWidthId;
  ribsEnabled: boolean;
  planeColor: string;
  bandColor: string;
  planeThickness: AstronomyPathThicknessId;
  bandThickness: AstronomyPathThicknessId;
  galacticCenterEnabled: boolean;
  galacticCenterLabelEnabled: boolean;
  galacticAnticenterEnabled: boolean;
  emphasizeNightSide: boolean;
  visibilityContoursEnabled: boolean;
  contour0Enabled: boolean;
  contour30Enabled: boolean;
  contour45Enabled: boolean;
  contour60Enabled: boolean;
  contour75Enabled: boolean;
  emphasizeAstronomicalNight: boolean;
  deemphasizeMoonlight: boolean;
  visibilityColor: string;
  visibilityThickness: AstronomyPathThicknessId;
  viewingEventsEnabled: boolean;
  showViewingWindows: boolean;
  showStrongWindows: boolean;
  showPrimeWindows: boolean;
};

export type MilkyWayPresentationPatch = Partial<MilkyWayPresentation>;

export const DEFAULT_MILKY_WAY_PRESENTATION: MilkyWayPresentation = {
  planeEnabled: true,
  bandEnabled: true,
  bandWidth: DEFAULT_MILKY_WAY_BAND_WIDTH,
  ribsEnabled: true,
  planeColor: DEFAULT_MILKY_WAY_PLANE_COLOR,
  bandColor: DEFAULT_MILKY_WAY_BAND_COLOR,
  planeThickness: DEFAULT_MILKY_WAY_PLANE_THICKNESS,
  bandThickness: DEFAULT_MILKY_WAY_BAND_THICKNESS,
  galacticCenterEnabled: true,
  galacticCenterLabelEnabled: true,
  galacticAnticenterEnabled: false,
  emphasizeNightSide: true,
  visibilityContoursEnabled: false,
  contour0Enabled: false,
  contour30Enabled: true,
  contour45Enabled: true,
  contour60Enabled: true,
  contour75Enabled: true,
  emphasizeAstronomicalNight: true,
  deemphasizeMoonlight: true,
  visibilityColor: DEFAULT_MILKY_WAY_VISIBILITY_COLOR,
  visibilityThickness: DEFAULT_MILKY_WAY_VISIBILITY_THICKNESS,
  viewingEventsEnabled: false,
  showViewingWindows: true,
  showStrongWindows: true,
  showPrimeWindows: true,
};

function isBandWidthId(raw: unknown): raw is MilkyWayBandWidthId {
  return typeof raw === "string" && (MILKY_WAY_BAND_WIDTH_IDS as readonly string[]).includes(raw);
}

function asBoolean(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

export function normalizeMilkyWayPresentation(raw: unknown): MilkyWayPresentation {
  const o = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_MILKY_WAY_PRESENTATION;
  return {
    planeEnabled: asBoolean(o.planeEnabled, d.planeEnabled),
    bandEnabled: asBoolean(o.bandEnabled, d.bandEnabled),
    bandWidth: isBandWidthId(o.bandWidth) ? o.bandWidth : d.bandWidth,
    ribsEnabled: asBoolean(o.ribsEnabled, d.ribsEnabled),
    planeColor: normalizeAstronomyPathColorCss(o.planeColor, d.planeColor),
    bandColor: normalizeAstronomyPathColorCss(o.bandColor, d.bandColor),
    planeThickness: normalizeAstronomyPathThicknessId(o.planeThickness ?? d.planeThickness),
    bandThickness: normalizeAstronomyPathThicknessId(o.bandThickness ?? d.bandThickness),
    galacticCenterEnabled: asBoolean(o.galacticCenterEnabled, d.galacticCenterEnabled),
    galacticCenterLabelEnabled: asBoolean(
      o.galacticCenterLabelEnabled,
      d.galacticCenterLabelEnabled,
    ),
    galacticAnticenterEnabled: asBoolean(
      o.galacticAnticenterEnabled,
      d.galacticAnticenterEnabled,
    ),
    emphasizeNightSide: asBoolean(o.emphasizeNightSide, d.emphasizeNightSide),
    visibilityContoursEnabled: asBoolean(
      o.visibilityContoursEnabled,
      d.visibilityContoursEnabled,
    ),
    contour0Enabled: asBoolean(o.contour0Enabled, d.contour0Enabled),
    contour30Enabled: asBoolean(o.contour30Enabled, d.contour30Enabled),
    contour45Enabled: asBoolean(o.contour45Enabled, d.contour45Enabled),
    contour60Enabled: asBoolean(o.contour60Enabled, d.contour60Enabled),
    contour75Enabled: asBoolean(o.contour75Enabled, d.contour75Enabled),
    emphasizeAstronomicalNight: asBoolean(
      o.emphasizeAstronomicalNight,
      d.emphasizeAstronomicalNight,
    ),
    deemphasizeMoonlight: asBoolean(o.deemphasizeMoonlight, d.deemphasizeMoonlight),
    visibilityColor: normalizeAstronomyPathColorCss(o.visibilityColor, d.visibilityColor),
    visibilityThickness: normalizeAstronomyPathThicknessId(
      o.visibilityThickness ?? d.visibilityThickness,
    ),
    viewingEventsEnabled: asBoolean(o.viewingEventsEnabled, d.viewingEventsEnabled),
    showViewingWindows: asBoolean(o.showViewingWindows, d.showViewingWindows),
    showStrongWindows: asBoolean(o.showStrongWindows, d.showStrongWindows),
    showPrimeWindows: asBoolean(o.showPrimeWindows, d.showPrimeWindows),
  };
}

export function milkyWayEnabledContourAltitudesDeg(
  pres: MilkyWayPresentation,
): MilkyWayGcAltitudeContourDeg[] {
  const out: MilkyWayGcAltitudeContourDeg[] = [];
  if (pres.contour0Enabled) {
    out.push(0);
  }
  if (pres.contour30Enabled) {
    out.push(30);
  }
  if (pres.contour45Enabled) {
    out.push(45);
  }
  if (pres.contour60Enabled) {
    out.push(60);
  }
  if (pres.contour75Enabled) {
    out.push(75);
  }
  return out;
}

export function milkyWayEnabledViewingLevels(
  pres: MilkyWayPresentation,
): MilkyWayViewingLevel[] {
  const out: MilkyWayViewingLevel[] = [];
  if (pres.showViewingWindows) {
    out.push("viewing");
  }
  if (pres.showStrongWindows) {
    out.push("strong");
  }
  if (pres.showPrimeWindows) {
    out.push("prime");
  }
  return out;
}

export function mergeMilkyWayPresentation(
  current: MilkyWayPresentation,
  patch: MilkyWayPresentationPatch,
): MilkyWayPresentation {
  return normalizeMilkyWayPresentation({ ...current, ...patch });
}

export function milkyWayPresentationToParameters(
  pres: MilkyWayPresentation,
): Record<string, unknown> {
  return { ...pres };
}

export function milkyWayBandHalfWidthDeg(width: MilkyWayBandWidthId): number {
  return MILKY_WAY_BAND_HALF_WIDTH_DEG[width];
}
