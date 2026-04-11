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
      return "NATO timezone area";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function descriptionForChromeMajorArea(id: ChromeMajorAreaId): string {
  switch (id) {
    case "hourIndicators":
      return "Controls the top row of hour indicators above the tick tape.";
    case "tickTape":
      return "Controls the hour and minute tick rail below the indicators.";
    case "natoTimezone":
      return "Controls the timezone letter strip beneath the tick tape.";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
