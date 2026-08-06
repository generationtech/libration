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
 * App shell seam contracts (P10-6).
 * Host owns store/manager/resolver/acquisition; TimeContext carries a
 * read-only attachment for product-time resolve. No scene overlay UI.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import type {
  DynamicAcquisitionController,
  DynamicAcquisitionTimerHooks,
} from "./dynamicAcquisitionTypes";
import type {
  DynamicDataLifecycleManager,
  DynamicSourceLifecycleSnapshot,
} from "./dynamicLifecycleTypes";
import type { DynamicSnapshotResolver } from "./dynamicSnapshotResolver";
import type { DynamicSnapshotStore } from "./dynamicSnapshotStoreTypes";
import type {
  DynamicSnapshotResolveResult,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";

/**
 * Read-only view the shell attaches on TimeContext each tick.
 * Future layers may resolve by product time; must not acquire / fetch / put.
 */
export type DynamicDataLifecycleAttachment = Readonly<{
  /** Canonical product UTC for this frame (matches TimeContext.now). */
  productInstantMs: number;
  /**
   * Scrub-safe resolve against the versioned store for {@link productInstantMs}.
   * Never triggers acquisition adapters or store writes.
   */
  resolveSnapshot(
    sourceId: DynamicSourceId,
  ): Promise<DynamicSnapshotResolveResult>;
  /** Sync per-source lifecycle state (freshness bridge for future chrome). */
  getLifecycleState(
    sourceId: DynamicSourceId,
  ): DynamicSourceLifecycleSnapshot;
}>;

/**
 * Process-local lifecycle bundle for the app shell.
 * Acquisition runs only through {@link acquisition} (outside rAF / RenderPlan).
 */
export interface DynamicDataLifecycleHost {
  readonly store: DynamicSnapshotStore;
  readonly lifecycle: DynamicDataLifecycleManager;
  readonly resolver: DynamicSnapshotResolver;
  readonly acquisition: DynamicAcquisitionController;

  /**
   * Build a TimeContext-attachable view bound to `productInstantMs`.
   * Safe to call every frame; allocate is cheap (closures over the host).
   */
  attachForProductInstant(
    productInstantMs: number,
  ): DynamicDataLifecycleAttachment;

  /** Stop periodic acquisition timers; safe to call repeatedly. */
  dispose(): void;
}

export type DynamicDataLifecycleHostDeps = Readonly<{
  /** Defaults to an in-memory store when omitted. */
  store?: DynamicSnapshotStore;
  lifecycle?: DynamicDataLifecycleManager;
}> &
  DynamicAcquisitionTimerHooks;
