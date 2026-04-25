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
  classifyTwilightBand,
  CIVIL_TWILIGHT_HORIZON_OFFSET_DEG,
  solarAltitudeDegFromSurfaceSunDotProduct,
} from "./solarTwilight";

describe("solarAltitudeDegFromSurfaceSunDotProduct", () => {
  it("maps the zenith dot to +90 deg and the antisolar to −90 deg", () => {
    expect(solarAltitudeDegFromSurfaceSunDotProduct(1)).toBeCloseTo(90, 5);
    expect(solarAltitudeDegFromSurfaceSunDotProduct(-1)).toBeCloseTo(-90, 5);
  });

  it("treats the horizon as 0 deg", () => {
    expect(solarAltitudeDegFromSurfaceSunDotProduct(0)).toBe(0);
  });
});

describe("classifyTwilightBand", () => {
  it("classifies daylight, civil, nautical, astronomical, and night with stable boundaries", () => {
    expect(classifyTwilightBand(0.1)).toBe("daylight");
    expect(classifyTwilightBand(0)).toBe("civilTwilight");
    expect(classifyTwilightBand(-0.1)).toBe("civilTwilight");
    expect(classifyTwilightBand(-(CIVIL_TWILIGHT_HORIZON_OFFSET_DEG - 0.1))).toBe("civilTwilight");
    expect(classifyTwilightBand(-CIVIL_TWILIGHT_HORIZON_OFFSET_DEG)).toBe("nauticalTwilight");
    expect(classifyTwilightBand(-10)).toBe("nauticalTwilight");
    expect(classifyTwilightBand(-12)).toBe("astronomicalTwilight");
    expect(classifyTwilightBand(-16)).toBe("astronomicalTwilight");
    expect(classifyTwilightBand(-18)).toBe("night");
    expect(classifyTwilightBand(-45)).toBe("night");
  });
});
