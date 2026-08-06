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
 * Product-time snapshot resolver (P10-4).
 * Read-only against the versioned store; scrub-safe (no put/fetch/acquisition).
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import {
  isValidDynamicSourceId,
  selectNearestSnapshotMetaByValidTime,
} from "./dynamicSnapshotContracts";
import { lifecycleStateToFreshness } from "./dynamicLifecycleTypes";
import type { DynamicDataLifecycleManager } from "./dynamicLifecycleTypes";
import type { DynamicSnapshotStore } from "./dynamicSnapshotStoreTypes";
import type {
  DynamicSnapshotFreshness,
  DynamicSnapshotResolveResult,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";

export type DynamicSnapshotResolverDeps = Readonly<{
  store: DynamicSnapshotStore;
  /**
   * Optional lifecycle manager for per-source freshness.
   * When omitted, hits report `ready` and misses report `missing`.
   */
  lifecycle?: DynamicDataLifecycleManager;
}>;

/**
 * Product-time resolver: selects a cached snapshot for `productInstantMs`.
 * Callers may invoke this on every scrub/frame; it only lists/gets from the store.
 */
export interface DynamicSnapshotResolver {
  resolveSnapshot(
    sourceId: DynamicSourceId,
    productInstantMs: number,
  ): Promise<DynamicSnapshotResolveResult>;
}

function resolveWithoutStoreHit(
  freshness: DynamicSnapshotFreshness,
): DynamicSnapshotResolveResult {
  if (freshness === "error") {
    return { status: "error", snapshot: null, freshness: "error" };
  }
  if (freshness === "loading") {
    return { status: "missing", snapshot: null, freshness: "loading" };
  }
  return { status: "missing", snapshot: null, freshness };
}

function freshnessForSource(
  lifecycle: DynamicDataLifecycleManager | undefined,
  sourceId: DynamicSourceId,
  hadHit: boolean,
): DynamicSnapshotFreshness {
  if (lifecycle !== undefined) {
    return lifecycleStateToFreshness(lifecycle.getState(sourceId).state);
  }
  return hadHit ? "ready" : "missing";
}

/**
 * Creates a scrub-safe product-time resolver bound to a store (and optional manager).
 */
export function createDynamicSnapshotResolver(
  deps: DynamicSnapshotResolverDeps,
): DynamicSnapshotResolver {
  const { store, lifecycle } = deps;

  return {
    async resolveSnapshot(
      sourceId: DynamicSourceId,
      productInstantMs: number,
    ): Promise<DynamicSnapshotResolveResult> {
      if (!isValidDynamicSourceId(sourceId)) {
        return {
          status: "error",
          snapshot: null,
          freshness: "error",
        };
      }
      if (!Number.isFinite(productInstantMs)) {
        return {
          status: "error",
          snapshot: null,
          freshness: "error",
        };
      }

      // Read-only: list + get only. Never put / evict / clear / fetch.
      const candidates = await store.list(sourceId);
      const selected = selectNearestSnapshotMetaByValidTime(
        candidates,
        productInstantMs,
      );

      if (selected === null) {
        const freshness = freshnessForSource(lifecycle, sourceId, false);
        return resolveWithoutStoreHit(freshness);
      }

      const entry = await store.get(sourceId, selected.versionId);
      if (entry === null) {
        const freshness = freshnessForSource(lifecycle, sourceId, false);
        return resolveWithoutStoreHit(freshness);
      }

      const freshness = freshnessForSource(lifecycle, sourceId, true);
      // Cached bytes remain usable while manager reports loading/stale/error.
      return {
        status: "ok",
        snapshot: entry.record,
        freshness,
      };
    },
  };
}
