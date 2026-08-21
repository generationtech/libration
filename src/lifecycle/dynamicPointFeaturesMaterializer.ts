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
 * Sync-prepared point-feature views for Model B layers (DLC-2).
 * Features are indexed outside the paint path; layers only read.
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
  DynamicPointFeature,
  DynamicSnapshotFreshness,
  DynamicSnapshotTemporalMeta,
  DynamicSnapshotVersionId,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";

export type PreparedPointFeaturesView = Readonly<{
  sourceId: DynamicSourceId;
  versionId: DynamicSnapshotVersionId;
  features: readonly DynamicPointFeature[];
  validTimeMs: number;
  acquiredAtMs: number;
  validUntilMs?: number;
  attribution?: string;
  licenseNote?: string;
  freshness: DynamicSnapshotFreshness;
  origin?: "live" | "fixture";
  /**
   * DEV visual-scenario hatch only. Production materializer never sets this.
   * Allows recorded fixture features to paint with fixture status, never live.
   */
  devAllowFixturePaint?: boolean;
}>;

type MaterializedVersion = {
  meta: DynamicSnapshotTemporalMeta;
  features: readonly DynamicPointFeature[];
};

export interface DynamicPointFeaturesMaterializer {
  /**
   * Index a store entry for sync paint-path selection.
   * Requires `body.kind === "pointFeatures"`.
   */
  noteStoreEntry(entry: DynamicSnapshotStoreEntry): void;

  /**
   * Sync product-time selection — never fetches, never awaits the store.
   * Returns null when no version is indexed for the source.
   */
  selectForProductInstant(
    sourceId: DynamicSourceId,
    productInstantMs: number,
  ): PreparedPointFeaturesView | null;

  /** Drop one source (or all versions). */
  dropSource(sourceId: DynamicSourceId): void;

  /** Clear the index. */
  clearAll(): void;
}

export type DynamicPointFeaturesMaterializerDeps = Readonly<{
  /** Optional lifecycle manager for freshness on prepared views. */
  lifecycle?: DynamicDataLifecycleManager;
}>;

function cloneFeatures(
  features: readonly DynamicPointFeature[],
): DynamicPointFeature[] {
  return features.map((f) => ({
    id: f.id,
    lonDeg: f.lonDeg,
    latDeg: f.latDeg,
    ...(f.validTimeMs !== undefined ? { validTimeMs: f.validTimeMs } : {}),
    ...(f.properties !== undefined ? { properties: { ...f.properties } } : {}),
  }));
}

/**
 * Process-local materializer: store entries → sync-readable point-feature views.
 */
export function createDynamicPointFeaturesMaterializer(
  deps: DynamicPointFeaturesMaterializerDeps = {},
): DynamicPointFeaturesMaterializer {
  const bySource = new Map<
    DynamicSourceId,
    Map<DynamicSnapshotVersionId, MaterializedVersion>
  >();

  function noteStoreEntry(entry: DynamicSnapshotStoreEntry): void {
    const { record } = entry;
    if (record.body.kind !== "pointFeatures") {
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
      features: cloneFeatures(record.body.features),
    });
  }

  function selectForProductInstant(
    sourceId: DynamicSourceId,
    productInstantMs: number,
  ): PreparedPointFeaturesView | null {
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
      features: row.features,
      validTimeMs: row.meta.validTimeMs,
      acquiredAtMs: row.meta.acquiredAtMs,
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
      ...(row.meta.origin !== undefined ? { origin: row.meta.origin } : {}),
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
