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
 * EUMETSAT EUMETView WMS helpers for Clouds v2 global geostationary-ring IR.
 * TIME is always explicit — never omit it and never treat the provider default
 * as GetMap authority.
 */

export const EUMET_WMS_ENDPOINT = "https://view.eumetsat.int/geoserver/wms";

export const EUMET_WMS_GET_CAPABILITIES_URL = `${EUMET_WMS_ENDPOINT}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;

export const CLOUDS_EUMET_LAYER_ID = "mumi:worldcloudmap_ir108";

export const CLOUDS_EUMET_WIDTH_PX = 2048;
export const CLOUDS_EUMET_HEIGHT_PX = 1024;
export const CLOUDS_EUMET_SLOT_MS = 3 * 60 * 60 * 1000;
export const CLOUDS_EUMET_TIME_SEARCH_STEPS = 4;

const TIME_ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function floorToCloudsEumetSlotMs(epochMs: number): number {
  if (!Number.isFinite(epochMs)) return Number.NaN;
  return Math.floor(epochMs / CLOUDS_EUMET_SLOT_MS) * CLOUDS_EUMET_SLOT_MS;
}

/** Provider-supported precision: 3-hour UTC slots (PT3H). Seconds always 00. */
export function formatCloudsEumetWmsTime(epochMs: number): string | null {
  const slotted = floorToCloudsEumetSlotMs(epochMs);
  if (!Number.isFinite(slotted)) return null;
  const iso = new Date(slotted).toISOString();
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}\.\d{3}Z$/.exec(iso);
  if (m === null) return null;
  return `${m[1]}:00Z`;
}

export function parseCloudsEumetWmsTimeMs(value: string): number | null {
  const trimmed = value.trim();
  if (!TIME_ISO_RE.test(trimmed) && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? floorToCloudsEumetSlotMs(parsed) : null;
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return floorToCloudsEumetSlotMs(parsed);
}

/**
 * WMS 1.3.0 full-world GetMap. EPSG:4326 axis order is lat,lon so BBOX is
 * minLat,minLon,maxLat,maxLon. `observationTimeMs` is required so TIME cannot
 * be omitted.
 */
export function buildCloudsEumetWmsGetMapUrl(observationTimeMs: number): string {
  const time = formatCloudsEumetWmsTime(observationTimeMs);
  if (time === null) {
    throw new Error("Clouds EUMETView GetMap requires a finite observation TIME");
  }
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: CLOUDS_EUMET_LAYER_ID,
    STYLES: "",
    CRS: "EPSG:4326",
    BBOX: "-90,-180,90,180",
    WIDTH: String(CLOUDS_EUMET_WIDTH_PX),
    HEIGHT: String(CLOUDS_EUMET_HEIGHT_PX),
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
    TIME: time,
  });
  return `${EUMET_WMS_ENDPOINT}?${params.toString()}`;
}

export function parseEumetWmsLayerTimeDefault(
  xml: string,
  layerName: string = CLOUDS_EUMET_LAYER_ID,
): number | null {
  if (typeof xml !== "string" || xml.length === 0) return null;
  const escaped = layerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameRe = new RegExp(`<Name>\\s*${escaped}\\s*</Name>`);
  const mName = nameRe.exec(xml);
  if (mName === null || mName.index === undefined) return null;
  const window = xml.slice(mName.index, mName.index + 8_000);
  const dim =
    /<Dimension\b[^>]*\bname="time"[^>]*\bdefault="([^"]+)"/i.exec(window) ??
    /<Extent\b[^>]*\bname="time"[^>]*\bdefault="([^"]+)"/i.exec(window);
  if (dim === null || dim[1] === undefined) return null;
  return parseCloudsEumetWmsTimeMs(dim[1]);
}

export function listCloudsEumetObservationSearchTimesMs(
  startMs: number,
  steps: number = CLOUDS_EUMET_TIME_SEARCH_STEPS,
): number[] {
  const start = floorToCloudsEumetSlotMs(startMs);
  if (!Number.isFinite(start) || steps <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    out.push(start - i * CLOUDS_EUMET_SLOT_MS);
  }
  return out;
}
