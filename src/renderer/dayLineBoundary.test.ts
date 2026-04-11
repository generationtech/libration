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
  DAY_LINE_EAST_CALENDAR_TIME_ZONE,
  DAY_LINE_WEST_CALENDAR_TIME_ZONE,
  formatDayLineSideReadout,
} from "./dayLineBoundary";

describe("formatDayLineSideReadout", () => {
  it("uses fixed extreme-offset zones so west/east calendar days straddle the global boundary deterministically", () => {
    const t0 = 1_704_067_200_000;
    expect(formatDayLineSideReadout(t0, DAY_LINE_WEST_CALENDAR_TIME_ZONE)).toMatchObject({
      weekdayShort: "Sun",
      monthShort: "Dec",
      dayOfMonth: 31,
    });
    expect(formatDayLineSideReadout(t0, DAY_LINE_EAST_CALENDAR_TIME_ZONE)).toMatchObject({
      weekdayShort: "Mon",
      monthShort: "Jan",
      dayOfMonth: 1,
    });
  });
});
