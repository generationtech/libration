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
 * Nominal UTC offset hours derived from meridian longitude for the fixed 15° structural grid (NATO strip metadata,
 * column labels). Uses lon/15 rounded to integer hours — not IANA civil chrome wall time
 * (`deriveCivilProjection` / `CivilProjection`).
 */

/**
 * Nearest integer nominal UTC offset for {@code lonDeg}/15 hours, with half-hour ties resolved away from 0
 * (so ±11.5°/h → ±12, matching edge columns on the 24×15° strip).
 */
export function roundedStructuralMeridianUtcOffsetHours(lonDeg: number): number {
  const q = lonDeg / 15;
  const o = q >= 0 ? Math.floor(q + 0.5) : Math.ceil(q - 0.5);
  return Math.max(-12, Math.min(12, o));
}

/** Nominal UTC offset hours ∈ [−12, 12] for {@code lonDeg} on the structural meridian grid (alias of {@link roundedStructuralMeridianUtcOffsetHours}). */
export function nominalUtcOffsetHoursFromLongitudeDeg(lonDeg: number): number {
  return roundedStructuralMeridianUtcOffsetHours(lonDeg);
}
