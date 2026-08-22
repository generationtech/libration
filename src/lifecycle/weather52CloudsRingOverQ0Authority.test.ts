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
import { getCloudsQualityPlane } from "./cloudQuality";
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

function seamRatio(
  rgba: Uint8Array,
  winners: Int8Array,
): { boundary: number; interior: number; ratio: number; nBoundary: number } {
  let bSum = 0;
  let bN = 0;
  let iSum = 0;
  let iN = 0;
  for (let i = 0; i < winners.length; i++) {
    const a = rgba[i * 4 + 3]!;
    const edge = i > 0 && winners[i] !== winners[i - 1];
    if (edge) {
      bSum += Math.abs(a - rgba[(i - 1) * 4 + 3]!);
      bN += 1;
    } else {
      iSum += a;
      iN += 1;
    }
  }
  const boundary = bN === 0 ? 0 : bSum / bN;
  const interior = iN === 0 ? 0 : iSum / iN;
  return {
    boundary,
    interior,
    ratio: interior === 0 ? boundary : boundary / Math.max(interior, 1),
    nBoundary: bN,
  };
}

describe("WEATHER-5.2 dual q=0 + ring", () => {
  it("ring wins when two covering regionals are both q=0", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 180, quality: 0 }),
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
      () => ({ coverage: 255, alpha: 50 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_METEOSAT,
      CLOUDS_SECTOR_HIMAWARI,
    ];
    const out = compositeCloudHighlightLayers([msg, hima, ring], order, PRODUCT_MS)!;
    expect(out.rgba[3]).toBe(50);
    expect(out.ringOwnsPixels).toBe(true);
    expect(winnerId([msg, hima, ring], order)).toBe(CLOUDS_SECTOR_EUMET_RING);
  });
});

describe("WEATHER-5.2 sole q=0 + ring", () => {
  it("ring wins when the only covering regional is q=0", () => {
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
      () => ({ coverage: 255, alpha: 70 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT];
    expect(winnerId([msg, ring], order)).toBe(CLOUDS_SECTOR_EUMET_RING);
    expect(compositeCloudHighlightLayers([msg, ring], order, PRODUCT_MS)!.rgba[3]).toBe(70);
  });
});

describe("WEATHER-5.2 sole q=0 no ring", () => {
  it("q=0 regional still paints when ring has no coverage; no hole", () => {
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
      () => ({ coverage: 0, alpha: 0 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT];
    const out = compositeCloudHighlightLayers([msg, ring], order, PRODUCT_MS)!;
    expect(out.rgba[3]).toBe(180);
    expect(out.ringOwnsPixels).toBe(false);
    expect(winnerId([msg, ring], order)).toBe(CLOUDS_SECTOR_METEOSAT);
  });
});

describe("WEATHER-5.2 q>0 + ring", () => {
  it("usable regional beats ring even when ring is newer and smoother", () => {
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 40, quality: 255 }),
      EAST_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 200 }),
      PRODUCT_MS - 5 * 60 * 1000,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_EAST];
    expect(winnerId([east, ring], order)).toBe(CLOUDS_SECTOR_GOES_EAST);
    expect(compositeCloudHighlightLayers([east, ring], order, PRODUCT_MS)!.rgba[3]).toBe(40);
  });
});

describe("WEATHER-5.2 multiple q>0 identity", () => {
  it("lexicographic regional winner is identical to WEATHER-4.3 when any q>0 covers", () => {
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      4,
      1,
      (i) => ({ coverage: 255, alpha: 40 + i, quality: [255, 200, 80, 10][i]! }),
      EAST_MS,
    );
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      4,
      1,
      (i) => ({ coverage: 255, alpha: 200, quality: [0, 180, 90, 12][i]! }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      4,
      1,
      () => ({ coverage: 255, alpha: 90 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_GOES_EAST,
      CLOUDS_SECTOR_METEOSAT,
    ];
    const composite = resolveCloudsCompositeWinnerSectorIds(
      [east, msg, ring],
      order,
      PRODUCT_MS,
    )!;
    const regionalOnly = resolveCloudsRegionalOnlyWinnerSectorIds(
      [east, msg, ring],
      order,
      PRODUCT_MS,
    )!;
    for (let i = 0; i < 4; i++) {
      const eastQ = east.qualityWeight![i]!;
      const msgQ = msg.qualityWeight![i]!;
      if (eastQ > 0 || msgQ > 0) {
        expect(composite.winners[i]).toBe(regionalOnly.winners[i]);
        expect(order[composite.winners[i]!]!).not.toBe(CLOUDS_SECTOR_EUMET_RING);
      }
    }
  });
});

describe("WEATHER-5.2 valid-clear", () => {
  it("valid-clear q>0 still suppresses cloudy ring", () => {
    const east = fillLayer(
      CLOUDS_SECTOR_GOES_EAST,
      1,
      1,
      () => ({ coverage: 255, alpha: 0, quality: 200 }),
      EAST_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 220 }),
      RING_MS,
    );
    const out = compositeCloudHighlightLayers(
      [east, ring],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_EAST],
      PRODUCT_MS,
    )!;
    expect(out.rgba[3]).toBe(0);
    expect(out.ringOwnsPixels).toBe(false);
  });

  it("valid-clear q=0 yields ring when ring is available", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 0, quality: 0 }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 160 }),
      RING_MS,
    );
    expect(msg.coverageMask[0]).toBe(255);
    const out = compositeCloudHighlightLayers(
      [msg, ring],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT],
      PRODUCT_MS,
    )!;
    expect(out.rgba[3]).toBe(160);
    expect(out.ringOwnsPixels).toBe(true);
  });
});

