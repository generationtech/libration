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
import { DEFAULT_DISPLAY_TIME_CONFIG } from "../config/appConfig";
import { resolveReferenceCityObserverLocation, topBandAnchorEqual } from "./referenceCityObserver";

describe("resolveReferenceCityObserverLocation", () => {
  it("resolves the default fixedCity catalog coordinates", () => {
    const loc = resolveReferenceCityObserverLocation(DEFAULT_DISPLAY_TIME_CONFIG);
    expect(loc?.cityId).toBe("city.knoxville");
    expect(loc?.latitudeDeg).toBeCloseTo(35.9606, 3);
    expect(loc?.longitudeDeg).toBeCloseTo(-83.9207, 3);
  });

  it("returns null when the reference-city selector is not a known catalog city", () => {
    expect(
      resolveReferenceCityObserverLocation({
        ...DEFAULT_DISPLAY_TIME_CONFIG,
        topBandAnchor: { mode: "auto" },
      }),
    ).toBeNull();
    expect(
      resolveReferenceCityObserverLocation({
        ...DEFAULT_DISPLAY_TIME_CONFIG,
        topBandAnchor: { mode: "fixedLongitude", longitudeDeg: -84 },
      }),
    ).toBeNull();
    expect(
      resolveReferenceCityObserverLocation({
        ...DEFAULT_DISPLAY_TIME_CONFIG,
        topBandAnchor: { mode: "fixedCity", cityId: "city.unknown" },
      }),
    ).toBeNull();
  });

  it("does not invent a fallback city id", () => {
    const loc = resolveReferenceCityObserverLocation({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      topBandAnchor: { mode: "fixedCity", cityId: "city.sydney" },
    });
    expect(loc?.cityId).toBe("city.sydney");
    expect(loc?.latitudeDeg).toBeLessThan(0);
  });

  it("compares top-band anchors by mode and city id", () => {
    expect(
      topBandAnchorEqual(
        { mode: "fixedCity", cityId: "city.knoxville" },
        { mode: "fixedCity", cityId: "city.knoxville" },
      ),
    ).toBe(true);
    expect(
      topBandAnchorEqual(
        { mode: "fixedCity", cityId: "city.knoxville" },
        { mode: "fixedCity", cityId: "city.london" },
      ),
    ).toBe(false);
    expect(topBandAnchorEqual({ mode: "auto" }, { mode: "auto" })).toBe(true);
  });
});
