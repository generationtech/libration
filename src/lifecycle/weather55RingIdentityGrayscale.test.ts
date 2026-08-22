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
  LEGACY_RING_CALIBRATION_TRANSFER_VERSION,
  activeCloudsTransferVersion,
  applyCloudHighlightTransfer,
  cloudConfidence01FromCanonicalIR,
} from "./cloudHighlightTransfer";
import {
  LEGACY_EUMET_RING_CANONICAL_IR_BLACK,
  PRODUCTION_RING_CALIBRATION_ID,
  canonicalIR01FromEumetRingIr108Gray,
  canonicalIR01FromMeteosatIr108Gray,
  canonicalIR01FromProviderRgb,
  getActiveRingCalibration,
  parseRingCalibrationId,
  setDevRingCalibrationOverride,
} from "./cloudIrInterpretation";
import { geostationaryQualityU8, getCloudsQualityPlane, sampleCloudsRingQuality } from "./cloudQuality";
import {
  compositeCloudHighlightLayers,
  resolveCloudsCompositeWinnerSectorIds,
  type CloudsHighlightLayer,
} from "./cloudsComposite";
import { setDevCloudsDisplayTransferOverride } from "./cloudsDisplayTransfer";
import {
  CLOUDS_HIMAWARI_SUB_SATELLITE,
  CLOUDS_METEOSAT_SUB_SATELLITE,
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_METEOSAT,
  cloudsSectorIrInterpretation,
  type CloudsSectorId,
} from "./cloudsSectors";
import {
  GIBS_BAND13_NEAR_GRAY_CHROMA_MAX,
  canonicalIR01FromGibsRgb,
  ensureGibsBand13ColorMapLut,
} from "./gibsBand13ColorMap";

const PRODUCT_MS = Date.parse("2026-08-22T21:41:56Z");
const RING_MS = Date.parse("2026-08-22T21:00:00Z");
const MSG_MS = Date.parse("2026-08-22T21:15:00Z");
const HIM_MS = Date.parse("2026-08-22T19:30:00Z");
const EAST_MS = Date.parse("2026-08-22T19:20:00Z");

function rgbaOf(r: number, g: number, b: number, a = 255): Uint8Array {
  return new Uint8Array([r, g, b, a]);
}

function grayRgba(luma: number, a = 255): Uint8Array {
  const g = Math.max(0, Math.min(255, Math.round(luma)));
  return rgbaOf(g, g, g, a);
}

function ringConfidence(luma: number): number {
  return (
    applyCloudHighlightTransfer(grayRgba(luma), {
      interpretation: "eumetRingIr108Gray",
    })[3]! / 255
  );
}

function highlightAlpha(luma: number, kind: "eumetRingIr108Gray" | "meteosatIr108Gray"): number {
  return applyCloudHighlightTransfer(grayRgba(luma), { interpretation: kind })[3]!;
}

function paintedAlpha(transferAlpha: number): number {
  return transferAlpha * DEFAULT_CLOUDS_LAYER_OPACITY;
}