describe("WEATHER-5.2 ring eligibility", () => {
  it("expired ring does not beat q=0 regional", () => {
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
    expect(painted.some((c) => c.sectorId === CLOUDS_SECTOR_METEOSAT)).toBe(true);
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 180, quality: 0 }),
      PRODUCT_MS - 30 * 60 * 1000,
    );
    const order = cloudsCompositePaintOrder(painted, PRODUCT_MS);
    const out = compositeCloudHighlightLayers([msg], order, PRODUCT_MS)!;
    expect(out.rgba[3]).toBe(180);
    expect(out.ringOwnsPixels).toBe(false);
  });

  it("ring alpha=0 / no-data leaves q=0 regional in place", () => {
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
      () => ({ coverage: 0, alpha: 0 }),
      RING_MS,
    );
    expect(
      compositeCloudHighlightLayers(
        [msg, ring],
        [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT],
        PRODUCT_MS,
      )!.rgba[3],
    ).toBe(180);
  });

  it("stale-but-paintable ring may own q=0 pixels", () => {
    const age = 5 * 60 * 60 * 1000;
    expect(age).toBeGreaterThan(CLOUDS_SECTOR_SPECS[CLOUDS_SECTOR_EUMET_RING].freshMaxAgeMs);
    expect(age).toBeLessThanOrEqual(CLOUDS_SECTOR_SPECS[CLOUDS_SECTOR_EUMET_RING].staleMaxAgeMs);
    const painted = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_METEOSAT,
          observationTimeMs: PRODUCT_MS - 20 * 60 * 1000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_EUMET_RING,
          observationTimeMs: PRODUCT_MS - age,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    expect(painted.some((c) => c.sectorId === CLOUDS_SECTOR_EUMET_RING)).toBe(true);
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      1,
      1,
      () => ({ coverage: 255, alpha: 10, quality: 0 }),
      PRODUCT_MS - 20 * 60 * 1000,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      1,
      1,
      () => ({ coverage: 255, alpha: 80 }),
      PRODUCT_MS - age,
    );
    const order = cloudsCompositePaintOrder(painted, PRODUCT_MS);
    const out = compositeCloudHighlightLayers([msg, ring], order, PRODUCT_MS)!;
    expect(out.ringOwnsPixels).toBe(true);
    expect(out.rgba[3]).toBe(80);
  });
});

