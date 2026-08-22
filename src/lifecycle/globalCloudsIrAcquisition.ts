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
 * Clouds v3 live acquisition: independent GEO sectors + EUMET ring backstop,
 * composed into one product snapshot. Durable sourceId stays
 * `global-clouds-ir-v1`. Each component keeps its own validTimeMs.
 */

import { createFixtureAcquisitionAdapter } from "./dynamicAcquisition";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import {
  CLOUDS_CATALOG_ATTRIBUTION,
  CLOUDS_EUMET_ATTRIBUTION,
  CLOUDS_EUMET_LICENSE_NOTE,
  CLOUDS_GIBS_LICENSE_NOTE,
  CLOUDS_GLOBAL_COVERAGE_NOTE,
  CLOUDS_PARTIAL_COVERAGE_NOTE,
} from "./cloudProvenance";
import {
  applyCloudHighlightTransfer,
  CLOUD_HIGHLIGHT_TRANSFER_VERSION,
  liftEumetIrLuma,
  liftMsgFesIrLuma,
} from "./cloudHighlightTransfer";
import { materializeCloudsSourcePlanes } from "./cloudCoverage";
import {
  CLOUDS_GIBS_GOES_EAST_LAYER,
  CLOUDS_GIBS_GOES_WEST_LAYER,
  CLOUDS_GIBS_HIMAWARI_LAYER,
  CLOUDS_GIBS_HEIGHT_PX,
  CLOUDS_GIBS_TIME_SEARCH_STEPS,
  CLOUDS_GIBS_WIDTH_PX,
  buildCloudsGibsSectorGetMapUrl,
  floorToCloudsGibsSlotMs,
  formatCloudsGibsWmsTime,
  listCloudsObservationSearchTimesMs,
  wmsUrlHasExplicitTime,
} from "./cloudsGibsWms";
import {
  EUMET_WMS_GET_CAPABILITIES_URL,
  buildCloudsEumetWmsGetMapUrl,
  buildCloudsMsgFesWmsGetMapUrl,
  floorToCloudsEumetSlotMs,
  floorToCloudsMsgFesSlotMs,
  formatCloudsEumetWmsTime,
  formatCloudsMsgFesWmsTime,
  listCloudsEumetObservationSearchTimesMs,
  listCloudsMsgFesObservationSearchTimesMs,
  parseEumetWmsLayerTimeDefault,
  parseEumetWmsLayerTimeDefaultMsgFes,
} from "./cloudsEumetWms";
import {
  CLOUDS_EUMET_MIN_USABLE_COVERAGE_RATIO,
  decodeCloudsPngRgba,
  encodeRgbaPng,
  validateCloudsPngBytes,
} from "./cloudsPng";
import { getCloudsQualityPlane } from "./cloudQuality";
import {
  buildCloudsCompositeMeta,
  cloudsCompositePaintOrder,
  compositeCloudHighlightLayers,
  selectCloudsPaintableComponents,
  type CloudsHighlightLayer,
} from "./cloudsComposite";
import {
  CLOUDS_ACQUIRE_CONCURRENCY,
  CLOUDS_EUMET_RING_MIN_REFETCH_MS,
  CLOUDS_GIBS_PROBE_HEIGHT_PX,
  CLOUDS_GIBS_PROBE_WIDTH_PX,
  CLOUDS_PROVIDER_COMPOSITE,
  CLOUDS_PROVIDER_EUMET,
  CLOUDS_PROVIDER_EUMET_MSG_FES,
  CLOUDS_PROVIDER_GIBS,
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_IDS,
  CLOUDS_SECTOR_METEOSAT,
  CLOUDS_SECTOR_RETENTION,
  CLOUDS_SECTOR_SPECS,
  type CloudsProviderKind,
  type CloudsSectorId,
} from "./cloudsSectors";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  getDynamicEquirectSourceCatalogEntry,
} from "./dynamicEquirectSourceCatalog";
import { fetchLiveHttpBytes } from "./liveHttpAcquisition";
import type {
  DynamicAcquisitionResult,
  DynamicSnapshotAcquisitionAdapter,
} from "./dynamicAcquisitionTypes";
import type { DynamicSnapshotRecord } from "./dynamicSnapshotTypes";
import type { LiveHttpFetchFn, LiveHttpFetchOk } from "./liveHttpAcquisitionTypes";

