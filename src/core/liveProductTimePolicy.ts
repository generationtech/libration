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
 * Product-time vs wall-clock gate for current-only internet observations.
 *
 * Product time ({@link TimeContext.now}) remains the scene authority.
 * Wall-clock now is used only to decide whether a current-only feed may
 * coexist with that instant. Not user-configurable.
 */

/** Inclusive half-window: |product − wall| ≤ this value is live-enough. */
export const LIVE_PRODUCT_TIME_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * True when `productUtcMs` is close enough to `wallClockUtcMs` that
 * wall-clock-current internet observations may be shown.
 *
 * Ordinary current-time operation qualifies. Paused Demo at “now” qualifies
 * until wall clock walks outside the window. 2017/2030 Demo instants do not.
 */
export function isProductTimeLiveEnough(
  productUtcMs: number,
  wallClockUtcMs: number,
  toleranceMs: number = LIVE_PRODUCT_TIME_TOLERANCE_MS,
): boolean {
  if (!Number.isFinite(productUtcMs) || !Number.isFinite(wallClockUtcMs)) {
    return false;
  }
  const windowMs =
    Number.isFinite(toleranceMs) && toleranceMs >= 0
      ? toleranceMs
      : LIVE_PRODUCT_TIME_TOLERANCE_MS;
  return Math.abs(productUtcMs - wallClockUtcMs) <= windowMs;
}
