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
 * NASA/Espenak–Meeus polynomial Besselian elements.
 *
 * Time argument: `t = t1 − t0` in hours of Terrestrial Dynamical Time (TDT),
 * where `t0` is the tabulated reference epoch on the eclipse calendar date.
 * Product UTC converts as TDT = UTC + ΔT (catalog ΔT, seconds).
 *
 * Units (NASA GSFC Besselian method page / catalog dump):
 * - x, y, l1, l2: Earth equatorial radii
 * - d: degrees (declination of the shadow axis)
 * - μ: degrees (ephemeris Greenwich hour angle of the shadow axis)
 * - tan f1, tan f2: dimensionless cone slopes
 * - l2 is negative in the umbra and positive in the antumbra
 *
 * Valid window: typically `tMin`…`tMax` (NASA least-squares fit, usually t0 ± 3 h).
 */

export type SolarBesselianCoefficients = {
  readonly x: readonly [number, number, number, number];
  readonly y: readonly [number, number, number, number];
  readonly d: readonly [number, number, number];
  readonly mu: readonly [number, number, number];
  readonly l1: readonly [number, number, number];
  readonly l2: readonly [number, number, number];
  readonly tanF1: number;
  readonly tanF2: number;
  readonly t0TdtHours: number;
  readonly tMinHours: number;
  readonly tMaxHours: number;
  readonly deltaTSeconds: number;
  readonly calendarYear: number;
  readonly calendarMonth: number;
  readonly calendarDay: number;
};

export type EvaluatedBesselianElements = {
  /** Hours of TDT from t0. */
  readonly tHours: number;
  readonly x: number;
  readonly y: number;
  readonly dDeg: number;
  readonly muDeg: number;
  readonly l1: number;
  readonly l2: number;
  readonly tanF1: number;
  readonly tanF2: number;
  readonly deltaTSeconds: number;
  readonly insideElementWindow: boolean;
};

function evalPoly(coeffs: readonly number[], t: number): number {
  let s = 0;
  let p = 1;
  for (const c of coeffs) {
    s += c * p;
    p *= t;
  }
  return s;
}

export function tdtMsFromProductUtcMs(utcMs: number, deltaTSeconds: number): number {
  return utcMs + deltaTSeconds * 1000;
}

export function t0TdtMs(elements: SolarBesselianCoefficients): number {
  return (
    Date.UTC(elements.calendarYear, elements.calendarMonth - 1, elements.calendarDay, 0, 0, 0, 0) +
    elements.t0TdtHours * 3_600_000
  );
}

export function besselianTimeHoursFromUtcMs(
  utcMs: number,
  elements: SolarBesselianCoefficients,
): number {
  const tdtMs = tdtMsFromProductUtcMs(utcMs, elements.deltaTSeconds);
  return (tdtMs - t0TdtMs(elements)) / 3_600_000;
}

export function evaluateBesselianElements(
  elements: SolarBesselianCoefficients,
  utcMs: number,
): EvaluatedBesselianElements {
  const tHours = besselianTimeHoursFromUtcMs(utcMs, elements);
  const inside =
    tHours >= elements.tMinHours - 1e-9 && tHours <= elements.tMaxHours + 1e-9;
  return {
    tHours,
    x: evalPoly(elements.x, tHours),
    y: evalPoly(elements.y, tHours),
    dDeg: evalPoly(elements.d, tHours),
    muDeg: evalPoly(elements.mu, tHours),
    l1: evalPoly(elements.l1, tHours),
    l2: evalPoly(elements.l2, tHours),
    tanF1: elements.tanF1,
    tanF2: elements.tanF2,
    deltaTSeconds: elements.deltaTSeconds,
    insideElementWindow: inside,
  };
}
