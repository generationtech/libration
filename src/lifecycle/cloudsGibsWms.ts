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

/**
 * NASA GIBS WMS helpers for Clouds geostationary Band13 sectors.
 * TIME is always explicit — never omit it and never treat the provider default
 * as GetMap authority. WEATHER-3 fetches each layer independently so GOES-East
 * is not held back to Himawari's older slot.
 */

export const GIBS_WMS_ENDPOINT =
  "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";

export const GIBS_WMS_GET_CAPABILITIES_URL = `${GIBS_WMS_ENDPOINT}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities`;

export const CLOUDS_GIBS_GOES_WEST_LAYER = "GOES-West_ABI_Band13_Clean_Infrared";
export const CLOUDS_GIBS_GOES_EAST_LAYER = "GOES-East_ABI_Band13_Clean_Infrared";
export const CLOUDS_GIBS_HIMAWARI_LAYER = "Himawari_AHI_Band13_Clean_Infrared";

/**
 * WMS 1.1.1 draws first-listed first (bottom). Kept for tests of the former
 * stacked GetMap. Production Clouds v3 requests each layer separately.
 */
export const CLOUDS_GIBS_BAND13_LAYERS = [
  CLOUDS_GIBS_GOES_WEST_LAYER,
  CLOUDS_GIBS_GOES_EAST_LAYER,
  CLOUDS_GIBS_HIMAWARI_LAYER,
] as const;

export const CLOUDS_GIBS_WMS_LAYERS_PARAM = CLOUDS_GIBS_BAND13_LAYERS.join(",");

export const CLOUDS_GIBS_WIDTH_PX = 2048;
export const CLOUDS_GIBS_HEIGHT_PX = 1024;
export const CLOUDS_GIBS_SLOT_MS = 10 * 60 * 1000;
export const CLOUDS_GIBS_TIME_SEARCH_STEPS = 18;

const TIME_ISO_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}Z$/;

export function floorToCloudsGibsSlotMs(epochMs: number): number {
  if (!Number.isFinite(epochMs)) return Number.NaN;
  return Math.floor(epochMs / CLOUDS_GIBS_SLOT_MS) * CLOUDS_GIBS_SLOT_MS;
}

/** Provider-supported precision: 10-minute UTC slots, seconds always 00. */
export function formatCloudsGibsWmsTime(epochMs: number): string | null {
  const slotted = floorToCloudsGibsSlotMs(epochMs);
  if (!Number.isFinite(slotted)) return null;
  const iso = new Date(slotted).toISOString();
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}\.\d{3}Z$/.exec(iso);
  if (m === null) return null;
  return `${m[1]}:00Z`;
}

export function parseCloudsGibsWmsTimeMs(value: string): number | null {
  const trimmed = value.trim();
  if (!TIME_ISO_RE.test(trimmed) && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? floorToCloudsGibsSlotMs(parsed) : null;
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return floorToCloudsGibsSlotMs(parsed);
}

export function wmsUrlHasExplicitTime(url: string): boolean {
  return /[?&]TIME=[^&]+/i.test(url);
}

/**
 * Full-world GIBS WMS 1.1.1 GetMap for one Band13 sector. `observationTimeMs`
 * is required so TIME cannot be omitted.
 */
export function buildCloudsGibsSectorGetMapUrl(
  layer: string,
  observationTimeMs: number,
  size: { width: number; height: number } = {
    width: CLOUDS_GIBS_WIDTH_PX,
    height: CLOUDS_GIBS_HEIGHT_PX,
  },
): string {
  const time = formatCloudsGibsWmsTime(observationTimeMs);
  if (time === null) {
    throw new Error("Clouds GIBS GetMap requires a finite observation TIME");
  }
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: layer,
    STYLES: "",
    SRS: "EPSG:4326",
    BBOX: "-180,-90,180,90",
    WIDTH: String(size.width),
    HEIGHT: String(size.height),
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
    TIME: time,
  });
  return `${GIBS_WMS_ENDPOINT}?${params.toString()}`;
}

/**
 * @deprecated Stacked three-layer GetMap used by Clouds v1. Production v3
 * uses {@link buildCloudsGibsSectorGetMapUrl} per sector.
 */
export function buildCloudsGibsWmsGetMapUrl(observationTimeMs: number): string {
  return buildCloudsGibsSectorGetMapUrl(CLOUDS_GIBS_WMS_LAYERS_PARAM, observationTimeMs);
}

export function parseGibsWmsLayerTimeDefault(
  xml: string,
  layerName: string,
): number | null {
  if (typeof xml !== "string" || xml.length === 0) return null;
  const needle = `<Name>${layerName}</Name>`;
  const idx = xml.indexOf(needle);
  if (idx < 0) return null;
  const window = xml.slice(idx, idx + 16_000);
  const m = /<Extent\b[^>]*\bname="time"[^>]*\bdefault="([^"]+)"/i.exec(window);
  if (m === null || m[1] === undefined) return null;
  return parseCloudsGibsWmsTimeMs(m[1]);
}

/**
 * Latest usable common mosaic TIME: the earliest of the three layer defaults
 * so the stack is not mixed across wildly different observation slots.
 */
export function chooseCommonGibsStackTimeMs(
  layerLatestMs: readonly (number | null)[],
): number | null {
  const finite = layerLatestMs.filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n),
  );
  if (finite.length === 0) return null;
  return floorToCloudsGibsSlotMs(Math.min(...finite));
}

export function listCloudsObservationSearchTimesMs(
  startMs: number,
  steps: number = CLOUDS_GIBS_TIME_SEARCH_STEPS,
): number[] {
  const start = floorToCloudsGibsSlotMs(startMs);
  if (!Number.isFinite(start) || steps <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    out.push(start - i * CLOUDS_GIBS_SLOT_MS);
  }
  return out;
}
