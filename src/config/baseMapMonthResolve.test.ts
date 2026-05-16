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
  calendarMonthUtc1To12FromUnixMs,
  formatActiveUtcCivilMonthLabel,
  utcCivilMonthNameEn,
} from "./baseMapMonthResolve";

describe("baseMapMonthResolve display helpers", () => {
  it("calendarMonthUtc1To12FromUnixMs uses UTC civil month", () => {
    expect(calendarMonthUtc1To12FromUnixMs(Date.UTC(2024, 6, 15))).toBe(7);
    expect(calendarMonthUtc1To12FromUnixMs(Date.UTC(2024, 0, 1))).toBe(1);
  });

  it("utcCivilMonthNameEn returns English month names", () => {
    expect(utcCivilMonthNameEn(7)).toBe("July");
    expect(utcCivilMonthNameEn(12)).toBe("December");
  });

  it("formatActiveUtcCivilMonthLabel matches selector copy", () => {
    const julyMs = Date.UTC(2024, 6, 15);
    expect(formatActiveUtcCivilMonthLabel(julyMs)).toBe(
      "Displaying: July (UTC civil month 7)",
    );
  });
});
