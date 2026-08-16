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
import { solarEclipseObscurationAt } from "./solarEclipseObscuration";
import { solveSolarLocalCircumstances } from "./solarLocalCircumstances";

const TOTAL_2017 = "nasa-5mcse-solar-9546";
const TOTAL_2024 = "nasa-5mcse-solar-9561";
const ANNULAR_2023 = "nasa-5mcse-solar-9560";
const PARTIAL_2022 = "nasa-5mcse-solar-9558";

const KNOXVILLE = { latDeg: 35.9606, lonDeg: -83.9207 };
const DALLAS = { latDeg: 32.783, lonDeg: -96.8 };
const TOKYO = { latDeg: 35.6762, lonDeg: 139.6503 };

function requireEvent(id: string) {
  const event = getSolarEclipseEventById(id);
  if (!event) {
    throw new Error(`missing ${id}`);
  }
  return event;
}

describe("solarEclipseObscurationAt", () => {
  it("is zero outside the event and at a far-side control", () => {
    const event = requireEvent(TOTAL_2017);
    const quiet = solarEclipseObscurationAt(event.globalStartMs - 3_600_000, event, 36.87, -87.49);
    expect(quiet.obscuration01).toBe(0);
    const africa = solarEclipseObscurationAt(event.greatestEclipseUtcMs, event, 0, 20);
    expect(africa.obscuration01).toBe(0);
    expect(africa.inPenumbra).toBe(false);
  });

  it("is partial at Knoxville 2017 GE and total near the 2017 central point", () => {
    const event = requireEvent(TOTAL_2017);
    const knox = solarEclipseObscurationAt(
      event.greatestEclipseUtcMs,
      event,
      KNOXVILLE.latDeg,
      KNOXVILLE.lonDeg,
    );
    expect(knox.sunAboveHorizon).toBe(true);
    expect(knox.obscuration01).toBeGreaterThan(0.7);
    expect(knox.obscuration01).toBeLessThan(1);
    const center = solarEclipseObscurationAt(
      event.greatestEclipseUtcMs,
      event,
      event.geLatDeg,
      event.geLonDeg,
    );
    expect(center.obscuration01).toBeGreaterThan(0.97);
  });

  it("reaches ~1 at Dallas 2024 local maximum and stays <1 at 2023 annular GE", () => {
    const total = requireEvent(TOTAL_2024);
    const loc = solveSolarLocalCircumstances(total, DALLAS.latDeg, DALLAS.lonDeg);
    expect(loc.maximum).not.toBeNull();
    const dallas = solarEclipseObscurationAt(
      loc.maximum!.utcMs,
      total,
      DALLAS.latDeg,
      DALLAS.lonDeg,
    );
    expect(dallas.obscuration01).toBeGreaterThan(0.98);
    const annular = requireEvent(ANNULAR_2023);
    const antumbra = solarEclipseObscurationAt(
      annular.greatestEclipseUtcMs,
      annular,
      annular.geLatDeg,
      annular.geLonDeg,
    );
    expect(antumbra.obscuration01).toBeGreaterThan(0.8);
    expect(antumbra.obscuration01).toBeLessThan(0.995);
  });

  it("is zero below the horizon even if the point is in the penumbra cone", () => {
    const event = requireEvent(TOTAL_2017);
    const night = solarEclipseObscurationAt(
      event.greatestEclipseUtcMs,
      event,
      -40,
      140,
    );
    expect(night.sunAboveHorizon).toBe(false);
    expect(night.obscuration01).toBe(0);
    expect(night.physicalObscuration01).toBe(0);
  });

  it("keeps physical overlap below the horizon while E4 obscuration stays 0", () => {
    const event = requireEvent(TOTAL_2017);
    const sample = solarEclipseObscurationAt(
      Date.parse("2017-08-21T16:45:01.000Z"),
      event,
      45,
      -174,
    );
    expect(sample.sunAboveHorizon).toBe(false);
    expect(sample.obscuration01).toBe(0);
    expect(sample.inPenumbra).toBe(true);
    expect(sample.physicalObscuration01).toBeGreaterThan(0.5);
    expect(sample.physicalObscuration01).toBeLessThan(1);
  });

  it("agrees with E4 local-maximum obscuration at the same UTC and city", () => {
    const total2017 = requireEvent(TOTAL_2017);
    const knox2017 = solveSolarLocalCircumstances(total2017, KNOXVILLE.latDeg, KNOXVILLE.lonDeg);
    expect(knox2017.maximum).not.toBeNull();
    expect(knox2017.obscuration).not.toBeNull();
    const knox2017Sample = solarEclipseObscurationAt(
      knox2017.maximum!.utcMs,
      total2017,
      KNOXVILLE.latDeg,
      KNOXVILLE.lonDeg,
    );
    expect(Math.abs(knox2017Sample.obscuration01 - knox2017.obscuration!)).toBeLessThan(1e-9);

    const event = requireEvent(TOTAL_2024);
    const knox = solveSolarLocalCircumstances(event, KNOXVILLE.latDeg, KNOXVILLE.lonDeg);
    expect(knox.maximum).not.toBeNull();
    expect(knox.obscuration).not.toBeNull();
    const sample = solarEclipseObscurationAt(
      knox.maximum!.utcMs,
      event,
      KNOXVILLE.latDeg,
      KNOXVILLE.lonDeg,
    );
    expect(Math.abs(sample.obscuration01 - knox.obscuration!)).toBeLessThan(1e-9);

    const dallas = solveSolarLocalCircumstances(event, DALLAS.latDeg, DALLAS.lonDeg);
    const dallasSample = solarEclipseObscurationAt(
      dallas.maximum!.utcMs,
      event,
      DALLAS.latDeg,
      DALLAS.lonDeg,
    );
    expect(Math.abs(dallasSample.obscuration01 - dallas.obscuration!)).toBeLessThan(1e-9);

    const tokyo = solveSolarLocalCircumstances(event, TOKYO.latDeg, TOKYO.lonDeg);
    const tokyoSample = solarEclipseObscurationAt(
      event.greatestEclipseUtcMs,
      event,
      TOKYO.latDeg,
      TOKYO.lonDeg,
    );
    expect(tokyo.obscuration ?? 0).toBe(0);
    expect(tokyoSample.obscuration01).toBe(0);
  });

  it("changes continuously under a 30 s step at Knoxville 2017", () => {
    const event = requireEvent(TOTAL_2017);
    const loc = solveSolarLocalCircumstances(event, KNOXVILLE.latDeg, KNOXVILLE.lonDeg);
    const t0 = loc.maximum!.utcMs - 120_000;
    const a = solarEclipseObscurationAt(t0, event, KNOXVILLE.latDeg, KNOXVILLE.lonDeg);
    const b = solarEclipseObscurationAt(t0 + 30_000, event, KNOXVILLE.latDeg, KNOXVILLE.lonDeg);
    expect(Math.abs(b.obscuration01 - a.obscuration01)).toBeLessThan(0.08);
  });

  it("is between 0 and 1 for the 2022 partial-only event", () => {
    const event = requireEvent(PARTIAL_2022);
    const sample = solarEclipseObscurationAt(
      event.greatestEclipseUtcMs,
      event,
      event.geLatDeg,
      event.geLonDeg,
    );
    expect(sample.obscuration01).toBeGreaterThan(0.2);
    expect(sample.obscuration01).toBeLessThan(1);
  });
});
