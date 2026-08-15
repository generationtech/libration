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

import { describe, expect, it } from "vitest";
import { getSolarEclipseEventById } from "./eclipseAuthority";
import { evaluateBesselianElements, t0TdtMs } from "./besselianElements";

describe("Besselian polynomial evaluation", () => {
  const event = getSolarEclipseEventById("nasa-5mcse-solar-9561");
  if (!event) {
    throw new Error("missing 2024 total fixture");
  }
  const el = event.besselian;

  it("uses TDT hours from t0; UTC = TDT − ΔT", () => {
    expect(el.t0TdtHours).toBe(18);
    expect(el.deltaTSeconds).toBe(74);
    expect(el.tMinHours).toBe(-3);
    expect(el.tMaxHours).toBe(3);
    const utcAtT0 = t0TdtMs(el) - el.deltaTSeconds * 1000;
    const atT0 = evaluateBesselianElements(el, utcAtT0);
    expect(atT0.tHours).toBeCloseTo(0, 10);
    expect(atT0.x).toBeCloseTo(el.x[0], 10);
    expect(atT0.y).toBeCloseTo(el.y[0], 10);
    expect(atT0.dDeg).toBeCloseTo(el.d[0], 10);
    expect(atT0.muDeg).toBeCloseTo(el.mu[0], 10);
    expect(atT0.l1).toBeCloseTo(el.l1[0], 10);
    expect(atT0.l2).toBeCloseTo(el.l2[0], 10);
    expect(atT0.tanF1).toBe(el.tanF1);
    expect(atT0.tanF2).toBe(el.tanF2);
    expect(atT0.insideElementWindow).toBe(true);
  });

  it("evaluates a cubic/quadratic polynomial at greatest eclipse", () => {
    const ge = evaluateBesselianElements(el, event.greatestEclipseUtcMs);
    expect(Math.abs(ge.tHours - 1109 / 3600)).toBeLessThan(1e-9);
    const t = ge.tHours;
    const x =
      el.x[0] + el.x[1] * t + el.x[2] * t * t + el.x[3] * t * t * t;
    expect(ge.x).toBeCloseTo(x, 12);
    expect(ge.l2).toBeLessThan(0);
  });
});
