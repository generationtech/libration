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
 * Canonical chrome time / tape model: one UTC instant, one reference frame, civil projection for geometry,
 * display mode for formatting only.
 */

/** Affects labels and readout strings only — never tape registration geometry. */
export type DisplayTimeMode = "12hr" | "24hr" | "utc";

/** User-selected geographic + civil reference for chrome (single runtime contract). */
export interface ReferenceFrame {
  /** IANA timezone id for civil projection and primary readouts. */
  timeZoneId: string;
  /** Anchor meridian for read-point / tick placement (degrees east). */
  longitudeDeg: number;
  /** Human label for the reference (city name, fixed coordinate, etc.). */
  name: string;
}

/** Single source clock for the app instant. */
export interface TimeBasis {
  nowUtcInstant: number;
}

/**
 * Civil wall-time projection of {@link TimeBasis.nowUtcInstant} in {@link ReferenceFrame.timeZoneId}.
 * Pure derived data — no layout, rendering, or IANA re-resolution downstream.
 */
export interface CivilProjection {
  /** Fractional hour-of-day [0, 24) in the reference zone. */
  fractionalHour: number;
  /** UTC ms at local midnight for the reference zone calendar day containing the instant. */
  dayStartMs: number;
  localHour: number;
  localMinute: number;
}

/** Explicit horizontal read location for the present-time indicator and tape registration anchor. */
export interface ReadPoint {
  x: number;
}
