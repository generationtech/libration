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
import { applyCloudHighlightTransfer } from "./cloudHighlightTransfer";
import {
  cloudsConfigStatusHintCopy,
  resolveCloudsProvenance,
} from "./cloudProvenance";
import {
  buildCloudsEumetWmsGetMapUrl,
  CLOUDS_EUMET_LAYER_ID,
  formatCloudsEumetWmsTime,
} from "./cloudsEumetWms";
import { sampleEquirectRgbaAlpha, validateCloudsPngBytes } from "./cloudsPng";
import { wmsUrlHasExplicitTime } from "./cloudsGibsWms";
import {
  CLOUDS_EUMET_TEST_OBSERVATION_MS,
  CLOUDS_TEST_OBSERVATION_MS,
  encodeCloudsGlobalTestPng,
  encodeCloudsTestPng,
  mockCloudsLiveFetch,
} from "./cloudsAcquisition.testSupport";
import {
  CLOUDS_PROVIDER_COMPOSITE,
  CLOUDS_PROVIDER_EUMET,
  CLOUDS_PROVIDER_GIBS,
} from "./cloudsSectors";
import {
  createGlobalCloudsIrLiveHttpAcquisitionAdapter,
  produceGlobalCloudsIrFixtureAcquisition,
  produceGlobalCloudsIrLiveAcquisitionFromFetched,
} from "./globalCloudsIrAcquisition";
import { GLOBAL_CLOUDS_IR_SOURCE_ID } from "./dynamicEquirectSourceCatalog";
import { decodeCloudsPngRgba } from "./cloudsPng";
import { createTimeContext } from "../core/time";
import { createSolarShadingLayer } from "../layers/solarShadingLayer";
import { isSolarShadingPayload } from "../layers/solarShadingPayload";
import { createDynamicDataLifecycleHost } from "./dynamicDataLifecycleHost";

