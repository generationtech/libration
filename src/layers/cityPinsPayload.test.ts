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
import { DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID } from "../config/appConfig";
import { CITY_PINS_KIND, isCityPinsPayload } from "./cityPinsPayload";

const FONT = DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;

function validPayload(
  cities: Array<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    kind: CITY_PINS_KIND,
    cities,
    showLabels: true,
    labelMode: "city",
    scale: "medium",
    cityNameFontAssetId: FONT,
    dateTimeFontAssetId: FONT,
  };
}

describe("isCityPinsPayload", () => {
  it("rejects readabilityNightVeil01 outside 0..1", () => {
    expect(
      isCityPinsPayload(
        validPayload([
          {
            id: "a",
            name: "A",
            latDeg: 0,
            lonDeg: 0,
            localTimeLabel: "",
            readabilityNightVeil01: 1.2,
          },
        ]),
      ),
    ).toBe(false);
  });

  it("accepts optional readabilityNightVeil01 in range", () => {
    expect(
      isCityPinsPayload(
        validPayload([
          {
            id: "a",
            name: "A",
            latDeg: 0,
            lonDeg: 0,
            localTimeLabel: "",
            readabilityNightVeil01: 0.4,
          },
        ]),
      ),
    ).toBe(true);
  });
});
