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
import { extractCloudsCoverageMask } from "./cloudCoverage";
import {
  geostationaryQualityU8,
  geostationaryViewingZenithDeg,
  getCloudsQualityPlane,
  getCloudsRingComponentPlane,
  sampleCloudsRingQuality,
} from "./cloudQuality";
import {
  CLOUDS_COMPOSITE_AUTHORITY_VERSION,
  buildCloudsCompositeMeta,
  cloudsCompositePaintOrder,
  compositeCloudHighlightLayers,
  resolveCloudsCompositeWinnerSectorIds,
  resolveCloudsRegionalOnlyWinnerSectorIds,
  selectCloudsPaintableComponents,
  selectCloudsStatusComponents,
  type CloudsHighlightLayer,
} from "./cloudsComposite";
import { CLOUDS_GIBS_HEIGHT_PX, CLOUDS_GIBS_WIDTH_PX } from "./cloudsGibsWms";
import {
  CLOUDS_GOES_EAST_SUB_SATELLITE,
  CLOUDS_GOES_WEST_SUB_SATELLITE,
  CLOUDS_HIMAWARI_SUB_SATELLITE,
  CLOUDS_IODC_SUB_SATELLITE,
  CLOUDS_METEOSAT_SUB_SATELLITE,
  CLOUDS_RING_COMPONENT_GEOMETRY_VERSION,
  CLOUDS_RING_COMPONENT_SPECS,
  CLOUDS_RING_QUALITY_MODEL_VERSION,
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_METEOSAT,
  CLOUDS_SECTOR_SPECS,
  type CloudsSectorId,
} from "./cloudsSectors";
import { GLOBAL_CLOUDS_IR_SOURCE_ID, getDynamicEquirectSourceCatalogEntry } from "./dynamicEquirectSourceCatalog";

const PRODUCT_MS = Date.parse("2023-11-14T21:00:00Z");
const EAST_MS = Date.parse("2023-11-14T20:40:00Z");
const MSG_MS = Date.parse("2023-11-14T20:55:00Z");
const HIM_MS = Date.parse("2023-11-14T20:30:00Z");
const RING_MS = Date.parse("2023-11-14T19:00:00Z");
const WEST_MS = Date.parse("2023-11-14T20:40:00Z");

function fillLayer(
  sectorId: CloudsSectorId,
  width: number,
  height: number,
  paint: (i: number, x: number, y: number) => {
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
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const p = paint(i, x, y);
      coverageMask[i] = p.coverage;
      if (p.quality !== undefined) {
        qualityWeight[i] = p.quality;
        anyQuality = true;
      } else {
        qualityWeight[i] = 255;
      }
      const o = i * 4;
      if (p.alpha > 0) {
        rgba[o] = CLOUD_HIGHLIGHT_RGB.r;
        rgba[o + 1] = CLOUD_HIGHLIGHT_RGB.g;
        rgba[o + 2] = CLOUD_HIGHLIGHT_RGB.b;
      }
      rgba[o + 3] = p.alpha;
    }
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

function winnerId(
  layers: readonly CloudsHighlightLayer[],
  order: readonly CloudsSectorId[],
  productUtcMs = PRODUCT_MS,
): CloudsSectorId | null {
  const resolved = resolveCloudsCompositeWinnerSectorIds(layers, order, productUtcMs);
  const wi = resolved?.winners[0] ?? -1;
  return wi >= 0 ? order[wi]! : null;
}

function snapshotPlanes(layer: CloudsHighlightLayer): {
  coverage: string;
  quality: string;
  signal: string;
} {
  return {
    coverage: Buffer.from(layer.coverageMask).toString("hex"),
    quality: Buffer.from(layer.qualityWeight ?? new Uint8Array()).toString("hex"),
    signal: Buffer.from(layer.rgba).toString("hex"),
  };
}

describe("WEATHER-5.3.1 ring component SSPs", () => {
  it("reuses regional SSPs and centralizes IODC 45.5°E", () => {
    expect(CLOUDS_IODC_SUB_SATELLITE.longitudeDeg).toBe(45.5);
    expect(CLOUDS_IODC_SUB_SATELLITE.satellite).toBe("Meteosat-9");
    const byId = Object.fromEntries(CLOUDS_RING_COMPONENT_SPECS.map((c) => [c.id, c]));
    expect(byId["msg-0"]?.geoSubSatellite).toBe(CLOUDS_METEOSAT_SUB_SATELLITE);
    expect(byId["iodc-45.5"]?.geoSubSatellite).toBe(CLOUDS_IODC_SUB_SATELLITE);
    expect(byId["goes-east"]?.geoSubSatellite).toBe(CLOUDS_GOES_EAST_SUB_SATELLITE);
    expect(byId["goes-west"]?.geoSubSatellite).toBe(CLOUDS_GOES_WEST_SUB_SATELLITE);
    expect(byId.himawari?.geoSubSatellite).toBe(CLOUDS_HIMAWARI_SUB_SATELLITE);
    expect(CLOUDS_SECTOR_SPECS[CLOUDS_SECTOR_EUMET_RING].geoSubSatellite).toBeUndefined();
    expect(CLOUDS_RING_QUALITY_MODEL_VERSION).toBe("wx53-ring-geo-q1");
    expect(CLOUDS_RING_COMPONENT_GEOMETRY_VERSION).toBe("geo-ring-ssp-v1");
    expect(CLOUDS_COMPOSITE_AUTHORITY_VERSION).toBe("wx53-ring-geo-q1");
  });
});

describe("WEATHER-5.3.1 good ring", () => {
  it("ring q>0 + only q=0 regional → ring", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 180, quality: 0 }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 50, quality: 180 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT];
    expect(winnerId([msg, ring], order)).toBe(CLOUDS_SECTOR_EUMET_RING);
    expect(compositeCloudHighlightLayers([msg, ring], order, PRODUCT_MS)!.rgba[3]).toBe(50);
  });
});

