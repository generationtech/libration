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
 * Sync-prepared track views for Model B layers (DLC-3).
 * Tracks are indexed outside the paint path; layers only read.
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
  DynamicTrack,
} from "./dynamicSnapshotTypes";

export type PreparedTracksView = Readonly<{
  sourceId: DynamicSourceId;
  versionId: DynamicSnapshotVersionId;
  tracks: readonly DynamicTrack[];
  validTimeMs: number;
  validUntilMs?: number;
  attribution?: string;
  licenseNote?: string;
  freshness: DynamicSnapshotFreshness;
}>;

type MaterializedVersion = {
  meta: DynamicSnapshotTemporalMeta;
  tracks: readonly DynamicTrack[];
};

export interface DynamicTracksMaterializer {
  /**
   * Index a store entry for sync paint-path selection.
   * Requires `body.kind === "tracks"`.
   */
  noteStoreEntry(entry: DynamicSnapshotStoreEntry): void;

  /**
   * Sync product-time selection — never fetches, never awaits the store.
   * Returns null when no version is indexed for the source.
   */
  selectForProductInstant(
    sourceId: DynamicSourceId,
    productInstantMs: number,
  ): PreparedTracksView | null;

  /** Drop one source (or all versions). */
  dropSource(sourceId: DynamicSourceId): void;

  /** Clear the index. */
  clearAll(): void;
}

export type DynamicTracksMaterializerDeps = Readonly<{
  /** Optional lifecycle manager for freshness on prepared views. */
  lifecycle?: DynamicDataLifecycleManager;
}>;

function cloneTracks(tracks: readonly DynamicTrack[]): DynamicTrack[] {
  return tracks.map((t) => ({
    id: t.id,
    samples: t.samples.map((s) => ({
      lonDeg: s.lonDeg,
      latDeg: s.latDeg,
      timeMs: s.timeMs,
    })),
    ...(t.properties !== undefined ? { properties: { ...t.properties } } : {}),
  }));
}

/**
 * Process-local materializer: store entries → sync-readable track views.
 */
export function createDynamicTracksMaterializer(
  deps: DynamicTracksMaterializerDeps = {},
): DynamicTracksMaterializer {
  const bySource = new Map<
    DynamicSourceId,
    Map<DynamicSnapshotVersionId, MaterializedVersion>
  >();

  function noteStoreEntry(entry: DynamicSnapshotStoreEntry): void {
    const { record } = entry;
    if (record.body.kind !== "tracks") {
      return;
    }
    const { meta } = record;
    if (!isValidDynamicSourceId(meta.sourceId)) {
      return;
    }
    let versions = bySource.get(meta.sourceId);
    if (versions === undefined) {
      versions = new Map();
      bySource.set(meta.sourceId, versions);
    }
    versions.set(meta.versionId, {
      meta: { ...meta },
      tracks: cloneTracks(record.body.tracks),
    });
  }

  function selectForProductInstant(
    sourceId: DynamicSourceId,
    productInstantMs: number,
  ): PreparedTracksView | null {
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
      tracks: row.tracks,
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
