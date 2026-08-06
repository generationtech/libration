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
 * Dynamic data acquisition controller (P10-5).
 * Async adapters + periodic scheduler + manual/file import → versioned store.
 * Never schedules via requestAnimationFrame; never called from RenderPlan build.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import { isValidDynamicSourceId } from "./dynamicSnapshotContracts";
import type {
  DynamicAcquisitionController,
  DynamicAcquisitionControllerDeps,
  DynamicAcquisitionFailurePolicy,
  DynamicAcquisitionImportResult,
  DynamicAcquisitionIntervalHandle,
  DynamicAcquisitionRefreshResult,
  DynamicAcquisitionResult,
  DynamicAcquisitionStartPeriodicOptions,
  DynamicAcquisitionStartPeriodicResult,
  DynamicSnapshotAcquisitionAdapter,
} from "./dynamicAcquisitionTypes";
import {
  applyLiveAcquireFailureToLifecycle,
  resolveLiveAcquireFailureDisposition,
} from "./liveHttpAcquisition";
import type { DynamicDataLifecycleManager } from "./dynamicLifecycleTypes";
import type { DynamicSnapshotStoreEntry } from "./dynamicSnapshotStoreTypes";
import type { DynamicSourceId } from "./dynamicSnapshotTypes";

type PeriodicRow = {
  handle: DynamicAcquisitionIntervalHandle;
  abort: AbortController;
};

type MutableControllerState = {
  adapters: Map<DynamicSourceId, DynamicSnapshotAcquisitionAdapter>;
  periodic: Map<DynamicSourceId, PeriodicRow>;
  inFlight: Map<DynamicSourceId, Promise<DynamicAcquisitionRefreshResult>>;
};

/**
 * Build a controller that drives acquisition outside the paint path.
 * Uses `setInterval` (injectable) — never `requestAnimationFrame`.
 */
