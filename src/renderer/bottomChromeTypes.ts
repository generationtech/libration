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

/** One row in the lower-left HUD time stack (date, optional spacer, clock rows). */
export type BottomTimeStackLine = {
  role: "date" | "clock" | "spacer";
  /** Full line for canvas emission (smart labels only when multiple clock rows are visible). */
  text: string;
};

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
 * Maximum stack lines for layout height: date + configured clock rows + optional spacer before local
 * (when local is enabled together with reference and/or UTC).
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
