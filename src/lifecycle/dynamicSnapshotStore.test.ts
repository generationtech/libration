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
import { describe, expect, it } from "vitest";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import {
  createMemoryDynamicSnapshotStore,
  prepareDynamicSnapshotStoreEntry,
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

const BASE_META: DynamicSnapshotTemporalMeta = {
  sourceId: "fixture-clouds-ir-v1",
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
  // Real-format-ish GeoJSON FeatureCollection bytes (optional sidecar payload).
  const geojson = new TextEncoder().encode(
    JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "eq-1",
          geometry: { type: "Point", coordinates: [-120.5, 35.2] },
          properties: { mag: 4.1 },
        },
      ],
    }),
  );
  return { record, payloadBytes: geojson };
}

describe("prepareDynamicSnapshotStoreEntry", () => {
  it("accepts equirect entries with non-empty JPEG payload bytes", () => {
    const result = prepareDynamicSnapshotStoreEntry(rasterEntry());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prepared.payloadBytes?.byteLength).toBeGreaterThan(0);
      expect(result.prepared.payloadBytes?.[0]).toBe(0xff);
      expect(result.prepared.payloadBytes?.[1]).toBe(0xd8);
    }
  });

  it("rejects equirect without payload bytes", () => {
    const entry = rasterEntry();
    const result = prepareDynamicSnapshotStoreEntry({
      record: entry.record,
    });
    expect(result).toEqual({
      ok: false,
      error: "equirectRaster entries require non-empty payloadBytes",
    });
  });

  it("rejects kind mismatches and bad ids", () => {
    const entry = rasterEntry();
    expect(
      prepareDynamicSnapshotStoreEntry({
        record: {
          meta: entry.record.meta,
          body: { kind: "pointFeatures", features: [] },
        },
        payloadBytes: entry.payloadBytes,
      }).ok,
    ).toBe(false);
    expect(
      prepareDynamicSnapshotStoreEntry({
        record: {
          meta: { ...entry.record.meta, sourceId: "https://cdn.example/x" },
          body: entry.record.body,
        },
        payloadBytes: entry.payloadBytes,
      }).ok,
    ).toBe(false);
  });
});

describe("MemoryDynamicSnapshotStore", () => {
  it("puts and gets by sourceId + versionId with isolated payload copies", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const payload = encodeFixtureJpeg();
    const putResult = await store.put(rasterEntry({}, payload));
    expect(putResult).toEqual({ ok: true });

    const got = await store.get(BASE_META.sourceId, BASE_META.versionId);
    expect(got).not.toBeNull();
    expect(got?.record.meta.versionId).toBe(BASE_META.versionId);
    expect(got?.payloadBytes).toEqual(payload);
    expect(got?.payloadBytes).not.toBe(payload);

    // Mutating the returned buffer must not corrupt the store.
    got!.payloadBytes![0] = 0x00;
    const again = await store.get(BASE_META.sourceId, BASE_META.versionId);
    expect(again?.payloadBytes?.[0]).toBe(0xff);
  });

  it("replaces an existing version on put", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(rasterEntry({ acquiredAtMs: 1 }));
    const newerPayload = encodeFixtureJpeg();
    newerPayload[newerPayload.length - 1] ^= 0x01;
    await store.put(
      rasterEntry({ acquiredAtMs: 2, attribution: "replaced" }, newerPayload),
    );
    const got = await store.get(BASE_META.sourceId, BASE_META.versionId);
    expect(got?.record.meta.acquiredAtMs).toBe(2);
    expect(got?.record.meta.attribution).toBe("replaced");
    expect(got?.payloadBytes).toEqual(newerPayload);
    expect(await store.list(BASE_META.sourceId)).toHaveLength(1);
  });

  it("lists metas sorted by sourceId, validTimeMs, versionId", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(
      rasterEntry({
        versionId: "v-b",
        validTimeMs: 200,
      }),
    );
    await store.put(
      rasterEntry({
        versionId: "v-a",
        validTimeMs: 200,
      }),
    );
    await store.put(
      rasterEntry({
        versionId: "v-earlier",
        validTimeMs: 100,
      }),
    );
    await store.put(pointsEntry());

    const all = await store.list();
    expect(all.map((m) => `${m.sourceId}:${m.versionId}`)).toEqual([
      "fixture-clouds-ir-v1:v-earlier",
      "fixture-clouds-ir-v1:v-a",
      "fixture-clouds-ir-v1:v-b",
      "usgs-quakes-fixture-v1:feed-2026-08-05",
    ]);

    const cloudOnly = await store.list("fixture-clouds-ir-v1");
    expect(cloudOnly).toHaveLength(3);
    expect(cloudOnly.every((m) => m.sourceId === "fixture-clouds-ir-v1")).toBe(
      true,
    );
  });

  it("evicts one version or all versions for a source", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(rasterEntry({ versionId: "keep" }));
    await store.put(rasterEntry({ versionId: "drop" }));
    await store.put(pointsEntry());

    expect(await store.evict("fixture-clouds-ir-v1", "drop")).toBe(1);
    expect(await store.get("fixture-clouds-ir-v1", "drop")).toBeNull();
    expect(await store.get("fixture-clouds-ir-v1", "keep")).not.toBeNull();

    expect(await store.evict("fixture-clouds-ir-v1")).toBe(1);
    expect(await store.list("fixture-clouds-ir-v1")).toEqual([]);
    expect(await store.get("usgs-quakes-fixture-v1", "feed-2026-08-05")).not.toBeNull();

    expect(await store.evict("missing-source-v1")).toBe(0);
  });

  it("clears the entire store", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(rasterEntry());
    await store.put(pointsEntry());
    await store.clear();
    expect(await store.list()).toEqual([]);
  });

  it("stores point-features GeoJSON fixture bytes without requiring equirect payload rules", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const entry = pointsEntry();
    expect((await store.put(entry)).ok).toBe(true);
    const got = await store.get(
      "usgs-quakes-fixture-v1",
      "feed-2026-08-05",
    );
    expect(got?.record.body.kind).toBe("pointFeatures");
    const text = new TextDecoder().decode(got?.payloadBytes);
    expect(JSON.parse(text).type).toBe("FeatureCollection");
  });

  it("returns null for unknown keys and invalid id lookups", async () => {
    const store = createMemoryDynamicSnapshotStore();
    await store.put(rasterEntry());
    expect(await store.get(BASE_META.sourceId, "missing")).toBeNull();
    expect(await store.get("https://bad", BASE_META.versionId)).toBeNull();
    expect(await store.list("https://bad")).toEqual([]);
  });
});
