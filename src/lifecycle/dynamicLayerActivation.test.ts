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
 * LIB-034 — live layer activation after host dispose (DEV StrictMode canvas cleanup).
 * Network is mocked; fixture fallback proves arm → store → materialize → layer.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_CONFIG, type AppConfig } from "../config/appConfig";
import { createLayerRegistryFromConfig } from "../app/bootstrap";
import { createTimeContext } from "../core/time";
import {
  createDynamicPointFeaturesOverlayLayer,
  runtimeIdForDynamicPointFeaturesSceneLayer,
} from "../layers/dynamicPointFeaturesOverlayLayer";
import { isDynamicPointFeaturesPayload } from "../layers/dynamicPointFeaturesPayload";
import { runtimeIdForDynamicEquirectSceneLayer } from "../layers/dynamicEquirectRasterOverlayLayer";
import { runtimeIdForDynamicTracksSceneLayer } from "../layers/dynamicTracksOverlayLayer";
import { buildDynamicPointFeaturesRenderPlan } from "../renderer/renderPlan/sceneDynamicPointFeaturesPlan";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  USGS_EARTHQUAKES_SOURCE_ID,
  armDynamicLifecycleConsumers,
  createDynamicDataLifecycleHost,
  reviveDisposedDynamicLifecycleHost,
  type DynamicLifecycleConsumerFlags,
  type LiveHttpFetchFn,
} from "./index";

const PRODUCT_MS = 1_700_000_800_000;

const ALL_OFF: DynamicLifecycleConsumerFlags = {
  cloudsIrOverlay: false,
  cloudParticipationOn: false,
  earthquakes: false,
  orbitalTracks: false,
};

const offlineFetch: LiveHttpFetchFn = vi.fn(async () => {
  throw new Error("offline-lib034-activation");
});

function hostDeps() {
  return {
    cloudsIrLiveFetchFn: offlineFetch,
    earthquakesLiveFetchFn: offlineFetch,
    orbitalTracksLiveFetchFn: offlineFetch,
    setIntervalFn: () => 1,
    clearIntervalFn: () => undefined,
  };
}

