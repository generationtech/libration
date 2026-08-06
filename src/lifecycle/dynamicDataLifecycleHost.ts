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
 * App shell seam host (P10-6 + DLC-1/DLC-2 consumer wiring).
 * Wires store + lifecycle manager + product-time resolver + acquisition +
 * equirect / point-features materializers. TimeContext attachments are read-only.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import { createDynamicAcquisitionController } from "./dynamicAcquisition";
import { createDynamicDataLifecycleManager } from "./dynamicLifecycleManager";
import { createDynamicEquirectMaterializer } from "./dynamicEquirectMaterializer";
import { createDynamicPointFeaturesMaterializer } from "./dynamicPointFeaturesMaterializer";
import { createDynamicSnapshotResolver } from "./dynamicSnapshotResolver";
import { createMemoryDynamicSnapshotStore } from "./memoryDynamicSnapshotStore";
import {
  GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS,
  GLOBAL_CLOUDS_IR_SOURCE_ID,
} from "./dynamicEquirectSourceCatalog";
import {
  USGS_EARTHQUAKES_DEFAULT_REFRESH_INTERVAL_MS,
  USGS_EARTHQUAKES_SOURCE_ID,
} from "./dynamicPointFeaturesSourceCatalog";
import { createGlobalCloudsIrFixtureAcquisitionAdapter } from "./globalCloudsIrAcquisition";
import { createEarthquakesFixtureAcquisitionAdapter } from "./earthquakesAcquisition";
import type {
  DynamicDataLifecycleAttachment,
  DynamicDataLifecycleHost,
  DynamicDataLifecycleHostDeps,
} from "./dynamicDataLifecycleHostTypes";
import type { DynamicSourceId } from "./dynamicSnapshotTypes";
import type { TimeContext } from "../layers/types";

/**
 * Create a process-local lifecycle host for the app shell.
 * Does not start periodic refresh until consumer ensure* methods are called.
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
  const pointFeaturesMaterializer =
    deps.pointFeaturesMaterializer ??
    createDynamicPointFeaturesMaterializer({ lifecycle });

  let disposed = false;
  let cloudsIrArmed = false;
  let earthquakesArmed = false;
  let unsubCloudsIr: (() => void) | undefined;
  let unsubEarthquakes: (() => void) | undefined;

  /**
   * After lifecycle marks ready, pull entry from the store into a sync materializer.
   * Runs outside rAF (async microtask from acquisition completion).
   */
  function wireMaterializeOnReady(
    sourceId: DynamicSourceId,
    onEntry: (entry: NonNullable<Awaited<ReturnType<typeof store.get>>>) => void,
    setUnsub: (unsub: (() => void) | undefined) => void,
  ): void {
    const unsub = lifecycle.subscribe(sourceId, (snap) => {
      if (snap.state !== "ready" || snap.latestVersionId === undefined) {
        return;
      }
      const versionId = snap.latestVersionId;
      void store.get(sourceId, versionId).then((entry) => {
        if (entry !== null) {
          onEntry(entry);
        }
      });
    });
    setUnsub(unsub);
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
      getPreparedPointFeatures(sourceId) {
        return pointFeaturesMaterializer.selectForProductInstant(
          sourceId,
          instant,
        );
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
      unsubCloudsIr?.();
      wireMaterializeOnReady(
        GLOBAL_CLOUDS_IR_SOURCE_ID,
        (entry) => materializer.noteStoreEntry(entry),
        (u) => {
          unsubCloudsIr = u;
        },
      );
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

  function ensureEarthquakesConsumer(options?: {
    intervalMs?: number;
    runImmediately?: boolean;
  }): void {
    if (disposed) return;
    const intervalMs =
      options?.intervalMs !== undefined &&
      Number.isFinite(options.intervalMs) &&
      options.intervalMs > 0
        ? options.intervalMs
        : USGS_EARTHQUAKES_DEFAULT_REFRESH_INTERVAL_MS;
    const runImmediately = options?.runImmediately !== false;

    if (!earthquakesArmed) {
      acquisition.registerAdapter(createEarthquakesFixtureAcquisitionAdapter());
      unsubEarthquakes?.();
      wireMaterializeOnReady(
        USGS_EARTHQUAKES_SOURCE_ID,
        (entry) => pointFeaturesMaterializer.noteStoreEntry(entry),
        (u) => {
          unsubEarthquakes = u;
        },
      );
      earthquakesArmed = true;
    }

    if (!acquisition.isPeriodicActive(USGS_EARTHQUAKES_SOURCE_ID)) {
      acquisition.startPeriodic(USGS_EARTHQUAKES_SOURCE_ID, {
        intervalMs,
        runImmediately,
      });
    }
  }

  function stopEarthquakesConsumer(): void {
    acquisition.stopPeriodic(USGS_EARTHQUAKES_SOURCE_ID);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    unsubCloudsIr?.();
    unsubCloudsIr = undefined;
    unsubEarthquakes?.();
    unsubEarthquakes = undefined;
    acquisition.stopAll();
    materializer.revokeAll();
    pointFeaturesMaterializer.clearAll();
    cloudsIrArmed = false;
    earthquakesArmed = false;
  }

  return {
    store,
    lifecycle,
    resolver,
    acquisition,
    materializer,
    pointFeaturesMaterializer,
    attachForProductInstant,
    ensureGlobalCloudsIrConsumer,
    stopGlobalCloudsIrConsumer,
    ensureEarthquakesConsumer,
    stopEarthquakesConsumer,
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
