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
 * Clouds v1 acquisition: NASA GIBS Band13 East/West/Himawari PNG stack.
 * validTimeMs is provider observation TIME. acquiredAtMs is fetch time.
 * Fixture producer remains for tests / DEV. Production does not fixture-as-live.
 */

import { createFixtureAcquisitionAdapter } from "./dynamicAcquisition";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import {
  CLOUDS_COVERAGE_NOTE,
} from "./cloudProvenance";
import { applyCloudHighlightTransfer } from "./cloudHighlightTransfer";
import {
  CLOUDS_GIBS_BAND13_LAYERS,
  CLOUDS_GIBS_SLOT_MS,
  CLOUDS_GIBS_TIME_SEARCH_STEPS,
  GIBS_WMS_GET_CAPABILITIES_URL,
  buildCloudsGibsWmsGetMapUrl,
  chooseCommonGibsStackTimeMs,
  floorToCloudsGibsSlotMs,
  formatCloudsGibsWmsTime,
  listCloudsObservationSearchTimesMs,
  parseGibsWmsLayerTimeDefault,
  wmsUrlHasExplicitTime,
} from "./cloudsGibsWms";
import {
  decodeCloudsPngRgba,
  encodeRgbaPng,
  validateCloudsPngBytes,
} from "./cloudsPng";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  getDynamicEquirectSourceCatalogEntry,
} from "./dynamicEquirectSourceCatalog";
import { fetchLiveHttpBytes } from "./liveHttpAcquisition";
import type {
  DynamicAcquisitionResult,
  DynamicSnapshotAcquisitionAdapter,
} from "./dynamicAcquisitionTypes";
import type { DynamicSourceId } from "./dynamicSnapshotTypes";
import type {
  LiveHttpFetchFn,
  LiveHttpFetchOk,
} from "./liveHttpAcquisitionTypes";

export const GLOBAL_CLOUDS_IR_ACQUIRE_TIMEOUT_MS = 15_000;

export const GLOBAL_CLOUDS_IR_LIVE_ACCEPT_CONTENT_TYPES = ["image/png"] as const;

export const GLOBAL_CLOUDS_IR_CAPABILITIES_ACCEPT_CONTENT_TYPES = [
  "application/vnd.ogc.wms_xml",
  "text/xml",
  "application/xml",
  "text/plain",
] as const;

/** @deprecated Use {@link buildCloudsGibsWmsGetMapUrl} with an explicit TIME. */
export const GLOBAL_CLOUDS_IR_LIVE_FEED_URL = buildCloudsGibsWmsGetMapUrl(
  Date.UTC(2026, 0, 1, 0, 0, 0),
);

export const GLOBAL_CLOUDS_IR_SCENE_LAYER_ID = "globalCloudsIr";

export type GlobalCloudsIrAcquireOptions = Readonly<{
  nowMs?: () => number;
  versionIdFor?: (observationTimeMs: number, acquiredAtMs: number) => string;
  observationTimeMs?: number;
}>;

export type GlobalCloudsIrLiveAcquireOptions = GlobalCloudsIrAcquireOptions &
  Readonly<{
    fetchFn?: LiveHttpFetchFn;
    /** Default false — production must not paint fixture clouds as live. */
    useFixtureFallback?: boolean;
    timeoutMs?: number;
    /** Production live GetMap must be 2048×1024. Tests may omit this. */
    requireGibsDimensions?: boolean;
  }>;

function encodeGlobalCloudsIrFixturePng(): Uint8Array {
  const width = 32;
  const height = 16;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const u = x / (width - 1);
      const v = y / (height - 1);
      const africaEurope = u > 0.42 && u < 0.62 && v > 0.22 && v < 0.72;
      const pole = v < 0.08 || v > 0.92;
      if (africaEurope || pole) {
        continue;
      }
      const cold = Math.sin(u * Math.PI * 3) > 0.35 && Math.sin(v * Math.PI * 4) > 0.2;
      const luma = cold ? 210 : 70;
      rgba[i] = luma;
      rgba[i + 1] = luma;
      rgba[i + 2] = luma;
      rgba[i + 3] = 255;
    }
  }
  const encoded = encodeRgbaPng(width, height, rgba);
  if (encoded === null) {
    throw new Error("failed to encode Clouds fixture PNG");
  }
  return encoded;
}

