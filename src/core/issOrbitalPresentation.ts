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
 * ISS orbital-track presentation (LIB-038 / LIB-041).
 * Horizons and colors are display policy; orbital samples remain lifecycle/SGP4 truth.
 */

import { parseCssColorToRgba8888 } from "../color/contrastForegroundOnCssBackground";
import {
  DEFAULT_ISS_ORBIT_FUTURE_HORIZON,
  DEFAULT_ISS_ORBIT_PAST_HORIZON,
  migrateIssOrbitHorizonId,
  type IssOrbitHorizonId,
} from "./issOrbitHorizon";

export {
  DEFAULT_ISS_ORBIT_FUTURE_HORIZON,
  DEFAULT_ISS_ORBIT_PAST_HORIZON,
  ISS_ORBIT_HORIZON_IDS,
  ISS_ORBIT_HORIZON_UI_IDS,
  issOrbitHorizonLabel,
  type IssOrbitHorizonId,
} from "./issOrbitHorizon";

export const ISS_ORBIT_LINE_THICKNESS_IDS = ["thin", "normal", "thick"] as const;
export type IssOrbitLineThicknessId = (typeof ISS_ORBIT_LINE_THICKNESS_IDS)[number];
export const DEFAULT_ISS_ORBIT_LINE_THICKNESS: IssOrbitLineThicknessId = "normal";

/** Current production trail base width (`sw(1.6)`). */
export const ISS_ORBIT_LINE_WIDTH_PX: Record<IssOrbitLineThicknessId, number> = {
  thin: 1.12,
  normal: 1.6,
  thick: 2.32,
};

export const ISS_GLYPH_TYPE_IDS = ["dot", "silhouette"] as const;
export type IssGlyphTypeId = (typeof ISS_GLYPH_TYPE_IDS)[number];
export const DEFAULT_ISS_GLYPH_TYPE: IssGlyphTypeId = "dot";

export const ISS_GLYPH_SIZE_IDS = ["small", "normal", "large", "extraLarge"] as const;
export type IssGlyphSizeId = (typeof ISS_GLYPH_SIZE_IDS)[number];
export const DEFAULT_ISS_GLYPH_SIZE: IssGlyphSizeId = "normal";

export const ISS_GLYPH_SIZE_SCALE: Record<IssGlyphSizeId, number> = {
  small: 0.72,
  normal: 1,
  large: 1.42,
  extraLarge: 1.85,
};

/**
 * Canonical ISS cyan (`rgba(120, 210, 255, …)` trail).
 * Fallback for missing past/future/dot/glyph colors and the on-map label family.
 */
export const DEFAULT_ISS_ORBIT_BASE_COLOR = "#78d2ff";

/** Past track: same family, full strength. Plan-builder alpha stays quieter than the glyph. */
export const DEFAULT_ISS_ORBIT_PAST_COLOR = DEFAULT_ISS_ORBIT_BASE_COLOR;

/** Future track: lighter/fainter member of the same cool family. */
export const DEFAULT_ISS_ORBIT_FUTURE_COLOR = "#a8e4ff";

/** Current disc fill (`rgba(180, 240, 255, …)`). */
export const DEFAULT_ISS_DOT_COLOR = "#b4f0ff";

/** Silhouette fill; same family as the current disc unless the user overrides. */
export const DEFAULT_ISS_GLYPH_COLOR = DEFAULT_ISS_DOT_COLOR;

export const DEFAULT_ISS_ORBIT_TRACK_ENABLED = true;
export const DEFAULT_ISS_ORBIT_PAST_ENABLED = true;
export const DEFAULT_ISS_ORBIT_FUTURE_ENABLED = true;
export const DEFAULT_ISS_LABEL_ENABLED = true;

export type IssOrbitalPresentation = {
  trackEnabled: boolean;
  pastEnabled: boolean;
  futureEnabled: boolean;
  pastHorizon: IssOrbitHorizonId;
  futureHorizon: IssOrbitHorizonId;
  baseColor: string;
  pastColor: string;
  futureColor: string;
  lineThickness: IssOrbitLineThicknessId;
  glyphType: IssGlyphTypeId;
  glyphSize: IssGlyphSizeId;
  dotColor: string;
  glyphColor: string;
  labelEnabled: boolean;
};

