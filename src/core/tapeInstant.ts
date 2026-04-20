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

import { deriveCivilProjection } from "./civilProjection.ts";
import { readWallClockPartsInZone, utcMsFromWallDateTimeInZone } from "./wallTimeInZone.ts";

/**
 * UTC epoch ms for the instant at integer civil hour `civilHour0To23` (00:00.000 wall time) on the same reference-zone
 * calendar day as `nowUtcInstant`. Used for tape **label** formatting (e.g. UTC numerals) without affecting phased tape
 * geometry, which is driven only by {@link deriveCivilProjection} + read-point registration.
 */
export function instantAtBandCivilHour(
  nowUtcInstant: number,
  referenceTimeZoneId: string,
  civilHour0To23: number,
): number | null {
  const h = ((Math.floor(civilHour0To23) % 24) + 24) % 24;
  const parts = readWallClockPartsInZone(nowUtcInstant, referenceTimeZoneId);
  return utcMsFromWallDateTimeInZone(parts.y, parts.mo, parts.d, h, 0, 0, 0, referenceTimeZoneId);
}

/**
 * UTC instant at the band civil hour obtained by shifting the current reference-zone civil fractional hour by
 * `deltaHoursFromReadPoint`, then taking the **integer** band hour (0–23) on the same reference calendar day as
 * `nowUtcInstant`. For fractional deltas, behavior matches the phased hour index used for tape columns.
 */
export function instantAtTapePosition(
  nowUtcInstant: number,
  referenceTimeZoneId: string,
  deltaHoursFromReadPoint: number,
): number | null {
  const { fractionalHour } = deriveCivilProjection(nowUtcInstant, referenceTimeZoneId);
  const shifted = fractionalHour + deltaHoursFromReadPoint;
  const civilHour = Math.floor(((shifted % 24) + 24) % 24);
  return instantAtBandCivilHour(nowUtcInstant, referenceTimeZoneId, civilHour);
}
