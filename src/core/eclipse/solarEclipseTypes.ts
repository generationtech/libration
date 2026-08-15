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

export type EclipseFrame = {
  readonly support: EclipseAuthoritySupport;
  readonly productUtcMs: number;
  readonly activeSolar: SolarEclipseEvent | null;
  readonly solarGeometry: SolarEclipseLiveGeometry | null;
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
