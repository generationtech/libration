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
 * IAU 1976 ellipsoid used by the NASA/Espenak–Meeus Five Millennium solar canon
 * (Explanatory Supplement 1974 / Chauvenet reduction). Distances in the Besselian
 * fundamental plane are in units of the equatorial radius.
 */
export const IAU1976_EARTH_FLATTENING = 1 / 298.257;
export const IAU1976_EARTH_EQUATORIAL_RADIUS_KM = 6378.14;
export const IAU1976_EARTH_ECCENTRICITY_SQ =
  IAU1976_EARTH_FLATTENING * (2 - IAU1976_EARTH_FLATTENING);
export const IAU1976_POLAR_OVER_EQUATORIAL = 1 - IAU1976_EARTH_FLATTENING;

/** Sidereal rotation vs mean solar: 15.04106863 ° per hour of ΔT. */
export const EARTH_SIDEREAL_DEG_PER_SECOND = 15.04106863 / 3600;