export const GLOBAL_CLOUDS_IR_ACQUIRE_TIMEOUT_MS = 15_000;

export const GLOBAL_CLOUDS_IR_LIVE_ACCEPT_CONTENT_TYPES = ["image/png"] as const;

export const GLOBAL_CLOUDS_IR_CAPABILITIES_ACCEPT_CONTENT_TYPES = [
  "application/vnd.ogc.wms_xml",
  "text/xml",
  "application/xml",
  "text/plain",
] as const;

/** @deprecated Prefer ring GetMap via {@link buildCloudsEumetWmsGetMapUrl}. */
export const GLOBAL_CLOUDS_IR_LIVE_FEED_URL = buildCloudsEumetWmsGetMapUrl(
  Date.UTC(2026, 0, 1, 0, 0, 0),
);

export const GLOBAL_CLOUDS_IR_SCENE_LAYER_ID = "globalCloudsIr";

const EUMET_CAPS_CACHE_MS = 30 * 60 * 1000;
const SECTOR_DISK_MIN_COVERAGE = 0.15;

export type GlobalCloudsIrAcquireOptions = Readonly<{
  nowMs?: () => number;
  versionIdFor?: (observationTimeMs: number, acquiredAtMs: number) => string;
  observationTimeMs?: number;
}>;

export type GlobalCloudsIrLiveAcquireOptions = GlobalCloudsIrAcquireOptions &
  Readonly<{
    fetchFn?: LiveHttpFetchFn;
    useFixtureFallback?: boolean;
    timeoutMs?: number;
    requireMosaicDimensions?: boolean;
    requireGibsDimensions?: boolean;
    /**
     * DEV-only sector footprint tint. Production host never sets this.
     * Implementation lives in `src/dev/cloudsSectorDebugTint.ts`.
     */
    tintComposite?: (
      base: Uint8Array,
      layers: readonly CloudsHighlightLayer[],
      paintOrder: readonly CloudsSectorId[],
      productUtcMs: number,
    ) => Uint8Array;
  }>;

type CachedSectorVersion = Readonly<{
  observationTimeMs: number;
  acquiredAtMs: number;
  width: number;
  height: number;
  highlightRgba: Uint8Array;
  coverageMask: Uint8Array;
  transferVersion: string;
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
      if (pole) continue;
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

function lumaMapForProvider(provider: CloudsProviderKind): ((luma: number) => number) | undefined {
  if (provider === CLOUDS_PROVIDER_EUMET) return liftEumetIrLuma;
  if (provider === CLOUDS_PROVIDER_EUMET_MSG_FES) return liftMsgFesIrLuma;
  return undefined;
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
      : providerKind === CLOUDS_PROVIDER_EUMET_MSG_FES
        ? floorToCloudsMsgFesSlotMs(options.observationTimeMs)
        : floorToCloudsGibsSlotMs(options.observationTimeMs);
  const timeLabel =
    providerKind === CLOUDS_PROVIDER_EUMET
      ? formatCloudsEumetWmsTime(observationTimeMs)
      : providerKind === CLOUDS_PROVIDER_EUMET_MSG_FES
        ? formatCloudsMsgFesWmsTime(observationTimeMs)
        : formatCloudsGibsWmsTime(observationTimeMs);
  if (timeLabel === null) {
    return { ok: false, error: "invalid observation TIME" };
  }

  const requireDimensions =
    options.requireMosaicDimensions === true || options.requireGibsDimensions === true;
  const isRing = providerKind === CLOUDS_PROVIDER_EUMET;
  const validated = validateCloudsPngBytes(fetched.bytes, {
    ...(requireDimensions
      ? isRing
        ? { requireEumetDimensions: true }
        : { requireGibsDimensions: true }
      : {}),
    ...(isRing
      ? {
          minCoverageRatio: CLOUDS_EUMET_MIN_USABLE_COVERAGE_RATIO,
          requireAfricaEuropeCoverage: true,
        }
      : { minCoverageRatio: SECTOR_DISK_MIN_COVERAGE }),
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
    `clouds-ir-live-${providerKind}-${observationTimeMs}`;
  const coverageKind = isRing ? "global" : "partial";

  const record = buildDynamicSnapshotRecord(
    {
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      kind: "equirectRaster",
      versionId,
      acquiredAtMs,
      validTimeMs: observationTimeMs,
      origin: "live",
      attribution: isRing ? CLOUDS_EUMET_ATTRIBUTION : CLOUDS_CATALOG_ATTRIBUTION,
      licenseNote: isRing ? CLOUDS_EUMET_LICENSE_NOTE : CLOUDS_GIBS_LICENSE_NOTE,
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
        coverageKind === "global" ? CLOUDS_GLOBAL_COVERAGE_NOTE : CLOUDS_PARTIAL_COVERAGE_NOTE,
      cloudProviderKind: providerKind,
    },
  );
  if (record === null) {
    return { ok: false, error: "invalid snapshot record" };
  }
  return { ok: true, entry: { record, payloadBytes: fetched.bytes } };
}

export function createGlobalCloudsIrFixtureAcquisitionAdapter(
  options: GlobalCloudsIrAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  return createFixtureAcquisitionAdapter(
    GLOBAL_CLOUDS_IR_SOURCE_ID,
    (signal) => produceGlobalCloudsIrFixtureAcquisition(options, signal),
  );
}

async function runPool<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const queue = [...items];
  const n = Math.max(1, Math.min(limit, queue.length));
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item === undefined) return;
        await fn(item);
      }
    }),
  );
}

