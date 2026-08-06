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
 * App shell seam host (P10-6 + DLC-1 consumer wiring).
 * Wires store + lifecycle manager + product-time resolver + acquisition +
 * equirect materializer. TimeContext attachments are read-only.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import { createDynamicAcquisitionController } from "./dynamicAcquisition";
import { createDynamicDataLifecycleManager } from "./dynamicLifecycleManager";
import { createDynamicEquirectMaterializer } from "./dynamicEquirectMaterializer";
import { createDynamicSnapshotResolver } from "./dynamicSnapshotResolver";
import { createMemoryDynamicSnapshotStore } from "./memoryDynamicSnapshotStore";
import {
  GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS,
  GLOBAL_CLOUDS_IR_SOURCE_ID,
} from "./dynamicEquirectSourceCatalog";
import { createGlobalCloudsIrFixtureAcquisitionAdapter } from "./globalCloudsIrAcquisition";
import type {
  DynamicDataLifecycleAttachment,
  DynamicDataLifecycleHost,
  DynamicDataLifecycleHostDeps,
} from "./dynamicDataLifecycleHostTypes";
import type { TimeContext } from "../layers/types";

/**
 * Create a process-local lifecycle host for the app shell.
 * Does not start periodic refresh until {@link DynamicDataLifecycleHost.ensureGlobalCloudsIrConsumer}.
 */
export function createDynamicDataLifecycleHost(
  deps: DynamicDataLifecycleHostDeps = {},
): DynamicDataLifecycleHost {
  const store = deps.store ?? createMemoryDynamicSnapshotStore();
  const lifecycle = deps.lifecycle ?? createDynamicDataLifecycleManager();
  const resolver = createDynamicSnapshotResolver({ store, lifecycle });
  const acquisition = createDynamicAcquisitionController({
    store,
    lifecycle,
    nowMs: deps.nowMs,
    setIntervalFn: deps.setIntervalFn,
    clearIntervalFn: deps.clearIntervalFn,
  });
  const materializer =
    deps.materializer ??
    createDynamicEquirectMaterializer({ lifecycle });

  let disposed = false;
  let cloudsIrArmed = false;
  let unsubCloudsIr: (() => void) | undefined;

  /**
   * After lifecycle marks ready, pull bytes from the store into the sync materializer.
   * Runs outside rAF (async microtask from acquisition completion).
   */
  function wireMaterializeOnReady(sourceId: typeof GLOBAL_CLOUDS_IR_SOURCE_ID): void {
    unsubCloudsIr?.();
    unsubCloudsIr = lifecycle.subscribe(sourceId, (snap) => {
      if (snap.state !== "ready" || snap.latestVersionId === undefined) {
        return;
      }
      const versionId = snap.latestVersionId;
      void store.get(sourceId, versionId).then((entry) => {
        if (entry !== null) {
          materializer.noteStoreEntry(entry);
        }
      });
    });
  }

  function attachForProductInstant(
    productInstantMs: number,
  ): DynamicDataLifecycleAttachment {
    const instant = Number.isFinite(productInstantMs)
      ? productInstantMs
      : Number.NaN;
    return {
      productInstantMs: instant,
      resolveSnapshot(sourceId) {
        // Scrub-safe: resolver lists/gets only — never acquisition / put.
        return resolver.resolveSnapshot(sourceId, instant);
      },
      getLifecycleState(sourceId) {
        return lifecycle.getState(sourceId);
      },
      getPreparedEquirectRaster(sourceId) {
        return materializer.selectForProductInstant(sourceId, instant);
      },
    };
  }

  function ensureGlobalCloudsIrConsumer(options?: {
    intervalMs?: number;
    runImmediately?: boolean;
  }): void {
    if (disposed) return;
    const intervalMs =
      options?.intervalMs !== undefined &&
      Number.isFinite(options.intervalMs) &&
      options.intervalMs > 0
        ? options.intervalMs
        : GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS;
    const runImmediately = options?.runImmediately !== false;

    if (!cloudsIrArmed) {
      acquisition.registerAdapter(createGlobalCloudsIrFixtureAcquisitionAdapter());
      wireMaterializeOnReady(GLOBAL_CLOUDS_IR_SOURCE_ID);
      cloudsIrArmed = true;
    }

    // Idempotent: do not reset the interval every frame when the shell re-arms.
    if (!acquisition.isPeriodicActive(GLOBAL_CLOUDS_IR_SOURCE_ID)) {
      acquisition.startPeriodic(GLOBAL_CLOUDS_IR_SOURCE_ID, {
        intervalMs,
        runImmediately,
      });
    }
  }

  function stopGlobalCloudsIrConsumer(): void {
    acquisition.stopPeriodic(GLOBAL_CLOUDS_IR_SOURCE_ID);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    unsubCloudsIr?.();
    unsubCloudsIr = undefined;
    acquisition.stopAll();
    materializer.revokeAll();
    cloudsIrArmed = false;
  }

  return {
    store,
    lifecycle,
    resolver,
    acquisition,
    materializer,
    attachForProductInstant,
    ensureGlobalCloudsIrConsumer,
    stopGlobalCloudsIrConsumer,
    dispose,
  };
}

/**
 * Reuses `dynamicDataLifecycle` on the time object when the shell attached one
 * for this tick; otherwise returns `undefined` (no silent acquisition).
 */
export function getDynamicDataLifecycleAttachment(
  time: Pick<TimeContext, "dynamicDataLifecycle">,
): DynamicDataLifecycleAttachment | undefined {
  return time.dynamicDataLifecycle;
}
