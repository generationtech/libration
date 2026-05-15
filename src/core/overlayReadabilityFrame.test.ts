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
  combineReadabilityVeil01,
  computeEmissiveLegibilityPressure01,
  computeOverlayReadabilityFrameFromTimeMs,
  getOverlayReadabilityFrameOrCompute,
  type OverlayReadabilityFrame,
} from "./overlayReadabilityFrame";
import { subsolarPoint } from "./subsolarPoint";

describe("computeEmissiveLegibilityPressure01", () => {
  it("returns zero when mode is off or input missing", () => {
    expect(computeEmissiveLegibilityPressure01(undefined)).toBe(0);
    expect(computeEmissiveLegibilityPressure01({ mode: "off" })).toBe(0);
  });

  it("ranks illustrative >= enhanced >= natural at equal presentation", () => {
    const p = { presentationIntensity: 2, presentationDriverExponent: 0.35 };
    const n = computeEmissiveLegibilityPressure01({ mode: "natural", ...p });
    const e = computeEmissiveLegibilityPressure01({ mode: "enhanced", ...p });
    const i = computeEmissiveLegibilityPressure01({ mode: "illustrative", ...p });
    expect(n).toBeGreaterThan(0);
    expect(e).toBeGreaterThanOrEqual(n);
    expect(i).toBeGreaterThanOrEqual(e);
    expect(i).toBeLessThanOrEqual(1);
  });
});

describe("combineReadabilityVeil01", () => {
  it("is identity when emissive pressure is zero", () => {
    expect(combineReadabilityVeil01(0.6, 0)).toBe(0.6);
  });

  it("weakly lifts high solar veils when pressure is positive", () => {
    const base = 0.7;
    const boosted = combineReadabilityVeil01(base, 0.55);
    expect(boosted).toBeGreaterThan(base);
    expect(boosted).toBeLessThanOrEqual(1);
  });
});

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

  it("with emissive policy, globalReadabilityVeil01 is >= globalNightVeil01", () => {
    const t = Date.UTC(2020, 0, 1, 0, 0, 0, 0);
    const base = computeOverlayReadabilityFrameFromTimeMs(t);
    const withEmissive = computeOverlayReadabilityFrameFromTimeMs(t, {
      mode: "illustrative",
      presentationIntensity: 2,
      presentationDriverExponent: 0.35,
    });
    expect(withEmissive.globalEmissiveLegibilityPressure01).toBeGreaterThan(0);
    expect(withEmissive.globalReadabilityVeil01).toBeGreaterThanOrEqual(base.globalNightVeil01);
    expect(withEmissive.globalReadabilityVeil01).toBeGreaterThanOrEqual(withEmissive.globalNightVeil01);
  });

  it("readabilityVeil01At matches nightVeil01At when emissive is off", () => {
    const t = Date.UTC(2024, 5, 15, 12, 0, 0, 0);
    const frame = computeOverlayReadabilityFrameFromTimeMs(t, { mode: "off" });
    expect(frame.globalEmissiveLegibilityPressure01).toBe(0);
    expect(frame.readabilityVeil01At(12, -77)).toBeCloseTo(frame.nightVeil01At(12, -77), 10);
  });
});

describe("getOverlayReadabilityFrameOrCompute", () => {
  it("returns the injected frame without consulting now", () => {
    const injected: OverlayReadabilityFrame = {
      globalNightVeil01: 0.42,
      globalEmissiveLegibilityPressure01: 0.1,
      globalReadabilityVeil01: 0.5,
      nightVeil01At: () => 0.99,
      readabilityVeil01At: () => 0.99,
    };
    const got = getOverlayReadabilityFrameOrCompute({
      now: Date.UTC(2024, 5, 15, 12, 0, 0, 0),
      overlayReadabilityFrame: injected,
    });
    expect(got).toBe(injected);
    expect(got.globalNightVeil01).toBe(0.42);
    expect(got.nightVeil01At(0, 0)).toBe(0.99);
  });

  it("computes from now when no frame is attached", () => {
    const t = Date.UTC(2024, 5, 15, 12, 0, 0, 0);
    const a = computeOverlayReadabilityFrameFromTimeMs(t);
    const b = getOverlayReadabilityFrameOrCompute({ now: t });
    expect(b.globalNightVeil01).toBeCloseTo(a.globalNightVeil01, 10);
  });
});
