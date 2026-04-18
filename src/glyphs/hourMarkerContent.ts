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
 * Semantic input for hour-marker glyph construction. Callers compute once per marker.
 */
export type HourMarkerContent = {
  /** Canonical structural hour 0–23 for representation logic (e.g. fallback radial angle). */
  structuralHour0To23: number;
  /** Label string for text-backed representations (local12/24/UTC as resolved by the planner). */
  displayLabel: string;
  /**
   * Mean-solar continuous hour-of-day [0,24) for radial line/wedge spoke angle; matches semantic wall-clock hour hand.
   * When omitted, procedural radial modes use {@link structuralHour0To23} only (integer structural slot).
   */
  continuousHour0To24?: number;
};
