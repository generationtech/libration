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

import type { DisplayChromeLayoutConfig } from "./appConfig.ts";
import {
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  resolvedHourMarkerLayoutSizeMultiplier,
} from "./appConfig.ts";
import {
  DEFAULT_ANALOG_FACE_FILL,
  DEFAULT_ANALOG_HAND_COLOR,
  DEFAULT_ANALOG_RING_COLOR,
} from "./topBandHourMarkersDefaults.ts";
import { getTopChromeStyle } from "./topChromeStyle.ts";
import type {
  EffectiveAnalogClockResolvedAppearance,
  EffectiveTopBandHourMarkerBehavior,
  EffectiveTopBandHourMarkers,
  EffectiveTopBandHourMarkerRealization,
  EffectiveRadialLineResolvedAppearance,
  EffectiveRadialWedgeResolvedAppearance,
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

function resolveAnalogClockResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "analogClock" }>,
): EffectiveAnalogClockResolvedAppearance {
  const a = r.appearance;
  const handTint = normalizeMarkerColor(a.handColor);
  const faceFromAppearance = normalizeMarkerColor(a.faceColor);
  const ringStroke = handTint !== undefined ? handTint : DEFAULT_ANALOG_RING_COLOR;
  const handStroke = handTint !== undefined ? handTint : DEFAULT_ANALOG_HAND_COLOR;
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

/** Default phased-vs-structural placement when `hourMarkers.behavior` is unset. */
export function defaultBehaviorFor(kind: HourMarkersRealizationConfig["kind"]): EffectiveTopBandHourMarkerBehavior {
  return kind === "analogClock" ? "staticZoneAnchored" : "tapeAdvected";
}

/**
 * Resolves {@link EffectiveTopBandHourMarkers} from {@link DisplayChromeLayoutConfig.hourMarkers}.
 * Content follows realization kind; behavior uses persisted `hourMarkers.behavior` when set, else
 * {@link defaultBehaviorFor} for the realization kind.
 */
export function resolveEffectiveTopBandHourMarkers(
  layout: DisplayChromeLayoutConfig,
): EffectiveTopBandHourMarkers {
  const hm = layout.hourMarkers;
  const entriesEnabled = hm.indicatorEntriesAreaVisible !== false;
  const ink = getTopChromeStyle(layout.topChromePalette).hourIndicatorEntries;
  const defaultTextOrLineInk = ink.defaultForeground;
  const defaultWedgeFill = ink.defaultRadialWedgeFill;

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
        color: textColor !== undefined ? textColor : defaultTextOrLineInk,
      },
    };
    return {
      enabled: entriesEnabled,
      behavior,
      content: { kind: "hour24" },
      realization,
      layout: layoutOut,
      ...(tapeHourNumberOverlay !== undefined ? { tapeHourNumberOverlay } : {}),
    };
  }

  if (rk === "analogClock") {
    const r = hm.realization;
    return {
      enabled: entriesEnabled,
      behavior,
      content: { kind: "localWallClock" },
      realization: {
        kind: "analogClock",
        resolvedAppearance: resolveAnalogClockResolvedAppearance(r),
      },
      layout: layoutOut,
      ...(tapeHourNumberOverlay !== undefined ? { tapeHourNumberOverlay } : {}),
    };
  }

  if (rk === "radialLine") {
    const r = hm.realization;
    return {
      enabled: entriesEnabled,
      behavior,
      content: { kind: "hour24" },
      realization: {
        kind: "radialLine",
        resolvedAppearance: resolveRadialLineResolvedAppearance(r, defaultTextOrLineInk),
      },
      layout: layoutOut,
      ...(tapeHourNumberOverlay !== undefined ? { tapeHourNumberOverlay } : {}),
    };
  }

  const r = hm.realization;
  return {
    enabled: entriesEnabled,
    behavior,
    content: { kind: "hour24" },
    realization: {
      kind: "radialWedge",
      resolvedAppearance: resolveRadialWedgeResolvedAppearance(r, defaultWedgeFill),
    },
    layout: layoutOut,
    ...(tapeHourNumberOverlay !== undefined ? { tapeHourNumberOverlay } : {}),
  };
}
