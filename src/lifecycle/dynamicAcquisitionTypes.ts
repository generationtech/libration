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
 * Phase 10 dynamic data acquisition contracts (P10-5).
 * Async adapters + scheduler API — no RenderPlan, rAF, or UI.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import type { DynamicDataLifecycleManager } from "./dynamicLifecycleTypes";
import type {
  DynamicSnapshotStore,
  DynamicSnapshotStoreEntry,
} from "./dynamicSnapshotStoreTypes";
import type {
  DynamicSnapshotVersionId,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";

/**
 * Successful acquisition yields a store-ready entry (meta + body + optional bytes).
 * Adapters must not write the store themselves — the controller puts after validation.
 */
export type DynamicAcquisitionOk = Readonly<{
  ok: true;
  entry: DynamicSnapshotStoreEntry;
}>;

export type DynamicAcquisitionFail = Readonly<{
  ok: false;
  error: string;
}>;

export type DynamicAcquisitionResult =
  | DynamicAcquisitionOk
  | DynamicAcquisitionFail;

/**
 * Per-source async acquisition adapter.
 *
 * Implementations may fetch/convert offline or return recorded fixtures.
 * Must **not** be invoked from `requestAnimationFrame`, layer constructors,
 * or RenderPlan builders — only from the acquisition controller / scheduler.
 */
export interface DynamicSnapshotAcquisitionAdapter {
  readonly sourceId: DynamicSourceId;
  /**
   * Acquire one snapshot version for this source.
   * Honor `signal` when provided (cancel on stop / teardown).
   */
  acquire(signal?: AbortSignal): Promise<DynamicAcquisitionResult>;
}

export type DynamicAcquisitionImportResult =
  | { readonly ok: true; readonly versionId: DynamicSnapshotVersionId }
  | { readonly ok: false; readonly error: string };

export type DynamicAcquisitionRefreshResult =
  | { readonly ok: true; readonly versionId: DynamicSnapshotVersionId }
  | {
      readonly ok: false;
      readonly error: string;
      /** True when aborted via stop / signal (not a hard source failure). */
      readonly aborted?: true;
    };

export type DynamicAcquisitionStartPeriodicOptions = Readonly<{
  /** Refresh cadence in milliseconds (must be finite and > 0). */
  intervalMs: number;
  /** When true, kick off one refresh immediately (in addition to the interval). */
  runImmediately?: boolean;
}>;

export type DynamicAcquisitionStartPeriodicResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

/**
 * Acquisition controller: adapters → store → lifecycle manager.
 * Owns periodic scheduling. Never couples to paint / RenderPlan.
 */
export interface DynamicAcquisitionController {
  /** Register (or replace) an adapter for its `sourceId`. */
  registerAdapter(adapter: DynamicSnapshotAcquisitionAdapter): void;

  unregisterAdapter(sourceId: DynamicSourceId): void;

  /**
   * Manual / file-import path: put a prepared entry into the store and mark ready.
   * Does not call any network adapter.
   */
  importSnapshot(
    entry: DynamicSnapshotStoreEntry,
  ): Promise<DynamicAcquisitionImportResult>;

  /**
   * One-shot async acquire via the registered adapter → store.put → lifecycle.
   * Coalesces concurrent calls for the same source onto one in-flight promise.
   */
  refreshNow(
    sourceId: DynamicSourceId,
  ): Promise<DynamicAcquisitionRefreshResult>;

  /**
   * Start periodic refresh for a registered adapter.
   * Replaces any existing interval for the same source.
   */
  startPeriodic(
    sourceId: DynamicSourceId,
    options: DynamicAcquisitionStartPeriodicOptions,
  ): DynamicAcquisitionStartPeriodicResult;

  stopPeriodic(sourceId: DynamicSourceId): void;

  stopAll(): void;

  isPeriodicActive(sourceId: DynamicSourceId): boolean;

  listPeriodicSources(): readonly DynamicSourceId[];
}

/**
 * Opaque timer handle (DOM `number` or Node `Timeout`).
 * Kept loose so injectable hooks and default `setInterval` share one type.
 */
export type DynamicAcquisitionIntervalHandle =
  | number
  | ReturnType<typeof globalThis.setInterval>;

export type DynamicAcquisitionTimerHooks = Readonly<{
  nowMs?: () => number;
  setIntervalFn?: (
    handler: () => void,
    timeout: number,
  ) => DynamicAcquisitionIntervalHandle;
  clearIntervalFn?: (handle: DynamicAcquisitionIntervalHandle) => void;
}>;

/**
 * How adapter acquire failures map onto the lifecycle manager.
 *
 * - `error` — always `markError` (P10-5 default).
 * - `stale-when-cached` — when a prior `latestVersionId` exists, `markStale`
 *   so scrub/resolve keep showing usable cache; otherwise `markError`.
 *   Preferred for live HTTP adapters (DLU-2+).
 */
export type DynamicAcquisitionFailurePolicy = "error" | "stale-when-cached";

export type DynamicAcquisitionControllerDeps = Readonly<{
  store: DynamicSnapshotStore;
  lifecycle: DynamicDataLifecycleManager;
  /**
   * Failure disposition when `adapter.acquire` returns `{ ok: false }`
   * (or throws). Default `error`.
   */
  acquireFailurePolicy?: DynamicAcquisitionFailurePolicy;
}> &
  DynamicAcquisitionTimerHooks;
