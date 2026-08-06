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
 * Phase 10 dynamic snapshot store contracts (P10-2).
 * Persistence API only — no acquisition, manager, resolver, or UI.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import type {
  DynamicSnapshotRecord,
  DynamicSnapshotTemporalMeta,
  DynamicSnapshotVersionId,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";

/**
 * One versioned cache entry: typed record plus optional opaque payload bytes
 * (e.g. equirect JPEG). Store implementations copy bytes on put/get.
 */
export type DynamicSnapshotStoreEntry = Readonly<{
  record: DynamicSnapshotRecord;
  payloadBytes?: Uint8Array;
}>;

export type DynamicSnapshotStorePutResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

/**
 * Local versioned snapshot cache.
 *
 * Keys are durable `sourceId` + `versionId` (never raw CDN URLs).
 * Implementations must not fetch or touch RenderPlan / rAF.
 */
export interface DynamicSnapshotStore {
  /** Insert or replace an entry keyed by record.meta.sourceId + versionId. */
  put(entry: DynamicSnapshotStoreEntry): Promise<DynamicSnapshotStorePutResult>;

  get(
    sourceId: DynamicSourceId,
    versionId: DynamicSnapshotVersionId,
  ): Promise<DynamicSnapshotStoreEntry | null>;

  /**
   * List temporal metadata for one source, or all sources when omitted.
   * Order: sourceId ASC, validTimeMs ASC, versionId ASC.
   */
  list(
    sourceId?: DynamicSourceId,
  ): Promise<readonly DynamicSnapshotTemporalMeta[]>;

  /**
   * Remove one version, or all versions for a source when `versionId` is omitted.
   * @returns number of entries removed
   */
  evict(
    sourceId: DynamicSourceId,
    versionId?: DynamicSnapshotVersionId,
  ): Promise<number>;

  /** Drop all entries (tests / cold-start wipe). */
  clear(): Promise<void>;
}
