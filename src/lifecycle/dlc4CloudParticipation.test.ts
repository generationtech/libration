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
import { getMoonlightPolicy } from "../core/moonlightPolicy";
import { createTimeContext } from "../core/time";
import { createSolarShadingLayer } from "../layers/solarShadingLayer";
import { isSolarShadingPayload } from "../layers/solarShadingPayload";
import { buildSolarShadingIlluminationRenderPlan } from "../renderer/renderPlan/sceneSolarShadingIlluminationPlan";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  createDynamicDataLifecycleHost,
  decodeJpegBytesToCloudOpacityBuffer,
  produceGlobalCloudsIrFixtureAcquisition,
  sampleCloudOpacity01,
} from "./index";

describe("DLC-4 Model A cloud participation boundary", () => {
  it("decodes fixture JPEG into opacity buffer and samples 0..1", () => {
    const result = produceGlobalCloudsIrFixtureAcquisition({
      nowMs: () => 1_700_000_000_000,
      versionIdFor: () => "clouds-ir-opacity-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const buf = decodeJpegBytesToCloudOpacityBuffer(result.entry.payloadBytes!);
    expect(buf).not.toBeNull();
    expect(buf!.width).toBeGreaterThan(0);
    expect(buf!.height).toBeGreaterThan(0);
    expect(buf!.opacityU8.length).toBe(buf!.width * buf!.height);
    const west = sampleCloudOpacity01(buf!, -150, 0);
    const east = sampleCloudOpacity01(buf!, 150, 0);
    expect(west).toBeGreaterThanOrEqual(0);
    expect(west).toBeLessThanOrEqual(1);
    expect(east).toBeGreaterThan(west); // fixture has longitudinal gradient
  });

  it("host materializes cloud opacity sync; scrub resolve does not re-acquire", async () => {
    const acquireSpy = vi.fn();
    const timers: Array<{ id: number; handler: () => void }> = [];
    let nextTimerId = 1;
    // Avoid real network: fail live fetch → fixture fallback (same durable sourceId).
    const cloudsIrLiveFetchFn = vi.fn(async () => {
      throw new Error("offline-test");
    });
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

    await vi.waitFor(() => {
      const att = host.attachForProductInstant(1_700_000_000_000);
      expect(att.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)).not.toBeNull();
    });

    const acquiresAfterArm = acquireSpy.mock.calls.length;
    expect(acquiresAfterArm).toBeGreaterThanOrEqual(1);
    expect(cloudsIrLiveFetchFn).toHaveBeenCalled();

    const attA = host.attachForProductInstant(1_700_000_000_000);
    const attB = host.attachForProductInstant(1_700_000_000_000 + 3_600_000);
    expect(attA.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)).not.toBeNull();
    expect(attB.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)).not.toBeNull();
    expect(acquireSpy.mock.calls.length).toBe(acquiresAfterArm);

    const resolved = await attA.resolveSnapshot(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(resolved.status).toBe("ok");
    expect(acquireSpy.mock.calls.length).toBe(acquiresAfterArm);

    host.dispose();
  });

  it("solar shading layer reads prepared opacity sync when Model A enabled; no resolveSnapshot", async () => {
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: async () => {
        throw new Error("offline-test");
      },
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
          .attachForProductInstant(Date.now())
          .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });

    const layer = createSolarShadingLayer({
      cloudParticipationMode: "natural",
      cloudParticipationSourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      cloudParticipationIntensity: 1,
      emissiveNightLightsMode: "off",
      moonlightMode: "off",
    });

    const attachment = host.attachForProductInstant(Date.now());
    const resolveSpy = vi.spyOn(attachment, "resolveSnapshot");
    const time = createTimeContext(Date.now(), 0, false, {
      dynamicDataLifecycle: attachment,
    });
    const state = layer.getState(time);
    expect(isSolarShadingPayload(state.data)).toBe(true);
    if (isSolarShadingPayload(state.data)) {
      expect(state.data.cloudParticipationMode).toBe("natural");
      expect(state.data.cloudOpacityRaster).not.toBeNull();
      expect(state.data.cloudOpacityRaster!.width).toBeGreaterThan(0);
    }
    expect(resolveSpy).not.toHaveBeenCalled();

    const cold = layer.getState(createTimeContext(Date.now(), 0, false));
    expect(isSolarShadingPayload(cold.data)).toBe(true);
    if (isSolarShadingPayload(cold.data)) {
      expect(cold.data.cloudOpacityRaster).toBeNull();
    }

    host.dispose();
  });

  it("illumination RenderPlan alpha increases under opaque clouds vs clear (Model A)", () => {
    const opaque: import("./dynamicCloudOpacityMaterializer").CloudOpacitySampleBuffer = {
      width: 2,
      height: 2,
      opacityU8: new Uint8Array([255, 255, 255, 255]),
    };
    const clear: import("./dynamicCloudOpacityMaterializer").CloudOpacitySampleBuffer = {
      width: 2,
      height: 2,
      opacityU8: new Uint8Array([0, 0, 0, 0]),
    };
    const base = {
      viewportWidthPx: 8,
      viewportHeightPx: 4,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 180,
      lunarIlluminatedFraction: 0.5,
      layerOpacity: 1,
      moonlightPolicy: getMoonlightPolicy("off"),
      emissiveNightLightsMode: "off" as const,
    };
    const withClouds = buildSolarShadingIlluminationRenderPlan({
      ...base,
      cloudParticipationMode: "illustrative",
      cloudOpacityRaster: opaque,
      cloudParticipationIntensity: 1,
    });
    const without = buildSolarShadingIlluminationRenderPlan({
      ...base,
      cloudParticipationMode: "illustrative",
      cloudOpacityRaster: clear,
      cloudParticipationIntensity: 1,
    });
    const off = buildSolarShadingIlluminationRenderPlan({
      ...base,
      cloudParticipationMode: "off",
      cloudOpacityRaster: opaque,
    });

    const sumAlpha = (plan: typeof withClouds): number => {
      const item = plan.items[0];
      if (!item || item.kind !== "rasterPatch") return 0;
      let s = 0;
      for (let i = 3; i < item.rgba.length; i += 4) s += item.rgba[i];
      return s;
    };

    expect(sumAlpha(withClouds)).toBeGreaterThan(sumAlpha(without));
    expect(sumAlpha(off)).toBe(sumAlpha(without));
  });
});
