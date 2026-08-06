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
 * Sync-prepared equirect raster views for Model B layers (DLC-1).
 * Blob / object URLs are minted outside the paint path; layers only read.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

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

export type PreparedEquirectRasterView = Readonly<{
  sourceId: DynamicSourceId;
  versionId: DynamicSnapshotVersionId;
  /** URL suitable for imageBlit / HTMLImageElement (blob: or data:). */
  src: string;
  validTimeMs: number;
  validUntilMs?: number;
  attribution?: string;
  licenseNote?: string;
  freshness: DynamicSnapshotFreshness;
  contentType?: string;
}>;

type MaterializedVersion = {
  meta: DynamicSnapshotTemporalMeta;
  src: string;
  contentType?: string;
  /** True when src was created via URL.createObjectURL and must be revoked. */
  revokeOnDrop: boolean;
};

export interface DynamicEquirectMaterializer {
  /**
   * Index a store entry for sync paint-path selection.
   * Creates a blob: URL when `payloadBytes` are present and Blob/URL APIs exist;
   * otherwise falls back to a data: URL for small JPEG/PNG fixtures.
   */
  noteStoreEntry(entry: DynamicSnapshotStoreEntry): void;

  /**
   * Sync product-time selection — never fetches, never awaits the store.
   * Returns null when no version is indexed for the source.
   */
  selectForProductInstant(
    sourceId: DynamicSourceId,
    productInstantMs: number,
  ): PreparedEquirectRasterView | null;

  /** Drop one source (or all versions) and revoke object URLs. */
  dropSource(sourceId: DynamicSourceId): void;

  /** Revoke all object URLs and clear the index. */
  revokeAll(): void;
}

export type DynamicEquirectMaterializerDeps = Readonly<{
  /** Optional lifecycle manager for freshness on prepared views. */
  lifecycle?: DynamicDataLifecycleManager;
  /**
   * Injectable URL.createObjectURL (tests / non-DOM).
   * When omitted, uses globalThis.URL when available.
   */
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}>;

function bytesToDataUrl(bytes: Uint8Array, contentType: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  // btoa is available in browsers and Node 16+ via globalThis.
  const b64 =
    typeof globalThis.btoa === "function"
      ? globalThis.btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return `data:${contentType};base64,${b64}`;
}

function mintSrc(
  bytes: Uint8Array,
  contentType: string,
  createObjectURL: ((blob: Blob) => string) | undefined,
): { src: string; revokeOnDrop: boolean } {
  if (
    createObjectURL !== undefined &&
    typeof Blob !== "undefined"
  ) {
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], {
      type: contentType,
    });
    return { src: createObjectURL(blob), revokeOnDrop: true };
  }
  if (
    typeof Blob !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function"
  ) {
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], {
      type: contentType,
    });
    return { src: URL.createObjectURL(blob), revokeOnDrop: true };
  }
  return { src: bytesToDataUrl(bytes, contentType), revokeOnDrop: false };
}

/**
 * Process-local materializer: store entries → sync-readable image URLs.
 */
export function createDynamicEquirectMaterializer(
  deps: DynamicEquirectMaterializerDeps = {},
): DynamicEquirectMaterializer {
  const bySource = new Map<
    DynamicSourceId,
    Map<DynamicSnapshotVersionId, MaterializedVersion>
  >();
  const revokeObjectURL =
    deps.revokeObjectURL ??
    ((url: string) => {
      if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(url);
      }
    });

  function dropVersion(row: MaterializedVersion): void {
    if (row.revokeOnDrop) {
      revokeObjectURL(row.src);
    }
  }

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
    const contentType =
      record.body.contentType?.trim() ||
      "image/jpeg";
    const { src, revokeOnDrop } = mintSrc(
      payloadBytes,
      contentType,
      deps.createObjectURL,
    );

    let versions = bySource.get(meta.sourceId);
    if (versions === undefined) {
      versions = new Map();
      bySource.set(meta.sourceId, versions);
    }
    const prev = versions.get(meta.versionId);
    if (prev !== undefined) {
      dropVersion(prev);
    }
    versions.set(meta.versionId, {
      meta: { ...meta },
      src,
      contentType,
      revokeOnDrop,
    });
  }

  function selectForProductInstant(
    sourceId: DynamicSourceId,
    productInstantMs: number,
  ): PreparedEquirectRasterView | null {
    if (!isValidDynamicSourceId(sourceId)) return null;
    if (!Number.isFinite(productInstantMs)) return null;
    const versions = bySource.get(sourceId);
    if (versions === undefined || versions.size === 0) return null;

    const metas = [...versions.values()].map((v) => v.meta);
    const selected = selectNearestSnapshotMetaByValidTime(
      metas,
      productInstantMs,
    );
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
      src: row.src,
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
      ...(row.contentType !== undefined ? { contentType: row.contentType } : {}),
    };
  }

  function dropSource(sourceId: DynamicSourceId): void {
    const versions = bySource.get(sourceId);
    if (versions === undefined) return;
    for (const row of versions.values()) {
      dropVersion(row);
    }
    bySource.delete(sourceId);
  }

  function revokeAll(): void {
    for (const sourceId of [...bySource.keys()]) {
      dropSource(sourceId);
    }
  }

  return {
    noteStoreEntry,
    selectForProductInstant,
    dropSource,
    revokeAll,
  };
}