function latestCached(versions: CachedSectorVersion[] | undefined): CachedSectorVersion | null {
  if (versions === undefined || versions.length === 0) return null;
  return versions[0] ?? null;
}

function retainSector(versions: CachedSectorVersion[], next: CachedSectorVersion): CachedSectorVersion[] {
  const without = versions.filter((v) => v.observationTimeMs !== next.observationTimeMs);
  return [next, ...without].slice(0, CLOUDS_SECTOR_RETENTION);
}

function gibsLayerForSector(sectorId: CloudsSectorId): string | null {
  if (sectorId === CLOUDS_SECTOR_GOES_EAST) return CLOUDS_GIBS_GOES_EAST_LAYER;
  if (sectorId === CLOUDS_SECTOR_GOES_WEST) return CLOUDS_GIBS_GOES_WEST_LAYER;
  if (sectorId === CLOUDS_SECTOR_HIMAWARI) return CLOUDS_GIBS_HIMAWARI_LAYER;
  return null;
}

function searchTimesForSector(
  sectorId: CloudsSectorId,
  nowMs: number,
  eumetCapsXml: string | null,
): number[] {
  if (sectorId === CLOUDS_SECTOR_EUMET_RING) {
    const fallback = floorToCloudsEumetSlotMs(nowMs);
    const latest =
      eumetCapsXml !== null ? parseEumetWmsLayerTimeDefault(eumetCapsXml) : null;
    const start =
      latest !== null && latest <= nowMs + CLOUDS_SECTOR_SPECS[sectorId].cadenceMs
        ? floorToCloudsEumetSlotMs(latest)
        : fallback;
    return listCloudsEumetObservationSearchTimesMs(start);
  }
  if (sectorId === CLOUDS_SECTOR_METEOSAT) {
    const fallback = floorToCloudsMsgFesSlotMs(nowMs);
    const latest =
      eumetCapsXml !== null ? parseEumetWmsLayerTimeDefaultMsgFes(eumetCapsXml) : null;
    const start =
      latest !== null && latest <= nowMs + CLOUDS_SECTOR_SPECS[sectorId].cadenceMs
        ? floorToCloudsMsgFesSlotMs(latest)
        : fallback;
    return listCloudsMsgFesObservationSearchTimesMs(start);
  }
  const start = floorToCloudsGibsSlotMs(nowMs);
  return listCloudsObservationSearchTimesMs(start, CLOUDS_GIBS_TIME_SEARCH_STEPS);
}

