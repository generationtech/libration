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

import type { BottomChromeLayout } from "./bottomChromeLayout";

/** Calendar cell fields for `formatDayLineSideReadout` in `dayLineBoundary.ts`. */
export interface BottomBarDayCell {
  weekdayShort: string;
  monthShort: string;
  dayOfMonth: number;
}

/**
 * Bottom instrument overlay: primary clock (left) and calendar (right) — not map layers.
 */
export interface BottomInformationBarState {
  /** `LOCAL TIME` for `local12` / `local24`; `UTC TIME` for `utc24`. */
  localMicroLabel: string;
  localTimeLine: string;
  /** Full date string (legacy composite) — same semantics as pre-refactor single line. */
  localDateLine: string;
  /** Single-line calendar for the right panel (month, day, year; same zone as {@link localDateLine}). */
  rightPanelDateLine: string;
  bottomChromeLayout: BottomChromeLayout;
}
