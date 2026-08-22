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

import { describe, expect, it, vi } from "vitest";
import {
  applyCloudHighlightTransfer,
  CLOUD_HIGHLIGHT_RGB,
  cloudConfidence01FromCanonicalIR,
} from "./cloudHighlightTransfer";
import {
  CLOUDS_COVERAGE_PROVIDER_ALPHA_MIN,
  extractCloudsCoverageMask,
  isCloudsAuthoritativeClear,
  materializeCloudsSourcePlanes,
  providerAlphaHasCloudsCoverage,
} from "./cloudCoverage";
import {
  buildCloudsCompositeMeta,
  cloudsCompositePaintOrder,
  compositeCloudHighlightLayers,
  selectCloudsPaintableComponents,
  type CloudsHighlightLayer,
} from "./cloudsComposite";
import {
  CLOUDS_GIBS_HEIGHT_PX,
  CLOUDS_GIBS_WIDTH_PX,
} from "./cloudsGibsWms";
import {
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_METEOSAT,
  type CloudsSectorId,
} from "./cloudsSectors";
import {
  CLOUDS_TEST_OBSERVATION_MS,
  encodeCloudsGlobalTestPng,
  encodeCloudsTestPng,
  mockCloudsLiveFetch,
} from "./cloudsAcquisition.testSupport";
import { decodeCloudsPngRgba } from "./cloudsPng";
import { createGlobalCloudsIrLiveHttpAcquisitionAdapter } from "./globalCloudsIrAcquisition";

const PRODUCT_MS = Date.parse("2023-11-14T21:00:00Z");
const EAST_MS = Date.parse("2023-11-14T20:50:00Z");
const WEST_MS = Date.parse("2023-11-14T20:40:00Z");
const MSG_MS = Date.parse("2023-11-14T20:30:00Z");
const HIMAWARI_MS = Date.parse("2023-11-14T20:40:00Z");

function rgbaPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  count = 1,
): Uint8Array {
  const out = new Uint8Array(count * 4);
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = a;
  }
  return out;
}

function fillLayer(
  sectorId: CloudsSectorId,
  width: number,
  height: number,
  paint: (i: number, x: number, y: number) => { coverage: number; alpha: number },
): CloudsHighlightLayer {
  const n = width * height;
  const rgba = new Uint8Array(n * 4);
  const coverageMask = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const p = paint(i, x, y);
      coverageMask[i] = p.coverage;
      const o = i * 4;
      if (p.alpha > 0) {
        rgba[o] = CLOUD_HIGHLIGHT_RGB.r;
        rgba[o + 1] = CLOUD_HIGHLIGHT_RGB.g;
        rgba[o + 2] = CLOUD_HIGHLIGHT_RGB.b;
      }
      rgba[o + 3] = p.alpha;
    }
  }
  return { sectorId, width, height, rgba, coverageMask };
}

/** Pre-fix compositor: replace only where derived cloud alpha > 0. */
function compositeByHighlightAlpha(
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
): Uint8Array {
  const byId = new Map(layers.map((l) => [l.sectorId, l]));
  const first = byId.get(paintOrder[0]!)!;
  const n = first.width * first.height;
  const out = new Uint8Array(n * 4);
  for (const id of paintOrder) {
    const layer = byId.get(id);
    if (layer === undefined) continue;
    for (let i = 0; i < n; i++) {
      const a = layer.rgba[i * 4 + 3]!;
      if (a === 0) continue;
      const o = i * 4;
      out[o] = layer.rgba[o]!;
      out[o + 1] = layer.rgba[o + 1]!;
      out[o + 2] = layer.rgba[o + 2]!;
      out[o + 3] = a;
    }
  }
  return out;
}

function lonToX(lonDeg: number, width: number): number {
  return Math.round(((lonDeg + 180) / 360) * (width - 1));
}

function latToY(latDeg: number, height: number): number {
  return Math.round(((90 - latDeg) / 180) * (height - 1));
}

