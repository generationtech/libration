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
 * Lower-left bottom HUD: optional reference-city civil date and/or time (single zone, no per-row labels).
 * The date row uses the reference IANA zone; the time row follows global hour-label mode (12/24/UTC).
 */

import type { DisplayChromeLayoutConfig } from "../config/appConfig.ts";
import type { TopBandTimeMode } from "../config/appConfig.ts";
import { displayTimeModeFromTopBandTimeMode } from "../core/displayTimeMode.ts";
import { formatWallClockInTimeZone } from "../core/timeFormat.ts";
import type { BottomHudReadoutLine } from "./bottomChromeTypes.ts";

/** Calendar row: resolved reference IANA zone’s civil date (reference city). */
export function formatBottomHudDateLine(nowMs: number, referenceTimeZone: string): string {
  const d = new Date(nowMs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: referenceTimeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  return `${month} ${day} ${year}`.trim();
}

export function buildBottomHudReadoutLines(options: {
  nowMs: number;
  referenceTimeZone: string;
  topBandMode: TopBandTimeMode;
  bottomTimeStack?: Pick<
    DisplayChromeLayoutConfig,
    "bottomTimeStackShowDate" | "bottomTimeStackShowTime" | "bottomTimeShowSeconds"
  >;
  /** Compact eclipse status; omitted when no relevant eclipse or chrome is disabled. */
  eclipseStatusText?: string | null;
  /** Ranked HUD event notices (eclipse + Milky Way). Takes precedence over eclipseStatusText. */
  eventNoticeTexts?: readonly string[];
}): BottomHudReadoutLine[] {
  const lay = options.bottomTimeStack ?? {};
  const showDate = lay.bottomTimeStackShowDate !== false;
  const showTime = lay.bottomTimeStackShowTime !== false;
  const bottomTimeShowSeconds = lay.bottomTimeShowSeconds === true;
  const dm = displayTimeModeFromTopBandTimeMode(options.topBandMode);
  const hour12 = dm === "12hr";
  const timeZoneForTimeRow = dm === "utc" ? "UTC" : options.referenceTimeZone;
  const lines: BottomHudReadoutLine[] = [];
  if (showDate) {
    lines.push({
      role: "date",
      text: formatBottomHudDateLine(options.nowMs, options.referenceTimeZone),
    });
  }
  if (showTime) {
    const timeText = formatWallClockInTimeZone(options.nowMs, timeZoneForTimeRow, hour12, {
      includeSeconds: bottomTimeShowSeconds,
    });
    lines.push({ role: "time", text: timeText });
  }
  const notices = (options.eventNoticeTexts ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (notices.length === 0) {
    const eclipse = options.eclipseStatusText?.trim() ?? "";
    if (eclipse.length > 0) {
      notices.push(eclipse);
    }
  }
  for (const text of notices) {
    lines.push({ role: "eventNotice", text });
  }
  return lines;
}
