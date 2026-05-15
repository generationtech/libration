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
  illuminationNightVeil01FromSolarAltitudeDeg,
  ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG,
  ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG,
} from "./nightVeilFromSolarAltitude";

describe("illuminationNightVeil01FromSolarAltitudeDeg", () => {
  it("is near zero for high solar altitude (clear day reference)", () => {
    expect(illuminationNightVeil01FromSolarAltitudeDeg(45)).toBeLessThan(0.05);
  });

  it("approaches one deep below the night settle altitude", () => {
    expect(illuminationNightVeil01FromSolarAltitudeDeg(ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG)).toBeGreaterThan(
      0.99,
    );
  });

  it("ramps between daylight clear and deep night anchors", () => {
    const mid =
      (illuminationNightVeil01FromSolarAltitudeDeg(ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG) +
        illuminationNightVeil01FromSolarAltitudeDeg(ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG)) /
      2;
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.85);
  });
});
