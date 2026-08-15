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
import {
  DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
  DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE,
} from "../core/sceneIlluminationPresentationDefaults";
import { createTimeContext } from "../core/time";
import { isEquirectangularPolylinePayload } from "./equirectPolylinePayload";
import { isLunarGroundTrackPayload } from "./lunarGroundTrackPayload";
import { isLunarLocusPayload } from "./lunarLocusPayload";
import { createLayerForSceneOverlayInstance } from "./sceneOverlayLayerFactory";
import { isSolarShadingPayload } from "./solarShadingPayload";
import { isSublunarMarkerPayload } from "./sublunarMarkerPayload";

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

  it("follows the canonical time-of-day when analemma utcHour is unset", () => {
    const inst: SceneLayerInstance = {
      id: "solarAnalemma",
      family: "astronomy",
      type: "astronomyVector",
      enabled: true,
      order: 0,
      source: {
        kind: "derived",
        product: "solarAnalemmaGroundTrack",
      },
    };
    const layer = createLayerForSceneOverlayInstance(
      inst,
      { zIndex: 3, opacity: 1 },
      DEFAULT_APP_CONFIG,
    );
    const dawn = Date.UTC(2026, 11, 21, 6, 0, 0, 0);
    const noon = Date.UTC(2026, 11, 21, 12, 0, 0, 0);
    const stDawn = layer!.getState(createTimeContext(dawn, 0, true));
    const stNoon = layer!.getState(createTimeContext(noon, 0, true));
    expect(isEquirectangularPolylinePayload(stDawn.data)).toBe(true);
    expect(isEquirectangularPolylinePayload(stNoon.data)).toBe(true);
    if (!isEquirectangularPolylinePayload(stDawn.data) || !isEquirectangularPolylinePayload(stNoon.data)) {
      return;
    }
    const d = new Date(dawn);
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const i = Math.round((dayStart - yearStart) / 86400000);
    expect(stDawn.data.points[i]!.lonDeg).not.toBeCloseTo(stNoon.data.points[i]!.lonDeg, 1);
  });

  it("passes normalized scene illumination defaults into solar shading payload", () => {
    const inst: SceneLayerInstance = {
      id: "solarShading",
      family: "astronomy",
      type: "astronomyVector",
      enabled: true,
      order: 0,
      source: { kind: "derived", product: "solarDayNightShading" },
    };
    const layer = createLayerForSceneOverlayInstance(
      inst,
      { zIndex: 0, opacity: 1 },
      DEFAULT_APP_CONFIG,
    );
    expect(layer).not.toBeNull();
    const time = createTimeContext(Date.UTC(2020, 0, 1, 12, 0, 0, 0), 0, false);
    const st = layer!.getState(time);
    expect(isSolarShadingPayload(st.data)).toBe(true);
    if (isSolarShadingPayload(st.data)) {
      expect(st.data.moonlightMode).toBe(DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE);
      expect(st.data.emissiveNightLightsMode).toBe(DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE);
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

  it("builds lunar ground track from product and extent parameters", () => {
    const inst: SceneLayerInstance = {
      id: "lunarGroundTrack",
      family: "astronomy",
      type: "astronomyVector",
      enabled: true,
      order: 0,
      source: {
        kind: "derived",
        product: "sublunarGroundTrack",
        parameters: { pastHours: 6, futureHours: 12, pastColor: "#ff0000", futureColor: "#00aa00" },
      },
    };
    const layer = createLayerForSceneOverlayInstance(
      inst,
      { zIndex: 4, opacity: 0.5 },
      DEFAULT_APP_CONFIG,
    );
    expect(layer?.id).toBe("layer.lunarGroundTrack.sublunar");
    const time = createTimeContext(Date.UTC(2026, 8, 7, 16, 0, 0, 0), 0, true);
    const st = layer!.getState(time);
    expect(st.opacity).toBe(0.5);
    expect(isLunarGroundTrackPayload(st.data)).toBe(true);
    if (isLunarGroundTrackPayload(st.data)) {
      expect(st.data.pastColor).toBe("#ff0000");
      expect(st.data.futureColor).toBe("#00aa00");
    }
  });

  it("builds lunar locus from product sublunarLocus", () => {
    const inst: SceneLayerInstance = {
      id: "lunarLocus",
      family: "astronomy",
      type: "astronomyVector",
      enabled: true,
      order: 0,
      source: {
        kind: "derived",
        product: "sublunarLocus",
      },
    };
    const layer = createLayerForSceneOverlayInstance(
      inst,
      { zIndex: 4, opacity: 0.7 },
      DEFAULT_APP_CONFIG,
    );
    expect(layer?.id).toBe("layer.lunarLocus.sublunar");
    const time = createTimeContext(Date.UTC(2026, 0, 16, 22, 0, 0, 0), 0, true);
    const st = layer!.getState(time);
    expect(st.opacity).toBe(0.7);
    expect(isLunarLocusPayload(st.data)).toBe(true);
    if (isLunarLocusPayload(st.data)) {
      expect(st.data.points.length).toBeGreaterThan(50);
    }
  });

  it("passes Moon appearance and independent path styles through payloads", () => {
    const config = {
      ...DEFAULT_APP_CONFIG,
      scene: {
        ...DEFAULT_APP_CONFIG.scene,
        layers: DEFAULT_APP_CONFIG.scene.layers.map((row) => {
          if (row.id === "sublunarMarker" && row.source.kind === "derived") {
            return {
              ...row,
              source: {
                ...row.source,
                parameters: {
                  ...row.source.parameters,
                  size: "large",
                  librationStyle: "crosshair",
                  librationColor: "#abcdef",
                },
              },
            };
          }
          if (row.id === "lunarLocus" && row.source.kind === "derived") {
            return {
              ...row,
              source: {
                ...row.source,
                parameters: { strokeColor: "#112233", strokeThickness: "thick" },
              },
            };
          }
          if (row.id === "solarAnalemma" && row.source.kind === "derived") {
            return {
              ...row,
              source: {
                ...row.source,
                parameters: { utcHour: 12, strokeColor: "#fedcba", strokeThickness: "thin" },
              },
            };
          }
          return row;
        }),
      },
    };
    const moonLayer = createLayerForSceneOverlayInstance(
      config.scene.layers.find((l) => l.id === "sublunarMarker")!,
      { zIndex: 5, opacity: 1 },
      config,
    );
    const locusLayer = createLayerForSceneOverlayInstance(
      config.scene.layers.find((l) => l.id === "lunarLocus")!,
      { zIndex: 4, opacity: 1 },
      config,
    );
    const analemmaLayer = createLayerForSceneOverlayInstance(
      config.scene.layers.find((l) => l.id === "solarAnalemma")!,
      { zIndex: 3, opacity: 1 },
      config,
    );
    const time = createTimeContext(Date.UTC(2026, 0, 16, 22, 0, 0, 0), 0, true);
    const moon = moonLayer!.getState(time).data;
    const locus = locusLayer!.getState(time).data;
    const analemma = analemmaLayer!.getState(time).data;
    expect(isSublunarMarkerPayload(moon)).toBe(true);
    expect(isLunarLocusPayload(locus)).toBe(true);
    expect(isEquirectangularPolylinePayload(analemma)).toBe(true);
    if (isSublunarMarkerPayload(moon)) {
      expect(moon.appearance.size).toBe("large");
      expect(moon.appearance.librationStyle).toBe("crosshair");
      expect(moon.appearance.librationColor).toBe("#abcdef");
    }
    if (isLunarLocusPayload(locus)) {
      expect(locus.strokeColor).toBe("#112233");
      expect(locus.strokeThickness).toBe("thick");
      expect(locus.moonSize).toBe("large");
    }
    if (isEquirectangularPolylinePayload(analemma)) {
      expect(analemma.strokeColor).toBe("#fedcba");
      expect(analemma.strokeThickness).toBe("thin");
    }
  });
});
