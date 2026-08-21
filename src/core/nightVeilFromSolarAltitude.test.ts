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

import { afterEach, describe, expect, it } from "vitest";
import { NIGHT_DARKEN, sampleIlluminationRgba8 } from "../renderer/illuminationShading";
import { moonlightNightEligibilityFromSolarAltitude } from "./lunarIllumination";
import { subsolarPoint } from "./subsolarPoint";
import { solarAltitudeDegFromSurfaceSunDotProduct } from "./solarTwilight";
import {
  getActiveNightVeilTransferId,
  illuminationNightVeil01FromSolarAltitudeDeg,
  ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG,
  ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG,
  NIGHT_VEIL_TRANSFER_IDS,
  nightVeil01ForTransfer,
  parseNightVeilTransferId,
  PRODUCTION_NIGHT_VEIL_TRANSFER_ID,
  setDevNightVeilTransferOverride,
  type NightVeilTransferId,
} from "./nightVeilFromSolarAltitude";

const ANCHORS_DEG = [4, 0, -6, -12, -18] as const;
const KNOXVILLE_LAT_DEG = 35.9606;
const ALPHA_SCALE = NIGHT_DARKEN * 255;

afterEach(() => {
  setDevNightVeilTransferOverride(null);
});

function overlayAlphaFromVeil(veil01: number): number {
  return veil01 * ALPHA_SCALE;
}

function numericalSlopePerDeg(id: NightVeilTransferId, altitudeDeg: number, h = 0.05): number {
  const a = nightVeil01ForTransfer(id, altitudeDeg - h);
  const b = nightVeil01ForTransfer(id, altitudeDeg + h);
  return (a - b) / (2 * h);
}

