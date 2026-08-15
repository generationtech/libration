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
 * Optical lunar libration (longitude and latitude) from the same truncated
 * Meeus-style lunar series as {@link sublunarPoint}. Physical libration is omitted.
 * Suitable for the Moon glyph indicator, not surveying.
 */

import {
  moonArgumentOfLatitudeDeg,
  moonEclipticLatitudeDeg,
  moonEclipticLongitudeDeg,
  moonMeanAscendingNodeLongitudeDeg,
} from "./sublunarPoint";

/** Inclination of the mean lunar equator to the ecliptic (Meeus). */
export const LUNAR_MEAN_EQUATOR_INCLINATION_DEG = 1.54242;

export type OpticalLunarLibrationDeg = {
  /** Optical libration in longitude (degrees). Positive → extra eastern limb visible. */
  readonly longitudeDeg: number;
  /** Optical libration in latitude (degrees). Positive → extra northern limb visible. */
  readonly latitudeDeg: number;
};

function wrapSigned180(deg: number): number {
  let x = ((deg + 180) % 360) + 360;
  x = (x % 360) - 180;
  return x;
}

/**
 * Optical libration of the Moon at `utcMs` (authoritative product time).
 * Does not read the system clock.
 */
export function opticalLunarLibration(utcMs: number): OpticalLunarLibrationDeg {
  const lambdaDeg = moonEclipticLongitudeDeg(utcMs);
  const betaDeg = moonEclipticLatitudeDeg(utcMs);
  const omegaDeg = moonMeanAscendingNodeLongitudeDeg(utcMs);
  const fDeg = moonArgumentOfLatitudeDeg(utcMs);
  const d = Math.PI / 180;
  const I = LUNAR_MEAN_EQUATOR_INCLINATION_DEG * d;
  const W = (lambdaDeg - omegaDeg) * d;
  const beta = betaDeg * d;
  const sinB =
    -Math.sin(W) * Math.cos(beta) * Math.sin(I) - Math.sin(beta) * Math.cos(I);
  const latitudeDeg = (Math.asin(Math.max(-1, Math.min(1, sinB))) * 180) / Math.PI;
  const y = Math.sin(W) * Math.cos(beta) * Math.cos(I) - Math.sin(beta) * Math.sin(I);
  const x = Math.cos(W) * Math.cos(beta);
  const aDeg = (Math.atan2(y, x) * 180) / Math.PI;
  const longitudeDeg = wrapSigned180(aDeg - fDeg);
  return { longitudeDeg, latitudeDeg };
}
