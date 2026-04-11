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
 * Backend-neutral style tokens for hour-marker rendering. Layout supplies the box;
 * these tokens control drawing inside the box.
 */
export type HourMarkerGlyphStyleId =
  | "topBandHourDefault"
  | "topBandHourSegment"
  | "topBandHourDotMatrix"
  | "topBandHourTerminal"
  | "topBandHourAnalogClock"
  | "topBandChromeUpperNumeral"
  | "topBandChromeAnnotation";
