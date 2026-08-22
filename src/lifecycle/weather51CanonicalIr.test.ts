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

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CLOUDS_LAYER_OPACITY } from "../config/v2/sceneConfig";
import {
  extractCloudsCoverageMask,
  materializeCloudsSourcePlanes,
} from "./cloudCoverage";
import {
  CLOUD_CONFIDENCE_KNOTS,
  CLOUD_HIGHLIGHT_RGB,
  CLOUD_HIGHLIGHT_TRANSFER_VERSION,
  LEGACY_WX3_CLOUD_HIGHLIGHT_TRANSFER_VERSION,
  applyCloudHighlightTransfer,
  applyLegacyWx3CloudHighlightTransfer,
  cloudConfidence01FromCanonicalIR,
  rec601Luma8,
} from "./cloudHighlightTransfer";
import {
  EUMET_RING_CANONICAL_IR_BLACK,
} from "./cloudIrInterpretation";
import {
  setDevCloudsDisplayTransferOverride,
} from "./cloudsDisplayTransfer";
import {
  compositeCloudHighlightLayers,
  resolveCloudsCompositeWinnerSectorIds,
  type CloudsHighlightLayer,
} from "./cloudsComposite";
import { getCloudsQualityPlane } from "./cloudQuality";
import {
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_METEOSAT,
  cloudsSectorIrInterpretation,
} from "./cloudsSectors";
import {
  canonicalIR01FromGibsDisplayC,
  canonicalIR01FromGibsRgb,
  ensureGibsBand13ColorMapLut,
  GIBS_BAND13_COLORMAP_AUTHORITY,
  gibsBand13Chroma,
  gibsBand13ColormapDistance2,
  projectRgbOntoGibsBand13Colormap,
  setDevGibsGrayInterpretationOverride,
} from "./gibsBand13ColorMap";
import { GIBS_BAND13_COLORMAP_RGB_TC } from "./gibsBand13ColorMapData";

const PRODUCT_MS = Date.parse("2026-08-22T14:40:00Z");

function rgbaOf(r: number, g: number, b: number, a = 255): Uint8Array {
  return new Uint8Array([r, g, b, a]);
}

function confidenceOf(
  rgb: Uint8Array,
  kind: "gibsBand13ColorMap" | "meteosatIr108Gray" | "eumetRingIr108Gray",
): number {
  return applyCloudHighlightTransfer(rgb, { interpretation: kind })[3]! / 255;
}

function layerFromProvider(
  sectorId: typeof CLOUDS_SECTOR_GOES_EAST | typeof CLOUDS_SECTOR_METEOSAT,
  provider: Uint8Array,
  width: number,
  height: number,
  transfer: "wx5" | "legacy",
  quality: Uint8Array,
  observationTimeMs: number,
): CloudsHighlightLayer {
  const interpretation = cloudsSectorIrInterpretation(sectorId);
  const coverageMask = extractCloudsCoverageMask(provider);
  const rgba =
    transfer === "legacy"
      ? applyLegacyWx3CloudHighlightTransfer(provider, interpretation)
      : applyCloudHighlightTransfer(provider, { interpretation });
  return {
    sectorId,
    width,
    height,
    rgba,
    coverageMask,
    qualityWeight: quality,
    observationTimeMs,
  };
}

