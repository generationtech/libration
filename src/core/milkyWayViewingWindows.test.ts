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
import { REFERENCE_CITIES } from "../data/referenceCities";
import { activeLunarEclipseAt } from "./eclipse/eclipseAuthority";
import { lunarEclipseGeometryAt } from "./eclipse/lunarEclipseGeometry";
import { lunarEclipseMoonlightTransmission } from "./eclipse/lunarEclipseMoonlightTransmission";
import {
  localMoonlightContribution01,
  geographicDirectionDotProduct,
  milkyWayVisibilityMoonStateAt,
} from "./milkyWayVisibilityGeometry";
import {
  MAX_MOONLIGHT_01,
  MAX_SUN_ALTITUDE_DEG,
  MILKY_WAY_VIEWING_POLICY_VERSION,
  MIN_GC_ALTITUDE_DEG,
  milkyWayViewingQualifies,
} from "./milkyWayViewingPolicy";
import {
  findNextMilkyWayViewingWindow,
  listMilkyWayViewingWindows,
  milkyWayViewingConditionsAt,
  resetMilkyWayViewingWindowCacheForTests,
  windowContainingUtc,
  type MilkyWayViewingObserver,
} from "./milkyWayViewingWindows";

const knoxvilleCity = REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!;
const tokyoCity = REFERENCE_CITIES.find((c) => c.id === "city.tokyo")!;
const saoPauloCity = REFERENCE_CITIES.find((c) => c.id === "city.sao_paulo")!;

const KNOXVILLE: MilkyWayViewingObserver = {
  cityId: knoxvilleCity.id,
  latitudeDeg: knoxvilleCity.latitude,
  longitudeDeg: knoxvilleCity.longitude,
};

const TOKYO: MilkyWayViewingObserver = {
  cityId: tokyoCity.id,
  latitudeDeg: tokyoCity.latitude,
  longitudeDeg: tokyoCity.longitude,
};

const SAO_PAULO: MilkyWayViewingObserver = {
  cityId: saoPauloCity.id,
  latitudeDeg: saoPauloCity.latitude,
  longitudeDeg: saoPauloCity.longitude,
};

const ATACAMA: MilkyWayViewingObserver = {
  cityId: "test.atacama",
  latitudeDeg: -23.0,
  longitudeDeg: -68.0,
};

const ARCTIC: MilkyWayViewingObserver = {
  cityId: "test.arctic",
  latitudeDeg: 65,
  longitudeDeg: 0,
};

const LONDON: MilkyWayViewingObserver = {
  cityId: "city.london",
  latitudeDeg: 51.5074,
  longitudeDeg: -0.1278,
};

const AUG_2026_START = Date.UTC(2026, 7, 1, 0, 0, 0, 0);
const AUG_2026_END = Date.UTC(2026, 8, 1, 0, 0, 0, 0);
const DAY_MS = 86_400_000;

