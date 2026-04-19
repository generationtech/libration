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
}

export interface CityPinsPayload {
  kind: typeof CITY_PINS_KIND;
  cities: CityPinEntry[];
  showLabels: boolean;
  labelMode: CityPinsLabelMode;
  scale: CityPinsScale;
  /** Bundled font for pin name and time labels (resolved global default at layer construction). */
  labelFontAssetId: FontAssetId;
}

/** Options supplied at layer construction (same fields as the runtime payload except font id). */
export type CityPinsPresentationOptions = Pick<CityPinsPayload, "showLabels" | "labelMode" | "scale">;

export function isCityPinsPayload(data: unknown): data is CityPinsPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (o.kind !== CITY_PINS_KIND || !Array.isArray(o.cities)) return false;
  if (typeof o.showLabels !== "boolean") return false;
  if (o.labelMode !== "city" && o.labelMode !== "cityAndTime") return false;
  if (o.scale !== "small" && o.scale !== "medium" && o.scale !== "large") return false;
  if (typeof o.labelFontAssetId !== "string" || o.labelFontAssetId.trim() === "") return false;
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
  }
  return true;
}
