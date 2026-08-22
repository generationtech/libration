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
 * App shell seam host (P10-6 + DLC-1…DLC-4 + DLU-3…DLU-7 consumer wiring).
 * Wires store + lifecycle manager + product-time resolver + acquisition +
 * equirect / cloud-opacity / point-features / tracks materializers.
 * Clouds v3 uses live per-sector GEO IR (GIBS GOES/Himawari + EUMET MSG FES)
 * with the EUMETView geostationary ring as coverage backstop. Production does
 * not fall back to fixture. IR→cloud-highlight materialization runs outside rAF.
 * Earthquakes use live USGS HTTP (DLU-3) with no production fixture fallback.
 * ISS orbital tracks use ordered live TLE acquisition (CelesTrak primary,
 * Where the ISS at secondary). Production does not fall back to fixture;
 * all-provider failure with no usable live TLE hides ISS.
 *
 * DLU-7 closed the live acquisition track for these four consumers.
 * TimeContext attachments are read-only.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import { createDynamicAcquisitionController } from "./dynamicAcquisition";
import { createDynamicDataLifecycleManager } from "./dynamicLifecycleManager";
import { createDynamicEquirectMaterializer } from "./dynamicEquirectMaterializer";
import { createDynamicCloudOpacityMaterializer } from "./dynamicCloudOpacityMaterializer";
import { createDynamicPointFeaturesMaterializer } from "./dynamicPointFeaturesMaterializer";
import { createDynamicTracksMaterializer } from "./dynamicTracksMaterializer";
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
import {
  ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS,
  ISS_ORBITAL_TRACK_SOURCE_ID,
} from "./dynamicTracksSourceCatalog";
import { ISS_TLE_FAILURE_RETRY_MS } from "./issOrbitalTrackAcquisition";
import {
  createGlobalCloudsIrLiveHttpAcquisitionAdapter,
  materializeCloudsHighlightStoreEntry,
} from "./globalCloudsIrAcquisition";
import { createEarthquakesLiveHttpAcquisitionAdapter } from "./earthquakesAcquisition";
import { createIssOrbitalTrackLiveHttpAcquisitionAdapter } from "./issOrbitalTrackAcquisition";
import type {
  DynamicDataLifecycleAttachment,
  DynamicDataLifecycleAttachOptions,
  DynamicDataLifecycleHost,
  DynamicDataLifecycleHostDeps,
  DynamicLifecycleConsumerFlags,
} from "./dynamicDataLifecycleHostTypes";
import type { DynamicSourceId } from "./dynamicSnapshotTypes";
import type { TimeContext } from "../layers/types";
import { isProductTimeLiveEnough } from "../core/liveProductTimePolicy";
import { isWallClockCurrentSource } from "./dynamicSourceTimePolicy";

