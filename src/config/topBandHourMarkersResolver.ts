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
import type { DisplayTimeMode } from "../core/chromeTimeDomain.ts";
import {
  resolvedAuthoredIndicatorEntriesAreaBackgroundColor,
  resolvedHourMarkerLayoutSizeMultiplier,
} from "./appConfig.ts";
import { resolveEffectiveProductTextFontAssetId } from "./productTextFont.ts";
import type {
  EffectiveAnalogClockResolvedAppearance,
  EffectiveNoonMidnightCustomization,
  EffectiveTwentyFourHourAnchorCustomization,
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
 * Radial line: default line color is the indicator row’s contrast foreground. Optional `appearance.lineColor`
 * overrides line ink. Face fill defaults to the analog face policy (blend row background toward resolved line ink at
 * t = 0.25); optional `appearance.faceColor` overrides that disk fill.
 */
function resolveRadialLineResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "radialLine" }>,
  indicatorEntriesArea: {
    effectiveBackgroundColor: string;
    effectiveForegroundColor: "#000000" | "#ffffff";
  },
): EffectiveRadialLineResolvedAppearance {
  const lineFromAppearance = normalizeMarkerColor(r.appearance.lineColor);
  const faceFromAppearance = normalizeMarkerColor(r.appearance.faceColor);
  const defaultLine = indicatorEntriesArea.effectiveForegroundColor;
  const lineColor = lineFromAppearance !== undefined ? lineFromAppearance : defaultLine;
  const derivedFaceFill = interpolateRgbStringBetweenCssColors(
    indicatorEntriesArea.effectiveBackgroundColor,
    lineColor,
    0.25,
  );
  const faceFill = faceFromAppearance !== undefined ? faceFromAppearance : derivedFaceFill;
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
 * Radial wedge: default annulus fill blends row background toward contrast foreground at
 * {@link RADIAL_WEDGE_DEFAULT_FILL_BLEND_T} (`appearance.fillColor` overrides). Default edge stroke uses contrast
 * foreground at {@link RADIAL_WEDGE_DEFAULT_STROKE_ALPHA} (`appearance.edgeColor` overrides the full stroke string).
 * Default disk face behind the wedge uses the analog face blend (t = 0.25); `appearance.faceColor` overrides.
 */
function resolveRadialWedgeResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "radialWedge" }>,
  indicatorEntriesArea: {
    effectiveBackgroundColor: string;
    effectiveForegroundColor: "#000000" | "#ffffff";
  },
): EffectiveRadialWedgeResolvedAppearance {
  const fillFromAppearance = normalizeMarkerColor(r.appearance.fillColor);
  const faceFromAppearance = normalizeMarkerColor(r.appearance.faceColor);
  const edgeFromAppearance = normalizeMarkerColor(r.appearance.edgeColor);
  const fg = indicatorEntriesArea.effectiveForegroundColor;
  const defaultFill = interpolateRgbStringBetweenCssColors(
    indicatorEntriesArea.effectiveBackgroundColor,
    fg,
    RADIAL_WEDGE_DEFAULT_FILL_BLEND_T,
  );
  const defaultStroke = rgbaForegroundWithAlpha(fg, RADIAL_WEDGE_DEFAULT_STROKE_ALPHA);
  const defaultFaceFill = interpolateRgbStringBetweenCssColors(
    indicatorEntriesArea.effectiveBackgroundColor,
    fg,
    0.25,
  );
  return {
    fillColor: fillFromAppearance !== undefined ? fillFromAppearance : defaultFill,
    strokeColor: edgeFromAppearance !== undefined ? edgeFromAppearance : defaultStroke,
    faceFill: faceFromAppearance !== undefined ? faceFromAppearance : defaultFaceFill,
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
 * Derived placement: text hour labels move with the civil-phased tape; procedural glyphs anchor to structural columns.
 * Not authored — {@link HourMarkersConfig} has no behavior field.
 */
export function defaultBehaviorFor(kind: HourMarkersRealizationConfig["kind"]): EffectiveTopBandHourMarkerBehavior {
  return kind === "text" ? "civilPhased" : "civilColumnAnchored";
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
  displayTimeMode: DisplayTimeMode,
): EffectiveNoonMidnightCustomization {
  /** Noon/midnight emphasis is a civil 12-hour presentation convention only. */
  if (displayTimeMode !== "12hr") {
    return { enabled: false };
  }
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

function resolveEffectiveTwentyFourHourAnchorCustomization(
  hm: HourMarkersConfig,
  indicatorEntriesArea: {
    effectiveBackgroundColor: string;
    effectiveForegroundColor: "#000000" | "#ffffff";
  },
  displayTimeMode: DisplayTimeMode,
): EffectiveTwentyFourHourAnchorCustomization {
  /** Numeric `00` / `12` emphasis applies only in 24-hour civil presentation (not UTC-style mode). */
  if (displayTimeMode !== "24hr") {
    return { enabled: false };
  }
  if (hm.realization.kind !== "text") {
    return { enabled: false };
  }
  const raw = hm.noonMidnightCustomization;
  if (raw?.enabled !== true) {
    return { enabled: false };
  }
  return {
    enabled: true,
    boxedNumberBoxColor: halfwayRgbStringBetweenCssColors(
      indicatorEntriesArea.effectiveBackgroundColor,
      indicatorEntriesArea.effectiveForegroundColor,
    ),
  };
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
  options?: { displayTimeMode?: DisplayTimeMode },
): EffectiveTopBandHourMarkers {
  const displayTimeMode: DisplayTimeMode = options?.displayTimeMode ?? "12hr";
  const hm = layout.hourMarkers;
  const areaVisible = hm.indicatorEntriesAreaVisible !== false;
  const indicatorEntriesArea = resolveIndicatorEntriesAreaEffective(layout);
  const noonMidnightCustomization = resolveEffectiveNoonMidnightCustomization(
    hm,
    indicatorEntriesArea,
    displayTimeMode,
  );
  const twentyFourHourAnchorCustomization = resolveEffectiveTwentyFourHourAnchorCustomization(
    hm,
    indicatorEntriesArea,
    displayTimeMode,
  );
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

  const rk = hm.realization.kind;
  const behavior = resolveEffectiveHourMarkerBehavior(hm);

  if (rk === "text") {
    const textColor = normalizeMarkerColor(hm.realization.appearance.color);
    const fontAssetId = resolveEffectiveProductTextFontAssetId(layout, hm.realization.fontAssetId);
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
      twentyFourHourAnchorCustomization,
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
      twentyFourHourAnchorCustomization: { enabled: false },
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
      twentyFourHourAnchorCustomization: { enabled: false },
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
    twentyFourHourAnchorCustomization: { enabled: false },
  };
}
