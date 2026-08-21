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

import { afterEach, describe, expect, it } from "vitest";
import { defaultLibrationConfigV2, normalizeLibrationConfig } from "../config/v2/librationConfig";
import { getLunarEclipseEventById } from "../core/eclipse/eclipseAuthority";
import { lunarEclipseVisibilityFootprint } from "../core/eclipse/lunarEclipseVisibilityFootprint";
import {
  NIGHT_VEIL_TRANSFER_IDS,
  setDevNightVeilTransferOverride,
} from "../core/nightVeilFromSolarAltitude";
import { getMoonlightPolicy } from "../core/moonlightPolicy";
import { sampleIlluminationRgba8 } from "./illuminationShading";
import {
  buildSolarShadingIlluminationRenderPlan,
} from "./renderPlan/sceneSolarShadingIlluminationPlan";

afterEach(() => {
  setDevNightVeilTransferOverride(null);
});

function dotFromAltitudeDeg(altitudeDeg: number): number {
  return Math.sin((altitudeDeg * Math.PI) / 180);
}

function rasterBytes(transferId: (typeof NIGHT_VEIL_TRANSFER_IDS)[number]): Uint8ClampedArray {
  setDevNightVeilTransferOverride(transferId);
  const plan = buildSolarShadingIlluminationRenderPlan({
    viewportWidthPx: 64,
    viewportHeightPx: 32,
    subsolarLatDeg: 0,
    subsolarLonDeg: 0,
    sublunarLatDeg: 10,
    sublunarLonDeg: 40,
    lunarIlluminatedFraction: 0.7,
    layerOpacity: 1,
    moonlightPolicy: getMoonlightPolicy("illustrative"),
  });
  const item = plan.items[0];
  if (!item || item.kind !== "rasterPatch") {
    throw new Error("expected rasterPatch");
  }
  return item.rgba;
}

describe("LIB-056 night-veil presentation regressions", () => {
  it("keeps lunar eclipse footprint geometry independent of the solar transfer", () => {
    const event = getLunarEclipseEventById("nasa-5mcle-lunar-9700")!;
    const hashes = NIGHT_VEIL_TRANSFER_IDS.map((id) => {
      setDevNightVeilTransferOverride(id);
      return lunarEclipseVisibilityFootprint(event).geometryHash;
    });
    expect(new Set(hashes).size).toBe(1);
    expect(hashes[0]).toMatch(/^[0-9a-f]{8}$/);
  });

  it("emits one stable rasterPatch per transfer and changes bytes when the transfer changes", () => {
    const currentA = rasterBytes("smootherstep");
    const currentB = rasterBytes("smootherstep");
    expect(Buffer.from(currentA).equals(Buffer.from(currentB))).toBe(true);
    const linear = rasterBytes("linearSmooth");
    expect(Buffer.from(currentA).equals(Buffer.from(linear))).toBe(false);
    expect(currentA.length).toBe(linear.length);
  });

  it("keeps near-new-Moon night samples equivalent to solar-only shading for every candidate", () => {
    const night = dotFromAltitudeDeg(-30);
    const moonHigh = dotFromAltitudeDeg(65);
    for (const id of NIGHT_VEIL_TRANSFER_IDS) {
      setDevNightVeilTransferOverride(id);
      const solarOnly = sampleIlluminationRgba8(night, 1);
      const newMoon = sampleIlluminationRgba8(night, 1, {
        lunarDot: moonHigh,
        lunarIlluminatedFraction: 0.01,
      });
      expect(Math.abs(newMoon.a - solarOnly.a)).toBeLessThanOrEqual(2);
    }
  });

  it("still attenuates moonlight by lunar-eclipse transmission for every candidate", () => {
    const night = dotFromAltitudeDeg(-30);
    const moonHigh = dotFromAltitudeDeg(65);
    for (const id of NIGHT_VEIL_TRANSFER_IDS) {
      setDevNightVeilTransferOverride(id);
      const full = sampleIlluminationRgba8(night, 1, {
        lunarDot: moonHigh,
        lunarIlluminatedFraction: 1,
      });
      const eclipsed = sampleIlluminationRgba8(night, 1, {
        lunarDot: moonHigh,
        lunarIlluminatedFraction: 1,
        moonlightTransmission01: 0.05,
      });
      const none = sampleIlluminationRgba8(night, 1);
      expect(full.a).toBeLessThan(none.a);
      expect(eclipsed.a).toBeGreaterThan(full.a);
      expect(eclipsed.a).toBeLessThanOrEqual(none.a);
    }
  });

  it("does not darken settled night when solar-eclipse daylight transmission is below 1", () => {
    const night = dotFromAltitudeDeg(-40);
    for (const id of NIGHT_VEIL_TRANSFER_IDS) {
      setDevNightVeilTransferOverride(id);
      const ordinary = sampleIlluminationRgba8(night, 1);
      const eclipsed = sampleIlluminationRgba8(
        night,
        1,
        undefined,
        undefined,
        undefined,
        undefined,
        0.3,
      );
      expect(eclipsed).toEqual(ordinary);
    }
  });

  it("does not apply moonlight in daylight for every candidate", () => {
    const day = dotFromAltitudeDeg(12);
    for (const id of NIGHT_VEIL_TRANSFER_IDS) {
      setDevNightVeilTransferOverride(id);
      const rgba = sampleIlluminationRgba8(day, 1, {
        lunarDot: dotFromAltitudeDeg(60),
        lunarIlluminatedFraction: 1,
      });
      expect(rgba.a).toBe(0);
    }
  });

  it("does not persist experimental curve mathematics on SceneConfig illumination", () => {
    const cfg = defaultLibrationConfigV2();
    const scene = cfg.scene;
    if (!scene) {
      throw new Error("expected default scene");
    }
    expect(scene.illumination).not.toHaveProperty("nightVeilCurve");
    const sneaky = normalizeLibrationConfig({
      ...cfg,
      scene: {
        ...scene,
        illumination: {
          ...scene.illumination,
          nightVeilCurve: "linearSmooth",
        } as unknown as typeof scene.illumination,
      },
    });
    expect(sneaky.scene?.illumination).not.toHaveProperty("nightVeilCurve");
    expect(sneaky.scene?.illumination.moonlight.mode).toBe(scene.illumination.moonlight.mode);
  });
});
