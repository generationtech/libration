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
 *
 * Hour padding (user-facing clock strings):
 * - 12-hour: hour is **not** left-padded (`7:07:59 PM`, not `07:07:59 PM`); minutes/seconds stay two digits.
 * - 24-hour and UTC-style: hour is two digits (`07:07:59`, `22:04:05`).
 */

const UTC_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

let localeHour12Preference: boolean | undefined;

/**
 * Runtime locale’s default 12- vs 24-hour clock (from {@link Intl}, not the top-band mode).
 * Used when {@link formatWallClockInTimeZone} omits {@code hour12} and for pin labels that follow locale.
 */
export function localePrefersHour12(): boolean {
  if (localeHour12Preference === undefined) {
    localeHour12Preference =
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "numeric",
      }).resolvedOptions().hour12 ?? false;
  }
  return localeHour12Preference;
}

/** {@link Intl.DateTimeFormat} `hour` option: unpadded hour in 12-hour mode, two-digit hour in 24-hour mode. */
export function intlHourOptionForClock(hour12: boolean): "numeric" | "2-digit" {
  return hour12 ? "numeric" : "2-digit";
}

let localClockFormatter: Intl.DateTimeFormat | undefined;

function getLocalClockFormatter(): Intl.DateTimeFormat {
  if (localClockFormatter === undefined) {
    const h12 = localePrefersHour12();
    localClockFormatter = new Intl.DateTimeFormat(undefined, {
      hour: intlHourOptionForClock(h12),
      minute: "2-digit",
      second: "2-digit",
      hour12: h12,
    });
  }
  return localClockFormatter;
}

/** One formatter per (IANA zone, implicit locale clock); DST handled by the engine via {@link Intl.DateTimeFormat}. */
const ZONE_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();

/** Same as {@link ZONE_FMT_CACHE} but with explicit 12- vs 24-hour clock (bottom bar, mode-aware). */
const ZONE_FMT_CACHE_EXPLICIT = new Map<string, Intl.DateTimeFormat>();

function implicitWallClockCacheKey(timeZone: string): string {
  return `${timeZone}\0${localePrefersHour12() ? "12" : "24"}`;
}

function wallClockInTimeZoneFormatter(timeZone: string): Intl.DateTimeFormat {
  const key = implicitWallClockCacheKey(timeZone);
  let fmt = ZONE_FMT_CACHE.get(key);
  if (!fmt) {
    const h12 = localePrefersHour12();
    fmt = new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: intlHourOptionForClock(h12),
      minute: "2-digit",
      second: "2-digit",
      hour12: h12,
    });
    ZONE_FMT_CACHE.set(key, fmt);
  }
  return fmt;
}

function wallClockInTimeZoneFormatterExplicit(timeZone: string, hour12: boolean): Intl.DateTimeFormat {
  const key = `${timeZone}\0${hour12 ? "12" : "24"}`;
  let fmt = ZONE_FMT_CACHE_EXPLICIT.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: intlHourOptionForClock(hour12),
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

/** Local wall clock for overlay layers: follows runtime locale 12/24 preference and hour-padding rules above. */
export function formatLocalClock(nowMs: number): string {
  return getLocalClockFormatter().format(new Date(nowMs));
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
