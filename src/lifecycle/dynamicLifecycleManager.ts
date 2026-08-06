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
 * Dynamic data lifecycle manager (P10-3).
 * Per-source state machine + subscribe/unsubscribe. No network, store I/O,
 * product-time resolve, RenderPlan, or UI.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import {
  isValidDynamicSnapshotVersionId,
  isValidDynamicSourceId,
} from "./dynamicSnapshotContracts";
import type {
  DynamicSnapshotVersionId,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";
import type {
  DynamicDataLifecycleManager,
  DynamicLifecycleMarkReadyOptions,
  DynamicLifecycleTransitionResult,
  DynamicSourceLifecycleListener,
  DynamicSourceLifecycleSnapshot,
  DynamicSourceLifecycleState,
} from "./dynamicLifecycleTypes";
import { DYNAMIC_SOURCE_LIFECYCLE_STATES } from "./dynamicLifecycleTypes";

/**
 * Allowed edges for the per-source machine.
 * Same-state calls are handled as idempotent no-ops in transition helpers
 * (not listed here).
 */
const ALLOWED_TRANSITIONS: Readonly<
  Record<DynamicSourceLifecycleState, readonly DynamicSourceLifecycleState[]>
> = {
  idle: ["loading", "ready", "error"],
  loading: ["ready", "error", "idle"],
  ready: ["loading", "stale", "error", "idle"],
  stale: ["loading", "ready", "error", "idle"],
  error: ["loading", "idle"],
};

function isLifecycleState(
  value: unknown,
): value is DynamicSourceLifecycleState {
  return (
    typeof value === "string" &&
    (DYNAMIC_SOURCE_LIFECYCLE_STATES as readonly string[]).includes(value)
  );
}

function canTransition(
  from: DynamicSourceLifecycleState,
  to: DynamicSourceLifecycleState,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

function syntheticIdle(sourceId: DynamicSourceId): DynamicSourceLifecycleSnapshot {
  return { sourceId, state: "idle", revision: 0 };
}

function cloneSnapshot(
  row: DynamicSourceLifecycleSnapshot,
): DynamicSourceLifecycleSnapshot {
  return {
    sourceId: row.sourceId,
    state: row.state,
    ...(row.lastError !== undefined ? { lastError: row.lastError } : {}),
    ...(row.latestVersionId !== undefined
      ? { latestVersionId: row.latestVersionId }
      : {}),
    revision: row.revision,
  };
}

type MutableRow = {
  snapshot: DynamicSourceLifecycleSnapshot;
  listeners: Set<DynamicSourceLifecycleListener>;
};

/**
 * Process-local lifecycle manager. Acquisition (P10-5 shipped) and shell wiring
 * (P10-6) call transition helpers; paint / RenderPlan paths must not.
 */
export class DynamicDataLifecycleManagerImpl
  implements DynamicDataLifecycleManager
{
  private readonly bySource = new Map<DynamicSourceId, MutableRow>();

  getState(sourceId: DynamicSourceId): DynamicSourceLifecycleSnapshot {
    if (!isValidDynamicSourceId(sourceId)) {
      return syntheticIdle(typeof sourceId === "string" ? sourceId : "");
    }
    const row = this.bySource.get(sourceId);
    return row === undefined
      ? syntheticIdle(sourceId)
      : cloneSnapshot(row.snapshot);
  }

  listStates(): readonly DynamicSourceLifecycleSnapshot[] {
    const out: DynamicSourceLifecycleSnapshot[] = [];
    for (const row of this.bySource.values()) {
      out.push(cloneSnapshot(row.snapshot));
    }
    out.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
    return out;
  }

  ensureSource(sourceId: DynamicSourceId): DynamicLifecycleTransitionResult {
    if (!isValidDynamicSourceId(sourceId)) {
      return {
        ok: false,
        error: "invalid sourceId",
        snapshot: syntheticIdle(typeof sourceId === "string" ? sourceId : ""),
      };
    }
    const existing = this.bySource.get(sourceId);
    if (existing !== undefined) {
      return {
        ok: true,
        snapshot: cloneSnapshot(existing.snapshot),
        unchanged: true,
      };
    }
    const snapshot: DynamicSourceLifecycleSnapshot = {
      sourceId,
      state: "idle",
      revision: 1,
    };
    this.bySource.set(sourceId, {
      snapshot,
      listeners: new Set(),
    });
    return { ok: true, snapshot: cloneSnapshot(snapshot) };
  }

  subscribe(
    sourceId: DynamicSourceId,
    listener: DynamicSourceLifecycleListener,
  ): () => void {
    const ensured = this.ensureSource(sourceId);
    if (!ensured.ok) {
      // Invalid id: no-op unsubscribe; do not throw from paint-adjacent callers.
      return () => {};
    }
    const row = this.bySource.get(sourceId);
    if (row === undefined) {
      return () => {};
    }
    row.listeners.add(listener);
    listener(cloneSnapshot(row.snapshot));
    return () => {
      const current = this.bySource.get(sourceId);
      if (current === undefined) return;
      current.listeners.delete(listener);
    };
  }

  markLoading(sourceId: DynamicSourceId): DynamicLifecycleTransitionResult {
    return this.transition(sourceId, "loading", { clearError: true });
  }

  markReady(
    sourceId: DynamicSourceId,
    options?: DynamicLifecycleMarkReadyOptions,
  ): DynamicLifecycleTransitionResult {
    const latestVersionId = options?.latestVersionId;
    if (
      latestVersionId !== undefined &&
      !isValidDynamicSnapshotVersionId(latestVersionId)
    ) {
      const snap = this.getState(sourceId);
      return {
        ok: false,
        error: "invalid latestVersionId",
        snapshot: snap,
      };
    }
    return this.transition(sourceId, "ready", {
      latestVersionId,
      clearError: true,
    });
  }

  markStale(sourceId: DynamicSourceId): DynamicLifecycleTransitionResult {
    return this.transition(sourceId, "stale", { clearError: true });
  }

  markError(
    sourceId: DynamicSourceId,
    error: string,
  ): DynamicLifecycleTransitionResult {
    const trimmed = typeof error === "string" ? error.trim() : "";
    if (trimmed.length === 0) {
      return {
        ok: false,
        error: "error message required",
        snapshot: this.getState(sourceId),
      };
    }
    return this.transition(sourceId, "error", {
      lastError: trimmed,
    });
  }

  markIdle(sourceId: DynamicSourceId): DynamicLifecycleTransitionResult {
    return this.transition(sourceId, "idle", {
      clearError: true,
      clearVersion: true,
    });
  }

  forget(sourceId: DynamicSourceId): void {
    if (!isValidDynamicSourceId(sourceId)) return;
    this.bySource.delete(sourceId);
  }

  private transition(
    sourceId: DynamicSourceId,
    nextState: DynamicSourceLifecycleState,
    opts: {
      lastError?: string;
      latestVersionId?: DynamicSnapshotVersionId;
      clearError?: boolean;
      clearVersion?: boolean;
    },
  ): DynamicLifecycleTransitionResult {
    if (!isLifecycleState(nextState)) {
      return {
        ok: false,
        error: "invalid lifecycle state",
        snapshot: this.getState(sourceId),
      };
    }
    if (!isValidDynamicSourceId(sourceId)) {
      return {
        ok: false,
        error: "invalid sourceId",
        snapshot: syntheticIdle(typeof sourceId === "string" ? sourceId : ""),
      };
    }

    const ensured = this.ensureSource(sourceId);
    if (!ensured.ok) return ensured;

    const row = this.bySource.get(sourceId);
    if (row === undefined) {
      return {
        ok: false,
        error: "source row missing after ensure",
        snapshot: syntheticIdle(sourceId),
      };
    }

    const from = row.snapshot.state;
    if (!canTransition(from, nextState)) {
      return {
        ok: false,
        error: `invalid transition ${from} → ${nextState}`,
        snapshot: cloneSnapshot(row.snapshot),
      };
    }

    const nextVersionId = opts.clearVersion
      ? undefined
      : opts.latestVersionId !== undefined
        ? opts.latestVersionId
        : row.snapshot.latestVersionId;

    const nextError = opts.clearError
      ? undefined
      : nextState === "error"
        ? opts.lastError
        : row.snapshot.lastError;

    const sameError = (row.snapshot.lastError ?? undefined) === nextError;
    const sameVersion =
      (row.snapshot.latestVersionId ?? undefined) === nextVersionId;
    if (from === nextState && sameError && sameVersion) {
      return {
        ok: true,
        snapshot: cloneSnapshot(row.snapshot),
        unchanged: true,
      };
    }

    const next: DynamicSourceLifecycleSnapshot = {
      sourceId,
      state: nextState,
      revision: row.snapshot.revision + 1,
      ...(nextError !== undefined ? { lastError: nextError } : {}),
      ...(nextVersionId !== undefined
        ? { latestVersionId: nextVersionId }
        : {}),
    };
    row.snapshot = next;
    this.notify(row);
    return { ok: true, snapshot: cloneSnapshot(next) };
  }

  private notify(row: MutableRow): void {
    const payload = cloneSnapshot(row.snapshot);
    for (const listener of row.listeners) {
      listener(payload);
    }
  }
}

/** Factory for the default in-process lifecycle manager. */
export function createDynamicDataLifecycleManager(): DynamicDataLifecycleManager {
  return new DynamicDataLifecycleManagerImpl();
}

export function isDynamicSourceLifecycleState(
  value: unknown,
): value is DynamicSourceLifecycleState {
  return isLifecycleState(value);
}

export function isAllowedLifecycleTransition(
  from: DynamicSourceLifecycleState,
  to: DynamicSourceLifecycleState,
): boolean {
  return canTransition(from, to);
}
