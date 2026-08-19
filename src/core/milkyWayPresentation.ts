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
 * Milky Way zenith-ribbon presentation (LIB-049). Conservative controls only.
 */

import {
  normalizeAstronomyPathColorCss,
  normalizeAstronomyPathThicknessId,
  type AstronomyPathThicknessId,
} from "./astronomyOverlayStrokeAppearance";

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
  };
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
