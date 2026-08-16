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
import {
  getLunarEclipseEventById,
  LUNAR_ECLIPSE_AUTHORITY_METADATA,
  LUNAR_ECLIPSE_EVENTS,
  activeLunarEclipseAt,
  nextLunarEclipseAfter,
  lunarEclipsesIntersecting,
  parseLunarEclipseAuthorityAsset,
} from "./eclipseAuthority";
import { lunarEclipseGeometryAt } from "./lunarEclipseGeometry";

const SPAN_START = Date.UTC(1900, 0, 1, 0, 0, 0, 0);
const SPAN_END = Date.UTC(2101, 0, 1, 0, 0, 0, 0);
const TOTAL_2022 = "nasa-5mcle-lunar-9700";
const PARTIAL_2008 = "nasa-5mcle-lunar-9668";
const DATELINE_2015 = "nasa-5mcle-lunar-9684";
const MINUTE_MS = 60_000;

describe("lunar eclipse authority asset", () => {
  it("carries durable provenance, version, and the shared 1900–2100 span", () => {
    const m = LUNAR_ECLIPSE_AUTHORITY_METADATA;
    expect(m.authorityId).toBe("nasa-espenak-meeus-5mcle-lunar");
    expect(m.authorityVersion).toBe("1");
    expect(m.source.identity).toMatch(/NASA/);
    expect(m.source.documents).toEqual(
      expect.arrayContaining(["NASA/TP-2009-214172", "NASA/TP-2009-214173"]),
    );
    expect(m.source.sourceSha256).toBe(
      "d47586fc9c1c59338f234b3c6634c31744739887169f58d411ac766f3861fcf2",
    );
    expect(m.supportedUtcRange.startMs).toBe(SPAN_START);
    expect(m.supportedUtcRange.endMs).toBe(SPAN_END);
    expect(m.attribution.length).toBeGreaterThan(20);
    expect(m.eventCount).toBe(459);
  });

  it("loads a stable 1900–2100 lunar set and preserves penumbral truth", () => {
    expect(LUNAR_ECLIPSE_EVENTS).toHaveLength(459);
    expect(LUNAR_ECLIPSE_EVENTS.every((e) => e.kind === "lunar")).toBe(true);
    const counts = { total: 0, partial: 0, penumbral: 0 };
    for (const e of LUNAR_ECLIPSE_EVENTS) {
      counts[e.subtype] += 1;
      expect(e.id).toBe(`nasa-5mcle-lunar-${e.catalogNumber}`);
      if (e.subtype === "penumbral") {
        expect(e.umbralMagnitude).toBeLessThanOrEqual(0);
        expect(e.u1UtcMs).toBeNull();
        expect(e.u2UtcMs).toBeNull();
        expect(e.typeCode.startsWith("P")).toBe(false);
      }
    }
    expect(counts).toEqual({ total: 166, partial: 122, penumbral: 171 });
    const nx = getLunarEclipseEventById("nasa-5mcle-lunar-9420");
    expect(nx?.subtype).toBe("penumbral");
    expect(nx?.typeCode).toBe("Nx");
  });

  it("refuses a lunar asset that has lost provenance metadata", () => {
    expect(() => parseLunarEclipseAuthorityAsset({ events: [] })).toThrow(/authority|lunar/i);
  });
});

describe("lunar eclipse lookup and NASA fixtures", () => {
  it("resolves 2022 May 16 total contacts and magnitudes from the catalog", () => {
    const e = getLunarEclipseEventById(TOTAL_2022);
    expect(e?.subtype).toBe("total");
    expect(e?.typeCode).toBe("T-");
    expect(e?.gamma).toBe(-0.2532);
    expect(e?.penumbralMagnitude).toBe(2.3726);
    expect(e?.umbralMagnitude).toBe(1.4137);
    expect(e?.penumbralDurationMinutes).toBe(318.7);
    expect(e?.partialDurationMinutes).toBe(207.2);
    expect(e?.totalDurationMinutes).toBe(84.9);
    expect(e?.zenithLatDeg).toBe(-19);
    expect(e?.zenithLonDeg).toBe(-64);
    expect(e?.greatestEclipseUtcMs).toBe(Date.parse("2022-05-16T04:11:29.000Z"));
    expect(e?.p1UtcMs).not.toBeNull();
    expect(e?.u1UtcMs).not.toBeNull();
    expect(e?.u2UtcMs).not.toBeNull();
    expect(e?.u3UtcMs).not.toBeNull();
    expect(e?.u4UtcMs).not.toBeNull();
    expect(e?.p4UtcMs).not.toBeNull();
    const ge = e!.greatestEclipseUtcMs;
    expect(Math.abs(e!.p4UtcMs! - e!.p1UtcMs! - 318.7 * MINUTE_MS)).toBeLessThan(1000);
    expect(Math.abs(e!.u4UtcMs! - e!.u1UtcMs! - 207.2 * MINUTE_MS)).toBeLessThan(1000);
    expect(Math.abs(e!.u3UtcMs! - e!.u2UtcMs! - 84.9 * MINUTE_MS)).toBeLessThan(1000);
    expect(Math.abs((e!.p1UtcMs! + e!.p4UtcMs!) / 2 - ge)).toBeLessThan(1000);
    expect(activeLunarEclipseAt(ge)?.id).toBe(TOTAL_2022);
    expect(activeLunarEclipseAt(e!.globalStartMs - 1)).toBeNull();
    expect(activeLunarEclipseAt(e!.globalEndMs + 1)).toBeNull();
  });

  it("resolves 2008 Aug 16 as partial with no U2/U3", () => {
    const e = getLunarEclipseEventById(PARTIAL_2008);
    expect(e?.subtype).toBe("partial");
    expect(e?.umbralMagnitude).toBe(0.8076);
    expect(e?.penumbralMagnitude).toBe(1.8366);
    expect(e?.gamma).toBe(0.5646);
    expect(e?.greatestEclipseUtcMs).toBe(Date.parse("2008-08-16T21:10:06.000Z"));
    expect(e?.u1UtcMs).not.toBeNull();
    expect(e?.u4UtcMs).not.toBeNull();
    expect(e?.u2UtcMs).toBeNull();
    expect(e?.u3UtcMs).toBeNull();
    expect(e?.totalDurationMinutes).toBeNull();
    expect(activeLunarEclipseAt(e!.greatestEclipseUtcMs)?.id).toBe(PARTIAL_2008);
  });

  it("keeps the 2015 dateline total as a lookup fixture", () => {
    const e = getLunarEclipseEventById(DATELINE_2015);
    expect(e?.subtype).toBe("total");
    expect(e?.zenithLonDeg).toBe(-179);
    expect(e?.umbralMagnitude).toBe(1.0008);
  });

  it("finds the next lunar eclipse and intersecting range without a full scan", () => {
    const total = getLunarEclipseEventById(TOTAL_2022)!;
    const before = total.globalStartMs - 86_400_000;
    expect(nextLunarEclipseAfter(before)?.id).toBe(total.id);
    const t0 = performance.now();
    for (let i = 0; i < 1000; i += 1) {
      activeLunarEclipseAt(before + i * 3_600_000);
    }
    expect(performance.now() - t0).toBeLessThan(50);
    const hit = lunarEclipsesIntersecting(before, total.globalEndMs);
    expect(hit.some((e) => e.id === total.id)).toBe(true);
  });
});

