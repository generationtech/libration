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
  monthNumbersToTryBackwardsCivil,
  resolveMonthOfYearRasterSrc,
  type MonthOfYearFamilyPaths,
} from "./baseMapMonthResolve";

const family = (overrides: Partial<MonthOfYearFamilyPaths> = {}): MonthOfYearFamilyPaths => ({
  familyBaseSrc: "/maps/variants/test/base.jpg",
  monthAssetSrcs: [
    "/m/01.jpg",
    "/m/02.jpg",
    "/m/03.jpg",
    "/m/04.jpg",
    "/m/05.jpg",
    "/m/06.jpg",
    "/m/07.jpg",
    "/m/08.jpg",
    "/m/09.jpg",
    "/m/10.jpg",
    "/m/11.jpg",
    "/m/12.jpg",
  ],
  ...overrides,
});

describe("baseMapMonthResolve", () => {
  it("maps Unix ms to UTC civil month 1–12", () => {
    expect(calendarMonthUtc1To12FromUnixMs(Date.UTC(2024, 0, 15))).toBe(1);
    expect(calendarMonthUtc1To12FromUnixMs(Date.UTC(2024, 11, 31, 23, 59))).toBe(12);
    expect(calendarMonthUtc1To12FromUnixMs(Date.UTC(2024, 5, 1))).toBe(6);
  });

  it("walks months backward from the start month with year wrap", () => {
    expect(monthNumbersToTryBackwardsCivil(1)).toEqual([1, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    expect(monthNumbersToTryBackwardsCivil(6)).toEqual([6, 5, 4, 3, 2, 1, 12, 11, 10, 9, 8, 7]);
  });

  it("resolves the exact current month when onboarded", () => {
    const f = family();
    expect(resolveMonthOfYearRasterSrc(f, 7)).toBe("/m/07.jpg");
  });

  it("rolls back to the previous month when the current month is missing", () => {
    const f = family({ onboardedMonths: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12] });
    expect(resolveMonthOfYearRasterSrc(f, 6)).toBe("/m/05.jpg");
  });

  it("January missing naturally rolls back to December", () => {
    const f = family({ onboardedMonths: [12] });
    expect(resolveMonthOfYearRasterSrc(f, 1)).toBe("/m/12.jpg");
  });

  it("uses family base when no monthly assets exist", () => {
    const f = family({ onboardedMonths: [] });
    expect(resolveMonthOfYearRasterSrc(f, 3)).toBe("/maps/variants/test/base.jpg");
  });

  it("returns empty string when family base is empty so callers can apply legacy/global fallbacks", () => {
    const f = family({ familyBaseSrc: "", onboardedMonths: [] });
    expect(resolveMonthOfYearRasterSrc(f, 3)).toBe("");
  });
});
