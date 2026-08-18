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

export type LunarEclipseSubtype = "penumbral" | "partial" | "total";

/**
 * Authoritative lunar eclipse event from the bundled NASA/Espenak–Meeus catalog.
 * Contacts that do not occur for a subtype are omitted (`null`), never invented.
 */
export type LunarEclipseEvent = {
  readonly id: string;
  readonly catalogNumber: number;
  readonly kind: "lunar";
  readonly subtype: LunarEclipseSubtype;
  /** NASA type string, including optional second-character flags (m, +, -, star, b, e). */
  readonly typeCode: string;
  readonly qse: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly greatestEclipseTdtMs: number;
  readonly greatestEclipseUtcMs: number;
  readonly deltaTSeconds: number;
  readonly gamma: number;
  readonly penumbralMagnitude: number;
  readonly umbralMagnitude: number;
  readonly penumbralDurationMinutes: number | null;
  readonly partialDurationMinutes: number | null;
  readonly totalDurationMinutes: number | null;
  readonly zenithLatDeg: number;
  readonly zenithLonDeg: number;
  readonly saros: number;
  readonly lunation: number;
  readonly p1UtcMs: number | null;
  readonly u1UtcMs: number | null;
  readonly u2UtcMs: number | null;
  readonly u3UtcMs: number | null;
  readonly u4UtcMs: number | null;
  readonly p4UtcMs: number | null;
  readonly globalStartMs: number;
  readonly globalEndMs: number;
};

export type LunarEclipsePhase = "none" | "penumbral" | "partial-umbral" | "total-umbral";

/**
 * Earth-shadow geometry at the Moon for one product UTC.
 * Radii and offsets are in Earth equatorial radii unless noted.
 */
export type LunarEclipseLifecycle = "upcoming" | "active";

/**
 * Time-independent representative geography for an upcoming lunar eclipse:
 * the Moon-above-horizon region at greatest eclipse. Used as event-information
 * / placard forecast context. Map overlays use current-product-instant
 * visibility instead (LIB-044) so playback stays temporally continuous.
 */
export type LunarEclipseEventForecastGeometry = {
  readonly eventId: string;
  readonly authorityVersion: string;
  readonly algorithmId: string;
  readonly subtype: LunarEclipseSubtype;
  readonly zenithLatDeg: number;
  readonly zenithLonDeg: number;
  readonly moonVisibleRegion: readonly { readonly latDeg: number; readonly lonDeg: number }[];
  readonly polarCloseLatDeg: number | undefined;
};

export type LunarEclipseForecastSelection = {
  readonly event: LunarEclipseEvent;
  readonly lifecycle: LunarEclipseLifecycle;
  readonly nearestUpcoming: boolean;
  readonly prominence01: number;
  readonly geometry: LunarEclipseEventForecastGeometry;
};

export type LunarEclipseLiveGeometry = {
  readonly phase: LunarEclipsePhase;
  readonly gamma: number;
  readonly axisDistanceEarthRadii: number;
  /** Signed along-track offset of the Moon east of the shadow axis (Earth radii). */
  readonly alongTrackEarthRadii: number;
  readonly penumbraRadiusEarthRadii: number;
  readonly umbraRadiusEarthRadii: number;
  readonly moonRadiusEarthRadii: number;
  /** Instantaneous penumbral magnitude (catalog definition). */
  readonly penumbralMagnitude: number;
  /** Instantaneous umbral magnitude (catalog definition). */
  readonly umbralMagnitude: number;
  /** Shadow-axis offset from Moon center, east, in Moon radii. */
  readonly shadowOffsetEastMoonRadii: number;
  /** Shadow-axis offset from Moon center, north, in Moon radii. */
  readonly shadowOffsetNorthMoonRadii: number;
  readonly penumbraRadiusMoonRadii: number;
  readonly umbraRadiusMoonRadii: number;
};
