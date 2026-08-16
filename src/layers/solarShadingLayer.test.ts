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
