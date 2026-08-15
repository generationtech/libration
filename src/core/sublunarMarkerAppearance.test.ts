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
  DEFAULT_LIBRATION_INDICATOR_COLOR,
  DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  librationDisplayOffsetPx,
  librationRingRadiusPx,
  librationStrokeWidthPx,
  normalizeSublunarMarkerAppearance,
  sublunarMarkerRadiusPx,
} from "./sublunarMarkerAppearance";

describe("sublunarMarkerAppearance", () => {
  it("defaults size to current/normal and libration on in ring mode", () => {
    expect(normalizeSublunarMarkerAppearance(undefined)).toEqual(DEFAULT_SUBLUNAR_MARKER_APPEARANCE);
    expect(DEFAULT_SUBLUNAR_MARKER_APPEARANCE.size).toBe("normal");
    expect(DEFAULT_SUBLUNAR_MARKER_APPEARANCE.librationEnabled).toBe(true);
    expect(DEFAULT_SUBLUNAR_MARKER_APPEARANCE.librationStyle).toBe("ring");
    expect(DEFAULT_SUBLUNAR_MARKER_APPEARANCE.librationColor).toBe(DEFAULT_LIBRATION_INDICATOR_COLOR);
  });

  it("preserves current Moon radius at size normal", () => {
    expect(sublunarMarkerRadiusPx(1888, "normal")).toBe(7.5);
    expect(sublunarMarkerRadiusPx(400, "normal")).toBe(3.8);
    expect(sublunarMarkerRadiusPx(1888, "small")).toBeLessThan(7.5);
    expect(sublunarMarkerRadiusPx(1888, "large")).toBeGreaterThan(7.5);
  });

  it("maps +longitude east and +latitude north, and keeps the mark inside the disc", () => {
    const r = 7.5;
    const markR = librationRingRadiusPx(r);
    const stroke = librationStrokeWidthPx(r, "normal");
    const east = librationDisplayOffsetPx({
      longitudeDeg: 8,
      latitudeDeg: 0,
      moonRadiusPx: r,
      markRadiusPx: markR,
      strokeWidthPx: stroke,
    });
    const north = librationDisplayOffsetPx({
      longitudeDeg: 0,
      latitudeDeg: 6.9,
      moonRadiusPx: r,
      markRadiusPx: markR,
      strokeWidthPx: stroke,
    });
    const zero = librationDisplayOffsetPx({
      longitudeDeg: 0,
      latitudeDeg: 0,
      moonRadiusPx: r,
      markRadiusPx: markR,
      strokeWidthPx: stroke,
    });
    expect(zero.dxPx).toBeCloseTo(0, 10);
    expect(zero.dyPx).toBeCloseTo(0, 10);
    expect(east.dxPx).toBeGreaterThan(0);
    expect(east.dyPx).toBeCloseTo(0, 10);
    expect(north.dxPx).toBeCloseTo(0, 10);
    expect(north.dyPx).toBeLessThan(0);
    const extreme = librationDisplayOffsetPx({
      longitudeDeg: 20,
      latitudeDeg: 20,
      moonRadiusPx: r,
      motionScale: "enhanced",
      markRadiusPx: markR,
      strokeWidthPx: stroke,
    });
    expect(Math.hypot(extreme.dxPx, extreme.dyPx) + markR + stroke * 0.5).toBeLessThanOrEqual(r);
  });

  it("treats motion scale as display amplification only", () => {
    const r = 7.5;
    const markR = librationRingRadiusPx(r);
    const stroke = librationStrokeWidthPx(r, "normal");
    const subtle = librationDisplayOffsetPx({
      longitudeDeg: 4,
      latitudeDeg: 0,
      moonRadiusPx: r,
      motionScale: "subtle",
      markRadiusPx: markR,
      strokeWidthPx: stroke,
    });
    const enhanced = librationDisplayOffsetPx({
      longitudeDeg: 4,
      latitudeDeg: 0,
      moonRadiusPx: r,
      motionScale: "enhanced",
      markRadiusPx: markR,
      strokeWidthPx: stroke,
    });
    expect(enhanced.dxPx).toBeGreaterThan(subtle.dxPx);
  });
});
