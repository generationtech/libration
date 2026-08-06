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
import { describe, expect, it, vi } from "vitest";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import {
  createDynamicDataLifecycleManager,
  createDynamicSnapshotResolver,
  createMemoryDynamicSnapshotStore,
  type DynamicSnapshotStore,
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

function pointsEntry(
  overrides: Partial<DynamicSnapshotTemporalMeta> = {},
): DynamicSnapshotStoreEntry {
  const meta: DynamicSnapshotTemporalMeta = {
    sourceId: "usgs-quakes-fixture-v1",
    kind: "pointFeatures",
    versionId: "feed-2026-08-05",
    acquiredAtMs: 1_700_000_200_000,
    validTimeMs: 1_700_000_150_000,
    ...overrides,
  };
  const record = buildDynamicSnapshotRecord(meta, {
    kind: "pointFeatures",
    features: [
      {
        id: "eq-1",
        lonDeg: -120.5,
        latDeg: 35.2,
        properties: { mag: 4.1 },
      },
    ],
  });
  if (record === null) {
    throw new Error("expected valid points record");
  }
  return { record };
}

describe("createDynamicSnapshotResolver", () => {
  it("returns missing when the store has no versions for the source", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const resolver = createDynamicSnapshotResolver({ store });
    const result = await resolver.resolveSnapshot(SOURCE, BASE_META.validTimeMs);
    expect(result).toEqual({
      status: "missing",
      snapshot: null,
      freshness: "missing",
    });
  });

  it("rejects invalid source ids and non-finite product time without touching the store", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const list = vi.spyOn(store, "list");
    const get = vi.spyOn(store, "get");
    const resolver = createDynamicSnapshotResolver({ store });

    expect(
      await resolver.resolveSnapshot(
        "https://cdn.example/clouds.jpg",
        BASE_META.validTimeMs,
      ),
    ).toEqual({ status: "error", snapshot: null, freshness: "error" });
    expect(await resolver.resolveSnapshot(SOURCE, Number.NaN)).toEqual({
      status: "error",
      snapshot: null,
      freshness: "error",
    });
    expect(list).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it("selects the nearest-valid snapshot by product time (point valid times)", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(
      rasterEntry({
        versionId: "earlier",
        validTimeMs: 1_000,
        acquiredAtMs: 10,
      }),
    );
    await store.put(
      rasterEntry({
        versionId: "later",
        validTimeMs: 3_000,
        acquiredAtMs: 20,
      }),
    );
    const resolver = createDynamicSnapshotResolver({ store });

    const result = await resolver.resolveSnapshot(SOURCE, 2_400);
    expect(result.status).toBe("ok");
    expect(result.freshness).toBe("ready");
    expect(result.snapshot?.meta.versionId).toBe("later");
    expect(result.snapshot?.meta.validTimeMs).toBe(3_000);
  });

  it("prefers covering validUntilMs windows over nearer uncovered points", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(
      rasterEntry({
        versionId: "near-point",
        validTimeMs: 2_000,
      }),
    );
    await store.put(
      rasterEntry({
        versionId: "cover-far",
        validTimeMs: 0,
        validUntilMs: 10_000,
        acquiredAtMs: 5,
      }),
    );
    const resolver = createDynamicSnapshotResolver({ store });

    const result = await resolver.resolveSnapshot(SOURCE, 5_000);
    expect(result.status).toBe("ok");
    expect(result.snapshot?.meta.versionId).toBe("cover-far");
  });

  it("resolves point-features kinds against the same product-time policy", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(
      pointsEntry({
        versionId: "quakes-a",
        validTimeMs: 100,
      }),
    );
    await store.put(
      pointsEntry({
        versionId: "quakes-b",
        validTimeMs: 300,
        acquiredAtMs: 1_700_000_300_000,
      }),
    );
    const resolver = createDynamicSnapshotResolver({ store });
    const result = await resolver.resolveSnapshot(
      "usgs-quakes-fixture-v1",
      250,
    );
    expect(result.status).toBe("ok");
    expect(result.snapshot?.meta.kind).toBe("pointFeatures");
    expect(result.snapshot?.meta.versionId).toBe("quakes-b");
  });

  it("is scrub-safe: repeated resolve only lists/gets and never puts", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(
      rasterEntry({
        versionId: "t0",
        validTimeMs: 1_000,
      }),
    );
    await store.put(
      rasterEntry({
        versionId: "t1",
        validTimeMs: 2_000,
        acquiredAtMs: BASE_META.acquiredAtMs + 1,
      }),
    );

    const put = vi.spyOn(store, "put");
    const evict = vi.spyOn(store, "evict");
    const clear = vi.spyOn(store, "clear");
    const list = vi.spyOn(store, "list");
    const get = vi.spyOn(store, "get");

    const resolver = createDynamicSnapshotResolver({ store });
    const scrubInstants = [900, 1_000, 1_500, 2_000, 2_500, 1_200];
    const versions: string[] = [];
    for (const t of scrubInstants) {
      const result = await resolver.resolveSnapshot(SOURCE, t);
      expect(result.status).toBe("ok");
      versions.push(result.snapshot!.meta.versionId);
    }

    // 1500 is equidistant → tie-break prefers later validTime (t1).
    expect(versions).toEqual(["t0", "t0", "t1", "t1", "t1", "t0"]);
    expect(put).not.toHaveBeenCalled();
    expect(evict).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(list).toHaveBeenCalledTimes(scrubInstants.length);
    expect(get).toHaveBeenCalledTimes(scrubInstants.length);
  });

  it("bridges lifecycle manager freshness without mutating manager or store", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(rasterEntry());
    const lifecycle = createDynamicDataLifecycleManager();
    expect(lifecycle.markLoading(SOURCE).ok).toBe(true);
    expect(
      lifecycle.markReady(SOURCE, { latestVersionId: BASE_META.versionId }).ok,
    ).toBe(true);
    expect(lifecycle.markStale(SOURCE).ok).toBe(true);

    const put = vi.spyOn(store, "put");
    const markLoading = vi.spyOn(lifecycle, "markLoading");
    const resolver = createDynamicSnapshotResolver({ store, lifecycle });

    const staleHit = await resolver.resolveSnapshot(
      SOURCE,
      BASE_META.validTimeMs,
    );
    expect(staleHit).toMatchObject({
      status: "ok",
      freshness: "stale",
    });
    expect(staleHit.snapshot?.meta.versionId).toBe(BASE_META.versionId);

    expect(lifecycle.markLoading(SOURCE).ok).toBe(true);
    const loadingHit = await resolver.resolveSnapshot(
      SOURCE,
      BASE_META.validTimeMs,
    );
    expect(loadingHit.status).toBe("ok");
    expect(loadingHit.freshness).toBe("loading");

    // Empty other source while this one is loading → missing + loading freshness.
    const emptyLoading = await resolver.resolveSnapshot(
      "other-feed-v1",
      BASE_META.validTimeMs,
    );
    // other-feed-v1 is idle (untracked) → missing
    expect(emptyLoading).toEqual({
      status: "missing",
      snapshot: null,
      freshness: "missing",
    });

    expect(lifecycle.markError(SOURCE, "upstream timeout").ok).toBe(true);
    const errorWithCache = await resolver.resolveSnapshot(
      SOURCE,
      BASE_META.validTimeMs,
    );
    expect(errorWithCache.status).toBe("ok");
    expect(errorWithCache.freshness).toBe("error");
    expect(errorWithCache.snapshot).not.toBeNull();

    expect(put).not.toHaveBeenCalled();
    // resolveSnapshot itself must not drive transitions (only our test calls did).
    expect(markLoading).toHaveBeenCalledTimes(1);
  });

  it("reports loading/error freshness on miss when manager says so", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    expect(lifecycle.markLoading(SOURCE).ok).toBe(true);

    const resolver = createDynamicSnapshotResolver({ store, lifecycle });
    expect(await resolver.resolveSnapshot(SOURCE, 0)).toEqual({
      status: "missing",
      snapshot: null,
      freshness: "loading",
    });

    expect(lifecycle.markError(SOURCE, "fetch failed").ok).toBe(true);
    expect(await resolver.resolveSnapshot(SOURCE, 0)).toEqual({
      status: "error",
      snapshot: null,
      freshness: "error",
    });
  });

  it("does not invent acquisition: store wrappers prove no put on resolve", async () => {
    const inner = createMemoryDynamicSnapshotStore();
    await inner.put(rasterEntry());
    let putCount = 0;
    const wrapped: DynamicSnapshotStore = {
      put: async (entry) => {
        putCount += 1;
        return inner.put(entry);
      },
      get: (sourceId, versionId) => inner.get(sourceId, versionId),
      list: (sourceId) => inner.list(sourceId),
      evict: (sourceId, versionId) => inner.evict(sourceId, versionId),
      clear: () => inner.clear(),
    };
    const resolver = createDynamicSnapshotResolver({ store: wrapped });
    await resolver.resolveSnapshot(SOURCE, BASE_META.validTimeMs);
    await resolver.resolveSnapshot(SOURCE, BASE_META.validTimeMs + 1);
    expect(putCount).toBe(0);
  });
});
