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
  CLOUD_HIGHLIGHT_RGB,
  CLOUD_HIGHLIGHT_TRANSFER_VERSION,
} from "./cloudHighlightTransfer";
import {
  extractCloudsCoverageMask,
  isCloudsAuthoritativeClear,
  materializeCloudsSourcePlanes,
} from "./cloudCoverage";
import {
  CLOUDS_GEO_RADIUS_RATIO,
  CLOUDS_QUALITY_ZENITH_FULL_DEG,
  CLOUDS_QUALITY_ZENITH_ZERO_DEG,
  equirectPixelCenterLatLonDeg,
  geostationaryQuality01,
  geostationaryQualityU8,
  geostationaryViewingZenithDeg,
  getCloudsQualityPlane,
  wrapLongitudeDeltaDeg,
} from "./cloudQuality";
import {
  buildCloudsCompositeMeta,
  cloudsCompositePaintOrder,
  cloudsOverlapCadenceThresholdMs,
  compositeCloudHighlightLayers,
  resolveCloudsCompositeWinnerSectorIds,
  selectCloudsPaintableComponents,
  type CloudsHighlightLayer,
} from "./cloudsComposite";
import { CLOUDS_GIBS_HEIGHT_PX, CLOUDS_GIBS_WIDTH_PX } from "./cloudsGibsWms";
import {
  mapXFromLongitudeDeg,
  mapYFromLatitudeDeg,
} from "../core/equirectangularProjection";
import {
  CLOUDS_GOES_EAST_SUB_SATELLITE,
  CLOUDS_GOES_WEST_SUB_SATELLITE,
  CLOUDS_HIMAWARI_SUB_SATELLITE,
  CLOUDS_METEOSAT_SUB_SATELLITE,
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_METEOSAT,
  CLOUDS_SECTOR_SPECS,
  type CloudsSectorId,
} from "./cloudsSectors";

const PRODUCT_MS = Date.parse("2023-11-14T21:00:00Z");
const EAST_MS = Date.parse("2023-11-14T20:40:00Z");
const MSG_MS = Date.parse("2023-11-14T20:55:00Z");
const NATL = { latitudeDeg: 45, longitudeDeg: -71.14 } as const;

function rgbaPixel(alpha: number): { r: number; g: number; b: number; a: number } {
  return {
    r: CLOUD_HIGHLIGHT_RGB.r,
    g: CLOUD_HIGHLIGHT_RGB.g,
    b: CLOUD_HIGHLIGHT_RGB.b,
    a: alpha,
  };
}

function fillLayer(
  sectorId: CloudsSectorId,
  width: number,
  height: number,
  paint: (i: number) => {
    coverage: number;
    alpha: number;
    quality?: number;
  },
  observationTimeMs?: number,
): CloudsHighlightLayer {
  const n = width * height;
  const rgba = new Uint8Array(n * 4);
  const coverageMask = new Uint8Array(n);
  const qualityWeight = new Uint8Array(n);
  let anyQuality = false;
  for (let i = 0; i < n; i++) {
    const p = paint(i);
    coverageMask[i] = p.coverage;
    if (p.quality !== undefined) {
      qualityWeight[i] = p.quality;
      anyQuality = true;
    } else {
      qualityWeight[i] = 255;
    }
    const o = i * 4;
    if (p.alpha > 0) {
      const c = rgbaPixel(p.alpha);
      rgba[o] = c.r;
      rgba[o + 1] = c.g;
      rgba[o + 2] = c.b;
    }
    rgba[o + 3] = p.alpha;
  }
  return {
    sectorId,
    width,
    height,
    rgba,
    coverageMask,
    qualityWeight: anyQuality ? qualityWeight : undefined,
    observationTimeMs,
  };
}

function composedAlpha(
  layers: readonly CloudsHighlightLayer[],
  order: readonly CloudsSectorId[],
  productUtcMs = PRODUCT_MS,
): number {
  return compositeCloudHighlightLayers(layers, order, productUtcMs)!.rgba[3]!;
}

