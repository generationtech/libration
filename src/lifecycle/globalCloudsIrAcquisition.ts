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
 * DLC-1 / DLU-5 acquisition for global clouds / IR equirect raster.
 * Fixture producer remains for offline / test fallback. Live HTTP fetches a
 * NASA GIBS WMS equirect JPEG under durable sourceId `global-clouds-ir-v1`.
 * Never invoked from rAF / layer constructors / RenderPlan builders.
 */

import * as jpeg from "jpeg-js";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import { createFixtureAcquisitionAdapter } from "./dynamicAcquisition";
import { createLiveHttpAcquisitionAdapter } from "./liveHttpAcquisition";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  getDynamicEquirectSourceCatalogEntry,
} from "./dynamicEquirectSourceCatalog";
import type { DynamicSnapshotAcquisitionAdapter } from "./dynamicAcquisitionTypes";
import type { DynamicAcquisitionResult } from "./dynamicAcquisitionTypes";
import type { DynamicSourceId } from "./dynamicSnapshotTypes";
import type {
  LiveHttpFetchFn,
  LiveHttpFetchOk,
} from "./liveHttpAcquisitionTypes";

/**
 * NASA GIBS WMS GetMap for MODIS Terra cloud-top temperature (day), full-world
 * equirectangular JPEG. Free / open NASA Earthdata imagery; durable SceneConfig
 * id stays {@link GLOBAL_CLOUDS_IR_SOURCE_ID} — never persist this URL.
 */
export const GLOBAL_CLOUDS_IR_LIVE_FEED_URL =
  "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MODIS_Terra_Cloud_Top_Temp_Day&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg";

/** Content-Types accepted from the GIBS WMS JPEG response (parameter-stripped). */
export const GLOBAL_CLOUDS_IR_LIVE_ACCEPT_CONTENT_TYPES = [
  "image/jpeg",
] as const;

/** Soft IR-like cool gray ramp (not a cosmetic weather cartoon). */
function encodeGlobalCloudsIrFixtureJpeg(): Uint8Array {
  const width = 8;
  const height = 4;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Gentle longitudinal gradient — stands in for IR brightness field.
      const v = Math.round(40 + (x / (width - 1)) * 140 + (y % 2) * 8);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = Math.min(255, v + 12);
      data[i + 3] = 255;
    }
  }
  const encoded = jpeg.encode({ data, width, height }, 90);
  return new Uint8Array(encoded.data);
}

export type GlobalCloudsIrAcquireOptions = Readonly<{
  /** Override wall/acquire clock (tests). */
  nowMs?: () => number;
  /** Stable version token prefix; default uses acquired epoch. */
  versionIdFor?: (acquiredAtMs: number) => string;
}>;

export type GlobalCloudsIrLiveAcquireOptions = GlobalCloudsIrAcquireOptions &
  Readonly<{
    /** Override production GIBS WMS URL (tests). */
    url?: string;
    /** Injectable fetch (tests / desktop bridge). */
    fetchFn?: LiveHttpFetchFn;
    /**
     * When live HTTP fails (non-abort), fall back to the offline fixture under
     * the same durable sourceId. Default true.
     */
    useFixtureFallback?: boolean;
  }>;

export type GlobalCloudsIrJpegValidateOk = Readonly<{
  ok: true;
  byteLength: number;
}>;

export type GlobalCloudsIrJpegValidateFail = Readonly<{
  ok: false;
  error: string;
}>;

export type GlobalCloudsIrJpegValidateResult =
  | GlobalCloudsIrJpegValidateOk
  | GlobalCloudsIrJpegValidateFail;

/**
 * Validate that bytes look like a JPEG (SOI marker). Does not decode pixels —
 * materializers decode outside rAF when needed.
 */
export function validateGlobalCloudsIrJpegBytes(
  bytes: Uint8Array,
): GlobalCloudsIrJpegValidateResult {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 3) {
    return { ok: false, error: "empty or truncated jpeg body" };
  }
  // JPEG SOI
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { ok: false, error: "not a jpeg (missing SOI)" };
  }
  return { ok: true, byteLength: bytes.byteLength };
}

/**
 * Produce one store-ready equirect JPEG entry for {@link GLOBAL_CLOUDS_IR_SOURCE_ID}.
 */
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
  const versionId =
    options.versionIdFor?.(acquiredAtMs) ?? `clouds-ir-${acquiredAtMs}`;
  const payloadBytes = encodeGlobalCloudsIrFixtureJpeg();
  const record = buildDynamicSnapshotRecord(
    {
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      kind: "equirectRaster",
      versionId,
      acquiredAtMs,
      validTimeMs: acquiredAtMs,
      attribution: catalog.attribution,
      ...(catalog.licenseNote !== undefined
        ? { licenseNote: catalog.licenseNote }
        : {}),
    },
    {
      kind: "equirectRaster",
      contentType: "image/jpeg",
      lonMinDeg: -180,
      lonMaxDeg: 180,
      latMinDeg: -90,
      latMaxDeg: 90,
      byteLength: payloadBytes.byteLength,
    },
  );
  if (record === null) {
    return { ok: false, error: "invalid snapshot record" };
  }
  return {
    ok: true,
    entry: { record, payloadBytes },
  };
}

