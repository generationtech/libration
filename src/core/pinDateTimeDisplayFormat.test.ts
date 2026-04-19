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

describe("formatPinDateTimeLabel", () => {
  const instant = Date.parse("2030-06-15T12:00:00.000Z");
  const zone = "UTC";

  it("matches legacy wall-clock formatting for timeWithSeconds (shipped default)", () => {
    expect(formatPinDateTimeLabel(instant, zone, "timeWithSeconds")).toBe(
      formatWallClockInTimeZone(instant, zone),
    );
  });

  it("hidden yields empty string", () => {
    expect(formatPinDateTimeLabel(instant, zone, "hidden")).toBe("");
  });

  it("time omits seconds compared to timeWithSeconds", () => {
    const withSec = formatPinDateTimeLabel(instant, zone, "timeWithSeconds");
    const noSec = formatPinDateTimeLabel(instant, zone, "time");
    expect((withSec.match(/:/g) ?? []).length).toBeGreaterThan((noSec.match(/:/g) ?? []).length);
  });

  it("dateOnly contains no typical time separator pattern for UTC noon", () => {
    const s = formatPinDateTimeLabel(instant, zone, "dateOnly");
    expect(s.length).toBeGreaterThan(4);
    expect(s).not.toMatch(/^\d{1,2}:\d{2}/);
  });

  it("timeAndDate contains a separator between time and date segments", () => {
    const s = formatPinDateTimeLabel(instant, zone, "timeAndDate");
    expect(s).toContain("·");
  });
});
