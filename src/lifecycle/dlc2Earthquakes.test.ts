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
import { createDynamicPointFeaturesOverlayLayer } from "../layers/dynamicPointFeaturesOverlayLayer";
import { isDynamicPointFeaturesPayload } from "../layers/dynamicPointFeaturesPayload";
import {
  USGS_EARTHQUAKES_SOURCE_ID,
  createDynamicDataLifecycleHost,
  getDynamicPointFeaturesSourceCatalogEntry,
  produceEarthquakesFixtureAcquisition,
} from "./index";

describe("DLC-2 earthquakes point-features consumer boundary", () => {
  it("catalog exposes durable sourceId with attribution (not a CDN URL)", () => {
    const entry = getDynamicPointFeaturesSourceCatalogEntry(USGS_EARTHQUAKES_SOURCE_ID);
    expect(entry).not.toBeNull();
    expect(entry!.sourceId).toBe("usgs-earthquakes-v1");
    expect(entry!.kind).toBe("pointFeatures");
    expect(entry!.attribution.length).toBeGreaterThan(20);
    expect(entry!.sourceId.includes("://")).toBe(false);
  });

  it("fixture acquisition yields real-format USGS-shaped GeoJSON bytes", () => {
    const result = produceEarthquakesFixtureAcquisition({
      nowMs: () => 1_700_000_000_000,
      versionIdFor: () => "earthquakes-test-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.sourceId).toBe(USGS_EARTHQUAKES_SOURCE_ID);
    expect(result.entry.record.body.kind).toBe("pointFeatures");
    if (result.entry.record.body.kind === "pointFeatures") {
      expect(result.entry.record.body.features.length).toBeGreaterThanOrEqual(3);
    }
    expect(result.entry.payloadBytes?.byteLength).toBeGreaterThan(40);
    const text = new TextDecoder().decode(result.entry.payloadBytes);
    const parsed = JSON.parse(text) as {
      type: string;
      features: unknown[];
    };
    expect(parsed.type).toBe("FeatureCollection");
    expect(Array.isArray(parsed.features)).toBe(true);
    expect(parsed.features.length).toBeGreaterThanOrEqual(3);
    expect(result.entry.record.meta.attribution).toBeTruthy();
  });

  it("host arms consumer, materializes sync view, and scrub resolve does not re-acquire", async () => {
    const acquireSpy = vi.fn();
    const timers: Array<{ id: number; handler: () => void }> = [];
    let nextTimerId = 1;
    // Avoid real network in DLC-2 boundary tests: fail live fetch → fixture fallback.
    const earthquakesLiveFetchFn = vi.fn(async () => {
      throw new Error("offline-test");
    });
    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn,
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

    host.ensureEarthquakesConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });

    await vi.waitFor(() => {
      const att = host.attachForProductInstant(1_700_000_000_000);
      expect(att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID)).not.toBeNull();
    });

    const acquiresAfterArm = acquireSpy.mock.calls.length;
    expect(acquiresAfterArm).toBeGreaterThanOrEqual(1);
    expect(earthquakesLiveFetchFn).toHaveBeenCalled();

    const productA = 1_700_000_000_000;
    const productB = productA + 3_600_000;
    const attA = host.attachForProductInstant(productA);
    const attB = host.attachForProductInstant(productB);
    const viewA = attA.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID);
    const viewB = attB.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID);
    expect(viewA).not.toBeNull();
    expect(viewB).not.toBeNull();
    expect(viewA!.features.length).toBeGreaterThan(0);
    expect(acquireSpy.mock.calls.length).toBe(acquiresAfterArm);

    const resolved = await attA.resolveSnapshot(USGS_EARTHQUAKES_SOURCE_ID);
    expect(resolved.status).toBe("ok");
    expect(acquireSpy.mock.calls.length).toBe(acquiresAfterArm);

    host.dispose();
  });

  it("Model B layer getState reads prepared view sync and never calls resolveSnapshot", async () => {
    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: async () => {
        throw new Error("offline-test");
      },
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureEarthquakesConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });
    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(Date.now())
          .getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });

    const layer = createDynamicPointFeaturesOverlayLayer({
      sceneLayerId: "earthquakes",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
      opacity: 0.95,
    });

    const attachment = host.attachForProductInstant(Date.now());
    const resolveSpy = vi.spyOn(attachment, "resolveSnapshot");
    const time = createTimeContext(Date.now(), 0, false, {
      dynamicDataLifecycle: attachment,
    });
    const state = layer.getState(time);
    expect(state.visible).toBe(true);
    expect(isDynamicPointFeaturesPayload(state.data)).toBe(true);
    if (isDynamicPointFeaturesPayload(state.data)) {
      expect(state.data.features.length).toBeGreaterThan(0);
      expect(state.data.features[0]!.lonDeg).toBeDefined();
    }
    expect(resolveSpy).not.toHaveBeenCalled();

    const cold = layer.getState(createTimeContext(Date.now(), 0, false));
    expect(cold.visible).toBe(false);

    host.dispose();
  });
});