describe("WEATHER-4.1 coverage vs cloud signal", () => {
  it("provider A=0 is no coverage; A>0 is coverage independent of cloud signal", () => {
    expect(CLOUDS_COVERAGE_PROVIDER_ALPHA_MIN).toBe(1);
    expect(providerAlphaHasCloudsCoverage(0)).toBe(false);
    expect(providerAlphaHasCloudsCoverage(1)).toBe(true);
    expect(providerAlphaHasCloudsCoverage(64)).toBe(true);
    expect(providerAlphaHasCloudsCoverage(255)).toBe(true);

    const provider = new Uint8Array([
      200, 200, 200, 0,
      40, 40, 40, 255,
      210, 210, 210, 128,
      12, 12, 12, 64,
    ]);
    const mask = extractCloudsCoverageMask(provider);
    expect(Array.from(mask)).toEqual([0, 255, 255, 255]);
    const planes = materializeCloudsSourcePlanes(provider, "meteosatIr108Gray");
    expect(planes.coverageMask[0]).toBe(0);
    expect(planes.cloudRgba[3]).toBe(0);
    expect(planes.cloudRgba[0]).toBe(0);
    expect(isCloudsAuthoritativeClear(planes.coverageMask[1]!, planes.cloudRgba[7]!)).toBe(
      true,
    );
    expect(planes.coverageMask[1]).toBe(255);
    expect(planes.cloudRgba[7]).toBe(0);
    expect(planes.coverageMask[2]).toBe(255);
    expect(planes.cloudRgba[11]).toBeGreaterThan(0);
  });

  it("warm opaque pixel is coverage true and cloud signal 0", () => {
    const warm = rgbaPixel(40, 40, 40, 255);
    const planes = materializeCloudsSourcePlanes(warm, "gibsBand13ColorMap");
    expect(planes.coverageMask[0]).toBe(255);
    expect(planes.cloudRgba[3]).toBe(0);
    expect(isCloudsAuthoritativeClear(255, 0)).toBe(true);
    expect(isCloudsAuthoritativeClear(0, 0)).toBe(false);
  });

  it("GIBS partial-alpha limb pixel is coverage if provider alpha > 0", () => {
    const edge = rgbaPixel(180, 180, 180, 64);
    const planes = materializeCloudsSourcePlanes(edge, "gibsBand13ColorMap");
    expect(planes.coverageMask[0]).toBe(255);
    expect(planes.cloudRgba[3]).toBeGreaterThan(0);
    expect(planes.cloudRgba[3]).toBeLessThan(255);
  });

  it("IR transfer keeps restrained RGB and multiplies provider alpha", () => {
    const cold = rgbaPixel(210, 210, 210, 255);
    const out = applyCloudHighlightTransfer(cold, {
      interpretation: "meteosatIr108Gray",
    });
    expect(out[0]).toBe(CLOUD_HIGHLIGHT_RGB.r);
    expect(out[1]).toBe(CLOUD_HIGHLIGHT_RGB.g);
    expect(out[2]).toBe(CLOUD_HIGHLIGHT_RGB.b);
    expect(out[3]).toBe(
      Math.round(cloudConfidence01FromCanonicalIR(210 / 255) * 255),
    );
    const missing = rgbaPixel(255, 255, 255, 0);
    const cleared = applyCloudHighlightTransfer(missing, {
      interpretation: "gibsBand13ColorMap",
    });
    expect(cleared[0]).toBe(0);
    expect(cleared[1]).toBe(0);
    expect(cleared[2]).toBe(0);
    expect(cleared[3]).toBe(0);
  });
});

