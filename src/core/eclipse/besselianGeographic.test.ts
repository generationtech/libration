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
import { evaluateBesselianElements } from "./besselianElements";
import {
  centralPathWidthKm,
  haversineKm,
  shadowAxisIntersection,
  wrapLongitudeDeg,
} from "./besselianGeographic";
import { solarEclipseGeometryAt } from "./solarEclipseGeometry";
import { unwrappedLongitudes } from "../../renderer/renderPlan/equirectSeamPath";

function requireEvent(id: string) {
  const e = getSolarEclipseEventById(id);
  if (!e) {
    throw new Error(`missing fixture ${id}`);
  }
  return e;
}

describe("Besselian-to-geographic reduction vs NASA dump", () => {
  it("places 2024-04-08 greatest eclipse within 10 km and width within 5 km", () => {
    const e = requireEvent("nasa-5mcse-solar-9561");
    const el = evaluateBesselianElements(e.besselian, e.greatestEclipseUtcMs);
    const hit = shadowAxisIntersection(el);
    expect(hit?.onEarth).toBe(true);
    const err = haversineKm(hit!.latDeg, hit!.lonDeg, e.geLatDeg, e.geLonDeg);
    expect(err).toBeLessThan(10);
    const width = centralPathWidthKm(el, hit!.zeta, hit!.rho);
    expect(Math.abs(width - e.pathWidthKm)).toBeLessThan(5);
    const geom = solarEclipseGeometryAt(e, e.greatestEclipseUtcMs);
    expect(geom?.centralShadowKind).toBe("umbra");
    expect(geom?.centralPoint).not.toBeNull();
    expect(geom?.centerline.length).toBeGreaterThan(2);
    expect(geom?.centralBand.length).toBeGreaterThan(4);
    expect(geom?.partialRegion.length).toBeGreaterThan(4);
    const c = geom!.centralPoint!;
    const umbraR = Math.max(
      ...geom!.centralBand.map((p) => haversineKm(c.latDeg, c.lonDeg, p.latDeg, p.lonDeg)),
    );
    const penumbraR = Math.max(
      ...geom!.partialRegion.map((p) => haversineKm(c.latDeg, c.lonDeg, p.latDeg, p.lonDeg)),
    );
    expect(penumbraR).toBeGreaterThan(umbraR * 2);
  });

  it("places 2023-10-14 annular greatest eclipse and uses antumbra", () => {
    const e = requireEvent("nasa-5mcse-solar-9560");
    const el = evaluateBesselianElements(e.besselian, e.greatestEclipseUtcMs);
    const hit = shadowAxisIntersection(el);
    expect(hit?.onEarth).toBe(true);
    expect(haversineKm(hit!.latDeg, hit!.lonDeg, e.geLatDeg, e.geLonDeg)).toBeLessThan(10);
    expect(
      Math.abs(centralPathWidthKm(el, hit!.zeta, hit!.rho) - e.pathWidthKm),
    ).toBeLessThan(5);
    const geom = solarEclipseGeometryAt(e, e.greatestEclipseUtcMs);
    expect(geom?.centralShadowKind).toBe("antumbra");
    expect(geom?.centralBand.length).toBeGreaterThan(4);
  });

  it("does not invent a central band or centerline for 2022-10-25 partial-only", () => {
    const e = requireEvent("nasa-5mcse-solar-9558");
    expect(e.subtype).toBe("partial");
    const geom = solarEclipseGeometryAt(e, e.greatestEclipseUtcMs);
    expect(geom).not.toBeNull();
    expect(geom?.centralPoint).toBeNull();
    expect(geom?.centralShadowKind).toBeNull();
    expect(geom?.centerline).toEqual([]);
    expect(geom?.centralBand).toEqual([]);
    expect(geom?.partialRegion.length).toBeGreaterThan(4);
  });

  it("keeps 2016-03-09 Pacific centerline seam-coherent", () => {
    const e = requireEvent("nasa-5mcse-solar-9543");
    const el = evaluateBesselianElements(e.besselian, e.greatestEclipseUtcMs);
    const hit = shadowAxisIntersection(el);
    expect(hit?.onEarth).toBe(true);
    expect(haversineKm(hit!.latDeg, hit!.lonDeg, e.geLatDeg, e.geLonDeg)).toBeLessThan(10);
    const geom = solarEclipseGeometryAt(e, e.greatestEclipseUtcMs);
    expect(geom?.centerline.length).toBeGreaterThan(4);
    const unwrapped = unwrappedLongitudes(geom!.centerline.map((p) => p.lonDeg));
    for (let i = 1; i < unwrapped.length; i += 1) {
      expect(Math.abs(unwrapped[i]! - unwrapped[i - 1]!)).toBeLessThan(40);
    }
    expect(geom!.centralPoint!.lonDeg).toBeGreaterThan(140);
  });

  it("places 2021-12-04 polar total near the catalog point", () => {
    const e = requireEvent("nasa-5mcse-solar-9556");
    const el = evaluateBesselianElements(e.besselian, e.greatestEclipseUtcMs);
    const hit = shadowAxisIntersection(el);
    expect(hit?.onEarth).toBe(true);
    expect(hit!.latDeg).toBeLessThan(-60);
    expect(haversineKm(hit!.latDeg, hit!.lonDeg, e.geLatDeg, e.geLonDeg)).toBeLessThan(10);
    const geom = solarEclipseGeometryAt(e, e.greatestEclipseUtcMs);
    expect(geom?.centralBand.length).toBeGreaterThan(4);
  });

  it("preserves hybrid subtype while using L2′ for live umbra/antumbra", () => {
    const e = requireEvent("nasa-5mcse-solar-9559");
    expect(e.subtype).toBe("hybrid");
    const geom = solarEclipseGeometryAt(e, e.greatestEclipseUtcMs);
    expect(geom?.centralPoint).not.toBeNull();
    expect(geom?.centralShadowKind === "umbra" || geom?.centralShadowKind === "antumbra").toBe(
      true,
    );
  });

  it("wraps longitude into (−180, 180]", () => {
    expect(wrapLongitudeDeg(190)).toBe(-170);
    expect(wrapLongitudeDeg(-190)).toBe(170);
  });
});
