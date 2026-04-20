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
import type { DisplayTimeMode } from "./chromeTimeDomain";
import { intlHourOptionForClock } from "./timeFormat";

/** One formatter per (pin layout mode, display time mode, effective IANA zone for Intl). */
const CACHE = new Map<string, (d: Date) => string>();

function cacheKey(
  mode: PinDateTimeDisplayMode,
  displayTimeMode: DisplayTimeMode,
  effectiveZone: string,
): string {
  return `${mode}\0${displayTimeMode}\0${effectiveZone}`;
}

function hour12AndZoneForInstrumentMode(
  pinIanaZone: string,
  displayTimeMode: DisplayTimeMode,
): { timeZone: string; hour12: boolean } {
  if (displayTimeMode === "utc") {
    return { timeZone: "UTC", hour12: false };
  }
  return {
    timeZone: pinIanaZone,
    hour12: displayTimeMode === "12hr",
  };
}

function buildFormatter(
  mode: Exclude<PinDateTimeDisplayMode, "hidden">,
  timeZone: string,
  hour12: boolean,
): (d: Date) => string {
  const hourOpt = intlHourOptionForClock(hour12);
  switch (mode) {
    case "time": {
      const fmt = new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour: hourOpt,
        minute: "2-digit",
        hour12,
      });
      return (d) => fmt.format(d);
    }
    case "timeWithSeconds": {
      const fmt = new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour: hourOpt,
        minute: "2-digit",
        second: "2-digit",
        hour12,
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
        hour12,
      });
      return (d) => fmt.format(d);
    }
    case "timeAndDate": {
      const timeFmt = new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour: hourOpt,
        minute: "2-digit",
        hour12,
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
 * Resolved secondary-line string for a reference pin’s time (content only — not font/layout).
 * {@link displayTimeMode} follows the instrument “Hour label format” (12h civil / 24h civil / UTC-style); the pin’s IANA
 * zone is still used for local wall time when mode is 12hr or 24hr, and ignored for the clock digits when mode is UTC
 * (same instant, UTC labels).
 */
export function formatPinDateTimeLabel(
  nowMs: number,
  timeZone: string,
  mode: PinDateTimeDisplayMode,
  displayTimeMode: DisplayTimeMode,
): string {
  if (mode === "hidden") {
    return "";
  }
  const { timeZone: effectiveZone, hour12 } = hour12AndZoneForInstrumentMode(timeZone, displayTimeMode);
  const k = cacheKey(mode, displayTimeMode, effectiveZone);
  let fn = CACHE.get(k);
  if (!fn) {
    fn = buildFormatter(mode, effectiveZone, hour12);
    CACHE.set(k, fn);
  }
  return fn(new Date(nowMs));
}
