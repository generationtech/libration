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
 * Lower-left bottom HUD: optional reference-city civil date and/or time (single zone, no labels).
 */

import type { DisplayChromeLayoutConfig } from "../config/appConfig.ts";
import type { TopBandTimeMode } from "../config/appConfig.ts";
import { displayTimeModeFromTopBandTimeMode } from "../core/displayTimeMode.ts";
import { formatWallClockInTimeZone } from "../core/timeFormat.ts";
import type { BottomTimeStackLine } from "./bottomChromeTypes.ts";

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

export function buildBottomTimeStackLines(options: {
  nowMs: number;
  referenceTimeZone: string;
  topBandMode: TopBandTimeMode;
  bottomTimeStack?: Pick<
    DisplayChromeLayoutConfig,
    "bottomTimeStackShowDate" | "bottomTimeStackShowTime"
  >;
}): BottomTimeStackLine[] {
  const lay = options.bottomTimeStack ?? {};
  const showDate = lay.bottomTimeStackShowDate !== false;
  const showTime = lay.bottomTimeStackShowTime !== false;
  const dm = displayTimeModeFromTopBandTimeMode(options.topBandMode);
  const hour12 = dm === "12hr";
  const lines: BottomTimeStackLine[] = [];
  if (showDate) {
    lines.push({
      role: "date",
      text: formatBottomHudDateLine(options.nowMs, options.referenceTimeZone),
    });
  }
  if (showTime) {
    const timeText = formatWallClockInTimeZone(options.nowMs, options.referenceTimeZone, hour12, {
      includeSeconds: true,
    });
    lines.push({ role: "time", text: timeText });
  }
  return lines;
}
