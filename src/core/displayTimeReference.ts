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

import type { DisplayTimeConfig, DisplayTimeZoneConfig } from "../config/appConfig";
import { REFERENCE_CITIES } from "../data/referenceCities";

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

/**
 * Effective IANA zone for the chrome **reference frame** civil clock (bottom readout, tape phase, read-point registration).
 *
 * - When the user sets an explicit fixed IANA zone, that always wins (may differ from the read-point meridian).
 * - When civil source is {@code system}, the zone follows the selected **reference city** meridian mode
 *   ({@link DisplayTimeConfig.topBandAnchor} {@code fixedCity}) so civil time and tape registration agree.
 * - Otherwise ({@code system} with {@code auto} / {@code fixedLongitude} anchor), uses {@link resolveDisplayTimeReferenceZone}.
 */
export function resolveReferenceFrameCivilTimeZone(displayTime: DisplayTimeConfig): string {
  const tzConfig = displayTime.referenceTimeZone;
  if (tzConfig.source === "fixed") {
    return resolveDisplayTimeReferenceZone(tzConfig);
  }
  const anchor = displayTime.topBandAnchor ?? { mode: "auto" };
  if (anchor.mode === "fixedCity") {
    const city = REFERENCE_CITIES.find((c) => c.id === anchor.cityId);
    if (city !== undefined) {
      return city.timeZone;
    }
  }
  return resolveDisplayTimeReferenceZone(tzConfig);
}
