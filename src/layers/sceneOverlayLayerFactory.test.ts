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

import { describe, expect, it } from "vitest";
import { DEFAULT_APP_CONFIG } from "../config/appConfig";
import type { SceneLayerInstance } from "../config/v2/sceneConfig";
import { createTimeContext } from "../core/time";
import { isEquirectangularPolylinePayload } from "./equirectPolylinePayload";
import { createLayerForSceneOverlayInstance } from "./sceneOverlayLayerFactory";

describe("createLayerForSceneOverlayInstance (source-driven)", () => {
  it("builds solar analemma from product and parameters, not from row id", () => {
    const inst: SceneLayerInstance = {
      id: "solarAnalemma",
      family: "astronomy",
      type: "astronomyVector",
      enabled: true,
      order: 0,
      source: {
        kind: "derived",
        product: "solarAnalemmaGroundTrack",
        parameters: { utcHour: 6 },
      },
    };
    const layer = createLayerForSceneOverlayInstance(
      inst,
      { zIndex: 3, opacity: 0.4 },
      DEFAULT_APP_CONFIG,
    );
    expect(layer?.id).toBe("layer.solarAnalemma.groundTrack");
    const time = createTimeContext(Date.UTC(2020, 0, 1, 0, 0, 0, 0), 0, false);
    const st = layer!.getState(time);
    expect(st.opacity).toBe(0.4);
    expect(isEquirectangularPolylinePayload(st.data)).toBe(true);
    if (isEquirectangularPolylinePayload(st.data)) {
      expect(st.data.closed).toBe(true);
      expect(st.data.points.length).toBe(366);
    }
  });

  it("returns null for unknown derived product", () => {
    const inst: SceneLayerInstance = {
      id: "solarAnalemma",
      family: "astronomy",
      type: "astronomyVector",
      enabled: true,
      order: 0,
      source: { kind: "derived", product: "noSuchProduct" },
    };
    expect(
      createLayerForSceneOverlayInstance(inst, { zIndex: 1, opacity: 1 }, DEFAULT_APP_CONFIG),
    ).toBeNull();
  });
});
