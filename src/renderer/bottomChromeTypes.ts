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

import type { DisplayChromeLayoutConfig } from "../config/appConfig.ts";
import type { BottomChromeLayout } from "./bottomChromeLayout";

/** Calendar cell fields for `formatDayLineSideReadout` in `dayLineBoundary.ts`. */
export interface BottomBarDayCell {
  weekdayShort: string;
  monthShort: string;
  dayOfMonth: number;
}

/** One row in the lower-left HUD time stack (date, optional spacer, clock rows with optional label + time column). */
export type BottomTimeStackLine =
  | { role: "date"; text: string }
  | { role: "spacer" }
  | { role: "clock"; label: string | null; timeText: string };

/** Single-line preview for tests and logging (not used for canvas layout). */
export function formatBottomTimeStackClockLine(line: Extract<BottomTimeStackLine, { role: "clock" }>): string {
  if (line.label !== null && line.label.length > 0) {
    return `${line.label}  ${line.timeText}`;
  }
  return line.timeText;
}

/**
 * Bottom instrument overlay: unified lower-left date + clock readouts — not map layers.
 * Tape geometry and read-point registration do not depend on these strings.
 */
export interface BottomInformationBarState {
  /**
   * Top-to-bottom: reference-city date, then reference time, UTC, local (subset from layout), optional blank spacer
   * before local when both apply.
   */
  leftTimeStackLines: BottomTimeStackLine[];
  bottomChromeLayout: BottomChromeLayout;
}

/**
 * Legacy upper bound on stack lines from toggles only (ignores redundant-local suppression).
 * Prefer {@link buildBottomTimeStackLines} line count for layout height.
 */
export function countBottomTimeStackMaxLines(
  layout: Pick<
    DisplayChromeLayoutConfig,
    "bottomTimeStackShowLocal" | "bottomTimeStackShowRefer" | "bottomTimeStackShowUtc"
  >,
): number {
  let n = 1;
  if (layout.bottomTimeStackShowRefer !== false) {
    n += 1;
  }
  if (layout.bottomTimeStackShowUtc !== false) {
    n += 1;
  }
  if (layout.bottomTimeStackShowLocal !== false) {
    if (layout.bottomTimeStackShowRefer !== false || layout.bottomTimeStackShowUtc !== false) {
      n += 1;
    }
    n += 1;
  }
  return n;
}