export function produceGlobalCloudsIrFixtureAcquisition(
  options: GlobalCloudsIrAcquireOptions = {},
  signal?: AbortSignal,
): DynamicAcquisitionResult {
  if (signal?.aborted) {
    return { ok: false, error: "aborted" };
  }
  const catalog = getDynamicEquirectSourceCatalogEntry(GLOBAL_CLOUDS_IR_SOURCE_ID);
  if (catalog === null) {
    return { ok: false, error: "missing catalog entry" };
  }
  const acquiredAtMs = (options.nowMs ?? Date.now)();
  if (!Number.isFinite(acquiredAtMs)) {
    return { ok: false, error: "invalid acquiredAtMs" };
  }
  const observationTimeMs =
    options.observationTimeMs !== undefined && Number.isFinite(options.observationTimeMs)
      ? floorToCloudsGibsSlotMs(options.observationTimeMs)
      : floorToCloudsGibsSlotMs(acquiredAtMs);
  const versionId =
    options.versionIdFor?.(observationTimeMs, acquiredAtMs) ??
    `clouds-ir-fixture-${observationTimeMs}`;
  const payloadBytes = encodeGlobalCloudsIrFixturePng();
  const record = buildDynamicSnapshotRecord(
    {
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      kind: "equirectRaster",
      versionId,
      acquiredAtMs,
      validTimeMs: observationTimeMs,
      origin: "fixture",
      attribution: catalog.attribution,
      ...(catalog.licenseNote !== undefined ? { licenseNote: catalog.licenseNote } : {}),
    },
    {
      kind: "equirectRaster",
      contentType: "image/png",
      lonMinDeg: -180,
      lonMaxDeg: 180,
      latMinDeg: -90,
      latMaxDeg: 90,
      byteLength: payloadBytes.byteLength,
      coverageKind: "partial",
      coverageNote: CLOUDS_COVERAGE_NOTE,
    },
  );
  if (record === null) {
    return { ok: false, error: "invalid snapshot record" };
  }
  return { ok: true, entry: { record, payloadBytes } };
}

export function produceGlobalCloudsIrLiveAcquisitionFromFetched(
  fetched: LiveHttpFetchOk,
  options: GlobalCloudsIrAcquireOptions &
    Readonly<{ requireGibsDimensions?: boolean }> = {},
  signal?: AbortSignal,
): DynamicAcquisitionResult {
  if (signal?.aborted) {
    return { ok: false, error: "aborted" };
  }
  const catalog = getDynamicEquirectSourceCatalogEntry(GLOBAL_CLOUDS_IR_SOURCE_ID);
  if (catalog === null) {
    return { ok: false, error: "missing catalog entry" };
  }
  if (options.observationTimeMs === undefined || !Number.isFinite(options.observationTimeMs)) {
    return { ok: false, error: "observation TIME required" };
  }
  const observationTimeMs = floorToCloudsGibsSlotMs(options.observationTimeMs);
  const timeLabel = formatCloudsGibsWmsTime(observationTimeMs);
  if (timeLabel === null) {
    return { ok: false, error: "invalid observation TIME" };
  }

  const validated = validateCloudsPngBytes(fetched.bytes, {
    requireGibsDimensions: options.requireGibsDimensions === true,
  });
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const acquiredAtMs = (options.nowMs ?? Date.now)();
  if (!Number.isFinite(acquiredAtMs)) {
    return { ok: false, error: "invalid acquiredAtMs" };
  }
  const versionId =
    options.versionIdFor?.(observationTimeMs, acquiredAtMs) ??
    `clouds-ir-live-${observationTimeMs}`;

  const record = buildDynamicSnapshotRecord(
    {
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      kind: "equirectRaster",
      versionId,
      acquiredAtMs,
      validTimeMs: observationTimeMs,
      origin: "live",
      attribution: catalog.attribution,
      ...(catalog.licenseNote !== undefined ? { licenseNote: catalog.licenseNote } : {}),
    },
    {
      kind: "equirectRaster",
      contentType: "image/png",
      lonMinDeg: -180,
      lonMaxDeg: 180,
      latMinDeg: -90,
      latMaxDeg: 90,
      byteLength: validated.byteLength,
      coverageKind: "partial",
      coverageNote: CLOUDS_COVERAGE_NOTE,
    },
  );
  if (record === null) {
    return { ok: false, error: "invalid snapshot record" };
  }
  return { ok: true, entry: { record, payloadBytes: fetched.bytes } };
}