function layerFromProvider(
  sectorId: CloudsSectorId,
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

function indiaClassSequence(lat: number): string {
  const classes: string[] = [];
  let prev = "";
  for (let lon = 50; lon <= 95; lon += 0.25) {
    const msgQ = geostationaryQualityU8(
      lat,
      lon,
      CLOUDS_METEOSAT_SUB_SATELLITE.longitudeDeg,
    );
    const himQ = geostationaryQualityU8(
      lat,
      lon,
      CLOUDS_HIMAWARI_SUB_SATELLITE.longitudeDeg,
    );
    const ring = sampleCloudsRingQuality(lat, lon);
    let cls: string;
    if (msgQ > 0) cls = "msg";
    else if (himQ > 0) cls = "himawari";
    else if (ring.qualityU8 > 0) cls = "good-ring";
    else cls = "other";
    if (cls !== prev) {
      classes.push(cls);
      prev = cls;
    }
  }
  return classes.join(">");
}

describe("WEATHER-5.5.1 ring canonical identity grayscale", () => {
  beforeAll(() => {
    ensureGibsBand13ColorMapLut();
  });

  beforeEach(() => {
    setDevCloudsDisplayTransferOverride(null);
    setDevRingCalibrationOverride(null);
  });

  afterEach(() => {
    setDevRingCalibrationOverride(null);
    setDevCloudsDisplayTransferOverride(null);
  });

  it("uses identity grayscale as the production ring mapping", () => {
    expect(PRODUCTION_RING_CALIBRATION_ID).toBe("identity");
    expect(getActiveRingCalibration()).toBe("identity");
    expect(LEGACY_EUMET_RING_CANONICAL_IR_BLACK).toBe(56);
    expect(canonicalIR01FromEumetRingIr108Gray(0)).toBe(0);
    expect(canonicalIR01FromEumetRingIr108Gray(255)).toBe(1);
    expect(canonicalIR01FromEumetRingIr108Gray(56)).toBeCloseTo(56 / 255, 5);
    expect(canonicalIR01FromEumetRingIr108Gray(72)).toBeCloseTo(72 / 255, 5);
    expect(canonicalIR01FromProviderRgb("eumetRingIr108Gray", 120, 120, 120)).toBeCloseTo(
      120 / 255,
      5,
    );
    expect(cloudsSectorIrInterpretation(CLOUDS_SECTOR_EUMET_RING)).toBe(
      "eumetRingIr108Gray",
    );
    expect(CLOUD_HIGHLIGHT_TRANSFER_VERSION).toBe("wx55-ring-identity-v1");
    expect(CLOUD_HIGHLIGHT_TRANSFER_VERSION).not.toBe("wx54-gibs-gray-v3");
  });

  it("maps representative luma values to IR and confidence", () => {
    const samples: readonly {
      luma: number;
      ir: number;
      conf: number;
    }[] = [
      { luma: 72, ir: 0.282, conf: 0 },
      { luma: 90, ir: 0.353, conf: 0.07 },
      { luma: 120, ir: 0.471, conf: 0.33 },
      { luma: 160, ir: 0.627, conf: 0.73 },
      { luma: 220, ir: 0.863, conf: 0.97 },
    ];
    for (const s of samples) {
      const ir = canonicalIR01FromEumetRingIr108Gray(s.luma);
      expect(ir).toBeCloseTo(s.luma / 255, 5);
      expect(ir).toBeCloseTo(s.ir, 3);
      const conf = cloudConfidence01FromCanonicalIR(ir);
      if (s.conf === 0) {
        expect(conf).toBe(0);
        expect(ringConfidence(s.luma)).toBe(0);
      } else {
        expect(conf).toBeCloseTo(s.conf, 2);
        expect(ringConfidence(s.luma)).toBeCloseTo(conf, 2);
      }
    }
  });

  it("is monotone on luma 0–255", () => {
    let prevIr = -1;
    let prevConf = -1;
    for (let luma = 0; luma <= 255; luma++) {
      const ir = canonicalIR01FromEumetRingIr108Gray(luma);
      const conf = cloudConfidence01FromCanonicalIR(ir);
      expect(ir).toBeGreaterThanOrEqual(prevIr - 1e-12);
      expect(conf).toBeGreaterThanOrEqual(prevConf - 1e-12);
      prevIr = ir;
      prevConf = conf;
    }
  });

  it("keeps representative clear-sky luma below the confidence floor", () => {
    for (const luma of [60, 63, 70, 72, 73]) {
      expect(canonicalIR01FromEumetRingIr108Gray(luma)).toBeLessThan(0.3);
      expect(ringConfidence(luma)).toBe(0);
    }
  });

  it("lifts ordinary cloud that BP56 trapped below the floor", () => {
    setDevRingCalibrationOverride("bp56");
    expect(ringConfidence(90)).toBe(0);
    expect(ringConfidence(111)).toBe(0);
    expect(ringConfidence(114)).toBe(0);
    setDevRingCalibrationOverride(null);
    expect(ringConfidence(90)).toBeGreaterThan(0.05);
    expect(ringConfidence(111)).toBeGreaterThan(0.15);
    expect(ringConfidence(117)).toBeGreaterThan(0.2);
    expect(ringConfidence(117)).toBeLessThan(0.4);
    expect(ringConfidence(200)).toBeGreaterThanOrEqual(0.94);
  });

  it("matches Meteosat identity grayscale at the same luma", () => {
    for (const luma of [40, 63, 73, 111, 124, 160, 220]) {
      expect(canonicalIR01FromEumetRingIr108Gray(luma)).toBeCloseTo(
        canonicalIR01FromMeteosatIr108Gray(luma),
        10,
      );
      expect(highlightAlpha(luma, "eumetRingIr108Gray")).toBe(
        highlightAlpha(luma, "meteosatIr108Gray"),
      );
    }
  });

  it("does not change GIBS hybrid, chroma 8, or the shared confidence curve", () => {
    expect(GIBS_BAND13_NEAR_GRAY_CHROMA_MAX).toBe(8);
    const ir102 = canonicalIR01FromGibsRgb(102, 102, 102);
    expect(ir102).toBeLessThan(0.35);
    expect(ir102).toBeGreaterThan(0.24);
    expect(cloudConfidence01FromCanonicalIR(ir102)).toBe(0);
    expect(canonicalIR01FromGibsRgb(3, 162, 42)).toBeGreaterThan(0.55);
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

  it("keeps India Meteosat | good-ring | Himawari geography", () => {
    expect(indiaClassSequence(15)).toBe("msg>good-ring>himawari");
    expect(indiaClassSequence(25)).toBe("msg>good-ring>himawari");
    expect(indiaClassSequence(35)).toBe("msg>good-ring>himawari");
    expect(sampleCloudsRingQuality(-45, 70).qualityU8).toBeGreaterThan(0);
  });

  it("reduces ordinary ring→Himawari alpha step; convective-core step may remain", () => {
    const factory = DEFAULT_CLOUDS_LAYER_OPACITY;
    const ordinaryRing = 114;
    const ordinaryHimIR = canonicalIR01FromGibsRgb(173, 173, 173);
    const convectiveRing = 124;
    const convectiveHimIR = canonicalIR01FromGibsRgb(0, 149, 49);

    const step = (ringLuma: number, himIR: number, cal: "identity" | "bp56") => {
      setDevRingCalibrationOverride(cal === "identity" ? null : "bp56");
      const left = paintedAlpha(highlightAlpha(ringLuma, "eumetRingIr108Gray"));
      const right = cloudConfidence01FromCanonicalIR(himIR) * factory * 255;
      setDevRingCalibrationOverride(null);
      return { left, right, step: right - left };
    };

    const ordinaryBp56 = step(ordinaryRing, ordinaryHimIR, "bp56");
    const ordinaryId = step(ordinaryRing, ordinaryHimIR, "identity");
    expect(ordinaryBp56.left).toBe(0);
    expect(ordinaryId.left).toBeGreaterThan(ordinaryBp56.left);
    expect(Math.abs(ordinaryId.step)).toBeLessThan(Math.abs(ordinaryBp56.step));

    const convBp56 = step(convectiveRing, convectiveHimIR, "bp56");
    const convId = step(convectiveRing, convectiveHimIR, "identity");
    expect(convId.right).toBeGreaterThan(70);
    expect(Math.abs(convId.step)).toBeGreaterThan(30);
    expect(convId.right).toBeCloseTo(convBp56.right, 5);
  });

  it("SIO luma ~111 is no longer forced to confidence 0", () => {
    setDevRingCalibrationOverride("bp56");
    expect(ringConfidence(111)).toBe(0);
    setDevRingCalibrationOverride(null);
    const sio = ringConfidence(111);
    expect(sio).toBeGreaterThan(0.15);
    expect(sio).toBeLessThan(0.35);
  });

  it("Antarctic cold-surface IR may rise; warm polar ocean stays clear", () => {
    setDevRingCalibrationOverride("bp56");
    const antBp56 = ringConfidence(203);
    setDevRingCalibrationOverride(null);
    const antId = ringConfidence(203);
    expect(antBp56).toBeGreaterThan(0.8);
    expect(antId).toBeGreaterThan(antBp56);
    expect(ringConfidence(70)).toBe(0);
    expect(ringConfidence(73)).toBe(0);
  });

  it("winner, coverage, quality, and TIMES are identical across calibrations", () => {
    const width = 4;
    const height = 1;
    const ringRaw = new Uint8Array([
      70, 70, 70, 255, 114, 114, 114, 255, 124, 124, 124, 255, 40, 40, 40, 0,
    ]);
    const himRaw = new Uint8Array([
      31, 31, 31, 255, 134, 134, 134, 0, 0, 149, 49, 255, 173, 173, 173, 255,
    ]);
    const msgRaw = new Uint8Array([
      32, 32, 32, 255, 40, 40, 40, 0, 80, 80, 80, 0, 90, 90, 90, 0,
    ]);
    const ringQ = new Uint8Array([255, 255, 255, 0]);
    const himQ = new Uint8Array([0, 0, 2, 180]);
    const msgQ = new Uint8Array([200, 0, 0, 0]);
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_METEOSAT,
      CLOUDS_SECTOR_HIMAWARI,
    ];

    const identityWinners = resolveCloudsCompositeWinnerSectorIds(
      [
        layerFromProvider(CLOUDS_SECTOR_EUMET_RING, ringRaw, width, height, ringQ, RING_MS),
        layerFromProvider(CLOUDS_SECTOR_METEOSAT, msgRaw, width, height, msgQ, MSG_MS),
        layerFromProvider(CLOUDS_SECTOR_HIMAWARI, himRaw, width, height, himQ, HIM_MS),
      ],
      order,
      PRODUCT_MS,
    )!;

    setDevRingCalibrationOverride("bp56");
    const bp56Winners = resolveCloudsCompositeWinnerSectorIds(
      [
        layerFromProvider(CLOUDS_SECTOR_EUMET_RING, ringRaw, width, height, ringQ, RING_MS),
        layerFromProvider(CLOUDS_SECTOR_METEOSAT, msgRaw, width, height, msgQ, MSG_MS),
        layerFromProvider(CLOUDS_SECTOR_HIMAWARI, himRaw, width, height, himQ, HIM_MS),
      ],
      order,
      PRODUCT_MS,
    )!;
    setDevRingCalibrationOverride(null);

    expect(Array.from(identityWinners.winners)).toEqual(Array.from(bp56Winners.winners));

    const identityPlanes = materializeCloudsSourcePlanes(ringRaw, "eumetRingIr108Gray");
    setDevRingCalibrationOverride("bp56");
    const bp56Planes = materializeCloudsSourcePlanes(ringRaw, "eumetRingIr108Gray");
    setDevRingCalibrationOverride(null);
    expect(Array.from(identityPlanes.coverageMask)).toEqual(
      Array.from(bp56Planes.coverageMask),
    );
    expect(Array.from(identityPlanes.coverageMask)).toEqual(
      Array.from(extractCloudsCoverageMask(ringRaw)),
    );

    const qA = getCloudsQualityPlane(CLOUDS_SECTOR_EUMET_RING, 32, 16)!;
    const qB = getCloudsQualityPlane(CLOUDS_SECTOR_EUMET_RING, 32, 16)!;
    expect(qA).toBe(qB);
    const eastQ = getCloudsQualityPlane(CLOUDS_SECTOR_GOES_EAST, 32, 16)!;
    expect(eastQ).toBe(getCloudsQualityPlane(CLOUDS_SECTOR_GOES_EAST, 32, 16)!);

    const composed = compositeCloudHighlightLayers(
      [
        layerFromProvider(CLOUDS_SECTOR_EUMET_RING, ringRaw, width, height, ringQ, RING_MS),
        layerFromProvider(CLOUDS_SECTOR_METEOSAT, msgRaw, width, height, msgQ, MSG_MS),
        layerFromProvider(CLOUDS_SECTOR_HIMAWARI, himRaw, width, height, himQ, HIM_MS),
      ],
      order,
      PRODUCT_MS,
    )!;
    expect(composed.rgba[0]).toBe(CLOUD_HIGHLIGHT_RGB.r);
    const identityTimes = [
      RING_MS,
      MSG_MS,
      HIM_MS,
    ];
    setDevRingCalibrationOverride("bp56");
    const bp56Times = [
      layerFromProvider(CLOUDS_SECTOR_EUMET_RING, ringRaw, width, height, ringQ, RING_MS)
        .observationTimeMs,
      layerFromProvider(CLOUDS_SECTOR_METEOSAT, msgRaw, width, height, msgQ, MSG_MS)
        .observationTimeMs,
      layerFromProvider(CLOUDS_SECTOR_HIMAWARI, himRaw, width, height, himQ, HIM_MS)
        .observationTimeMs,
    ];
    setDevRingCalibrationOverride(null);
    expect(bp56Times).toEqual(identityTimes);
    expect(new Set([...identityTimes, EAST_MS]).size).toBe(4);
    expect(RING_MS).not.toBe(MSG_MS);
    expect(MSG_MS).not.toBe(HIM_MS);
    expect(HIM_MS).not.toBe(EAST_MS);
  });

  it("bumps the cache version and isolates DEV BP56", () => {
    expect(activeCloudsTransferVersion()).toBe("wx55-ring-identity-v1");
    setDevRingCalibrationOverride("bp56");
    expect(activeCloudsTransferVersion()).toBe(LEGACY_RING_CALIBRATION_TRANSFER_VERSION);
    expect(LEGACY_RING_CALIBRATION_TRANSFER_VERSION).toBe("wx55-ring-bp56");
    expect(canonicalIR01FromEumetRingIr108Gray(73)).toBeCloseTo((73 - 56) / 199, 5);
    setDevRingCalibrationOverride(null);
    expect(parseRingCalibrationId("identity")).toBe("identity");
    expect(parseRingCalibrationId("bp0")).toBe("identity");
    expect(parseRingCalibrationId("production")).toBe("identity");
    expect(parseRingCalibrationId("bp56")).toBe("bp56");
    expect(parseRingCalibrationId("legacy")).toBe("bp56");
    expect(parseRingCalibrationId("nope")).toBeNull();
  });

  it("identity ring mapping stays an O(pixels) grayscale transform", () => {
    const width = 512;
    const height = 256;
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      const g = i % 256;
      rgba[o] = g;
      rgba[o + 1] = g;
      rgba[o + 2] = g;
      rgba[o + 3] = 255;
    }
    const t0 = performance.now();
    applyCloudHighlightTransfer(rgba, { interpretation: "eumetRingIr108Gray" });
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
