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
 * Conversion between committed demo start (`data.demoTime.startIsoUtc`, UTC ISO instant) and UI controls.
 * Display and merge use the same **effective wall-clock zone** as the bottom instrument readout:
 * {@link TopBandTimeMode} `utc24` → UTC civil time; `local12` / `local24` → resolved reference IANA zone.
 */

import type { TopBandTimeMode } from "../../config/appConfig";
import {
  getCalendarYmdInZone,
  readCommittedWallParts,
  utcMsFromWallDateTimeInZone,
  utcMsFromWallDateTimeUtc,
} from "../../core/wallTimeInZone";
import { formatWallClockInTimeZone } from "../../core/timeFormat";

/** IANA zone or `"UTC"` matching {@link buildBottomInformationBarState} wall-clock policy. */
export function effectiveDemoWallClockZone(
  topBandMode: TopBandTimeMode,
  resolvedReferenceTimeZone: string,
): string {
  return topBandMode === "utc24" ? "UTC" : resolvedReferenceTimeZone;
}

/** Whether demo-start time entry should present 12-hour style (matches configured top-band clock mode). */
export function demoStartTimeEntryUses12HourClock(topBandMode: TopBandTimeMode): boolean {
  return topBandMode === "local12";
}

/** Placeholder hint for the demo-start time field; follows {@link TopBandTimeMode}. */
export function demoStartTimeFieldPlaceholder(topBandMode: TopBandTimeMode): string {
  return demoStartTimeEntryUses12HourClock(topBandMode)
    ? "e.g. 3pm, 3:22 pm, 3:22:52 PM"
    : "e.g. 15:22, 15:22:52";
}

/**
 * Canonical UTC ISO string for committing `data.demoTime.startIsoUtc` from the current real-time instant.
 */
export function demoTimeStartIsoUtcNow(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function useUtcCivilFrame(topBandMode: TopBandTimeMode): boolean {
  return topBandMode === "utc24";
}

/** `input[type=date]` value: calendar day of the instant in the effective display wall-clock zone. */
export function demoStartCalendarDateFromCommittedIso(
  iso: string,
  topBandMode: TopBandTimeMode,
  resolvedReferenceTimeZone: string,
): string | null {
  const t = Date.parse(iso.trim());
  if (!Number.isFinite(t)) {
    return null;
  }
  const zone = effectiveDemoWallClockZone(topBandMode, resolvedReferenceTimeZone);
  const { y, m, d } = getCalendarYmdInZone(t, zone);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Applies `YYYY-MM-DD` in the effective display wall-clock zone, preserving wall time-of-day
 * (including seconds and milliseconds) from the committed instant.
 */
export function mergeDemoWallYmdIntoCommittedIso(
  committedIsoUtc: string,
  ymd: string,
  topBandMode: TopBandTimeMode,
  resolvedReferenceTimeZone: string,
): string | null {
  const parts = ymd.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const d = Number(parts[2]);
  if (![y, mo, d].every((n) => Number.isFinite(n))) {
    return null;
  }
  const zone = effectiveDemoWallClockZone(topBandMode, resolvedReferenceTimeZone);
  const useUtc = useUtcCivilFrame(topBandMode);
  const cur = readCommittedWallParts(committedIsoUtc, zone, useUtc);
  if (!cur) {
    return null;
  }
  const mergedMs = useUtc
    ? utcMsFromWallDateTimeUtc(y, mo, d, cur.h, cur.mi, cur.s, cur.ms)
    : utcMsFromWallDateTimeInZone(y, mo, d, cur.h, cur.mi, cur.s, cur.ms, zone);
  if (mergedMs === null) {
    return null;
  }
  return new Date(mergedMs).toISOString();
}

/** True when the text should be accepted as `startIsoUtc` on commit (matches normalization parse gate). */
export function isValidCommitIsoText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "") {
    return false;
  }
  return Number.isFinite(Date.parse(trimmed));
}

export type ParsedWallTimeOfDay = {
  hour: number;
  minute: number;
  /** When false, callers should keep the committed instant's wall seconds (and ms). */
  secondProvided: boolean;
  second: number;
};

function stripTrailingZoneHint(s: string): string {
  return s.replace(/\s*(z|utc|zulu)\.?\s*$/i, "").trim();
}

function parseTwelveHour(rest: string): ParsedWallTimeOfDay | null {
  const m = rest.match(/^(\d{1,2})(?::(\d{2})(?::(\d{2}))?)?\s*(a\.?m\.?|p\.?m\.?)$/i);
  if (!m) {
    return null;
  }
  const h12 = Number(m[1]);
  const minute = m[2] !== undefined ? Number(m[2]) : 0;
  const secondProvided = m[3] !== undefined;
  const second = secondProvided ? Number(m[3]) : 0;
  const apRaw = m[4].toLowerCase().replace(/\./g, "");
  const isPm = apRaw.startsWith("p");

  if (!Number.isFinite(h12) || !Number.isFinite(minute) || (secondProvided && !Number.isFinite(second))) {
    return null;
  }
  if (h12 < 1 || h12 > 12 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    return null;
  }

  const hour = (h12 % 12) + (isPm ? 12 : 0);
  return { hour, minute, second, secondProvided };
}