describe("WEATHER-5.3.1 poor ring vs q=0 regional", () => {
  it("ring q=0 + q=0 regional → regional", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 180, quality: 0 }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 50, quality: 0 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT];
    expect(winnerId([msg, ring], order)).toBe(CLOUDS_SECTOR_METEOSAT);
    expect(compositeCloudHighlightLayers([msg, ring], order, PRODUCT_MS)!.rgba[3]).toBe(180);
    expect(compositeCloudHighlightLayers([msg, ring], order, PRODUCT_MS)!.ringOwnsPixels).toBe(
      false,
    );
  });

  it("multiple q=0 regionals vs poor ring keep freshness/stable regional choice", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 40, quality: 0 }),
      MSG_MS,
    );
    const hima = fillLayer(
      CLOUDS_SECTOR_HIMAWARI,
      1,
      1,
      () => ({ coverage: 255, alpha: 90, quality: 0 }),
      HIM_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 200, quality: 0 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_METEOSAT,
      CLOUDS_SECTOR_HIMAWARI,
    ];
    const winner = winnerId([msg, hima, ring], order);
    expect(winner).not.toBe(CLOUDS_SECTOR_EUMET_RING);
    const regionalOnly = resolveCloudsRegionalOnlyWinnerSectorIds(
      [msg, hima, ring],
      order,
      PRODUCT_MS,
    )!;
    const composite = resolveCloudsCompositeWinnerSectorIds(
      [msg, hima, ring],
      order,
      PRODUCT_MS,
    )!;
    expect(composite.winners[0]).toBe(regionalOnly.winners[0]);
  });
});

describe("WEATHER-5.3.1 poor ring only", () => {
  it("ring q=0 + no regional → ring; no hole", () => {
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 70, quality: 0 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING];
    expect(winnerId([ring], order)).toBe(CLOUDS_SECTOR_EUMET_RING);
    const out = compositeCloudHighlightLayers([ring], order, PRODUCT_MS)!;
    expect(out.rgba[3]).toBe(70);
    expect(out.ringOwnsPixels).toBe(true);
  });
});

describe("WEATHER-5.3.1 q>0 regional vs any ring", () => {
  it("q>0 regional + any ring → regional, including valid-clear", () => {
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 0, quality: 200 }),
      EAST_MS,
    );
    const good = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 220, quality: 255 }),
      RING_MS,
    );
    const poor = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 220, quality: 0 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_EAST];
    expect(winnerId([east, good], order)).toBe(CLOUDS_SECTOR_GOES_EAST);
    expect(winnerId([east, poor], order)).toBe(CLOUDS_SECTOR_GOES_EAST);
    expect(compositeCloudHighlightLayers([east, good], order, PRODUCT_MS)!.rgba[3]).toBe(0);
  });
});

