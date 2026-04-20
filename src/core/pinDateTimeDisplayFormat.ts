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

import type { PinDateTimeDisplayMode } from "../config/appConfig";
import { intlHourOptionForClock, localePrefersHour12 } from "./timeFormat";

/** One formatter per (mode, IANA zone); DST via Intl. */
const CACHE = new Map<string, (d: Date) => string>();

function cacheKey(mode: PinDateTimeDisplayMode, timeZone: string): string {
  return `${mode}\0${timeZone}`;
}

function buildFormatter(
  mode: Exclude<PinDateTimeDisplayMode, "hidden">,
  timeZone: string,
): (d: Date) => string {
  const h12 = localePrefersHour12();
  const hourOpt = intlHourOptionForClock(h12);
  switch (mode) {
    case "time": {
      const fmt = new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour: hourOpt,
        minute: "2-digit",
        hour12: h12,
      });
      return (d) => fmt.format(d);
    }
    case "timeWithSeconds": {
      const fmt = new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour: hourOpt,
        minute: "2-digit",
        second: "2-digit",
        hour12: h12,
      });
      return (d) => fmt.format(d);
    }
    case "dateOnly": {
      const fmt = new Intl.DateTimeFormat(undefined, {
        timeZone,
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return (d) => fmt.format(d);
    }
    case "dateAndTime": {
      const fmt = new Intl.DateTimeFormat(undefined, {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: hourOpt,
        minute: "2-digit",
        second: "2-digit",
        hour12: h12,
      });
      return (d) => fmt.format(d);
    }
    case "timeAndDate": {
      const timeFmt = new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour: hourOpt,
        minute: "2-digit",
        hour12: h12,
      });
      const dateFmt = new Intl.DateTimeFormat(undefined, {
        timeZone,
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return (d) => `${timeFmt.format(d)} · ${dateFmt.format(d)}`;
    }
  }
}

/**
 * Resolved secondary-line string for a reference pin’s local wall time (content only — not font/layout).
 * Uses the runtime locale (undefined) for Intl, matching {@link formatWallClockInTimeZone} for {@code timeWithSeconds}.
 */
export function formatPinDateTimeLabel(
  nowMs: number,
  timeZone: string,
  mode: PinDateTimeDisplayMode,
): string {
  if (mode === "hidden") {
    return "";
  }
  const k = cacheKey(mode, timeZone);
  let fn = CACHE.get(k);
  if (!fn) {
    fn = buildFormatter(mode, timeZone);
    CACHE.set(k, fn);
  }
  return fn(new Date(nowMs));
}