describe("WEATHER-4.1 ghost-cloud and ring backstop", () => {
  it("valid-clear regional suppresses older ring cloud", () => {
    const ring = fillLayer(CLOUDS_SECTOR_EUMET_RING, 2, 1, () => ({
      coverage: 255,
      alpha: 180,
    }));
    const regional = fillLayer(CLOUDS_SECTOR_GOES_EAST, 2, 1, () => ({
      coverage: 255,
      alpha: 0,
    }));
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_EUMET_RING,
      CLOUDS_SECTOR_GOES_EAST,
    ];
    const old = compositeByHighlightAlpha([ring, regional], order);
    expect(old[3]).toBe(180);
    const next = compositeCloudHighlightLayers([ring, regional], order);
    expect(next).not.toBeNull();
    expect(next!.rgba[3]).toBe(0);
    expect(next!.rgba[7]).toBe(0);
  });

  it("valid-clear later regional suppresses earlier regional cloud", () => {
    const east = fillLayer(CLOUDS_SECTOR_GOES_EAST, 2, 1, () => ({
      coverage: 255,
      alpha: 200,
    }));
    const msg = fillLayer(CLOUDS_SECTOR_METEOSAT, 2, 1, () => ({
      coverage: 255,
      alpha: 0,
    }));
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_GOES_EAST,
      CLOUDS_SECTOR_METEOSAT,
    ];
    expect(compositeByHighlightAlpha([east, msg], order)[3]).toBe(200);
    const next = compositeCloudHighlightLayers([east, msg], order);
    expect(next!.rgba[3]).toBe(0);
  });

  it("no-data regional leaves ring backstop", () => {
    const ring = fillLayer(CLOUDS_SECTOR_EUMET_RING, 2, 1, () => ({
      coverage: 255,
      alpha: 160,
    }));
    const regional = fillLayer(CLOUDS_SECTOR_GOES_EAST, 2, 1, () => ({
      coverage: 0,
      alpha: 0,
    }));
    const next = compositeCloudHighlightLayers(
      [ring, regional],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_EAST],
    );
    expect(next!.rgba[3]).toBe(160);
  });

  it("selected regional cloud replaces ring without adding", () => {
    const ring = fillLayer(CLOUDS_SECTOR_EUMET_RING, 1, 1, () => ({
      coverage: 255,
      alpha: 100,
    }));
    const regional = fillLayer(CLOUDS_SECTOR_GOES_WEST, 1, 1, () => ({
      coverage: 255,
      alpha: 220,
    }));
    const next = compositeCloudHighlightLayers(
      [ring, regional],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_WEST],
    );
    expect(next!.rgba[3]).toBe(220);
  });

  it("semi-transparent cloud signal is not additive with the previous source", () => {
    const ring = fillLayer(CLOUDS_SECTOR_EUMET_RING, 1, 1, () => ({
      coverage: 255,
      alpha: 153,
    }));
    const regional = fillLayer(CLOUDS_SECTOR_METEOSAT, 1, 1, () => ({
      coverage: 255,
      alpha: 102,
    }));
    const next = compositeCloudHighlightLayers(
      [ring, regional],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_METEOSAT],
    );
    expect(next!.rgba[3]).toBe(102);
    expect(next!.rgba[3]).not.toBeGreaterThan(102);
  });

  it("multi-regional overlap: winner replaces including zero; loser cloudy is discarded", () => {
    const west = fillLayer(CLOUDS_SECTOR_GOES_WEST, 1, 1, () => ({
      coverage: 255,
      alpha: 200,
    }));
    const eastCloudy = fillLayer(CLOUDS_SECTOR_GOES_EAST, 1, 1, () => ({
      coverage: 255,
      alpha: 90,
    }));
    const eastClear = fillLayer(CLOUDS_SECTOR_GOES_EAST, 1, 1, () => ({
      coverage: 255,
      alpha: 0,
    }));
    const order: CloudsSectorId[] = [
      CLOUDS_SECTOR_GOES_WEST,
      CLOUDS_SECTOR_GOES_EAST,
    ];
    expect(
      compositeCloudHighlightLayers([west, eastCloudy], order)!.rgba[3],
    ).toBe(90);
    expect(
      compositeCloudHighlightLayers([west, eastClear], order)!.rgba[3],
    ).toBe(0);
  });

  it("ring ghost-cloud leak is zero by construction", () => {
    const width = 32;
    const height = 16;
    const ring = fillLayer(CLOUDS_SECTOR_EUMET_RING, width, height, () => ({
      coverage: 255,
      alpha: 140,
    }));
    const regional = fillLayer(CLOUDS_SECTOR_GOES_WEST, width, height, (_i, x) => ({
      coverage: x < 20 ? 255 : 0,
      alpha: 0,
    }));
    const composed = compositeCloudHighlightLayers(
      [ring, regional],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_WEST],
    )!;
    let leak = 0;
    let validClear = 0;
    for (let i = 0; i < width * height; i++) {
      if (regional.coverageMask[i]! === 0) continue;
      if (regional.rgba[i * 4 + 3]! !== 0) continue;
      if (ring.rgba[i * 4 + 3]! === 0) continue;
      validClear += 1;
      if (composed.rgba[i * 4 + 3]! > 0) leak += 1;
    }
    expect(validClear).toBeGreaterThan(0);
    expect(leak).toBe(0);
    expect(composed.rgba[21 * 4 + 3]).toBe(140);
  });
});

