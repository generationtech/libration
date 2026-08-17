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
 * DLU-2 — shared live HTTP acquisition seam.
 * Prove abort, content-type, attribution, fixture fallback, error/stale policy,
 * and no fetch on resolve / paint path. No production feed swap.
 */

import * as jpeg from "jpeg-js";
import { describe, expect, it, vi } from "vitest";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import {
  applyAcquisitionAttribution,
  applyLiveAcquireFailureToLifecycle,
  contentTypeMatchesAccept,
  createDynamicAcquisitionController,
  createDynamicDataLifecycleManager,
  createDynamicSnapshotResolver,
  createLiveHttpAcquisitionAdapter,
  createMemoryDynamicSnapshotStore,
  fetchLiveHttpBytes,
  normalizeHttpContentType,
  resolveLiveAcquireFailureDisposition,
  type DynamicAcquisitionResult,
  type DynamicSnapshotStoreEntry,
  type LiveHttpFetchFn,
  type LiveHttpFetchOk,
} from "./index";

const SOURCE = "live-http-seam-v1";

function encodeFixtureJpeg(): Uint8Array {
  const encoded = jpeg.encode(
    { data: new Uint8Array([0, 0, 0, 255]), width: 1, height: 1 },
    90,
  );
  return new Uint8Array(encoded.data);
}

function rasterEntryFromBytes(
  bytes: Uint8Array,
  overrides: {
    versionId?: string;
    attribution?: string;
    licenseNote?: string;
    acquiredAtMs?: number;
  } = {},
): DynamicSnapshotStoreEntry {
  const acquiredAtMs = overrides.acquiredAtMs ?? 1_700_000_000_000;
  const record = buildDynamicSnapshotRecord(
    {
      sourceId: SOURCE,
      kind: "equirectRaster",
      versionId: overrides.versionId ?? `live-${acquiredAtMs}`,
      acquiredAtMs,
      validTimeMs: acquiredAtMs,
      ...(overrides.attribution !== undefined
        ? { attribution: overrides.attribution }
        : {}),
      ...(overrides.licenseNote !== undefined
        ? { licenseNote: overrides.licenseNote }
        : {}),
    },
    {
      kind: "equirectRaster",
      contentType: "image/jpeg",
      lonMinDeg: -180,
      lonMaxDeg: 180,
      byteLength: bytes.byteLength,
    },
  );
  if (record === null) {
    throw new Error("expected valid raster record");
  }
  return { record, payloadBytes: bytes };
}

function mockResponse(options: {
  ok?: boolean;
  status?: number;
  contentType?: string | null;
  body?: Uint8Array;
  url?: string;
}): Response {
  const status = options.status ?? (options.ok === false ? 500 : 200);
  const ok = options.ok ?? (status >= 200 && status < 300);
  const body = options.body ?? encodeFixtureJpeg();
  const headers = new Headers();
  if (options.contentType !== null) {
    headers.set(
      "content-type",
      options.contentType ?? "image/jpeg",
    );
  }
  return {
    ok,
    status,
    url: options.url ?? "https://example.test/live.jpg",
    headers,
    arrayBuffer: async () =>
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  } as Response;
}

describe("normalizeHttpContentType / contentTypeMatchesAccept", () => {
  it("strips parameters and matches accept list exactly", () => {
    expect(normalizeHttpContentType("image/jpeg; charset=binary")).toBe(
      "image/jpeg",
    );
    expect(
      contentTypeMatchesAccept("application/json; charset=utf-8", [
        "application/json",
        "application/geo+json",
      ]),
    ).toBe(true);
    expect(
      contentTypeMatchesAccept("application/geo+json", ["application/json"]),
    ).toBe(false);
    expect(contentTypeMatchesAccept(null, ["image/jpeg"])).toBe(false);
    expect(
      contentTypeMatchesAccept("image/jpeg;charset=utf-8", ["image/jpeg"]),
    ).toBe(true);
    expect(
      contentTypeMatchesAccept("text/plain; charset=UTF-8", ["text/plain"]),
    ).toBe(true);
  });
});

