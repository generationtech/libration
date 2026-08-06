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
 * Sync-prepared cloud opacity fields for Model A illumination participation
 * (DLC-4 / DLU-6 live). Decodes equirect JPEG bytes (jpeg-js) outside the paint
 * path; layers / plan builders only sample prepared buffers. Never fetches.
 * Live bytes arrive via the DLU-5 `global-clouds-ir-v1` acquisition adapter.
 * @see docs/specs/scene/weather-cloud-composition-plan.md (Model A)
 */

import * as jpeg from "jpeg-js";
import {
  isValidDynamicSourceId,
  selectNearestSnapshotMetaByValidTime,
} from "./dynamicSnapshotContracts";
import { lifecycleStateToFreshness } from "./dynamicLifecycleTypes";
import type { DynamicDataLifecycleManager } from "./dynamicLifecycleTypes";
import type { DynamicSnapshotStoreEntry } from "./dynamicSnapshotStoreTypes";
import type {
  DynamicSnapshotFreshness,
  DynamicSnapshotTemporalMeta,
  DynamicSnapshotVersionId,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";

/** Decoded full-world equirect cloud opacity (0 = clear … 255 = opaque). */
export type CloudOpacitySampleBuffer = Readonly<{
  width: number;
  height: number;
  /** Row-major opacity bytes, length width * height. */
  opacityU8: Uint8Array;
}>;

export type PreparedCloudOpacityView = Readonly<{
  sourceId: DynamicSourceId;
  versionId: DynamicSnapshotVersionId;
  validTimeMs: number;
  validUntilMs?: number;
  attribution?: string;
  licenseNote?: string;
  freshness: DynamicSnapshotFreshness;
  buffer: CloudOpacitySampleBuffer;
}>;

type MaterializedVersion = {
  meta: DynamicSnapshotTemporalMeta;
  buffer: CloudOpacitySampleBuffer;
};

export interface DynamicCloudOpacityMaterializer {
  /**
   * Decode equirect JPEG payload into an opacity field for sync paint-path selection.
   * No-op when kind is not equirectRaster or decode fails.
   */
  noteStoreEntry(entry: DynamicSnapshotStoreEntry): void;

  /**
   * Sync product-time selection — never fetches, never awaits the store.
   * Returns null when no version is indexed for the source.
   */
  selectForProductInstant(
    sourceId: DynamicSourceId,
    productInstantMs: number,
  ): PreparedCloudOpacityView | null;

  dropSource(sourceId: DynamicSourceId): void;
  clearAll(): void;
}

export type DynamicCloudOpacityMaterializerDeps = Readonly<{
  lifecycle?: DynamicDataLifecycleManager;
}>;

function wrapLonDeg(lonDeg: number): number {
  let x = lonDeg;
  while (x < -180) x += 360;
  while (x > 180) x -= 360;
  return x;
}

/**
 * Decode JPEG equirect bytes → per-texel opacity (display luma as 0..255).
 * Returns null on decode failure.
 */
export function decodeJpegBytesToCloudOpacityBuffer(
  jpegBytes: Uint8Array,
): CloudOpacitySampleBuffer | null {
  if (jpegBytes.byteLength < 4) {
    return null;
  }
  try {
    const decoded = jpeg.decode(jpegBytes, { useTArray: true, formatAsRGBA: true });
    const { width, height, data } = decoded;
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      !(data instanceof Uint8Array)
    ) {
      return null;
    }
    const opacityU8 = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < opacityU8.length; i++, p += 4) {
      // Rec. 601-ish display luma from sRGB bytes (IR fixtures are near-grayscale).
      opacityU8[i] = Math.round(
        0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2],
      );
    }
    return { width, height, opacityU8 };
  } catch {
    return null;
  }
}

/**
 * Bilinear sample of prepared opacity at lon/lat (degrees, full-world equirect).
 * Returns 0..1.
 */