describe("WEATHER-4.1 Greenwich stripe and seam metrics", () => {
  const width = CLOUDS_GIBS_WIDTH_PX;
  const height = CLOUDS_GIBS_HEIGHT_PX;
  const eastCx = lonToX(-75.2, width);
  const msgCx = lonToX(0, width);
  const cy = latToY(0, height);
  /** East eastern limb ≈ 6°E (Greenwich-stripe class). */
  const eastRx = lonToX(6.06, width) - eastCx;
  const eastRy = height * 0.5;
  /** Meteosat covers the overlap west to ≈ 75°W. */
  const msgRx = msgCx - lonToX(-75.5, width);
  const msgRy = height * 0.55;

  function eastDisk(x: number, y: number): boolean {
    const dx = (x - eastCx) / eastRx;
    const dy = (y - cy) / eastRy;
    return dx * dx + dy * dy <= 1;
  }

  function msgDisk(x: number, y: number): boolean {
    const dx = (x - msgCx) / msgRx;
    const dy = (y - cy) / msgRy;
    return dx * dx + dy * dy <= 1;
  }

  const east = fillLayer(CLOUDS_SECTOR_GOES_EAST, width, height, (_i, x, y) => {
    if (!eastDisk(x, y)) return { coverage: 0, alpha: 0 };
    const eastLimb = eastDisk(x, y) && !eastDisk(x + 1, y);
    return { coverage: 255, alpha: eastLimb ? 255 : 80 };
  });
  const msg = fillLayer(CLOUDS_SECTOR_METEOSAT, width, height, (_i, x, y) => {
    if (!msgDisk(x, y)) return { coverage: 0, alpha: 0 };
    const ownWestLimb = msgDisk(x, y) && !msgDisk(x - 1, y);
    return { coverage: 255, alpha: ownWestLimb ? 255 : 0 };
  });
  const order: CloudsSectorId[] = [
    CLOUDS_SECTOR_GOES_EAST,
    CLOUDS_SECTOR_METEOSAT,
  ];
  const layers = [east, msg];
  const authority = compositeCloudHighlightLayers(layers, order)!;
  const production = compositeByHighlightAlpha(layers, order);

  function leftoverFraction(region: {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  }): { production: number; authority: number; nClear: number } {
    let nClear = 0;
    let prodLeak = 0;
    let authLeak = 0;
    for (let y = region.y0; y <= region.y1; y++) {
      for (let x = region.x0; x <= region.x1; x++) {
        const i = y * width + x;
        if (msg.coverageMask[i]! === 0) continue;
        if (msg.rgba[i * 4 + 3]! !== 0) continue;
        if (east.coverageMask[i]! === 0) continue;
        nClear += 1;
        if (production[i * 4 + 3]! > 0) prodLeak += 1;
        if (authority.rgba[i * 4 + 3]! > 0) authLeak += 1;
      }
    }
    return {
      production: nClear === 0 ? 0 : prodLeak / nClear,
      authority: nClear === 0 ? 0 : authLeak / nClear,
      nClear,
    };
  }

  it("preserves 2048×1024 alignment with no dateline duplicate column", () => {
    expect(authority.width).toBe(2048);
    expect(authority.height).toBe(1024);
    expect(authority.rgba.length).toBe(2048 * 1024 * 4);
    const y = latToY(0, height);
    const first = y * width * 4;
    const last = (y * width + (width - 1)) * 4;
    expect(authority.rgba[first + 3]).toBe(0);
    expect(authority.rgba[last + 3]).toBe(0);
  });

  it("Greenwich earlier-source limb does not show through valid-clear Meteosat", () => {
    const y = latToY(18, height);
    let eastLast = -1;
    for (let x = 0; x < width; x++) {
      if (east.coverageMask[y * width + x]! > 0) eastLast = x;
    }
    expect(eastLast).toBeGreaterThan(lonToX(0, width));
    const i = y * width + eastLast;
    expect(msg.coverageMask[i]).toBe(255);
    expect(msg.rgba[i * 4 + 3]).toBe(0);
    expect(east.rgba[i * 4 + 3]).toBeGreaterThan(0);
    expect(production[i * 4 + 3]).toBeGreaterThan(0);
    expect(authority.rgba[i * 4 + 3]).toBe(0);
  });

  it("MSG own-limb saturation may remain when MSG is the selected source", () => {
    const x = lonToX(-75.5, width);
    const y = latToY(0, height);
    expect(msg.coverageMask[y * width + x]).toBe(255);
    expect(msg.rgba[(y * width + x) * 4 + 3]).toBe(255);
    expect(authority.rgba[(y * width + x) * 4 + 3]).toBe(255);
  });

  it("Caribbean and Atlantic leftover East cloud through clear Meteosat drops to zero", () => {
    const caribbean = leftoverFraction({
      x0: lonToX(-90, width),
      x1: lonToX(-55, width),
      y0: latToY(25, height),
      y1: latToY(8, height),
    });
    const atlantic = leftoverFraction({
      x0: lonToX(-50, width),
      x1: lonToX(15, width),
      y0: latToY(20, height),
      y1: latToY(-20, height),
    });
    expect(caribbean.nClear).toBeGreaterThan(100);
    expect(atlantic.nClear).toBeGreaterThan(100);
    expect(caribbean.production).toBeGreaterThan(0.5);
    expect(atlantic.production).toBeGreaterThan(0.5);
    expect(caribbean.authority).toBe(0);
    expect(atlantic.authority).toBe(0);
  });

  it("overlap mean alpha drops when a later clear source replaces earlier cloud", () => {
    const w = 80;
    const h = 8;
    const earlier = fillLayer(CLOUDS_SECTOR_GOES_EAST, w, h, (_i, x) => ({
      coverage: x < 50 ? 255 : 0,
      alpha: x < 50 ? 80 : 0,
    }));
    const later = fillLayer(CLOUDS_SECTOR_METEOSAT, w, h, (_i, x) => ({
      coverage: x >= 35 ? 255 : 0,
      alpha: x >= 62 ? 200 : 0,
    }));
    const o: CloudsSectorId[] = [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT];
    const auth = compositeCloudHighlightLayers([earlier, later], o)!;
    const prod = compositeByHighlightAlpha([earlier, later], o);
    let prodSum = 0;
    let authSum = 0;
    let n = 0;
    for (let x = 35; x < 50; x++) {
      const i = x;
      prodSum += prod[i * 4 + 3]!;
      authSum += auth.rgba[i * 4 + 3]!;
      n += 1;
    }
    expect(n).toBeGreaterThan(0);
    expect(prodSum / n).toBe(80);
    expect(authSum / n).toBe(0);
    expect(auth.rgba[70 * 4 + 3]).toBe(200);
  });

  it("coverage plane is one extra byte per pixel", () => {
    expect(east.coverageMask.byteLength).toBe(width * height);
    expect(msg.coverageMask.byteLength).toBe(width * height);
  });

  it("coverage-authority composition of 2048×1024 stays O(pixels) and off the order of rAF", () => {
    const t0 = performance.now();
    const again = compositeCloudHighlightLayers(layers, order);
    const dt = performance.now() - t0;
    expect(again).not.toBeNull();
    expect(dt).toBeLessThan(250);
  });
});

