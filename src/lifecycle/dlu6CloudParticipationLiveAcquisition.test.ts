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
 * DLU-6 — live Model A cloud participation on durable `global-clouds-ir-v1`.
 * Prove live JPEG → cloud-opacity materializer → solar shading / illumination
 * rasterPatch, refresh rematerialization, and no fetch on resolve / paint path.
 */

import * as jpeg from "jpeg-js";
import { describe, expect, it, vi } from "vitest";
import { getMoonlightPolicy } from "../core/moonlightPolicy";
import { createTimeContext } from "../core/time";
import { createSolarShadingLayer } from "../layers/solarShadingLayer";
import { isSolarShadingPayload } from "../layers/solarShadingPayload";
import { buildSolarShadingIlluminationRenderPlan } from "../renderer/renderPlan/sceneSolarShadingIlluminationPlan";
import type { CloudOpacitySampleBuffer } from "./dynamicCloudOpacityMaterializer";
import {
  GLOBAL_CLOUDS_IR_LIVE_FEED_URL,
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  createDynamicDataLifecycleHost,
  sampleCloudOpacity01,
  type LiveHttpFetchFn,
} from "./index";

/** Uniform-luma JPEG for controlled Model A opacity (0 = clear … 255 = opaque). */
function encodeUniformLumaJpeg(luma: number): Uint8Array {
  const width = 4;
  const height = 2;
  const v = Math.max(0, Math.min(255, Math.round(luma)));
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  const encoded = jpeg.encode({ data, width, height }, 90);
  return new Uint8Array(encoded.data);
}

function mockJpegResponse(body: Uint8Array): Response {
  const headers = new Headers();
  headers.set("content-type", "image/jpeg");
  return {
    ok: true,
    status: 200,
    headers,
    url: GLOBAL_CLOUDS_IR_LIVE_FEED_URL,
    arrayBuffer: async () =>
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  } as Response;
}

function sumRasterPatchAlpha(
  plan: ReturnType<typeof buildSolarShadingIlluminationRenderPlan>,
): number {
  const item = plan.items[0];
  if (!item || item.kind !== "rasterPatch") return 0;
  let s = 0;
  for (let i = 3; i < item.rgba.length; i += 4) s += item.rgba[i];
  return s;
}

function illuminationPlanFromOpacity(cloudOpacityRaster: CloudOpacitySampleBuffer) {
  return buildSolarShadingIlluminationRenderPlan({
    viewportWidthPx: 8,
    viewportHeightPx: 4,
    subsolarLatDeg: 0,
    subsolarLonDeg: 0,
    sublunarLatDeg: 0,
    sublunarLonDeg: 180,
    lunarIlluminatedFraction: 0.5,
    layerOpacity: 1,
    moonlightPolicy: getMoonlightPolicy("off"),
    emissiveNightLightsMode: "off",
    cloudParticipationMode: "illustrative",
    cloudOpacityRaster,
    cloudParticipationIntensity: 1,
  });
}

describe("DLU-6 live Model A cloud participation", () => {
  it("host live arm materializes cloud opacity under durable sourceId (not feed URL)", async () => {
    const opaque = encodeUniformLumaJpeg(240);
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => mockJpegResponse(opaque));
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });

    // Model A-only arming path (same ensure* as Model B / App.tsx).
    host.ensureGlobalCloudsIrConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });

    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(1_700_000_000_000)
          .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const callUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(callUrl).toBe(GLOBAL_CLOUDS_IR_LIVE_FEED_URL);

    const att = host.attachForProductInstant(1_700_000_000_000);
    const prepared = att.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(prepared).not.toBeNull();
    expect(prepared!.sourceId).toBe(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(prepared!.sourceId.includes("://")).toBe(false);
    expect(prepared!.buffer.width).toBeGreaterThan(0);
    expect(sampleCloudOpacity01(prepared!.buffer, 0, 0)).toBeGreaterThan(0.8);

    const fetchesAfterArm = (fetchFn as ReturnType<typeof vi.fn>).mock.calls
      .length;
    const resolved = await att.resolveSnapshot(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(resolved.status).toBe("ok");
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      fetchesAfterArm,
    );

    host.dispose();
  });

  it("solar shading reads live-prepared opacity sync; no resolveSnapshot / re-fetch", async () => {
    const opaque = encodeUniformLumaJpeg(220);
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => mockJpegResponse(opaque));
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
          .attachForProductInstant(1_700_000_100_000)
          .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });
    const fetchesAfterArm = (fetchFn as ReturnType<typeof vi.fn>).mock.calls
      .length;

    const layer = createSolarShadingLayer({
      cloudParticipationMode: "natural",
      cloudParticipationSourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      cloudParticipationIntensity: 1,
      emissiveNightLightsMode: "off",
      moonlightMode: "off",
    });
    const att = host.attachForProductInstant(1_700_000_100_000);
    const resolveSpy = vi.spyOn(att, "resolveSnapshot");
    const state = layer.getState(
      createTimeContext(1_700_000_100_000, 0, false, {
        dynamicDataLifecycle: att,
      }),
    );
    expect(isSolarShadingPayload(state.data)).toBe(true);
    if (isSolarShadingPayload(state.data)) {
      expect(state.data.cloudParticipationMode).toBe("natural");
      expect(state.data.cloudOpacityRaster).not.toBeNull();
      expect(
        sampleCloudOpacity01(state.data.cloudOpacityRaster!, 0, 0),
      ).toBeGreaterThan(0.7);
    }
    expect(resolveSpy).not.toHaveBeenCalled();
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      fetchesAfterArm,
    );

    host.dispose();
  });

  it("live refresh rematerializes opacity and changes illumination rasterPatch alpha", async () => {
    const clearJpeg = encodeUniformLumaJpeg(8);
    const opaqueJpeg = encodeUniformLumaJpeg(250);
    let call = 0;
    let clockMs = 1_700_000_200_000;
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      call += 1;
      return mockJpegResponse(call === 1 ? clearJpeg : opaqueJpeg);
    });
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
      nowMs: () => clockMs,
    });

    host.ensureGlobalCloudsIrConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });

    await vi.waitFor(() => {
      const p = host
        .attachForProductInstant(clockMs)
        .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID);
      expect(p).not.toBeNull();
      expect(sampleCloudOpacity01(p!.buffer, 0, 0)).toBeLessThan(0.15);
    });

    const first = host
      .attachForProductInstant(clockMs)
      .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)!;
    const firstVersion = first.versionId;
    const alphaClear = sumRasterPatchAlpha(
      illuminationPlanFromOpacity(first.buffer),
    );

    clockMs = 1_700_000_220_000;
    const refresh = await host.acquisition.refreshNow(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(refresh.ok).toBe(true);

    await vi.waitFor(() => {
      const p = host
        .attachForProductInstant(clockMs)
        .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID);
      expect(p).not.toBeNull();
      expect(p!.versionId).not.toBe(firstVersion);
      expect(sampleCloudOpacity01(p!.buffer, 0, 0)).toBeGreaterThan(0.85);
    });

    const second = host
      .attachForProductInstant(clockMs)
      .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)!;
    const alphaOpaque = sumRasterPatchAlpha(
      illuminationPlanFromOpacity(second.buffer),
    );

    expect(alphaOpaque).toBeGreaterThan(alphaClear);
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);

    // Paint / resolve still must not fetch.
    const att = host.attachForProductInstant(clockMs);
    const fetchesBeforeResolve = (fetchFn as ReturnType<typeof vi.fn>).mock
      .calls.length;
    await att.resolveSnapshot(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      fetchesBeforeResolve,
    );

    host.dispose();
  });
});
