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
import { clampHourMarkerContentRowPaddingPx } from "./topBandHourMarkerContentRowVerticalMetrics.ts";
import type {
  EffectiveTopBandHourMarkerBehavior,
  HourMarkersAnalogClockAppearance,
  HourMarkersConfig,
  HourMarkersRadialLineAppearance,
  HourMarkersRadialWedgeAppearance,
  HourMarkersRealizationConfig,
  HourMarkersTapeHourNumberOverlay,
  HourMarkersTextAppearance,
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

function normalizeTextAppearanceInput(raw: unknown): HourMarkersTextAppearance {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (!isPlainObject(raw)) {
    return {};
  }
  const color = normalizedTopBandHourMarkerColor(raw.color);
  return color !== undefined ? { color } : {};
}

function normalizeAnalogClockAppearanceInput(raw: unknown): HourMarkersAnalogClockAppearance {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (!isPlainObject(raw)) {
    return {};
  }
  const handColor = normalizedTopBandHourMarkerColor(raw.handColor);
  const faceColor = normalizedTopBandHourMarkerColor(raw.faceColor);
  const out: HourMarkersAnalogClockAppearance = {};
  if (handColor !== undefined) {
    out.handColor = handColor;
  }
  if (faceColor !== undefined) {
    out.faceColor = faceColor;
  }
  return out;
}

function normalizeRadialLineAppearanceInput(raw: unknown): HourMarkersRadialLineAppearance {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (!isPlainObject(raw)) {
    return {};
  }
  const lineColor = normalizedTopBandHourMarkerColor(raw.lineColor);
  return lineColor !== undefined ? { lineColor } : {};
}

function normalizeRadialWedgeAppearanceInput(raw: unknown): HourMarkersRadialWedgeAppearance {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (!isPlainObject(raw)) {
    return {};
  }
  const fillColor = normalizedTopBandHourMarkerColor(raw.fillColor);
  return fillColor !== undefined ? { fillColor } : {};
}

/**
 * Normalizes `hourMarkers.layout` including optional content-row padding overrides.
 * Returns `null` when `layout` is present but not a plain object (invalid payload).
 */
function normalizeHourMarkersLayoutFromRaw(layoutRaw: unknown): HourMarkersConfig["layout"] | null {
  if (layoutRaw === undefined) {
    return { sizeMultiplier: DEFAULT_HOUR_MARKERS_CONFIG.layout.sizeMultiplier };
  }
  if (!isPlainObject(layoutRaw)) {
    return null;
  }
  let sizeMultiplier = DEFAULT_HOUR_MARKERS_CONFIG.layout.sizeMultiplier;
  const sm = layoutRaw.sizeMultiplier;
  if (typeof sm === "number" && Number.isFinite(sm)) {
    sizeMultiplier = clampTopBandHourMarkerSizeMultiplier(sm);
  }
  const out: HourMarkersConfig["layout"] = { sizeMultiplier };

  let top: number | undefined;
  let bottom: number | undefined;
  const ct = layoutRaw.contentPaddingTopPx;
  const cb = layoutRaw.contentPaddingBottomPx;
  if (typeof ct === "number" && Number.isFinite(ct)) {
    top = clampHourMarkerContentRowPaddingPx(ct);
  } else if (typeof layoutRaw.textTopMarginPx === "number" && Number.isFinite(layoutRaw.textTopMarginPx)) {
    top = clampHourMarkerContentRowPaddingPx(layoutRaw.textTopMarginPx);
  }
  if (typeof cb === "number" && Number.isFinite(cb)) {
    bottom = clampHourMarkerContentRowPaddingPx(cb);
  } else if (
    typeof layoutRaw.textBottomMarginPx === "number" &&
    Number.isFinite(layoutRaw.textBottomMarginPx)
  ) {
    bottom = clampHourMarkerContentRowPaddingPx(layoutRaw.textBottomMarginPx);
  }
  if (top !== undefined) {
    out.contentPaddingTopPx = top;
  }
  if (bottom !== undefined) {
    out.contentPaddingBottomPx = bottom;
  }
  return out;
}

function normalizedTapeHourNumberOverlay(
  raw: unknown,
  realizationKind: string,
): HourMarkersTapeHourNumberOverlay | undefined {
  if (realizationKind === "text") {
    return undefined;
  }
  if (!isPlainObject(raw)) {
    return undefined;
  }
  if (raw.enabled === true) {
    return { enabled: true };
  }
  return undefined;
}

/**
 * Coerces unknown `chrome.layout.hourMarkers` input to a normalized {@link HourMarkersConfig}.
 * Missing or invalid payloads yield {@link DEFAULT_HOUR_MARKERS_CONFIG} (cloned).
 * Obsolete boolean flags on legacy payloads are ignored; only structured realization, layout, and behavior are canonical.
 */
export function normalizeHourMarkersInput(raw: unknown): HourMarkersConfig {
  if (raw === undefined || raw === null) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }
  if (!isPlainObject(raw)) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }

  const behaviorOpt = normalizedHourMarkerBehavior(raw.behavior);

  const layoutNorm = normalizeHourMarkersLayoutFromRaw(raw.layout);
  if (layoutNorm === null) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }

  const realizationRaw = raw.realization;
  if (!isPlainObject(realizationRaw)) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }
  const kind = realizationRaw.kind;
  if (typeof kind !== "string") {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }

  const tapeOpt = normalizedTapeHourNumberOverlay(raw.tapeHourNumberOverlay, kind);

  if (kind === "text") {
    const fid = realizationRaw.fontAssetId;
    let fontAssetId: FontAssetId;
    if (typeof fid === "string" && TOP_BAND_HOUR_MARKER_FONT_ID_SET.has(fid)) {
      fontAssetId = fid;
    } else {
      fontAssetId = DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
    }
    const appearance = normalizeTextAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "text",
      fontAssetId,
      appearance,
    };
    return {
      realization,
      ...(behaviorOpt !== undefined ? { behavior: behaviorOpt } : {}),
      layout: layoutNorm,
      ...(tapeOpt !== undefined ? { tapeHourNumberOverlay: tapeOpt } : {}),
    };
  }

  if (kind === "analogClock") {
    const appearance = normalizeAnalogClockAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "analogClock",
      appearance,
    };
    return {
      realization,
      ...(behaviorOpt !== undefined ? { behavior: behaviorOpt } : {}),
      layout: layoutNorm,
      ...(tapeOpt !== undefined ? { tapeHourNumberOverlay: tapeOpt } : {}),
    };
  }

  if (kind === "radialLine") {
    const appearance = normalizeRadialLineAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "radialLine",
      appearance,
    };
    return {
      realization,
      ...(behaviorOpt !== undefined ? { behavior: behaviorOpt } : {}),
      layout: layoutNorm,
      ...(tapeOpt !== undefined ? { tapeHourNumberOverlay: tapeOpt } : {}),
    };
  }

  if (kind === "radialWedge") {
    const appearance = normalizeRadialWedgeAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "radialWedge",
      appearance,
    };
    return {
      realization,
      ...(behaviorOpt !== undefined ? { behavior: behaviorOpt } : {}),
      layout: layoutNorm,
      ...(tapeOpt !== undefined ? { tapeHourNumberOverlay: tapeOpt } : {}),
    };
  }

  return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
}
