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
  blackOrWhiteForegroundForBackgroundCss,
  rgbaForegroundWithAlpha,
} from "../color/contrastForegroundOnCssBackground.ts";
import {
  halfwayRgbStringBetweenCssColors,
  interpolateRgbStringBetweenCssColors,
} from "../color/halfwayRgbBetweenCssColors.ts";
import type { DisplayChromeLayoutConfig } from "./appConfig.ts";
import {
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  resolvedAuthoredIndicatorEntriesAreaBackgroundColor,
  resolvedHourMarkerLayoutSizeMultiplier,
} from "./appConfig.ts";
import type {
  EffectiveAnalogClockResolvedAppearance,
  EffectiveNoonMidnightCustomization,
  EffectiveTopBandHourMarkerBehavior,
  EffectiveTopBandHourMarkers,
  EffectiveTopBandHourMarkerRealization,
  EffectiveRadialLineResolvedAppearance,
  EffectiveRadialWedgeResolvedAppearance,
  HourMarkersConfig,
  HourMarkersNoonMidnightExpressionMode,
  HourMarkersRealizationConfig,
} from "./topBandHourMarkersTypes.ts";

/** Same trim/empty semantics as hour-marker selection color normalization in appConfig (invalid → no override). */
function normalizeMarkerColor(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const t = raw.trim();
  return t === "" ? undefined : t;
}

/**
 * Analog clock: ring and hand default to contrast foreground against the indicator entries area background;
 * optional `appearance.handColor` overrides both strokes. When `appearance.faceColor` is absent, face fill is one
 * quarter of the way from that background toward the resolved stroke color (linear sRGB channel interpolation).
 */
function resolveAnalogClockResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "analogClock" }>,
  indicatorEntriesArea: {
    effectiveBackgroundColor: string;
    effectiveForegroundColor: "#000000" | "#ffffff";
  },
): EffectiveAnalogClockResolvedAppearance {
  const a = r.appearance;
  const handTint = normalizeMarkerColor(a.handColor);
  const faceFromAppearance = normalizeMarkerColor(a.faceColor);
  const derivedForeground = indicatorEntriesArea.effectiveForegroundColor;
  const ringStroke = handTint !== undefined ? handTint : derivedForeground;
  const handStroke = handTint !== undefined ? handTint : derivedForeground;
  const faceFill =
    faceFromAppearance !== undefined
      ? faceFromAppearance
      : interpolateRgbStringBetweenCssColors(
          indicatorEntriesArea.effectiveBackgroundColor,
          ringStroke,
          0.25,
        );
  return { ringStroke, handStroke, faceFill };
}

/**
 * Radial line: default line color is the indicator row’s contrast foreground (`blackOrWhiteForegroundForBackgroundCss`
 * on the resolved row background). Optional `appearance.lineColor` overrides.
 */
function resolveRadialLineResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "radialLine" }>,
  indicatorEntriesArea: {
    effectiveBackgroundColor: string;
    effectiveForegroundColor: "#000000" | "#ffffff";
  },
): EffectiveRadialLineResolvedAppearance {
  const fromAppearance = normalizeMarkerColor(r.appearance.lineColor);
  const defaultLine = indicatorEntriesArea.effectiveForegroundColor;
  const lineColor = fromAppearance !== undefined ? fromAppearance : defaultLine;
  const faceFill = interpolateRgbStringBetweenCssColors(
    indicatorEntriesArea.effectiveBackgroundColor,
    lineColor,
    0.25,
  );
  return { lineColor, faceFill };
}

/**
 * Wedge outline: contrast foreground at this alpha tracks the resolved fg hue while reading clearly on the strip
 * (stronger than legacy ~0.45 so the edge stays visible against both default fill and row bed).
 */
const RADIAL_WEDGE_DEFAULT_STROKE_ALPHA = 0.72;

/**
 * Default wedge interior: blend from row background toward contrast foreground (same helper as analog face fill).
 * Uses t &gt; 0.5 (not midpoint) so the fill separates from the instrument strip more than a 50/50 mix, which looked
 * too close to the bed; t = 0.25 (analog face) would hug the background and reads weaker here.
 */
const RADIAL_WEDGE_DEFAULT_FILL_BLEND_T = 0.62;