describe("WEATHER-2 EUMET request, selection, coverage", () => {
  it("EUMET GetMap uses explicit TIME, PNG, full-world bbox, layer id, CRS", () => {
    const url = buildCloudsEumetWmsGetMapUrl(CLOUDS_EUMET_TEST_OBSERVATION_MS);
    expect(wmsUrlHasExplicitTime(url)).toBe(true);
    expect(url).toContain("view.eumetsat.int");
    expect(url).toContain(encodeURIComponent(CLOUDS_EUMET_LAYER_ID));
    expect(url).toContain("VERSION=1.3.0");
    expect(url).toContain("CRS=EPSG%3A4326");
    expect(url).toContain("BBOX=-90%2C-180%2C90%2C180");
    expect(url).toContain("WIDTH=2048");
    expect(url).toContain("HEIGHT=1024");
    expect(url).toContain("FORMAT=image%2Fpng");
    expect(url).toContain("TRANSPARENT=TRUE");
    expect(formatCloudsEumetWmsTime(Date.parse("2026-08-21T22:44:00Z"))).toBe(
      "2026-08-21T21:00:00Z",
    );
    expect(() => buildCloudsEumetWmsGetMapUrl(Number.NaN)).toThrow(/TIME/i);
  });

  it("live adapter stamps validTimeMs from EUMET observation TIME", async () => {
    const fetchFn = vi.fn(
      mockCloudsLiveFetch({ png: encodeCloudsTestPng(), eumetPng: encodeCloudsGlobalTestPng() }),
    );
    const acquired = CLOUDS_EUMET_TEST_OBSERVATION_MS + 2 * 3_600_000;
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => acquired,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.validTimeMs).toBe(CLOUDS_TEST_OBSERVATION_MS);
    expect(result.entry.record.meta.acquiredAtMs).toBe(acquired);
    expect(result.entry.record.meta.validTimeMs).not.toBe(acquired);
    expect(result.entry.record.meta.attribution).toContain("EUMETSAT");
    if (result.entry.record.body.kind === "equirectRaster") {
      expect(result.entry.record.body.coverageKind).toBe("global");
      expect(result.entry.record.body.cloudProviderKind).toBe(CLOUDS_PROVIDER_COMPOSITE);
    }
    const urls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("gibs.earthdata.nasa.gov") && u.includes("GetMap"))).toBe(
      true,
    );
    expect(urls.some((u) => u.includes("worldcloudmap") && u.includes("GetMap"))).toBe(true);
  });

  it("falls back to GIBS when EUMET is unavailable and does not fetch fixture", async () => {
    const png = encodeCloudsTestPng();
    const fetchFn = vi.fn(mockCloudsLiveFetch({ png, failEumet: true }));
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 3_600_000,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.origin).toBe("live");
    if (result.entry.record.body.kind === "equirectRaster") {
      expect(result.entry.record.body.coverageKind).toBe("partial");
      expect(result.entry.record.body.cloudProviderKind).toBe(CLOUDS_PROVIDER_COMPOSITE);
    }
    expect(result.entry.record.meta.validTimeMs).toBe(CLOUDS_TEST_OBSERVATION_MS);
    const urls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("gibs.earthdata.nasa.gov") && u.includes("GetMap"))).toBe(
      true,
    );
  });

  it("both providers failing does not fixture-as-live", async () => {
    const fetchFn = vi.fn(
      mockCloudsLiveFetch({
        png: encodeCloudsTestPng(),
        failEumet: true,
        failGibs: true,
      }),
    );
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(false);
  });

  it("Africa/Europe is nontransparent on global fixture; GIBS-shaped hole is rejected as EUMET", () => {
    const global = produceGlobalCloudsIrFixtureAcquisition({
      nowMs: () => CLOUDS_EUMET_TEST_OBSERVATION_MS,
      observationTimeMs: CLOUDS_EUMET_TEST_OBSERVATION_MS,
    });
    expect(global.ok).toBe(true);
    if (!global.ok) return;
    const decoded = decodeCloudsPngRgba(global.entry.payloadBytes!);
    expect(decoded).not.toBeNull();
    expect(
      sampleEquirectRgbaAlpha(decoded!.rgba, decoded!.width, decoded!.height, 20, 0),
    ).toBeGreaterThan(0);
    expect(
      sampleEquirectRgbaAlpha(decoded!.rgba, decoded!.width, decoded!.height, 10, 50),
    ).toBeGreaterThan(0);
    expect(
      sampleEquirectRgbaAlpha(decoded!.rgba, decoded!.width, decoded!.height, 0, 85),
    ).toBe(0);

    const gibsShaped = encodeCloudsTestPng({ opaqueRatio: 0.4, fillAfricaEurope: false });
    const eumetReject = produceGlobalCloudsIrLiveAcquisitionFromFetched(
      {
        ok: true,
        bytes: gibsShaped,
        contentType: "image/png",
        responseUrl: "https://view.eumetsat.int/geoserver/wms",
        status: 200,
      },
      {
        nowMs: () => CLOUDS_EUMET_TEST_OBSERVATION_MS,
        observationTimeMs: CLOUDS_EUMET_TEST_OBSERVATION_MS,
        providerKind: CLOUDS_PROVIDER_EUMET,
      },
    );
    expect(eumetReject.ok).toBe(false);
  });

  it("GIBS fallback remains partial and does not require Africa coverage", () => {
    const png = encodeCloudsTestPng({ opaqueRatio: 0.4 });
    const result = produceGlobalCloudsIrLiveAcquisitionFromFetched(
      {
        ok: true,
        bytes: png,
        contentType: "image/png",
        responseUrl: "https://gibs.earthdata.nasa.gov/wms",
        status: 200,
      },
      {
        nowMs: () => CLOUDS_TEST_OBSERVATION_MS,
        observationTimeMs: CLOUDS_TEST_OBSERVATION_MS,
        providerKind: CLOUDS_PROVIDER_GIBS,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.entry.record.body.kind === "equirectRaster") {
      expect(result.entry.record.body.coverageKind).toBe("partial");
    }
  });

  it("status copy is honest about global mosaic vs partial fallback", () => {
    const global = resolveCloudsProvenance({
      originStamp: "live",
      acquiredAtMs: 2,
      validTimeMs: 1,
      productUtcMs: 1 + 2 * 3_600_000,
      lifecycleState: "ready",
      versionId: "e",
      coverageKind: "global",
      providerKind: CLOUDS_PROVIDER_EUMET,
    });
    expect(cloudsConfigStatusHintCopy("recent", global)).toMatch(/observations/);
    expect(cloudsConfigStatusHintCopy("recent", global)).not.toMatch(/Africa/);
    const partial = resolveCloudsProvenance({
      originStamp: "live",
      acquiredAtMs: 2,
      validTimeMs: 1,
      productUtcMs: 1 + 40 * 60_000,
      lifecycleState: "ready",
      versionId: "g",
      coverageKind: "partial",
      providerKind: CLOUDS_PROVIDER_GIBS,
    });
    expect(cloudsConfigStatusHintCopy("recent", partial)).toMatch(/partial coverage/);
  });

  it("EUMET luma lift does not paint provider-alpha-0 as cloud", () => {
    const rgba = new Uint8Array([200, 200, 200, 0, 70, 70, 70, 255]);
    const out = applyCloudHighlightTransfer(rgba, {
      interpretation: "eumetRingIr108Gray",
    });
    expect(out[3]).toBe(0);
    expect(out[7]).toBe(0);
  });

  it("no synthetic fill helper exists in PNG validation", () => {
    expect(validateCloudsPngBytes(encodeCloudsTestPng({ opaqueRatio: 0 })).ok).toBe(false);
  });

  it("Clouds ON with either provider does not feed physical illumination", async () => {
    const eumetHost = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: mockCloudsLiveFetch({ png: encodeCloudsTestPng() }),
      nowMs: () => CLOUDS_EUMET_TEST_OBSERVATION_MS + 3_600_000,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    eumetHost.ensureGlobalCloudsIrConsumer({ intervalMs: 60_000, runImmediately: true });
    await vi.waitFor(() => {
      expect(
        eumetHost
          .attachForProductInstant(CLOUDS_EUMET_TEST_OBSERVATION_MS + 3_600_000)
          .getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });
    expect(
      eumetHost
        .attachForProductInstant(CLOUDS_EUMET_TEST_OBSERVATION_MS + 3_600_000)
        .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID),
    ).toBeNull();

    const gibsHost = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: mockCloudsLiveFetch({
        png: encodeCloudsTestPng(),
        failEumet: true,
      }),
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 3_600_000,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    gibsHost.ensureGlobalCloudsIrConsumer({ intervalMs: 60_000, runImmediately: true });
    await vi.waitFor(() => {
      expect(
        gibsHost
          .attachForProductInstant(CLOUDS_TEST_OBSERVATION_MS + 3_600_000)
          .getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });
    expect(
      gibsHost
        .attachForProductInstant(CLOUDS_TEST_OBSERVATION_MS + 3_600_000)
        .getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID),
    ).toBeNull();

    const layer = createSolarShadingLayer({
      cloudParticipationMode: "natural",
      cloudParticipationSourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      cloudParticipationIntensity: 1,
      emissiveNightLightsMode: "off",
      moonlightMode: "off",
    });
    const offState = layer.getState(createTimeContext(Date.now(), 0, false));
    const eumetAtt = eumetHost.attachForProductInstant(
      CLOUDS_EUMET_TEST_OBSERVATION_MS + 3_600_000,
    );
    const onState = layer.getState(
      createTimeContext(CLOUDS_EUMET_TEST_OBSERVATION_MS + 3_600_000, 0, false, {
        dynamicDataLifecycle: eumetAtt,
      }),
    );
    expect(isSolarShadingPayload(offState.data)).toBe(true);
    expect(isSolarShadingPayload(onState.data)).toBe(true);
    if (isSolarShadingPayload(offState.data) && isSolarShadingPayload(onState.data)) {
      expect(offState.data.cloudOpacityRaster).toBeNull();
      expect(onState.data.cloudOpacityRaster).toBeNull();
    }
    eumetHost.dispose();
    gibsHost.dispose();
  });
});
