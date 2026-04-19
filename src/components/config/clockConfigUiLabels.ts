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

import type { TopBandAnchorConfig, TopBandTimeMode } from "../../config/appConfig";

/** User-facing label for {@link TopBandTimeMode} (persisted values unchanged). */
export function labelForTopBandTimeMode(mode: TopBandTimeMode): string {
  switch (mode) {
    case "local12":
      return "Local 12-hour (uses reference zone)";
    case "local24":
      return "Local 24-hour (uses reference zone)";
    case "utc24":
      return "UTC 24-hour";
    default: {
      const _exhaustive: never = mode;
      return String(_exhaustive);
    }
  }
}

/** User-facing label for {@link TopBandAnchorConfig} mode (persisted values unchanged). */
export function labelForTopBandAnchorMode(mode: TopBandAnchorConfig["mode"]): string {
  switch (mode) {
    case "auto":
      return "Auto (zone or Geography meridian)";
    case "fixedCity":
      return "Fixed city (longitude for tape only)";
    case "fixedLongitude":
      return "Fixed longitude";
    default: {
      const _exhaustive: never = mode;
      return String(_exhaustive);
    }
  }
}