function parseTwentyFourHour(rest: string): ParsedWallTimeOfDay | null {
  const m = rest.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    return null;
  }
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const secondProvided = m[3] !== undefined;
  const second = secondProvided ? Number(m[3]) : 0;

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || (secondProvided && !Number.isFinite(second))) {
    return null;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    return null;
  }

  return { hour, minute, second, secondProvided };
}

/**
 * Parses a wall time-of-day string for merging into a committed instant (same grammar as before).
 * Values are interpreted as civil time in the effective display zone on commit, not as UTC.
 */
export function parseWallTimeOfDayText(text: string): ParsedWallTimeOfDay | null {
  const rest = stripTrailingZoneHint(text.trim());
  if (rest === "") {
    return null;
  }
  const hasAmPm = /(a\.?m\.?|p\.?m\.?)\s*$/i.test(rest);
  return hasAmPm ? parseTwelveHour(rest) : parseTwentyFourHour(rest);
}

/** @deprecated Use {@link parseWallTimeOfDayText}. */
export const parseUtcTimeOfDayText = parseWallTimeOfDayText;

/**
 * Applies parsed wall time to the committed instant's **wall calendar date** in the effective zone,
 * preserving wall seconds (and ms) when seconds are omitted in the text.
 */
export function mergeDemoWallTimeTextIntoCommittedIso(
  committedIsoUtc: string,
  timeText: string,
  topBandMode: TopBandTimeMode,
  resolvedReferenceTimeZone: string,
): string | null {
  const zone = effectiveDemoWallClockZone(topBandMode, resolvedReferenceTimeZone);
  const useUtc = useUtcCivilFrame(topBandMode);
  const cur = readCommittedWallParts(committedIsoUtc, zone, useUtc);
  if (!cur) {
    return null;
  }
  const parsed = parseWallTimeOfDayText(timeText);
  if (!parsed) {
    return null;
  }
  const second = parsed.secondProvided ? parsed.second : cur.s;
  const mergedMs = useUtc
    ? utcMsFromWallDateTimeUtc(cur.y, cur.mo, cur.d, parsed.hour, parsed.minute, second, cur.ms)
    : utcMsFromWallDateTimeInZone(cur.y, cur.mo, cur.d, parsed.hour, parsed.minute, second, cur.ms, zone);
  if (mergedMs === null) {
    return null;
  }
  return new Date(mergedMs).toISOString();
}

/** @deprecated Use {@link mergeDemoWallTimeTextIntoCommittedIso} with display-time inputs. */
export function mergeUtcTimeTextIntoCommittedIso(committedIsoUtc: string, timeText: string): string | null {
  return mergeDemoWallTimeTextIntoCommittedIso(committedIsoUtc, timeText, "utc24", "UTC");
}

/**
 * Editable wall time text for the committed instant, using the same formatter stack as the bottom readout
 * ({@link formatWallClockInTimeZone}).
 */
export function demoStartEditableTimeTextFromCommittedIso(
  iso: string,
  topBandMode: TopBandTimeMode,
  resolvedReferenceTimeZone: string,
): string {
  const t = Date.parse(iso.trim());
  if (!Number.isFinite(t)) {
    return "";
  }
  const zone = effectiveDemoWallClockZone(topBandMode, resolvedReferenceTimeZone);
  const hour12 = topBandMode === "local12";
  return formatWallClockInTimeZone(t, zone, hour12);
}

/**
 * @deprecated Use {@link demoStartEditableTimeTextFromCommittedIso} with the resolved reference zone.
 * Preserves the legacy behavior of interpreting civil time in UTC for all modes (not the instrument frame).
 */
export function utcEditableTimeTextFromCommittedIso(iso: string, topBandMode?: TopBandTimeMode): string {
  const mode = topBandMode ?? "utc24";
  return demoStartEditableTimeTextFromCommittedIso(iso, mode, "UTC");
}

export function isValidWallTimeCommitText(text: string): boolean {
  return parseWallTimeOfDayText(text) !== null;
}

/** @deprecated Use {@link isValidWallTimeCommitText}. */
export const isValidUtcTimeCommitText = isValidWallTimeCommitText;

/** @deprecated Use {@link demoStartCalendarDateFromCommittedIso}. */
export function utcCalendarDateFromCommittedIso(iso: string): string | null {
  return demoStartCalendarDateFromCommittedIso(iso, "utc24", "UTC");
}

/** @deprecated Use {@link mergeDemoWallYmdIntoCommittedIso}. */
export function mergeUtcYmdIntoCommittedIso(committedIsoUtc: string, ymd: string): string | null {
  return mergeDemoWallYmdIntoCommittedIso(committedIsoUtc, ymd, "utc24", "UTC");
}
