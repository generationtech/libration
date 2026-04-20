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
 * UI-only major areas for the Chrome configuration panel. Not persisted — editor navigation only.
 */
export type ChromeMajorAreaId = "hourIndicators" | "tickTape" | "natoTimezone";

export const CHROME_MAJOR_AREA_IDS: readonly ChromeMajorAreaId[] = [
  "hourIndicators",
  "tickTape",
  "natoTimezone",
];

export const DEFAULT_CHROME_MAJOR_AREA: ChromeMajorAreaId = "hourIndicators";

export function labelForChromeMajorArea(id: ChromeMajorAreaId): string {
  switch (id) {
    case "hourIndicators":
      return "24-hour indicator entries";
    case "tickTape":
      return "24-hour tickmarks tape";
    case "natoTimezone":
      return "NATO / structural zone row";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function descriptionForChromeMajorArea(id: ChromeMajorAreaId): string {
  switch (id) {
    case "hourIndicators":
      return "Hour disks and entries row — civil-phased at the read point; display mode changes labels only, not tape registration.";
    case "tickTape":
      return "Tick rail — same phased band as the hour row; ticks do not shift when you change hour label format.";
    case "natoTimezone":
      return "Structural 15° / NATO letter row — geometric sectors independent of the reference civil zone.";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