const CLOUDS_SNAPSHOT_RETENTION = 4;

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
    // DLU-2: prefer stale over hard error when a prior version remains usable.
    acquireFailurePolicy: "stale-when-cached",
    nowMs: deps.nowMs,
    setIntervalFn: deps.setIntervalFn,
    clearIntervalFn: deps.clearIntervalFn,
  });
  const materializer =
    deps.materializer ??
    createDynamicEquirectMaterializer({ lifecycle });
  const cloudOpacityMaterializer =
    deps.cloudOpacityMaterializer ??
    createDynamicCloudOpacityMaterializer({ lifecycle });
  const pointFeaturesMaterializer =
    deps.pointFeaturesMaterializer ??
    createDynamicPointFeaturesMaterializer({ lifecycle });
  const tracksMaterializer =
    deps.tracksMaterializer ??
    createDynamicTracksMaterializer({ lifecycle });

  let disposed = false;
  let cloudsIrArmed = false;
  let earthquakesArmed = false;
  let orbitalTracksArmed = false;
  let unsubCloudsIr: (() => void) | undefined;
  let unsubEarthquakes: (() => void) | undefined;
  let unsubOrbitalTracks: (() => void) | undefined;
  let issFailureRetryHandle: ReturnType<typeof setTimeout> | undefined;
  const setTimeoutFn =
    deps.setTimeoutFn ??
    ((handler: () => void, timeout: number) => setTimeout(handler, timeout));
  const clearTimeoutFn =
    deps.clearTimeoutFn ??
    ((handle: ReturnType<typeof setTimeout>) => {
      clearTimeout(handle);
    });

  function clearIssFailureRetry(): void {
    if (issFailureRetryHandle === undefined) return;
    clearTimeoutFn(issFailureRetryHandle);
    issFailureRetryHandle = undefined;
  }

  function scheduleIssFailureRetry(): void {
    if (disposed || !orbitalTracksArmed) return;
    if (issFailureRetryHandle !== undefined) return;
    issFailureRetryHandle = setTimeoutFn(() => {
      issFailureRetryHandle = undefined;
      if (disposed || !orbitalTracksArmed) return;
      if (!acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)) return;
      void acquisition.refreshNow(ISS_ORBITAL_TRACK_SOURCE_ID);
    }, ISS_TLE_FAILURE_RETRY_MS) as ReturnType<typeof setTimeout>;
  }

  async function trimCloudsSnapshotRetention(): Promise<void> {
    const metas = await store.list(GLOBAL_CLOUDS_IR_SOURCE_ID);
    if (metas.length <= CLOUDS_SNAPSHOT_RETENTION) return;
    const drop = metas
      .slice()
      .sort((a, b) => b.validTimeMs - a.validTimeMs)
      .slice(CLOUDS_SNAPSHOT_RETENTION);
    for (const meta of drop) {
      await store.evict(GLOBAL_CLOUDS_IR_SOURCE_ID, meta.versionId);
      materializer.dropIndexedVersion(GLOBAL_CLOUDS_IR_SOURCE_ID, meta.versionId);
    }
  }

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
    options?: DynamicDataLifecycleAttachOptions,
  ): DynamicDataLifecycleAttachment {
    const instant = Number.isFinite(productInstantMs)
      ? productInstantMs
      : Number.NaN;
    const wallClockUtcMs = options?.wallClockUtcMs;
    const allowCurrentOnly =
      wallClockUtcMs === undefined ||
      isProductTimeLiveEnough(instant, wallClockUtcMs);

    function allowPreparedView(sourceId: DynamicSourceId): boolean {
      if (allowCurrentOnly) return true;
      return !isWallClockCurrentSource(sourceId);
    }

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
        if (!allowPreparedView(sourceId)) return null;
        return materializer.selectForProductInstant(sourceId, instant);
      },
      getPreparedCloudOpacity(sourceId) {
        if (!allowPreparedView(sourceId)) return null;
        return cloudOpacityMaterializer.selectForProductInstant(sourceId, instant);
      },
      getPreparedPointFeatures(sourceId) {
        if (!allowPreparedView(sourceId)) return null;
        return pointFeaturesMaterializer.selectForProductInstant(
          sourceId,
          instant,
        );
      },
      getPreparedTracks(sourceId) {
        if (!allowPreparedView(sourceId)) return null;
        return tracksMaterializer.selectForProductInstant(sourceId, instant);
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
      acquisition.registerAdapter(
        createGlobalCloudsIrLiveHttpAcquisitionAdapter({
          useFixtureFallback: false,
          requireMosaicDimensions: deps.cloudsIrLiveFetchFn === undefined,
          timeoutMs: 15_000,
          // Shared host clock → durable versionId / validTimeMs (observation TIME).
          ...(deps.nowMs !== undefined ? { nowMs: deps.nowMs } : {}),
          ...(deps.cloudsIrLiveFetchFn !== undefined
            ? { fetchFn: deps.cloudsIrLiveFetchFn }
            : {}),
          ...(deps.tintCloudsComposite !== undefined
            ? { tintComposite: deps.tintCloudsComposite }
            : {}),
        }),
      );
      unsubCloudsIr?.();
      wireMaterializeOnReady(
        GLOBAL_CLOUDS_IR_SOURCE_ID,
        (entry) => {
          const highlighted = materializeCloudsHighlightStoreEntry(entry);
          if (highlighted === null) return;
          materializer.noteStoreEntry(highlighted);
          void trimCloudsSnapshotRetention();
        },
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
      acquisition.registerAdapter(
        createEarthquakesLiveHttpAcquisitionAdapter({
          useFixtureFallback: false,
          ...(deps.nowMs !== undefined ? { nowMs: deps.nowMs } : {}),
          ...(deps.earthquakesLiveFetchFn !== undefined
            ? { fetchFn: deps.earthquakesLiveFetchFn }
            : {}),
        }),
      );
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

  function ensureOrbitalTracksConsumer(options?: {
    intervalMs?: number;
    runImmediately?: boolean;
  }): void {
    if (disposed) return;
    const intervalMs =
      options?.intervalMs !== undefined &&
      Number.isFinite(options.intervalMs) &&
      options.intervalMs > 0
        ? options.intervalMs
        : ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS;
    const runImmediately = options?.runImmediately !== false;

    if (!orbitalTracksArmed) {
      acquisition.registerAdapter(
        createIssOrbitalTrackLiveHttpAcquisitionAdapter({
          useFixtureFallback: false,
          ...(deps.nowMs !== undefined ? { nowMs: deps.nowMs } : {}),
          ...(deps.orbitalTracksLiveFetchFn !== undefined
            ? { fetchFn: deps.orbitalTracksLiveFetchFn }
            : {}),
        }),
      );
      unsubOrbitalTracks?.();
      wireMaterializeOnReady(
        ISS_ORBITAL_TRACK_SOURCE_ID,
        (entry) => tracksMaterializer.noteStoreEntry(entry),
        (u) => {
          unsubOrbitalTracks = u;
        },
      );
      const unsubIssRetry = lifecycle.subscribe(
        ISS_ORBITAL_TRACK_SOURCE_ID,
        (snap) => {
          if (snap.state === "error") {
            scheduleIssFailureRetry();
          } else {
            clearIssFailureRetry();
          }
        },
      );
      const unsubMaterialize = unsubOrbitalTracks;
      unsubOrbitalTracks = () => {
        unsubMaterialize?.();
        unsubIssRetry();
        clearIssFailureRetry();
      };
      orbitalTracksArmed = true;
    }

    if (!acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)) {
      // Re-enable with a still-usable live snapshot paints from memory.
      // Do not re-download until the 2 h cadence (or a later stale/error retry).
      const snap = lifecycle.getState(ISS_ORBITAL_TRACK_SOURCE_ID);
      const skipImmediateBecauseFreshCache =
        snap.state === "ready" && snap.latestVersionId !== undefined;
      acquisition.startPeriodic(ISS_ORBITAL_TRACK_SOURCE_ID, {
        intervalMs,
        runImmediately: runImmediately && !skipImmediateBecauseFreshCache,
      });
    }
  }

  function stopOrbitalTracksConsumer(): void {
    clearIssFailureRetry();
    acquisition.stopPeriodic(ISS_ORBITAL_TRACK_SOURCE_ID);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    unsubCloudsIr?.();
    unsubCloudsIr = undefined;
    unsubEarthquakes?.();
    unsubEarthquakes = undefined;
    unsubOrbitalTracks?.();
    unsubOrbitalTracks = undefined;
    clearIssFailureRetry();
    acquisition.stopAll();
    materializer.revokeAll();
    cloudOpacityMaterializer.clearAll();
    pointFeaturesMaterializer.clearAll();
    tracksMaterializer.clearAll();
    cloudsIrArmed = false;
    earthquakesArmed = false;
    orbitalTracksArmed = false;
  }

  return {
    store,
    lifecycle,
    resolver,
    acquisition,
    materializer,
    cloudOpacityMaterializer,
    pointFeaturesMaterializer,
    tracksMaterializer,
    attachForProductInstant,
    ensureGlobalCloudsIrConsumer,
    stopGlobalCloudsIrConsumer,
    ensureEarthquakesConsumer,
    stopEarthquakesConsumer,
    ensureOrbitalTracksConsumer,
    stopOrbitalTracksConsumer,
    isDisposed() {
      return disposed;
    },
    dispose,
  };
}

