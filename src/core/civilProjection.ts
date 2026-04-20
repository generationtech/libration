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

import type { CivilProjection } from "./chromeTimeDomain.ts";
import { readWallClockPartsInZone, zonedCalendarDayStartMs } from "./wallTimeInZone.ts";

/**
 * Civil wall clock for {@code nowUtcInstant} in {@code timeZoneId} (IANA).
 * Authoritative input for tape phasing and chrome time semantics.
 */
export function deriveCivilProjection(nowUtcInstant: number, timeZoneId: string): CivilProjection {
  const parts = readWallClockPartsInZone(nowUtcInstant, timeZoneId);
  const fractionalHour = parts.h + parts.mi / 60 + parts.s / 3600 + parts.ms / 3600000;
  const dayStartMs = zonedCalendarDayStartMs(nowUtcInstant, timeZoneId);
  return {
    fractionalHour,
    dayStartMs,
    localHour: parts.h,
    localMinute: parts.mi,
  };
}
