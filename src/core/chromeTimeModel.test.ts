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
import type { DisplayTimeConfig } from "../config/appConfig.ts";
import { resolveChromeTime, resolveTapeAnchorFraction } from "./chromeTimeResolver.ts";
import { deriveCivilProjection } from "./civilProjection.ts";
import { displayTimeModeFromTopBandTimeMode } from "./displayTimeMode.ts";
import { phasedTapeAnchorFraction, tapeHourToX } from "./tapeRegistration.ts";
import { mapXFromLongitudeDeg } from "./equirectangularProjection.ts";
import { readPointXFromReferenceLongitudeDeg } from "./readPointLongitude.ts";
import { REFERENCE_CITIES } from "../data/referenceCities.ts";
import { structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg } from "../renderer/structuralLongitudeGrid.ts";
import { topBandHourMarkerCenterX } from "../renderer/displayChrome.ts";

describe("chrome time model invariants", () => {
  const nowUtcInstant = Date.UTC(2026, 3, 15, 14, 30, 45, 123);
  const viewportWidthPx = 1920;

  const baseDisplayTime: DisplayTimeConfig = {
    referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
    topBandMode: "local24",
    topBandAnchor: { mode: "fixedCity", cityId: "new_york" },
  };

  it("A: single time source — civil projection is derived only from the same nowUtcInstant", () => {
    const a = deriveCivilProjection(nowUtcInstant, "America/New_York");
    const b = deriveCivilProjection(nowUtcInstant + 3_600_000, "America/New_York");
    expect(a.fractionalHour).not.toBeCloseTo(b.fractionalHour, 1);
    const again = deriveCivilProjection(nowUtcInstant, "America/New_York");
    expect(again.fractionalHour).toBeCloseTo(a.fractionalHour, 10);
  });

  it("B: reference frame contract — one resolved object carries timezone, longitude, and name", () => {
    const r = resolveChromeTime({
      timeBasis: { nowUtcInstant },
      displayTime: baseDisplayTime,
      viewportWidthPx,
    });
    expect(r.referenceFrame.timeZoneId).toBe("America/New_York");
    expect(Number.isFinite(r.referenceFrame.longitudeDeg)).toBe(true);
    expect(r.referenceFrame.name.length).toBeGreaterThan(0);
    expect(r.civilProjection).toEqual(deriveCivilProjection(nowUtcInstant, r.referenceFrame.timeZoneId));
  });

  it("C: tape registration — time at read point equals reference civil fractional hour", () => {
    const r = resolveChromeTime({
      timeBasis: { nowUtcInstant },
      displayTime: baseDisplayTime,
      viewportWidthPx,
    });
    const anchorFrac = resolveTapeAnchorFraction(r.readPoint, viewportWidthPx);
    expect(anchorFrac).toBeCloseTo(phasedTapeAnchorFraction(r.readPoint, viewportWidthPx), 10);
    const xAtCivil = topBandHourMarkerCenterX(
      r.civilProjection.fractionalHour,
      r.civilProjection.fractionalHour,
      viewportWidthPx,
      anchorFrac,
    );
    expect(xAtCivil).toBeCloseTo(r.readPoint.x, 5);
    const xTape = tapeHourToX(
      r.civilProjection.fractionalHour,
      r.civilProjection.fractionalHour,
      viewportWidthPx,
      anchorFrac,
    );
    expect(xTape).toBeCloseTo(r.readPoint.x, 5);
  });

  it("E: system civil + fixedCity anchor uses that city's IANA zone for civil projection", () => {
    const r = resolveChromeTime({
      timeBasis: { nowUtcInstant },
      displayTime: {
        referenceTimeZone: { source: "system" },
        topBandMode: "local24",
        topBandAnchor: { mode: "fixedCity", cityId: "city.cairo" },
      },
      viewportWidthPx,
    });
    expect(r.referenceFrame.timeZoneId).toBe("Africa/Cairo");
    expect(r.civilProjection).toEqual(deriveCivilProjection(nowUtcInstant, "Africa/Cairo"));
  });

  it("D: display mode isolation — TopBandTimeMode does not change civil geometry or tape anchor", () => {
    const r12 = resolveChromeTime({
      timeBasis: { nowUtcInstant },
      displayTime: { ...baseDisplayTime, topBandMode: "local12" },
      viewportWidthPx,
    });
    const r24 = resolveChromeTime({
      timeBasis: { nowUtcInstant },
      displayTime: { ...baseDisplayTime, topBandMode: "local24" },
      viewportWidthPx,
    });
    const utc = resolveChromeTime({
      timeBasis: { nowUtcInstant },
      displayTime: { ...baseDisplayTime, topBandMode: "utc24" },
      viewportWidthPx,
    });
    for (const [a, b] of [
      [r12, r24],
      [r24, utc],
      [r12, utc],
    ] as const) {
      expect(a.civilProjection.fractionalHour).toBeCloseTo(b.civilProjection.fractionalHour, 10);
      expect(a.readPoint.x).toBeCloseTo(b.readPoint.x, 5);
      expect(resolveTapeAnchorFraction(a.readPoint, viewportWidthPx)).toBeCloseTo(
        resolveTapeAnchorFraction(b.readPoint, viewportWidthPx),
        10,
      );
    }
    expect(displayTimeModeFromTopBandTimeMode("local12")).toBe("12hr");
    expect(displayTimeModeFromTopBandTimeMode("local24")).toBe("24hr");
    expect(displayTimeModeFromTopBandTimeMode("utc24")).toBe("utc");
  });

  it("E: tick / read point — x depends on longitude only, not display mode", () => {
    const lon = -74.006;
    const x12 = readPointXFromReferenceLongitudeDeg(lon, viewportWidthPx);
    const x24 = readPointXFromReferenceLongitudeDeg(lon, viewportWidthPx);
    expect(x12).toBe(x24);
  });

  it("G: Knoxville, Cairo, Mumbai — read-point x matches exact longitude, not 15° sector center", () => {
    const w = viewportWidthPx;
    for (const id of ["city.knoxville", "city.cairo", "city.mumbai"] as const) {
      const lon = REFERENCE_CITIES.find((c) => c.id === id)!.longitude;
      const xRead = readPointXFromReferenceLongitudeDeg(lon, w);
      const xExact = mapXFromLongitudeDeg(lon, w);
      const xSector = mapXFromLongitudeDeg(structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(lon), w);
      expect(xRead).toBeCloseTo(xExact, 10);
      expect(xRead).not.toBeCloseTo(xSector, 2);
    }
  });

  it("H: read-point x changes continuously with longitude (not 15° jumps)", () => {
    const w = 1000;
    const x0 = readPointXFromReferenceLongitudeDeg(10.0, w);
    const x1 = readPointXFromReferenceLongitudeDeg(10.01, w);
    expect(x1 - x0).toBeCloseTo((0.01 / 360) * w, 5);
  });

  it("F: civil vs meridian overlay — IANA civil projection differs from meridian-offset solar wall clock", async () => {
    const civilMod = await import("./civilProjection.ts");
    const resolverMod = await import("./chromeTimeResolver.ts");
    expect(civilMod).toBeDefined();
    expect(resolverMod.resolveChromeTime).toBeTypeOf("function");
    const solarMod = await import("./solarLocalWallClock.ts");
    expect(solarMod.solarLocalWallClockStateFromUtcMs).toBeTypeOf("function");
    const civil = deriveCivilProjection(nowUtcInstant, "Europe/London");
    const solar = solarMod.solarLocalWallClockStateFromUtcMs(nowUtcInstant, 0);
    expect(civil.fractionalHour).not.toBeCloseTo(solar.continuousHour0To24, 1);
  });
});