describe("WEATHER-4.1 WEATHER-3 doctrine preserved", () => {
  it("East 20:50 / West 20:40 / Meteosat 20:30 / Himawari 20:40 keeps all latest observations", () => {
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
          observationTimeMs: HIMAWARI_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    const times = painted.map((c) => c.observationTimeMs).sort();
    expect(times).toEqual([MSG_MS, WEST_MS, HIMAWARI_MS, EAST_MS].sort());
    const meta = buildCloudsCompositeMeta(painted);
    expect(meta!.newestObservationTimeMs).toBe(EAST_MS);
    expect(meta!.oldestObservationTimeMs).toBe(MSG_MS);
    const order = cloudsCompositePaintOrder(painted, PRODUCT_MS);
    expect(order[order.length - 1]).toBe(CLOUDS_SECTOR_GOES_EAST);
  });

  it("live adapter valid-clear regionals suppress cloudy ring", async () => {
    const clear = encodeCloudsTestPng({
      luma: 40,
      opaqueRatio: 1,
      fillAfricaEurope: true,
    });
    const fetchFn = vi.fn(
      mockCloudsLiveFetch({
        png: clear,
        eumetPng: encodeCloudsGlobalTestPng(),
        msgPng: clear,
      }),
    );
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 60_000,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const decoded = decodeCloudsPngRgba(result.entry.payloadBytes!);
    expect(decoded).not.toBeNull();
    let maxA = 0;
    for (let i = 3; i < decoded!.rgba.length; i += 4) {
      if (decoded!.rgba[i]! > maxA) maxA = decoded!.rgba[i]!;
    }
    expect(maxA).toBe(0);
  });

  it("clear coverage still counts as a status-visible contributing component", () => {
    const painted = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_METEOSAT,
          observationTimeMs: PRODUCT_MS - 8 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: PRODUCT_MS - 20 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    const meta = buildCloudsCompositeMeta(painted);
    expect(meta!.components).toHaveLength(2);
    expect(meta!.oldestObservationTimeMs).toBe(PRODUCT_MS - 20 * 60_000);
    expect(meta!.newestObservationTimeMs).toBe(PRODUCT_MS - 8 * 60_000);
  });
});
