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
 * App shell seam contracts (P10-6 + DLC-1/DLC-2/DLC-3 consumer hooks).
 * Host owns store/manager/resolver/acquisition/materializers; TimeContext carries a
 * read-only attachment for product-time resolve + sync prepared views.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import type {
  DynamicAcquisitionController,
  DynamicAcquisitionTimerHooks,
} from "./dynamicAcquisitionTypes";
import type {
  DynamicEquirectMaterializer,
  PreparedEquirectRasterView,
} from "./dynamicEquirectMaterializer";
import type {
  DynamicCloudOpacityMaterializer,
  PreparedCloudOpacityView,
} from "./dynamicCloudOpacityMaterializer";
import type {
  DynamicPointFeaturesMaterializer,
  PreparedPointFeaturesView,
} from "./dynamicPointFeaturesMaterializer";
import type {
  DynamicTracksMaterializer,
  PreparedTracksView,
} from "./dynamicTracksMaterializer";
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
 * Layers may resolve / select prepared views by product time; must not acquire / fetch / put.
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
  /** Sync per-source lifecycle state (freshness bridge for chrome / layers). */
  getLifecycleState(
    sourceId: DynamicSourceId,
  ): DynamicSourceLifecycleSnapshot;
  /**
   * Sync prepared equirect raster for Model B layers (DLC-1).
   * Returns null when no materialized version is available — never fetches.
   */
  getPreparedEquirectRaster(
    sourceId: DynamicSourceId,
  ): PreparedEquirectRasterView | null;
  /**
   * Sync prepared cloud opacity field for Model A illumination (DLC-4).
   * Returns null when no materialized version is available — never fetches.
   */
  getPreparedCloudOpacity(
    sourceId: DynamicSourceId,
  ): PreparedCloudOpacityView | null;
  /**
   * Sync prepared point features for Model B layers (DLC-2).
   * Returns null when no materialized version is available — never fetches.
   */
  getPreparedPointFeatures(
    sourceId: DynamicSourceId,
  ): PreparedPointFeaturesView | null;
  /**
   * Sync prepared tracks for Model B layers (DLC-3).
   * Returns null when no materialized version is available — never fetches.
   */
  getPreparedTracks(sourceId: DynamicSourceId): PreparedTracksView | null;
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
  readonly materializer: DynamicEquirectMaterializer;
  readonly cloudOpacityMaterializer: DynamicCloudOpacityMaterializer;
  readonly pointFeaturesMaterializer: DynamicPointFeaturesMaterializer;
  readonly tracksMaterializer: DynamicTracksMaterializer;

  /**
   * Build a TimeContext-attachable view bound to `productInstantMs`.
   * Safe to call every frame; allocate is cheap (closures over the host).
   */
  attachForProductInstant(
    productInstantMs: number,
  ): DynamicDataLifecycleAttachment;

  /**
   * DLC-1 / DLC-4: register fixture adapter + start periodic refresh for global clouds/IR.
   * Used by Model B overlay and Model A cloud participation (same durable sourceId).
   * Idempotent. Safe to call from config/effect paths — never from rAF paint.
   */
  ensureGlobalCloudsIrConsumer(options?: {
    intervalMs?: number;
    runImmediately?: boolean;
  }): void;

  /** Stop periodic refresh for the DLC-1 clouds/IR source (keeps cache). */
  stopGlobalCloudsIrConsumer(): void;

  /**
   * DLC-2: register fixture adapter + start periodic refresh for earthquakes.
   * Idempotent. Safe to call from config/effect paths — never from rAF paint.
   */
  ensureEarthquakesConsumer(options?: {
    intervalMs?: number;
    runImmediately?: boolean;
  }): void;

  /** Stop periodic refresh for the DLC-2 earthquakes source (keeps cache). */
  stopEarthquakesConsumer(): void;

  /**
   * DLC-3: register fixture adapter + start periodic refresh for ISS orbital tracks.
   * Idempotent. Safe to call from config/effect paths — never from rAF paint.
   */
  ensureOrbitalTracksConsumer(options?: {
    intervalMs?: number;
    runImmediately?: boolean;
  }): void;

  /** Stop periodic refresh for the DLC-3 ISS orbital tracks source (keeps cache). */
  stopOrbitalTracksConsumer(): void;

  /** Stop periodic acquisition timers and revoke prepared object URLs. */
  dispose(): void;
}

export type DynamicDataLifecycleHostDeps = Readonly<{
  /** Defaults to an in-memory store when omitted. */
  store?: DynamicSnapshotStore;
  lifecycle?: DynamicDataLifecycleManager;
  materializer?: DynamicEquirectMaterializer;
  cloudOpacityMaterializer?: DynamicCloudOpacityMaterializer;
  pointFeaturesMaterializer?: DynamicPointFeaturesMaterializer;
  tracksMaterializer?: DynamicTracksMaterializer;
}> &
  DynamicAcquisitionTimerHooks;
