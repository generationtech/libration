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
 * Short explicit list of IANA zones for the Chrome tab fixed-timezone control (Phase 3d).
 * Not a general timezone browser.
 */
export const CURATED_FIXED_IANA_TIME_ZONES = [
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
] as const;

export type CuratedFixedIanaTimeZone = (typeof CURATED_FIXED_IANA_TIME_ZONES)[number];

const LABELS: Record<CuratedFixedIanaTimeZone, string> = {
  "America/New_York": "America/New_York",
  "America/Los_Angeles": "America/Los_Angeles",
  "Europe/London": "Europe/London",
  "Asia/Tokyo": "Asia/Tokyo",
  "Australia/Sydney": "Australia/Sydney",
  UTC: "UTC",
};

export function labelForCuratedFixedZone(zone: string): string {
  return zone in LABELS ? LABELS[zone as CuratedFixedIanaTimeZone] : zone;
}

export function isCuratedFixedIanaZone(zone: string): zone is CuratedFixedIanaTimeZone {
  return (CURATED_FIXED_IANA_TIME_ZONES as readonly string[]).includes(zone);
}

/** Options for &lt;select&gt;: curated list, plus current zone if it is fixed but not in the list. */
export function fixedZoneSelectOptions(currentFixedZone: string): readonly string[] {
  if (isCuratedFixedIanaZone(currentFixedZone)) {
    return CURATED_FIXED_IANA_TIME_ZONES;
  }
  return [currentFixedZone, ...CURATED_FIXED_IANA_TIME_ZONES];
}
