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

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CLOUDS_LAYER_OPACITY } from "../config/v2/sceneConfig";
import {
  extractCloudsCoverageMask,
  materializeCloudsSourcePlanes,
} from "./cloudCoverage";
import {
  CLOUD_CONFIDENCE_KNOTS,
  CLOUD_HIGHLIGHT_RGB,
  CLOUD_HIGHLIGHT_TRANSFER_VERSION,
  LEGACY_GIBS_GRAY_TRANSFER_VERSION,
  activeCloudsTransferVersion,
  applyCloudHighlightTransfer,
  cloudConfidence01FromCanonicalIR,
} from "./cloudHighlightTransfer";
import {
  LEGACY_EUMET_RING_CANONICAL_IR_BLACK,
  canonicalIR01FromEumetRingIr108Gray,
  canonicalIR01FromMeteosatIr108Gray,
  canonicalIR01FromProviderRgb,
  setDevRingCalibrationOverride,
} from "./cloudIrInterpretation";
import {
  compositeCloudHighlightLayers,
  resolveCloudsCompositeWinnerSectorIds,
  type CloudsHighlightLayer,
} from "./cloudsComposite";
import { getCloudsQualityPlane } from "./cloudQuality";
import { setDevCloudsDisplayTransferOverride } from "./cloudsDisplayTransfer";
import {
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_METEOSAT,
  cloudsSectorIrInterpretation,
} from "./cloudsSectors";
import {
  GIBS_BAND13_NEAR_GRAY_CHROMA_MAX,
  canonicalIR01FromGibsDisplayC,
  canonicalIR01FromGibsRgb,
  canonicalIR01FromGibsWarmGrayLuma,
  ensureGibsBand13ColorMapLut,
  GIBS_BAND13_COLORMAP_AUTHORITY,
  gibsBand13Chroma,
  gibsBand13GrayLuma,
  getActiveGibsGrayInterpretation,
  isGibsBand13NearGray,
  parseGibsGrayInterpretationId,
  projectRgbOntoGibsBand13Colormap,
  setDevGibsGrayInterpretationOverride,
} from "./gibsBand13ColorMap";
import {
  GIBS_BAND13_COLD_GRAY_END_INDEX,
  GIBS_BAND13_COLD_GRAY_START_INDEX,
  GIBS_BAND13_COLORMAP_RGB_TC,
  GIBS_BAND13_WARM_GRAY_START_INDEX,
} from "./gibsBand13ColorMapData";

const PRODUCT_MS = Date.parse("2026-08-22T18:30:00Z");

function rgbaOf(r: number, g: number, b: number, a = 255): Uint8Array {
  return new Uint8Array([r, g, b, a]);
}

function confidenceOf(r: number, g: number, b: number): number {
  return (
    applyCloudHighlightTransfer(rgbaOf(r, g, b), {
      interpretation: "gibsBand13ColorMap",
    })[3]! / 255
  );
}

function fillGrayField(
  width: number,
  height: number,
  base: number,
  speckleEvery: number,
  speckleValue: number,
  convection?: { x: number; y: number; rgb: readonly [number, number, number] },
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const speckled = speckleEvery > 0 && (x + y * 3) % speckleEvery === 0;
      const g = speckled ? speckleValue : base + ((x + y) % 3) - 1;
      rgba[i] = g;
      rgba[i + 1] = g;
      rgba[i + 2] = g;
      rgba[i + 3] = 255;
    }
  }
  if (convection) {
    const i = (convection.y * width + convection.x) * 4;
    rgba[i] = convection.rgb[0];
    rgba[i + 1] = convection.rgb[1];
    rgba[i + 2] = convection.rgb[2];
  }
  return rgba;
}

function irVariance(rgba: Uint8Array): number {
  const n = Math.floor(rgba.length / 4);
  const values = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const ir = canonicalIR01FromGibsRgb(rgba[i * 4]!, rgba[i * 4 + 1]!, rgba[i * 4 + 2]!);
    values[i] = ir;
    sum += ir;
  }
  const mean = sum / n;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i]! - mean;
    acc += d * d;
  }
  return acc / n;
}