export async function discoverCloudsObservationSearchTimesMs(options: {
  nowMs: () => number;
  fetchFn?: LiveHttpFetchFn;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<number[]> {
  const fallbackStart = floorToCloudsGibsSlotMs(options.nowMs()) - CLOUDS_GIBS_SLOT_MS;
  const caps = await fetchLiveHttpBytes({
    url: GIBS_WMS_GET_CAPABILITIES_URL,
    acceptContentTypes: GLOBAL_CLOUDS_IR_CAPABILITIES_ACCEPT_CONTENT_TYPES,
    timeoutMs: options.timeoutMs,
    signal: options.signal,
    ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
  });
  if (!caps.ok) {
    return listCloudsObservationSearchTimesMs(fallbackStart);
  }
  const xml = new TextDecoder("utf-8", { fatal: false }).decode(caps.bytes);
  const latest = CLOUDS_GIBS_BAND13_LAYERS.map((name) =>
    parseGibsWmsLayerTimeDefault(xml, name),
  );
  const common = chooseCommonGibsStackTimeMs(latest);
  const start = common ?? fallbackStart;
  return listCloudsObservationSearchTimesMs(start, CLOUDS_GIBS_TIME_SEARCH_STEPS);
}

export function createGlobalCloudsIrFixtureAcquisitionAdapter(
  options: GlobalCloudsIrAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  return createFixtureAcquisitionAdapter(
    GLOBAL_CLOUDS_IR_SOURCE_ID,
    (signal) => produceGlobalCloudsIrFixtureAcquisition(options, signal),
  );
}

export function createGlobalCloudsIrLiveHttpAcquisitionAdapter(
  options: GlobalCloudsIrLiveAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  const useFixtureFallback = options.useFixtureFallback === true;
  const requireGibsDimensions = options.requireGibsDimensions !== false;
  const timeoutMs =
    options.timeoutMs !== undefined &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : GLOBAL_CLOUDS_IR_ACQUIRE_TIMEOUT_MS;
  const nowMs = options.nowMs ?? Date.now;
  const acquireOptions: GlobalCloudsIrAcquireOptions = {
    nowMs,
    ...(options.versionIdFor !== undefined ? { versionIdFor: options.versionIdFor } : {}),
  };

  return {
    sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
    async acquire(signal?: AbortSignal): Promise<DynamicAcquisitionResult> {
      if (signal?.aborted) {
        return { ok: false, error: "aborted" };
      }
      const times = await discoverCloudsObservationSearchTimesMs({
        nowMs,
        timeoutMs,
        signal,
        ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
      });
      if (signal?.aborted) {
        return { ok: false, error: "aborted" };
      }
      if (times.length === 0) {
        if (useFixtureFallback) {
          return produceGlobalCloudsIrFixtureAcquisition(acquireOptions, signal);
        }
        return { ok: false, error: "no observation TIME candidates" };
      }

      let lastError = "no usable GIBS clouds mosaic";
      for (const observationTimeMs of times) {
        if (signal?.aborted) {
          return { ok: false, error: "aborted" };
        }
        const url = buildCloudsGibsWmsGetMapUrl(observationTimeMs);
        if (!wmsUrlHasExplicitTime(url)) {
          return { ok: false, error: "Clouds GetMap omitted TIME" };
        }
        const fetched = await fetchLiveHttpBytes({
          url,
          acceptContentTypes: GLOBAL_CLOUDS_IR_LIVE_ACCEPT_CONTENT_TYPES,
          timeoutMs,
          signal,
          ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
        });
        if (!fetched.ok) {
          if (fetched.aborted || signal?.aborted) {
            return { ok: false, error: "aborted" };
          }
          lastError = fetched.error;
          continue;
        }
        const mapped = produceGlobalCloudsIrLiveAcquisitionFromFetched(
          fetched,
          {
            ...acquireOptions,
            observationTimeMs,
            requireGibsDimensions,
          },
          signal,
        );
        if (mapped.ok) {
          return mapped;
        }
        lastError = mapped.error;
      }

      if (useFixtureFallback) {
        return produceGlobalCloudsIrFixtureAcquisition(acquireOptions, signal);
      }
      return { ok: false, error: lastError };
    },
  };
}

export function materializeCloudsHighlightStoreEntry(entry: {
  record: import("./dynamicSnapshotTypes").DynamicSnapshotRecord;
  payloadBytes?: Uint8Array;
}): { record: import("./dynamicSnapshotTypes").DynamicSnapshotRecord; payloadBytes: Uint8Array } | null {
  if (entry.record.body.kind !== "equirectRaster") return null;
  const bytes = entry.payloadBytes;
  if (bytes === undefined || bytes.byteLength === 0) return null;
  const decoded = decodeCloudsPngRgba(bytes);
  if (decoded === null) return null;
  const highlight = applyCloudHighlightTransfer(decoded.rgba);
  const encoded = encodeRgbaPng(decoded.width, decoded.height, highlight);
  if (encoded === null) return null;
  return {
    record: {
      meta: { ...entry.record.meta },
      body: {
        ...entry.record.body,
        contentType: "image/png",
        byteLength: encoded.byteLength,
      },
    },
    payloadBytes: encoded,
  };
}

export function isGlobalCloudsIrSourceId(sourceId: DynamicSourceId): boolean {
  return sourceId === GLOBAL_CLOUDS_IR_SOURCE_ID;
}