describe("WEATHER-4.3 coverage vs quality", () => {
  it("valid coverage + q=0 remains coverage, and quality does not invent coverage", () => {
    const provider = new Uint8Array([40, 40, 40, 255, 200, 200, 200, 0]);
    const mask = extractCloudsCoverageMask(provider);
    expect(mask[0]).toBe(255);
    expect(mask[1]).toBe(0);
    const q0 = geostationaryQualityU8(45, -71.14, CLOUDS_METEOSAT_SUB_SATELLITE.longitudeDeg);
    expect(q0).toBe(0);
    expect(isCloudsAuthoritativeClear(255, 0)).toBe(true);
    expect(isCloudsAuthoritativeClear(0, 0)).toBe(false);
    const planes = materializeCloudsSourcePlanes(provider, "meteosatIr108Gray");
    expect(planes.coverageMask[0]).toBe(255);
    expect(planes.coverageMask[1]).toBe(0);
  });

  it("q=0 only source still paints", () => {
    const limb = fillLayer(CLOUDS_SECTOR_METEOSAT, 1, 1, () => ({
      coverage: 255,
      alpha: 180,
      quality: 0,
    }));
    const out = compositeCloudHighlightLayers([limb], [CLOUDS_SECTOR_METEOSAT]);
    expect(out!.rgba[3]).toBe(180);
    expect(out!.ringOwnsPixels).toBe(false);
  });

  it("valid-clear q=0 remains coverage; WEATHER-5.2 lets a covering ring own the pixel", () => {
    const ring = fillLayer(CLOUDS_SECTOR_EUMET_RING, 1, 1, () => ({
      coverage: 255,
      alpha: 200,
    }));
    const regional = fillLayer(CLOUDS_SECTOR_GOES_EAST, 1, 1, () => ({
      coverage: 255,
      alpha: 0,
      quality: 0,
    }));
    expect(regional.coverageMask[0]).toBe(255);
    expect(isCloudsAuthoritativeClear(regional.coverageMask[0]!, regional.rgba[3]!)).toBe(
      true,
    );
    const out = compositeCloudHighlightLayers(
      [ring, regional],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_EAST],
    );
    expect(out!.rgba[3]).toBe(200);
    expect(out!.ringOwnsPixels).toBe(true);
  });

  it("no-data does not become valid because quality exists", () => {
    const ring = fillLayer(CLOUDS_SECTOR_EUMET_RING, 1, 1, () => ({
      coverage: 255,
      alpha: 160,
    }));
    const regional = fillLayer(CLOUDS_SECTOR_GOES_EAST, 1, 1, () => ({
      coverage: 0,
      alpha: 0,
      quality: 255,
    }));
    const out = compositeCloudHighlightLayers(
      [ring, regional],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_EAST],
    );
    expect(out!.rgba[3]).toBe(160);
  });
});

describe("WEATHER-4.3 North Atlantic regression", () => {
  const eastQ = geostationaryQualityU8(
    NATL.latitudeDeg,
    NATL.longitudeDeg,
    CLOUDS_GOES_EAST_SUB_SATELLITE.longitudeDeg,
  );
  const msgQ = geostationaryQualityU8(
    NATL.latitudeDeg,
    NATL.longitudeDeg,
    CLOUDS_METEOSAT_SUB_SATELLITE.longitudeDeg,
  );

  it("GOES-East near-good view beats extreme-limb Meteosat when MSG is one cadence newer", () => {
    expect(eastQ).toBe(255);
    expect(msgQ).toBe(0);
    const eastZenith = geostationaryViewingZenithDeg(
      NATL.latitudeDeg,
      NATL.longitudeDeg,
      CLOUDS_GOES_EAST_SUB_SATELLITE.longitudeDeg,
    );
    const msgZenith = geostationaryViewingZenithDeg(
      NATL.latitudeDeg,
      NATL.longitudeDeg,
      CLOUDS_METEOSAT_SUB_SATELLITE.longitudeDeg,
    );
    expect(eastZenith).toBeGreaterThan(50);
    expect(eastZenith).toBeLessThan(55);
    expect(msgZenith).toBeGreaterThan(84);
    expect(msgZenith).toBeLessThan(87);

    const cadence = cloudsOverlapCadenceThresholdMs(
      CLOUDS_SECTOR_GOES_EAST,
      CLOUDS_SECTOR_METEOSAT,
    );
    expect(cadence).toBe(15 * 60 * 1000);
    expect(MSG_MS - EAST_MS).toBe(cadence);

    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 47, quality: eastQ }),
      EAST_MS,
    );
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 226, quality: msgQ }),
      MSG_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT];
    expect(composedAlpha([east, msg], order)).toBe(47);
    const winners = resolveCloudsCompositeWinnerSectorIds([east, msg], order, PRODUCT_MS);
    expect(order[winners!.winners[0]!]).toBe(CLOUDS_SECTOR_GOES_EAST);
  });

  it("MSG western rim is not selected where East has substantially better geometry", () => {
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 80, quality: 255 }),
      EAST_MS,
    );
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 255, quality: 0 }),
      MSG_MS,
    );
    expect(
      composedAlpha(
        [east, msg],
        [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT],
      ),
    ).toBe(80);
  });
});

