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
  clampTopBandHourMarkerSizeMultiplier,
  cloneHourMarkersConfig,
  DEFAULT_HOUR_MARKERS_CONFIG,
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
} from "./appConfig.ts";
import type {
  EffectiveTopBandHourMarkerBehavior,
  HourMarkersAnalogClockAppearance,
  HourMarkersConfig,
  HourMarkersRadialLineAppearance,
  HourMarkersRadialWedgeAppearance,
  HourMarkersRealizationConfig,
} from "./topBandHourMarkersTypes.ts";
import type { FontAssetId } from "../typography/fontAssetTypes.ts";

const TOP_BAND_HOUR_MARKER_FONT_ID_SET = new Set<string>(TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS);

function normalizedTopBandHourMarkerColor(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const t = raw.trim();
  return t === "" ? undefined : t;
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function normalizedHourMarkerBehavior(raw: unknown): EffectiveTopBandHourMarkerBehavior | undefined {
  if (raw === "tapeAdvected" || raw === "staticZoneAnchored") {
    return raw;
  }
  return undefined;
}

function normalizeAnalogClockAppearanceInput(raw: unknown): HourMarkersAnalogClockAppearance | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const handColor = normalizedTopBandHourMarkerColor(raw.handColor);
  const faceColor = normalizedTopBandHourMarkerColor(raw.faceColor);
  if (handColor === undefined && faceColor === undefined) {
    return undefined;
  }
  return {
    ...(handColor !== undefined ? { handColor } : {}),
    ...(faceColor !== undefined ? { faceColor } : {}),
  };
}

function normalizeRadialLineAppearanceInput(raw: unknown): HourMarkersRadialLineAppearance | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const lineColor = normalizedTopBandHourMarkerColor(raw.lineColor);
  return lineColor !== undefined ? { lineColor } : undefined;
}

function normalizeRadialWedgeAppearanceInput(raw: unknown): HourMarkersRadialWedgeAppearance | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const fillColor = normalizedTopBandHourMarkerColor(raw.fillColor);
  return fillColor !== undefined ? { fillColor } : undefined;
}

/**
 * Coerces unknown `chrome.layout.hourMarkers` input to a normalized {@link HourMarkersConfig}.
 * Missing or invalid payloads yield {@link DEFAULT_HOUR_MARKERS_CONFIG} (cloned).
 */
export function normalizeHourMarkersInput(raw: unknown): HourMarkersConfig {
  if (raw === undefined || raw === null) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }
  if (!isPlainObject(raw)) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }
  if (typeof raw.customRepresentationEnabled !== "boolean") {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }

  const behaviorOpt = normalizedHourMarkerBehavior(raw.behavior);

  let sizeMultiplier = DEFAULT_HOUR_MARKERS_CONFIG.layout.sizeMultiplier;
  const layoutRaw = raw.layout;
  if (layoutRaw !== undefined) {
    if (!isPlainObject(layoutRaw)) {
      return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
    }
    const sm = layoutRaw.sizeMultiplier;
    if (typeof sm === "number" && Number.isFinite(sm)) {
      sizeMultiplier = clampTopBandHourMarkerSizeMultiplier(sm);
    }
  }

  if (!raw.customRepresentationEnabled) {
    return {
      customRepresentationEnabled: false,
      realization: {
        kind: "text",
        fontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
      },
      ...(behaviorOpt !== undefined ? { behavior: behaviorOpt } : {}),
      layout: { sizeMultiplier },
    };
  }

  const realizationRaw = raw.realization;
  if (!isPlainObject(realizationRaw)) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }
  const kind = realizationRaw.kind;
  if (typeof kind !== "string") {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }

  if (kind === "text") {
    const fid = realizationRaw.fontAssetId;
    let fontAssetId: FontAssetId;
    if (typeof fid === "string" && TOP_BAND_HOUR_MARKER_FONT_ID_SET.has(fid)) {
      fontAssetId = fid;
    } else {
      fontAssetId = DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
    }
    const color = normalizedTopBandHourMarkerColor(realizationRaw.color);
    const realization: HourMarkersRealizationConfig = {
      kind: "text",
      fontAssetId,
      ...(color !== undefined ? { color } : {}),
    };
    return {
      customRepresentationEnabled: true,
      realization,
      ...(behaviorOpt !== undefined ? { behavior: behaviorOpt } : {}),
      layout: { sizeMultiplier },
    };
  }

  if (kind === "analogClock") {
    const color = normalizedTopBandHourMarkerColor(realizationRaw.color);
    const appearance = normalizeAnalogClockAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "analogClock",
      ...(color !== undefined ? { color } : {}),
      ...(appearance !== undefined ? { appearance } : {}),
    };
    return {
      customRepresentationEnabled: true,
      realization,
      ...(behaviorOpt !== undefined ? { behavior: behaviorOpt } : {}),
      layout: { sizeMultiplier },
    };
  }

  if (kind === "radialLine") {
    const color = normalizedTopBandHourMarkerColor(realizationRaw.color);
    const appearance = normalizeRadialLineAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "radialLine",
      ...(color !== undefined ? { color } : {}),
      ...(appearance !== undefined ? { appearance } : {}),
    };
    return {
      customRepresentationEnabled: true,
      realization,
      ...(behaviorOpt !== undefined ? { behavior: behaviorOpt } : {}),
      layout: { sizeMultiplier },
    };
  }

  if (kind === "radialWedge") {
    const color = normalizedTopBandHourMarkerColor(realizationRaw.color);
    const appearance = normalizeRadialWedgeAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "radialWedge",
      ...(color !== undefined ? { color } : {}),
      ...(appearance !== undefined ? { appearance } : {}),
    };
    return {
      customRepresentationEnabled: true,
      realization,
      ...(behaviorOpt !== undefined ? { behavior: behaviorOpt } : {}),
      layout: { sizeMultiplier },
    };
  }

  return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
}
