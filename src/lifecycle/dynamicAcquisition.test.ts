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

import * as jpeg from "jpeg-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import {
  createDynamicAcquisitionController,
  createDynamicDataLifecycleManager,
  createDynamicSnapshotResolver,
  createFixtureAcquisitionAdapter,
  createMemoryDynamicSnapshotStore,
  type DynamicAcquisitionResult,
  type DynamicSnapshotStoreEntry,
  type DynamicSnapshotTemporalMeta,
} from "./index";

/** Minimal real-format JPEG (1×1) via jpeg-js — not a cosmetic fake product layer. */
function encodeFixtureJpeg(): Uint8Array {
  const encoded = jpeg.encode(
    { data: new Uint8Array([0, 0, 0, 255]), width: 1, height: 1 },
    90,
  );
  return new Uint8Array(encoded.data);
}

const SOURCE = "fixture-clouds-ir-v1";

const BASE_META: DynamicSnapshotTemporalMeta = {
  sourceId: SOURCE,
  kind: "equirectRaster",
  versionId: "v-2026-08-05T12",
  acquiredAtMs: 1_700_000_000_000,
  validTimeMs: 1_700_000_100_000,
  attribution: "Fixture IR sample",
};

function rasterEntry(
  overrides: Partial<DynamicSnapshotTemporalMeta> = {},
  payloadBytes: Uint8Array = encodeFixtureJpeg(),
): DynamicSnapshotStoreEntry {
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

function fixtureAcquireOk(
  overrides: Partial<DynamicSnapshotTemporalMeta> = {},
): DynamicAcquisitionResult {
  return { ok: true, entry: rasterEntry(overrides) };
}

describe("createDynamicAcquisitionController", () => {
  const timers: Array<ReturnType<typeof setInterval>> = [];

  afterEach(() => {
    for (const handle of timers) {
      clearInterval(handle);
    }
    timers.length = 0;
    vi.useRealTimers();
  });

  it("imports a prepared equirect JPEG fixture into the store (manual path)", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({ store, lifecycle });

    const entry = rasterEntry({ versionId: "import-v1" });
    const result = await acquisition.importSnapshot(entry);
    expect(result).toEqual({ ok: true, versionId: "import-v1" });
    expect(lifecycle.getState(SOURCE).state).toBe("ready");
    expect(lifecycle.getState(SOURCE).latestVersionId).toBe("import-v1");

    const cached = await store.get(SOURCE, "import-v1");
    expect(cached?.payloadBytes?.[0]).toBe(0xff);
    expect(cached?.payloadBytes?.[1]).toBe(0xd8);
  });

  it("rejects invalid import entries without registering adapters", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({ store, lifecycle });

    const bad = await acquisition.importSnapshot({
      record: {
        meta: {
          ...BASE_META,
          sourceId: "https://cdn.example/x.jpg",
        },
        body: { kind: "equirectRaster", contentType: "image/jpeg" },
      },
      payloadBytes: encodeFixtureJpeg(),
    });
    expect(bad.ok).toBe(false);
  });

  it("refreshNow acquires via adapter, puts store, marks ready", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const clock = { t: 5_000 };
    const acquisition = createDynamicAcquisitionController({
      store,
      lifecycle,
      nowMs: () => clock.t,
    });

    const acquire = vi.fn(async (): Promise<DynamicAcquisitionResult> =>
      fixtureAcquireOk({ versionId: "acq-1", acquiredAtMs: 1 }),
    );
    acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, acquire),
    );

    const result = await acquisition.refreshNow(SOURCE);
    expect(result).toEqual({ ok: true, versionId: "acq-1" });
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(lifecycle.getState(SOURCE).state).toBe("ready");

    const cached = await store.get(SOURCE, "acq-1");
    expect(cached?.record.meta.acquiredAtMs).toBe(5_000);
    expect(cached?.record.meta.validTimeMs).toBe(BASE_META.validTimeMs);
  });

  it("refreshNow marks error when the adapter fails", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({ store, lifecycle });
    acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, async () => ({
        ok: false,
        error: "upstream 503",
      })),
    );

    const result = await acquisition.refreshNow(SOURCE);
    expect(result).toEqual({ ok: false, error: "upstream 503" });
    expect(lifecycle.getState(SOURCE).state).toBe("error");
    expect(lifecycle.getState(SOURCE).lastError).toBe("upstream 503");
    expect(await store.list(SOURCE)).toEqual([]);
  });

  it("coalesces concurrent refreshNow calls onto one acquire", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({ store, lifecycle });

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acquire = vi.fn(async (): Promise<DynamicAcquisitionResult> => {
      await gate;
      return fixtureAcquireOk({ versionId: "coalesce-1" });
    });
    acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, acquire),
    );

    const p1 = acquisition.refreshNow(SOURCE);
    const p2 = acquisition.refreshNow(SOURCE);
    release();
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ ok: true, versionId: "coalesce-1" });
    expect(r2).toEqual({ ok: true, versionId: "coalesce-1" });
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it("starts periodic refresh via setInterval — never requestAnimationFrame", async () => {
    vi.useFakeTimers();
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();

    const setIntervalSpy = vi.fn(
      (handler: () => void, timeout: number): ReturnType<typeof setInterval> => {
        const handle = setInterval(handler, timeout);
        timers.push(handle);
        return handle;
      },
    );
    const rafSpy = vi.fn();
    vi.stubGlobal("requestAnimationFrame", rafSpy);

    const acquisition = createDynamicAcquisitionController({
      store,
      lifecycle,
      setIntervalFn: setIntervalSpy,
      clearIntervalFn: clearInterval,
    });

    let version = 0;
    const acquire = vi.fn(async (): Promise<DynamicAcquisitionResult> => {
      version += 1;
      return fixtureAcquireOk({
        versionId: `tick-${version}`,
        validTimeMs: BASE_META.validTimeMs + version,
      });
    });
    acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, acquire),
    );

    const started = acquisition.startPeriodic(SOURCE, {
      intervalMs: 1_000,
      runImmediately: true,
    });
    expect(started).toEqual({ ok: true });
    expect(acquisition.isPeriodicActive(SOURCE)).toBe(true);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(rafSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(0);
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(lifecycle.getState(SOURCE).latestVersionId).toBe("tick-1");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(acquire).toHaveBeenCalledTimes(2);
    expect(lifecycle.getState(SOURCE).latestVersionId).toBe("tick-2");
    expect(rafSpy).not.toHaveBeenCalled();

    acquisition.stopPeriodic(SOURCE);
    expect(acquisition.isPeriodicActive(SOURCE)).toBe(false);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(acquire).toHaveBeenCalledTimes(2);
  });

  it("rejects periodic start without adapter or with invalid interval", () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({ store, lifecycle });

    expect(
      acquisition.startPeriodic(SOURCE, { intervalMs: 1_000 }),
    ).toEqual({ ok: false, error: "no adapter registered for source" });

    acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, async () => fixtureAcquireOk()),
    );
    expect(
      acquisition.startPeriodic(SOURCE, { intervalMs: 0 }),
    ).toEqual({
      ok: false,
      error: "intervalMs must be a finite number > 0",
    });
  });
});