function buildSectorGetMapUrl(
  sectorId: CloudsSectorId,
  observationTimeMs: number,
  probe: boolean,
): string {
  const size = probe
    ? { width: CLOUDS_GIBS_PROBE_WIDTH_PX, height: CLOUDS_GIBS_PROBE_HEIGHT_PX }
    : { width: CLOUDS_GIBS_WIDTH_PX, height: CLOUDS_GIBS_HEIGHT_PX };
  if (sectorId === CLOUDS_SECTOR_EUMET_RING) {
    if (probe) {
      return buildCloudsEumetWmsGetMapUrl(observationTimeMs, size);
    }
    return buildCloudsEumetWmsGetMapUrl(observationTimeMs);
  }
  if (sectorId === CLOUDS_SECTOR_METEOSAT) {
    return buildCloudsMsgFesWmsGetMapUrl(observationTimeMs, size);
  }
  const layer = gibsLayerForSector(sectorId);
  if (layer === null) {
    throw new Error(`no GIBS layer for sector ${sectorId}`);
  }
  return buildCloudsGibsSectorGetMapUrl(layer, observationTimeMs, size);
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
  const tintComposite = options.tintComposite;

  const cache = new Map<CloudsSectorId, CachedSectorVersion[]>();
  let lastRingFetchAtMs: number | null = null;
  let eumetCapsXml: string | null = null;
  let eumetCapsAtMs: number | null = null;
  let lastCompositeKey = "";
  let lastCompositeResult: DynamicAcquisitionResult | null = null;

  async function fetchEumetCaps(signal?: AbortSignal): Promise<string | null> {
    const wall = nowMs();
    if (
      eumetCapsXml !== null &&
      eumetCapsAtMs !== null &&
      wall - eumetCapsAtMs < EUMET_CAPS_CACHE_MS
    ) {
      return eumetCapsXml;
    }
    const caps = await fetchLiveHttpBytes({
      url: EUMET_WMS_GET_CAPABILITIES_URL,
      acceptContentTypes: GLOBAL_CLOUDS_IR_CAPABILITIES_ACCEPT_CONTENT_TYPES,
      timeoutMs,
      signal,
      ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
    });
    if (!caps.ok) return eumetCapsXml;
    eumetCapsXml = new TextDecoder("utf-8", { fatal: false }).decode(caps.bytes);
    eumetCapsAtMs = wall;
    return eumetCapsXml;
  }

  async function fetchPng(
    url: string,
    signal?: AbortSignal,
  ): Promise<LiveHttpFetchOk | null> {
    if (!wmsUrlHasExplicitTime(url)) {
      return null;
    }
    const fetched = await fetchLiveHttpBytes({
      url,
      acceptContentTypes: GLOBAL_CLOUDS_IR_LIVE_ACCEPT_CONTENT_TYPES,
      timeoutMs,
      signal,
      ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
    });
    if (!fetched.ok) return null;
    return fetched;
  }

  async function acquireSector(
    sectorId: CloudsSectorId,
    times: readonly number[],
    signal?: AbortSignal,
  ): Promise<void> {
    const spec = CLOUDS_SECTOR_SPECS[sectorId];
    const wall = nowMs();
    const existing = latestCached(cache.get(sectorId));
    if (
      sectorId === CLOUDS_SECTOR_EUMET_RING &&
      existing !== null &&
      lastRingFetchAtMs !== null &&
      wall - lastRingFetchAtMs < CLOUDS_EUMET_RING_MIN_REFETCH_MS &&
      wall - existing.observationTimeMs <= spec.staleMaxAgeMs
    ) {
      return;
    }
    if (
      existing !== null &&
      times[0] !== undefined &&
      times[0] === existing.observationTimeMs
    ) {
      return;
    }

    let lastError = `no usable ${sectorId} observation`;
    for (const observationTimeMs of times) {
      if (signal?.aborted) return;
      const ageMs = wall - observationTimeMs;
      if (ageMs > spec.staleMaxAgeMs) {
        lastError = `${sectorId} observation expired`;
        continue;
      }
      if (existing !== null && observationTimeMs === existing.observationTimeMs) {
        return;
      }
      const probeUrl = buildSectorGetMapUrl(sectorId, observationTimeMs, true);
      const probed = await fetchPng(probeUrl, signal);
      if (probed === null) {
        lastError = `${sectorId} probe failed`;
        continue;
      }
      const probeOk = validateCloudsPngBytes(probed.bytes, {
        minCoverageRatio: 0.02,
      });
      if (!probeOk.ok) {
        lastError = probeOk.error;
        continue;
      }
      const fullUrl = buildSectorGetMapUrl(sectorId, observationTimeMs, false);
      const full = await fetchPng(fullUrl, signal);
      if (full === null) {
        lastError = `${sectorId} GetMap failed`;
        continue;
      }
      const isRing = sectorId === CLOUDS_SECTOR_EUMET_RING;
      const validated = validateCloudsPngBytes(full.bytes, {
        ...(requireMosaicDimensions
          ? isRing
            ? { requireEumetDimensions: true }
            : { requireGibsDimensions: true }
          : {}),
        ...(isRing
          ? {
              minCoverageRatio: CLOUDS_EUMET_MIN_USABLE_COVERAGE_RATIO,
              requireAfricaEuropeCoverage: true,
            }
          : { minCoverageRatio: SECTOR_DISK_MIN_COVERAGE }),
      });
      if (!validated.ok) {
        lastError = validated.error;
        continue;
      }
      const decoded = decodeCloudsPngRgba(full.bytes);
      if (decoded === null) {
        lastError = `${sectorId} decode failed`;
        continue;
      }
      const mapIrLuma = lumaMapForProvider(spec.providerKind);
      const planes = materializeCloudsSourcePlanes(
        decoded.rgba,
        mapIrLuma !== undefined ? { mapIrLuma } : {},
      );
      void getCloudsQualityPlane(sectorId, decoded.width, decoded.height);
      const acquiredAtMs = nowMs();
      const next: CachedSectorVersion = {
        observationTimeMs,
        acquiredAtMs,
        width: decoded.width,
        height: decoded.height,
        highlightRgba: planes.cloudRgba,
        coverageMask: planes.coverageMask,
        transferVersion: CLOUD_HIGHLIGHT_TRANSFER_VERSION,
      };
      cache.set(sectorId, retainSector(cache.get(sectorId) ?? [], next));
      if (sectorId === CLOUDS_SECTOR_EUMET_RING) {
        lastRingFetchAtMs = acquiredAtMs;
      }
      return;
    }
    void lastError;
  }

  function buildComposite(signal?: AbortSignal): DynamicAcquisitionResult {
    if (signal?.aborted) return { ok: false, error: "aborted" };
    const productUtcMs = nowMs();
    const candidates = CLOUDS_SECTOR_IDS.flatMap((sectorId) => {
      const row = latestCached(cache.get(sectorId));
      if (row === null) return [];
      return [
        {
          sectorId,
          observationTimeMs: row.observationTimeMs,
          acquiredAtMs: row.acquiredAtMs,
          coverageOk: true,
        },
      ];
    });
    const painted = selectCloudsPaintableComponents(candidates, productUtcMs);
    if (painted.length === 0) {
      return { ok: false, error: "no usable clouds sector" };
    }
    const paintOrder = cloudsCompositePaintOrder(painted, productUtcMs);
    const layers: CloudsHighlightLayer[] = [];
    let width = 0;
    let height = 0;
    for (const sectorId of paintOrder) {
      const row = latestCached(cache.get(sectorId));
      if (row === null) continue;
      if (width === 0) {
        width = row.width;
        height = row.height;
      }
      if (row.width !== width || row.height !== height) {
        return { ok: false, error: "clouds sector dimension mismatch" };
      }
      layers.push({
        sectorId,
        width: row.width,
        height: row.height,
        rgba: row.highlightRgba,
        coverageMask: row.coverageMask,
        qualityWeight: getCloudsQualityPlane(sectorId, row.width, row.height) ?? undefined,
        observationTimeMs: row.observationTimeMs,
      });
    }
    const composed = compositeCloudHighlightLayers(layers, paintOrder, productUtcMs);
    if (composed === null) {
      return { ok: false, error: "clouds composite failed" };
    }
    const rgba =
      tintComposite !== undefined
        ? tintComposite(composed.rgba, layers, paintOrder, productUtcMs)
        : composed.rgba;
    const encoded = encodeRgbaPng(composed.width, composed.height, rgba);
    if (encoded === null) {
      return { ok: false, error: "clouds composite encode failed" };
    }
    const meta = buildCloudsCompositeMeta(painted);
    if (meta === null) {
      return { ok: false, error: "clouds composite metadata failed" };
    }
    const compositeKey = `${tintComposite !== undefined ? "tint" : "plain"}|${painted
      .map((c) => `${c.sectorId}:${c.observationTimeMs}`)
      .sort()
      .join("|")}`;
    if (compositeKey === lastCompositeKey && lastCompositeResult !== null && lastCompositeResult.ok) {
      return lastCompositeResult;
    }
    const acquiredAtMs = Math.max(...painted.map((c) => c.acquiredAtMs));
    const versionId =
      acquireOptions.versionIdFor?.(meta.newestObservationTimeMs, acquiredAtMs) ??
      `clouds-ir-live-composite-${meta.newestObservationTimeMs}-${painted.length}`;
    const hasRing = painted.some((c) => c.sectorId === CLOUDS_SECTOR_EUMET_RING);
    const coverageKind = hasRing || painted.length >= 4 ? "global" : "partial";
    const record = buildDynamicSnapshotRecord(
      {
        sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
        kind: "equirectRaster",
        versionId,
        acquiredAtMs,
        validTimeMs: meta.newestObservationTimeMs,
        origin: "live",
        attribution: CLOUDS_CATALOG_ATTRIBUTION,
        licenseNote: `${CLOUDS_EUMET_LICENSE_NOTE} ${CLOUDS_GIBS_LICENSE_NOTE}`,
      },
      {
        kind: "equirectRaster",
        contentType: "image/png",
        lonMinDeg: -180,
        lonMaxDeg: 180,
        latMinDeg: -90,
        latMaxDeg: 90,
        byteLength: encoded.byteLength,
        coverageKind,
        coverageNote:
          coverageKind === "global"
            ? CLOUDS_GLOBAL_COVERAGE_NOTE
            : CLOUDS_PARTIAL_COVERAGE_NOTE,
        cloudProviderKind: CLOUDS_PROVIDER_COMPOSITE,
        cloudHighlightApplied: true,
        cloudComposite: meta,
      },
    );
    if (record === null) {
      return { ok: false, error: "invalid snapshot record" };
    }
    const result: DynamicAcquisitionResult = {
      ok: true,
      entry: { record, payloadBytes: encoded },
    };
    lastCompositeKey = compositeKey;
    lastCompositeResult = result;
    return result;
  }

  return {
    sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
    async acquire(signal?: AbortSignal): Promise<DynamicAcquisitionResult> {
      if (signal?.aborted) {
        return { ok: false, error: "aborted" };
      }
      const wall = nowMs();
      const caps = await fetchEumetCaps(signal);
      if (signal?.aborted) return { ok: false, error: "aborted" };

      await runPool(CLOUDS_SECTOR_IDS, CLOUDS_ACQUIRE_CONCURRENCY, async (sectorId) => {
        const times = searchTimesForSector(sectorId, wall, caps);
        await acquireSector(sectorId, times, signal);
      });
      if (signal?.aborted) return { ok: false, error: "aborted" };

      const composed = buildComposite(signal);
      if (composed.ok) return composed;
      if (useFixtureFallback) {
        return produceGlobalCloudsIrFixtureAcquisition(acquireOptions, signal);
      }
      return composed;
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
  if (entry.record.body.cloudHighlightApplied === true) {
    return { record: entry.record, payloadBytes: bytes };
  }
  const decoded = decodeCloudsPngRgba(bytes);
  if (decoded === null) return null;
  const provider = entry.record.body.cloudProviderKind;
  const highlight = applyCloudHighlightTransfer(
    decoded.rgba,
    provider === CLOUDS_PROVIDER_EUMET ||
      provider === CLOUDS_PROVIDER_EUMET_MSG_FES
      ? {
          mapIrLuma:
            provider === CLOUDS_PROVIDER_EUMET ? liftEumetIrLuma : liftMsgFesIrLuma,
        }
      : {},
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
        cloudHighlightApplied: true,
      },
    },
    payloadBytes: encoded,
  };
}

export function isGlobalCloudsIrSourceId(sourceId: string): boolean {
  return sourceId === GLOBAL_CLOUDS_IR_SOURCE_ID;
}
