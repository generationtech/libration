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
import { getLunarEclipseEventById } from "./eclipseAuthority";
import { solveLunarLocalCircumstances } from "./lunarLocalCircumstances";

const TOTAL_2022 = "nasa-5mcle-lunar-9700";
const KNOXVILLE = { latDeg: 35.9606, lonDeg: -83.9207 };
const TOKYO = { latDeg: 35.6762, lonDeg: 139.6503 };

function event2022() {
  const e = getLunarEclipseEventById(TOTAL_2022);
  if (!e) {
    throw new Error("missing 2022 total lunar fixture");
  }
  return e;
}

describe("lunar local circumstances", () => {
  it("finds Knoxville contacts above the geometric horizon at 2022 GE", () => {
    const loc = solveLunarLocalCircumstances(event2022(), KNOXVILLE.latDeg, KNOXVILLE.lonDeg);
    expect(loc.globalSubtype).toBe("total");
    expect(loc.locallyVisible).toBe(true);
    expect(loc.totalityVisible).toBe(true);
    const ge = loc.contacts.find((c) => c.id === "greatest");
    expect(ge?.aboveHorizon).toBe(true);
    expect(ge?.altitudeDeg).toBeGreaterThan(0);
    expect(loc.localMaximum?.source).toBe("global_greatest");
    expect(loc.localMaximum?.utcMs).toBe(event2022().greatestEclipseUtcMs);
    expect(loc.firstVisibleContactId).not.toBeNull();
    expect(loc.lastVisibleContactId).not.toBeNull();
  });

  it("does not treat Tokyo GE as locally visible; global event still total", () => {
    const loc = solveLunarLocalCircumstances(event2022(), TOKYO.latDeg, TOKYO.lonDeg);
    expect(loc.globalSubtype).toBe("total");
    const ge = loc.contacts.find((c) => c.id === "greatest");
    expect(ge?.aboveHorizon).toBe(false);
    if (loc.locallyVisible) {
      expect(loc.localMaximum?.source).not.toBe("global_greatest");
      expect(loc.localMaximum?.utcMs).not.toBe(event2022().greatestEclipseUtcMs);
    } else {
      expect(loc.localMaximum).toBeNull();
      expect(loc.totalityVisible).toBe(false);
    }
  });

  it("records altitude for every globally present contact", () => {
    const loc = solveLunarLocalCircumstances(event2022(), KNOXVILLE.latDeg, KNOXVILLE.lonDeg);
    expect(loc.contacts.map((c) => c.id)).toEqual(["p1", "u1", "u2", "greatest", "u3", "u4", "p4"]);
    for (const c of loc.contacts) {
      expect(Number.isFinite(c.altitudeDeg)).toBe(true);
      expect(Number.isFinite(c.azimuthDeg)).toBe(true);
    }
  });
});