describe("WEATHER-4.3 freshness", () => {
  it("fresher source wins when qualities are comparable and cadence requires it", () => {
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 80, quality: 128 }),
      EAST_MS,
    );
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 200, quality: 120 }),
      MSG_MS,
    );
    expect(
      composedAlpha(
        [east, msg],
        [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT],
      ),
    ).toBe(200);
  });

  it("heterogeneous observation times remain; no common-TIME synchronization", () => {
    const painted = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: EAST_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_METEOSAT,
          observationTimeMs: MSG_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    expect(painted.map((c) => c.observationTimeMs).sort()).toEqual([EAST_MS, MSG_MS]);
    const meta = buildCloudsCompositeMeta(painted);
    expect(meta!.newestObservationTimeMs).toBe(MSG_MS);
    expect(meta!.oldestObservationTimeMs).toBe(EAST_MS);
    expect(meta!.newestObservationTimeMs).not.toBe(meta!.oldestObservationTimeMs);
    const order = cloudsCompositePaintOrder(painted, PRODUCT_MS);
    expect(order).toContain(CLOUDS_SECTOR_GOES_EAST);
    expect(order).toContain(CLOUDS_SECTOR_METEOSAT);
  });

  it("exactly one cadence difference still prefers the fresher usable source", () => {
    const hyst = cloudsOverlapCadenceThresholdMs(
      CLOUDS_SECTOR_GOES_EAST,
      CLOUDS_SECTOR_METEOSAT,
    );
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 10, quality: 200 }),
      PRODUCT_MS - hyst,
    );
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 20, quality: 190 }),
      PRODUCT_MS,
    );
    expect(
      composedAlpha([east, msg], [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT]),
    ).toBe(20);
    const justInside = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 10, quality: 200 }),
      PRODUCT_MS - (hyst - 1),
    );
    expect(
      composedAlpha(
        [justInside, msg],
        [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT],
      ),
    ).toBe(10);
  });
});

