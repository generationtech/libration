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
  getCalendarYmdInZone,
  readWallClockPartsInZone,
  utcMsFromWallDateTimeInZone,
  zonedCalendarDayStartMs,
} from "./wallTimeInZone";

describe("wallTimeInZone", () => {
  it("utcMsFromWallDateTimeInZone round-trips a summer Eastern civil time", () => {
    const zone = "America/New_York";
    const expectedUtc = Date.UTC(2030, 5, 15, 16, 3, 3, 172);
    const back = utcMsFromWallDateTimeInZone(2030, 6, 15, 12, 3, 3, 172, zone);
    expect(back).toBe(expectedUtc);
    const parts = readWallClockPartsInZone(expectedUtc, zone);
    expect(parts).toMatchObject({ y: 2030, mo: 6, d: 15, h: 12, mi: 3, s: 3, ms: 172 });
  });

  it("getCalendarYmdInZone matches readWallClockPartsInZone date fields", () => {
    const t = Date.UTC(2030, 5, 15, 16, 3, 3, 0);
    const ymd = getCalendarYmdInZone(t, "America/New_York");
    const p = readWallClockPartsInZone(t, "America/New_York");
    expect(ymd).toEqual({ y: p.y, m: p.mo, d: p.d });
  });

  it("zonedCalendarDayStartMs agrees with prior displayChrome behavior for Tokyo", () => {
    const probe = Date.UTC(2026, 3, 4, 14, 30, 0);
    const start = zonedCalendarDayStartMs(probe, "Asia/Tokyo");
    expect(getCalendarYmdInZone(start, "Asia/Tokyo")).toEqual(getCalendarYmdInZone(probe, "Asia/Tokyo"));
    expect(getCalendarYmdInZone(start - 1, "Asia/Tokyo")).not.toEqual(getCalendarYmdInZone(probe, "Asia/Tokyo"));
  });
});