describe("WEATHER-5.3.1 expired / no-data ring", () => {
  it("expired ring is excluded irrespective of quality", () => {
    const painted = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_METEOSAT,
          observationTimeMs: PRODUCT_MS - 30 * 60 * 1000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_EUMET_RING,
          observationTimeMs: PRODUCT_MS - 9 * 60 * 60 * 1000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    expect(painted.some((c) => c.sectorId === CLOUDS_SECTOR_EUMET_RING)).toBe(false);
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 180, quality: 0 }),
      PRODUCT_MS - 30 * 60 * 1000,
    );
    const order = cloudsCompositePaintOrder(painted, PRODUCT_MS);
    expect(compositeCloudHighlightLayers([msg], order, PRODUCT_MS)!.rgba[3]).toBe(180);
  });

  it("alpha=0 ring is excluded irrespective of quality", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 180, quality: 0 }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 0, alpha: 0, quality: 255 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT];
    expect(winnerId([msg, ring], order)).toBe(CLOUDS_SECTOR_METEOSAT);
    expect(compositeCloudHighlightLayers([msg, ring], order, PRODUCT_MS)!.rgba[3]).toBe(180);
  });
});

describe("WEATHER-5.3.1 signal independence", () => {
  it("changing ring cloudSignal does not change winner ids", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      2,
      1,
      () => ({ coverage: 255, alpha: 90, quality: 0 }),
      MSG_MS,
    );
    const ringA = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      2,
      1,
      (_i, x) => ({ coverage: 255, alpha: 10, quality: x === 0 ? 200 : 0 }),
      RING_MS,
    );
    const ringB = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      2,
      1,
      (_i, x) => ({ coverage: 255, alpha: 240, quality: x === 0 ? 200 : 0 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT];
    const a = resolveCloudsCompositeWinnerSectorIds([msg, ringA], order, PRODUCT_MS)!;
    const b = resolveCloudsCompositeWinnerSectorIds([msg, ringB], order, PRODUCT_MS)!;
    expect(Array.from(a.winners)).toEqual(Array.from(b.winners));
    expect(order[a.winners[0]!]!).toBe(CLOUDS_SECTOR_EUMET_RING);
    expect(order[a.winners[1]!]!).toBe(CLOUDS_SECTOR_METEOSAT);
  });
});

describe("WEATHER-5.3.1 India ring-quality band", () => {
  it("25°N class sequence is usable MSG, then good ring, then usable Himawari", () => {
    const lat = 25;
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
    expect(classes[0]).toBe("msg");
    expect(classes).toContain("good-ring");
    expect(classes[classes.length - 1]).toBe("himawari");
    expect(classes.join(">")).toBe("msg>good-ring>himawari");
    const at70 = sampleCloudsRingQuality(lat, 70);
    expect(at70.qualityU8).toBeGreaterThan(0);
    expect(at70.componentId).toBe("iodc-45.5");
  });
});

describe("WEATHER-5.3.1 SIO IODC", () => {
  it("IODC is the ring-quality winner with q>0 at 70°E 45°S", () => {
    const lat = -45;
    const lon = 70;
    const thetaMsg = geostationaryViewingZenithDeg(
      lat,
      lon,
      CLOUDS_METEOSAT_SUB_SATELLITE.longitudeDeg,
    );
    const thetaIodc = geostationaryViewingZenithDeg(
      lat,
      lon,
      CLOUDS_IODC_SUB_SATELLITE.longitudeDeg,
    );
    const thetaHim = geostationaryViewingZenithDeg(
      lat,
      lon,
      CLOUDS_HIMAWARI_SUB_SATELLITE.longitudeDeg,
    );
    const qMsg = geostationaryQualityU8(
      lat,
      lon,
      CLOUDS_METEOSAT_SUB_SATELLITE.longitudeDeg,
    );
    const qIodc = geostationaryQualityU8(
      lat,
      lon,
      CLOUDS_IODC_SUB_SATELLITE.longitudeDeg,
    );
    const qHim = geostationaryQualityU8(
      lat,
      lon,
      CLOUDS_HIMAWARI_SUB_SATELLITE.longitudeDeg,
    );
    const ring = sampleCloudsRingQuality(lat, lon);
    expect(thetaIodc).toBeLessThan(thetaMsg);
    expect(thetaIodc).toBeLessThan(thetaHim);
    expect(qIodc).toBeGreaterThan(0);
    expect(qMsg).toBe(0);
    expect(qHim).toBe(0);
    expect(ring.qualityU8).toBe(qIodc);
    expect(ring.qualityU8).toBeGreaterThan(0);
    expect(ring.componentId).toBe("iodc-45.5");
  });
});