describe("WEATHER-4.3 crossover", () => {
  it("higher quality wins inside the comparable-freshness band", () => {
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 30, quality: 200 }),
      PRODUCT_MS - 60_000,
    );
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 90, quality: 80 }),
      PRODUCT_MS,
    );
    expect(MSG_MS - EAST_MS).toBeGreaterThan(0);
    expect(
      composedAlpha(
        [east, msg],
        [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT],
        PRODUCT_MS,
      ),
    ).toBe(30);
  });

  it("quality-equal longitude at 45°N emerges from geometry, not a hardcoded meridian", () => {
    let bestLon = 0;
    let bestDiff = Infinity;
    for (let lon = -70; lon <= -10; lon += 0.05) {
      const qE = geostationaryQuality01(
        geostationaryViewingZenithDeg(45, lon, CLOUDS_GOES_EAST_SUB_SATELLITE.longitudeDeg),
      );
      const qM = geostationaryQuality01(
        geostationaryViewingZenithDeg(45, lon, CLOUDS_METEOSAT_SUB_SATELLITE.longitudeDeg),
      );
      const diff = Math.abs(qE - qM);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestLon = lon;
      }
    }
    expect(bestDiff).toBeLessThan(0.02);
    expect(bestLon).toBeGreaterThan(-45);
    expect(bestLon).toBeLessThan(-30);
    expect(bestLon).not.toBeCloseTo(-71.14, 0);
  });

  it("stable provider order breaks genuine ties; identical snapshots do not thrash", () => {
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 40, quality: 100 }),
      PRODUCT_MS,
    );
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 70, quality: 100 }),
      PRODUCT_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT];
    const first = compositeCloudHighlightLayers([east, msg], order, PRODUCT_MS)!;
    const second = compositeCloudHighlightLayers([east, msg], order, PRODUCT_MS)!;
    expect(first.rgba[3]).toBe(70);
    expect(Array.from(second.rgba)).toEqual(Array.from(first.rgba));
    const winnersA = resolveCloudsCompositeWinnerSectorIds([east, msg], order, PRODUCT_MS)!;
    const winnersB = resolveCloudsCompositeWinnerSectorIds([east, msg], order, PRODUCT_MS)!;
    expect(Array.from(winnersA.winners)).toEqual(Array.from(winnersB.winners));
  });
});

describe("WEATHER-4.3 ring backstop", () => {
  it("ring fills actual regional no-data", () => {
    const ring = fillLayer(CLOUDS_SECTOR_EUMET_RING, 2, 1, () => ({
      coverage: 255,
      alpha: 150,
      quality: 0,
    }));
    const regional = fillLayer(CLOUDS_SECTOR_GOES_EAST, 2, 1, (i) => ({
      coverage: i === 0 ? 255 : 0,
      alpha: 90,
      quality: 255,
    }));
    const out = compositeCloudHighlightLayers(
      [ring, regional],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_EAST],
    )!;
    expect(out.rgba[3]).toBe(90);
    expect(out.rgba[7]).toBe(150);
  });

  it("ring does not appear beneath valid q>0 regional coverage; q=0 yields ring when available", () => {
    const ring = fillLayer(CLOUDS_SECTOR_EUMET_RING, 1, 1, () => ({
      coverage: 255,
      alpha: 200,
    }));
    const regionalQ0 = fillLayer(CLOUDS_SECTOR_METEOSAT, 1, 1, () => ({
      coverage: 255,
      alpha: 0,
      quality: 0,
    }));
    const q0Out = compositeCloudHighlightLayers(
      [ring, regionalQ0],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT],
    )!;
    expect(q0Out.rgba[3]).toBe(200);
    expect(regionalQ0.coverageMask[0]).toBe(255);
    const regionalUsable = fillLayer(CLOUDS_SECTOR_METEOSAT, 1, 1, () => ({
      coverage: 255,
      alpha: 0,
      quality: 40,
    }));
    const usableOut = compositeCloudHighlightLayers(
      [ring, regionalUsable],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT],
    )!;
    expect(usableOut.rgba[3]).toBe(0);
    expect(isCloudsAuthoritativeClear(regionalUsable.coverageMask[0]!, regionalUsable.rgba[3]!)).toBe(
      true,
    );
  });
});