describe("fetchLiveHttpBytes", () => {
  it("returns bytes when status and content-type are acceptable", async () => {
    const bytes = encodeFixtureJpeg();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockResponse({ body: bytes, contentType: "image/jpeg; charset=binary" }),
    );
    const result = await fetchLiveHttpBytes({
      url: "https://example.test/live.jpg",
      acceptContentTypes: ["image/jpeg"],
      fetchFn,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contentType).toBe("image/jpeg");
      expect(result.bytes.byteLength).toBe(bytes.byteLength);
      expect(result.status).toBe(200);
    }
  });

  it("rejects unexpected content-type", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockResponse({ contentType: "text/html" }),
    );
    const result = await fetchLiveHttpBytes({
      url: "https://example.test/live.jpg",
      acceptContentTypes: ["image/jpeg"],
      fetchFn,
    });
    expect(result).toMatchObject({
      ok: false,
      error: "unexpected content-type: text/html",
    });
  });

  it("rejects non-OK HTTP status", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockResponse({ ok: false, status: 503, contentType: "image/jpeg" }),
    );
    const result = await fetchLiveHttpBytes({
      url: "https://example.test/live.jpg",
      acceptContentTypes: ["image/jpeg"],
      fetchFn,
    });
    expect(result).toEqual({
      ok: false,
      error: "HTTP 503",
      status: 503,
    });
  });

  it("honors AbortSignal before and during fetch", async () => {
    const abort = new AbortController();
    abort.abort();
    const fetchFn = vi.fn();
    const early = await fetchLiveHttpBytes({
      url: "https://example.test/live.jpg",
      acceptContentTypes: ["image/jpeg"],
      signal: abort.signal,
      fetchFn,
    });
    expect(early).toEqual({ ok: false, error: "aborted", aborted: true });
    expect(fetchFn).not.toHaveBeenCalled();

    const mid = new AbortController();
    const fetchFnThrow: LiveHttpFetchFn = vi.fn(async (_url, init) => {
      mid.abort();
      if (init?.signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      return mockResponse({});
    });
    const aborted = await fetchLiveHttpBytes({
      url: "https://example.test/live.jpg",
      acceptContentTypes: ["image/jpeg"],
      signal: mid.signal,
      fetchFn: fetchFnThrow,
    });
    expect(aborted).toEqual({ ok: false, error: "aborted", aborted: true });
  });

  it("times out a hanging fetch without treating it as a parent abort", async () => {
    vi.useFakeTimers();
    const fetchFn: LiveHttpFetchFn = vi.fn(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );
    const pending = fetchLiveHttpBytes({
      url: "https://example.test/live.jpg",
      acceptContentTypes: ["image/jpeg"],
      timeoutMs: 50,
      fetchFn,
    });
    await vi.advanceTimersByTimeAsync(50);
    const result = await pending;
    expect(result).toEqual({ ok: false, error: "timeout" });
    vi.useRealTimers();
  });
});

describe("applyAcquisitionAttribution", () => {
  it("fills empty meta attribution without overwriting existing", () => {
    const bare = rasterEntryFromBytes(encodeFixtureJpeg());
    const stamped = applyAcquisitionAttribution({
      entry: bare,
      attribution: {
        attribution: "  USGS Earthquake Hazards Program  ",
        licenseNote: "US Government work",
      },
    });
    expect(stamped.record.meta.attribution).toBe(
      "USGS Earthquake Hazards Program",
    );
    expect(stamped.record.meta.licenseNote).toBe("US Government work");

    const kept = applyAcquisitionAttribution({
      entry: rasterEntryFromBytes(encodeFixtureJpeg(), {
        attribution: "Already credited",
      }),
      attribution: { attribution: "Should not replace" },
    });
    expect(kept.record.meta.attribution).toBe("Already credited");
  });
});

