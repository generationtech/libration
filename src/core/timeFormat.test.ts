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
import { formatWallClockInTimeZone, intlHourOptionForClock, localePrefersHour12 } from "./timeFormat";

describe("intlHourOptionForClock", () => {
  it("uses numeric hours for 12-hour mode and two-digit hours for 24-hour mode", () => {
    expect(intlHourOptionForClock(true)).toBe("numeric");
    expect(intlHourOptionForClock(false)).toBe("2-digit");
  });
});

describe("formatWallClockInTimeZone seconds toggle", () => {
  it("omits seconds when includeSeconds is false", () => {
    const sevenPm = Date.UTC(2024, 5, 10, 19, 7, 59);
    const withSec = formatWallClockInTimeZone(sevenPm, "UTC", false, { includeSeconds: true });
    const noSec = formatWallClockInTimeZone(sevenPm, "UTC", false, { includeSeconds: false });
    expect(withSec).toMatch(/19:07:59/);
    expect(noSec).toMatch(/19:07\b/);
    expect(noSec).not.toMatch(/19:07:59/);
  });
});

describe("formatWallClockInTimeZone hour padding", () => {
  const sevenPm = Date.UTC(2024, 0, 1, 19, 7, 59);
  const sevenAm = Date.UTC(2024, 0, 1, 7, 7, 59);

  it("12-hour explicit mode does not left-pad the hour (e.g. 7:07:59 PM, not 07:07:59 PM)", () => {
    const s = formatWallClockInTimeZone(sevenPm, "UTC", true);
    expect(s).not.toMatch(/^0\d:/);
    expect(s).toMatch(/\b7:07:59/);
    expect(s).toMatch(/\b(AM|PM)\b/i);
  });

  it("24-hour explicit mode pads the hour to two digits (e.g. 07:07:59)", () => {
    expect(formatWallClockInTimeZone(sevenAm, "UTC", false)).toMatch(/^07:07:59/);
    expect(formatWallClockInTimeZone(sevenPm, "UTC", false)).toMatch(/^19:07:59/);
  });

  it("implicit locale mode follows localePrefersHour12 for padding", () => {
    const s = formatWallClockInTimeZone(sevenPm, "UTC");
    if (localePrefersHour12()) {
      expect(s).not.toMatch(/^0\d:/);
    } else {
      expect(s).toMatch(/^19:07:59/);
    }
  });
});

