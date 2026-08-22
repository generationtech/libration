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
 * EUMETSAT EUMETView WMS helpers for Clouds: geostationary-ring IR backstop
 * (`mumi:worldcloudmap_ir108`) and Meteosat FES IR (`msg_fes:ir108`).
 * TIME is always explicit — never omit it and never treat the provider default
 * as GetMap authority.
 */

export const EUMET_WMS_ENDPOINT = "https://view.eumetsat.int/geoserver/wms";

export const EUMET_WMS_GET_CAPABILITIES_URL = `${EUMET_WMS_ENDPOINT}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;

export const CLOUDS_EUMET_LAYER_ID = "mumi:worldcloudmap_ir108";

/** Meteosat Full Earth Scan IR 10.8 µm (MSG). 15-minute slots. */
export const CLOUDS_MSG_FES_LAYER_ID = "msg_fes:ir108";

export const CLOUDS_EUMET_WIDTH_PX = 2048;
export const CLOUDS_EUMET_HEIGHT_PX = 1024;
export const CLOUDS_EUMET_SLOT_MS = 3 * 60 * 60 * 1000;
export const CLOUDS_EUMET_TIME_SEARCH_STEPS = 4;
export const CLOUDS_MSG_FES_SLOT_MS = 15 * 60 * 1000;
export const CLOUDS_MSG_FES_TIME_SEARCH_STEPS = 8;

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
export function buildCloudsEumetWmsGetMapUrl(
  observationTimeMs: number,
  size: { width: number; height: number } = {
    width: CLOUDS_EUMET_WIDTH_PX,
    height: CLOUDS_EUMET_HEIGHT_PX,
  },
): string {
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
    WIDTH: String(size.width),
    HEIGHT: String(size.height),
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
  const parsed = Date.parse(dim[1].trim());
  return Number.isFinite(parsed) ? parsed : null;
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

export function floorToCloudsMsgFesSlotMs(epochMs: number): number {
  if (!Number.isFinite(epochMs)) return Number.NaN;
  return Math.floor(epochMs / CLOUDS_MSG_FES_SLOT_MS) * CLOUDS_MSG_FES_SLOT_MS;
}

export function formatCloudsMsgFesWmsTime(epochMs: number): string | null {
  const slotted = floorToCloudsMsgFesSlotMs(epochMs);
  if (!Number.isFinite(slotted)) return null;
  const iso = new Date(slotted).toISOString();
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}\.\d{3}Z$/.exec(iso);
  if (m === null) return null;
  return `${m[1]}:00Z`;
}

export function parseCloudsMsgFesWmsTimeMs(value: string): number | null {
  const parsed = Date.parse(value.trim());
  if (!Number.isFinite(parsed)) return null;
  return floorToCloudsMsgFesSlotMs(parsed);
}

export function buildCloudsMsgFesWmsGetMapUrl(
  observationTimeMs: number,
  size: { width: number; height: number } = {
    width: CLOUDS_EUMET_WIDTH_PX,
    height: CLOUDS_EUMET_HEIGHT_PX,
  },
): string {
  const time = formatCloudsMsgFesWmsTime(observationTimeMs);
  if (time === null) {
    throw new Error("Clouds MSG FES GetMap requires a finite observation TIME");
  }
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: CLOUDS_MSG_FES_LAYER_ID,
    STYLES: "",
    CRS: "EPSG:4326",
    BBOX: "-90,-180,90,180",
    WIDTH: String(size.width),
    HEIGHT: String(size.height),
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
    TIME: time,
  });
  return `${EUMET_WMS_ENDPOINT}?${params.toString()}`;
}

export function parseEumetWmsLayerTimeDefaultMsgFes(xml: string): number | null {
  return parseEumetWmsLayerTimeDefault(xml, CLOUDS_MSG_FES_LAYER_ID);
}

export function listCloudsMsgFesObservationSearchTimesMs(
  startMs: number,
  steps: number = CLOUDS_MSG_FES_TIME_SEARCH_STEPS,
): number[] {
  const start = floorToCloudsMsgFesSlotMs(startMs);
  if (!Number.isFinite(start) || steps <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    out.push(start - i * CLOUDS_MSG_FES_SLOT_MS);
  }
  return out;
}