describe("lunar Earth-shadow geometry", () => {
  it("matches catalog magnitudes at greatest eclipse and distinguishes total from partial", () => {
    const total = getLunarEclipseEventById(TOTAL_2022)!;
    const g = lunarEclipseGeometryAt(total, total.greatestEclipseUtcMs);
    expect(g.phase).toBe("total-umbral");
    expect(g.penumbralMagnitude).toBeCloseTo(2.3726, 3);
    expect(g.umbralMagnitude).toBeCloseTo(1.4137, 3);
    expect(g.axisDistanceEarthRadii).toBeCloseTo(Math.abs(total.gamma), 5);

    const partial = getLunarEclipseEventById(PARTIAL_2008)!;
    const pg = lunarEclipseGeometryAt(partial, partial.greatestEclipseUtcMs);
    expect(pg.phase).toBe("partial-umbral");
    expect(pg.umbralMagnitude).toBeCloseTo(0.8076, 3);
    expect(pg.umbralMagnitude).toBeLessThan(1);
  });

  it("evolves phase through contacts within one minute of NASA duration-symmetry times", () => {
    const e = getLunarEclipseEventById(TOTAL_2022)!;
    const beforeP1 = lunarEclipseGeometryAt(e, e.p1UtcMs! - 2 * MINUTE_MS);
    expect(beforeP1.phase).toBe("none");
    const afterP1 = lunarEclipseGeometryAt(e, e.p1UtcMs! + 2 * MINUTE_MS);
    expect(afterP1.phase).toBe("penumbral");
    const afterU1 = lunarEclipseGeometryAt(e, e.u1UtcMs! + 2 * MINUTE_MS);
    expect(afterU1.phase).toBe("partial-umbral");
    const afterU2 = lunarEclipseGeometryAt(e, e.u2UtcMs! + 2 * MINUTE_MS);
    expect(afterU2.phase).toBe("total-umbral");
    const afterU3 = lunarEclipseGeometryAt(e, e.u3UtcMs! + 2 * MINUTE_MS);
    expect(afterU3.phase).toBe("partial-umbral");
    const afterU4 = lunarEclipseGeometryAt(e, e.u4UtcMs! + 2 * MINUTE_MS);
    expect(afterU4.phase).toBe("penumbral");
    const afterP4 = lunarEclipseGeometryAt(e, e.p4UtcMs! + 2 * MINUTE_MS);
    expect(afterP4.phase).toBe("none");

    const nearU1 = lunarEclipseGeometryAt(e, e.u1UtcMs!);
    expect(["penumbral", "partial-umbral"]).toContain(nearU1.phase);
    const nearU2 = lunarEclipseGeometryAt(e, e.u2UtcMs!);
    expect(["partial-umbral", "total-umbral"]).toContain(nearU2.phase);
  });

  it("does not treat 2008 partial as totality at greatest eclipse", () => {
    const e = getLunarEclipseEventById(PARTIAL_2008)!;
    const g = lunarEclipseGeometryAt(e, e.greatestEclipseUtcMs);
    expect(g.phase).toBe("partial-umbral");
    const afterU1 = lunarEclipseGeometryAt(e, e.u1UtcMs! + MINUTE_MS);
    expect(afterU1.phase).toBe("partial-umbral");
    const midPen = lunarEclipseGeometryAt(e, (e.p1UtcMs! + e.u1UtcMs!) / 2);
    expect(midPen.phase).toBe("penumbral");
  });
});
