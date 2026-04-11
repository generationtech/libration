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

import type { DisplayTimeZoneConfig } from "../config/appConfig";

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the reference IANA zone for display chrome. Fixed zones are validated; invalid strings fall back to the
 * runtime system zone (same as {@link DisplayTimeZoneConfig} `source: "system"`).
 */
export function resolveDisplayTimeReferenceZone(config: DisplayTimeZoneConfig): string {
  if (config.source === "system") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  const z = config.timeZone.trim();
  if (z.length > 0 && isValidIanaTimeZone(z)) {
    return z;
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
