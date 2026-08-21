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
} from "./index";

describe("DLC-4 Model A cloud participation is non-operative for Clouds v1", () => {
  it("PNG Clouds fixture is not a JPEG opacity field", () => {
    const result = produceGlobalCloudsIrFixtureAcquisition({
      nowMs: () => 1_700_000_000_000,
      versionIdFor: () => "clouds-ir-opacity-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(decodeJpegBytesToCloudOpacityBuffer(result.entry.payloadBytes!)).toBeNull();
  });

  it("host materializes Clouds overlay and does not feed the opacity materializer", async () => {
    const { encodeCloudsTestPng, mockCloudsLiveFetch } = await import("./cloudsAcquisition.testSupport");
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: mockCloudsLiveFetch({ png: encodeCloudsTestPng() }),
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureGlobalCloudsIrConsumer({ intervalMs: 60_000, runImmediately: true });
    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(1_700_000_000_000)
          .getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });
    expect(
      host
        .attachForProductInstant(1_700_000_000_000)
        .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID),
    ).toBeNull();
    host.dispose();
  });

  it("solar shading layer with stored natural mode still has null opacity when the host does not materialize it", () => {
    const layer = createSolarShadingLayer({
      cloudParticipationMode: "natural",
      cloudParticipationSourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      cloudParticipationIntensity: 1,
      emissiveNightLightsMode: "off",
      moonlightMode: "off",
    });
    const state = layer.getState(createTimeContext(Date.now(), 0, false));
    expect(isSolarShadingPayload(state.data)).toBe(true);
    if (isSolarShadingPayload(state.data)) {
      expect(state.data.cloudOpacityRaster).toBeNull();
    }
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
    // Clouds v1 factory path forces participation off; leftover planner math
    // must not run unless a raster is supplied — and production never supplies one.
  });
});
