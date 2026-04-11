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

const MS_PER_DAY = 86_400_000;

function compareYmd(
  a: { y: number; m: number; d: number },
  b: { y: number; m: number; d: number },
): number {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

/** Calendar Y-M-D for {@code nowMs} in {@code timeZone} (IANA). */
export function getCalendarYmdInZone(nowMs: number, timeZone: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(nowMs));
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m, d };
}

export type WallClockPartsInZone = {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
  ms: number;
};

/**
 * Civil date/time fields for {@code nowMs} in {@code timeZone}, using the same {@link Intl} basis as
 * {@link referenceFractionalHourOfDay} in the renderer (h23 + fractional seconds).
 */
export function readWallClockPartsInZone(nowMs: number, timeZone: string): WallClockPartsInZone {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    hourCycle: "h23",
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions).formatToParts(new Date(nowMs)) as ReadonlyArray<{ type: string; value: string }>;
  const y = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const mo = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const d = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const mi = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const secondWhole = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  const fracSec = parts.find((p) => p.type === "fractionalSecond")?.value;
  const ms = fracSec !== undefined ? Number(fracSec) : 0;
  return { y, mo, d, h, mi, s: secondWhole, ms };
}

function readWallClockPartsUtc(nowMs: number): WallClockPartsInZone {
  const t = new Date(nowMs);
  return {
    y: t.getUTCFullYear(),
    mo: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    h: t.getUTCHours(),
    mi: t.getUTCMinutes(),
    s: t.getUTCSeconds(),
    ms: t.getUTCMilliseconds(),
  };
}

/**
 * Inverse of {@link readWallClockPartsInZone}: UTC epoch ms for the given civil wall time in {@code timeZone}.
 * Returns null when the iteration fails to converge (e.g. nonexistent local time on DST spring-forward).
 */
export function utcMsFromWallDateTimeInZone(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  ms: number,
  timeZone: string,
): number | null {
  let t = Date.UTC(y, mo - 1, d, h, mi, s, ms);
  for (let i = 0; i < 100; i++) {
    const c = readWallClockPartsInZone(t, timeZone);
    if (
      c.y === y &&
      c.mo === mo &&
      c.d === d &&
      c.h === h &&
      c.mi === mi &&
      c.s === s &&
      Math.abs(c.ms - ms) <= 1
    ) {
      return t;
    }
    if (c.y === y && c.mo === mo && c.d === d) {
      t += (h - c.h) * 3_600_000 + (mi - c.mi) * 60_000 + (s - c.s) * 1000 + (ms - c.ms);
      continue;
    }
    const targetDayMs = Date.UTC(y, mo - 1, d);
    const curDayMs = Date.UTC(c.y, c.mo - 1, c.d);
    const dayDeltaDays = Math.round((targetDayMs - curDayMs) / MS_PER_DAY);
    t += dayDeltaDays * MS_PER_DAY;
  }
  return null;
}

/** Same as {@link utcMsFromWallDateTimeInZone} for the UTC civil calendar (matches {@link TopBandTimeMode} `utc24`). */
export function utcMsFromWallDateTimeUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  ms: number,
): number {
  return Date.UTC(y, mo - 1, d, h, mi, s, ms);
}

export function readCommittedWallParts(
  committedIsoUtc: string,
  effectiveWallClockZone: string,
  useUtcCivilFrame: boolean,
): WallClockPartsInZone | null {
  const t = Date.parse(committedIsoUtc.trim());
  if (!Number.isFinite(t)) {
    return null;
  }
  return useUtcCivilFrame ? readWallClockPartsUtc(t) : readWallClockPartsInZone(t, effectiveWallClockZone);
}

/**
 * First UTC millisecond that falls on {@code timeZone}'s calendar date containing {@code nowMs}
 * (midnight boundary of that local day).
 */
export function zonedCalendarDayStartMs(nowMs: number, timeZone: string): number {
  const target = getCalendarYmdInZone(nowMs, timeZone);
  let lo = nowMs - 4 * MS_PER_DAY;
  let hi = nowMs + MS_PER_DAY;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midYmd = getCalendarYmdInZone(mid, timeZone);
    if (compareYmd(midYmd, target) < 0) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
