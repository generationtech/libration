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
 * Phase 10 dynamic data lifecycle manager contracts (P10-3).
 * Per-source state machine only — no acquisition, resolver, network, or UI.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import type {
  DynamicSnapshotFreshness,
  DynamicSnapshotVersionId,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";

/**
 * Per-source lifecycle states.
 * Distinct from {@link DynamicSnapshotFreshness}: manager adds `idle`
 * (no active acquisition interest / reset); freshness uses `missing` for
 * resolve results when no usable snapshot is available (P10-4 shipped).
 */
export const DYNAMIC_SOURCE_LIFECYCLE_STATES = [
  "idle",
  "loading",
  "ready",
  "stale",
  "error",
] as const;

export type DynamicSourceLifecycleState =
  (typeof DYNAMIC_SOURCE_LIFECYCLE_STATES)[number];

/** Immutable per-source row observed by subscribers and getters. */
export type DynamicSourceLifecycleSnapshot = Readonly<{
  sourceId: DynamicSourceId;
  state: DynamicSourceLifecycleState;
  /**
   * Set when `state === "error"`; cleared on transitions away from error.
   */
  lastError?: string;
  /**
   * Optional hint of the last successful version (ready / stale).
   * Cleared on idle; preserved across loading when refreshing.
   */
  latestVersionId?: DynamicSnapshotVersionId;
  /** Bumps on every successful state or metadata change for this source. */
  revision: number;
}>;

export type DynamicLifecycleTransitionResult =
  | {
      readonly ok: true;
      readonly snapshot: DynamicSourceLifecycleSnapshot;
      /** True when state/metadata did not change (idempotent no-op). */
      readonly unchanged?: true;
    }
  | {
      readonly ok: false;
      readonly error: string;
      readonly snapshot: DynamicSourceLifecycleSnapshot;
    };

export type DynamicSourceLifecycleListener = (
  snapshot: DynamicSourceLifecycleSnapshot,
) => void;

export type DynamicLifecycleMarkReadyOptions = Readonly<{
  latestVersionId?: DynamicSnapshotVersionId;
}>;

/**
 * Per-source lifecycle state machine with subscribe / unsubscribe.
 * Callers (acquisition in P10-5, shell in P10-6) drive transitions;
 * this type does not fetch, resolve product time, or touch RenderPlan.
 */
export interface DynamicDataLifecycleManager {
  /**
   * Current snapshot for `sourceId`. Unknown valid ids return a synthetic
   * idle row (revision 0) without creating a tracked source.
   */
  getState(sourceId: DynamicSourceId): DynamicSourceLifecycleSnapshot;

  /** Tracked sources only (ensured, transitioned, or subscribed). */
  listStates(): readonly DynamicSourceLifecycleSnapshot[];

  /**
   * Ensure a tracked idle row exists for `sourceId` (no-op if already tracked).
   */
  ensureSource(sourceId: DynamicSourceId): DynamicLifecycleTransitionResult;

  /**
   * Subscribe to one source. Ensures a tracked row (idle if new).
   * Invokes `listener` synchronously with the current snapshot, then on each
   * successful change. Returns an unsubscribe function.
   */
  subscribe(
    sourceId: DynamicSourceId,
    listener: DynamicSourceLifecycleListener,
  ): () => void;

  markLoading(sourceId: DynamicSourceId): DynamicLifecycleTransitionResult;

  markReady(
    sourceId: DynamicSourceId,
    options?: DynamicLifecycleMarkReadyOptions,
  ): DynamicLifecycleTransitionResult;

  markStale(sourceId: DynamicSourceId): DynamicLifecycleTransitionResult;

  markError(
    sourceId: DynamicSourceId,
    error: string,
  ): DynamicLifecycleTransitionResult;

  /** Reset to idle; clears error and version hints. */
  markIdle(sourceId: DynamicSourceId): DynamicLifecycleTransitionResult;

  /** Drop tracked row and listeners (tests / teardown). */
  forget(sourceId: DynamicSourceId): void;
}

/** Map manager state → freshness for resolve results (P10-4). */
export function lifecycleStateToFreshness(
  state: DynamicSourceLifecycleState,
): DynamicSnapshotFreshness {
  switch (state) {
    case "idle":
      return "missing";
    case "loading":
      return "loading";
    case "ready":
      return "ready";
    case "stale":
      return "stale";
    case "error":
      return "error";
  }
}
