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
 * DLU-5 — live global clouds/IR acquisition under durable `global-clouds-ir-v1`.
 * Prove JPEG validate, live HTTP adapter, fixture fallback, host wiring, and
 * no fetch on resolve / paint path.
 */

import * as jpeg from "jpeg-js";
import { describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { createDynamicEquirectRasterOverlayLayer } from "../layers/dynamicEquirectRasterOverlayLayer";
import {
  GLOBAL_CLOUDS_IR_LIVE_FEED_URL,
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  createDynamicDataLifecycleHost,
  createGlobalCloudsIrLiveHttpAcquisitionAdapter,
  getDynamicEquirectSourceCatalogEntry,
  produceGlobalCloudsIrLiveAcquisitionFromFetched,
  validateGlobalCloudsIrJpegBytes,
  type LiveHttpFetchFn,
  type LiveHttpFetchOk,
} from "./index";

/** Tiny real-format JPEG for live-adapter tests (not the fixture producer). */
function encodeLiveTestJpeg(): Uint8Array {
  const width = 4;
  const height = 2;
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 80 + (i % 40);
    data[i + 1] = 90;
    data[i + 2] = 110;
    data[i + 3] = 255;
  }
  const encoded = jpeg.encode({ data, width, height }, 85);
  return new Uint8Array(encoded.data);
}

function mockJpegResponse(options: {
  body: Uint8Array;
  ok?: boolean;
  status?: number;
  contentType?: string | null;
}): Response {
  const ok = options.ok !== false;
  const status = options.status ?? (ok ? 200 : 500);
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
    headers,
    url: GLOBAL_CLOUDS_IR_LIVE_FEED_URL,
    arrayBuffer: async () =>
      options.body.buffer.slice(
        options.body.byteOffset,
        options.body.byteOffset + options.body.byteLength,
      ),
  } as Response;
}

describe("DLU-5 live global clouds/IR acquisition", () => {
  it("catalog still exposes durable sourceId (not the live feed URL)", () => {
    const entry = getDynamicEquirectSourceCatalogEntry(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(entry).not.toBeNull();
    expect(entry!.sourceId).toBe("global-clouds-ir-v1");
    expect(entry!.sourceId.includes("://")).toBe(false);
    expect(GLOBAL_CLOUDS_IR_LIVE_FEED_URL.startsWith("https://")).toBe(true);
    expect(GLOBAL_CLOUDS_IR_LIVE_FEED_URL).toContain("gibs.earthdata.nasa.gov");
    expect(entry!.attribution.toLowerCase()).toContain("gibs");
  });

  it("validates JPEG SOI bytes", () => {
    const bytes = encodeLiveTestJpeg();
    const ok = validateGlobalCloudsIrJpegBytes(bytes);
    expect(ok).toEqual({ ok: true, byteLength: bytes.byteLength });
  });

  it("rejects empty or non-JPEG bodies", () => {
    expect(validateGlobalCloudsIrJpegBytes(new Uint8Array())).toEqual({
      ok: false,
      error: "empty or truncated jpeg body",
    });
    expect(
      validateGlobalCloudsIrJpegBytes(new TextEncoder().encode("not-a-jpeg")),
    ).toEqual({
      ok: false,
      error: "not a jpeg (missing SOI)",
    });
  });

  it("live adapter maps HTTP JPEG bytes to store entry under durable sourceId", async () => {
    const bytes = encodeLiveTestJpeg();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockJpegResponse({ body: bytes }),
    );
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => 1_700_000_300_000,
      versionIdFor: () => "clouds-ir-live-test-1",
      useFixtureFallback: false,
    });

    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.sourceId).toBe(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(result.entry.record.meta.versionId).toBe("clouds-ir-live-test-1");
    expect(result.entry.record.body.kind).toBe("equirectRaster");
    if (result.entry.record.body.kind === "equirectRaster") {
      expect(result.entry.record.body.contentType).toBe("image/jpeg");
      expect(result.entry.record.body.lonMinDeg).toBe(-180);
      expect(result.entry.record.body.lonMaxDeg).toBe(180);
    }
    expect(result.entry.payloadBytes![0]).toBe(0xff);
    expect(result.entry.payloadBytes![1]).toBe(0xd8);
    expect(result.entry.record.meta.attribution).toBeTruthy();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const callUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(callUrl).toBe(GLOBAL_CLOUDS_IR_LIVE_FEED_URL);
  });

  it("live adapter falls back to fixture when HTTP fails (non-abort)", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockJpegResponse({
        body: new Uint8Array(),
        ok: false,
        status: 503,
      }),
    );
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => 1_700_000_400_000,
      versionIdFor: () => "clouds-ir-fixture-fallback",
      useFixtureFallback: true,
    });

    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.versionId).toBe(
      "clouds-ir-fixture-fallback",
    );
    expect(result.entry.record.body.kind).toBe("equirectRaster");
    expect(result.entry.payloadBytes![0]).toBe(0xff);
    expect(result.entry.payloadBytes![1]).toBe(0xd8);
  });

  it("produceGlobalCloudsIrLiveAcquisitionFromFetched stamps catalog attribution", () => {
    const bytes = encodeLiveTestJpeg();
    const fetched: LiveHttpFetchOk = {
      ok: true,
      bytes,
      contentType: "image/jpeg",
      responseUrl: GLOBAL_CLOUDS_IR_LIVE_FEED_URL,
      status: 200,
    };
    const result = produceGlobalCloudsIrLiveAcquisitionFromFetched(fetched, {
      nowMs: () => 1_700_000_500_000,
      versionIdFor: () => "from-fetched",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.validTimeMs).toBe(1_700_000_500_000);
    expect(result.entry.record.meta.attribution?.toLowerCase()).toContain(
      "gibs",
    );
  });

  it("host arms live consumer, materializes equirect, resolve does not re-fetch", async () => {
    const bytes = encodeLiveTestJpeg();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockJpegResponse({ body: bytes }),
    );
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });

    host.ensureGlobalCloudsIrConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });

    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(1_700_000_000_000)
          .getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const fetchesAfterArm = (fetchFn as ReturnType<typeof vi.fn>).mock.calls
      .length;

    const att = host.attachForProductInstant(1_700_000_000_000);
    const view = att.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(view).not.toBeNull();
    expect(view!.src.length).toBeGreaterThan(0);

    const resolved = await att.resolveSnapshot(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(resolved.status).toBe("ok");
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      fetchesAfterArm,
    );

    const layer = createDynamicEquirectRasterOverlayLayer({
      sceneLayerId: "globalCloudsIr",
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      opacity: 0.45,
    });
    const resolveSpy = vi.spyOn(att, "resolveSnapshot");
    const state = layer.getState(
      createTimeContext(1_700_000_000_000, 0, false, {
        dynamicDataLifecycle: att,
      }),
    );
    expect(state.visible).toBe(true);
    expect(state.data).toMatchObject({
      kind: "equirectangularRaster",
      src: expect.any(String),
    });
    expect(resolveSpy).not.toHaveBeenCalled();
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      fetchesAfterArm,
    );

    host.dispose();
  });
});
