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

/** One row in the lower-left reference-city HUD (date above time when both are enabled). */
export type BottomTimeStackLine =
  | { role: "date"; text: string }
  | { role: "time"; text: string };

/**
 * Bottom instrument overlay: lower-left reference-city date + time — not map layers.
 * Tape geometry and read-point registration do not depend on these strings.
 */
export interface BottomInformationBarState {
  /** Top-to-bottom: optional date, then optional time (reference IANA civil zone only). */
  leftTimeStackLines: BottomTimeStackLine[];
  bottomChromeLayout: BottomChromeLayout;
}

/** Line count from visibility toggles only (matches {@link buildBottomTimeStackLines} when the bar is visible). */
export function countBottomHudReadoutLines(
  layout: Pick<DisplayChromeLayoutConfig, "bottomTimeStackShowDate" | "bottomTimeStackShowTime">,
): number {
  let n = 0;
  if (layout.bottomTimeStackShowDate !== false) {
    n += 1;
  }
  if (layout.bottomTimeStackShowTime !== false) {
    n += 1;
  }
  return n;
}
