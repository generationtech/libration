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
 * DLU-6 — Clouds v1 does not feed physical illumination.
 * Legacy cloud-participation config still loads; the scene factory forces mode off.
 */

import { describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_CONFIG } from "../config/appConfig";
import { createLayerForSceneOverlayInstance } from "../layers/sceneOverlayLayerFactory";
import { isSolarShadingPayload } from "../layers/solarShadingPayload";
import { createTimeContext } from "../core/time";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  createDynamicDataLifecycleHost,
} from "./index";
import {
  CLOUDS_EUMET_TEST_OBSERVATION_MS,
  encodeCloudsTestPng,
  mockCloudsLiveFetch,
} from "./cloudsAcquisition.testSupport";

describe("DLU-6 Clouds illumination participation is non-operative", () => {
  it("scene factory forces cloudParticipationMode off even when stored config is natural", () => {
    const scene = {
      ...DEFAULT_APP_CONFIG.scene,
      illumination: {
        ...DEFAULT_APP_CONFIG.scene.illumination,
        cloudParticipation: {
          ...DEFAULT_APP_CONFIG.scene.illumination.cloudParticipation,
          mode: "natural" as const,
          sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
        },
      },
    };
    const solarRow = scene.layers.find((l) => l.source.kind === "derived" && l.source.product === "solarDayNightShading");
    expect(solarRow).toBeDefined();
    const layer = createLayerForSceneOverlayInstance(
      solarRow!,
      { zIndex: 1, opacity: 1 },
      { ...DEFAULT_APP_CONFIG, scene },
    );
    expect(layer).not.toBeNull();
    const state = layer!.getState(createTimeContext(Date.now(), 0, false));
    expect(isSolarShadingPayload(state.data)).toBe(true);
    if (isSolarShadingPayload(state.data)) {
      expect(state.data.cloudParticipationMode).toBe("off");
      expect(state.data.cloudOpacityRaster).toBeNull();
    }
  });

  it("live Clouds PNG does not populate the cloud-opacity materializer", async () => {
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: mockCloudsLiveFetch({ png: encodeCloudsTestPng() }),
      nowMs: () => CLOUDS_EUMET_TEST_OBSERVATION_MS + 3_600_000,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureGlobalCloudsIrConsumer({ intervalMs: 60_000, runImmediately: true });
    const productMs = CLOUDS_EUMET_TEST_OBSERVATION_MS + 3_600_000;
    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(productMs)
          .getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });
    expect(
      host.attachForProductInstant(productMs).getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID),
    ).toBeNull();
    host.dispose();
  });
});
