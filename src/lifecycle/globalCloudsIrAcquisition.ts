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
 * Clouds v2 acquisition: EUMETView geostationary-ring IR primary, NASA GIBS
 * Band13 stack as honest partial fallback. Durable sourceId stays
 * `global-clouds-ir-v1`. validTimeMs is provider observation TIME.
 * acquiredAtMs is fetch time. Production does not fixture-as-live.
 */

import { createFixtureAcquisitionAdapter } from "./dynamicAcquisition";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import {
  CLOUDS_EUMET_ATTRIBUTION,
  CLOUDS_EUMET_LICENSE_NOTE,
  CLOUDS_GIBS_ATTRIBUTION,
  CLOUDS_GIBS_LICENSE_NOTE,
  CLOUDS_GLOBAL_COVERAGE_NOTE,
  CLOUDS_PARTIAL_COVERAGE_NOTE,
} from "./cloudProvenance";
import {
  applyCloudHighlightTransfer,
  liftEumetIrLuma,
} from "./cloudHighlightTransfer";
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
  CLOUDS_EUMET_SLOT_MS,
  EUMET_WMS_GET_CAPABILITIES_URL,
  buildCloudsEumetWmsGetMapUrl,
  floorToCloudsEumetSlotMs,
  formatCloudsEumetWmsTime,
  listCloudsEumetObservationSearchTimesMs,
  parseEumetWmsLayerTimeDefault,
} from "./cloudsEumetWms";
import {
  CLOUDS_EUMET_MIN_USABLE_COVERAGE_RATIO,
  decodeCloudsPngRgba,
  encodeRgbaPng,
  validateCloudsPngBytes,
} from "./cloudsPng";
import {
  CLOUDS_PROVIDER_EUMET,
  CLOUDS_PROVIDER_GIBS,
  CLOUDS_EUMET_STALE_MAX_AGE_MS,
  CLOUDS_GIBS_STALE_MAX_AGE_MS,
  type CloudsProviderKind,
} from "./cloudsSourceSelection";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  getDynamicEquirectSourceCatalogEntry,
} from "./dynamicEquirectSourceCatalog";
import { fetchLiveHttpBytes } from "./liveHttpAcquisition";
import type {
  DynamicAcquisitionResult,
  DynamicSnapshotAcquisitionAdapter,
} from "./dynamicAcquisitionTypes";
import type {
  DynamicSnapshotRecord,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";
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

/** @deprecated Prefer {@link buildCloudsEumetWmsGetMapUrl}. Kept for tests. */
export const GLOBAL_CLOUDS_IR_LIVE_FEED_URL = buildCloudsEumetWmsGetMapUrl(
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
    requireMosaicDimensions?: boolean;
    /** @deprecated Use {@link requireMosaicDimensions}. */
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
      const pole = v < 0.08 || v > 0.92;
      if (pole) {
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

function providerAttribution(provider: CloudsProviderKind): {
  attribution: string;
  licenseNote: string;
} {
  if (provider === CLOUDS_PROVIDER_EUMET) {
    return {
      attribution: CLOUDS_EUMET_ATTRIBUTION,
      licenseNote: CLOUDS_EUMET_LICENSE_NOTE,
    };
  }
  return {
    attribution: CLOUDS_GIBS_ATTRIBUTION,
    licenseNote: CLOUDS_GIBS_LICENSE_NOTE,
  };
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
      coverageKind: "global",
      coverageNote: CLOUDS_GLOBAL_COVERAGE_NOTE,
      cloudProviderKind: CLOUDS_PROVIDER_EUMET,
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
    Readonly<{
      requireGibsDimensions?: boolean;
      requireMosaicDimensions?: boolean;
      providerKind?: CloudsProviderKind;
    }> = {},
  signal?: AbortSignal,
): DynamicAcquisitionResult {
  if (signal?.aborted) {
    return { ok: false, error: "aborted" };
  }
  if (options.observationTimeMs === undefined || !Number.isFinite(options.observationTimeMs)) {
    return { ok: false, error: "observation TIME required" };
  }
  const providerKind = options.providerKind ?? CLOUDS_PROVIDER_GIBS;
  const observationTimeMs =
    providerKind === CLOUDS_PROVIDER_EUMET
      ? floorToCloudsEumetSlotMs(options.observationTimeMs)
      : floorToCloudsGibsSlotMs(options.observationTimeMs);
  const timeLabel =
    providerKind === CLOUDS_PROVIDER_EUMET
      ? formatCloudsEumetWmsTime(observationTimeMs)
      : formatCloudsGibsWmsTime(observationTimeMs);
  if (timeLabel === null) {
    return { ok: false, error: "invalid observation TIME" };
  }

  const requireDimensions =
    options.requireMosaicDimensions === true || options.requireGibsDimensions === true;
  const validated = validateCloudsPngBytes(fetched.bytes, {
    ...(requireDimensions
      ? providerKind === CLOUDS_PROVIDER_EUMET
        ? { requireEumetDimensions: true }
        : { requireGibsDimensions: true }
      : {}),
    ...(providerKind === CLOUDS_PROVIDER_EUMET
      ? {
          minCoverageRatio: CLOUDS_EUMET_MIN_USABLE_COVERAGE_RATIO,
          requireAfricaEuropeCoverage: true,
        }
      : {}),
  });
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const acquiredAtMs = (options.nowMs ?? Date.now)();
  if (!Number.isFinite(acquiredAtMs)) {
    return { ok: false, error: "invalid acquiredAtMs" };
  }
  const credits = providerAttribution(providerKind);
  const versionId =
    options.versionIdFor?.(observationTimeMs, acquiredAtMs) ??
    `clouds-ir-live-${providerKind}-${observationTimeMs}`;
  const coverageKind = providerKind === CLOUDS_PROVIDER_EUMET ? "global" : "partial";

  const record = buildDynamicSnapshotRecord(
    {
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      kind: "equirectRaster",
      versionId,
      acquiredAtMs,
      validTimeMs: observationTimeMs,
      origin: "live",
      attribution: credits.attribution,
      licenseNote: credits.licenseNote,
    },
    {
      kind: "equirectRaster",
      contentType: "image/png",
      lonMinDeg: -180,
      lonMaxDeg: 180,
      latMinDeg: -90,
      latMaxDeg: 90,
      byteLength: validated.byteLength,
      coverageKind,
      coverageNote:
        coverageKind === "global"
          ? CLOUDS_GLOBAL_COVERAGE_NOTE
          : CLOUDS_PARTIAL_COVERAGE_NOTE,
      cloudProviderKind: providerKind,
    },
  );
  if (record === null) {
    return { ok: false, error: "invalid snapshot record" };
  }
  return { ok: true, entry: { record, payloadBytes: fetched.bytes } };
}

export async function discoverEumetObservationSearchTimesMs(options: {
  nowMs: () => number;
  fetchFn?: LiveHttpFetchFn;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<number[]> {
  const wall = options.nowMs();
  const fallbackStart = floorToCloudsEumetSlotMs(wall);
  const caps = await fetchLiveHttpBytes({
    url: EUMET_WMS_GET_CAPABILITIES_URL,
    acceptContentTypes: GLOBAL_CLOUDS_IR_CAPABILITIES_ACCEPT_CONTENT_TYPES,
    timeoutMs: options.timeoutMs,
    signal: options.signal,
    ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
  });
  if (!caps.ok) {
    return listCloudsEumetObservationSearchTimesMs(fallbackStart);
  }
  const xml = new TextDecoder("utf-8", { fatal: false }).decode(caps.bytes);
  const latest = parseEumetWmsLayerTimeDefault(xml);
  const start =
    latest !== null && latest <= wall + CLOUDS_EUMET_SLOT_MS
      ? latest
      : fallbackStart;
  return listCloudsEumetObservationSearchTimesMs(start);
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

async function acquireProviderMosaic(input: {
  times: readonly number[];
  buildUrl: (observationTimeMs: number) => string;
  providerKind: CloudsProviderKind;
  staleMaxAgeMs: number;
  nowMs: () => number;
  timeoutMs: number;
  signal?: AbortSignal;
  fetchFn?: LiveHttpFetchFn;
  requireMosaicDimensions: boolean;
  acquireOptions: GlobalCloudsIrAcquireOptions;
}): Promise<DynamicAcquisitionResult> {
  let lastError = `no usable ${input.providerKind} clouds mosaic`;
  for (const observationTimeMs of input.times) {
    if (input.signal?.aborted) {
      return { ok: false, error: "aborted" };
    }
    const ageMs = input.nowMs() - observationTimeMs;
    if (ageMs > input.staleMaxAgeMs) {
      lastError = `${input.providerKind} observation expired`;
      continue;
    }
    const url = input.buildUrl(observationTimeMs);
    if (!wmsUrlHasExplicitTime(url)) {
      return { ok: false, error: "Clouds GetMap omitted TIME" };
    }
    const fetched = await fetchLiveHttpBytes({
      url,
      acceptContentTypes: GLOBAL_CLOUDS_IR_LIVE_ACCEPT_CONTENT_TYPES,
      timeoutMs: input.timeoutMs,
      signal: input.signal,
      ...(input.fetchFn !== undefined ? { fetchFn: input.fetchFn } : {}),
    });
    if (!fetched.ok) {
      if (fetched.aborted || input.signal?.aborted) {
        return { ok: false, error: "aborted" };
      }
      lastError = fetched.error;
      continue;
    }
    const mapped = produceGlobalCloudsIrLiveAcquisitionFromFetched(
      fetched,
      {
        ...input.acquireOptions,
        observationTimeMs,
        providerKind: input.providerKind,
        requireMosaicDimensions: input.requireMosaicDimensions,
      },
      input.signal,
    );
    if (mapped.ok) {
      return mapped;
    }
    lastError = mapped.error;
  }
  return { ok: false, error: lastError };
}

export function createGlobalCloudsIrLiveHttpAcquisitionAdapter(
  options: GlobalCloudsIrLiveAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  const useFixtureFallback = options.useFixtureFallback === true;
  const requireMosaicDimensions =
    options.requireMosaicDimensions !== false && options.requireGibsDimensions !== false;
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
      const fetchOpts = {
        nowMs,
        timeoutMs,
        signal,
        ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
      };

      const eumetTimes = await discoverEumetObservationSearchTimesMs(fetchOpts);
      if (signal?.aborted) {
        return { ok: false, error: "aborted" };
      }
      const eumet = await acquireProviderMosaic({
        times: eumetTimes,
        buildUrl: buildCloudsEumetWmsGetMapUrl,
        providerKind: CLOUDS_PROVIDER_EUMET,
        staleMaxAgeMs: CLOUDS_EUMET_STALE_MAX_AGE_MS,
        nowMs,
        timeoutMs,
        signal,
        requireMosaicDimensions,
        acquireOptions,
        ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
      });
      if (eumet.ok) {
        return eumet;
      }
      if (eumet.error === "aborted") {
        return eumet;
      }

      const gibsTimes = await discoverCloudsObservationSearchTimesMs(fetchOpts);
      if (signal?.aborted) {
        return { ok: false, error: "aborted" };
      }
      const gibs = await acquireProviderMosaic({
        times: gibsTimes,
        buildUrl: buildCloudsGibsWmsGetMapUrl,
        providerKind: CLOUDS_PROVIDER_GIBS,
        staleMaxAgeMs: CLOUDS_GIBS_STALE_MAX_AGE_MS,
        nowMs,
        timeoutMs,
        signal,
        requireMosaicDimensions,
        acquireOptions,
        ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
      });
      if (gibs.ok) {
        return gibs;
      }
      if (useFixtureFallback) {
        return produceGlobalCloudsIrFixtureAcquisition(acquireOptions, signal);
      }
      return {
        ok: false,
        error: gibs.error !== "aborted" ? gibs.error : eumet.error,
      };
    },
  };
}

export function materializeCloudsHighlightStoreEntry(entry: {
  record: DynamicSnapshotRecord;
  payloadBytes?: Uint8Array;
}): { record: DynamicSnapshotRecord; payloadBytes: Uint8Array } | null {
  if (entry.record.body.kind !== "equirectRaster") return null;
  const bytes = entry.payloadBytes;
  if (bytes === undefined || bytes.byteLength === 0) return null;
  const decoded = decodeCloudsPngRgba(bytes);
  if (decoded === null) return null;
  const provider = entry.record.body.cloudProviderKind;
  const highlight = applyCloudHighlightTransfer(
    decoded.rgba,
    provider === CLOUDS_PROVIDER_EUMET ? { mapIrLuma: liftEumetIrLuma } : {},
  );
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
