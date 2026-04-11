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

const MS_PER_HOUR = 3_600_000;

function parseGmtLongOffsetToHours(s: string | undefined): number | undefined {
  if (!s) {
    return undefined;
  }
  const m = s.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) {
    return undefined;
  }
  const sign = m[1] === "+" ? 1 : -1;
  const h = Number.parseInt(m[2]!, 10);
  const min = m[3] !== undefined ? Number.parseInt(m[3], 10) : 0;
  return sign * (h + min / 60);
}

/**
 * Current UTC offset in hours for {@code timeZone} at {@code nowMs} (DST-aware). Parsed from `longOffset` when available;
 * otherwise derived from `toLocaleString` comparison (same engine behavior as tests).
 */
export function utcOffsetHoursForTimeZone(nowMs: number, timeZone: string): number {
  const d = new Date(nowMs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(d);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value;
  const parsed = parseGmtLongOffsetToHours(tzName);
  if (parsed !== undefined) {
    return parsed;
  }
  const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
  const inTz = new Date(d.toLocaleString("en-US", { timeZone }));
  return (inTz.getTime() - utc.getTime()) / MS_PER_HOUR;
}
