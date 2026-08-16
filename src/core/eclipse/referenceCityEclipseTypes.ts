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

import type { LunarEclipseSubtype } from "./lunarEclipseTypes";
import type { SolarEclipseSubtype } from "./solarEclipseTypes";

/**
 * Geometric horizon: the Sun or Moon center altitude is the geometric
 * altitude above the spherical/ellipsoidal horizon. No atmospheric refraction,
 * no topographic horizon, no station elevation. A contact is below the horizon
 * when center altitude < 0°.
 */
export type GeometricAltitudeSample = {
  readonly utcMs: number;
  readonly altitudeDeg: number;
  readonly azimuthDeg: number;
  readonly aboveHorizon: boolean;
};

export type SolarLocalContactId = "c1" | "c2" | "maximum" | "c3" | "c4";

export type SolarLocalContact = GeometricAltitudeSample & {
  readonly id: SolarLocalContactId;
};

/**
 * Geographic kind is what the Besselian geometry does at the observer.
 * Observable kind is what can actually be seen above the geometric horizon.
 * A global total event is partial from most cities.
 */
export type SolarLocalKind = "none" | "partial" | "total" | "annular";

export type SolarLocalNotVisibleReason = "outside_footprint" | "below_horizon";

export type SolarLocalCircumstances = {
  readonly eventId: string;
  readonly globalSubtype: SolarEclipseSubtype;
  readonly geographicKind: SolarLocalKind;
  readonly observableKind: SolarLocalKind;
  readonly locallyVisible: boolean;
  readonly notVisibleReason: SolarLocalNotVisibleReason | null;
  readonly c1: SolarLocalContact | null;
  readonly c2: SolarLocalContact | null;
  readonly maximum: SolarLocalContact | null;
  readonly c3: SolarLocalContact | null;
  readonly c4: SolarLocalContact | null;
  /** Fraction of the Sun's diameter covered at local maximum (NASA magnitude). */
  readonly magnitude: number | null;
  /** Fraction of the solar disc *area* covered at local maximum. */
  readonly obscuration: number | null;
};

export type LunarLocalContactId = "p1" | "u1" | "u2" | "greatest" | "u3" | "u4" | "p4";

export type LunarLocalContact = GeometricAltitudeSample & {
  readonly id: LunarLocalContactId;
  readonly globallyPresent: boolean;
};

export type LunarHorizonCrossing = GeometricAltitudeSample & {
  readonly kind: "moonrise" | "moonset";
};

export type LunarLocalMaximum = GeometricAltitudeSample & {
  readonly source: "global_greatest" | "moonrise" | "moonset" | "visible_contact";
  readonly umbralMagnitude: number;
  readonly penumbralMagnitude: number;
};

export type LunarLocalCircumstances = {
  readonly eventId: string;
  readonly globalSubtype: LunarEclipseSubtype;
  readonly locallyVisible: boolean;
  readonly totalityVisible: boolean;
  readonly partialityVisible: boolean;
  readonly inProgressAtMoonrise: boolean;
  readonly endsAfterMoonset: boolean;
  readonly contacts: readonly LunarLocalContact[];
  readonly firstVisibleContactId: LunarLocalContactId | null;
  readonly lastVisibleContactId: LunarLocalContactId | null;
  readonly horizonCrossings: readonly LunarHorizonCrossing[];
  readonly localMaximum: LunarLocalMaximum | null;
};

export type ReferenceCityEclipseCircumstances = {
  readonly cityId: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly globalSolarEventId: string | null;
  readonly globalLunarEventId: string | null;
  readonly solar: SolarLocalCircumstances | null;
  readonly lunar: LunarLocalCircumstances | null;
};