describe("acquisition vs product-time resolve (no fetch on render path)", () => {
  it("resolveSnapshot never invokes acquisition adapters", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({ store, lifecycle });
    const acquire = vi.fn(async (): Promise<DynamicAcquisitionResult> =>
      fixtureAcquireOk({ versionId: "preloaded" }),
    );
    acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, acquire),
    );

    // Seed cache via one-shot acquire (outside any paint simulation).
    await acquisition.refreshNow(SOURCE);
    expect(acquire).toHaveBeenCalledTimes(1);

    const resolver = createDynamicSnapshotResolver({ store, lifecycle });
    const putSpy = vi.spyOn(store, "put");

    // Simulate scrub / frame ticks: product-time resolve only.
    for (const productInstantMs of [
      BASE_META.validTimeMs - 60_000,
      BASE_META.validTimeMs,
      BASE_META.validTimeMs + 60_000,
    ]) {
      const result = await resolver.resolveSnapshot(SOURCE, productInstantMs);
      expect(result.status).toBe("ok");
      expect(result.snapshot?.meta.versionId).toBe("preloaded");
    }

    expect(acquire).toHaveBeenCalledTimes(1);
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("scrubbing while periodic is armed does not multiply acquires beyond the timer", async () => {
    vi.useFakeTimers();
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({
      store,
      lifecycle,
      setIntervalFn: (handler, timeout) => {
        const handle = setInterval(handler, timeout);
        return handle;
      },
    });

    const acquire = vi.fn(async (): Promise<DynamicAcquisitionResult> =>
      fixtureAcquireOk({ versionId: "armed-v1" }),
    );
    acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, acquire),
    );
    acquisition.startPeriodic(SOURCE, {
      intervalMs: 60_000,
      runImmediately: true,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(acquire).toHaveBeenCalledTimes(1);

    const resolver = createDynamicSnapshotResolver({ store, lifecycle });
    // Many scrub frames between refresh ticks.
    for (let i = 0; i < 40; i += 1) {
      await resolver.resolveSnapshot(SOURCE, BASE_META.validTimeMs + i * 1_000);
    }
    expect(acquire).toHaveBeenCalledTimes(1);

    acquisition.stopAll();
    vi.useRealTimers();
  });
});
