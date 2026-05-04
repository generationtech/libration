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
 * Node decodes the shipped Black Marble JPEG via `jpeg-js` (same bytes as runtime asset), builds an
 * {@link EmissiveRasterSampleBuffer}, and proves catalog path + city/ocean contrast + illumination RGB delta.
 * (Browser `Image` decode of a 3600×1800 blob is not used here: happy-dom timed out before `onload`.)
 */
// @vitest-environment node

import { readFileSync } from "node:fs";
import path from "node:path";
import * as jpeg from "jpeg-js";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID,
  resolveEmissiveCompositionAsset,
} from "../config/emissiveCompositionAssetResolve";
import { getMoonlightPolicy } from "../core/moonlightPolicy";
import type { EmissiveRasterSampleBuffer } from "./emissiveIlluminationRaster";
import { sampleEquirectEmissiveRadianceLinear01 } from "./emissiveIlluminationRaster";
import { sampleIlluminationRgba8 } from "./illuminationShading";

const REPO_ROOT = process.cwd();
const BLACK_MARBLE_JPG = path.join(
  REPO_ROOT,
  "public/maps/composition/equirect-world-night-lights-viirs-v1.jpg",
);

/** Approximate city centers (east lon positive). */
const NYC = { lonDeg: -73.98, latDeg: 40.75 };
const LONDON = { lonDeg: -0.12, latDeg: 51.5 };
const TOKYO = { lonDeg: 139.76, latDeg: 35.68 };
const MID_PACIFIC = { lonDeg: -150, latDeg: 0 };
const SAHARA = { lonDeg: 13, latDeg: 23 };

function decodeBlackMarbleToRasterBuffer(): EmissiveRasterSampleBuffer {
  const bytes = readFileSync(BLACK_MARBLE_JPG);
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  expect(decoded.width).toBe(3600);
  expect(decoded.height).toBe(1800);
  return {
    width: decoded.width,
    height: decoded.height,
    rgba: new Uint8ClampedArray(decoded.data),
  };
}

describe("Black Marble emissive integration (jpeg-js decode + sampling)", () => {
  it("resolves catalog src to the shipped composition path", () => {
    const asset = resolveEmissiveCompositionAsset(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID);
    expect(asset.src).toBe("/maps/composition/equirect-world-night-lights-viirs-v1.jpg");
  });

  it("decodes onboarded JPEG to a full RGBA buffer matching equirect dimensions", () => {
    const buf = decodeBlackMarbleToRasterBuffer();
    expect(buf.rgba.length).toBe(3600 * 1800 * 4);
    expect(buf.rgba[0]).toBeGreaterThanOrEqual(0);
  });

  it("yields higher composition-driver samples over NYC/London/Tokyo than mid-Pacific or Sahara", () => {
    const buf = decodeBlackMarbleToRasterBuffer();

    const nyc = sampleEquirectEmissiveRadianceLinear01(buf, NYC.lonDeg, NYC.latDeg);
    const london = sampleEquirectEmissiveRadianceLinear01(buf, LONDON.lonDeg, LONDON.latDeg);
    const tokyo = sampleEquirectEmissiveRadianceLinear01(buf, TOKYO.lonDeg, TOKYO.latDeg);
    const ocean = sampleEquirectEmissiveRadianceLinear01(buf, MID_PACIFIC.lonDeg, MID_PACIFIC.latDeg);
    const desert = sampleEquirectEmissiveRadianceLinear01(buf, SAHARA.lonDeg, SAHARA.latDeg);

    const baseline = Math.max(ocean, desert);
    expect(nyc).toBeGreaterThan(baseline * 2);
    expect(london).toBeGreaterThan(baseline * 2);
    expect(tokyo).toBeGreaterThan(baseline * 2);
  });

  it("sampleIlluminationRgba8 sums higher RGB for NYC driver than ocean driver at the same deep-night solar dot", () => {
    const buf = decodeBlackMarbleToRasterBuffer();
    const rNyc = sampleEquirectEmissiveRadianceLinear01(buf, NYC.lonDeg, NYC.latDeg);
    const rOcean = sampleEquirectEmissiveRadianceLinear01(buf, MID_PACIFIC.lonDeg, MID_PACIFIC.latDeg);
    expect(rNyc).toBeGreaterThan(rOcean * 1.5);

    const dotDeepNight = Math.sin((-28 * Math.PI) / 180);
    const moon = getMoonlightPolicy("natural");
    const cityPx = sampleIlluminationRgba8(
      dotDeepNight,
      1,
      { lunarDot: 0.2, lunarIlluminatedFraction: 0.5 },
      moon,
      { radianceLinear01: rNyc, emissiveMode: "illustrative" },
    );
    const oceanPx = sampleIlluminationRgba8(
      dotDeepNight,
      1,
      { lunarDot: 0.2, lunarIlluminatedFraction: 0.5 },
      moon,
      { radianceLinear01: rOcean, emissiveMode: "illustrative" },
    );
    expect(cityPx.r + cityPx.g + cityPx.b).toBeGreaterThan(oceanPx.r + oceanPx.g + oceanPx.b);
  });
});