export const DEFAULT_ISS_ORBITAL_PRESENTATION: IssOrbitalPresentation = {
  trackEnabled: DEFAULT_ISS_ORBIT_TRACK_ENABLED,
  pastEnabled: DEFAULT_ISS_ORBIT_PAST_ENABLED,
  futureEnabled: DEFAULT_ISS_ORBIT_FUTURE_ENABLED,
  pastHorizon: DEFAULT_ISS_ORBIT_PAST_HORIZON,
  futureHorizon: DEFAULT_ISS_ORBIT_FUTURE_HORIZON,
  baseColor: DEFAULT_ISS_ORBIT_BASE_COLOR,
  pastColor: DEFAULT_ISS_ORBIT_PAST_COLOR,
  futureColor: DEFAULT_ISS_ORBIT_FUTURE_COLOR,
  lineThickness: DEFAULT_ISS_ORBIT_LINE_THICKNESS,
  glyphType: DEFAULT_ISS_GLYPH_TYPE,
  glyphSize: DEFAULT_ISS_GLYPH_SIZE,
  dotColor: DEFAULT_ISS_DOT_COLOR,
  glyphColor: DEFAULT_ISS_GLYPH_COLOR,
  labelEnabled: DEFAULT_ISS_LABEL_ENABLED,
};

function isOneOf<T extends string | number>(raw: unknown, ids: readonly T[]): raw is T {
  return (ids as readonly unknown[]).includes(raw);
}

function toHexRrggbb(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Maps unknown persisted/UI color values onto lowercase `#rrggbb`.
 * Unparseable input becomes `fallback`. Alpha in `rgba()` is discarded.
 */
export function normalizeIssPresentationColorCss(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") {
    return fallback;
  }
  const parsed = parseCssColorToRgba8888(raw);
  if (!parsed) {
    return fallback;
  }
  return toHexRrggbb(parsed.r, parsed.g, parsed.b);
}

export function normalizeIssOrbitLineThicknessId(raw: unknown): IssOrbitLineThicknessId {
  return isOneOf(raw, ISS_ORBIT_LINE_THICKNESS_IDS) ? raw : DEFAULT_ISS_ORBIT_LINE_THICKNESS;
}

export function normalizeIssGlyphTypeId(raw: unknown): IssGlyphTypeId {
  return isOneOf(raw, ISS_GLYPH_TYPE_IDS) ? raw : DEFAULT_ISS_GLYPH_TYPE;
}

export function normalizeIssGlyphSizeId(raw: unknown): IssGlyphSizeId {
  return isOneOf(raw, ISS_GLYPH_SIZE_IDS) ? raw : DEFAULT_ISS_GLYPH_SIZE;
}

