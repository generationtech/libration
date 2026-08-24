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

export const CITY_PINS_KIND = "cityPinsEquirect" as const;

/** Label content for reference pins; custom pins omit local time at the layer. */
export type CityPinsLabelMode = "city" | "cityAndTime";

/** Marker and text sizing tier (bootstrap maps from derived app config). */
export type CityPinsScale = "small" | "medium" | "large";

const CITY_PIN_LABEL_WIDTH_PER_EM = 0.58;

export function cityPinScaleFactor(scale: CityPinsScale): number {
  return scale === "small" ? 0.82 : scale === "large" ? 1.22 : 1;
}

/** Painted city-pin disc radius in CSS pixels (same formula as the scene plan). */
export function cityPinDiscRadiusPx(
  viewportWidthPx: number,
  scale: CityPinsScale = "medium",
): number {
  return cityPinScaleFactor(scale) * Math.min(4, Math.max(2.5, viewportWidthPx * 0.0028));
}

/**
 * Screen-space axis-aligned box of the city-name line (left of the pin disc,
 * name to the right). Read-only layout handoff for lunar eclipse labels —
 * not a general layout manager.
 */
export function cityPinNameLabelScreenBox(args: {
  readonly pinX: number;
  readonly pinY: number;
  readonly name: string;
  readonly viewportWidthPx: number;
  readonly scale?: CityPinsScale;
}): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
  const scaleFactor = cityPinScaleFactor(args.scale ?? "medium");
  const r = cityPinDiscRadiusPx(args.viewportWidthPx, args.scale ?? "medium");
  const nameSize = scaleFactor * Math.min(13, Math.max(10, args.viewportWidthPx * 0.016));
  const left = args.pinX + r + 7 * scaleFactor;
  const width = Math.max(nameSize, args.name.length * nameSize * CITY_PIN_LABEL_WIDTH_PER_EM);
  const top = args.pinY - nameSize / 2;
  return { left, right: left + width, top, bottom: top + nameSize };
}

import type { PinDateTimeDisplayMode } from "../config/appConfig";
import type { DisplayTimeMode } from "../core/chromeTimeDomain";
import type { FontAssetId } from "../typography/fontAssetTypes";

/**
 * Equirectangular city markers: lon −180…180 left→right, lat +90…−90 top→bottom (matches base map).
 */
export interface CityPinEntry {
  id: string;
  name: string;
  latDeg: number;
  lonDeg: number;
  /** Preformatted local wall time for the current frame instant (Intl; timezone from dataset). */
  localTimeLabel: string;
  /**
   * Optional derived solar night veil (0–1) at this pin, aligned with planetary illumination;
   * used upstream to scale pin/label contrast on the night side.
   */
  readabilityNightVeil01?: number;
}

export interface CityPinsPayload {
  kind: typeof CITY_PINS_KIND;
  cities: CityPinEntry[];
  showLabels: boolean;
  labelMode: CityPinsLabelMode;
  scale: CityPinsScale;
  /** Resolved font for the city-name line (bundled id or renderer-default sentinel). */
  cityNameFontAssetId: FontAssetId;
  /** Resolved font for the date/time line (bundled id or renderer-default sentinel). */
  dateTimeFontAssetId: FontAssetId;
  /**
   * Substrate-aware scale for overlay readability lift (0.35–1), same for all pins this frame.
   * Omitted means 1.
   */
  overlayReadabilityLiftScale01?: number;
}

/** Options supplied at layer construction (payload fonts resolved at bootstrap; display mode shapes the time string). */
export type CityPinsPresentationOptions = Pick<CityPinsPayload, "showLabels" | "labelMode" | "scale"> & {
  pinDateTimeDisplayMode: PinDateTimeDisplayMode;
  /** Instrument-wide hour label policy (12h / 24h / UTC-style); must match {@link AppConfig.displayTime}. */
  displayTimeMode: DisplayTimeMode;
};

export function isCityPinsPayload(data: unknown): data is CityPinsPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (o.kind !== CITY_PINS_KIND || !Array.isArray(o.cities)) return false;
  if (typeof o.showLabels !== "boolean") return false;
  if (o.labelMode !== "city" && o.labelMode !== "cityAndTime") return false;
  if (o.scale !== "small" && o.scale !== "medium" && o.scale !== "large") return false;
  if (typeof o.cityNameFontAssetId !== "string" || o.cityNameFontAssetId.trim() === "") return false;
  if (typeof o.dateTimeFontAssetId !== "string" || o.dateTimeFontAssetId.trim() === "") return false;
  if (o.overlayReadabilityLiftScale01 !== undefined) {
    const ls = o.overlayReadabilityLiftScale01;
    if (typeof ls !== "number" || !Number.isFinite(ls) || ls < 0 || ls > 1) {
      return false;
    }
  }
  for (const c of o.cities) {
    if (c === null || typeof c !== "object") return false;
    const row = c as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.name !== "string" ||
      typeof row.latDeg !== "number" ||
      typeof row.lonDeg !== "number" ||
      typeof row.localTimeLabel !== "string"
    ) {
      return false;
    }
    if (row.readabilityNightVeil01 !== undefined) {
      const v = row.readabilityNightVeil01;
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
        return false;
      }
    }
  }
  return true;
}
