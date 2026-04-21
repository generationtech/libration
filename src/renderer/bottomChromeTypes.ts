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

/** One row in the lower-left HUD time stack (date plus optional Local / Refer / UTC lines). */
export type BottomTimeStackLine = {
  role: "date" | "clock";
  /** Full line for canvas emission (includes short label prefix for clock rows). */
  text: string;
};

/**
 * Bottom instrument overlay: unified lower-left date + clock readouts — not map layers.
 * Tape geometry and read-point registration do not depend on these strings.
 */
export interface BottomInformationBarState {
  /** Top-to-bottom: date first, then enabled clock rows in Local → Refer → UTC order. */
  leftTimeStackLines: BottomTimeStackLine[];
  bottomChromeLayout: BottomChromeLayout;
}

/** Counts visible clock rows from layout flags (each defaults to on when omitted). */
export function countBottomTimeStackClockRows(
  layout: Pick<
    DisplayChromeLayoutConfig,
    "bottomTimeStackShowLocal" | "bottomTimeStackShowRefer" | "bottomTimeStackShowUtc"
  >,
): number {
  let n = 0;
  if (layout.bottomTimeStackShowLocal !== false) {
    n += 1;
  }
  if (layout.bottomTimeStackShowRefer !== false) {
    n += 1;
  }
  if (layout.bottomTimeStackShowUtc !== false) {
    n += 1;
  }
  return n;
}
