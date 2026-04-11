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
 * Simple fixed-format time strings for overlay layers (readable, locale-agnostic for UTC).
 */

const UTC_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const LOCAL_FMT = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** One formatter per IANA zone; DST handled by the engine via {@link Intl.DateTimeFormat}. */
const ZONE_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();

/** Same as {@link ZONE_FMT_CACHE} but with explicit 12- vs 24-hour clock (bottom bar, mode-aware). */
const ZONE_FMT_CACHE_EXPLICIT = new Map<string, Intl.DateTimeFormat>();

function wallClockInTimeZoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = ZONE_FMT_CACHE.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    ZONE_FMT_CACHE.set(timeZone, fmt);
  }
  return fmt;
}

function wallClockInTimeZoneFormatterExplicit(timeZone: string, hour12: boolean): Intl.DateTimeFormat {
  const key = `${timeZone}\0${hour12 ? "12" : "24"}`;
  let fmt = ZONE_FMT_CACHE_EXPLICIT.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12,
    });
    ZONE_FMT_CACHE_EXPLICIT.set(key, fmt);
  }
  return fmt;
}

export function formatUtcClock(nowMs: number): string {
  return `${UTC_FMT.format(new Date(nowMs))} UTC`;
}

export function formatLocalClock(nowMs: number): string {
  return LOCAL_FMT.format(new Date(nowMs));
}

/**
 * Wall time in a specific IANA zone for {@code nowMs} (same instant as top clocks).
 * When {@code hour12} is omitted, uses the runtime locale’s default 12/24-hour preference (e.g. city pin labels).
 * When set, forces 12- or 24-hour display explicitly (e.g. bottom bar matching the configured top-band mode).
 */
export function formatWallClockInTimeZone(nowMs: number, timeZone: string, hour12?: boolean): string {
  const fmt =
    hour12 === undefined
      ? wallClockInTimeZoneFormatter(timeZone)
      : wallClockInTimeZoneFormatterExplicit(timeZone, hour12);
  return fmt.format(new Date(nowMs));
}
