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

import type { TopBandTimeMode } from "../config/appConfig.ts";
import type { DisplayTimeMode } from "./chromeTimeDomain.ts";

/** Maps persisted {@link TopBandTimeMode} to formatting-only {@link DisplayTimeMode}. */
export function displayTimeModeFromTopBandTimeMode(mode: TopBandTimeMode): DisplayTimeMode {
  if (mode === "local12") {
    return "12hr";
  }
  if (mode === "local24") {
    return "24hr";
  }
  return "utc";
}