describe("resolveLiveAcquireFailureDisposition / applyLiveAcquireFailureToLifecycle", () => {
  it("prefers stale when cached under stale-when-cached policy", () => {
    expect(
      resolveLiveAcquireFailureDisposition({
        hasUsableCachedVersion: true,
        policy: "stale-when-cached",
      }),
    ).toBe("stale");
    expect(
      resolveLiveAcquireFailureDisposition({
        hasUsableCachedVersion: false,
        policy: "stale-when-cached",
      }),
    ).toBe("error");
    expect(
      resolveLiveAcquireFailureDisposition({
        hasUsableCachedVersion: true,
        policy: "error",
      }),
    ).toBe("error");
  });

  it("restores ready then marks stale from loading when a prior version exists", () => {
    const lifecycle = createDynamicDataLifecycleManager();
    lifecycle.ensureSource(SOURCE);
    lifecycle.markLoading(SOURCE);
    lifecycle.markReady(SOURCE, { latestVersionId: "cached-v1" });
    lifecycle.markLoading(SOURCE);
    expect(lifecycle.getState(SOURCE).state).toBe("loading");

    applyLiveAcquireFailureToLifecycle(lifecycle, SOURCE, "upstream 503", "stale");
    expect(lifecycle.getState(SOURCE)).toMatchObject({
      state: "stale",
      latestVersionId: "cached-v1",
    });
  });
});

describe("createLiveHttpAcquisitionAdapter", () => {
  it("maps live bytes through toEntry and carries attribution", async () => {
    const bytes = encodeFixtureJpeg();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockResponse({ body: bytes }),
    );
    const adapter = createLiveHttpAcquisitionAdapter({
      sourceId: SOURCE,
      url: "https://example.test/live.jpg",
      acceptContentTypes: ["image/jpeg"],
      fetchFn,
      attribution: {
        attribution: "Example live feed",
        licenseNote: "Test license",
      },
      toEntry: (fetched: LiveHttpFetchOk) => ({
        ok: true,
        entry: rasterEntryFromBytes(fetched.bytes, {
          versionId: "from-live",
        }),
      }),
    });

    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.record.meta.versionId).toBe("from-live");
      expect(result.entry.record.meta.attribution).toBe("Example live feed");
      expect(result.entry.record.meta.licenseNote).toBe("Test license");
      expect(result.entry.payloadBytes?.byteLength).toBe(bytes.byteLength);
    }
  });

  it("falls back to fixture when live fetch fails (non-abort)", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockResponse({ ok: false, status: 503 }),
    );
    const fixtureBytes = encodeFixtureJpeg();
    const adapter = createLiveHttpAcquisitionAdapter({
      sourceId: SOURCE,
      url: "https://example.test/live.jpg",
      acceptContentTypes: ["image/jpeg"],
      fetchFn,
      toEntry: () => ({ ok: false, error: "should not map" }),
      fixtureFallback: (): DynamicAcquisitionResult => ({
        ok: true,
        entry: rasterEntryFromBytes(fixtureBytes, {
          versionId: "fixture-fallback",
          attribution: "Fixture offline",
        }),
      }),
    });

    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.record.meta.versionId).toBe("fixture-fallback");
      expect(result.entry.record.meta.attribution).toBe("Fixture offline");
    }
  });

  it("does not invoke fixture fallback on abort", async () => {
    const abort = new AbortController();
    abort.abort();
    const fallback = vi.fn();
    const adapter = createLiveHttpAcquisitionAdapter({
      sourceId: SOURCE,
      url: "https://example.test/live.jpg",
      acceptContentTypes: ["image/jpeg"],
      fetchFn: vi.fn(),
      toEntry: () => ({ ok: false, error: "unused" }),
      fixtureFallback: fallback,
    });
    const result = await adapter.acquire(abort.signal);
    expect(result).toEqual({ ok: false, error: "aborted" });
    expect(fallback).not.toHaveBeenCalled();
  });
});

