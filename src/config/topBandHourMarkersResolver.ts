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
import { DEFAULT_HOUR_MARKER_TEXT_FILL } from "../glyphs/glyphToRenderPlan.ts";
import { resolveHourMarkerGlyphStyle } from "../glyphs/glyphStyles.ts";
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
  const cf = resolveHourMarkerGlyphStyle("topBandHourAnalogClock").clockFace;
  const ringStroke = handTint !== undefined ? handTint : cf.ringStroke;
  const handStroke = handTint !== undefined ? handTint : cf.handStroke;
  const faceFill = faceFromAppearance !== undefined ? faceFromAppearance : cf.faceFill;
  return { ringStroke, handStroke, faceFill };
}

function resolveRadialLineResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "radialLine" }>,
): EffectiveRadialLineResolvedAppearance {
  const fromAppearance = normalizeMarkerColor(r.appearance.lineColor);
  const rl = resolveHourMarkerGlyphStyle("topBandHourDefault").radialLine;
  return { lineColor: fromAppearance !== undefined ? fromAppearance : rl.stroke };
}

function resolveRadialWedgeResolvedAppearance(
  r: Extract<HourMarkersRealizationConfig, { kind: "radialWedge" }>,
): EffectiveRadialWedgeResolvedAppearance {
  const fromAppearance = normalizeMarkerColor(r.appearance.fillColor);
  const rw = resolveHourMarkerGlyphStyle("topBandHourDefault").radialWedge;
  return { fillColor: fromAppearance !== undefined ? fromAppearance : rw.fill };
}

/** Default phased-vs-structural placement when `hourMarkers.behavior` is unset. */
export function defaultBehaviorFor(kind: HourMarkersRealizationConfig["kind"]): EffectiveTopBandHourMarkerBehavior {
  return kind === "analogClock" ? "staticZoneAnchored" : "tapeAdvected";
}

/**
 * Resolves {@link EffectiveTopBandHourMarkers} from {@link DisplayChromeLayoutConfig.hourMarkers}.
 * Content follows realization kind; behavior uses persisted `hourMarkers.behavior` when set, else
 * {@link defaultBehaviorFor} for the realization kind (or `"text"` when custom representation is off).
 */
export function resolveEffectiveTopBandHourMarkers(
  layout: DisplayChromeLayoutConfig,
): EffectiveTopBandHourMarkers {
  const hm = layout.hourMarkers;
  const sizeMultiplier = resolvedHourMarkerLayoutSizeMultiplier(layout);
  const layoutOut = { sizeMultiplier };

  if (!hm.customRepresentationEnabled) {
    /** Custom representation off: still draws default top-band hour markers — not surface-disabled. */
    return {
      enabled: true,
      behavior: hm.behavior ?? defaultBehaviorFor("text"),
      content: { kind: "hour24" },
      realization: {
        kind: "text",
        fontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
        resolvedAppearance: { color: DEFAULT_HOUR_MARKER_TEXT_FILL },
      },
      layout: layoutOut,
    };
  }

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
        color: textColor !== undefined ? textColor : DEFAULT_HOUR_MARKER_TEXT_FILL,
      },
    };
    return {
      enabled: true,
      behavior,
      content: { kind: "hour24" },
      realization,
      layout: layoutOut,
    };
  }

  if (rk === "analogClock") {
    const r = hm.realization;
    return {
      enabled: true,
      behavior,
      content: { kind: "localWallClock" },
      realization: {
        kind: "analogClock",
        resolvedAppearance: resolveAnalogClockResolvedAppearance(r),
      },
      layout: layoutOut,
    };
  }

  if (rk === "radialLine") {
    const r = hm.realization;
    return {
      enabled: true,
      behavior,
      content: { kind: "hour24" },
      realization: {
        kind: "radialLine",
        resolvedAppearance: resolveRadialLineResolvedAppearance(r),
      },
      layout: layoutOut,
    };
  }

  const r = hm.realization;
  return {
    enabled: true,
    behavior,
    content: { kind: "hour24" },
    realization: {
      kind: "radialWedge",
      resolvedAppearance: resolveRadialWedgeResolvedAppearance(r),
    },
    layout: layoutOut,
  };
}