describe("WEATHER-5.3.1 polar poor ring", () => {
  it("far-south ring-covered geometry is q=0 and yields to q=0 regional", () => {
    const sample = sampleCloudsRingQuality(-80, 70);
    expect(sample.qualityU8).toBe(0);
    expect(sample.componentId).toBeNull();
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 200, quality: 0 }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 40, quality: sample.qualityU8 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT];
    expect(winnerId([msg, ring], order)).toBe(CLOUDS_SECTOR_METEOSAT);
  });
});

describe("WEATHER-5.3.1 NATL / Pacific q>0 identity", () => {
  it("NATL East/MSG q>0 winners stay identical to regional-only authority", () => {
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      3,
      1,
      (i) => ({ coverage: 255, alpha: 47, quality: i === 2 ? 0 : 255 }),
      EAST_MS,
    );
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      3,
      1,
      (i) => ({ coverage: 255, alpha: 226, quality: i === 0 ? 0 : 200 }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      3,
      1,
      () => ({ coverage: 255, alpha: 90, quality: 255 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_GOES_EAST,
      CLOUDS_SECTOR_METEOSAT,
    ];
    const withRing = resolveCloudsCompositeWinnerSectorIds(
      [east, msg, ring],
      order,
      PRODUCT_MS,
    )!;
    const regionalOnly = resolveCloudsRegionalOnlyWinnerSectorIds(
      [east, msg, ring],
      order,
      PRODUCT_MS,
    )!;
    expect(order[withRing.winners[0]!]!).toBe(CLOUDS_SECTOR_GOES_EAST);
    expect(order[withRing.winners[1]!]!).toBe(CLOUDS_SECTOR_METEOSAT);
    expect(withRing.winners[0]).toBe(regionalOnly.winners[0]);
    expect(withRing.winners[1]).toBe(regionalOnly.winners[1]);
  });

  it("Pacific West/Himawari q>0 overlap is not displaced by good ring", () => {
    const west = fillLayer(
      CLOUDS_SECTOR_GOES_WEST,
      1,
      1,
      () => ({ coverage: 255, alpha: 50, quality: 200 }),
      WEST_MS,
    );
    const hima = fillLayer(
      CLOUDS_SECTOR_HIMAWARI,
      1,
      1,
      () => ({ coverage: 255, alpha: 90, quality: 180 }),
      HIM_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 200, quality: 255 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_GOES_WEST,
      CLOUDS_SECTOR_HIMAWARI,
    ];
    const withRing = resolveCloudsCompositeWinnerSectorIds(
      [west, hima, ring],
      order,
      PRODUCT_MS,
    )!;
    const regionalOnly = resolveCloudsRegionalOnlyWinnerSectorIds(
      [west, hima, ring],
      order,
      PRODUCT_MS,
    )!;
    expect(withRing.winners[0]).toBe(regionalOnly.winners[0]);
    expect(order[withRing.winners[0]!]!).not.toBe(CLOUDS_SECTOR_EUMET_RING);
  });
});

describe("WEATHER-5.3.1 status contribution", () => {
  it("includes ring age iff ring wins pixels", () => {
    const painted = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: EAST_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_GOES_WEST,
          observationTimeMs: WEST_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_METEOSAT,
          observationTimeMs: MSG_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_HIMAWARI,
          observationTimeMs: HIM_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_EUMET_RING,
          observationTimeMs: RING_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    expect(selectCloudsStatusComponents(painted, false).components.some((c) => c.sectorId === CLOUDS_SECTOR_EUMET_RING)).toBe(
      false,
    );
    expect(buildCloudsCompositeMeta(painted, false)!.oldestObservationTimeMs).toBe(HIM_MS);
    expect(selectCloudsStatusComponents(painted, true).components.some((c) => c.sectorId === CLOUDS_SECTOR_EUMET_RING)).toBe(
      true,
    );
    expect(buildCloudsCompositeMeta(painted, true)!.oldestObservationTimeMs).toBe(RING_MS);
  });
});

describe("WEATHER-5.3.1 coverage / regional quality / signal identity", () => {
  it("does not mutate coverage, quality, or cloud-signal arrays", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      2,
      1,
      (i) => ({ coverage: 255, alpha: i === 0 ? 0 : 90, quality: 0 }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      2,
      1,
      (_i, x) => ({ coverage: 255, alpha: 40, quality: x === 0 ? 180 : 0 }),
      RING_MS,
    );
    const beforeMsg = snapshotPlanes(msg);
    const beforeRing = snapshotPlanes(ring);
    compositeCloudHighlightLayers(
      [msg, ring],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT],
      PRODUCT_MS,
    );
    expect(snapshotPlanes(msg)).toEqual(beforeMsg);
    expect(snapshotPlanes(ring)).toEqual(beforeRing);
  });

  it("provider-alpha coverage extraction is unchanged", () => {
    const provider = new Uint8Array([40, 40, 40, 255, 200, 200, 200, 0]);
    expect(Array.from(extractCloudsCoverageMask(provider))).toEqual([255, 0]);
  });

  it("regional quality planes remain Earth-fixed cache hits", () => {
    const a = getCloudsQualityPlane(CLOUDS_SECTOR_METEOSAT, 32, 16)!;
    const b = getCloudsQualityPlane(CLOUDS_SECTOR_METEOSAT, 32, 16)!;
    expect(a).toBe(b);
  });
});

