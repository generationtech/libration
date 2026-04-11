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

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;

function utcMsOfDayFromUtcMs(referenceNowMs: number): number {
  const d = new Date(referenceNowMs);
  return (
    (((d.getUTCHours() * 60 + d.getUTCMinutes()) * 60 + d.getUTCSeconds()) * 1000) + d.getUTCMilliseconds()
  );
}

/**
 * Mean-solar local wall-clock state at {@code lonDeg} for the UTC calendar day containing {@code referenceNowMs}.
 * Same offset model as {@link solarLocalHour0To23FromUtcMsOfDay} in display chrome (continuous lon/15 hours), with
 * fractional hour for clock hands.
 */
export function solarLocalWallClockStateFromUtcMs(
  referenceNowMs: number,
  lonDeg: number,
): {
  hour0To23: number;
  minute0To59: number;
  continuousHour0To24: number;
  /** Fractional minute-of-hour [0, 60) for smooth minute-hand motion. */
  continuousMinute0To60: number;
} {
  const utcMsOfDay = utcMsOfDayFromUtcMs(referenceNowMs);
  const offsetMs = (lonDeg / 15) * MS_PER_HOUR;
  const localMs = ((utcMsOfDay + offsetMs) % MS_PER_DAY + MS_PER_DAY) % MS_PER_DAY;
  const continuousHour0To24 = localMs / MS_PER_HOUR;
  const hour0To23 = Math.floor(continuousHour0To24) % 24;
  const minute0To59 = Math.floor((localMs % MS_PER_HOUR) / MS_PER_MINUTE);
  const continuousMinute0To60 = (localMs % MS_PER_HOUR) / MS_PER_MINUTE;
  return { hour0To23, minute0To59, continuousHour0To24, continuousMinute0To60 };
}
