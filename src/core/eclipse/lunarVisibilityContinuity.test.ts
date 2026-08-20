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
import { buildEclipseAlignmentPresentation } from "./eclipseAlignmentPresentation";
import { normalizeEclipseAlignmentPresentation } from "./eclipseAlignmentAppearance";
import { resolveEclipseFrame } from "./eclipseEventService";
import { createTimeContext } from "../time";
import { sublunarPoint } from "../sublunarPoint";
import { subsolarPoint } from "../subsolarPoint";
import { createLunarEclipseLayer } from "../../layers/lunarEclipseLayer";
import {
  isEquirectRegionOverlayPayload,
  type EquirectRegionOverlayPayload,
} from "../../layers/equirectRegionPayload";

const TOTAL_2029 = "nasa-5mcle-lunar-9716";
const HORIZON_7D = 7 * 86_400_000;

function wrapLonDelta(a: number, b: number): number {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function layerPayload(utcMs: number): EquirectRegionOverlayPayload {
  const frame = resolveEclipseFrame(utcMs, { lunarHorizonMs: HORIZON_7D });
  const st = createLunarEclipseLayer({
    presentation: { forecastHorizonDays: 7 },
    alignment: { enabled: true, lunarEnabled: true },
    labelsEnabled: true,
  }).getState(createTimeContext(utcMs, 0, true, { eclipseFrame: frame }));
  if (!isEquirectRegionOverlayPayload(st.data)) {
    throw new Error("expected lunar equirect overlay");
  }
  return st.data;
}

function snapshot(utcMs: number) {
  const moon = sublunarPoint(utcMs);
  const payload = layerPayload(utcMs);
  return {
    utcMs,
    moon,
    fillCount: payload.fills.length,
    strokeCount: payload.strokes.length,
    labelLat: payload.labels?.[0]?.latDeg,
    labelLon: payload.labels?.[0]?.lonDeg,
    labelPathHints: payload.labelPathHints,
  };
}

describe("lunar visibility continuity (LIB-046 / LIB-054)", () => {
  const event = getLunarEclipseEventById(TOTAL_2029)!;
  const p1 = event.p1UtcMs!;

  it("emits no Moon-visible fill; footprint stroke is static through P1", () => {
    const offsets = [
      -10 * 60_000, -5 * 60_000, -60_000, -10_000, -1000, 0, 1000, 10_000, 60_000, 5 * 60_000,
      10 * 60_000,
    ];
    const rows = offsets.map((dt) => snapshot(p1 + dt));
    const firstStroke = layerPayload(p1 - 10 * 60_000).strokes[0]?.points;
    expect(firstStroke?.length).toBeGreaterThan(8);
    for (const row of rows) {
      expect(row.fillCount).toBe(0);
      expect(row.strokeCount).toBe(1);
      expect(row.labelPathHints).toBeUndefined();
      expect(row.labelLat).toBeCloseTo(row.moon.latDeg, 5);
      expect(row.labelLon).toBeCloseTo(row.moon.lonDeg, 5);
      expect(layerPayload(row.utcMs).strokes[0]!.points).toEqual(firstStroke);
    }
    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1]!;
      const cur = rows[i]!;
      expect(Math.abs(cur.moon.latDeg - prev.moon.latDeg)).toBeLessThan(0.4);
      expect(Math.abs(wrapLonDelta(cur.moon.lonDeg, prev.moon.lonDeg))).toBeLessThan(2);
    }
  });

  it("keeps one-second pre/post activation Moon motion proportional to celestial motion", () => {
    const before = snapshot(p1 - 1000);
    const after = snapshot(p1 + 1000);
    expect(before.fillCount).toBe(0);
    expect(after.fillCount).toBe(0);
    expect(before.strokeCount).toBe(1);
    expect(after.strokeCount).toBe(1);
    expect(layerPayload(p1 - 1000).strokes[0]!.points).toEqual(layerPayload(p1 + 1000).strokes[0]!.points);
    expect(Math.abs(after.moon.latDeg - before.moon.latDeg)).toBeLessThan(0.01);
    expect(Math.abs(wrapLonDelta(after.moon.lonDeg, before.moon.lonDeg))).toBeLessThan(0.02);
    const ge = snapshot(event.greatestEclipseUtcMs);
    expect(Math.abs(wrapLonDelta(before.moon.lonDeg, ge.moon.lonDeg))).toBeGreaterThan(1);
  });

  it("moves the upcoming Moon with product time, not a frozen GE hemisphere", () => {
    const a = snapshot(p1 - 2 * 3_600_000);
    const b = snapshot(p1 - 1 * 3_600_000);
    expect(a.fillCount).toBe(0);
    expect(b.fillCount).toBe(0);
    expect(Math.abs(wrapLonDelta(b.moon.lonDeg, a.moon.lonDeg))).toBeGreaterThan(0.3);
    const geLon = event.zenithLonDeg;
    expect(Math.abs(wrapLonDelta(a.moon.lonDeg, geLon))).toBeGreaterThan(5);
  });

  it("does not emit a global lunar alignment primitive or horizon stroke", () => {
    const utc = event.greatestEclipseUtcMs;
    const payload = layerPayload(utc);
    expect(payload.strokes).toHaveLength(1);
    expect(payload.fills).toHaveLength(0);
    const view = buildEclipseAlignmentPresentation({
      frame: resolveEclipseFrame(utc, { lunarHorizonMs: HORIZON_7D }),
      alignment: normalizeEclipseAlignmentPresentation(undefined),
      solarLayerEnabled: true,
      lunarLayerEnabled: true,
      subsolar: subsolarPoint(utc),
      sublunar: sublunarPoint(utc),
    });
    expect(view.lunar).toBeNull();
    expect(view.solar).toBeNull();
  });

  it("keeps the 2017 solar alignment beam", () => {
    const utc = Date.parse("2017-08-21T18:25:29.700Z");
    const view = buildEclipseAlignmentPresentation({
      frame: resolveEclipseFrame(utc, { horizonMs: 7 * 86_400_000 }),
      alignment: normalizeEclipseAlignmentPresentation(undefined),
      solarLayerEnabled: true,
      lunarLayerEnabled: true,
      subsolar: subsolarPoint(utc),
      sublunar: sublunarPoint(utc),
    });
    expect(view.solar?.kind).toBe("solar-central");
    expect(view.solar?.strokes.length).toBeGreaterThan(0);
    expect(view.lunar).toBeNull();
  });

  it("keeps a dateline-centered event footprint closed without a Moon-visible fill", () => {
    const utc = Date.parse("2015-04-04T10:00:00.000Z");
    const row = snapshot(utc);
    expect(row.fillCount).toBe(0);
    expect(row.strokeCount).toBe(1);
    expect(Math.abs(Math.abs(row.moon.lonDeg) - 180)).toBeLessThan(80);
  });
});