describe("WEATHER-5.3.1 ring quality cache and distribution", () => {
  it("caches ring quality by grid and model, not by time", () => {
    const t0 = performance.now();
    const a = getCloudsQualityPlane(
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_GIBS_WIDTH_PX,
      CLOUDS_GIBS_HEIGHT_PX,
    )!;
    const dt = performance.now() - t0;
    const b = getCloudsQualityPlane(
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_GIBS_WIDTH_PX,
      CLOUDS_GIBS_HEIGHT_PX,
    )!;
    const component = getCloudsRingComponentPlane(
      CLOUDS_GIBS_WIDTH_PX,
      CLOUDS_GIBS_HEIGHT_PX,
    )!;
    expect(a).toBe(b);
    expect(a.byteLength).toBe(CLOUDS_GIBS_WIDTH_PX * CLOUDS_GIBS_HEIGHT_PX);
    expect(a.byteLength).toBe(2_097_152);
    expect(component.byteLength).toBe(a.byteLength);
    expect(dt).toBeLessThan(8000);

    let q0 = 0;
    let qPos = 0;
    const qs: number[] = [];
    const componentCounts = new Map<number, number>();
    for (let i = 0; i < a.length; i++) {
      const q = a[i]!;
      qs.push(q);
      if (q === 0) q0 += 1;
      else qPos += 1;
      const c = component[i]!;
      componentCounts.set(c, (componentCounts.get(c) ?? 0) + 1);
    }
    qs.sort((x, y) => x - y);
    const p = (n: number) => qs[Math.min(qs.length - 1, Math.floor((n / 100) * qs.length))]!;
    expect(qPos).toBeGreaterThan(q0);
    expect(p(50)).toBeGreaterThan(0);
    expect(componentCounts.get(1)).toBeGreaterThan(0);
  });
});

describe("WEATHER-5.3.1 presentation / architecture regressions", () => {
  it("keeps cloud RGB, confidence transfer, and current-only policy", () => {
    expect(CLOUD_HIGHLIGHT_RGB).toEqual({ r: 248, g: 250, b: 252 });
    expect(CLOUD_HIGHLIGHT_TRANSFER_VERSION).toBe("wx54-gibs-gray-v3");
    expect(getDynamicEquirectSourceCatalogEntry(GLOBAL_CLOUDS_IR_SOURCE_ID)?.timePolicy).toBe(
      "wallClockCurrent",
    );
  });

  it("does not blend overlapping observations", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 10, quality: 0 }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 200, quality: 180 }),
      RING_MS,
    );
    const out = compositeCloudHighlightLayers(
      [msg, ring],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT],
      PRODUCT_MS,
    )!;
    expect(out.rgba[3]).toBe(200);
    expect(out.rgba[3]).not.toBe(105);
  });
});
