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
 * LIB-035 — current-only live-time integrity: presentation suppression,
 * no fixture substitute, polling stop/re-arm, cloud participation.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { LIVE_PRODUCT_TIME_TOLERANCE_MS } from "../core/liveProductTimePolicy";
import { createSolarShadingLayer } from "../layers/solarShadingLayer";
import { isSolarShadingPayload } from "../layers/solarShadingPayload";
import { createDynamicPointFeaturesOverlayLayer } from "../layers/dynamicPointFeaturesOverlayLayer";
import { createDynamicEquirectRasterOverlayLayer } from "../layers/dynamicEquirectRasterOverlayLayer";
import { createDynamicTracksOverlayLayer } from "../layers/dynamicTracksOverlayLayer";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  USGS_EARTHQUAKES_SOURCE_ID,
  armDynamicLifecycleConsumers,
  createDynamicDataLifecycleHost,
  type DynamicLifecycleConsumerFlags,
  type LiveHttpFetchFn,
} from "./index";
import { usgsLiveOkFetch } from "./earthquakesLiveTestSupport";
import {
  encodeCloudsTestPng,
  mockCloudsLiveFetch,
} from "./cloudsAcquisition.testSupport";

const WALL_MS = 1_724_000_000_000;
const HISTORICAL_MS = Date.UTC(2017, 7, 21, 18, 25, 30);

const ALL_ON: DynamicLifecycleConsumerFlags = {
  cloudsIrOverlay: true,
  cloudParticipationOn: true,
  earthquakes: true,
  orbitalTracks: true,
  productTimeLiveEnough: true,
};

const offlineFetch: LiveHttpFetchFn = vi.fn(async () => {
  throw new Error("offline-lib035-live-time");
});

function hostDeps() {
  return {
    cloudsIrLiveFetchFn: mockCloudsLiveFetch({ png: encodeCloudsTestPng() }),
    earthquakesLiveFetchFn: usgsLiveOkFetch(WALL_MS),
    orbitalTracksLiveFetchFn: offlineFetch,
    nowMs: () => WALL_MS,
    setIntervalFn: () => 1,
    clearIntervalFn: () => undefined,
  };
}

describe("LIB-035 current-only live-time integrity", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("presents current-only clouds and earthquakes when product time is live-enough; ISS stays hidden without a live TLE", async () => {
    const host = createDynamicDataLifecycleHost(hostDeps());
    armDynamicLifecycleConsumers(host, ALL_ON);

    await vi.waitFor(() => {
      const att = host.attachForProductInstant(WALL_MS, {
        wallClockUtcMs: WALL_MS,
      });
      expect(att.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID)).not.toBeNull();
      expect(att.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBeNull();
      expect(att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID)).not.toBeNull();
    });
    expect(
      host
        .attachForProductInstant(WALL_MS, { wallClockUtcMs: WALL_MS })
        .getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID),
    ).toBeNull();

    host.dispose();
  });

  it("hides current-only prepared views (including cloud opacity) at historical product time", async () => {
    const host = createDynamicDataLifecycleHost(hostDeps());
    armDynamicLifecycleConsumers(host, ALL_ON);

    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(WALL_MS)
          .getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });

    const live = host.attachForProductInstant(WALL_MS, { wallClockUtcMs: WALL_MS });
    const historical = host.attachForProductInstant(HISTORICAL_MS, {
      wallClockUtcMs: WALL_MS,
    });

    expect(live.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID)).not.toBeNull();
    expect(live.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBeNull();
    expect(historical.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBeNull();
    expect(historical.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBeNull();
    expect(historical.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID)).toBeNull();
    expect(historical.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID)).toBeNull();

    const storeSnap = await historical.resolveSnapshot(USGS_EARTHQUAKES_SOURCE_ID);
    expect(storeSnap.status).toBe("ok");
    expect(storeSnap.snapshot).not.toBeNull();

    host.dispose();
  });

  it("suppresses at ±5:01 and allows ±4:59 with injectable wall clock", async () => {
    const host = createDynamicDataLifecycleHost(hostDeps());
    armDynamicLifecycleConsumers(host, ALL_ON);
    await vi.waitFor(() => {
      expect(
        host.attachForProductInstant(WALL_MS).getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });

    const inside = WALL_MS + LIVE_PRODUCT_TIME_TOLERANCE_MS - 1_000;
    const outside = WALL_MS + LIVE_PRODUCT_TIME_TOLERANCE_MS + 1_000;
    expect(
      host
        .attachForProductInstant(inside, { wallClockUtcMs: WALL_MS })
        .getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
    ).not.toBeNull();
    expect(
      host
        .attachForProductInstant(outside, { wallClockUtcMs: WALL_MS })
        .getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
    ).toBeNull();

    host.dispose();
  });

  it("layers contribute nothing when suppressed; fixture is not painted", async () => {
    const host = createDynamicDataLifecycleHost(hostDeps());
    armDynamicLifecycleConsumers(host, ALL_ON);
    await vi.waitFor(() => {
      expect(
        host.attachForProductInstant(WALL_MS).getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });

    const att = host.attachForProductInstant(HISTORICAL_MS, {
      wallClockUtcMs: WALL_MS,
    });
    const time = createTimeContext(HISTORICAL_MS, 0, true, {
      dynamicDataLifecycle: att,
    });

    const quakes = createDynamicPointFeaturesOverlayLayer({
      sceneLayerId: "earthquakes",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
    }).getState(time);
    expect(quakes.visible).toBe(false);
    expect(quakes.data).toBeNull();

    const clouds = createDynamicEquirectRasterOverlayLayer({
      sceneLayerId: "globalCloudsIr",
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
    }).getState(time);
    expect(clouds.visible).toBe(false);
    expect(clouds.data).toBeNull();

    const iss = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    }).getState(time);
    expect(iss.visible).toBe(false);
    expect(iss.data).toBeNull();

    const shading = createSolarShadingLayer({
      cloudParticipationMode: "natural",
      cloudParticipationSourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      cloudParticipationIntensity: 1,
      emissiveNightLightsMode: "off",
      moonlightMode: "off",
    }).getState(time);
    expect(isSolarShadingPayload(shading.data)).toBe(true);
    if (isSolarShadingPayload(shading.data)) {
      expect(shading.data.cloudOpacityRaster).toBeNull();
    }

    host.dispose();
  });

  it("stops polling while suppressed and re-arms when live-enough returns", () => {
    const host = createDynamicDataLifecycleHost(hostDeps());
    armDynamicLifecycleConsumers(host, ALL_ON);
    expect(host.acquisition.isPeriodicActive(USGS_EARTHQUAKES_SOURCE_ID)).toBe(true);
    expect(host.acquisition.isPeriodicActive(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBe(true);
    expect(host.acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(true);

    armDynamicLifecycleConsumers(host, {
      ...ALL_ON,
      productTimeLiveEnough: false,
    });
    expect(host.acquisition.isPeriodicActive(USGS_EARTHQUAKES_SOURCE_ID)).toBe(false);
    expect(host.acquisition.isPeriodicActive(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBe(false);
    expect(host.acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(false);

    armDynamicLifecycleConsumers(host, ALL_ON);
    expect(host.acquisition.isPeriodicActive(USGS_EARTHQUAKES_SOURCE_ID)).toBe(true);
    expect(host.acquisition.isPeriodicActive(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBe(true);
    expect(host.acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(true);

    host.dispose();
  });
});
