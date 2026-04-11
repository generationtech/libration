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

import type { BottomBarDayCell } from "./bottomChromeTypes";

/**
 * Western calendar extreme (UTC−12): Americas side of the international date line.
 * `Etc/GMT+12` is the portable IANA id for UTC−12 (sign in the name is POSIX-inverted).
 */
export const DAY_LINE_WEST_CALENDAR_TIME_ZONE = "Etc/GMT+12";

/**
 * Eastern calendar extreme (UTC+14): Asia–Pacific side of the international date line.
 */
export const DAY_LINE_EAST_CALENDAR_TIME_ZONE = "Pacific/Kiritimati";

/** Wall-calendar cell for one side of the global date transition at {@code nowMs}. */
export function formatDayLineSideReadout(nowMs: number, timeZone: string): BottomBarDayCell {
  const d = new Date(nowMs);
  const weekdayShort = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(d);
  const monthShort = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }).format(d);
  const dayOfMonth = Number.parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(d),
    10,
  );
  return { weekdayShort, monthShort, dayOfMonth };
}