describe("WEATHER-4.3 geometry", () => {
  it("is finite and deterministic at representative global locations", () => {
    const samples: Array<readonly [number, number]> = [
      [0, 0],
      [45, -71.14],
      [80, 0],
      [-80, 140.7],
      [0, 180],
      [0, -180],
      [89, 10],
      [-89, -170],
      [0, -137],
      [20, 140.7],
    ];
    for (const ssp of [
      CLOUDS_GOES_EAST_SUB_SATELLITE,
      CLOUDS_GOES_WEST_SUB_SATELLITE,
      CLOUDS_METEOSAT_SUB_SATELLITE,
      CLOUDS_HIMAWARI_SUB_SATELLITE,
    ]) {
      for (const [lat, lon] of samples) {
        const theta = geostationaryViewingZenithDeg(lat, lon, ssp.longitudeDeg);
        const q = geostationaryQuality01(theta);
        const u8 = geostationaryQualityU8(lat, lon, ssp.longitudeDeg);
        expect(Number.isFinite(theta)).toBe(true);
        expect(Number.isFinite(q)).toBe(true);
        expect(theta).toBeGreaterThanOrEqual(0);
        expect(theta).toBeLessThanOrEqual(90);
        expect(q).toBeGreaterThanOrEqual(0);
        expect(q).toBeLessThanOrEqual(1);
        expect(u8).toBeGreaterThanOrEqual(0);
        expect(u8).toBeLessThanOrEqual(255);
      }
    }
  });

  it("q=1 near favorable viewing geometry and q=0 at and beyond 75°", () => {
    expect(
      geostationaryQualityU8(0, -75.2, CLOUDS_GOES_EAST_SUB_SATELLITE.longitudeDeg),
    ).toBe(255);
    expect(
      geostationaryQualityU8(0, 0, CLOUDS_METEOSAT_SUB_SATELLITE.longitudeDeg),
    ).toBe(255);
    expect(geostationaryQuality01(CLOUDS_QUALITY_ZENITH_FULL_DEG)).toBe(1);
    expect(geostationaryQuality01(CLOUDS_QUALITY_ZENITH_ZERO_DEG)).toBe(0);
    expect(geostationaryQuality01(90)).toBe(0);
    const mid = geostationaryQuality01(65);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(geostationaryQuality01(60)).toBeGreaterThan(geostationaryQuality01(70));
  });

  it("limb and dateline behavior stay finite; wrap is short-arc", () => {
    const limbCentral = Math.acos(1 / CLOUDS_GEO_RADIUS_RATIO) * (180 / Math.PI);
    expect(limbCentral).toBeGreaterThan(81);
    expect(limbCentral).toBeLessThan(82);
    expect(wrapLongitudeDeltaDeg(180, 0)).toBe(-180);
    expect(wrapLongitudeDeltaDeg(-180, 140.7)).toBeCloseTo(
      wrapLongitudeDeltaDeg(180, 140.7),
      10,
    );
    const westAtDateLine = geostationaryViewingZenithDeg(
      0,
      180,
      CLOUDS_GOES_WEST_SUB_SATELLITE.longitudeDeg,
    );
    const himaAtDateLine = geostationaryViewingZenithDeg(
      0,
      180,
      CLOUDS_HIMAWARI_SUB_SATELLITE.longitudeDeg,
    );
    expect(Number.isFinite(westAtDateLine)).toBe(true);
    expect(Number.isFinite(himaAtDateLine)).toBe(true);
    expect(geostationaryQualityU8(85, 0, 0)).toBe(0);
  });

  it("production SSP authorities match the consumed products", () => {
    expect(CLOUDS_SECTOR_SPECS[CLOUDS_SECTOR_GOES_EAST].geoSubSatellite).toEqual(
      CLOUDS_GOES_EAST_SUB_SATELLITE,
    );
    expect(CLOUDS_GOES_EAST_SUB_SATELLITE.longitudeDeg).toBe(-75.2);
    expect(CLOUDS_GOES_WEST_SUB_SATELLITE.longitudeDeg).toBe(-137);
    expect(CLOUDS_METEOSAT_SUB_SATELLITE.longitudeDeg).toBe(0);
    expect(CLOUDS_HIMAWARI_SUB_SATELLITE.longitudeDeg).toBe(140.7);
    expect(CLOUDS_SECTOR_SPECS[CLOUDS_SECTOR_EUMET_RING].geoSubSatellite).toBeUndefined();
  });

  it("cached 2048×1024 quality plane samples NATL correctly and stays Earth-fixed", () => {
    const t0 = performance.now();
    const east = getCloudsQualityPlane(
      CLOUDS_SECTOR_GOES_EAST,
      CLOUDS_GIBS_WIDTH_PX,
      CLOUDS_GIBS_HEIGHT_PX,
    );
    const msg = getCloudsQualityPlane(
      CLOUDS_SECTOR_METEOSAT,
      CLOUDS_GIBS_WIDTH_PX,
      CLOUDS_GIBS_HEIGHT_PX,
    );
    const dt = performance.now() - t0;
    expect(east).not.toBeNull();
    expect(msg).not.toBeNull();
    expect(east!.byteLength).toBe(CLOUDS_GIBS_WIDTH_PX * CLOUDS_GIBS_HEIGHT_PX);
    const again = getCloudsQualityPlane(
      CLOUDS_SECTOR_GOES_EAST,
      CLOUDS_GIBS_WIDTH_PX,
      CLOUDS_GIBS_HEIGHT_PX,
    );
    expect(again).toBe(east);
    expect(dt).toBeLessThan(2000);

    const x = Math.min(
      CLOUDS_GIBS_WIDTH_PX - 1,
      Math.max(0, Math.floor(mapXFromLongitudeDeg(NATL.longitudeDeg, CLOUDS_GIBS_WIDTH_PX))),
    );
    const y = Math.min(
      CLOUDS_GIBS_HEIGHT_PX - 1,
      Math.max(0, Math.floor(mapYFromLatitudeDeg(NATL.latitudeDeg, CLOUDS_GIBS_HEIGHT_PX))),
    );
    const i = y * CLOUDS_GIBS_WIDTH_PX + x;
    const ll = equirectPixelCenterLatLonDeg(x, y, CLOUDS_GIBS_WIDTH_PX, CLOUDS_GIBS_HEIGHT_PX);
    expect(ll.latitudeDeg).toBeCloseTo(NATL.latitudeDeg, 0);
    expect(ll.longitudeDeg).toBeCloseTo(NATL.longitudeDeg, 0);
    expect(east![i]).toBe(255);
    expect(msg![i]).toBe(0);
  });
});

