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
  parseCloudsSectorDebugMode,
  tintCloudsCompositeByWinningSector,
} from "./cloudsSectorDebugTint";
import {
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_METEOSAT,
} from "../lifecycle/cloudsSectors";
import type { CloudsHighlightLayer } from "../lifecycle/cloudsComposite";
import { CLOUD_HIGHLIGHT_RGB } from "../lifecycle/cloudHighlightTransfer";

function layer(
  sectorId: CloudsHighlightLayer["sectorId"],
  coverage: readonly number[],
  alpha: readonly number[],
): CloudsHighlightLayer {
  const n = coverage.length;
  const rgba = new Uint8Array(n * 4);
  const coverageMask = Uint8Array.from(coverage);
  for (let i = 0; i < n; i++) {
    rgba[i * 4] = CLOUD_HIGHLIGHT_RGB.r;
    rgba[i * 4 + 1] = CLOUD_HIGHLIGHT_RGB.g;
    rgba[i * 4 + 2] = CLOUD_HIGHLIGHT_RGB.b;
    rgba[i * 4 + 3] = alpha[i]!;
  }
  return { sectorId, width: n, height: 1, rgba, coverageMask };
}

describe("DEV Clouds coverage diagnostic", () => {
  it("parses coverage, signal, and leak modes", () => {
    expect(parseCloudsSectorDebugMode("1")).toBe("coverage");
    expect(parseCloudsSectorDebugMode("coverage")).toBe("coverage");
    expect(parseCloudsSectorDebugMode("winner")).toBe("coverage");
    expect(parseCloudsSectorDebugMode("signal")).toBe("signal");
    expect(parseCloudsSectorDebugMode("leak")).toBe("leak");
    expect(parseCloudsSectorDebugMode("0")).toBeNull();
  });

  it("coverage mode tints valid-clear pixels; signal mode does not", () => {
    const ring = layer(CLOUDS_SECTOR_EUMET_RING, [255, 255], [180, 180]);
    const east = layer(CLOUDS_SECTOR_GOES_EAST, [255, 0], [0, 0]);
    const base = new Uint8Array(8);
    const order = [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_EAST] as const;
    const coverage = tintCloudsCompositeByWinningSector(
      base,
      [ring, east],
      order,
      "coverage",
    );
    const signal = tintCloudsCompositeByWinningSector(
      base,
      [ring, east],
      order,
      "signal",
    );
    expect(coverage[0]).not.toBe(coverage[4]);
    expect(signal[0]).toBe(signal[4]);
  });

  it("leak mode marks suppressed earlier cloud under later clear coverage", () => {
    const east = layer(CLOUDS_SECTOR_GOES_EAST, [255], [200]);
    const msg = layer(CLOUDS_SECTOR_METEOSAT, [255], [0]);
    const base = new Uint8Array(4);
    const leak = tintCloudsCompositeByWinningSector(
      base,
      [east, msg],
      [CLOUDS_SECTOR_GOES_EAST, CLOUDS_SECTOR_METEOSAT],
      "leak",
    );
    expect(leak[0]).toBe(255);
    expect(leak[1]).toBe(64);
  });
});
