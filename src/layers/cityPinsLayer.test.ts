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
import { createTimeContext } from "../core/time";
import type { OverlayReadabilityFrame } from "../core/overlayReadabilityFrame";
import { DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID } from "../config/appConfig";
import { REFERENCE_CITIES } from "../data/referenceCities";
import { createCityPinsLayer } from "./cityPinsLayer";
import { isCityPinsPayload } from "./cityPinsPayload";

const FONT = DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;

const fakeFrame: OverlayReadabilityFrame = {
  globalNightVeil01: 0.5,
  globalEmissiveLegibilityPressure01: 0,
  globalReadabilityVeil01: 0.8,
  substrateOverlayReadabilityLiftScale01: 0.9,
  nightVeil01At: () => 0,
  readabilityVeil01At: (_latDeg, _lonDeg) => 0.72,
};

describe("createCityPinsLayer", () => {
  const london = REFERENCE_CITIES.find((c) => c.id === "city.london")!;

  it("uses attached overlay readability frame when no pilot is set", () => {
    const layer = createCityPinsLayer(
      [london],
      [],
      {
        showLabels: true,
        labelMode: "city",
        scale: "medium",
        pinDateTimeDisplayMode: "time",
        displayTimeMode: "utc",
      },
      FONT,
      FONT,
    );
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isCityPinsPayload(st.data)).toBe(true);
    if (!isCityPinsPayload(st.data)) {
      return;
    }
    expect(st.data.cities[0]?.readabilityNightVeil01).toBe(0.72);
    expect(st.data.overlayReadabilityLiftScale01).toBe(0.9);
  });

  it("applies city pins pilot presentation after the shell frame", () => {
    const layer = createCityPinsLayer(
      [london],
      [],
      {
        showLabels: true,
        labelMode: "city",
        scale: "medium",
        pinDateTimeDisplayMode: "time",
        displayTimeMode: "utc",
      },
      FONT,
      FONT,
      {
        cityPinsReadabilityPresentation: {
          readabilityVeilScale01: 0.5,
          overlayLiftMultiplier01: 1,
        },
      },
    );
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isCityPinsPayload(st.data)).toBe(true);
    if (!isCityPinsPayload(st.data)) {
      return;
    }
    expect(st.data.cities[0]?.readabilityNightVeil01).toBeCloseTo(0.36, 5);
    expect(st.data.overlayReadabilityLiftScale01).toBeCloseTo(0.9, 5);
  });
});