/**
 * Radial wedge: default fill is interpolated between row background and contrast foreground at
 * {@link RADIAL_WEDGE_DEFAULT_FILL_BLEND_T}. Default wedge edge stroke uses contrast foreground at
 * {@link RADIAL_WEDGE_DEFAULT_STROKE_ALPHA}.
 */
function resolveRadialWedgeResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "radialWedge" }>,
  indicatorEntriesArea: {
    effectiveBackgroundColor: string;
    effectiveForegroundColor: "#000000" | "#ffffff";
  },
): EffectiveRadialWedgeResolvedAppearance {
  const fromAppearance = normalizeMarkerColor(r.appearance.fillColor);
  const fg = indicatorEntriesArea.effectiveForegroundColor;
  const defaultFill = interpolateRgbStringBetweenCssColors(
    indicatorEntriesArea.effectiveBackgroundColor,
    fg,
    RADIAL_WEDGE_DEFAULT_FILL_BLEND_T,
  );
  const strokeColor = rgbaForegroundWithAlpha(fg, RADIAL_WEDGE_DEFAULT_STROKE_ALPHA);
  const faceFill = interpolateRgbStringBetweenCssColors(
    indicatorEntriesArea.effectiveBackgroundColor,
    fg,
    0.25,
  );
  return {
    fillColor: fromAppearance !== undefined ? fromAppearance : defaultFill,
    strokeColor,
    faceFill,
  };
}

/**
 * Indicator entries row visuals: background comes only from {@link HourMarkersConfig.indicatorEntriesAreaBackgroundColor}
 * (after {@link resolvedAuthoredIndicatorEntriesAreaBackgroundColor}). Realization `appearance` fields never influence
 * this object — they affect marker ink only (see branches below).
 */
function resolveIndicatorEntriesAreaEffective(layout: DisplayChromeLayoutConfig): {
  effectiveBackgroundColor: string;
  effectiveForegroundColor: "#000000" | "#ffffff";
} {
  const effectiveBackgroundColor = resolvedAuthoredIndicatorEntriesAreaBackgroundColor(layout.hourMarkers);
  const effectiveForegroundColor = blackOrWhiteForegroundForBackgroundCss(effectiveBackgroundColor);
  return { effectiveBackgroundColor, effectiveForegroundColor };
}

/**
 * Derived placement: text hour labels advect with the longitude tape; procedural/clock glyphs anchor to structural zones.
 * Not authored — {@link HourMarkersConfig} has no behavior field.
 */
export function defaultBehaviorFor(kind: HourMarkersRealizationConfig["kind"]): EffectiveTopBandHourMarkerBehavior {
  return kind === "text" ? "tapeAdvected" : "staticZoneAnchored";
}

/**
 * Effective hour-marker placement from {@link HourMarkersConfig.realization.kind} only (legacy persisted `behavior` is ignored).
 */
export function resolveEffectiveHourMarkerBehavior(hm: HourMarkersConfig): EffectiveTopBandHourMarkerBehavior {
  return defaultBehaviorFor(hm.realization.kind);
}

const NOON_MIDNIGHT_EXPRESSION_MODES = new Set<HourMarkersNoonMidnightExpressionMode>([
  "textWords",
  "boxedNumber",
  "solarLunarPictogram",
  "semanticGlyph",
]);

function normalizeNoonMidnightExpressionMode(
  raw: unknown,
): HourMarkersNoonMidnightExpressionMode | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  return NOON_MIDNIGHT_EXPRESSION_MODES.has(raw as HourMarkersNoonMidnightExpressionMode)
    ? (raw as HourMarkersNoonMidnightExpressionMode)
    : undefined;
}

function resolveEffectiveNoonMidnightCustomization(
  hm: HourMarkersConfig,
  indicatorEntriesArea: {
    effectiveBackgroundColor: string;
    effectiveForegroundColor: "#000000" | "#ffffff";
  },
): EffectiveNoonMidnightCustomization {
  /** Authored noon/midnight intent applies only to text hour-marker realization (indicator-entry disk labels). */
  if (hm.realization.kind !== "text") {
    return { enabled: false };
  }
  const raw = hm.noonMidnightCustomization;
  if (raw?.enabled !== true) {
    return { enabled: false };
  }
  const expressionMode = normalizeNoonMidnightExpressionMode(raw.expressionMode) ?? "boxedNumber";
  if (expressionMode === "boxedNumber") {
    return {
      enabled: true,
      expressionMode,
      boxedNumberBoxColor: halfwayRgbStringBetweenCssColors(
        indicatorEntriesArea.effectiveBackgroundColor,
        indicatorEntriesArea.effectiveForegroundColor,
      ),
    };
  }
  return { enabled: true, expressionMode };
}