export function sampleCloudOpacity01(
  buf: CloudOpacitySampleBuffer,
  lonDeg: number,
  latDeg: number,
): number {
  const { width: w, height: h, opacityU8 } = buf;
  if (w <= 0 || h <= 0 || opacityU8.length < w * h) {
    return 0;
  }
  const lon = wrapLonDeg(lonDeg);
  const lat = Math.max(-90, Math.min(90, latDeg));
  const u = (lon + 180) / 360;
  const v = (90 - lat) / 180;
  const xf = u * (w - 1);
  const yf = v * (h - 1);
  const x0 = Math.floor(xf);
  const y0 = Math.floor(yf);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = xf - x0;
  const ty = yf - y0;
  const at = (yy: number, xx: number) => opacityU8[yy * w + xx] / 255;
  const top = at(y0, x0) + (at(y0, x1) - at(y0, x0)) * tx;
  const bot = at(y1, x0) + (at(y1, x1) - at(y1, x0)) * tx;
  return Math.max(0, Math.min(1, top + (bot - top) * ty));
}

/**
 * Process-local materializer: equirect JPEG store entries → sync opacity buffers.
 */
export function createDynamicCloudOpacityMaterializer(
  deps: DynamicCloudOpacityMaterializerDeps = {},
): DynamicCloudOpacityMaterializer {
  const bySource = new Map<
    DynamicSourceId,
    Map<DynamicSnapshotVersionId, MaterializedVersion>
  >();

  function noteStoreEntry(entry: DynamicSnapshotStoreEntry): void {
    const { record, payloadBytes } = entry;
    if (record.body.kind !== "equirectRaster") {
      return;
    }
    if (!payloadBytes || payloadBytes.byteLength === 0) {
      return;
    }
    const { meta } = record;
    if (!isValidDynamicSourceId(meta.sourceId)) {
      return;
    }
    const buffer = decodeJpegBytesToCloudOpacityBuffer(payloadBytes);
    if (buffer === null) {
      return;
    }
    let versions = bySource.get(meta.sourceId);
    if (versions === undefined) {
      versions = new Map();
      bySource.set(meta.sourceId, versions);
    }
    versions.set(meta.versionId, {
      meta: { ...meta },
      buffer,
    });
  }

  function selectForProductInstant(
    sourceId: DynamicSourceId,
    productInstantMs: number,
  ): PreparedCloudOpacityView | null {
    if (!isValidDynamicSourceId(sourceId)) return null;
    if (!Number.isFinite(productInstantMs)) return null;
    const versions = bySource.get(sourceId);
    if (versions === undefined || versions.size === 0) return null;

    const metas = [...versions.values()].map((v) => v.meta);
    const selected = selectNearestSnapshotMetaByValidTime(metas, productInstantMs);
    if (selected === null) return null;
    const row = versions.get(selected.versionId);
    if (row === undefined) return null;

    const freshness: DynamicSnapshotFreshness =
      deps.lifecycle !== undefined
        ? lifecycleStateToFreshness(deps.lifecycle.getState(sourceId).state)
        : "ready";

    return {
      sourceId,
      versionId: row.meta.versionId,
      validTimeMs: row.meta.validTimeMs,
      ...(row.meta.validUntilMs !== undefined
        ? { validUntilMs: row.meta.validUntilMs }
        : {}),
      ...(row.meta.attribution !== undefined
        ? { attribution: row.meta.attribution }
        : {}),
      ...(row.meta.licenseNote !== undefined
        ? { licenseNote: row.meta.licenseNote }
        : {}),
      freshness,
      buffer: row.buffer,
    };
  }

  function dropSource(sourceId: DynamicSourceId): void {
    bySource.delete(sourceId);
  }

  function clearAll(): void {
    bySource.clear();
  }

  return {
    noteStoreEntry,
    selectForProductInstant,
    dropSource,
    clearAll,
  };
}
