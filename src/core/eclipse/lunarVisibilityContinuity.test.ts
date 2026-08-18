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
import { lunarHorizonBoundaryPolylines } from "./lunarVisibilityGeometry";
import { createTimeContext } from "../time";
import { sublunarPoint } from "../sublunarPoint";
import { subsolarPoint } from "../subsolarPoint";
import { createLunarEclipseLayer } from "../../layers/lunarEclipseLayer";
import {
  isEquirectRegionOverlayPayload,
  type EquirectRegionOverlayPayload,
} from "../../layers/equirectRegionPayload";
import { equirectRingToPathDescriptors } from "../../renderer/renderPlan/equirectSeamRegion";

const TOTAL_2029 = "nasa-5mcle-lunar-9716";
const HORIZON_7D = 7 * 86_400_000;
const VIEW_W = 360;
const VIEW_H = 180;

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
  const fill = payload.fills[0];
  const stroke = payload.strokes[0];
  const ring0 = fill?.ring[0];
  const descriptors = fill
    ? equirectRingToPathDescriptors(fill.ring, VIEW_W, VIEW_H, {
        polarCloseLatDeg: fill.polarCloseLatDeg,
      })
    : [];
  return {
    utcMs,
    moon,
    fillCount: payload.fills.length,
    strokeCount: payload.strokes.length,
    fillStyle: fill?.fill,
    strokeStyle: stroke?.stroke,
    copyCount: descriptors.length,
    polarCloseLatDeg: fill?.polarCloseLatDeg,
    ring0,
    stroke0: stroke?.points[0],
    labelLat: payload.labels?.[0]?.latDeg,
    labelLon: payload.labels?.[0]?.lonDeg,
  };
}

describe("lunar visibility continuity (LIB-044)", () => {
  const event = getLunarEclipseEventById(TOTAL_2029)!;
  const p1 = event.p1UtcMs!;

  it("uses current-instant visibility for upcoming and active, with no family switch at P1", () => {
    const offsets = [
      -10 * 60_000, -5 * 60_000, -60_000, -10_000, -1000, 0, 1000, 10_000, 60_000, 5 * 60_000,
      10 * 60_000,
    ];
    const rows = offsets.map((dt) => snapshot(p1 + dt));
    for (const row of rows) {
      expect(row.fillCount).toBe(1);
      expect(row.strokeCount).toBe(1);
      expect(row.fillStyle).toBe(rows[0]!.fillStyle);
      expect(row.strokeStyle).toBe(rows[0]!.strokeStyle);
      expect(row.copyCount).toBeGreaterThan(0);
      expect(row.copyCount).toBeLessThanOrEqual(2);
      expect(row.polarCloseLatDeg).toBe(row.moon.latDeg >= 0 ? 90 : -90);
      expect(row.labelLat).toBeCloseTo(row.moon.latDeg, 5);
      expect(row.labelLon).toBeCloseTo(row.moon.lonDeg, 5);
      expect(row.ring0).toBeDefined();
      expect(Math.abs(wrapLonDelta(row.ring0!.lonDeg, row.moon.lonDeg - 180))).toBeLessThan(2);
    }
    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1]!;
      const cur = rows[i]!;
      expect(Math.abs(cur.moon.latDeg - prev.moon.latDeg)).toBeLessThan(0.4);
      expect(Math.abs(wrapLonDelta(cur.moon.lonDeg, prev.moon.lonDeg))).toBeLessThan(2);
      expect(Math.abs(wrapLonDelta(cur.ring0!.lonDeg, prev.ring0!.lonDeg))).toBeLessThan(2);
      expect(cur.fillCount).toBe(prev.fillCount);
      expect(cur.strokeCount).toBe(prev.strokeCount);
    }
  });

  it("keeps one-second pre/post activation geography proportional to celestial motion", () => {
    const before = snapshot(p1 - 1000);
    const after = snapshot(p1 + 1000);
    expect(before.fillCount).toBe(after.fillCount);
    expect(before.strokeCount).toBe(after.strokeCount);
    expect(before.fillStyle).toBe(after.fillStyle);
    expect(before.strokeStyle).toBe(after.strokeStyle);
    expect(Math.abs(after.moon.latDeg - before.moon.latDeg)).toBeLessThan(0.01);
    expect(Math.abs(wrapLonDelta(after.moon.lonDeg, before.moon.lonDeg))).toBeLessThan(0.02);
    expect(Math.abs(wrapLonDelta(after.ring0!.lonDeg, before.ring0!.lonDeg))).toBeLessThan(0.05);
    const ge = snapshot(event.greatestEclipseUtcMs);
    expect(Math.abs(wrapLonDelta(before.moon.lonDeg, ge.moon.lonDeg))).toBeGreaterThan(1);
  });

  it("moves the upcoming map boundary with the Moon, not a frozen GE hemisphere", () => {
    const a = snapshot(p1 - 2 * 3_600_000);
    const b = snapshot(p1 - 1 * 3_600_000);
    expect(a.fillCount).toBe(1);
    expect(b.fillCount).toBe(1);
    expect(Math.abs(wrapLonDelta(b.moon.lonDeg, a.moon.lonDeg))).toBeGreaterThan(0.3);
    expect(Math.abs(wrapLonDelta(b.ring0!.lonDeg, a.ring0!.lonDeg))).toBeGreaterThan(0.3);
    const geLon = event.zenithLonDeg;
    expect(Math.abs(wrapLonDelta(a.moon.lonDeg, geLon))).toBeGreaterThan(5);
  });

  it("does not emit a separate global lunar alignment primitive", () => {
    const utc = event.greatestEclipseUtcMs;
    const payload = layerPayload(utc);
    const moon = sublunarPoint(utc);
    const horizon = lunarHorizonBoundaryPolylines(moon.latDeg, moon.lonDeg);
    expect(payload.strokes.length).toBe(horizon.length);
    expect(payload.fills.length).toBe(1);
    const view = buildEclipseAlignmentPresentation({
      frame: resolveEclipseFrame(utc, { lunarHorizonMs: HORIZON_7D }),
      alignment: normalizeEclipseAlignmentPresentation(undefined),
      solarLayerEnabled: true,
      lunarLayerEnabled: true,
      subsolar: subsolarPoint(utc),
      sublunar: moon,
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

  it("keeps a dateline-centered current-instant boundary in one family", () => {
    const utc = Date.parse("2015-04-04T10:00:00.000Z");
    const row = snapshot(utc);
    expect(row.fillCount).toBe(1);
    expect(row.strokeCount).toBeGreaterThan(0);
    expect(row.copyCount).toBeGreaterThan(0);
    expect(Math.abs(Math.abs(row.moon.lonDeg) - 180)).toBeLessThan(80);
  });
});
