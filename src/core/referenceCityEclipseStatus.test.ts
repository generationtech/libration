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
import { formatReferenceCityEclipseChromeStatus, formatReferenceCityEclipseTime } from "./referenceCityEclipseStatus";
import type { ReferenceCityEclipseCircumstances } from "./eclipse/referenceCityEclipseTypes";

const KNOX_TZ = "America/New_York";
const TOKYO_TZ = "Asia/Tokyo";
const C1 = Date.parse("2024-04-08T17:49:10.000Z");

function solarPartial(visible: boolean): ReferenceCityEclipseCircumstances {
  return {
    cityId: "city.knoxville",
    latitudeDeg: 35.96,
    longitudeDeg: -83.92,
    globalSolarEventId: "nasa-5mcse-solar-9561",
    globalLunarEventId: null,
    solar: {
      eventId: "nasa-5mcse-solar-9561",
      globalSubtype: "total",
      geographicKind: visible ? "partial" : "none",
      observableKind: visible ? "partial" : "none",
      locallyVisible: visible,
      notVisibleReason: visible ? null : "outside_footprint",
      c1: visible
        ? {
            id: "c1",
            utcMs: C1,
            altitudeDeg: 60,
            azimuthDeg: 180,
            aboveHorizon: true,
          }
        : null,
      c2: null,
      maximum: visible
        ? {
            id: "maximum",
            utcMs: Date.parse("2024-04-08T19:07:39.000Z"),
            altitudeDeg: 55,
            azimuthDeg: 220,
            aboveHorizon: true,
          }
        : null,
      c3: null,
      c4: null,
      magnitude: visible ? 0.9 : null,
      obscuration: visible ? 0.886 : null,
    },
    lunar: null,
  };
}

describe("reference-city eclipse status presentation", () => {
  it("formats solar contact times in the city timezone, not UTC digits", () => {
    const knox = formatReferenceCityEclipseTime(C1, KNOX_TZ, "12hr", true);
    const tokyo = formatReferenceCityEclipseTime(C1, TOKYO_TZ, "12hr", true);
    expect(knox).not.toEqual(tokyo);
    expect(knox).toMatch(/1:49/);
  });

  it("keeps domain UTC identical while local strings change with the city", () => {
    expect(C1).toBe(Date.parse("2024-04-08T17:49:10.000Z"));
    const a = formatReferenceCityEclipseTime(C1, KNOX_TZ, "24hr", true);
    const b = formatReferenceCityEclipseTime(C1, TOKYO_TZ, "24hr", true);
    expect(a).toMatch(/^13:49/);
    expect(b).toMatch(/^02:49/);
  });

  it("says not visible from the city rather than no eclipse", () => {
    const line = formatReferenceCityEclipseChromeStatus(
      solarPartial(false),
      "Knoxville",
      KNOX_TZ,
      "12hr",
    );
    expect(line).toBe("Eclipse not visible from Knoxville");
    expect(line?.toLowerCase()).not.toContain("no eclipse");
  });

  it("returns null when there is no relevant eclipse", () => {
    expect(
      formatReferenceCityEclipseChromeStatus(
        {
          cityId: "city.knoxville",
          latitudeDeg: 35.96,
          longitudeDeg: -83.92,
          globalSolarEventId: null,
          globalLunarEventId: null,
          solar: null,
          lunar: null,
        },
        "Knoxville",
        KNOX_TZ,
        "12hr",
      ),
    ).toBeNull();
    expect(formatReferenceCityEclipseChromeStatus(null, "Knoxville", KNOX_TZ, "12hr")).toBeNull();
  });

  it("formats upcoming lunar status without implying the global event is absent", () => {
    const upcomingVisible: ReferenceCityEclipseCircumstances = {
      cityId: "city.knoxville",
      latitudeDeg: 35.96,
      longitudeDeg: -83.92,
      globalSolarEventId: null,
      globalLunarEventId: "nasa-5mcle-lunar-9700",
      solar: null,
      lunar: {
        eventId: "nasa-5mcle-lunar-9700",
        globalSubtype: "total",
        locallyVisible: true,
        totalityVisible: true,
        partialityVisible: true,
        inProgressAtMoonrise: false,
        endsAfterMoonset: false,
        contacts: [],
        firstVisibleContactId: null,
        lastVisibleContactId: null,
        horizonCrossings: [],
        localMaximum: null,
      },
    };
    const upcomingHidden: ReferenceCityEclipseCircumstances = {
      ...upcomingVisible,
      cityId: "city.tokyo",
      lunar: {
        eventId: "nasa-5mcle-lunar-9700",
        globalSubtype: "total",
        locallyVisible: false,
        totalityVisible: false,
        partialityVisible: false,
        inProgressAtMoonrise: false,
        endsAfterMoonset: false,
        contacts: [],
        firstVisibleContactId: null,
        lastVisibleContactId: null,
        horizonCrossings: [],
        localMaximum: null,
      },
    };
    expect(
      formatReferenceCityEclipseChromeStatus(upcomingVisible, "Knoxville", KNOX_TZ, "12hr", {
        presented: true,
        lifecycle: "upcoming",
        relativeTime: "in 3d 0h",
      }),
    ).toBe("Lunar eclipse · Total · in 3d 0h");
    expect(
      formatReferenceCityEclipseChromeStatus(upcomingHidden, "Tokyo", TOKYO_TZ, "12hr", {
        presented: true,
        lifecycle: "upcoming",
        relativeTime: "in 3d 0h",
      }),
    ).toBe("Lunar eclipse · not visible locally · in 3d 0h");
  });

  it("mentions local type and maximum for a visible partial", () => {
    const line = formatReferenceCityEclipseChromeStatus(
      solarPartial(true),
      "Knoxville",
      KNOX_TZ,
      "12hr",
    );
    expect(line).toMatch(/Partial 89%/);
    expect(line).toMatch(/max /);
  });

  it("uses begins when an upcoming local C1 is known", () => {
    const line = formatReferenceCityEclipseChromeStatus(
      solarPartial(true),
      "Knoxville",
      KNOX_TZ,
      "12hr",
      { lifecycle: "upcoming" },
    );
    expect(line).toMatch(/Partial 89%/);
    expect(line).toMatch(/begins 1:49/);
    expect(line).not.toMatch(/in /);
  });
});
