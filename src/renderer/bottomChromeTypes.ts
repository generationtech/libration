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
 * Bottom instrument overlay: reference-frame civil readout (left) and calendar (right) — not map layers.
 * Tape geometry and read-point registration do not depend on these strings.
 */
export interface BottomInformationBarState {
  /** Micro label above the primary clock (e.g. reference-frame caption). */
  referenceMicroLabel: string;
  /** Primary wall-clock line: civil time in the resolved reference IANA zone. */
  referenceTimeLine: string;
  /** Long-form calendar line in the reference zone (left stack; same civil frame as {@link referenceTimeLine}). */
  referenceDateLine: string;
  /** Single-line calendar for the right panel (month, day, year; same reference zone). */
  rightPanelDateLine: string;
  /**
   * Optional single subdued line: this device’s system-local wall time, same clock style as the primary line.
   * Emitted only when the system zone differs from the reference zone; informational — does not affect chrome time semantics.
   */
  systemLocalLine?: string;
  bottomChromeLayout: BottomChromeLayout;
}
