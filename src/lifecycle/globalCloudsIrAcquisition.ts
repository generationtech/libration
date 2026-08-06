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
 * DLC-1 acquisition adapter for global clouds / IR equirect raster.
 * Returns real-format JPEG fixtures (jpeg-js). No network in this adapter —
 * live free-source HTTP can replace the producer later under the same sourceId.
 * Never invoked from rAF / layer constructors / RenderPlan builders.
 */

import * as jpeg from "jpeg-js";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import { createFixtureAcquisitionAdapter } from "./dynamicAcquisition";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  getDynamicEquirectSourceCatalogEntry,
} from "./dynamicEquirectSourceCatalog";
import type { DynamicSnapshotAcquisitionAdapter } from "./dynamicAcquisitionTypes";
import type { DynamicAcquisitionResult } from "./dynamicAcquisitionTypes";
import type { DynamicSourceId } from "./dynamicSnapshotTypes";

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
 * Fixture acquisition adapter for the DLC-1 global clouds/IR consumer.
 * Register with the acquisition controller outside the paint path.
 */
export function createGlobalCloudsIrFixtureAcquisitionAdapter(
  options: GlobalCloudsIrAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  return createFixtureAcquisitionAdapter(
    GLOBAL_CLOUDS_IR_SOURCE_ID,
    (signal) => produceGlobalCloudsIrFixtureAcquisition(options, signal),
  );
}

/** Scene stack row id for the DLC-1 Model B layer (SceneConfig). */
export const GLOBAL_CLOUDS_IR_SCENE_LAYER_ID = "globalCloudsIr";

/** Type guard helper for durable source wiring. */
export function isGlobalCloudsIrSourceId(
  sourceId: DynamicSourceId,
): boolean {
  return sourceId === GLOBAL_CLOUDS_IR_SOURCE_ID;
}
