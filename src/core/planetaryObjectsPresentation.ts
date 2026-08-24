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
 * Planetary space-object presentation (LIB-048).
 * Per-body: enable, color, locus enable. Everything else is shared.
 */

import { parseCssColorToRgba8888 } from "../color/contrastForegroundOnCssBackground";
import {
  DEFAULT_ASTRONOMY_PATH_THICKNESS,
  normalizeAstronomyPathThicknessId,
  type AstronomyPathThicknessId,
} from "./astronomyOverlayStrokeAppearance";
import {
  PLANETARY_BODY_IDS,
  PLANETARY_BODY_METADATA,
  isPlanetaryBodyId,
  type PlanetaryBodyId,
} from "./planetaryBodies";

export const PLANETARY_GLYPH_TYPE_IDS = ["symbol", "dot"] as const;
export type PlanetaryGlyphTypeId = (typeof PLANETARY_GLYPH_TYPE_IDS)[number];
export const DEFAULT_PLANETARY_GLYPH_TYPE: PlanetaryGlyphTypeId = "symbol";

export const PLANETARY_GLYPH_SIZE_IDS = ["small", "normal", "large", "extraLarge"] as const;
export type PlanetaryGlyphSizeId = (typeof PLANETARY_GLYPH_SIZE_IDS)[number];
export const DEFAULT_PLANETARY_GLYPH_SIZE: PlanetaryGlyphSizeId = "normal";

export const PLANETARY_GLYPH_SIZE_SCALE: Record<PlanetaryGlyphSizeId, number> = {
  small: 0.72,
  normal: 1,
  large: 1.42,
  extraLarge: 1.85,
};

export const PLANETARY_GROUND_TRACK_HORIZON_IDS = ["6h", "12h", "1d", "2d", "7d"] as const;
export type PlanetaryGroundTrackHorizonId = (typeof PLANETARY_GROUND_TRACK_HORIZON_IDS)[number];
export const DEFAULT_PLANETARY_GROUND_TRACK_HORIZON: PlanetaryGroundTrackHorizonId = "1d";

export const PLANETARY_GROUND_TRACK_HORIZON_HOURS: Record<PlanetaryGroundTrackHorizonId, number> = {
  "6h": 6,
  "12h": 12,
  "1d": 24,
  "2d": 48,
  "7d": 168,
};

export const PLANETARY_LOCUS_DURATION_IDS = ["1y", "2y", "5y", "10y", "synodic"] as const;
export type PlanetaryLocusDurationId = (typeof PLANETARY_LOCUS_DURATION_IDS)[number];
export const DEFAULT_PLANETARY_LOCUS_DURATION: PlanetaryLocusDurationId = "1y";

export const PLANETARY_LOCUS_DURATION_DAYS: Record<Exclude<PlanetaryLocusDurationId, "synodic">, number> =
  {
    "1y": 365,
    "2y": 730,
    "5y": 1826,
    "10y": 3652,
  };

export const PLANETARY_LOCUS_OPACITY_IDS = ["subtle", "normal", "strong"] as const;
export type PlanetaryLocusOpacityId = (typeof PLANETARY_LOCUS_OPACITY_IDS)[number];
export const DEFAULT_PLANETARY_LOCUS_OPACITY: PlanetaryLocusOpacityId = "normal";

export const PLANETARY_LOCUS_OPACITY_01: Record<PlanetaryLocusOpacityId, number> = {
  subtle: 0.32,
  normal: 0.52,
  strong: 0.78,
};

export const DEFAULT_PLANETARY_LOCUS_THICKNESS: AstronomyPathThicknessId = "thin";

export type PlanetaryBodyPresentation = {
  enabled: boolean;
  color: string;
  locusEnabled: boolean;
};

export type PlanetaryGroundTrackPresentation = {
  enabled: boolean;
  pastEnabled: boolean;
  pastHorizon: PlanetaryGroundTrackHorizonId;
  futureEnabled: boolean;
  futureHorizon: PlanetaryGroundTrackHorizonId;
  thickness: AstronomyPathThicknessId;
};

export type PlanetaryLociPresentation = {
  duration: PlanetaryLocusDurationId;
  thickness: AstronomyPathThicknessId;
  opacity: PlanetaryLocusOpacityId;
};

export type PlanetaryObjectsPresentation = {
  bodies: Record<PlanetaryBodyId, PlanetaryBodyPresentation>;
  currentSubpointsEnabled: boolean;
  labelsEnabled: boolean;
  glyphType: PlanetaryGlyphTypeId;
  glyphSize: PlanetaryGlyphSizeId;
  groundTracks: PlanetaryGroundTrackPresentation;
  loci: PlanetaryLociPresentation;
};

function defaultBodyPresentation(id: PlanetaryBodyId): PlanetaryBodyPresentation {
  return {
    enabled: false,
    color: PLANETARY_BODY_METADATA[id].defaultColor,
    locusEnabled: false,
  };
}