/**
 * Map live GIBS JPEG HTTP bytes into a store-ready equirect acquisition result.
 */
export function produceGlobalCloudsIrLiveAcquisitionFromFetched(
  fetched: LiveHttpFetchOk,
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

  const validated = validateGlobalCloudsIrJpegBytes(fetched.bytes);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const acquiredAtMs = (options.nowMs ?? Date.now)();
  if (!Number.isFinite(acquiredAtMs)) {
    return { ok: false, error: "invalid acquiredAtMs" };
  }
  const versionId =
    options.versionIdFor?.(acquiredAtMs) ?? `clouds-ir-live-${acquiredAtMs}`;

  const record = buildDynamicSnapshotRecord(
    {
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      kind: "equirectRaster",
      versionId,
      acquiredAtMs,
      validTimeMs: acquiredAtMs,
      attribution: catalog.attribution,
      ...(catalog.licenseNote !== undefined
        ? { licenseNote: catalog.licenseNote }
        : {}),
    },
    {
      kind: "equirectRaster",
      contentType: "image/jpeg",
      lonMinDeg: -180,
      lonMaxDeg: 180,
      latMinDeg: -90,
      latMaxDeg: 90,
      byteLength: validated.byteLength,
    },
  );
  if (record === null) {
    return { ok: false, error: "invalid snapshot record" };
  }
  return {
    ok: true,
    entry: { record, payloadBytes: fetched.bytes },
  };
}

/**
 * Fixture acquisition adapter for the DLC-1 global clouds/IR consumer /
 * offline fallback. Register with the acquisition controller outside the paint path.
 */
export function createGlobalCloudsIrFixtureAcquisitionAdapter(
  options: GlobalCloudsIrAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  return createFixtureAcquisitionAdapter(
    GLOBAL_CLOUDS_IR_SOURCE_ID,
    (signal) => produceGlobalCloudsIrFixtureAcquisition(options, signal),
  );
}

/**
 * DLU-5 live HTTP acquisition adapter for {@link GLOBAL_CLOUDS_IR_SOURCE_ID}.
 * Uses the shared DLU-2 live HTTP seam; optional fixture fallback when offline.
 */
export function createGlobalCloudsIrLiveHttpAcquisitionAdapter(
  options: GlobalCloudsIrLiveAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  const catalog = getDynamicEquirectSourceCatalogEntry(GLOBAL_CLOUDS_IR_SOURCE_ID);
  const useFixtureFallback = options.useFixtureFallback !== false;
  const acquireOptions: GlobalCloudsIrAcquireOptions = {
    ...(options.nowMs !== undefined ? { nowMs: options.nowMs } : {}),
    ...(options.versionIdFor !== undefined
      ? { versionIdFor: options.versionIdFor }
      : {}),
  };

  return createLiveHttpAcquisitionAdapter({
    sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
    url: options.url ?? GLOBAL_CLOUDS_IR_LIVE_FEED_URL,
    acceptContentTypes: GLOBAL_CLOUDS_IR_LIVE_ACCEPT_CONTENT_TYPES,
    ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
    attribution: {
      ...(catalog?.attribution !== undefined
        ? { attribution: catalog.attribution }
        : {}),
      ...(catalog?.licenseNote !== undefined
        ? { licenseNote: catalog.licenseNote }
        : {}),
    },
    toEntry: (fetched, signal) =>
      produceGlobalCloudsIrLiveAcquisitionFromFetched(
        fetched,
        acquireOptions,
        signal,
      ),
    ...(useFixtureFallback
      ? {
          fixtureFallback: (signal?: AbortSignal) =>
            produceGlobalCloudsIrFixtureAcquisition(acquireOptions, signal),
        }
      : {}),
  });
}

/** Scene stack row id for the DLC-1 Model B layer (SceneConfig). */
export const GLOBAL_CLOUDS_IR_SCENE_LAYER_ID = "globalCloudsIr";

/** Type guard helper for durable source wiring. */
export function isGlobalCloudsIrSourceId(
  sourceId: DynamicSourceId,
): boolean {
  return sourceId === GLOBAL_CLOUDS_IR_SOURCE_ID;
}
