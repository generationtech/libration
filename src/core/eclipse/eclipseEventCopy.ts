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
 * Accessible eclipse wording and restrained relative-time copy.
 * Domain times remain UTC milliseconds; this module only formats.
 */

import { formatWallClockInTimeZone } from "../timeFormat";
import type { SolarEclipseSubtype } from "./solarEclipseTypes";
import type { LunarEclipseSubtype } from "./lunarEclipseTypes";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function solarEclipseTypeTitle(subtype: SolarEclipseSubtype): string {
  if (subtype === "annular") {
    return "Annular solar eclipse";
  }
  if (subtype === "partial") {
    return "Partial solar eclipse";
  }
  if (subtype === "hybrid") {
    return "Hybrid solar eclipse";
  }
  return "Total solar eclipse";
}

export function lunarEclipseTypeTitle(subtype: LunarEclipseSubtype): string {
  if (subtype === "partial") {
    return "Partial lunar eclipse";
  }
  if (subtype === "penumbral") {
    return "Penumbral lunar eclipse";
  }
  return "Total lunar eclipse";
}

export function solarCentralPathLabel(subtype: SolarEclipseSubtype): string {
  if (subtype === "annular") {
    return "Path of annularity";
  }
  if (subtype === "hybrid") {
    return "Central path";
  }
  if (subtype === "partial") {
    return "Partial visibility";
  }
  return "Path of totality";
}

export function formatEclipseCalendarDate(args: {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}): string {
  const month = MONTHS[Math.max(1, Math.min(12, args.month)) - 1] ?? "Jan";
  return `${month} ${args.day} ${args.year}`;
}

export function formatEclipseUtcClock(utcMs: number): string {
  return `${formatWallClockInTimeZone(utcMs, "UTC", false, { includeSeconds: false })} UTC`;
}

function utcDayNumber(utcMs: number): number {
  return Math.floor(utcMs / 86_400_000);
}

/**
 * Restrained product-time countdown. Uses the supplied instants only — never wall clock.
 */
export function formatEclipseRelativeTime(fromMs: number, toMs: number): string {
  const delta = toMs - fromMs;
  if (!(Number.isFinite(delta) && Number.isFinite(fromMs) && Number.isFinite(toMs))) {
    return "";
  }
  if (delta <= 0) {
    return "now";
  }
  const totalMinutes = Math.round(delta / 60_000);
  if (totalMinutes < 60) {
    return `in ${Math.max(1, totalMinutes)}m`;
  }
  const totalHours = Math.floor(delta / 3_600_000);
  const minutes = Math.round((delta % 3_600_000) / 60_000);
  if (totalHours < 12) {
    return minutes > 0 ? `in ${totalHours}h ${minutes}m` : `in ${totalHours}h`;
  }
  if (utcDayNumber(toMs) === utcDayNumber(fromMs) + 1 && delta < 36 * 3_600_000) {
    return "tomorrow";
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days <= 0) {
    return minutes > 0 ? `in ${totalHours}h ${minutes}m` : `in ${totalHours}h`;
  }
  return hours > 0 ? `in ${days}d ${hours}h` : `in ${days}d`;
}

export const ECLIPSE_AUTHORITY_UNAVAILABLE_COPY = "Eclipse data unavailable outside 1900–2100.";