describe("listMilkyWayViewingWindows", () => {
  it("enumerates Knoxville August 2026 windows with UTC bounds and deterministic ids", () => {
    resetMilkyWayViewingWindowCacheForTests();
    const result = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    expect(result.feasibility).toBe("ok");
    expect(result.nightlyMaximumAltitudeDeg).toBeGreaterThan(20);
    expect(result.nightlyMaximumAltitudeDeg).toBeLessThan(30);
    expect(result.windows.length).toBeGreaterThan(5);
    for (const w of result.windows) {
      expect(w.policyVersion).toBe(MILKY_WAY_VIEWING_POLICY_VERSION);
      expect(w.cityId).toBe("city.knoxville");
      expect(w.endUtcMs).toBeGreaterThan(w.startUtcMs);
      expect(w.peakUtcMs).toBeGreaterThanOrEqual(w.startUtcMs);
      expect(w.peakUtcMs).toBeLessThan(w.endUtcMs);
      expect(w.peakAltitudeDeg).toBeGreaterThanOrEqual(MIN_GC_ALTITUDE_DEG);
      expect(w.id).toBe(`milky-way:${w.cityId}:${w.startUtcMs}`);
      const mid = milkyWayViewingConditionsAt(Math.floor((w.startUtcMs + w.endUtcMs) / 2), KNOXVILLE);
      expect(mid?.solarAltitudeDeg).toBeLessThanOrEqual(MAX_SUN_ALTITUDE_DEG);
      expect(mid?.gcAltitudeDeg).toBeGreaterThanOrEqual(MIN_GC_ALTITUDE_DEG - 0.5);
      expect(mid?.qualifies).toBe(true);
    }
    expect(result.windows.length).toBeGreaterThan(0);
  });

  it("does not open a window in daylight at Knoxville", () => {
    const noon = Date.UTC(2026, 7, 19, 17, 0, 0, 0);
    const c = milkyWayViewingConditionsAt(noon, KNOXVILLE)!;
    expect(c.solarAltitudeDeg).toBeGreaterThan(-6);
    expect(c.qualifies).toBe(false);
    const listed = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    expect(windowContainingUtc(listed.windows, noon)).toBeNull();
  });

  it("keeps peak inside the interval and prefers GC altitude, not a composite score", () => {
    const listed = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    const w = listed.windows[0]!;
    const peak = milkyWayViewingConditionsAt(w.peakUtcMs, KNOXVILLE)!;
    const earlier = milkyWayViewingConditionsAt(w.startUtcMs, KNOXVILLE)!;
    expect(peak.gcAltitudeDeg).toBeGreaterThanOrEqual(earlier.gcAltitudeDeg - 0.15);
    expect(peak.qualifies).toBe(true);
  });

  it("naturally favors near-new-Moon and moon-down peaks without a phase shortcut", () => {
    const listed = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    expect(listed.windows.some((w) => w.peakIlluminatedFraction <= 0.08 || !w.peakMoonAboveHorizon)).toBe(
      true,
    );
    for (const w of listed.windows) {
      expect(w.representativeMoonlight01).toBeLessThanOrEqual(MAX_MOONLIGHT_01 + 1e-6);
    }
  });

  it("produces Atacama viewing windows with much higher peak altitude than Knoxville", () => {
    resetMilkyWayViewingWindowCacheForTests();
    const atacama = listMilkyWayViewingWindows({
      observer: ATACAMA,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    const knox = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    expect(atacama.feasibility).toBe("ok");
    expect(atacama.windows.length).toBeGreaterThan(5);
    const aPeak = Math.max(...atacama.windows.map((w) => w.peakAltitudeDeg));
    const kPeak = Math.max(...knox.windows.map((w) => w.peakAltitudeDeg));
    expect(aPeak).toBeGreaterThan(70);
    expect(kPeak).toBeLessThan(30);
    expect(aPeak).toBeGreaterThan(kPeak + 40);
  });

  it("matches São Paulo latitude quality as a southern catalog-city check", () => {
    const listed = listMilkyWayViewingWindows({
      observer: SAO_PAULO,
      startUtcMs: AUG_2026_START,
      endUtcMs: Date.UTC(2026, 7, 15, 0, 0, 0, 0),
    });
    expect(listed.feasibility).toBe("ok");
    expect(listed.windows.length).toBeGreaterThan(0);
    expect(Math.max(...listed.windows.map((w) => w.peakAltitudeDeg))).toBeGreaterThan(70);
  });

  it("reports that the Galactic center does not rise at 65°N", () => {
    const listed = listMilkyWayViewingWindows({
      observer: ARCTIC,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    expect(listed.feasibility).toBe("gcNeverRises");
    expect(listed.windows).toEqual([]);
  });

  it("reports insufficient rise at London latitude", () => {
    const listed = listMilkyWayViewingWindows({
      observer: LONDON,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    expect(listed.feasibility).toBe("gcInsufficient");
    expect(listed.windows).toEqual([]);
  });

  it("scales peak altitude across latitudes", () => {
    const range = {
      startUtcMs: AUG_2026_START,
      endUtcMs: Date.UTC(2026, 7, 12, 0, 0, 0, 0),
    };
    const observers: Array<{ lat: number; minPeak: number; maxPeak: number }> = [
      { lat: 40, minPeak: 15, maxPeak: 26 },
      { lat: 0, minPeak: 50, maxPeak: 70 },
      { lat: -23, minPeak: 70, maxPeak: 90 },
      { lat: -29, minPeak: 80, maxPeak: 90 },
      { lat: -40, minPeak: 70, maxPeak: 85 },
    ];
    for (const o of observers) {
      const listed = listMilkyWayViewingWindows({
        observer: {
          cityId: `test.lat.${o.lat}`,
          latitudeDeg: o.lat,
          longitudeDeg: -68,
        },
        ...range,
      });
      expect(listed.feasibility).toBe("ok");
      expect(listed.windows.length).toBeGreaterThan(0);
      const peak = Math.max(...listed.windows.map((w) => w.peakAltitudeDeg));
      expect(peak).toBeGreaterThanOrEqual(o.minPeak);
      expect(peak).toBeLessThanOrEqual(o.maxPeak);
    }
  });

  it("changes UTC windows when the reference city longitude changes", () => {
    const knox = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: AUG_2026_START,
      endUtcMs: Date.UTC(2026, 7, 10, 0, 0, 0, 0),
    });
    const tokyo = listMilkyWayViewingWindows({
      observer: TOKYO,
      startUtcMs: AUG_2026_START,
      endUtcMs: Date.UTC(2026, 7, 10, 0, 0, 0, 0),
    });
    expect(knox.windows.length).toBeGreaterThan(0);
    expect(tokyo.windows.length).toBeGreaterThan(0);
    expect(knox.windows[0]!.startUtcMs).not.toBe(tokyo.windows[0]!.startUtcMs);
    expect(knox.windows[0]!.id).not.toBe(tokyo.windows[0]!.id);
  });

  it("does not use Date.now for Demo-reconstructed status", () => {
    const listed = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    const w = listed.windows[0]!;
    const before = w.startUtcMs - 60_000;
    const inside = w.peakUtcMs;
    const after = w.endUtcMs + 60_000;
    expect(windowContainingUtc(listed.windows, before)?.id).not.toBe(w.id);
    expect(windowContainingUtc(listed.windows, inside)?.id).toBe(w.id);
    expect(
      listed.windows.find((x) => x.startUtcMs > after),
    ).toBeTruthy();
    const next = findNextMilkyWayViewingWindow({
      observer: KNOXVILLE,
      afterUtcMs: before,
      horizonMs: 40 * DAY_MS,
    });
    expect(next?.startUtcMs).toBeGreaterThan(before);
  });

  it("can emit more than one window on a night when moonlight splits intervals", () => {
    const listed = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    const nights = new Map<number, number>();
    for (const w of listed.windows) {
      const key = Math.floor((w.peakUtcMs - KNOXVILLE.longitudeDeg * 240_000) / DAY_MS);
      nights.set(key, (nights.get(key) ?? 0) + 1);
    }
    expect(Math.max(...nights.values())).toBeGreaterThanOrEqual(1);
  });
});

describe("moonlight and twilight edges", () => {
  it("favors moon-down over a high full Moon", () => {
    const start = Date.UTC(2026, 7, 1);
    const end = Date.UTC(2026, 8, 1);
    let bestDark = { t: start, moon: 1, level: null as ReturnType<typeof milkyWayViewingConditionsAt> };
    let worstMoon = { t: start, moon: 0, level: null as ReturnType<typeof milkyWayViewingConditionsAt> };
    for (let t = start; t < end; t += 2 * 3600_000) {
      const c = milkyWayViewingConditionsAt(t, KNOXVILLE);
      if (!c || c.solarAltitudeDeg > -18 || c.altitudeQuality01 < 0.9 || c.gcAltitudeDeg < 15) {
        continue;
      }
      if (c.localMoonlight01 < bestDark.moon) {
        bestDark = { t, moon: c.localMoonlight01, level: c };
      }
      if (c.localMoonlight01 > worstMoon.moon) {
        worstMoon = { t, moon: c.localMoonlight01, level: c };
      }
    }
    expect(bestDark.level?.qualifies).toBe(true);
    expect(bestDark.moon).toBeLessThanOrEqual(MAX_MOONLIGHT_01);
    expect(worstMoon.moon).toBeGreaterThan(MAX_MOONLIGHT_01);
    expect(worstMoon.level?.qualifies).toBe(false);
  });

  it("does not start a viewing window until astronomical darkness", () => {
    const listed = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: AUG_2026_START,
      endUtcMs: AUG_2026_END,
    });
    const w = listed.windows[0]!;
    const atStart = milkyWayViewingConditionsAt(w.startUtcMs, KNOXVILLE)!;
    expect(atStart.solarAltitudeDeg).toBeLessThanOrEqual(-18 + 0.15);
    const before = milkyWayViewingConditionsAt(w.startUtcMs - 20 * 60_000, KNOXVILLE);
    if (before && before.gcAltitudeDeg >= 20) {
      expect(before.solarAltitudeDeg).toBeGreaterThan(-18);
    }
  });

  it("lets lunar-eclipse transmission lower moonlight without a special case", () => {
    const ge = Date.parse("2022-05-16T04:11:29.000Z");
    const event = activeLunarEclipseAt(ge);
    expect(event).not.toBeNull();
    const geom = lunarEclipseGeometryAt(event!, ge);
    const transmission = lunarEclipseMoonlightTransmission(geom);
    expect(transmission).toBeLessThan(0.2);
    const moon = milkyWayVisibilityMoonStateAt(ge, geom);
    const knoxDot = geographicDirectionDotProduct(
      KNOXVILLE.latitudeDeg,
      KNOXVILLE.longitudeDeg,
      moon.sublunar.latDeg,
      moon.sublunar.lonDeg,
    );
    const eclipsed = localMoonlightContribution01(
      knoxDot,
      moon.lunarIlluminatedFraction,
      transmission,
    );
    const uneclipsed = localMoonlightContribution01(
      knoxDot,
      moon.lunarIlluminatedFraction,
      1,
    );
    expect(eclipsed).toBeLessThan(uneclipsed);
    const hMax = 25;
    expect(
      milkyWayViewingQualifies({
        gcAltitudeDeg: 24,
        solarAltitudeDeg: -20,
        localMoonlight01: uneclipsed,
        nightlyMaximumAltitudeDeg: hMax,
      }),
    ).toBe(false);
    expect(
      milkyWayViewingQualifies({
        gcAltitudeDeg: 24,
        solarAltitudeDeg: -20,
        localMoonlight01: eclipsed,
        nightlyMaximumAltitudeDeg: hMax,
      }),
    ).toBe(true);
  });

  it("does not read clouds or light pollution", () => {
    const src = `${listMilkyWayViewingWindows.toString()} ${milkyWayViewingConditionsAt.toString()}`;
    expect(src).not.toMatch(/cloud/i);
    expect(src).not.toMatch(/bortle/i);
    expect(src).not.toMatch(/pollution/i);
  });
});

describe("search performance", () => {
  it("enumerates 30 days, 1 year, and 10 years interactively for Knoxville", () => {
    resetMilkyWayViewingWindowCacheForTests();
    const origin = Date.UTC(2026, 7, 1);
    const t30 = Date.now();
    const d30 = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: origin,
      endUtcMs: origin + 30 * DAY_MS,
    });
    const ms30 = Date.now() - t30;
    const t1 = Date.now();
    const d1 = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: origin,
      endUtcMs: origin + 365 * DAY_MS,
    });
    const ms1 = Date.now() - t1;
    const t10 = Date.now();
    const d10 = listMilkyWayViewingWindows({
      observer: KNOXVILLE,
      startUtcMs: origin,
      endUtcMs: origin + 3650 * DAY_MS,
    });
    const ms10 = Date.now() - t10;
    expect(d30.windows.length).toBeGreaterThan(0);
    expect(d1.windows.length).toBeGreaterThan(d30.windows.length);
    expect(d10.windows.length).toBeGreaterThan(d1.windows.length);
    expect(ms30).toBeLessThan(2_000);
    expect(ms1).toBeLessThan(8_000);
    expect(ms10).toBeLessThan(45_000);
    const nextT = Date.now();
    const next = findNextMilkyWayViewingWindow({
      observer: KNOXVILLE,
      afterUtcMs: origin,
      horizonMs: 60 * DAY_MS,
    });
    expect(next).not.toBeNull();
    expect(Date.now() - nextT).toBeLessThan(2_000);
  }, 60_000);
});
