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
 * Pure validation / copy helpers for the dynamic snapshot store (P10-2).
 * No I/O — used by memory (and future disk) backends.
 */

import {
  isValidDynamicSnapshotVersionId,
  isValidDynamicSourceId,
} from "./dynamicSnapshotContracts";
import type {
  DynamicSnapshotStoreEntry,
  DynamicSnapshotStorePutResult,
} from "./dynamicSnapshotStoreTypes";
import type { DynamicSnapshotTemporalMeta } from "./dynamicSnapshotTypes";

/** Defensive copy so callers cannot mutate cached payload buffers. */
export function copyPayloadBytes(
  bytes: Uint8Array | undefined,
): Uint8Array | undefined {
  if (bytes === undefined) return undefined;
  return bytes.slice();
}

export type PrepareDynamicSnapshotStoreEntryResult =
  | { readonly ok: true; readonly prepared: DynamicSnapshotStoreEntry }
  | { readonly ok: false; readonly error: string };

/**
 * Validates a put candidate: durable ids, kind-matched record, equirect payload.
 * Does not write. Returns a store-ready entry with copied payload bytes.
 */
export function prepareDynamicSnapshotStoreEntry(
  entry: DynamicSnapshotStoreEntry,
): PrepareDynamicSnapshotStoreEntryResult {
  const { record, payloadBytes } = entry;
  if (record == null || typeof record !== "object") {
    return { ok: false, error: "entry.record is required" };
  }
  const { meta, body } = record;
  if (meta == null || body == null) {
    return { ok: false, error: "entry.record must include meta and body" };
  }
  if (!isValidDynamicSourceId(meta.sourceId)) {
    return { ok: false, error: "invalid sourceId" };
  }
  if (!isValidDynamicSnapshotVersionId(meta.versionId)) {
    return { ok: false, error: "invalid versionId" };
  }
  if (meta.kind !== body.kind) {
    return { ok: false, error: "meta.kind does not match body.kind" };
  }

  if (meta.kind === "equirectRaster") {
    if (payloadBytes === undefined || payloadBytes.byteLength === 0) {
      return {
        ok: false,
        error: "equirectRaster entries require non-empty payloadBytes",
      };
    }
  }

  const prepared: DynamicSnapshotStoreEntry = {
    record: {
      meta: { ...meta },
      body: cloneSnapshotBody(body),
    },
    ...(payloadBytes !== undefined
      ? { payloadBytes: copyPayloadBytes(payloadBytes) }
      : {}),
  };
  return { ok: true, prepared };
}

/** Narrow put-result view (drops prepared entry). */
export function toPutResult(
  result: PrepareDynamicSnapshotStoreEntryResult,
): DynamicSnapshotStorePutResult {
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

function cloneSnapshotBody(
  body: DynamicSnapshotStoreEntry["record"]["body"],
): DynamicSnapshotStoreEntry["record"]["body"] {
  if (body.kind === "equirectRaster") {
    return { ...body };
  }
  if (body.kind === "pointFeatures") {
    return {
      kind: "pointFeatures",
      features: body.features.map((f) => ({
        ...f,
        ...(f.properties !== undefined ? { properties: { ...f.properties } } : {}),
      })),
    };
  }
  return {
    kind: "tracks",
    tracks: body.tracks.map((t) => ({
      id: t.id,
      samples: t.samples.map((s) => ({ ...s })),
      ...(t.properties !== undefined ? { properties: { ...t.properties } } : {}),
    })),
  };
}

export function compareSnapshotMetaForList(
  a: DynamicSnapshotTemporalMeta,
  b: DynamicSnapshotTemporalMeta,
): number {
  if (a.sourceId !== b.sourceId) {
    return a.sourceId < b.sourceId ? -1 : 1;
  }
  if (a.validTimeMs !== b.validTimeMs) {
    return a.validTimeMs - b.validTimeMs;
  }
  if (a.versionId !== b.versionId) {
    return a.versionId < b.versionId ? -1 : 1;
  }
  return 0;
}

export function cloneStoreEntry(
  entry: DynamicSnapshotStoreEntry,
): DynamicSnapshotStoreEntry {
  const payloadBytes = copyPayloadBytes(entry.payloadBytes);
  return {
    record: {
      meta: { ...entry.record.meta },
      body: cloneSnapshotBody(entry.record.body),
    },
    ...(payloadBytes !== undefined ? { payloadBytes } : {}),
  };
}
