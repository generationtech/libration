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

/**
 * Convert Eclipse Tour date-only range fields into UTC instants using the same
 * civil zone policy as Demo start fields: UTC civil frame when the top band is
 * UTC; otherwise the resolved reference IANA zone.
 */

import { utcMsFromWallDateTimeInZone, utcMsFromWallDateTimeUtc } from "../wallTimeInZone";
import { parseIsoCalendarYmd } from "./eclipseTourAppearance";

export function eclipseTourRangeUtcMs(
  startDateYmd: string,
  endDateYmd: string,
  useUtcCivilFrame: boolean,
  ianaTimeZone: string,
): { readonly startUtcMs: number; readonly endUtcMs: number } | null {
  const start = parseIsoCalendarYmd(startDateYmd);
  const end = parseIsoCalendarYmd(endDateYmd);
  if (!start || !end) {
    return null;
  }
  const startUtcMs = useUtcCivilFrame
    ? utcMsFromWallDateTimeUtc(start.y, start.m, start.d, 0, 0, 0, 0)
    : utcMsFromWallDateTimeInZone(start.y, start.m, start.d, 0, 0, 0, 0, ianaTimeZone);
  const endUtcMs = useUtcCivilFrame
    ? utcMsFromWallDateTimeUtc(end.y, end.m, end.d, 23, 59, 59, 999)
    : utcMsFromWallDateTimeInZone(end.y, end.m, end.d, 23, 59, 59, 999, ianaTimeZone);
  if (startUtcMs === null || endUtcMs === null) {
    return null;
  }
  if (endUtcMs < startUtcMs) {
    return { startUtcMs, endUtcMs: startUtcMs };
  }
  return { startUtcMs, endUtcMs };
}