describe("controller stale-when-cached + no fetch on resolve path", () => {
  it("marks stale (not error) on refresh failure when a prior version exists", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({
      store,
      lifecycle,
      acquireFailurePolicy: "stale-when-cached",
    });

    let failNext = false;
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      if (failNext) {
        return mockResponse({ ok: false, status: 503 });
      }
      return mockResponse({ body: encodeFixtureJpeg() });
    });

    acquisition.registerAdapter(
      createLiveHttpAcquisitionAdapter({
        sourceId: SOURCE,
        url: "https://example.test/live.jpg",
        acceptContentTypes: ["image/jpeg"],
        fetchFn,
        toEntry: (fetched) => ({
          ok: true,
          entry: rasterEntryFromBytes(fetched.bytes, {
            versionId: "live-ok",
            attribution: "Live",
          }),
        }),
      }),
    );

    const first = await acquisition.refreshNow(SOURCE);
    expect(first).toEqual({ ok: true, versionId: "live-ok" });
    expect(lifecycle.getState(SOURCE).state).toBe("ready");

    failNext = true;
    const second = await acquisition.refreshNow(SOURCE);
    expect(second.ok).toBe(false);
    expect(lifecycle.getState(SOURCE)).toMatchObject({
      state: "stale",
      latestVersionId: "live-ok",
    });

    const resolver = createDynamicSnapshotResolver({ store, lifecycle });
    const resolved = await resolver.resolveSnapshot(SOURCE, 1_700_000_000_000);
    expect(resolved.status).toBe("ok");
    expect(resolved.freshness).toBe("stale");
    expect(resolved.snapshot?.meta.versionId).toBe("live-ok");
  });

  it("marks error on failure when no prior version exists", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({
      store,
      lifecycle,
      acquireFailurePolicy: "stale-when-cached",
    });

    acquisition.registerAdapter(
      createLiveHttpAcquisitionAdapter({
        sourceId: SOURCE,
        url: "https://example.test/live.jpg",
        acceptContentTypes: ["image/jpeg"],
        fetchFn: async () => mockResponse({ ok: false, status: 404 }),
        toEntry: () => ({ ok: false, error: "unused" }),
      }),
    );

    const result = await acquisition.refreshNow(SOURCE);
    expect(result.ok).toBe(false);
    expect(lifecycle.getState(SOURCE)).toMatchObject({
      state: "error",
      lastError: "HTTP 404",
    });
  });

  it("resolveSnapshot never invokes live fetch", async () => {
    const store = createMemoryDynamicSnapshotStore();
    const lifecycle = createDynamicDataLifecycleManager();
    const acquisition = createDynamicAcquisitionController({
      store,
      lifecycle,
      acquireFailurePolicy: "stale-when-cached",
    });

    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockResponse({ body: encodeFixtureJpeg() }),
    );
    acquisition.registerAdapter(
      createLiveHttpAcquisitionAdapter({
        sourceId: SOURCE,
        url: "https://example.test/live.jpg",
        acceptContentTypes: ["image/jpeg"],
        fetchFn,
        toEntry: (fetched) => ({
          ok: true,
          entry: rasterEntryFromBytes(fetched.bytes, {
            versionId: "seeded",
          }),
        }),
      }),
    );

    await acquisition.refreshNow(SOURCE);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const resolver = createDynamicSnapshotResolver({ store, lifecycle });
    const putSpy = vi.spyOn(store, "put");
    for (const t of [1_700_000_000_000 - 60_000, 1_700_000_000_000]) {
      const result = await resolver.resolveSnapshot(SOURCE, t);
      expect(result.status).toBe("ok");
    }
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(putSpy).not.toHaveBeenCalled();
  });
});
