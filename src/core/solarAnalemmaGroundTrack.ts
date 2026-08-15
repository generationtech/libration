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

import { subsolarPoint } from "./subsolarPoint";

export interface GroundTrackPointDeg {
  readonly latDeg: number;
  readonly lonDeg: number;
}

/**
 * @returns `true` if `y` is a leap year in the Gregorian calendar.
 */
export function isGregorianLeapYear(y: number): boolean {
  if (!Number.isFinite(y)) {
    return false;
  }
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInGregorianYear(y: number): number {
  return isGregorianLeapYear(y) ? 366 : 365;
}

function utcAnalemmaSampleClock(
  utcMs: number,
  utcHour: number | undefined,
): { hour: number; minute: number; second: number; millisecond: number } {
  if (typeof utcHour === "number" && Number.isFinite(utcHour)) {
    return {
      hour: Math.max(0, Math.min(23, Math.floor(utcHour))),
      minute: 0,
      second: 0,
      millisecond: 0,
    };
  }
  const d = new Date(utcMs);
  return {
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    millisecond: d.getUTCMilliseconds(),
  };
}

/**
 * Locus of the subsolar point at one UTC clock time each day for a full year (a closed loop on the globe
 * in equirectangular space, related to the equation of time; not the sky analemma at a fixed place).
 * Uses the same mean solar model as {@link subsolarPoint}.
 *
 * When `utcHour` is omitted, the clock time is the UTC time-of-day of `utcMs` (hour through millisecond),
 * so the current calendar day's vertex coincides with {@link subsolarPoint} at `utcMs`.
 * When `utcHour` is set, each day is sampled at that integer hour at `:00:00.000`.
 */
export function sampleSolarAnalemmaGroundTrack(utcMs: number, utcHour?: number): GroundTrackPointDeg[] {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const { hour, minute, second, millisecond } = utcAnalemmaSampleClock(utcMs, utcHour);
  const n = daysInGregorianYear(y);
  const out: GroundTrackPointDeg[] = [];
  for (let k = 1; k <= n; k += 1) {
    const t = Date.UTC(y, 0, k, hour, minute, second, millisecond);
    out.push(subsolarPoint(t));
  }
  return out;
}