function defaultBodies(): Record<PlanetaryBodyId, PlanetaryBodyPresentation> {
  const bodies = {} as Record<PlanetaryBodyId, PlanetaryBodyPresentation>;
  for (const id of PLANETARY_BODY_IDS) {
    bodies[id] = defaultBodyPresentation(id);
  }
  return bodies;
}

export const DEFAULT_PLANETARY_OBJECTS_PRESENTATION: PlanetaryObjectsPresentation = {
  bodies: defaultBodies(),
  currentSubpointsEnabled: true,
  labelsEnabled: true,
  glyphType: DEFAULT_PLANETARY_GLYPH_TYPE,
  glyphSize: DEFAULT_PLANETARY_GLYPH_SIZE,
  groundTracks: {
    enabled: false,
    pastEnabled: true,
    pastHorizon: DEFAULT_PLANETARY_GROUND_TRACK_HORIZON,
    futureEnabled: true,
    futureHorizon: DEFAULT_PLANETARY_GROUND_TRACK_HORIZON,
    thickness: DEFAULT_ASTRONOMY_PATH_THICKNESS,
  },
  loci: {
    duration: DEFAULT_PLANETARY_LOCUS_DURATION,
    thickness: DEFAULT_PLANETARY_LOCUS_THICKNESS,
    opacity: DEFAULT_PLANETARY_LOCUS_OPACITY,
  },
};

function isOneOf<T extends string>(raw: unknown, ids: readonly T[]): raw is T {
  return typeof raw === "string" && (ids as readonly string[]).includes(raw);
}

function toHexRrggbb(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function normalizePlanetaryColorCss(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") {
    return fallback;
  }
  const parsed = parseCssColorToRgba8888(raw);
  if (!parsed) {
    return fallback;
  }
  return toHexRrggbb(parsed.r, parsed.g, parsed.b);
}

