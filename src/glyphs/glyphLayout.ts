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
 * Placement for a glyph: layout chooses position and scale; the glyph adapter decides what to draw inside.
 */
export type GlyphLayoutBox = {
  cx: number;
  cy: number;
  /** Square box side length (CSS px). */
  size: number;
};
