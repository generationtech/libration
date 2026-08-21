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
 * DLU-5 — live Clouds v1 acquisition under durable `global-clouds-ir-v1`.
 * PNG + explicit TIME. Production does not fixture-fallback.
 */

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
  wmsUrlHasExplicitTime,
  type LiveHttpFetchFn,
} from "./index";
import {
  CLOUDS_TEST_OBSERVATION_MS,
  encodeCloudsTestPng,
  mockCloudsLiveFetch,
} from "./cloudsAcquisition.testSupport";

describe("DLU-5 live Clouds v1 acquisition", () => {
  it("catalog still exposes durable sourceId (not the live feed URL)", () => {
    const entry = getDynamicEquirectSourceCatalogEntry(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(entry).not.toBeNull();
    expect(entry!.sourceId).toBe("global-clouds-ir-v1");
    expect(entry!.sourceId.includes("://")).toBe(false);
    expect(GLOBAL_CLOUDS_IR_LIVE_FEED_URL.startsWith("https://")).toBe(true);
    expect(GLOBAL_CLOUDS_IR_LIVE_FEED_URL).toContain("gibs.earthdata.nasa.gov");
    expect(wmsUrlHasExplicitTime(GLOBAL_CLOUDS_IR_LIVE_FEED_URL)).toBe(true);
    expect(entry!.attribution.toLowerCase()).toContain("gibs");
    expect(entry!.coverageKind).toBe("partial");
  });

  it("live adapter maps HTTP PNG bytes to store entry with observation TIME", async () => {
    const bytes = encodeCloudsTestPng();
    const fetchFn: LiveHttpFetchFn = vi.fn(mockCloudsLiveFetch({ png: bytes }));
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 120_000,
      versionIdFor: () => "clouds-ir-live-test-1",
      useFixtureFallback: false,
      requireGibsDimensions: false,
    });

    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.sourceId).toBe(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(result.entry.record.meta.versionId).toBe("clouds-ir-live-test-1");
    expect(result.entry.record.meta.validTimeMs).toBe(CLOUDS_TEST_OBSERVATION_MS);
    expect(result.entry.record.meta.acquiredAtMs).toBe(CLOUDS_TEST_OBSERVATION_MS + 120_000);
    expect(result.entry.record.meta.origin).toBe("live");
    if (result.entry.record.body.kind === "equirectRaster") {
      expect(result.entry.record.body.contentType).toBe("image/png");
    }
    expect(result.entry.payloadBytes![0]).toBe(0x89);
    const callUrls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(callUrls.some((u) => wmsUrlHasExplicitTime(u))).toBe(true);
  });

  it("live adapter does not fixture-fallback when HTTP fails", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("503");
    });
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS,
      useFixtureFallback: false,
      requireGibsDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(false);
  });

  it("produceGlobalCloudsIrLiveAcquisitionFromFetched requires observation TIME", () => {
    const bytes = encodeCloudsTestPng();
    const missing = produceGlobalCloudsIrLiveAcquisitionFromFetched(
      {
        ok: true,
        bytes,
        contentType: "image/png",
        responseUrl: GLOBAL_CLOUDS_IR_LIVE_FEED_URL,
        status: 200,
      },
      { nowMs: () => CLOUDS_TEST_OBSERVATION_MS },
    );
    expect(missing.ok).toBe(false);
  });

  it("host arms live consumer, materializes equirect highlight, resolve does not re-fetch", async () => {
    const bytes = encodeCloudsTestPng();
    const fetchFn: LiveHttpFetchFn = vi.fn(mockCloudsLiveFetch({ png: bytes }));
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 60_000,
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
          .attachForProductInstant(CLOUDS_TEST_OBSERVATION_MS + 60_000)
          .getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });

    expect(fetchFn).toHaveBeenCalled();
    const fetchesAfterArm = (fetchFn as ReturnType<typeof vi.fn>).mock.calls.length;

    const att = host.attachForProductInstant(CLOUDS_TEST_OBSERVATION_MS + 60_000);
    const view = att.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(view).not.toBeNull();
    expect(view!.origin).toBe("live");
    expect(view!.coverageKind).toBe("partial");
    expect(att.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBeNull();

    const resolved = await att.resolveSnapshot(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(resolved.status).toBe("ok");
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchesAfterArm);

    const layer = createDynamicEquirectRasterOverlayLayer({
      sceneLayerId: "globalCloudsIr",
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      opacity: 0.42,
    });
    const resolveSpy = vi.spyOn(att, "resolveSnapshot");
    const state = layer.getState(
      createTimeContext(CLOUDS_TEST_OBSERVATION_MS + 60_000, 0, false, {
        dynamicDataLifecycle: att,
      }),
    );
    expect(state.visible).toBe(true);
    expect(state.data).toMatchObject({
      kind: "equirectangularRaster",
      src: expect.any(String),
    });
    expect(resolveSpy).not.toHaveBeenCalled();

    host.dispose();
  });
});
