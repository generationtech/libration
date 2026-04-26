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
import {
  buildSolarShadingIlluminationRenderPlan,
  SOLAR_SHADING_PLAN_DOWNSAMPLE,
} from "./sceneSolarShadingIlluminationPlan";

describe("buildSolarShadingIlluminationRenderPlan", () => {
  it("emits no items when the viewport has non-positive size", () => {
    expect(buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 0,
      viewportHeightPx: 100,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 0.5,
      layerOpacity: 1,
    }).items).toEqual([]);

    expect(buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 100,
      viewportHeightPx: -1,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 0.5,
      layerOpacity: 1,
    }).items).toEqual([]);
  });

  it("emits a single rasterPatch covering the viewport with downsampled RGBA buffer", () => {
    const plan = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 100,
      viewportHeightPx: 80,
      subsolarLatDeg: 10,
      subsolarLonDeg: -20,
      sublunarLatDeg: -4,
      sublunarLonDeg: 48,
      lunarIlluminatedFraction: 0.72,
      layerOpacity: 0.75,
    });

    expect(plan.items).toHaveLength(1);
    const item = plan.items[0];
    expect(item.kind).toBe("rasterPatch");
    if (item.kind !== "rasterPatch") {
      return;
    }

    const sw = Math.ceil(100 / SOLAR_SHADING_PLAN_DOWNSAMPLE);
    const sh = Math.ceil(80 / SOLAR_SHADING_PLAN_DOWNSAMPLE);
    expect(item.widthPx).toBe(sw);
    expect(item.heightPx).toBe(sh);
    expect(item.rgba.length).toBe(sw * sh * 4);
    expect(item.x).toBe(0);
    expect(item.y).toBe(0);
    expect(item.destWidth).toBe(100);
    expect(item.destHeight).toBe(80);
  });

  it("zeros alpha across the patch when layer opacity is 0", () => {
    const plan = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 32,
      viewportHeightPx: 32,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 1,
      layerOpacity: 0,
    });
    const item = plan.items[0];
    expect(item?.kind).toBe("rasterPatch");
    if (!item || item.kind !== "rasterPatch") {
      return;
    }
    for (let i = 3; i < item.rgba.length; i += 4) {
      expect(item.rgba[i]).toBe(0);
    }
  });

  it("leaves the subsolar disk region transparent on the day side (center column near subsolar)", () => {
    const plan = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 64,
      viewportHeightPx: 64,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 1,
      layerOpacity: 1,
    });
    const item = plan.items[0];
    expect(item?.kind).toBe("rasterPatch");
    if (!item || item.kind !== "rasterPatch") {
      return;
    }
    const sw = item.widthPx;
    const sh = item.heightPx;
    const midI = Math.floor(sw / 2);
    const midJ = Math.floor(sh / 2);
    const p = (midJ * sw + midI) * 4 + 3;
    expect(item.rgba[p]).toBe(0);
  });
});
