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
import { subsolarPoint } from "./subsolarPoint";
import { computeOverlayReadabilityFrameFromTimeMs } from "./overlayReadabilityFrame";

describe("computeOverlayReadabilityFrameFromTimeMs", () => {
  it("returns subsolar-consistent zero veil at the subsolar surface point", () => {
    const t = Date.UTC(2024, 5, 15, 12, 0, 0, 0);
    const frame = computeOverlayReadabilityFrameFromTimeMs(t);
    const sub = subsolarPoint(t);
    const local = frame.nightVeil01At(sub.latDeg, sub.lonDeg);
    expect(local).toBeGreaterThanOrEqual(0);
    expect(local).toBeLessThanOrEqual(0.05);
  });

  it("returns high local veil on the opposite side of Earth from the subsolar point", () => {
    const t = Date.UTC(2024, 5, 15, 12, 0, 0, 0);
    const frame = computeOverlayReadabilityFrameFromTimeMs(t);
    const sub = subsolarPoint(t);
    const antiLat = -sub.latDeg;
    let antiLon = sub.lonDeg + 180;
    if (antiLon > 180) antiLon -= 360;
    if (antiLon < -180) antiLon += 360;
    const v = frame.nightVeil01At(antiLat, antiLon);
    expect(v).toBeGreaterThan(0.85);
  });

  it("exposes globalNightVeil01 in the unit interval", () => {
    const frame = computeOverlayReadabilityFrameFromTimeMs(Date.UTC(2020, 0, 1, 0, 0, 0, 0));
    expect(frame.globalNightVeil01).toBeGreaterThanOrEqual(0);
    expect(frame.globalNightVeil01).toBeLessThanOrEqual(1);
  });
});
