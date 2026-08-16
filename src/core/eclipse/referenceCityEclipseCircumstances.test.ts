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
  resetEclipseEventServiceCacheForTests,
  resolveEclipseFrame,
} from "./eclipseEventService";
import {
  resetReferenceCityEclipseCircumstancesCacheForTests,
  resolveReferenceCityEclipseCircumstances,
  solarLocalCircumstancesForObserver,
} from "./referenceCityEclipseCircumstances";
import { REFERENCE_CITIES } from "../../data/referenceCities";

const TOTAL_SOLAR_UTC = Date.parse("2024-04-08T18:17:15.000Z");
const FORECAST_UTC = Date.parse("2024-04-03T18:00:00.000Z");
const LUNAR_UTC = Date.parse("2022-05-16T04:11:29.000Z");
const HORIZON_7D = 7 * 86_400_000;

function city(id: string) {
  const c = REFERENCE_CITIES.find((x) => x.id === id);
  if (!c) {
    throw new Error(`missing ${id}`);
  }
  return {
    cityId: c.id,
    latitudeDeg: c.latitude,
    longitudeDeg: c.longitude,
  };
}

describe("reference-city circumstances vs global eclipse truth", () => {
  it("keeps event id, solar geometry, and lunar geometry identical across cities", () => {
    resetEclipseEventServiceCacheForTests();
    resetReferenceCityEclipseCircumstancesCacheForTests();
    const knox = city("city.knoxville");
    const tokyo = city("city.tokyo");
    const frame = resolveEclipseFrame(TOTAL_SOLAR_UTC, { horizonMs: HORIZON_7D });
    const a = resolveReferenceCityEclipseCircumstances(frame, knox);
    const b = resolveReferenceCityEclipseCircumstances(frame, tokyo);
    expect(frame.activeSolar?.id).toBe("nasa-5mcse-solar-9561");
    expect(a?.globalSolarEventId).toBe(frame.activeSolar?.id);
    expect(b?.globalSolarEventId).toBe(frame.activeSolar?.id);
    expect(a?.solar?.eventId).toBe(b?.solar?.eventId);
    expect(frame.solarGeometry).toBe(resolveEclipseFrame(TOTAL_SOLAR_UTC, { horizonMs: HORIZON_7D }).solarGeometry);
    expect(a?.solar?.observableKind).not.toBe(b?.solar?.observableKind);
  });

  it("does not change lunar global geometry when the city cannot see the Moon", () => {
    resetEclipseEventServiceCacheForTests();
    resetReferenceCityEclipseCircumstancesCacheForTests();
    const knox = city("city.knoxville");
    const tokyo = city("city.tokyo");
    const frame = resolveEclipseFrame(LUNAR_UTC);
    const a = resolveReferenceCityEclipseCircumstances(frame, knox);
    const b = resolveReferenceCityEclipseCircumstances(frame, tokyo);
    expect(frame.activeLunar?.id).toBe("nasa-5mcle-lunar-9700");
    expect(frame.lunarGeometry).not.toBeNull();
    expect(a?.globalLunarEventId).toBe(frame.activeLunar?.id);
    expect(b?.globalLunarEventId).toBe(frame.activeLunar?.id);
    expect(a?.lunar?.locallyVisible).toBe(true);
    expect(b?.lunar?.contacts.find((c) => c.id === "greatest")?.aboveHorizon).toBe(false);
  });

  it("derives upcoming lunar circumstances without changing global forecast geometry", () => {
    resetEclipseEventServiceCacheForTests();
    resetReferenceCityEclipseCircumstancesCacheForTests();
    const knox = city("city.knoxville");
    const tokyo = city("city.tokyo");
    const frame = resolveEclipseFrame(Date.parse("2022-05-13T04:00:00.000Z"), {
      lunarHorizonMs: HORIZON_7D,
    });
    const a = resolveReferenceCityEclipseCircumstances(frame, knox);
    const b = resolveReferenceCityEclipseCircumstances(frame, tokyo);
    expect(frame.activeLunar).toBeNull();
    expect(frame.upcomingLunar[0]?.id).toBe("nasa-5mcle-lunar-9700");
    expect(a?.globalLunarEventId).toBe(frame.upcomingLunar[0]?.id);
    expect(b?.globalLunarEventId).toBe(frame.upcomingLunar[0]?.id);
    expect(a?.lunar?.locallyVisible).not.toBe(b?.lunar?.locallyVisible);
    expect(resolveReferenceCityEclipseCircumstances(frame, null)).toBeNull();
    expect(frame.lunarForecastSelections[0]?.geometry).toBe(
      resolveEclipseFrame(Date.parse("2022-05-13T04:00:00.000Z"), { lunarHorizonMs: HORIZON_7D })
        .lunarForecastSelections[0]?.geometry,
    );
  });

  it("still resolves a global solar event when no reference city is available", () => {
    resetEclipseEventServiceCacheForTests();
    const frame = resolveEclipseFrame(TOTAL_SOLAR_UTC);
    expect(frame.activeSolar).not.toBeNull();
    expect(resolveReferenceCityEclipseCircumstances(frame, null)).toBeNull();
  });

  it("computes upcoming solar local contacts before the event is active", () => {
    resetEclipseEventServiceCacheForTests();
    resetReferenceCityEclipseCircumstancesCacheForTests();
    const knox = city("city.knoxville");
    const frame = resolveEclipseFrame(FORECAST_UTC, { horizonMs: HORIZON_7D });
    expect(frame.activeSolar).toBeNull();
    expect(frame.upcomingSolar[0]?.id).toBe("nasa-5mcse-solar-9561");
    const loc = resolveReferenceCityEclipseCircumstances(frame, knox);
    expect(loc?.solar?.c1).not.toBeNull();
    expect(loc?.solar?.maximum).not.toBeNull();
    expect(loc?.solar?.observableKind).toBe("partial");
  });

  it("returns the same cached solar object for a repeated event+observer lookup", () => {
    resetReferenceCityEclipseCircumstancesCacheForTests();
    const frame = resolveEclipseFrame(TOTAL_SOLAR_UTC);
    const event = frame.activeSolar!;
    const knox = city("city.knoxville");
    const t0 = performance.now();
    const first = solarLocalCircumstancesForObserver(event, knox.latitudeDeg, knox.longitudeDeg);
    const firstMs = performance.now() - t0;
    const t1 = performance.now();
    const second = solarLocalCircumstancesForObserver(event, knox.latitudeDeg, knox.longitudeDeg);
    const cachedMs = performance.now() - t1;
    expect(second).toBe(first);
    expect(cachedMs).toBeLessThan(5);
    expect(firstMs).toBeLessThan(50);
  });
});
