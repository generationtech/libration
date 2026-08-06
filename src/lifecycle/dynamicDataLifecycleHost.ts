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
 * App shell seam host (P10-6).
 * Wires store + lifecycle manager + product-time resolver + acquisition for
 * the shell. TimeContext attachments are read-only (resolve / getState only).
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import { createDynamicAcquisitionController } from "./dynamicAcquisition";
import { createDynamicDataLifecycleManager } from "./dynamicLifecycleManager";
import { createDynamicSnapshotResolver } from "./dynamicSnapshotResolver";
import { createMemoryDynamicSnapshotStore } from "./memoryDynamicSnapshotStore";
import type {
  DynamicDataLifecycleAttachment,
  DynamicDataLifecycleHost,
  DynamicDataLifecycleHostDeps,
} from "./dynamicDataLifecycleHostTypes";
import type { TimeContext } from "../layers/types";

/**
 * Create a process-local lifecycle host for the app shell.
 * Does not register adapters or start periodic refresh — callers / future
 * consumers do that outside the paint path.
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

  let disposed = false;

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
    };
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    acquisition.stopAll();
  }

  return {
    store,
    lifecycle,
    resolver,
    acquisition,
    attachForProductInstant,
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
