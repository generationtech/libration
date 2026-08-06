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
 * P10-7 Phase 10 closure — smoke the public lifecycle barrel exit surface.
 * Proves store + manager + resolve + acquisition-outside-render wire together;
 * does not ship a user-facing dynamic overlay.
 */

import * as jpeg from "jpeg-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import {
  DYNAMIC_SNAPSHOT_KINDS,
  DYNAMIC_SOURCE_LIFECYCLE_STATES,
  buildDynamicSnapshotRecord,
  createDynamicAcquisitionController,
  createDynamicDataLifecycleHost,
  createDynamicDataLifecycleManager,
  createDynamicSnapshotResolver,
  createFixtureAcquisitionAdapter,
  createMemoryDynamicSnapshotStore,
  getDynamicDataLifecycleAttachment,
  type DynamicAcquisitionResult,
  type DynamicSnapshotStoreEntry,
  type DynamicSnapshotTemporalMeta,
} from "./index";

function encodeFixtureJpeg(): Uint8Array {
  const encoded = jpeg.encode(
    { data: new Uint8Array([0, 0, 0, 255]), width: 1, height: 1 },
    90,
  );
  return new Uint8Array(encoded.data);
}

const SOURCE = "phase10-closure-fixture-v1";

const BASE_META: DynamicSnapshotTemporalMeta = {
  sourceId: SOURCE,
  kind: "equirectRaster",
  versionId: "v-closure-1",
  acquiredAtMs: 1_700_000_000_000,
  validTimeMs: 1_700_000_100_000,
  attribution: "Phase 10 closure fixture",
};

function rasterEntry(
  overrides: Partial<DynamicSnapshotTemporalMeta> = {},
): DynamicSnapshotStoreEntry {
  const payloadBytes = encodeFixtureJpeg();
  const meta = { ...BASE_META, ...overrides };
  const record = buildDynamicSnapshotRecord(meta, {
    kind: "equirectRaster",
    contentType: "image/jpeg",
    lonMinDeg: -180,
    lonMaxDeg: 180,
    byteLength: payloadBytes.byteLength,
  });
  if (record === null) {
    throw new Error("expected valid raster record");
  }
  return { record, payloadBytes };
}

describe("Phase 10 lifecycle closure (P10-7)", () => {
  const timers: Array<ReturnType<typeof setInterval>> = [];

  afterEach(() => {
    for (const handle of timers) {
      clearInterval(handle);
    }
    timers.length = 0;
  });

  it("exports the three snapshot kinds and lifecycle states on the public barrel", () => {
    expect([...DYNAMIC_SNAPSHOT_KINDS].sort()).toEqual([
      "equirectRaster",
      "pointFeatures",
      "tracks",
    ]);
    expect([...DYNAMIC_SOURCE_LIFECYCLE_STATES].sort()).toEqual([
      "error",
      "idle",
      "loading",
      "ready",
      "stale",
    ]);
  });

  it("composes store, manager, resolver, and acquisition without a scene overlay", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const resolver = createDynamicSnapshotResolver({ store, lifecycle });
    const acquisition = createDynamicAcquisitionController({ store, lifecycle });

    const acquire = vi.fn(
      async (): Promise<DynamicAcquisitionResult> => ({
        ok: true,
        entry: rasterEntry({ versionId: "v-acq-1" }),
      }),
    );
    acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, acquire),
    );

    const refresh = await acquisition.refreshNow(SOURCE);
    expect(refresh).toEqual({ ok: true, versionId: "v-acq-1" });
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(lifecycle.getState(SOURCE).state).toBe("ready");

    const resolved = await resolver.resolveSnapshot(
      SOURCE,
      BASE_META.validTimeMs,
    );
    expect(resolved.status).toBe("ok");
    expect(resolved.snapshot?.meta.versionId).toBe("v-acq-1");
    // Resolve must not re-invoke acquisition (scrub/paint-safe).
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it("host attach + TimeContext resolve stays scrub-safe (no acquisition on paint path)", async () => {
    const host = createDynamicDataLifecycleHost({
      setIntervalFn: (handler, timeout) => {
        const handle = setInterval(handler, timeout);
        timers.push(handle);
        return handle;
      },
      clearIntervalFn: (handle) => {
        clearInterval(handle as ReturnType<typeof setInterval>);
      },
    });

    await host.acquisition.importSnapshot(rasterEntry());

    const acquire = vi.fn(
      async (): Promise<DynamicAcquisitionResult> => ({
        ok: true,
        entry: rasterEntry({ versionId: "should-not-run" }),
      }),
    );
    host.acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, acquire),
    );

    const attachment = host.attachForProductInstant(BASE_META.validTimeMs);
    const ctx = createTimeContext(BASE_META.validTimeMs, 16, false, {
      dynamicDataLifecycle: attachment,
    });
    const fromCtx = getDynamicDataLifecycleAttachment(ctx);
    expect(fromCtx).toBe(attachment);

    const resolved = await fromCtx!.resolveSnapshot(SOURCE);
    expect(resolved.status).toBe("ok");
    expect(resolved.snapshot?.meta.sourceId).toBe(SOURCE);
    expect(acquire).not.toHaveBeenCalled();
    host.dispose();
  });
});
