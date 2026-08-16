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
import { getLunarEclipseEventById } from "./eclipseAuthority";
import {
  LUNAR_FORECAST_VISIBILITY_ALGORITHM_ID,
  lunarEclipseEventForecastGeometry,
  resetLunarEclipseForecastGeometryCacheForTests,
} from "./lunarEclipseForecastGeometry";
import { isMoonGeometricallyAboveHorizon } from "./lunarVisibilityGeometry";

const KNOXVILLE = { latDeg: 35.9606, lonDeg: -83.9207 };
const TOKYO = { latDeg: 35.6762, lonDeg: 139.6503 };

function antipode(latDeg: number, lonDeg: number): { latDeg: number; lonDeg: number } {
  const lon = lonDeg + 180;
  return { latDeg: -latDeg, lonDeg: lon > 180 ? lon - 360 : lon };
}

describe("lunar eclipse forecast geometry", () => {
  it("places the GE zenith inside the Moon-visible region and the antipode outside", () => {
    resetLunarEclipseForecastGeometryCacheForTests();
    const event = getLunarEclipseEventById("nasa-5mcle-lunar-9700")!;
    const geom = lunarEclipseEventForecastGeometry(event);
    expect(geom.algorithmId).toBe(LUNAR_FORECAST_VISIBILITY_ALGORITHM_ID);
    expect(geom.subtype).toBe("total");
    expect(geom.moonVisibleRegion.length).toBeGreaterThan(8);
    expect(
      isMoonGeometricallyAboveHorizon(
        event.zenithLatDeg,
        event.zenithLonDeg,
        event.zenithLatDeg,
        event.zenithLonDeg,
      ),
    ).toBe(true);
    const ap = antipode(event.zenithLatDeg, event.zenithLonDeg);
    expect(
      isMoonGeometricallyAboveHorizon(ap.latDeg, ap.lonDeg, event.zenithLatDeg, event.zenithLonDeg),
    ).toBe(false);
  });

  it("is cached by event id and does not invert the hemisphere", () => {
    resetLunarEclipseForecastGeometryCacheForTests();
    const event = getLunarEclipseEventById("nasa-5mcle-lunar-9700")!;
    const a = lunarEclipseEventForecastGeometry(event);
    const b = lunarEclipseEventForecastGeometry(event);
    expect(a).toBe(b);
    expect(a.zenithLatDeg).toBe(event.zenithLatDeg);
    expect(a.polarCloseLatDeg === 90 || a.polarCloseLatDeg === -90 || a.polarCloseLatDeg === undefined).toBe(
      true,
    );
  });

  it("keeps known cities in or out of the GE Moon-visible region", () => {
    const event = getLunarEclipseEventById("nasa-5mcle-lunar-9700")!;
    const knoxUp = isMoonGeometricallyAboveHorizon(
      KNOXVILLE.latDeg,
      KNOXVILLE.lonDeg,
      event.zenithLatDeg,
      event.zenithLonDeg,
    );
    const tokyoUp = isMoonGeometricallyAboveHorizon(
      TOKYO.latDeg,
      TOKYO.lonDeg,
      event.zenithLatDeg,
      event.zenithLonDeg,
    );
    expect(knoxUp).not.toBe(tokyoUp);
  });

  it("wraps a dateline zenith without inventing a solar-style path", () => {
    const event = getLunarEclipseEventById("nasa-5mcle-lunar-9684")!;
    const geom = lunarEclipseEventForecastGeometry(event);
    expect(geom.moonVisibleRegion.length).toBeGreaterThan(8);
    expect(geom.moonVisibleRegion.some((p) => Math.abs(p.lonDeg) > 170)).toBe(true);
  });
});