describe("WEATHER-5.2 India-like fixture", () => {
  it("dual q=0 + ring removes the Meteosat coverage-edge winner arc", () => {
    const width = 32;
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      width,
      1,
      (_i, x) => ({ coverage: x < 20 ? 255 : 0, alpha: x < 20 ? 180 : 0, quality: 0 }),
      MSG_MS,
    );
    const hima = fillLayer(
      CLOUDS_SECTOR_HIMAWARI,
      width,
      1,
      () => ({ coverage: 255, alpha: 90, quality: 0 }),
      HIM_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      width,
      1,
      () => ({ coverage: 255, alpha: 40 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_METEOSAT,
      CLOUDS_SECTOR_HIMAWARI,
    ];
    const layers = [msg, hima, ring];
    const oldWinners = resolveCloudsRegionalOnlyWinnerSectorIds(layers, order, PRODUCT_MS)!;
    expect(order[oldWinners.winners[19]!]!).toBe(CLOUDS_SECTOR_METEOSAT);
    expect(order[oldWinners.winners[20]!]!).toBe(CLOUDS_SECTOR_HIMAWARI);
    const next = resolveCloudsCompositeWinnerSectorIds(layers, order, PRODUCT_MS)!;
    for (let i = 0; i < width; i++) {
      expect(order[next.winners[i]!]!).toBe(CLOUDS_SECTOR_EUMET_RING);
    }
    const composed = compositeCloudHighlightLayers(layers, order, PRODUCT_MS)!;
    expect(composed.ringOwnsPixels).toBe(true);
    const oldSeam = seamRatio(
      Uint8Array.from({ length: width * 4 }, (_, j) => {
        const i = Math.floor(j / 4);
        const id = order[oldWinners.winners[i]!]!;
        const layer = layers.find((l) => l.sectorId === id)!;
        return layer.rgba[j]!;
      }),
      oldWinners.winners,
    );
    const newSeam = seamRatio(composed.rgba, next.winners);
    expect(oldSeam.nBoundary).toBeGreaterThan(0);
    expect(newSeam.nBoundary).toBe(0);
    expect(newSeam.ratio).toBeLessThan(oldSeam.ratio);
  });
});

describe("WEATHER-5.2 southern Indian Ocean fixture", () => {
  it("ring fills q=0 GEO skirts and the true gap continuously", () => {
    const width = 48;
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      width,
      1,
      (_i, x) => ({ coverage: x < 16 ? 255 : 0, alpha: x < 16 ? 220 : 0, quality: 0 }),
      MSG_MS,
    );
    const hima = fillLayer(
      CLOUDS_SECTOR_HIMAWARI,
      width,
      1,
      (_i, x) => ({ coverage: x > 32 ? 255 : 0, alpha: x > 32 ? 220 : 0, quality: 0 }),
      HIM_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      width,
      1,
      () => ({ coverage: 255, alpha: 30 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_METEOSAT,
      CLOUDS_SECTOR_HIMAWARI,
    ];
    const layers = [msg, hima, ring];
    const oldWinners = new Int8Array(width);
    const regionalOnly = resolveCloudsRegionalOnlyWinnerSectorIds(layers, order, PRODUCT_MS)!;
    const ringIndex = order.indexOf(CLOUDS_SECTOR_EUMET_RING);
    for (let i = 0; i < width; i++) {
      oldWinners[i] = regionalOnly.winners[i]! >= 0 ? regionalOnly.winners[i]! : ringIndex;
    }
    expect(order[oldWinners[8]!]!).toBe(CLOUDS_SECTOR_METEOSAT);
    expect(order[oldWinners[24]!]!).toBe(CLOUDS_SECTOR_EUMET_RING);
    expect(order[oldWinners[40]!]!).toBe(CLOUDS_SECTOR_HIMAWARI);
    const next = resolveCloudsCompositeWinnerSectorIds(layers, order, PRODUCT_MS)!;
    for (let i = 0; i < width; i++) {
      expect(order[next.winners[i]!]!).toBe(CLOUDS_SECTOR_EUMET_RING);
    }
    const oldRgba = new Uint8Array(width * 4);
    for (let i = 0; i < width; i++) {
      const id = order[oldWinners[i]!]!;
      const layer = layers.find((l) => l.sectorId === id)!;
      oldRgba.set(layer.rgba.subarray(i * 4, i * 4 + 4), i * 4);
    }
    const composed = compositeCloudHighlightLayers(layers, order, PRODUCT_MS)!;
    const oldSeam = seamRatio(oldRgba, oldWinners);
    const newSeam = seamRatio(composed.rgba, next.winners);
    expect(oldSeam.nBoundary).toBe(2);
    expect(oldSeam.boundary).toBeGreaterThan(100);
    expect(newSeam.nBoundary).toBe(0);
    expect(newSeam.ratio).toBeLessThan(1);
  });
});

describe("WEATHER-5.2 NATL identity", () => {
  it("q>0 East/MSG NATL winner map is unchanged when ring is present", () => {
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
      () => ({ coverage: 255, alpha: 90 }),
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
});

describe("WEATHER-5.2 Pacific q>0", () => {
  it("usable West/Himawari overlap is not displaced by the ring", () => {
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
      () => ({ coverage: 255, alpha: 200 }),
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

describe("WEATHER-5.2 observation times and status", () => {
  it("source TIMES are unchanged; ring age is included only when it owns pixels", () => {
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
    expect(painted.map((c) => c.observationTimeMs).sort()).toEqual(
      [RING_MS, HIM_MS, EAST_MS, WEST_MS, MSG_MS].sort(),
    );
    const hidden = selectCloudsStatusComponents(painted, false);
    expect(hidden.components.some((c) => c.sectorId === CLOUDS_SECTOR_EUMET_RING)).toBe(
      false,
    );
    expect(buildCloudsCompositeMeta(painted, false)!.oldestObservationTimeMs).toBe(HIM_MS);
    const visible = selectCloudsStatusComponents(painted, true);
    expect(visible.ringFillsMissingRegional).toBe(true);
    expect(visible.components.some((c) => c.sectorId === CLOUDS_SECTOR_EUMET_RING)).toBe(
      true,
    );
    const meta = buildCloudsCompositeMeta(painted, true)!;
    expect(meta.oldestObservationTimeMs).toBe(RING_MS);
    expect(meta.statusSectorIds).toContain(CLOUDS_SECTOR_EUMET_RING);
  });
});

describe("WEATHER-5.2 coverage / quality / signal identity", () => {
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
      () => ({ coverage: 255, alpha: 40 }),
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

  it("quality planes remain Earth-fixed cache hits", () => {
    const a = getCloudsQualityPlane(CLOUDS_SECTOR_METEOSAT, 32, 16)!;
    const b = getCloudsQualityPlane(CLOUDS_SECTOR_METEOSAT, 32, 16)!;
    expect(a).toBe(b);
  });
});

describe("WEATHER-5.2 presentation / architecture regressions", () => {
  it("keeps cloud RGB, confidence transfer, and authority cache id", () => {
    expect(CLOUD_HIGHLIGHT_RGB).toEqual({ r: 248, g: 250, b: 252 });
    expect(CLOUD_HIGHLIGHT_TRANSFER_VERSION).toBe("wx54-gibs-gray-v3");
    expect(CLOUDS_COMPOSITE_AUTHORITY_VERSION).toBe("wx53-ring-geo-q1");
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
      () => ({ coverage: 255, alpha: 200 }),
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

  it("Clouds remain current-only; catalog time policy is unchanged", () => {
    expect(getDynamicEquirectSourceCatalogEntry(GLOBAL_CLOUDS_IR_SOURCE_ID)?.timePolicy).toBe(
      "wallClockCurrent",
    );
  });
});

describe("WEATHER-5.2 Antarctic class", () => {
  it("q=0 GEO coverage yields ring where ring covers, and q=0 regional where it does not", () => {
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      3,
      1,
      () => ({ coverage: 255, alpha: 200, quality: 0 }),
      MSG_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      3,
      1,
      (_i, x) => ({ coverage: x < 2 ? 255 : 0, alpha: x < 2 ? 40 : 0 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT];
    const winners = resolveCloudsCompositeWinnerSectorIds([msg, ring], order, PRODUCT_MS)!;
    expect(order[winners.winners[0]!]!).toBe(CLOUDS_SECTOR_EUMET_RING);
    expect(order[winners.winners[1]!]!).toBe(CLOUDS_SECTOR_EUMET_RING);
    expect(order[winners.winners[2]!]!).toBe(CLOUDS_SECTOR_METEOSAT);
    expect(msg.coverageMask[2]).toBe(255);
  });
});

describe("WEATHER-5.2 performance class", () => {
  it("one extra comparison stays in the existing compose budget", () => {
    const width = 256;
    const height = 128;
    const msg = fillLayer(
      CLOUDS_SECTOR_METEOSAT,
      width,
      height,
      (_i, x) => ({ coverage: x < width / 2 ? 255 : 0, alpha: 80, quality: 0 }),
      MSG_MS,
    );
    const hima = fillLayer(
      CLOUDS_SECTOR_HIMAWARI,
      width,
      height,
      (_i, x) => ({ coverage: x >= width / 2 ? 255 : 0, alpha: 90, quality: 0 }),
      HIM_MS,
    );
    const ring = fillLayer(
      CLOUDS_SECTOR_EUMET_RING,
      width,
      height,
      () => ({ coverage: 255, alpha: 40 }),
      RING_MS,
    );
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_METEOSAT,
      CLOUDS_SECTOR_HIMAWARI,
    ];
    const t0 = performance.now();
    const out = compositeCloudHighlightLayers([msg, hima, ring], order, PRODUCT_MS);
    const dt = performance.now() - t0;
    expect(out).not.toBeNull();
    expect(out!.ringOwnsPixels).toBe(true);
    expect(dt).toBeLessThan(500);
    expect(CLOUDS_GIBS_WIDTH_PX * CLOUDS_GIBS_HEIGHT_PX).toBe(2_097_152);
  });
});
