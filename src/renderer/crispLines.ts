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

/** Pixel-aligned strokes for 1px hairlines on canvas (matches legacy chrome rounding). */

export function alignCrispLineX(x: number): number {
  return Math.round(x) + 0.5;
}

export function alignCrispLineY(y: number): number {
  return Math.round(y) + 0.5;
}