export function createDynamicAcquisitionController(
  deps: DynamicAcquisitionControllerDeps,
): DynamicAcquisitionController {
  const { store, lifecycle } = deps;
  const nowMs = deps.nowMs ?? (() => Date.now());
  const acquireFailurePolicy: DynamicAcquisitionFailurePolicy =
    deps.acquireFailurePolicy ?? "error";
  const setIntervalFn: (
    handler: () => void,
    timeout: number,
  ) => DynamicAcquisitionIntervalHandle =
    deps.setIntervalFn ??
    ((handler, timeout) => setInterval(handler, timeout));
  const clearIntervalFn: (handle: DynamicAcquisitionIntervalHandle) => void =
    deps.clearIntervalFn ??
    ((handle) => {
      clearInterval(handle as ReturnType<typeof setInterval>);
    });

  function markAcquireFailure(sourceId: DynamicSourceId, message: string): void {
    const snap = lifecycle.getState(sourceId);
    const disposition = resolveLiveAcquireFailureDisposition({
      hasUsableCachedVersion: snap.latestVersionId !== undefined,
      policy: acquireFailurePolicy,
    });
    applyLiveAcquireFailureToLifecycle(lifecycle, sourceId, message, disposition);
  }

  const state: MutableControllerState = {
    adapters: new Map(),
    periodic: new Map(),
    inFlight: new Map(),
  };

  function registerAdapter(adapter: DynamicSnapshotAcquisitionAdapter): void {
    if (!isValidDynamicSourceId(adapter.sourceId)) {
      throw new Error("invalid adapter.sourceId");
    }
    state.adapters.set(adapter.sourceId, adapter);
    lifecycle.ensureSource(adapter.sourceId);
  }

  function unregisterAdapter(sourceId: DynamicSourceId): void {
    stopPeriodic(sourceId);
    state.adapters.delete(sourceId);
  }

  async function importSnapshot(
    entry: DynamicSnapshotStoreEntry,
  ): Promise<DynamicAcquisitionImportResult> {
    const sourceId = entry?.record?.meta?.sourceId;
    if (!isValidDynamicSourceId(sourceId)) {
      return { ok: false, error: "invalid sourceId" };
    }

    lifecycle.ensureSource(sourceId);
    const put = await store.put(entry);
    if (!put.ok) {
      lifecycle.markError(sourceId, put.error);
      return { ok: false, error: put.error };
    }

    const versionId = entry.record.meta.versionId;
    lifecycle.markReady(sourceId, { latestVersionId: versionId });
    return { ok: true, versionId };
  }

  function recoverAfterAbort(sourceId: DynamicSourceId): DynamicAcquisitionRefreshResult {
    const snap = lifecycle.getState(sourceId);
    if (snap.state === "loading") {
      if (snap.latestVersionId !== undefined) {
        // Preserve usable cache; loading → ready is allowed.
        lifecycle.markReady(sourceId, {
          latestVersionId: snap.latestVersionId,
        });
      } else {
        lifecycle.markIdle(sourceId);
      }
    }
    return { ok: false, error: "aborted", aborted: true };
  }

  async function runAcquire(
    sourceId: DynamicSourceId,
    adapter: DynamicSnapshotAcquisitionAdapter,
    signal: AbortSignal,
  ): Promise<DynamicAcquisitionRefreshResult> {
    if (signal.aborted) {
      return recoverAfterAbort(sourceId);
    }

    lifecycle.ensureSource(sourceId);
    lifecycle.markLoading(sourceId);

    let acquired: DynamicAcquisitionResult;
    try {
      acquired = await adapter.acquire(signal);
    } catch (err) {
      if (signal.aborted) {
        return recoverAfterAbort(sourceId);
      }
      const message =
        err instanceof Error && err.message.trim().length > 0
          ? err.message.trim()
          : "acquisition threw";
      markAcquireFailure(sourceId, message);
      return { ok: false, error: message };
    }

    if (signal.aborted) {
      return recoverAfterAbort(sourceId);
    }

    if (!acquired.ok) {
      const message =
        acquired.error.trim().length > 0 ? acquired.error.trim() : "acquire failed";
      markAcquireFailure(sourceId, message);
      return { ok: false, error: message };
    }

    if (acquired.entry.record.meta.sourceId !== sourceId) {
      const message = "adapter entry sourceId mismatch";
      markAcquireFailure(sourceId, message);
      return { ok: false, error: message };
    }

    // acquiredAtMs is when the app accepted the bytes (controller clock).
    const stamped: DynamicSnapshotStoreEntry = {
      record: {
        meta: {
          ...acquired.entry.record.meta,
          acquiredAtMs: nowMs(),
        },
        body: acquired.entry.record.body,
      },
      ...(acquired.entry.payloadBytes !== undefined
        ? { payloadBytes: acquired.entry.payloadBytes }
        : {}),
    };

    const put = await store.put(stamped);
    if (!put.ok) {
      lifecycle.markError(sourceId, put.error);
      return { ok: false, error: put.error };
    }

    const versionId = stamped.record.meta.versionId;
    lifecycle.markReady(sourceId, { latestVersionId: versionId });
    return { ok: true, versionId };
  }

  function refreshNow(
    sourceId: DynamicSourceId,
  ): Promise<DynamicAcquisitionRefreshResult> {
    if (!isValidDynamicSourceId(sourceId)) {
      return Promise.resolve({ ok: false, error: "invalid sourceId" });
    }

    const existing = state.inFlight.get(sourceId);
    if (existing !== undefined) {
      return existing;
    }

    const adapter = state.adapters.get(sourceId);
    if (adapter === undefined) {
      return Promise.resolve({
        ok: false,
        error: "no adapter registered for source",
      });
    }

    const periodic = state.periodic.get(sourceId);
    const signal =
      periodic !== undefined ? periodic.abort.signal : new AbortController().signal;

    const promise = runAcquire(sourceId, adapter, signal).finally(() => {
      state.inFlight.delete(sourceId);
    });
    state.inFlight.set(sourceId, promise);
    return promise;
  }

  function stopPeriodic(sourceId: DynamicSourceId): void {
    const row = state.periodic.get(sourceId);
    if (row === undefined) return;
    clearIntervalFn(row.handle);
    row.abort.abort();
    state.periodic.delete(sourceId);
  }

  function startPeriodic(
    sourceId: DynamicSourceId,
    options: DynamicAcquisitionStartPeriodicOptions,
  ): DynamicAcquisitionStartPeriodicResult {
    if (!isValidDynamicSourceId(sourceId)) {
      return { ok: false, error: "invalid sourceId" };
    }
    if (!state.adapters.has(sourceId)) {
      return { ok: false, error: "no adapter registered for source" };
    }
    const intervalMs = options.intervalMs;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      return { ok: false, error: "intervalMs must be a finite number > 0" };
    }

    stopPeriodic(sourceId);
    const abort = new AbortController();
    const handle = setIntervalFn(() => {
      // Fire-and-forget; errors surface via lifecycle markError.
      void refreshNow(sourceId);
    }, intervalMs);
    state.periodic.set(sourceId, { handle, abort });

    if (options.runImmediately === true) {
      void refreshNow(sourceId);
    }

    return { ok: true };
  }

  function stopAll(): void {
    for (const sourceId of [...state.periodic.keys()]) {
      stopPeriodic(sourceId);
    }
  }

  function isPeriodicActive(sourceId: DynamicSourceId): boolean {
    return state.periodic.has(sourceId);
  }

  function listPeriodicSources(): readonly DynamicSourceId[] {
    return [...state.periodic.keys()].sort((a, b) => a.localeCompare(b));
  }

  return {
    registerAdapter,
    unregisterAdapter,
    importSnapshot,
    refreshNow,
    startPeriodic,
    stopPeriodic,
    stopAll,
    isPeriodicActive,
    listPeriodicSources,
  };
}

/**
 * Adapter that returns a fixed recorded fixture (or a producer callback).
 * Useful for tests and manual-import rehearsals — no network.
 */
export function createFixtureAcquisitionAdapter(
  sourceId: DynamicSourceId,
  produce: (
    signal?: AbortSignal,
  ) => DynamicAcquisitionResult | Promise<DynamicAcquisitionResult>,
): DynamicSnapshotAcquisitionAdapter {
  if (!isValidDynamicSourceId(sourceId)) {
    throw new Error("invalid sourceId");
  }
  return {
    sourceId,
    async acquire(signal?: AbortSignal): Promise<DynamicAcquisitionResult> {
      if (signal?.aborted) {
        return { ok: false, error: "aborted" };
      }
      return produce(signal);
    },
  };
}

/** Re-export manager type for dep wiring clarity at call sites. */
export type { DynamicDataLifecycleManager };
