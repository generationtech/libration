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
import { resolveEclipseFrame } from "../core/eclipse/eclipseEventService";
import { createTimeContext } from "../core/time";
import { createSolarShadingLayer } from "./solarShadingLayer";
import { isSolarShadingPayload } from "./solarShadingPayload";

const TOTALITY = Date.parse("2022-05-16T04:11:29.000Z");
const BEFORE = Date.parse("2022-05-16T01:20:00.000Z");

describe("solar shading moonlight transmission", () => {
  it("attenuates moonlight from lunar geometry even without a lunar overlay toggle", () => {
    const layer = createSolarShadingLayer({ moonlightMode: "illustrative" });
    const before = layer.getState(
      createTimeContext(BEFORE, 0, true, {
        eclipseFrame: resolveEclipseFrame(BEFORE, { horizonMs: 0, lunarHorizonMs: 0 }),
      }),
    );
    const total = layer.getState(
      createTimeContext(TOTALITY, 0, true, {
        eclipseFrame: resolveEclipseFrame(TOTALITY, { horizonMs: 0, lunarHorizonMs: 0 }),
      }),
    );
    expect(isSolarShadingPayload(before.data)).toBe(true);
    expect(isSolarShadingPayload(total.data)).toBe(true);
    if (isSolarShadingPayload(before.data) && isSolarShadingPayload(total.data)) {
      expect(before.data.moonlightTransmission01).toBe(1);
      expect(total.data.moonlightTransmission01).toBeLessThan(0.1);
      expect(total.data.lunarIlluminatedFraction).toBeGreaterThan(0.9);
    }
  });
});

const SOLAR_2017_GE = Date.parse("2017-08-21T18:25:29.700Z");
const SOLAR_2017_UPCOMING = Date.parse("2017-08-21T14:42:59.000Z");
const QUIET = Date.parse("2024-01-15T00:00:00.000Z");

describe("solar shading active eclipse daylight attenuation", () => {
  it("attaches a daylight transmission field only while a solar eclipse is active", () => {
    const layer = createSolarShadingLayer({
      moonlightMode: "illustrative",
      activeEclipseShadingEnabled: true,
    });
    const quiet = layer.getState(
      createTimeContext(QUIET, 0, true, {
        eclipseFrame: resolveEclipseFrame(QUIET, { horizonMs: 0 }),
      }),
    );
    const upcoming = layer.getState(
      createTimeContext(SOLAR_2017_UPCOMING, 0, true, {
        eclipseFrame: resolveEclipseFrame(SOLAR_2017_UPCOMING, { horizonMs: 7 * 86_400_000 }),
      }),
    );
    const active = layer.getState(
      createTimeContext(SOLAR_2017_GE, 0, true, {
        eclipseFrame: resolveEclipseFrame(SOLAR_2017_GE, { horizonMs: 0 }),
      }),
    );
    expect(isSolarShadingPayload(quiet.data)).toBe(true);
    expect(isSolarShadingPayload(upcoming.data)).toBe(true);
    expect(isSolarShadingPayload(active.data)).toBe(true);
    if (
      isSolarShadingPayload(quiet.data) &&
      isSolarShadingPayload(upcoming.data) &&
      isSolarShadingPayload(active.data)
    ) {
      expect(quiet.data.daylightTransmissionField).toBeUndefined();
      expect(upcoming.data.daylightTransmissionField).toBeUndefined();
      expect(active.data.daylightTransmissionField).toBeDefined();
      expect(active.data.daylightTransmissionField!.transmission01.some((t) => t < 0.9)).toBe(true);
    }
  });

  it("omits the field when physical shading is disabled", () => {
    const layer = createSolarShadingLayer({
      moonlightMode: "illustrative",
      activeEclipseShadingEnabled: false,
    });
    const active = layer.getState(
      createTimeContext(SOLAR_2017_GE, 0, true, {
        eclipseFrame: resolveEclipseFrame(SOLAR_2017_GE, { horizonMs: 0 }),
      }),
    );
    expect(isSolarShadingPayload(active.data)).toBe(true);
    if (isSolarShadingPayload(active.data)) {
      expect(active.data.daylightTransmissionField).toBeUndefined();
    }
  });
});