export function normalizePlanetaryBoolean(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

export function planetaryGlyphSizeScale(size: PlanetaryGlyphSizeId): number {
  return PLANETARY_GLYPH_SIZE_SCALE[isOneOf(size, PLANETARY_GLYPH_SIZE_IDS) ? size : DEFAULT_PLANETARY_GLYPH_SIZE];
}

/** Painted current-planet glyph radius in CSS pixels (same formula as the scene plan). */
export function planetaryCurrentGlyphRadiusPx(
  viewportWidthPx: number,
  glyphSize: PlanetaryGlyphSizeId,
): number {
  return (
    Math.min(8.5, Math.max(4.4, 4.8 * Math.max(0.7, viewportWidthPx / 1400))) *
    planetaryGlyphSizeScale(glyphSize)
  );
}

export function planetaryGlyphSizeLabel(id: PlanetaryGlyphSizeId): string {
  switch (id) {
    case "small":
      return "Small";
    case "normal":
      return "Medium";
    case "large":
      return "Large";
    case "extraLarge":
      return "Extra large";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function planetaryGlyphTypeLabel(id: PlanetaryGlyphTypeId): string {
  switch (id) {
    case "symbol":
      return "Astronomical symbol";
    case "dot":
      return "Dot";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function planetaryGroundTrackHorizonLabel(id: PlanetaryGroundTrackHorizonId): string {
  switch (id) {
    case "6h":
      return "6 hours";
    case "12h":
      return "12 hours";
    case "1d":
      return "1 day";
    case "2d":
      return "2 days";
    case "7d":
      return "7 days";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function planetaryLocusDurationLabel(id: PlanetaryLocusDurationId): string {
  switch (id) {
    case "1y":
      return "1 year";
    case "2y":
      return "2 years";
    case "5y":
      return "5 years";
    case "10y":
      return "10 years";
    case "synodic":
      return "1 synodic cycle";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function planetaryLocusOpacityLabel(id: PlanetaryLocusOpacityId): string {
  switch (id) {
    case "subtle":
      return "Subtle";
    case "normal":
      return "Normal";
    case "strong":
      return "Strong";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function planetaryGroundTrackHorizonHours(id: PlanetaryGroundTrackHorizonId): number {
  return PLANETARY_GROUND_TRACK_HORIZON_HOURS[id];
}

export function planetaryLocusDurationDays(id: PlanetaryLocusDurationId, body: PlanetaryBodyId): number {
  if (id === "synodic") {
    return Math.max(30, Math.round(PLANETARY_BODY_METADATA[body].meanSynodicPeriodDays));
  }
  return PLANETARY_LOCUS_DURATION_DAYS[id];
}

function normalizeBodyPresentation(
  raw: unknown,
  id: PlanetaryBodyId,
): PlanetaryBodyPresentation {
  const fallback = defaultBodyPresentation(id);
  const o = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    enabled: normalizePlanetaryBoolean(o.enabled, fallback.enabled),
    color: normalizePlanetaryColorCss(o.color, fallback.color),
    locusEnabled: normalizePlanetaryBoolean(o.locusEnabled, fallback.locusEnabled),
  };
}

function normalizeBodies(raw: unknown): Record<PlanetaryBodyId, PlanetaryBodyPresentation> {
  const o = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const bodies = {} as Record<PlanetaryBodyId, PlanetaryBodyPresentation>;
  for (const id of PLANETARY_BODY_IDS) {
    bodies[id] = normalizeBodyPresentation(o[id], id);
  }
  return bodies;
}

export function normalizePlanetaryObjectsPresentation(raw: unknown): PlanetaryObjectsPresentation {
  const o = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const gt = o.groundTracks !== null && typeof o.groundTracks === "object"
    ? (o.groundTracks as Record<string, unknown>)
    : o;
  const lociRaw = o.loci !== null && typeof o.loci === "object" ? (o.loci as Record<string, unknown>) : o;
  const d = DEFAULT_PLANETARY_OBJECTS_PRESENTATION;
  return {
    bodies: normalizeBodies(o.bodies),
    currentSubpointsEnabled: normalizePlanetaryBoolean(
      o.currentSubpointsEnabled,
      d.currentSubpointsEnabled,
    ),
    labelsEnabled: normalizePlanetaryBoolean(o.labelsEnabled, d.labelsEnabled),
    glyphType: isOneOf(o.glyphType, PLANETARY_GLYPH_TYPE_IDS)
      ? o.glyphType
      : d.glyphType,
    glyphSize: isOneOf(o.glyphSize, PLANETARY_GLYPH_SIZE_IDS)
      ? o.glyphSize
      : d.glyphSize,
    groundTracks: {
      enabled: normalizePlanetaryBoolean(gt.enabled ?? o.groundTracksEnabled, d.groundTracks.enabled),
      pastEnabled: normalizePlanetaryBoolean(gt.pastEnabled, d.groundTracks.pastEnabled),
      pastHorizon: isOneOf(gt.pastHorizon, PLANETARY_GROUND_TRACK_HORIZON_IDS)
        ? gt.pastHorizon
        : d.groundTracks.pastHorizon,
      futureEnabled: normalizePlanetaryBoolean(gt.futureEnabled, d.groundTracks.futureEnabled),
      futureHorizon: isOneOf(gt.futureHorizon, PLANETARY_GROUND_TRACK_HORIZON_IDS)
        ? gt.futureHorizon
        : d.groundTracks.futureHorizon,
      thickness: normalizeAstronomyPathThicknessId(gt.thickness ?? d.groundTracks.thickness),
    },
    loci: {
      duration: isOneOf(lociRaw.duration, PLANETARY_LOCUS_DURATION_IDS)
        ? lociRaw.duration
        : d.loci.duration,
      thickness: normalizeAstronomyPathThicknessId(lociRaw.thickness ?? d.loci.thickness),
      opacity: isOneOf(lociRaw.opacity, PLANETARY_LOCUS_OPACITY_IDS)
        ? lociRaw.opacity
        : d.loci.opacity,
    },
  };
}

export type PlanetaryObjectsPresentationPatch = {
  bodies?: Partial<Record<PlanetaryBodyId, Partial<PlanetaryBodyPresentation>>>;
  currentSubpointsEnabled?: boolean;
  labelsEnabled?: boolean;
  glyphType?: PlanetaryGlyphTypeId;
  glyphSize?: PlanetaryGlyphSizeId;
  groundTracks?: Partial<PlanetaryGroundTrackPresentation>;
  loci?: Partial<PlanetaryLociPresentation>;
};

export function mergePlanetaryObjectsPresentation(
  current: PlanetaryObjectsPresentation,
  patch: PlanetaryObjectsPresentationPatch,
): PlanetaryObjectsPresentation {
  const bodies = { ...current.bodies };
  if (patch.bodies) {
    for (const id of PLANETARY_BODY_IDS) {
      const part = patch.bodies[id];
      if (!part) {
        continue;
      }
      bodies[id] = { ...bodies[id]!, ...part };
    }
  }
  return normalizePlanetaryObjectsPresentation({
    bodies,
    currentSubpointsEnabled: patch.currentSubpointsEnabled ?? current.currentSubpointsEnabled,
    labelsEnabled: patch.labelsEnabled ?? current.labelsEnabled,
    glyphType: patch.glyphType ?? current.glyphType,
    glyphSize: patch.glyphSize ?? current.glyphSize,
    groundTracks: { ...current.groundTracks, ...patch.groundTracks },
    loci: { ...current.loci, ...patch.loci },
  });
}

export function planetaryObjectsPresentationToParameters(
  pres: PlanetaryObjectsPresentation,
): Record<string, unknown> {
  const bodies: Record<string, unknown> = {};
  for (const id of PLANETARY_BODY_IDS) {
    bodies[id] = { ...pres.bodies[id] };
  }
  return {
    bodies,
    currentSubpointsEnabled: pres.currentSubpointsEnabled,
    labelsEnabled: pres.labelsEnabled,
    glyphType: pres.glyphType,
    glyphSize: pres.glyphSize,
    groundTracks: { ...pres.groundTracks },
    loci: { ...pres.loci },
  };
}

export function isPlanetaryBodyKey(raw: string): raw is PlanetaryBodyId {
  return isPlanetaryBodyId(raw);
}