describe("WEATHER-5.1 canonical IR + cloud confidence", () => {
  beforeAll(() => {
    ensureGibsBand13ColorMapLut();
  });

  beforeEach(() => {
    setDevCloudsDisplayTransferOverride(null);
    setDevGibsGrayInterpretationOverride(null);
  });

  it("documents GIBS colormap authority and does not claim Kelvin inversion", () => {
    expect(GIBS_BAND13_COLORMAP_AUTHORITY.url).toContain(
      "Clean_Longwave_Infrared_Window_Band.xml",
    );
    expect(GIBS_BAND13_COLORMAP_AUTHORITY.entryCount).toBe(
      GIBS_BAND13_COLORMAP_RGB_TC.length,
    );
    expect(GIBS_BAND13_COLORMAP_AUTHORITY.units).toBe("°C");
    expect(CLOUD_HIGHLIGHT_TRANSFER_VERSION).toBe("wx54-gibs-gray-v3");
    expect(LEGACY_WX3_CLOUD_HIGHLIGHT_TRANSFER_VERSION).toBe("wx3-ir-v1");
    expect(CLOUD_HIGHLIGHT_TRANSFER_VERSION).not.toBe(
      LEGACY_WX3_CLOUD_HIGHLIGHT_TRANSFER_VERSION,
    );
  });

  it("uses the same GIBS interpretation for East, West, and Himawari", () => {
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
  });

  it("maps known GIBS clear-ocean gray below the confidence floor", () => {
    const ir = canonicalIR01FromGibsRgb(103, 103, 103);
    expect(ir).toBeGreaterThan(0.24);
    expect(ir).toBeLessThan(0.28);
    expect(cloudConfidence01FromCanonicalIR(ir)).toBe(0);
    expect(confidenceOf(rgbaOf(103, 103, 103), "gibsBand13ColorMap")).toBe(0);
    expect(confidenceOf(rgbaOf(110, 110, 110), "gibsBand13ColorMap")).toBe(0);
  });

  it("maps known GIBS cold/high-cloud colors high, including chromatic pixels", () => {
    const magenta = GIBS_BAND13_COLORMAP_RGB_TC[1]!;
    const redCold = GIBS_BAND13_COLORMAP_RGB_TC[32]!;
    expect(magenta).toEqual([127, 0, 127, -9060]);
    const magIR = canonicalIR01FromGibsRgb(magenta[0], magenta[1], magenta[2]);
    const redIR = canonicalIR01FromGibsRgb(redCold[0], redCold[1], redCold[2]);
    expect(magIR).toBeGreaterThan(0.95);
    expect(redIR).toBeGreaterThan(0.75);
    expect(confidenceOf(rgbaOf(127, 0, 127), "gibsBand13ColorMap")).toBeGreaterThan(
      0.9,
    );
    expect(confidenceOf(rgbaOf(255, 26, 0), "gibsBand13ColorMap")).toBeGreaterThan(
      0.85,
    );
    expect(rec601Luma8(255, 26, 0)).toBeLessThan(100);
    expect(
      applyLegacyWx3CloudHighlightTransfer(rgbaOf(255, 26, 0), "gibsBand13ColorMap")[3],
    ).toBe(0);
  });

  it("projects interpolated WMS colors onto the adjacent colormap segment", () => {
    const a = GIBS_BAND13_COLORMAP_RGB_TC[40]!;
    const b = GIBS_BAND13_COLORMAP_RGB_TC[41]!;
    const mid = [
      Math.round((a[0] + b[0]) / 2),
      Math.round((a[1] + b[1]) / 2),
      Math.round((a[2] + b[2]) / 2),
    ] as const;
    const irA = canonicalIR01FromGibsDisplayC(a[3] / 100);
    const irB = canonicalIR01FromGibsDisplayC(b[3] / 100);
    const projected = projectRgbOntoGibsBand13Colormap(mid[0], mid[1], mid[2]);
    const lo = Math.min(irA, irB);
    const hi = Math.max(irA, irB);
    expect(projected.canonicalIR01).toBeGreaterThanOrEqual(lo - 1e-6);
    expect(projected.canonicalIR01).toBeLessThanOrEqual(hi + 1e-6);
    const lutIR = canonicalIR01FromGibsRgb(mid[0], mid[1], mid[2]);
    expect(Math.abs(lutIR - projected.canonicalIR01)).toBeLessThan(0.04);
  });

  it("never silently falls back to Rec.601 for unmatched GIBS RGB", () => {
    const r = 8;
    const g = 40;
    const b = 200;
    const ir = canonicalIR01FromGibsRgb(r, g, b);
    const luma01 = rec601Luma8(r, g, b) / 255;
    expect(ir).not.toBeCloseTo(luma01, 2);
    expect(gibsBand13ColormapDistance2(r, g, b)).toBeGreaterThan(0);
    expect(Number.isFinite(ir)).toBe(true);
    expect(ir).toBeGreaterThanOrEqual(0);
    expect(ir).toBeLessThanOrEqual(1);
  });

  it("maps MSG warm dark clear low and cold bright high", () => {
    expect(confidenceOf(rgbaOf(32, 32, 32), "meteosatIr108Gray")).toBe(0);
    expect(confidenceOf(rgbaOf(1, 1, 1), "meteosatIr108Gray")).toBe(0);
    expect(confidenceOf(rgbaOf(240, 240, 240), "meteosatIr108Gray")).toBeGreaterThan(
      0.9,
    );
  });

  it("maps ring clear ocean low and cold tops high", () => {
    expect(EUMET_RING_CANONICAL_IR_BLACK).toBe(56);
    expect(confidenceOf(rgbaOf(73, 73, 73), "eumetRingIr108Gray")).toBe(0);
    expect(confidenceOf(rgbaOf(98, 98, 98), "eumetRingIr108Gray")).toBe(0);
    expect(confidenceOf(rgbaOf(220, 220, 220), "eumetRingIr108Gray")).toBeGreaterThan(
      0.7,
    );
  });

  it("preserves chromatic colormap legend order even when Rec.601 luma is non-monotonic", () => {
    let prev = -1;
    for (let i = GIBS_BAND13_COLORMAP_RGB_TC.length - 1; i >= 0; i--) {
      const e = GIBS_BAND13_COLORMAP_RGB_TC[i]!;
      if (gibsBand13Chroma(e[0], e[1], e[2]) <= 8) continue;
      const conf = cloudConfidence01FromCanonicalIR(
        canonicalIR01FromGibsRgb(e[0], e[1], e[2]),
      );
      expect(conf).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = conf;
    }
  });

  it("uses one shared conservative piecewise-smooth transfer", () => {
    expect(CLOUD_CONFIDENCE_KNOTS.map((k) => [k.ir01, k.confidence])).toEqual([
      [0, 0],
      [0.3, 0],
      [0.4, 0.12],
      [0.52, 0.45],
      [0.68, 0.82],
      [0.82, 0.97],
      [1, 1],
    ]);
    expect(cloudConfidence01FromCanonicalIR(0.265)).toBe(0);
    expect(cloudConfidence01FromCanonicalIR(0.4)).toBeCloseTo(0.12, 5);
    expect(cloudConfidence01FromCanonicalIR(1)).toBe(1);
    const mid = cloudConfidence01FromCanonicalIR(0.46);
    expect(mid).toBeGreaterThan(0.12);
    expect(mid).toBeLessThan(0.45);
  });

  it("keeps coverage masks identical across wx3 and wx5 transfers", () => {
    const provider = new Uint8Array([
      103, 103, 103, 255, 0, 0, 0, 0, 255, 26, 0, 200, 32, 32, 32, 64,
    ]);
    const mask = extractCloudsCoverageMask(provider);
    const wx5 = materializeCloudsSourcePlanes(provider, "gibsBand13ColorMap");
    setDevCloudsDisplayTransferOverride("legacy");
    const wx3 = materializeCloudsSourcePlanes(provider, "gibsBand13ColorMap");
    expect(Array.from(wx5.coverageMask)).toEqual(Array.from(mask));
    expect(Array.from(wx3.coverageMask)).toEqual(Array.from(mask));
  });

  it("keeps quality planes identical (geometry, not signal)", () => {
    const a = getCloudsQualityPlane(CLOUDS_SECTOR_GOES_EAST, 32, 16)!;
    const b = getCloudsQualityPlane(CLOUDS_SECTOR_GOES_EAST, 32, 16)!;
    expect(a).toBe(b);
    expect(a.length).toBe(32 * 16);
  });

  it("keeps the winner map identical for the same coverage, quality, and times", () => {
    const width = 4;
    const height = 1;
    const eastRaw = new Uint8Array([
      103, 103, 103, 255, 255, 26, 0, 255, 125, 125, 125, 255, 40, 40, 40, 0,
    ]);
    const msgRaw = new Uint8Array([
      32, 32, 32, 255, 240, 240, 240, 255, 40, 40, 40, 255, 90, 90, 90, 255,
    ]);
    const eastQ = new Uint8Array([200, 200, 40, 0]);
    const msgQ = new Uint8Array([40, 180, 200, 255]);
    const eastT = PRODUCT_MS - 10 * 60 * 1000;
    const msgT = PRODUCT_MS - 12 * 60 * 1000;
    const order = [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT] as const;
    const wx5 = resolveCloudsCompositeWinnerSectorIds(
      [
        layerFromProvider(CLOUDS_SECTOR_GOES_EAST, eastRaw, width, height, "wx5", eastQ, eastT),
        layerFromProvider(CLOUDS_SECTOR_METEOSAT, msgRaw, width, height, "wx5", msgQ, msgT),
      ],
      order,
      PRODUCT_MS,
    )!;
    const wx3 = resolveCloudsCompositeWinnerSectorIds(
      [
        layerFromProvider(CLOUDS_SECTOR_GOES_EAST, eastRaw, width, height, "legacy", eastQ, eastT),
        layerFromProvider(CLOUDS_SECTOR_METEOSAT, msgRaw, width, height, "legacy", msgQ, msgT),
      ],
      order,
      PRODUCT_MS,
    )!;
    expect(Array.from(wx5.winners)).toEqual(Array.from(wx3.winners));
    const composedWx5 = compositeCloudHighlightLayers(
      [
        layerFromProvider(CLOUDS_SECTOR_GOES_EAST, eastRaw, width, height, "wx5", eastQ, eastT),
        layerFromProvider(CLOUDS_SECTOR_METEOSAT, msgRaw, width, height, "wx5", msgQ, msgT),
      ],
      order,
      PRODUCT_MS,
    )!;
    expect(composedWx5.rgba[0]).toBe(CLOUD_HIGHLIGHT_RGB.r);
  });

  it("reduces a quality-equal GIBS-vs-MSG presentation step without blending", () => {
    const east = rgbaOf(125, 125, 125);
    const msg = rgbaOf(40, 40, 40);
    const legacyGap = Math.abs(
      applyLegacyWx3CloudHighlightTransfer(east, "gibsBand13ColorMap")[3]! -
        applyLegacyWx3CloudHighlightTransfer(msg, "meteosatIr108Gray")[3]!,
    );
    const wx5Gap = Math.abs(
      applyCloudHighlightTransfer(east, { interpretation: "gibsBand13ColorMap" })[3]! -
        applyCloudHighlightTransfer(msg, { interpretation: "meteosatIr108Gray" })[3]!,
    );
    expect(legacyGap).toBeGreaterThan(30);
    expect(wx5Gap).toBeLessThan(legacyGap * 0.5);
  });

  it("does not change factory opacity or highlight RGB", () => {
    expect(DEFAULT_CLOUDS_LAYER_OPACITY).toBe(0.42);
    expect(CLOUD_HIGHLIGHT_RGB).toEqual({ r: 248, g: 250, b: 252 });
  });

  it("canonical-IR output is grayscale of the scalar, not Rec.601", () => {
    const out = applyCloudHighlightTransfer(rgbaOf(127, 0, 127), {
      interpretation: "gibsBand13ColorMap",
      output: "canonicalIR",
    });
    expect(out[0]).toBe(out[1]);
    expect(out[1]).toBe(out[2]);
    expect(out[0]).toBeGreaterThan(240);
    expect(out[3]).toBe(255);
  });

  it("GIBS LUT interprets a full-disk-sized buffer without freezing", () => {
    const width = 512;
    const height = 256;
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      const e = GIBS_BAND13_COLORMAP_RGB_TC[i % GIBS_BAND13_COLORMAP_RGB_TC.length]!;
      rgba[o] = e[0];
      rgba[o + 1] = e[1];
      rgba[o + 2] = e[2];
      rgba[o + 3] = 255;
    }
    const t0 = performance.now();
    applyCloudHighlightTransfer(rgba, { interpretation: "gibsBand13ColorMap" });
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(1500);
  });
});