/**
 * Resolves {@link EffectiveTopBandHourMarkers} from {@link DisplayChromeLayoutConfig.hourMarkers}.
 * Content follows realization kind; behavior follows {@link resolveEffectiveHourMarkerBehavior} (derived from kind).
 *
 * `areaVisible` on the effective model mirrors `hourMarkers.indicatorEntriesAreaVisible` (default true):
 * it controls structural presence of the indicator entries band, not behavior or realization.
 */
export function resolveEffectiveTopBandHourMarkers(
  layout: DisplayChromeLayoutConfig,
): EffectiveTopBandHourMarkers {
  const hm = layout.hourMarkers;
  const areaVisible = hm.indicatorEntriesAreaVisible !== false;
  const indicatorEntriesArea = resolveIndicatorEntriesAreaEffective(layout);
  const noonMidnightCustomization = resolveEffectiveNoonMidnightCustomization(hm, indicatorEntriesArea);
  const derivedFg = indicatorEntriesArea.effectiveForegroundColor;

  const sizeMultiplier = resolvedHourMarkerLayoutSizeMultiplier(layout);
  const ly = hm.layout;
  const layoutOut: EffectiveTopBandHourMarkers["layout"] = { sizeMultiplier };
  if (ly.contentPaddingTopPx !== undefined) {
    layoutOut.contentPaddingTopPx = ly.contentPaddingTopPx;
  }
  if (ly.contentPaddingBottomPx !== undefined) {
    layoutOut.contentPaddingBottomPx = ly.contentPaddingBottomPx;
  }
  const tapeHourNumberOverlay =
    hm.realization.kind !== "text" && hm.tapeHourNumberOverlay?.enabled === true
      ? ({ enabled: true } as const)
      : undefined;

  const rk = hm.realization.kind;
  const behavior = resolveEffectiveHourMarkerBehavior(hm);

  if (rk === "text") {
    const textColor = normalizeMarkerColor(hm.realization.appearance.color);
    const fontAssetId =
      hm.realization.fontAssetId ?? DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
    const realization: EffectiveTopBandHourMarkerRealization = {
      kind: "text",
      fontAssetId,
      resolvedAppearance: {
        color: textColor !== undefined ? textColor : derivedFg,
      },
    };
    return {
      areaVisible,
      indicatorEntriesArea,
      behavior,
      content: { kind: "hour24" },
      realization,
      layout: layoutOut,
      noonMidnightCustomization,
      ...(tapeHourNumberOverlay !== undefined ? { tapeHourNumberOverlay } : {}),
    };
  }

  if (rk === "analogClock") {
    const r = hm.realization;
    return {
      areaVisible,
      indicatorEntriesArea,
      behavior,
      content: { kind: "localWallClock" },
      realization: {
        kind: "analogClock",
        resolvedAppearance: resolveAnalogClockResolvedAppearance(r, indicatorEntriesArea),
      },
      layout: layoutOut,
      noonMidnightCustomization,
      ...(tapeHourNumberOverlay !== undefined ? { tapeHourNumberOverlay } : {}),
    };
  }

  if (rk === "radialLine") {
    const r = hm.realization;
    return {
      areaVisible,
      indicatorEntriesArea,
      behavior,
      content: { kind: "localWallClock" },
      realization: {
        kind: "radialLine",
        resolvedAppearance: resolveRadialLineResolvedAppearance(r, indicatorEntriesArea),
      },
      layout: layoutOut,
      noonMidnightCustomization,
      ...(tapeHourNumberOverlay !== undefined ? { tapeHourNumberOverlay } : {}),
    };
  }

  const r = hm.realization;
  return {
    areaVisible,
    indicatorEntriesArea,
    behavior,
    content: { kind: "localWallClock" },
    realization: {
      kind: "radialWedge",
      resolvedAppearance: resolveRadialWedgeResolvedAppearance(r, indicatorEntriesArea),
    },
    layout: layoutOut,
    noonMidnightCustomization,
    ...(tapeHourNumberOverlay !== undefined ? { tapeHourNumberOverlay } : {}),
  };
}