/**
 * Return `host` when it can still arm consumers; otherwise a fresh host.
 * DEV React StrictMode remounts dispose the canvas-effect host while App refs
 * survive, so the shell must replace the dead instance before re-arming.
 */
export function reviveDisposedDynamicLifecycleHost(
  host: DynamicDataLifecycleHost,
  deps: DynamicDataLifecycleHostDeps = {},
): DynamicDataLifecycleHost {
  return host.isDisposed() ? createDynamicDataLifecycleHost(deps) : host;
}

/**
 * Arm or stop the three live consumers from config flags.
 * Idempotent. Safe from config/effect paths — never from rAF paint.
 */
export function armDynamicLifecycleConsumers(
  host: DynamicDataLifecycleHost,
  flags: DynamicLifecycleConsumerFlags,
): void {
  const liveEnough = flags.productTimeLiveEnough !== false;
  if (flags.cloudsIrOverlay && liveEnough) {
    host.ensureGlobalCloudsIrConsumer({ runImmediately: true });
  } else {
    host.stopGlobalCloudsIrConsumer();
  }
  if (flags.earthquakes && liveEnough) {
    host.ensureEarthquakesConsumer({ runImmediately: true });
  } else {
    host.stopEarthquakesConsumer();
  }
  if (flags.orbitalTracks && liveEnough) {
    host.ensureOrbitalTracksConsumer({ runImmediately: true });
  } else {
    host.stopOrbitalTracksConsumer();
  }
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
