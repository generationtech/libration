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

import type { SolarBesselianCoefficients } from "./besselianElements";
import type { GeographicPoint } from "./besselianGeographic";
import type { LunarEclipseEvent, LunarEclipseLiveGeometry } from "./lunarEclipseTypes";

export type SolarEclipseSubtype = "partial" | "annular" | "total" | "hybrid";

export type EclipseAuthoritySupport =
  | { readonly supported: true }
  | { readonly supported: false; readonly reason: "outside-authority-range" };

export type SolarEclipseEvent = {
  readonly id: string;
  readonly catalogNumber: number;
  readonly kind: "solar";
  readonly subtype: SolarEclipseSubtype;
  /** NASA type string, including optional second-character flags (n/s/+/−/2/3/…). */
  readonly typeCode: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly greatestEclipseTdtMs: number;
  readonly greatestEclipseUtcMs: number;
  readonly deltaTSeconds: number;
  readonly gamma: number;
  readonly magnitude: number;
  readonly geLatDeg: number;
  readonly geLonDeg: number;
  readonly pathWidthKm: number;
  readonly sunAltDeg: number;
  readonly saros: number;
  readonly lunation: number;
  readonly globalStartMs: number;
  readonly globalEndMs: number;
  readonly besselian: SolarBesselianCoefficients;
};

export type CentralShadowKind = "umbra" | "antumbra";

export type SolarEclipseLiveGeometry = {
  readonly centralPoint: GeographicPoint | null;
  readonly centralShadowKind: CentralShadowKind | null;
  readonly centerline: readonly GeographicPoint[];
  readonly centralBand: readonly GeographicPoint[];
  readonly partialRegion: readonly GeographicPoint[];
  readonly pathWidthKm: number | null;
};

export type SolarEclipseLifecycle = "upcoming" | "active";

/**
 * Time-independent event geography: the corridor swept by the central eclipse,
 * plus a representative greatest-eclipse partial region.
 * Distinct from {@link SolarEclipseLiveGeometry} (the compact footprint at T).
 */
export type SolarEclipseEventForecastGeometry = {
  readonly eventId: string;
  readonly authorityVersion: string;
  readonly algorithmId: string;
  readonly subtype: SolarEclipseSubtype;
  readonly centerline: readonly GeographicPoint[];
  /** Swept totality/annularity band; empty for partial-only events. */
  readonly corridorBands: readonly (readonly GeographicPoint[])[];
  /**
   * Greatest-eclipse penumbral outline. Representative of partial visibility at
   * maximum eclipse, not the event-long swept penumbral envelope.
   */
  readonly partialForecastRegion: readonly GeographicPoint[];
  readonly widthAtGreatestEclipseKm: number | null;
  readonly sampleStepMs: number;
};

export type SolarEclipseForecastSelection = {
  readonly event: SolarEclipseEvent;
  readonly lifecycle: SolarEclipseLifecycle;
  readonly nearestUpcoming: boolean;
  /** Presentation-only; derived from time-to-event / horizon. */
  readonly prominence01: number;
  readonly geometry: SolarEclipseEventForecastGeometry;
};

/**
 * Requested forecast window vs the portion that lies inside the bundled authority span.
 * `truncated` means part of `(T, T+H]` is outside 1900–2100; returned events cover only the query interval.
 */
export type EclipseForecastCoverage = {
  readonly requestedStartMs: number;
  readonly requestedEndMs: number;
  readonly queryStartMs: number;
  readonly queryEndMs: number;
  readonly truncated: boolean;
};

export type EclipseFrame = {
  readonly support: EclipseAuthoritySupport;
  readonly productUtcMs: number;
  readonly horizonMs: number;
  readonly forecastCoverage: EclipseForecastCoverage;
  readonly activeSolar: SolarEclipseEvent | null;
  readonly solarGeometry: SolarEclipseLiveGeometry | null;
  readonly upcomingSolar: readonly SolarEclipseEvent[];
  readonly forecastSelections: readonly SolarEclipseForecastSelection[];
  readonly activeLunar: LunarEclipseEvent | null;
  readonly lunarGeometry: LunarEclipseLiveGeometry | null;
};

export type EclipseAuthorityMetadata = {
  readonly authorityId: string;
  readonly authorityVersion: string;
  readonly source: {
    readonly identity: string;
    readonly documents: readonly string[];
    readonly file: string;
    readonly url: string;
    readonly retrievedUtc: string;
    readonly sourceSha256: string;
    readonly listingDate: string;
  };
  readonly supportedUtcRange: { readonly startMs: number; readonly endMs: number };
  readonly generatedAtUtc: string;
  readonly eventCount: number;
  readonly licenseNote: string;
  readonly attribution: string;
};
