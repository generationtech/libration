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

import { describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { createDynamicEquirectRasterOverlayLayer } from "../layers/dynamicEquirectRasterOverlayLayer";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  createDynamicDataLifecycleHost,
  getDynamicEquirectSourceCatalogEntry,
  produceGlobalCloudsIrFixtureAcquisition,
} from "./index";
import {
  encodeCloudsTestPng,
  mockCloudsLiveFetch,
  CLOUDS_TEST_OBSERVATION_MS,
} from "./cloudsAcquisition.testSupport";

describe("DLC-1 global clouds/IR consumer boundary", () => {
  it("catalog exposes durable sourceId with attribution (not a CDN URL)", () => {
    const entry = getDynamicEquirectSourceCatalogEntry(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(entry).not.toBeNull();
    expect(entry!.sourceId).toBe("global-clouds-ir-v1");
    expect(entry!.kind).toBe("equirectRaster");
    expect(entry!.attribution.length).toBeGreaterThan(20);
    expect(entry!.sourceId.includes("://")).toBe(false);
  });

  it("fixture acquisition yields real-format PNG equirect bytes", () => {
    const result = produceGlobalCloudsIrFixtureAcquisition({
      nowMs: () => 1_700_000_000_000,
      versionIdFor: () => "clouds-ir-test-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.sourceId).toBe(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(result.entry.record.body.kind).toBe("equirectRaster");
    expect(result.entry.payloadBytes?.byteLength).toBeGreaterThan(20);
    expect(result.entry.payloadBytes![0]).toBe(0x89);
    expect(result.entry.payloadBytes![1]).toBe(0x50);
    expect(result.entry.record.meta.attribution).toBeTruthy();
    expect(result.entry.record.meta.origin).toBe("fixture");
  });

  it("host arms consumer, materializes sync view, and scrub resolve does not re-acquire", async () => {
    const acquireSpy = vi.fn();
    const timers: Array<{ id: number; handler: () => void }> = [];
    let nextTimerId = 1;
    // Avoid real network in DLC-1 boundary tests: fail live fetch → fixture fallback.
    const cloudsIrLiveFetchFn = vi.fn(
      mockCloudsLiveFetch({ png: encodeCloudsTestPng() }),
    );
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn,
      setIntervalFn: (handler) => {
        const id = nextTimerId++;
        timers.push({ id, handler });
        return id;
      },
      clearIntervalFn: (handle) => {
        const idx = timers.findIndex((t) => t.id === handle);
        if (idx >= 0) timers.splice(idx, 1);
      },
    });

    // Wrap refresh path: ensureGlobalCloudsIrConsumer registers live adapter.
    const originalRegister = host.acquisition.registerAdapter.bind(host.acquisition);
    host.acquisition.registerAdapter = (adapter) => {
      originalRegister({
        sourceId: adapter.sourceId,
        acquire: async (signal) => {
          acquireSpy();
          return adapter.acquire(signal);
        },
      });
    };

    host.ensureGlobalCloudsIrConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });

    // Allow async refresh + materialize subscribe to settle.
    await vi.waitFor(() => {
      const att = host.attachForProductInstant(1_700_000_000_000);
      expect(att.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID)).not.toBeNull();
    });

    const acquiresAfterArm = acquireSpy.mock.calls.length;
    expect(acquiresAfterArm).toBeGreaterThanOrEqual(1);
    expect(cloudsIrLiveFetchFn).toHaveBeenCalled();

    const productA = 1_700_000_000_000;
    const productB = productA + 3_600_000;
    const attA = host.attachForProductInstant(productA);
    const attB = host.attachForProductInstant(productB);
    const viewA = attA.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID);
    const viewB = attB.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(viewA).not.toBeNull();
    expect(viewB).not.toBeNull();
    expect(viewA!.src.length).toBeGreaterThan(0);
    // Scrub / re-attach must not invoke acquisition adapters.
    expect(acquireSpy.mock.calls.length).toBe(acquiresAfterArm);

    const resolved = await attA.resolveSnapshot(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(resolved.status).toBe("ok");
    expect(acquireSpy.mock.calls.length).toBe(acquiresAfterArm);

    host.dispose();
  });

  it("Model B layer getState reads prepared view sync and never calls resolveSnapshot", async () => {
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: mockCloudsLiveFetch({ png: encodeCloudsTestPng() }),
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureGlobalCloudsIrConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });
    const productMs = CLOUDS_TEST_OBSERVATION_MS + 60_000;
    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(productMs)
          .getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });

    const layer = createDynamicEquirectRasterOverlayLayer({
      sceneLayerId: "globalCloudsIr",
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      opacity: 0.42,
    });

    const attachment = host.attachForProductInstant(productMs);
    const resolveSpy = vi.spyOn(attachment, "resolveSnapshot");
    const time = createTimeContext(productMs, 0, false, {
      dynamicDataLifecycle: attachment,
    });
    const state = layer.getState(time);
    expect(state.visible).toBe(true);
    expect(state.data).toMatchObject({
      kind: "equirectangularRaster",
      src: expect.any(String),
    });
    expect(resolveSpy).not.toHaveBeenCalled();

    // Without attachment → invisible, still no throw / fetch.
    const cold = layer.getState(createTimeContext(productMs, 0, false));
    expect(cold.visible).toBe(false);

    host.dispose();
  });
});
