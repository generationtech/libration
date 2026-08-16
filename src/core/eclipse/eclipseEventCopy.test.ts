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
  formatEclipseCalendarDate,
  formatEclipseRelativeTime,
  lunarEclipseTypeTitle,
  solarCentralPathLabel,
  solarEclipseTypeTitle,
} from "./eclipseEventCopy";

describe("eclipse event copy", () => {
  it("names solar and lunar types accessibly", () => {
    expect(solarEclipseTypeTitle("total")).toBe("Total solar eclipse");
    expect(solarEclipseTypeTitle("annular")).toBe("Annular solar eclipse");
    expect(solarEclipseTypeTitle("partial")).toBe("Partial solar eclipse");
    expect(solarEclipseTypeTitle("hybrid")).toBe("Hybrid solar eclipse");
    expect(lunarEclipseTypeTitle("total")).toBe("Total lunar eclipse");
    expect(lunarEclipseTypeTitle("partial")).toBe("Partial lunar eclipse");
    expect(lunarEclipseTypeTitle("penumbral")).toBe("Penumbral lunar eclipse");
    expect(solarCentralPathLabel("annular")).toBe("Path of annularity");
    expect(solarCentralPathLabel("total")).toBe("Path of totality");
  });

  it("formats calendar dates from authority fields, not the browser zone", () => {
    expect(formatEclipseCalendarDate({ year: 2024, month: 4, day: 8 })).toBe("Apr 8 2024");
  });

  it("formats relative time from product instants only", () => {
    const t0 = Date.parse("2024-04-03T18:00:00.000Z");
    expect(formatEclipseRelativeTime(t0, t0 + 25 * 60_000)).toBe("in 25m");
    expect(formatEclipseRelativeTime(t0, t0 + 3 * 3_600_000 + 12 * 60_000)).toBe("in 3h 12m");
    expect(formatEclipseRelativeTime(t0, Date.parse("2024-04-08T18:00:00.000Z"))).toBe("in 5d");
    expect(formatEclipseRelativeTime(t0, t0 - 1_000)).toBe("now");
  });
});
