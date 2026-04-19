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
} from "./appConfig.ts";
import { PRODUCT_TEXT_FONT_VALID_ID_SET } from "./productFontConstants.ts";
import { clampHourMarkerContentRowPaddingPx } from "./topBandHourMarkerContentRowVerticalMetrics.ts";
import type {
  HourMarkersAnalogClockAppearance,
  HourMarkersConfig,
  HourMarkersNoonMidnightCustomization,
  HourMarkersNoonMidnightExpressionMode,
  HourMarkersRadialLineAppearance,
  HourMarkersRadialWedgeAppearance,
  HourMarkersRealizationConfig,
  HourMarkersTextAppearance,
} from "./topBandHourMarkersTypes.ts";

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
  const faceColor = normalizedTopBandHourMarkerColor(raw.faceColor);
  const out: HourMarkersRadialLineAppearance = {};
  if (lineColor !== undefined) {
    out.lineColor = lineColor;
  }
  if (faceColor !== undefined) {
    out.faceColor = faceColor;
  }
  return out;
}

function normalizeRadialWedgeAppearanceInput(raw: unknown): HourMarkersRadialWedgeAppearance {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (!isPlainObject(raw)) {
    return {};
  }
  const fillColor = normalizedTopBandHourMarkerColor(raw.fillColor);
  const faceColor = normalizedTopBandHourMarkerColor(raw.faceColor);
  const edgeColor = normalizedTopBandHourMarkerColor(raw.edgeColor);
  const out: HourMarkersRadialWedgeAppearance = {};
  if (fillColor !== undefined) {
    out.fillColor = fillColor;
  }
  if (faceColor !== undefined) {
    out.faceColor = faceColor;
  }
  if (edgeColor !== undefined) {
    out.edgeColor = edgeColor;
  }
  return out;
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

const NOON_MIDNIGHT_EXPRESSION_MODES = new Set<HourMarkersNoonMidnightExpressionMode>([
  "textWords",
  "boxedNumber",
  "solarLunarPictogram",
  "semanticGlyph",
]);

function normalizedNoonMidnightCustomization(
  raw: unknown,
): HourMarkersNoonMidnightCustomization | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isPlainObject(raw)) {
    return undefined;
  }
  if (raw.enabled !== true) {
    return undefined;
  }
  let expressionMode: HourMarkersNoonMidnightExpressionMode = "boxedNumber";
  const em = raw.expressionMode;
  if (typeof em === "string" && NOON_MIDNIGHT_EXPRESSION_MODES.has(em as HourMarkersNoonMidnightExpressionMode)) {
    expressionMode = em as HourMarkersNoonMidnightExpressionMode;
  }
  return { enabled: true, expressionMode };
}

/**
 * Coerces unknown `chrome.layout.hourMarkers` input to a normalized {@link HourMarkersConfig}.
 * Missing or invalid payloads yield {@link DEFAULT_HOUR_MARKERS_CONFIG} (cloned).
 * Obsolete boolean flags on legacy payloads are ignored. Legacy `behavior` is ignored (not persisted).
 */
export function normalizeHourMarkersInput(raw: unknown): HourMarkersConfig {
  if (raw === undefined || raw === null) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }
  if (!isPlainObject(raw)) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }

  const layoutNorm = normalizeHourMarkersLayoutFromRaw(raw.layout);
  if (layoutNorm === null) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }

  const indicatorEntriesAreaVisible = raw.indicatorEntriesAreaVisible !== false;
  const indicatorEntriesAreaBackgroundColor = normalizedTopBandHourMarkerColor(
    raw.indicatorEntriesAreaBackgroundColor,
  );

  const realizationRaw = raw.realization;
  if (!isPlainObject(realizationRaw)) {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }
  const kind = realizationRaw.kind;
  if (typeof kind !== "string") {
    return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
  }

  const noonMidnightOpt = normalizedNoonMidnightCustomization(raw.noonMidnightCustomization);

  if (kind === "text") {
    const fid = realizationRaw.fontAssetId;
    const appearance = normalizeTextAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig =
      typeof fid === "string" && PRODUCT_TEXT_FONT_VALID_ID_SET.has(fid)
        ? {
            kind: "text",
            fontAssetId: fid,
            appearance,
          }
        : {
            kind: "text",
            appearance,
          };
    return {
      indicatorEntriesAreaVisible,
      ...(indicatorEntriesAreaBackgroundColor !== undefined
        ? { indicatorEntriesAreaBackgroundColor }
        : {}),
      realization,
      layout: layoutNorm,
      ...(noonMidnightOpt !== undefined ? { noonMidnightCustomization: noonMidnightOpt } : {}),
    };
  }

  if (kind === "analogClock") {
    const appearance = normalizeAnalogClockAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "analogClock",
      appearance,
    };
    return {
      indicatorEntriesAreaVisible,
      ...(indicatorEntriesAreaBackgroundColor !== undefined
        ? { indicatorEntriesAreaBackgroundColor }
        : {}),
      realization,
      layout: layoutNorm,
      ...(noonMidnightOpt !== undefined ? { noonMidnightCustomization: noonMidnightOpt } : {}),
    };
  }

  if (kind === "radialLine") {
    const appearance = normalizeRadialLineAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "radialLine",
      appearance,
    };
    return {
      indicatorEntriesAreaVisible,
      ...(indicatorEntriesAreaBackgroundColor !== undefined
        ? { indicatorEntriesAreaBackgroundColor }
        : {}),
      realization,
      layout: layoutNorm,
      ...(noonMidnightOpt !== undefined ? { noonMidnightCustomization: noonMidnightOpt } : {}),
    };
  }

  if (kind === "radialWedge") {
    const appearance = normalizeRadialWedgeAppearanceInput(realizationRaw.appearance);
    const realization: HourMarkersRealizationConfig = {
      kind: "radialWedge",
      appearance,
    };
    return {
      indicatorEntriesAreaVisible,
      ...(indicatorEntriesAreaBackgroundColor !== undefined
        ? { indicatorEntriesAreaBackgroundColor }
        : {}),
      realization,
      layout: layoutNorm,
      ...(noonMidnightOpt !== undefined ? { noonMidnightCustomization: noonMidnightOpt } : {}),
    };
  }

  return cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG);
}
