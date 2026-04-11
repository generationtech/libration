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
import { DEFAULT_GEOGRAPHY_CONFIG } from "../config/appConfig";
import {
  geographyTimezoneStripReferenceLabel,
  REFERENCE_ZONE_TO_LONGITUDE_CITY_ID,
  resolveTopBandAnchorLongitudeDeg,
} from "./topBandAnchorLongitude";
import { utcOffsetHoursForTimeZone } from "../core/timeZoneOffset";

function lonForCityId(id: string): number {
  return REFERENCE_CITIES.find((c) => c.id === id)!.longitude;
}

describe("resolveTopBandAnchorLongitudeDeg", () => {
  it("utc24: auto resolves the same reference meridian as local modes (e.g. New York city for America/New_York)", () => {
    const nowMs = Date.UTC(2026, 5, 1, 12, 0, 0);
    const utc24 = resolveTopBandAnchorLongitudeDeg({
      nowMs,
      referenceTimeZone: "America/New_York",
      topBandMode: "utc24",
      topBandAnchor: { mode: "auto" },
    });
    const local24 = resolveTopBandAnchorLongitudeDeg({
      nowMs,
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
    });
    expect(utc24.referenceLongitudeDeg).toBeCloseTo(local24.referenceLongitudeDeg, 7);
    expect(utc24.anchorSource).toBe("referenceZoneLongitudeCity");
    expect(utc24.referenceLongitudeDeg).toBeCloseTo(lonForCityId("city.nyc"), 7);
    expect(utc24.referenceOffsetHours).toBeCloseTo(utcOffsetHoursForTimeZone(nowMs, "America/New_York"), 5);
  });

  it("auto: America/New_York maps to New York reference city longitude", () => {
    const nowMs = Date.UTC(2026, 7, 15, 16, 0, 0);
    const r = resolveTopBandAnchorLongitudeDeg({
      nowMs,
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
    });
    expect(r.anchorSource).toBe("referenceZoneLongitudeCity");
    expect(REFERENCE_ZONE_TO_LONGITUDE_CITY_ID["America/New_York"]).toBe("city.nyc");
    expect(r.referenceLongitudeDeg).toBeCloseTo(lonForCityId("city.nyc"), 7);
    expect(r.referenceOffsetHours).toBeCloseTo(utcOffsetHoursForTimeZone(nowMs, "America/New_York"), 5);
  });

  it("auto: Asia/Tokyo maps to Tokyo reference city longitude", () => {
    const nowMs = Date.UTC(2026, 2, 1, 12, 0, 0);
    const r = resolveTopBandAnchorLongitudeDeg({
      nowMs,
      referenceTimeZone: "Asia/Tokyo",
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
    });
    expect(r.anchorSource).toBe("referenceZoneLongitudeCity");
    expect(r.referenceLongitudeDeg).toBeCloseTo(lonForCityId("city.tokyo"), 7);
  });

  it("auto: unmapped zone falls back to 0° (Greenwich), not offset×15°", () => {
    const nowMs = Date.UTC(2026, 3, 10, 12, 0, 0);
    const off = utcOffsetHoursForTimeZone(nowMs, "Africa/Nairobi");
    expect(off).not.toBe(0);
    const r = resolveTopBandAnchorLongitudeDeg({
      nowMs,
      referenceTimeZone: "Africa/Nairobi",
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
    });
    expect(r.anchorSource).toBe("greenwichFallback");
    expect(r.referenceLongitudeDeg).toBe(0);
  });

  it("fixedLongitude in local modes", () => {
    const r = resolveTopBandAnchorLongitudeDeg({
      nowMs: Date.UTC(2026, 1, 1, 0, 0, 0),
      referenceTimeZone: "UTC",
      topBandMode: "local24",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: 123.45 },
    });
    expect(r.anchorSource).toBe("fixedLongitude");
    expect(r.referenceLongitudeDeg).toBe(123.45);
  });

  it("fixedCity uses longitude from reference city data", () => {
    const r = resolveTopBandAnchorLongitudeDeg({
      nowMs: Date.UTC(2026, 1, 1, 12, 0, 0),
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      topBandAnchor: { mode: "fixedCity", cityId: "city.tokyo" },
    });
    expect(r.anchorSource).toBe("fixedCity");
    expect(r.referenceLongitudeDeg).toBeCloseTo(lonForCityId("city.tokyo"), 7);
  });

  it("fixedCity with unknown id falls back to 0°", () => {
    const r = resolveTopBandAnchorLongitudeDeg({
      nowMs: Date.UTC(2026, 1, 1, 12, 0, 0),
      referenceTimeZone: "UTC",
      topBandMode: "local24",
      topBandAnchor: { mode: "fixedCity", cityId: "city.unknown" },
    });
    expect(r.anchorSource).toBe("greenwichFallback");
    expect(r.referenceLongitudeDeg).toBe(0);
  });

  it("auto: geography greenwich does not override zone-based meridian", () => {
    const nowMs = Date.UTC(2026, 5, 1, 12, 0, 0);
    const r = resolveTopBandAnchorLongitudeDeg({
      nowMs,
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
      geography: DEFAULT_GEOGRAPHY_CONFIG,
    });
    expect(r.anchorSource).toBe("referenceZoneLongitudeCity");
    expect(r.referenceLongitudeDeg).toBeCloseTo(lonForCityId("city.nyc"), 7);
  });

  it("auto: geography fixedCoordinate overrides zone-based meridian", () => {
    const nowMs = Date.UTC(2026, 5, 1, 12, 0, 0);
    const r = resolveTopBandAnchorLongitudeDeg({
      nowMs,
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
      geography: {
        ...DEFAULT_GEOGRAPHY_CONFIG,
        referenceMode: "fixedCoordinate",
        fixedCoordinate: { latitude: -33, longitude: 151.2, label: "Sydney area" },
      },
    });
    expect(r.anchorSource).toBe("geographyFixedCoordinate");
    expect(r.referenceLongitudeDeg).toBeCloseTo(151.2, 7);
  });

  it("fixedLongitude ignores geography fixedCoordinate", () => {
    const r = resolveTopBandAnchorLongitudeDeg({
      nowMs: Date.UTC(2026, 1, 1, 0, 0, 0),
      referenceTimeZone: "UTC",
      topBandMode: "local24",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: 42 },
      geography: {
        ...DEFAULT_GEOGRAPHY_CONFIG,
        referenceMode: "fixedCoordinate",
        fixedCoordinate: { latitude: 0, longitude: 99, label: "x" },
      },
    });
    expect(r.anchorSource).toBe("fixedLongitude");
    expect(r.referenceLongitudeDeg).toBe(42);
  });

  it("geographyTimezoneStripReferenceLabel is null unless flag and geography-driven anchor", () => {
    const geo: typeof DEFAULT_GEOGRAPHY_CONFIG = {
      ...DEFAULT_GEOGRAPHY_CONFIG,
      referenceMode: "fixedCoordinate",
      fixedCoordinate: { latitude: 0, longitude: 10, label: "  Home  " },
      showFixedCoordinateLabelInTimezoneStrip: true,
    };
    expect(geographyTimezoneStripReferenceLabel(geo, "geographyFixedCoordinate")).toBe("Home");
    expect(geographyTimezoneStripReferenceLabel(geo, "fixedLongitude")).toBe(null);
    expect(
      geographyTimezoneStripReferenceLabel(
        { ...geo, showFixedCoordinateLabelInTimezoneStrip: false },
        "geographyFixedCoordinate",
      ),
    ).toBe(null);
    expect(
      geographyTimezoneStripReferenceLabel(
        { ...geo, fixedCoordinate: { ...geo.fixedCoordinate, label: "   " } },
        "geographyFixedCoordinate",
      ),
    ).toBe(null);
  });
});
