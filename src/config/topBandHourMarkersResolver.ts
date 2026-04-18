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
import { halfwayRgbStringBetweenCssColors } from "../color/halfwayRgbBetweenCssColors.ts";
import type { DisplayChromeLayoutConfig } from "./appConfig.ts";
import {
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  resolvedAuthoredIndicatorEntriesAreaBackgroundColor,
  resolvedHourMarkerLayoutSizeMultiplier,
} from "./appConfig.ts";
import { DEFAULT_ANALOG_FACE_FILL } from "./topBandHourMarkersDefaults.ts";
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
 * Analog clock ink: ring and hand default to {@link derivedForeground}, i.e. black/white contrast against the
 * **indicator entries area background** only. Optional `appearance.handColor` overrides
 * both strokes (author intent). Face fill defaults to {@link DEFAULT_ANALOG_FACE_FILL} and is not auto-contrasted
 * against the indicator row — that keeps clock-face styling separate from row background ownership.
 */
function resolveAnalogClockResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "analogClock" }>,
  derivedForeground: "#000000" | "#ffffff",
): EffectiveAnalogClockResolvedAppearance {
  const a = r.appearance;
  const handTint = normalizeMarkerColor(a.handColor);
  const faceFromAppearance = normalizeMarkerColor(a.faceColor);
  const ringStroke = handTint !== undefined ? handTint : derivedForeground;
  const handStroke = handTint !== undefined ? handTint : derivedForeground;
  const faceFill = faceFromAppearance !== undefined ? faceFromAppearance : DEFAULT_ANALOG_FACE_FILL;
  return { ringStroke, handStroke, faceFill };
}

function resolveRadialLineResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "radialLine" }>,
  defaultLine: string,
): EffectiveRadialLineResolvedAppearance {
  const fromAppearance = normalizeMarkerColor(r.appearance.lineColor);
  return { lineColor: fromAppearance !== undefined ? fromAppearance : defaultLine };
}

function resolveRadialWedgeResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "radialWedge" }>,
  defaultFill: string,
): EffectiveRadialWedgeResolvedAppearance {
  const fromAppearance = normalizeMarkerColor(r.appearance.fillColor);
  return { fillColor: fromAppearance !== undefined ? fromAppearance : defaultFill };
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

/** Default phased-vs-structural placement when `hourMarkers.behavior` is unset. */
export function defaultBehaviorFor(kind: HourMarkersRealizationConfig["kind"]): EffectiveTopBandHourMarkerBehavior {
  return kind === "analogClock" ? "staticZoneAnchored" : "tapeAdvected";
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
  const expressionMode = normalizeNoonMidnightExpressionMode(raw.expressionMode) ?? "textWords";
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
 * Content follows realization kind; behavior uses persisted `hourMarkers.behavior` when set, else
 * {@link defaultBehaviorFor} for the realization kind.
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
  const defaultWedgeFill = rgbaForegroundWithAlpha(derivedFg, 0.32);

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
  const behavior = hm.behavior ?? defaultBehaviorFor(rk);

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
        resolvedAppearance: resolveAnalogClockResolvedAppearance(r, derivedFg),
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
      content: { kind: "hour24" },
      realization: {
        kind: "radialLine",
        resolvedAppearance: resolveRadialLineResolvedAppearance(r, derivedFg),
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
    content: { kind: "hour24" },
    realization: {
      kind: "radialWedge",
      resolvedAppearance: resolveRadialWedgeResolvedAppearance(r, defaultWedgeFill),
    },
    layout: layoutOut,
    noonMidnightCustomization,
    ...(tapeHourNumberOverlay !== undefined ? { tapeHourNumberOverlay } : {}),
  };
}