export function normalizeIssBoolean(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

export function issOrbitLineWidthPx(thickness: IssOrbitLineThicknessId): number {
  return ISS_ORBIT_LINE_WIDTH_PX[normalizeIssOrbitLineThicknessId(thickness)];
}

export function issGlyphSizeScale(size: IssGlyphSizeId): number {
  return ISS_GLYPH_SIZE_SCALE[normalizeIssGlyphSizeId(size)];
}

export function issGlyphSizeLabel(id: IssGlyphSizeId): string {
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

export function issOrbitLineThicknessLabel(id: IssOrbitLineThicknessId): string {
  switch (id) {
    case "thin":
      return "Thin";
    case "normal":
      return "Normal";
    case "thick":
      return "Thick";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function issGlyphTypeLabel(id: IssGlyphTypeId): string {
  switch (id) {
    case "dot":
      return "Dot";
    case "silhouette":
      return "ISS silhouette";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/**
 * Split timed samples around product UTC into past and future windows.
 * Uses each sample’s timestamp, not vertex index or geometric midpoint.
 * The current sample is appended to past and prepended to future so each
 * visible segment meets the glyph.
 */
export function selectIssTrackTemporalWindow<T extends { timeMs: number }>(
  samples: readonly T[],
  productUtcMs: number,
  options: {
    pastEnabled: boolean;
    futureEnabled: boolean;
    pastMs: number;
    futureMs: number;
    current?: T;
  },
): { past: T[]; future: T[] } {
  const past: T[] = [];
  const future: T[] = [];
  if (!Number.isFinite(productUtcMs)) {
    return { past, future };
  }
  const pastStart = productUtcMs - Math.max(0, options.pastMs);
  const futureEnd = productUtcMs + Math.max(0, options.futureMs);
  if (options.pastEnabled) {
    for (const sample of samples) {
      if (sample.timeMs >= pastStart && sample.timeMs < productUtcMs) {
        past.push(sample);
      }
    }
    if (options.current !== undefined) {
      past.push(options.current);
    }
  }
  if (options.futureEnabled) {
    if (options.current !== undefined) {
      future.push(options.current);
    }
    for (const sample of samples) {
      if (sample.timeMs > productUtcMs && sample.timeMs <= futureEnd) {
        future.push(sample);
      }
    }
  }
  return { past, future };
}

/**
 * Screen-space heading (radians from +X / east, clockwise toward +Y / south)
 * from a pair of unwrapped geographic samples. Presentation only — not attitude.
 */
export function issTravelHeadingRad(options: {
  fromLonDeg: number;
  fromLatDeg: number;
  toLonDeg: number;
  toLatDeg: number;
}): number | null {
  const dLon = options.toLonDeg - options.fromLonDeg;
  const dLat = options.toLatDeg - options.fromLatDeg;
  if (!Number.isFinite(dLon) || !Number.isFinite(dLat)) {
    return null;
  }
  if (Math.abs(dLon) < 1e-9 && Math.abs(dLat) < 1e-9) {
    return null;
  }
  return Math.atan2(-dLat, dLon);
}

export function normalizeIssOrbitalPresentation(raw: unknown): IssOrbitalPresentation {
  const o = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const baseColor = normalizeIssPresentationColorCss(o.baseColor, DEFAULT_ISS_ORBIT_BASE_COLOR);
  return {
    trackEnabled: normalizeIssBoolean(o.trackEnabled, DEFAULT_ISS_ORBIT_TRACK_ENABLED),
    pastEnabled: normalizeIssBoolean(o.pastEnabled, DEFAULT_ISS_ORBIT_PAST_ENABLED),
    futureEnabled: normalizeIssBoolean(o.futureEnabled, DEFAULT_ISS_ORBIT_FUTURE_ENABLED),
    pastHorizon: migrateIssOrbitHorizonId(
      o.pastHorizon,
      o.pastMinutes,
      DEFAULT_ISS_ORBIT_PAST_HORIZON,
    ),
    futureHorizon: migrateIssOrbitHorizonId(
      o.futureHorizon,
      o.futureMinutes,
      DEFAULT_ISS_ORBIT_FUTURE_HORIZON,
    ),
    baseColor,
    pastColor: normalizeIssPresentationColorCss(o.pastColor, baseColor),
    futureColor: normalizeIssPresentationColorCss(o.futureColor, DEFAULT_ISS_ORBIT_FUTURE_COLOR),
    lineThickness: normalizeIssOrbitLineThicknessId(o.lineThickness),
    glyphType: normalizeIssGlyphTypeId(o.glyphType),
    glyphSize: normalizeIssGlyphSizeId(o.glyphSize),
    dotColor: normalizeIssPresentationColorCss(o.dotColor, DEFAULT_ISS_DOT_COLOR),
    glyphColor: normalizeIssPresentationColorCss(o.glyphColor, DEFAULT_ISS_GLYPH_COLOR),
    labelEnabled: normalizeIssBoolean(o.labelEnabled, DEFAULT_ISS_LABEL_ENABLED),
  };
}
