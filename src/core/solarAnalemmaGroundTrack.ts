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

/**
 * Locus of the subsolar point on one UTC hour each day for a full year (a closed loop on the globe
 * in equirectangular space, related to the equation of time; not the sky analemma at a fixed place).
 * Uses the same mean solar model as {@link subsolarPoint}.
 */
export function sampleSolarAnalemmaGroundTrack(utcMs: number, utcHour: number): GroundTrackPointDeg[] {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const h0 = Number.isFinite(utcHour) ? utcHour : 12;
  const hour = Math.max(0, Math.min(23, Math.floor(h0)));
  const n = daysInGregorianYear(y);
  const out: GroundTrackPointDeg[] = [];
  for (let k = 1; k <= n; k += 1) {
    const t = Date.UTC(y, 0, k, hour, 0, 0, 0);
    out.push(subsolarPoint(t));
  }
  return out;
}