function altitudeForOverlayAlpha(id: NightVeilTransferId, alpha: number): number | null {
  const target = alpha / ALPHA_SCALE;
  if (target <= 0) {
    return ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG;
  }
  if (target >= 1) {
    return ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG;
  }
  let lo = ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG;
  let hi = ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (nightVeil01ForTransfer(id, mid) < target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

function maxSlope(id: NightVeilTransferId): { altitudeDeg: number; slopePerDeg: number } {
  let bestAlt = 0;
  let bestSlope = -Infinity;
  for (let alt = ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG; alt >= ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG; alt -= 0.05) {
    const s = numericalSlopePerDeg(id, alt);
    if (s > bestSlope) {
      bestSlope = s;
      bestAlt = alt;
    }
  }
  return { altitudeDeg: bestAlt, slopePerDeg: bestSlope };
}

function surfaceDot(latDeg: number, lonDeg: number, subLatDeg: number, subLonDeg: number): number {
  const phi = (latDeg * Math.PI) / 180;
  const lam = (lonDeg * Math.PI) / 180;
  const sPhi = (subLatDeg * Math.PI) / 180;
  const sLam = (subLonDeg * Math.PI) / 180;
  return Math.cos(phi) * Math.cos(sPhi) * Math.cos(lam - sLam) + Math.sin(phi) * Math.sin(sPhi);
}

describe("parseNightVeilTransferId", () => {
  it("accepts documented ids and the current alias", () => {
    expect(parseNightVeilTransferId("smootherstep")).toBe("smootherstep");
    expect(parseNightVeilTransferId("current")).toBe("smootherstep");
    expect(parseNightVeilTransferId("linearSmooth")).toBe("linearSmooth");
    expect(parseNightVeilTransferId("twilightAnchored")).toBe("twilightAnchored");
    expect(parseNightVeilTransferId("smoothstep")).toBe("smoothstep");
    expect(parseNightVeilTransferId("nope")).toBeNull();
    expect(parseNightVeilTransferId(null)).toBeNull();
  });
});

describe("DEV night-veil override", () => {
  it("defaults to the production transfer and restores after clear", () => {
    expect(PRODUCTION_NIGHT_VEIL_TRANSFER_ID).toBe("twilightAnchored");
    expect(getActiveNightVeilTransferId()).toBe("twilightAnchored");
    setDevNightVeilTransferOverride("linearSmooth");
    expect(getActiveNightVeilTransferId()).toBe("linearSmooth");
    expect(illuminationNightVeil01FromSolarAltitudeDeg(-7)).toBeCloseTo(
      nightVeil01ForTransfer("linearSmooth", -7),
      12,
    );
    setDevNightVeilTransferOverride(null);
    expect(illuminationNightVeil01FromSolarAltitudeDeg(-7)).toBeCloseTo(
      nightVeil01ForTransfer("twilightAnchored", -7),
      12,
    );
  });

  it("uses twilight-semantic factory anchors", () => {
    expect(illuminationNightVeil01FromSolarAltitudeDeg(4)).toBe(0);
    expect(illuminationNightVeil01FromSolarAltitudeDeg(0)).toBeCloseTo(0.1, 5);
    expect(illuminationNightVeil01FromSolarAltitudeDeg(-6)).toBeCloseTo(0.32, 5);
    expect(illuminationNightVeil01FromSolarAltitudeDeg(-12)).toBeCloseTo(0.7, 5);
    expect(illuminationNightVeil01FromSolarAltitudeDeg(-18)).toBe(1);
  });
});

describe.each(NIGHT_VEIL_TRANSFER_IDS)("nightVeil01ForTransfer(%s)", (id) => {
  it("is exactly 0 at +4° and 1 at −18°, and stays there outside the interval", () => {
    expect(nightVeil01ForTransfer(id, ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG)).toBe(0);
    expect(nightVeil01ForTransfer(id, ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG)).toBe(1);
    expect(nightVeil01ForTransfer(id, 45)).toBe(0);
    expect(nightVeil01ForTransfer(id, 4.01)).toBe(0);
    expect(nightVeil01ForTransfer(id, -18.01)).toBe(1);
    expect(nightVeil01ForTransfer(id, -90)).toBe(1);
  });

  it("is monotonic non-decreasing as solar altitude falls", () => {
    let prev = nightVeil01ForTransfer(id, 10);
    for (let alt = 9.75; alt >= -30; alt -= 0.25) {
      const next = nightVeil01ForTransfer(id, alt);
      expect(next).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = next;
    }
  });

  it("is C0 continuous across twilight with small altitude steps", () => {
    let prev = nightVeil01ForTransfer(id, 4);
    for (let alt = 3.95; alt >= -18; alt -= 0.05) {
      const next = nightVeil01ForTransfer(id, alt);
      expect(Math.abs(next - prev)).toBeLessThan(0.02);
      prev = next;
    }
  });

  it("has no visible seam at civil / nautical / astronomical anchors", () => {
    for (const boundary of [0, -6, -12, -18]) {
      const a = nightVeil01ForTransfer(id, boundary + 0.05);
      const b = nightVeil01ForTransfer(id, boundary);
      const c = nightVeil01ForTransfer(id, boundary - 0.05);
      expect(Math.abs(b - a)).toBeLessThan(0.02);
      expect(Math.abs(c - b)).toBeLessThan(0.02);
    }
  });

  it("maps to full-night overlay alpha and clear day-side overlay", () => {
    expect(overlayAlphaFromVeil(nightVeil01ForTransfer(id, 8))).toBe(0);
    expect(overlayAlphaFromVeil(nightVeil01ForTransfer(id, -40))).toBeCloseTo(ALPHA_SCALE, 10);
    const sampled = sampleIlluminationRgba8(Math.sin((-40 * Math.PI) / 180), 1);
    setDevNightVeilTransferOverride(id);
    const withOverride = sampleIlluminationRgba8(Math.sin((-40 * Math.PI) / 180), 1);
    expect(withOverride.a).toBe(Math.round(NIGHT_DARKEN * 255));
    expect(sampled.a).toBe(Math.round(NIGHT_DARKEN * 255));
  });
});

describe("historical smootherstep baseline", () => {
  it("matches the documented scientific anchors and concentrates slope near −7°", () => {
    const id: NightVeilTransferId = "smootherstep";
    expect(nightVeil01ForTransfer(id, 4)).toBe(0);
    expect(nightVeil01ForTransfer(id, 0)).toBeCloseTo(0.0447, 3);
    expect(nightVeil01ForTransfer(id, -6)).toBeCloseTo(0.416, 2);
    expect(nightVeil01ForTransfer(id, -12)).toBeGreaterThan(0.85);
    expect(nightVeil01ForTransfer(id, -18)).toBe(1);
    const peak = maxSlope(id);
    expect(peak.altitudeDeg).toBeCloseTo(-7, 0);
    expect(peak.slopePerDeg).toBeGreaterThan(0.08);
  });
});

describe("LIB-056 candidate comparison", () => {
  it("records alpha, slope, 20→80 / 20→120 spans, and peak-slope altitude for every candidate", () => {
    const rows = NIGHT_VEIL_TRANSFER_IDS.map((id) => {
      const peak = maxSlope(id);
      const a20 = altitudeForOverlayAlpha(id, 20);
      const a80 = altitudeForOverlayAlpha(id, 80);
      const a120 = altitudeForOverlayAlpha(id, 120);
      expect(a20).not.toBeNull();
      expect(a80).not.toBeNull();
      expect(a120).not.toBeNull();
      const span2080 = (a20 as number) - (a80 as number);
      const span20120 = (a20 as number) - (a120 as number);
      const knoxScale = 1 / Math.cos((KNOXVILLE_LAT_DEG * Math.PI) / 180);
      return {
        id,
        veilAt: Object.fromEntries(
          ANCHORS_DEG.map((alt) => [String(alt), nightVeil01ForTransfer(id, alt)]),
        ),
        alphaAt: Object.fromEntries(
          ANCHORS_DEG.map((alt) => [String(alt), overlayAlphaFromVeil(nightVeil01ForTransfer(id, alt))]),
        ),
        peakAltitudeDeg: peak.altitudeDeg,
        peakSlopePerDeg: peak.slopePerDeg,
        span2080AltDeg: span2080,
        span20120AltDeg: span20120,
        span2080EquatorLonDeg: span2080,
        span2080KnoxLonDeg: span2080 * knoxScale,
        span20120EquatorLonDeg: span20120,
        span20120KnoxLonDeg: span20120 * knoxScale,
        fullNightAlpha: overlayAlphaFromVeil(1),
      };
    });

    const current = rows.find((r) => r.id === "smootherstep")!;
    const linear = rows.find((r) => r.id === "linearSmooth")!;
    const piecewise = rows.find((r) => r.id === "twilightAnchored")!;
    const cubic = rows.find((r) => r.id === "smoothstep")!;

    expect(current.fullNightAlpha).toBeCloseTo(158.1, 1);
    expect(linear.span2080AltDeg).toBeGreaterThan(current.span2080AltDeg);
    expect(piecewise.span2080AltDeg).toBeGreaterThan(current.span2080AltDeg * 0.9);
    expect(cubic.peakSlopePerDeg).toBeLessThan(current.peakSlopePerDeg);
    expect(Math.abs(linear.peakAltitudeDeg - -7)).toBeGreaterThan(1.5);
    expect(current.peakAltitudeDeg).toBeCloseTo(-7, 0);
  });

  it("keeps candidate C1 slope continuous at twilight knots for twilightAnchored", () => {
    for (const knot of [0, -6, -12]) {
      const left = numericalSlopePerDeg("twilightAnchored", knot - 0.02, 0.02);
      const right = numericalSlopePerDeg("twilightAnchored", knot + 0.02, 0.02);
      expect(Math.abs(left - right)).toBeLessThan(0.015);
    }
  });
});

describe("temporal continuity at a fixed geographic probe", () => {
  it("changes veil smoothly as Earth rotates for every candidate", () => {
    const t0 = Date.parse("2026-09-09T03:53:00.000Z");
    const lat = KNOXVILLE_LAT_DEG;
    const lon = -83.9207;
    for (const id of NIGHT_VEIL_TRANSFER_IDS) {
      let prev: number | null = null;
      for (let step = 0; step <= 40; step++) {
        const utc = t0 + step * 60_000;
        const sub = subsolarPoint(utc);
        const alt = solarAltitudeDegFromSurfaceSunDotProduct(surfaceDot(lat, lon, sub.latDeg, sub.lonDeg));
        const veil = nightVeil01ForTransfer(id, alt);
        if (prev !== null) {
          expect(Math.abs(veil - prev)).toBeLessThan(0.04);
        }
        prev = veil;
      }
    }
  });
});

describe("moonlight gate interaction", () => {
  it("does not enable moonlight before solar altitude −6° for any candidate", () => {
    expect(moonlightNightEligibilityFromSolarAltitude(-5.9)).toBe(0);
    for (const id of NIGHT_VEIL_TRANSFER_IDS) {
      const veilGate = nightVeil01ForTransfer(id, -5.9);
      expect(veilGate).toBeGreaterThan(0);
      expect(moonlightNightEligibilityFromSolarAltitude(-5.9) * veilGate).toBe(0);
    }
  });

  it("does not create a steeper twilight-to-moonlit handoff than current at −6° → −14°", () => {
    const currentDelta =
      nightVeil01ForTransfer("smootherstep", -6) - nightVeil01ForTransfer("smootherstep", -14);
    for (const id of NIGHT_VEIL_TRANSFER_IDS) {
      const delta = nightVeil01ForTransfer(id, -6) - nightVeil01ForTransfer(id, -14);
      expect(Math.abs(delta)).toBeLessThanOrEqual(Math.abs(currentDelta) + 0.08);
    }
  });
});