describe("LIB-034 dynamic layer activation after host dispose", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ensure* is a no-op on a disposed host (StrictMode canvas cleanup)", async () => {
    const host = createDynamicDataLifecycleHost(hostDeps());
    expect(host.isDisposed()).toBe(false);
    host.dispose();
    expect(host.isDisposed()).toBe(true);

    armDynamicLifecycleConsumers(host, { ...ALL_OFF, earthquakes: true });
    expect(offlineFetch).not.toHaveBeenCalled();
    expect(
      host
        .attachForProductInstant(PRODUCT_MS)
        .getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
    ).toBeNull();
  });

  it("revive + arm after dispose materializes without a later config change", async () => {
    let host = createDynamicDataLifecycleHost(hostDeps());
    host.dispose();

    host = reviveDisposedDynamicLifecycleHost(host, hostDeps());
    expect(host.isDisposed()).toBe(false);
    armDynamicLifecycleConsumers(host, { ...ALL_OFF, earthquakes: true });

    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(PRODUCT_MS)
          .getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });

    expect(offlineFetch).toHaveBeenCalled();
    const att = host.attachForProductInstant(PRODUCT_MS);
    const view = att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID);
    expect(view).not.toBeNull();
    expect(view!.features.length).toBeGreaterThan(0);

    const layer = createDynamicPointFeaturesOverlayLayer({
      sceneLayerId: "earthquakes",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(PRODUCT_MS, 0, false, {
        dynamicDataLifecycle: att,
      }),
    );
    expect(state.visible).toBe(true);
    expect(isDynamicPointFeaturesPayload(state.data)).toBe(true);
    if (!isDynamicPointFeaturesPayload(state.data)) return;
    const plan = buildDynamicPointFeaturesRenderPlan({
      viewportWidthPx: 800,
      viewportHeightPx: 400,
      layerOpacity: 1,
      payload: state.data,
    });
    expect(plan.items.filter((i) => i.kind === "path2d").length).toBeGreaterThan(
      0,
    );

    host.dispose();
  });

  it("revive + arm all three: clouds/quakes materialize via fixture; ISS stays unavailable without a live TLE", async () => {
    let host = createDynamicDataLifecycleHost(hostDeps());
    host.dispose();
    host = reviveDisposedDynamicLifecycleHost(host, hostDeps());
    armDynamicLifecycleConsumers(host, {
      cloudsIrOverlay: true,
      cloudParticipationOn: false,
      earthquakes: true,
      orbitalTracks: true,
    });

    await vi.waitFor(() => {
      const att = host.attachForProductInstant(PRODUCT_MS);
      expect(
        att.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
      expect(
        att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });

    const att = host.attachForProductInstant(PRODUCT_MS);
    expect(
      att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID)!.features.length,
    ).toBeGreaterThan(0);
    expect(att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID)).toBeNull();
    host.dispose();
  });

  it("factory-off flags arm no consumers", () => {
    const host = createDynamicDataLifecycleHost(hostDeps());
    armDynamicLifecycleConsumers(host, ALL_OFF);
    expect(offlineFetch).not.toHaveBeenCalled();
    expect(host.acquisition.isPeriodicActive(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBe(
      false,
    );
    expect(host.acquisition.isPeriodicActive(USGS_EARTHQUAKES_SOURCE_ID)).toBe(
      false,
    );
    expect(host.acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(
      false,
    );
    host.dispose();
  });

  it("enabling one flag arms only that consumer; cloud participation arms clouds", () => {
    const host = createDynamicDataLifecycleHost(hostDeps());
    armDynamicLifecycleConsumers(host, { ...ALL_OFF, earthquakes: true });
    expect(host.acquisition.isPeriodicActive(USGS_EARTHQUAKES_SOURCE_ID)).toBe(
      true,
    );
    expect(host.acquisition.isPeriodicActive(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBe(
      false,
    );
    expect(host.acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(
      false,
    );

    armDynamicLifecycleConsumers(host, {
      ...ALL_OFF,
      earthquakes: true,
      cloudParticipationOn: true,
    });
    expect(host.acquisition.isPeriodicActive(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBe(
      true,
    );
    expect(host.acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(
      false,
    );

    armDynamicLifecycleConsumers(host, ALL_OFF);
    expect(host.acquisition.isPeriodicActive(USGS_EARTHQUAKES_SOURCE_ID)).toBe(
      false,
    );
    expect(host.acquisition.isPeriodicActive(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBe(
      false,
    );
    host.dispose();
  });

  it("disabling a layer drops it from the registry so primitives are not emitted", () => {
    const enabled: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      layers: { ...DEFAULT_APP_CONFIG.layers, earthquakes: true },
      scene: {
        ...DEFAULT_APP_CONFIG.scene,
        layers: DEFAULT_APP_CONFIG.scene.layers.map((row) =>
          row.id === "earthquakes" ? { ...row, enabled: true } : row,
        ),
      },
    };
    const disabled: AppConfig = {
      ...enabled,
      layers: { ...enabled.layers, earthquakes: false },
      scene: {
        ...enabled.scene,
        layers: enabled.scene.layers.map((row) =>
          row.id === "earthquakes" ? { ...row, enabled: false } : row,
        ),
      },
    };
    const quakeId = runtimeIdForDynamicPointFeaturesSceneLayer("earthquakes");
    expect(
      createLayerRegistryFromConfig(enabled)
        .getLayers()
        .some((l) => l.id === quakeId),
    ).toBe(true);
    expect(
      createLayerRegistryFromConfig(disabled)
        .getLayers()
        .some((l) => l.id === quakeId),
    ).toBe(false);
  });

  it("registry includes each dynamic overlay only when its master is on", () => {
    const cloudsId = runtimeIdForDynamicEquirectSceneLayer("globalCloudsIr");
    const tracksId = runtimeIdForDynamicTracksSceneLayer("orbitalTracks");
    const off = createLayerRegistryFromConfig(DEFAULT_APP_CONFIG);
    expect(off.getLayers().some((l) => l.id === cloudsId)).toBe(false);
    expect(off.getLayers().some((l) => l.id === tracksId)).toBe(false);

    const on: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      layers: {
        ...DEFAULT_APP_CONFIG.layers,
        globalCloudsIr: true,
        orbitalTracks: true,
      },
      scene: {
        ...DEFAULT_APP_CONFIG.scene,
        layers: DEFAULT_APP_CONFIG.scene.layers.map((row) =>
          row.id === "globalCloudsIr" || row.id === "orbitalTracks"
            ? { ...row, enabled: true }
            : row,
        ),
      },
    };
    const ids = createLayerRegistryFromConfig(on)
      .getLayers()
      .map((l) => l.id);
    expect(ids).toContain(cloudsId);
    expect(ids).toContain(tracksId);
  });
});
