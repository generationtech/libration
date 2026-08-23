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
  IDENTITY_SCENE_CAMERA,
  sceneXFromLongitudeDeg,
  sceneYFromLatitudeDeg,
} from "../../core/sceneCamera";
import { mapXFromLongitudeDeg, mapYFromLatitudeDeg } from "../../core/equirectangularProjection";
import { WORLD_EQUIRECTANGULAR_SRC } from "../../layers/baseMapLayer";
import { buildBaseRasterMapRenderPlan } from "./sceneBaseRasterMapPlan";
import { buildEquirectangularGridOverlayRenderPlan } from "./equirectGridOverlayPlan";
import { buildSubsolarMarkerRenderPlan } from "./sceneSubsolarSublunarMarkersPlan";
import { buildSolarShadingIlluminationRenderPlan } from "./sceneSolarShadingIlluminationPlan";
import { getMoonlightPolicy } from "../../core/moonlightPolicy";
import { DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE } from "../../core/sceneIlluminationPresentationDefaults";

const W = 800;
const H = 400;
const ZOOMED = { scale: 2, centerU: 0.5, centerV: 0.5 } as const;

describe("LIB-080 camera plan mapping", () => {
  it("keeps identity geographic placement on the current projection helpers", () => {
    const lon = 45;
    const lat = -12;
    const plan = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: IDENTITY_SCENE_CAMERA,
      lonDeg: lon,
      latDeg: lat,
    });
    const glow = plan.items[0];
    expect(glow?.kind).toBe("radialGradientFill");
    if (glow?.kind !== "radialGradientFill") {
      return;
    }
    expect(glow.clipCx).toBeCloseTo(mapXFromLongitudeDeg(lon, W), 8);
    expect(glow.clipCy).toBeCloseTo(mapYFromLatitudeDeg(lat, H), 8);
  });

  it("moves marker position with scale without changing CSS glyph radius", () => {
    const lon = 0;
    const lat = 0;
    const identity = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: IDENTITY_SCENE_CAMERA,
      lonDeg: lon,
      latDeg: lat,
    });
    const zoomed = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: ZOOMED,
      lonDeg: lon,
      latDeg: lat,
    });
    const a = identity.items[0];
    const b = zoomed.items[0];
    expect(a?.kind).toBe("radialGradientFill");
    expect(b?.kind).toBe("radialGradientFill");
    if (a?.kind !== "radialGradientFill" || b?.kind !== "radialGradientFill") {
      return;
    }
    expect(a.clipCx).toBeCloseTo(W / 2, 8);
    expect(b.clipCx).toBeCloseTo(sceneXFromLongitudeDeg(lon, W, ZOOMED), 8);
    expect(b.clipCy).toBeCloseTo(sceneYFromLatitudeDeg(lat, H, ZOOMED), 8);
    expect(b.clipR).toBe(a.clipR);
    expect(b.r1).toBe(a.r1);
  });

  it("keeps grid stroke widths in CSS pixels under zoom", () => {
    const identity = buildEquirectangularGridOverlayRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      meridianStepDeg: 30,
      parallelStepDeg: 30,
      layerOpacity: 1,
    });
    const zoomed = buildEquirectangularGridOverlayRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: ZOOMED,
      meridianStepDeg: 30,
      parallelStepDeg: 30,
      layerOpacity: 1,
    });
    expect(zoomed.items.length).toBe(identity.items.length);
    let moved = false;
    for (let i = 0; i < identity.items.length; i += 1) {
      const left = identity.items[i]!;
      const right = zoomed.items[i]!;
      expect(left.kind).toBe("line");
      expect(right.kind).toBe("line");
      if (left.kind !== "line" || right.kind !== "line") {
        continue;
      }
      expect(right.strokeWidthPx).toBe(left.strokeWidthPx);
      if (right.x1 !== left.x1 || right.y1 !== left.y1) {
        moved = true;
      }
    }
    expect(moved).toBe(true);
  });

  it("aligns illumination raster dest with the same camera dest as the base map", () => {
    const camera = { scale: 2, centerU: 0.25, centerV: 0.5 } as const;
    const base = buildBaseRasterMapRenderPlan({
      src: WORLD_EQUIRECTANGULAR_SRC,
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera,
    });
    const shade = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 0.5,
      layerOpacity: 1,
      moonlightPolicy: getMoonlightPolicy(DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE),
    });
    const blit = base.items[0];
    const patch = shade.items[0];
    expect(blit?.kind).toBe("imageBlit");
    expect(patch?.kind).toBe("rasterPatch");
    if (blit?.kind !== "imageBlit" || patch?.kind !== "rasterPatch") {
      return;
    }
    expect(patch.x).toBeCloseTo(blit.x, 8);
    expect(patch.y).toBeCloseTo(blit.y, 8);
    expect(patch.destWidth).toBeCloseTo(blit.width, 8);
    expect(patch.destHeight).toBeCloseTo(blit.height, 8);
  });

  it("emits matching wrapped raster dest copies when the camera crosses the antimeridian", () => {
    const camera = { scale: 1, centerU: 0.85, centerV: 0.5 } as const;
    const base = buildBaseRasterMapRenderPlan({
      src: WORLD_EQUIRECTANGULAR_SRC,
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera,
    });
    const shade = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 0.5,
      layerOpacity: 1,
      moonlightPolicy: getMoonlightPolicy(DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE),
    });
    expect(base.items.length).toBe(2);
    expect(shade.items.length).toBe(2);
    for (let i = 0; i < 2; i += 1) {
      const blit = base.items[i];
      const patch = shade.items[i];
      expect(blit?.kind).toBe("imageBlit");
      expect(patch?.kind).toBe("rasterPatch");
      if (blit?.kind !== "imageBlit" || patch?.kind !== "rasterPatch") {
        return;
      }
      expect(patch.x).toBeCloseTo(blit.x, 8);
      expect(patch.y).toBeCloseTo(blit.y, 8);
      expect(patch.destWidth).toBeCloseTo(blit.width, 8);
      expect(patch.destHeight).toBeCloseTo(blit.height, 8);
    }
  });

  it("keeps grid stroke widths in CSS pixels after a wrapped pan", () => {
    const camera = { scale: 2, centerU: 1.1, centerV: 0.4 } as const;
    const identity = buildEquirectangularGridOverlayRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      meridianStepDeg: 30,
      parallelStepDeg: 30,
      layerOpacity: 1,
    });
    const panned = buildEquirectangularGridOverlayRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera,
      meridianStepDeg: 30,
      parallelStepDeg: 30,
      layerOpacity: 1,
    });
    const sample = identity.items.find((item) => item.kind === "line");
    const pannedSample = panned.items.find((item) => item.kind === "line");
    expect(sample?.kind).toBe("line");
    expect(pannedSample?.kind).toBe("line");
    if (sample?.kind !== "line" || pannedSample?.kind !== "line") {
      return;
    }
    expect(pannedSample.strokeWidthPx).toBe(sample.strokeWidthPx);
    expect(panned.items.length).toBeGreaterThan(identity.items.length);
  });
});
