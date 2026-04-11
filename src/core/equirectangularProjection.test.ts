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
import { REFERENCE_CITIES } from "../data/referenceCities";
import { buildUtcTopScaleLayout, computeUtcSubsolarLongitudeDeg } from "../renderer/displayChrome";
import {
  computeDayLineIndicatorCenterX,
  computeRawDayLineSeamCenterX,
  INTERNATIONAL_DATE_LINE_LONGITUDE_DEG,
  longitudeDegFromMapX,
  mapXFromLongitudeDeg,
} from "./equirectangularProjection";

/** Mirror of CanvasRenderBackend city pin x (scene longitude → x). */
function scenePinXFromLongitude(lonDeg: number, viewportWidthPx: number): number {
  return mapXFromLongitudeDeg(lonDeg, viewportWidthPx);
}

describe("computeRawDayLineSeamCenterX", () => {
  it("places the raw seam center on mapX(−180°) when that copy is valid (not the viewport center)", () => {
    const w = 1920;
    const stripW = 400;
    const raw = computeRawDayLineSeamCenterX(w, stripW);
    expect(raw).toBe(mapXFromLongitudeDeg(-INTERNATIONAL_DATE_LINE_LONGITUDE_DEG, w));
    expect(raw).not.toBeCloseTo(w * 0.5, 3);
  });
});

describe("computeDayLineIndicatorCenterX", () => {
  it("clamps a left-edge raw seam so the full strip stays on-screen", () => {
    const w = 1920;
    const stripW = 400;
    const half = stripW * 0.5;
    const inset = 16;
    const raw = computeRawDayLineSeamCenterX(w, stripW);
    expect(raw).toBe(0);
    const cx = computeDayLineIndicatorCenterX(w, stripW, inset);
    expect(cx).toBe(half + inset);
    expect(cx - half).toBeGreaterThanOrEqual(inset);
    expect(cx + half).toBeLessThanOrEqual(w - inset);
  });

  it("for typical viewports keeps the strip fully visible with modest inset", () => {
    for (const w of [640, 900, 1920, 2560]) {
      const stripW = Math.min(360, Math.round(w * 0.36));
      const inset = Math.max(8, Math.round(w * 0.012));
      const cx = computeDayLineIndicatorCenterX(w, stripW, inset);
      const half = stripW * 0.5;
      expect(cx - half).toBeGreaterThanOrEqual(inset - 0.5);
      expect(cx + half).toBeLessThanOrEqual(w - inset + 0.5);
    }
  });
});

describe("equirectangular longitude ↔ x (shared chrome + scene registration)", () => {
  const widthPx = 2400;

  it("Greenwich (0°): tape anchor x equals scene pin x and is mid-strip", () => {
    const lon = 0;
    const xMap = scenePinXFromLongitude(lon, widthPx);
    const xTape = mapXFromLongitudeDeg(lon, widthPx);
    expect(xMap).toBeCloseTo(xTape, 10);
    expect(xMap).toBeCloseTo(widthPx / 2, 10);
    expect(longitudeDegFromMapX(xMap, widthPx)).toBeCloseTo(0, 10);
  });

  it("utc24 top-band tape anchor x matches the resolved reference meridian (same x as scene pin for that lon)", () => {
    const nowMs = Date.UTC(2026, 5, 15, 14, 30, 45, 123);
    const londonLon = REFERENCE_CITIES.find((c) => c.id === "city.london")!.longitude;
    const subsolarLon = computeUtcSubsolarLongitudeDeg(nowMs);
    const layout = buildUtcTopScaleLayout(nowMs, widthPx, 104, {
      referenceTimeZone: "Europe/London",
      topBandMode: "utc24",
      topBandAnchor: { mode: "auto" },
    });
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(londonLon, 5);
    expect(layout.topBandAnchor.referenceLongitudeDeg).not.toBeCloseTo(subsolarLon, 1);
    expect(layout.topBandAnchor.anchorX).toBeCloseTo(scenePinXFromLongitude(londonLon, widthPx), 10);
  });

  it("New York: tape anchor meridian x matches reference city pin x", () => {
    const nyc = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!;
    const xMap = scenePinXFromLongitude(nyc.longitude, widthPx);
    const xTape = mapXFromLongitudeDeg(nyc.longitude, widthPx);
    expect(xMap).toBeCloseTo(xTape, 10);
    expect(xMap).toBeCloseTo(((nyc.longitude + 180) / 360) * widthPx, 10);
  });

  it("round-trip: mapX then longitudeDegFromMapX recovers longitude (NY + Greenwich)", () => {
    for (const lon of [0, REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude]) {
      const x = mapXFromLongitudeDeg(lon, widthPx);
      expect(longitudeDegFromMapX(x, widthPx)).toBeCloseTo(lon, 10);
    }
  });

  it("top-band tape anchor x matches scene pin x for the resolved reference meridian", () => {
    const nycLon = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude;
    const layout = buildUtcTopScaleLayout(Date.now(), widthPx, 104, {
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
    });
    const { topBandAnchor: anchor } = layout;
    expect(anchor.referenceLongitudeDeg).toBeCloseTo(nycLon, 3);
    expect(anchor.anchorX).toBeCloseTo(scenePinXFromLongitude(nycLon, widthPx), 10);
  });
});
