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
import { formatWallClockInTimeZone } from "./timeFormat";
import { formatPinDateTimeLabel } from "./pinDateTimeDisplayFormat";
import { formatNatoUtcOffsetHoursLabel } from "./structuralMeridianUtcOffsetHours";

describe("formatNatoUtcOffsetHoursLabel", () => {
  it("uses compact signed integer hours", () => {
    expect(formatNatoUtcOffsetHoursLabel(0)).toBe("0");
    expect(formatNatoUtcOffsetHoursLabel(3)).toBe("+3");
    expect(formatNatoUtcOffsetHoursLabel(-2)).toBe("-2");
    expect(formatNatoUtcOffsetHoursLabel(12)).toBe("+12");
    expect(formatNatoUtcOffsetHoursLabel(-12)).toBe("-12");
  });
});

describe("formatPinDateTimeLabel", () => {
  const instant = Date.parse("2030-06-15T12:00:00.000Z");
  const zone = "UTC";

  it("12hr mode matches explicit 12-hour wall clock in the pin zone", () => {
    expect(formatPinDateTimeLabel(instant, zone, "timeWithSeconds", "12hr")).toBe(
      formatWallClockInTimeZone(instant, zone, true),
    );
  });

  it("24hr mode matches explicit 24-hour wall clock in the pin zone", () => {
    expect(formatPinDateTimeLabel(instant, zone, "timeWithSeconds", "24hr")).toBe(
      formatWallClockInTimeZone(instant, zone, false),
    );
  });

  it("UTC mode shows UTC clock digits for the instant (ignores pin IANA zone for the clock line)", () => {
    const nyc = "America/New_York";
    const utcStr = formatPinDateTimeLabel(instant, nyc, "timeWithSeconds", "utc");
    expect(utcStr).toBe(formatWallClockInTimeZone(instant, "UTC", false));
    expect(utcStr).toMatch(/^12:/);
  });

  it("hidden yields empty string", () => {
    expect(formatPinDateTimeLabel(instant, zone, "hidden", "24hr")).toBe("");
  });

  it("time omits seconds compared to timeWithSeconds", () => {
    const withSec = formatPinDateTimeLabel(instant, zone, "timeWithSeconds", "24hr");
    const noSec = formatPinDateTimeLabel(instant, zone, "time", "24hr");
    expect((withSec.match(/:/g) ?? []).length).toBeGreaterThan((noSec.match(/:/g) ?? []).length);
  });

  it("dateOnly contains no typical time separator pattern for UTC noon (UTC display mode)", () => {
    const s = formatPinDateTimeLabel(instant, zone, "dateOnly", "utc");
    expect(s.length).toBeGreaterThan(4);
    expect(s).not.toMatch(/^\d{1,2}:\d{2}/);
  });

  it("timeAndDate contains a separator between time and date segments", () => {
    const s = formatPinDateTimeLabel(instant, zone, "timeAndDate", "24hr");
    expect(s).toContain("·");
  });
});