function neighborAbsIrMean(rgba: Uint8Array, width: number, height: number): number {
  let sum = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = y * width + x;
      const a = canonicalIR01FromGibsRgb(rgba[i * 4]!, rgba[i * 4 + 1]!, rgba[i * 4 + 2]!);
      const b = canonicalIR01FromGibsRgb(
        rgba[(i + 1) * 4]!,
        rgba[(i + 1) * 4 + 1]!,
        rgba[(i + 1) * 4 + 2]!,
      );
      sum += Math.abs(a - b);
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
}

function layerFromProvider(
  sectorId: typeof CLOUDS_SECTOR_GOES_EAST | typeof CLOUDS_SECTOR_HIMAWARI | typeof CLOUDS_SECTOR_METEOSAT,
  provider: Uint8Array,
  width: number,
  height: number,
  quality: Uint8Array,
  observationTimeMs: number,
): CloudsHighlightLayer {
  const interpretation = cloudsSectorIrInterpretation(sectorId);
  return {
    sectorId,
    width,
    height,
    rgba: applyCloudHighlightTransfer(provider, { interpretation }),
    coverageMask: extractCloudsCoverageMask(provider),
    qualityWeight: quality,
    observationTimeMs,
  };
}

describe("WEATHER-5.4.1 chroma-aware GIBS near-gray inversion", () => {
  beforeAll(() => {
    ensureGibsBand13ColorMapLut();
  });

  beforeEach(() => {
    setDevCloudsDisplayTransferOverride(null);
    setDevGibsGrayInterpretationOverride(null);
    setDevRingCalibrationOverride(null);
  });

  afterEach(() => {
    setDevGibsGrayInterpretationOverride(null);
    setDevCloudsDisplayTransferOverride(null);
    setDevRingCalibrationOverride(null);
  });

  it("documents palette branches and the production transfer version", () => {
    expect(GIBS_BAND13_COLORMAP_AUTHORITY.entryCount).toBe(
      GIBS_BAND13_COLORMAP_RGB_TC.length,
    );
    expect(GIBS_BAND13_COLORMAP_AUTHORITY.paletteVersion).toBe("gibs-v1.3-2026-08-22");
    expect(GIBS_BAND13_NEAR_GRAY_CHROMA_MAX).toBe(8);
    expect(CLOUD_HIGHLIGHT_TRANSFER_VERSION).toBe("wx55-ring-identity-v1");
    expect(CLOUD_HIGHLIGHT_TRANSFER_VERSION).not.toBe("wx5-cloud-v2");
    expect(LEGACY_GIBS_GRAY_TRANSFER_VERSION).toBe("wx54-gibs-gray-legacy");
    expect(getActiveGibsGrayInterpretation()).toBe("hybrid");
    const cold = GIBS_BAND13_COLORMAP_RGB_TC[GIBS_BAND13_COLD_GRAY_START_INDEX]!;
    const coldEnd = GIBS_BAND13_COLORMAP_RGB_TC[GIBS_BAND13_COLD_GRAY_END_INDEX]!;
    const warm = GIBS_BAND13_COLORMAP_RGB_TC[GIBS_BAND13_WARM_GRAY_START_INDEX]!;
    expect(cold).toEqual([230, 230, 230, -7960]);
    expect(coldEnd).toEqual([5, 5, 5, -7060]);
    expect(warm).toEqual([197, 197, 197, -1885]);
    expect(GIBS_BAND13_COLORMAP_RGB_TC[17]).toEqual([102, 102, 102, -7460]);
    const warm103Index = GIBS_BAND13_COLORMAP_RGB_TC.findIndex(
      (e) => e[0] === 103 && e[1] === 103 && e[2] === 103 && e[3] === 1765,
    );
    expect(warm103Index).toBeGreaterThan(GIBS_BAND13_WARM_GRAY_START_INDEX);
    expect(GIBS_BAND13_COLORMAP_RGB_TC[warm103Index]).toEqual([103, 103, 103, 1765]);
    const cyan = GIBS_BAND13_COLORMAP_RGB_TC[GIBS_BAND13_WARM_GRAY_START_INDEX - 1]!;
    expect(cyan).toEqual([0, 255, 255, -1935]);
  });

  it("uses one GIBS interpretation for East, West, and Himawari", () => {
    expect(cloudsSectorIrInterpretation(CLOUDS_SECTOR_GOES_EAST)).toBe(
      "gibsBand13ColorMap",
    );
    expect(cloudsSectorIrInterpretation(CLOUDS_SECTOR_GOES_WEST)).toBe(
      "gibsBand13ColorMap",
    );
    expect(cloudsSectorIrInterpretation(CLOUDS_SECTOR_HIMAWARI)).toBe(
      "gibsBand13ColorMap",
    );
    expect(cloudsSectorIrInterpretation(CLOUDS_SECTOR_METEOSAT)).toBe(
      "meteosatIr108Gray",
    );
    expect(cloudsSectorIrInterpretation(CLOUDS_SECTOR_EUMET_RING)).toBe(
      "eumetRingIr108Gray",
    );
  });

  it("classifies chroma 7 and 8 as near-gray and 9 as chromatic", () => {
    expect(gibsBand13Chroma(100, 100, 100)).toBe(0);
    expect(isGibsBand13NearGray(100, 107, 100)).toBe(true);
    expect(isGibsBand13NearGray(100, 108, 100)).toBe(true);
    expect(isGibsBand13NearGray(100, 109, 100)).toBe(false);
    expect(GIBS_BAND13_NEAR_GRAY_CHROMA_MAX).toBe(8);
  });

  it("routes exact gray and near-gray through the warm-gray branch, not RGB-nearest", () => {
    const ir102 = canonicalIR01FromGibsRgb(102, 102, 102);
    const ir103 = canonicalIR01FromGibsRgb(103, 103, 103);
    const ir101 = canonicalIR01FromGibsRgb(101, 101, 101);
    const nearest102 = projectRgbOntoGibsBand13Colormap(102, 102, 102).canonicalIR01;
    expect(nearest102).toBeGreaterThan(0.85);
    expect(ir102).toBeLessThan(0.35);
    expect(ir102).toBeGreaterThan(0.24);
    expect(Math.abs(ir102 - nearest102)).toBeGreaterThan(0.5);
    expect(ir101).toBeLessThanOrEqual(ir102 + 1e-9);
    expect(ir102).toBeLessThanOrEqual(ir103 + 1e-9);
    expect(ir103 - ir101).toBeLessThan(0.02);
    expect(cloudConfidence01FromCanonicalIR(ir102)).toBe(0);
    expect(cloudConfidence01FromCanonicalIR(ir103)).toBe(0);
    expect(confidenceOf(102, 102, 102)).toBe(0);
    expect(confidenceOf(103, 103, 103)).toBe(0);

    const nearA = canonicalIR01FromGibsRgb(102, 104, 101);
    const nearB = canonicalIR01FromGibsRgb(105, 101, 103);
    expect(isGibsBand13NearGray(102, 104, 101)).toBe(true);
    expect(isGibsBand13NearGray(105, 101, 103)).toBe(true);
    expect(nearA).toBeCloseTo(canonicalIR01FromGibsWarmGrayLuma(gibsBand13GrayLuma(102, 104, 101)), 5);
    expect(nearB).toBeCloseTo(canonicalIR01FromGibsWarmGrayLuma(gibsBand13GrayLuma(105, 101, 103)), 5);
    expect(nearA).toBeLessThan(0.35);
    expect(nearB).toBeLessThan(0.35);
  });

  it("keeps chromatic convective cores on the existing LUT path", () => {
    const magenta = GIBS_BAND13_COLORMAP_RGB_TC[1]!;
    const red = GIBS_BAND13_COLORMAP_RGB_TC[32]!;
    const green = GIBS_BAND13_COLORMAP_RGB_TC[52]!;
    const cyan = GIBS_BAND13_COLORMAP_RGB_TC[GIBS_BAND13_WARM_GRAY_START_INDEX - 1]!;
    for (const e of [magenta, red, green, cyan]) {
      expect(gibsBand13Chroma(e[0], e[1], e[2])).toBeGreaterThan(
        GIBS_BAND13_NEAR_GRAY_CHROMA_MAX,
      );
      const hybrid = canonicalIR01FromGibsRgb(e[0], e[1], e[2]);
      setDevGibsGrayInterpretationOverride("legacyLut");
      const legacy = canonicalIR01FromGibsRgb(e[0], e[1], e[2]);
      setDevGibsGrayInterpretationOverride(null);
      expect(hybrid).toBe(legacy);
      expect(hybrid).toBeCloseTo(canonicalIR01FromGibsDisplayC(e[3] / 100), 5);
    }
    expect(canonicalIR01FromGibsRgb(magenta[0], magenta[1], magenta[2])).toBeGreaterThan(0.95);
    expect(confidenceOf(magenta[0], magenta[1], magenta[2])).toBeGreaterThan(0.9);
    expect(confidenceOf(red[0], red[1], red[2])).toBeGreaterThan(0.85);
  });

  it("maps all 256 warm-gray luma entries finitely, in range, and monotonically", () => {
    let prev = -1;
    for (let L = 0; L < 256; L++) {
      const ir = canonicalIR01FromGibsWarmGrayLuma(L);
      expect(Number.isFinite(ir)).toBe(true);
      expect(ir).toBeGreaterThanOrEqual(0);
      expect(ir).toBeLessThanOrEqual(1);
      expect(ir).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = ir;
    }
    expect(canonicalIR01FromGibsWarmGrayLuma(0)).toBeCloseTo(0, 5);
    expect(canonicalIR01FromGibsWarmGrayLuma(1)).toBeCloseTo(0, 5);
    const ir197 = canonicalIR01FromGibsWarmGrayLuma(197);
    expect(ir197).toBeCloseTo(canonicalIR01FromGibsDisplayC(-18.85), 5);
    expect(canonicalIR01FromGibsWarmGrayLuma(255)).toBeCloseTo(ir197, 5);
    expect(canonicalIR01FromGibsWarmGrayLuma(103)).toBeCloseTo(
      canonicalIR01FromGibsDisplayC(17.65),
      5,
    );
  });

  it("clamps gray luma outside the warm-branch legend without wrapping", () => {
    const lo = canonicalIR01FromGibsWarmGrayLuma(0);
    const hi = canonicalIR01FromGibsWarmGrayLuma(255);
    expect(lo).toBe(canonicalIR01FromGibsWarmGrayLuma(1));
    expect(hi).toBe(canonicalIR01FromGibsWarmGrayLuma(197));
    expect(hi).toBeGreaterThan(lo);
  });

  it("keeps GOES clear-ocean gray at confidence 0 and retains frontal/convection", () => {
    expect(confidenceOf(103, 103, 103)).toBe(0);
    expect(confidenceOf(110, 110, 110)).toBe(0);
    expect(confidenceOf(100, 100, 100)).toBe(0);
    const cyan = GIBS_BAND13_COLORMAP_RGB_TC[GIBS_BAND13_WARM_GRAY_START_INDEX - 1]!;
    const green = GIBS_BAND13_COLORMAP_RGB_TC[52]!;
    expect(confidenceOf(cyan[0], cyan[1], cyan[2])).toBeGreaterThan(0.4);
    expect(confidenceOf(green[0], green[1], green[2])).toBeGreaterThan(0.7);
    const frontalGray = canonicalIR01FromGibsRgb(160, 160, 160);
    expect(frontalGray).toBeGreaterThan(0.35);
    expect(frontalGray).toBeLessThan(0.55);
  });

  it("reduces Himawari-like near-gray grain in India and Pacific synthetic fields", () => {
    const india = fillGrayField(64, 48, 103, 7, 102, {
      x: 40,
      y: 20,
      rgb: [3, 162, 42],
    });
    const pacific = fillGrayField(64, 48, 128, 5, 102);

    setDevGibsGrayInterpretationOverride("legacyLut");
    const indiaLegacyVar = irVariance(india);
    const indiaLegacyStep = neighborAbsIrMean(india, 64, 48);
    const pacificLegacyVar = irVariance(pacific);
    const convectionLegacy = canonicalIR01FromGibsRgb(3, 162, 42);

    setDevGibsGrayInterpretationOverride(null);
    const indiaHybridVar = irVariance(india);
    const indiaHybridStep = neighborAbsIrMean(india, 64, 48);
    const pacificHybridVar = irVariance(pacific);
    const convectionHybrid = canonicalIR01FromGibsRgb(3, 162, 42);

    expect(indiaHybridVar).toBeLessThan(indiaLegacyVar * 0.25);
    expect(pacificHybridVar).toBeLessThan(pacificLegacyVar * 0.25);
    expect(indiaHybridStep).toBeLessThan(indiaLegacyStep * 0.25);
    expect(convectionHybrid).toBe(convectionLegacy);
    expect(convectionHybrid).toBeGreaterThan(0.55);
  });

  it("does not change Meteosat, GIBS chroma threshold, or the shared confidence curve", () => {
    expect(LEGACY_EUMET_RING_CANONICAL_IR_BLACK).toBe(56);
    expect(canonicalIR01FromMeteosatIr108Gray(0)).toBe(0);
    expect(canonicalIR01FromMeteosatIr108Gray(255)).toBe(1);
    expect(canonicalIR01FromEumetRingIr108Gray(56)).toBeCloseTo(56 / 255, 5);
    expect(canonicalIR01FromProviderRgb("meteosatIr108Gray", 40, 40, 40)).toBeCloseTo(
      40 / 255,
      5,
    );
    expect(canonicalIR01FromProviderRgb("eumetRingIr108Gray", 73, 73, 73)).toBeCloseTo(
      73 / 255,
      5,
    );
    expect(CLOUD_CONFIDENCE_KNOTS.map((k) => [k.ir01, k.confidence])).toEqual([
      [0, 0],
      [0.3, 0],
      [0.4, 0.12],
      [0.52, 0.45],
      [0.68, 0.82],
      [0.82, 0.97],
      [1, 1],
    ]);
    expect(CLOUD_HIGHLIGHT_RGB).toEqual({ r: 248, g: 250, b: 252 });
    expect(DEFAULT_CLOUDS_LAYER_OPACITY).toBe(0.42);
  });

  it("keeps coverage, quality, and winner maps independent of the GIBS gray path", () => {
    const width = 4;
    const height = 1;
    const eastRaw = new Uint8Array([
      103, 103, 103, 255, 102, 102, 102, 255, 255, 26, 0, 255, 40, 40, 40, 0,
    ]);
    const himRaw = new Uint8Array([
      101, 101, 101, 255, 102, 104, 101, 255, 3, 162, 42, 255, 90, 90, 90, 255,
    ]);
    const eastQ = new Uint8Array([200, 200, 40, 0]);
    const himQ = new Uint8Array([40, 180, 200, 255]);
    const eastT = PRODUCT_MS - 10 * 60 * 1000;
    const himT = PRODUCT_MS - 12 * 60 * 1000;
    const order = [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_HIMAWARI] as const;

    const hybridWinners = resolveCloudsCompositeWinnerSectorIds(
      [
        layerFromProvider(CLOUDS_SECTOR_GOES_EAST, eastRaw, width, height, eastQ, eastT),
        layerFromProvider(CLOUDS_SECTOR_HIMAWARI, himRaw, width, height, himQ, himT),
      ],
      order,
      PRODUCT_MS,
    )!;

    setDevGibsGrayInterpretationOverride("legacyLut");
    const legacyWinners = resolveCloudsCompositeWinnerSectorIds(
      [
        layerFromProvider(CLOUDS_SECTOR_GOES_EAST, eastRaw, width, height, eastQ, eastT),
        layerFromProvider(CLOUDS_SECTOR_HIMAWARI, himRaw, width, height, himQ, himT),
      ],
      order,
      PRODUCT_MS,
    )!;
    setDevGibsGrayInterpretationOverride(null);

    expect(Array.from(hybridWinners.winners)).toEqual(Array.from(legacyWinners.winners));

    const mask = extractCloudsCoverageMask(eastRaw);
    const hybridPlanes = materializeCloudsSourcePlanes(eastRaw, "gibsBand13ColorMap");
    expect(Array.from(hybridPlanes.coverageMask)).toEqual(Array.from(mask));
    const qA = getCloudsQualityPlane(CLOUDS_SECTOR_GOES_EAST, 32, 16)!;
    const qB = getCloudsQualityPlane(CLOUDS_SECTOR_GOES_EAST, 32, 16)!;
    expect(qA).toBe(qB);

    const composed = compositeCloudHighlightLayers(
      [
        layerFromProvider(CLOUDS_SECTOR_GOES_EAST, eastRaw, width, height, eastQ, eastT),
        layerFromProvider(CLOUDS_SECTOR_HIMAWARI, himRaw, width, height, himQ, himT),
      ],
      order,
      PRODUCT_MS,
    )!;
    expect(composed.rgba[0]).toBe(CLOUD_HIGHLIGHT_RGB.r);
    expect(composed.rgba[1]).toBe(CLOUD_HIGHLIGHT_RGB.g);
    expect(composed.rgba[2]).toBe(CLOUD_HIGHLIGHT_RGB.b);
  });

  it("bumps the cache version and isolates DEV legacy GIBS gray", () => {
    expect(activeCloudsTransferVersion()).toBe("wx55-ring-identity-v1");
    setDevGibsGrayInterpretationOverride("legacyLut");
    expect(activeCloudsTransferVersion()).toBe("wx54-gibs-gray-legacy");
    setDevGibsGrayInterpretationOverride(null);
    expect(parseGibsGrayInterpretationId("legacy")).toBe("legacyLut");
    expect(parseGibsGrayInterpretationId("hybrid")).toBe("hybrid");
    expect(parseGibsGrayInterpretationId("nope")).toBeNull();
  });

  it("DEV gibsGrayPath tints near-gray and chromatic GIBS pixels differently", () => {
    const near = applyCloudHighlightTransfer(rgbaOf(102, 102, 102), {
      interpretation: "gibsBand13ColorMap",
      output: "gibsGrayPath",
    });
    const chroma = applyCloudHighlightTransfer(rgbaOf(127, 0, 127), {
      interpretation: "gibsBand13ColorMap",
      output: "gibsGrayPath",
    });
    expect([near[0], near[1], near[2]]).toEqual([160, 200, 220]);
    expect([chroma[0], chroma[1], chroma[2]]).toEqual([220, 70, 140]);
    expect(near[3]).toBe(255);
  });

  it("materializes a GIBS buffer without freezing", () => {
    const width = 512;
    const height = 256;
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      const gray = 80 + (i % 80);
      if (i % 17 === 0) {
        rgba[o] = 127;
        rgba[o + 1] = 0;
        rgba[o + 2] = 127;
      } else {
        rgba[o] = gray;
        rgba[o + 1] = gray;
        rgba[o + 2] = gray;
      }
      rgba[o + 3] = 255;
    }
    const t0 = performance.now();
    applyCloudHighlightTransfer(rgba, { interpretation: "gibsBand13ColorMap" });
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(1500);
  });
});