describe("WEATHER-4.3 other overlaps", () => {
  it("GOES-West / GOES-East quality-equal region is not either SSP", () => {
    let bestLon = 0;
    let bestDiff = Infinity;
    for (let lon = -130; lon <= -80; lon += 0.2) {
      const qW = geostationaryQuality01(
        geostationaryViewingZenithDeg(30, lon, CLOUDS_GOES_WEST_SUB_SATELLITE.longitudeDeg),
      );
      const qE = geostationaryQuality01(
        geostationaryViewingZenithDeg(30, lon, CLOUDS_GOES_EAST_SUB_SATELLITE.longitudeDeg),
      );
      const diff = Math.abs(qW - qE);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestLon = lon;
      }
    }
    expect(bestDiff).toBeLessThan(0.05);
    expect(bestLon).toBeGreaterThan(-120);
    expect(bestLon).toBeLessThan(-90);
  });

  it("Himawari / GOES-West dateline overlap prefers usable quality over the far limb", () => {
    const lon = 180;
    const lat = 20;
    const qW = geostationaryQualityU8(lat, lon, CLOUDS_GOES_WEST_SUB_SATELLITE.longitudeDeg);
    const qH = geostationaryQualityU8(lat, lon, CLOUDS_HIMAWARI_SUB_SATELLITE.longitudeDeg);
    expect(qW).toBeGreaterThan(0);
    expect(qH).toBeGreaterThan(0);
    const west = fillLayer(
      CLOUDS_SECTOR_GOES_WEST,
      1,
      1,
      () => ({ coverage: 255, alpha: 50, quality: 0 }),
      PRODUCT_MS,
    );
    const hima = fillLayer(
      CLOUDS_SECTOR_HIMAWARI,
      1,
      1,
      () => ({ coverage: 255, alpha: 90, quality: 200 }),
      PRODUCT_MS - 10 * 60 * 1000,
    );
    expect(
      composedAlpha(
        [west, hima],
        [CLOUDS_SECTOR_GOES_WEST, CLOUDS_SECTOR_HIMAWARI],
      ),
    ).toBe(90);
  });
});

describe("WEATHER-4.3 presentation regressions", () => {
  it("keeps restrained cloud RGB; WEATHER-5.1 owns the transfer version", () => {
    expect(CLOUD_HIGHLIGHT_RGB).toEqual({ r: 248, g: 250, b: 252 });
    expect(CLOUD_HIGHLIGHT_TRANSFER_VERSION).toBe("wx54-gibs-gray-v3");
  });
});
