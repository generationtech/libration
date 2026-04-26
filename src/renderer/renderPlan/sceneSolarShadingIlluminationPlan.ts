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

import { longitudeDegFromMapX } from "../../core/equirectangularProjection";
import { sampleIlluminationRgba8 } from "../illuminationShading";
import type { RenderPlan } from "./renderPlanTypes";

/** Matches historical canvas pass: half-res sampling then smooth upscale to the viewport. */
export const SOLAR_SHADING_PLAN_DOWNSAMPLE = 2;

/**
 * Builds the solar illumination / night-side mask for the equirectangular scene strip
 * (day/night plus a continuous solar-altitude twilight gradient field in {@link sampleIlluminationRgba8}).
 * Twilight is not a separate layer or `RenderPlan` kind; the canvas executor only blits one {@link rasterPatch}.
 */
export function buildSolarShadingIlluminationRenderPlan(options: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  subsolarLatDeg: number;
  subsolarLonDeg: number;
  sublunarLatDeg: number;
  sublunarLonDeg: number;
  lunarIlluminatedFraction: number;
  layerOpacity: number;
}): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (w <= 0 || h <= 0) {
    return { items: [] };
  }

  const latS = (options.subsolarLatDeg * Math.PI) / 180;
  const lonS = (options.subsolarLonDeg * Math.PI) / 180;
  const cosLatS = Math.cos(latS);
  const sinLatS = Math.sin(latS);
  const latM = (options.sublunarLatDeg * Math.PI) / 180;
  const lonM = (options.sublunarLonDeg * Math.PI) / 180;
  const cosLatM = Math.cos(latM);
  const sinLatM = Math.sin(latM);

  const sw = Math.max(1, Math.ceil(w / SOLAR_SHADING_PLAN_DOWNSAMPLE));
  const sh = Math.max(1, Math.ceil(h / SOLAR_SHADING_PLAN_DOWNSAMPLE));

  const rgba = new Uint8ClampedArray(sw * sh * 4);
  const op = options.layerOpacity;
  let p = 0;
  for (let j = 0; j < sh; j++) {
    const latDeg = 90 - ((j + 0.5) / sh) * 180;
    const phi = (latDeg * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    for (let i = 0; i < sw; i++) {
      const lonDeg = longitudeDegFromMapX(i + 0.5, sw);
      const lam = (lonDeg * Math.PI) / 180;
      const solarDot = cosPhi * cosLatS * Math.cos(lam - lonS) + sinPhi * sinLatS;
      const lunarDot = cosPhi * cosLatM * Math.cos(lam - lonM) + sinPhi * sinLatM;
      const { r, g, b, a } = sampleIlluminationRgba8(solarDot, op, {
        lunarDot,
        lunarIlluminatedFraction: options.lunarIlluminatedFraction,
      });
      rgba[p++] = r;
      rgba[p++] = g;
      rgba[p++] = b;
      rgba[p++] = a;
    }
  }

  return {
    items: [
      {
        kind: "rasterPatch",
        x: 0,
        y: 0,
        destWidth: w,
        destHeight: h,
        widthPx: sw,
        heightPx: sh,
        rgba,
      },
    ],
  };
}
