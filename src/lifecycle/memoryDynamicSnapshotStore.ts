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
 * In-memory DynamicSnapshotStore (P10-2 default backend for tests / early wiring).
 * Disk / Tauri backends may implement the same interface later; acquisition is P10-5.
 */

import {
  cloneStoreEntry,
  compareSnapshotMetaForList,
  prepareDynamicSnapshotStoreEntry,
  toPutResult,
} from "./dynamicSnapshotStore";
import type {
  DynamicSnapshotStore,
  DynamicSnapshotStoreEntry,
  DynamicSnapshotStorePutResult,
} from "./dynamicSnapshotStoreTypes";
import type {
  DynamicSnapshotTemporalMeta,
  DynamicSnapshotVersionId,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";
import {
  isValidDynamicSnapshotVersionId,
  isValidDynamicSourceId,
} from "./dynamicSnapshotContracts";

/**
 * Process-local versioned snapshot cache.
 * Async API matches the durable store contract; no network or RenderPlan coupling.
 */
export class MemoryDynamicSnapshotStore implements DynamicSnapshotStore {
  private readonly bySource = new Map<
    DynamicSourceId,
    Map<DynamicSnapshotVersionId, DynamicSnapshotStoreEntry>
  >();

  async put(
    entry: DynamicSnapshotStoreEntry,
  ): Promise<DynamicSnapshotStorePutResult> {
    const prepared = prepareDynamicSnapshotStoreEntry(entry);
    if (!prepared.ok) {
      return toPutResult(prepared);
    }
    const { meta } = prepared.prepared.record;
    let versions = this.bySource.get(meta.sourceId);
    if (versions === undefined) {
      versions = new Map();
      this.bySource.set(meta.sourceId, versions);
    }
    versions.set(meta.versionId, prepared.prepared);
    return { ok: true };
  }

  async get(
    sourceId: DynamicSourceId,
    versionId: DynamicSnapshotVersionId,
  ): Promise<DynamicSnapshotStoreEntry | null> {
    if (!isValidDynamicSourceId(sourceId)) return null;
    if (!isValidDynamicSnapshotVersionId(versionId)) return null;
    const versions = this.bySource.get(sourceId);
    if (versions === undefined) return null;
    const entry = versions.get(versionId);
    return entry === undefined ? null : cloneStoreEntry(entry);
  }

  async list(
    sourceId?: DynamicSourceId,
  ): Promise<readonly DynamicSnapshotTemporalMeta[]> {
    const metas: DynamicSnapshotTemporalMeta[] = [];
    if (sourceId !== undefined) {
      if (!isValidDynamicSourceId(sourceId)) return [];
      const versions = this.bySource.get(sourceId);
      if (versions === undefined) return [];
      for (const entry of versions.values()) {
        metas.push({ ...entry.record.meta });
      }
    } else {
      for (const versions of this.bySource.values()) {
        for (const entry of versions.values()) {
          metas.push({ ...entry.record.meta });
        }
      }
    }
    metas.sort(compareSnapshotMetaForList);
    return metas;
  }

  async evict(
    sourceId: DynamicSourceId,
    versionId?: DynamicSnapshotVersionId,
  ): Promise<number> {
    if (!isValidDynamicSourceId(sourceId)) return 0;
    const versions = this.bySource.get(sourceId);
    if (versions === undefined) return 0;

    if (versionId === undefined) {
      const count = versions.size;
      this.bySource.delete(sourceId);
      return count;
    }
    if (!isValidDynamicSnapshotVersionId(versionId)) return 0;
    const existed = versions.delete(versionId);
    if (versions.size === 0) {
      this.bySource.delete(sourceId);
    }
    return existed ? 1 : 0;
  }

  async clear(): Promise<void> {
    this.bySource.clear();
  }
}

/** Factory for the default in-memory store (tests and early shell seams). */
export function createMemoryDynamicSnapshotStore(): DynamicSnapshotStore {
  return new MemoryDynamicSnapshotStore();
}
