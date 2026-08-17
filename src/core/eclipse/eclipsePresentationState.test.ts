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
import { formatEclipseHudStatus, formatEclipseHudObscurationPercent } from "../referenceCityEclipseStatus";
import { resolveEclipseFrame } from "./eclipseEventService";
import { normalizeLunarEclipsePresentation } from "./lunarEclipseAppearance";
import { normalizeSolarEclipsePresentation } from "./solarEclipseAppearance";
import { buildEclipsePresentationState } from "./eclipsePresentationState";
import { resolveReferenceCityEclipseCircumstances } from "./referenceCityEclipseCircumstances";
import { buildEclipseEventInformation } from "./eclipseEventInformation";
import { normalizeEclipseInfoPresentation } from "./eclipseInfoAppearance";

const HORIZON = 7 * 86_400_000;
const KNOX = {
  cityId: "city.knoxville",
  latitudeDeg: 35.9606,
  longitudeDeg: -83.9207,
};
const TOKYO = {
  cityId: "city.tokyo",
  latitudeDeg: 35.6762,
  longitudeDeg: 139.6503,
};
const SOLAR = normalizeSolarEclipsePresentation(undefined);
const LUNAR = normalizeLunarEclipsePresentation(undefined);
const INFO = normalizeEclipseInfoPresentation(undefined);
const PRE_2017 = Date.parse("2017-08-21T14:51:00.000Z");
const GE_2017 = Date.parse("2017-08-21T18:25:29.700Z");

function stateAt(
  utcMs: number,
  observer: typeof KNOX | typeof TOKYO,
  cityName: string,
  horizonMs = HORIZON,
) {
  const frame = resolveEclipseFrame(utcMs, { horizonMs });
  const circumstances = resolveReferenceCityEclipseCircumstances(frame, observer);
  return buildEclipsePresentationState({
    frame,
    solarEnabled: true,
    lunarEnabled: true,
    solar: SOLAR,
    lunar: LUNAR,
    circumstances,
    cityName,
  });
}

describe("eclipse presentation projection", () => {
  it("keeps 2017 global total vs Knoxville local partial coherent across surfaces", () => {
    const upcoming = stateAt(PRE_2017, KNOX, "Knoxville");
    expect(upcoming).not.toBeNull();
    expect(upcoming!.kind).toBe("solar");
    expect(upcoming!.lifecycle).toBe("upcoming");
    expect(upcoming!.globalTitle).toBe("Total solar eclipse");
    expect(upcoming!.currentShadow).toBeNull();
    expect(upcoming!.local?.visible).toBe(true);
    expect(upcoming!.local?.kindLabel).toBe("Partial");
    expect(upcoming!.local?.obscuration).not.toBeNull();
    expect(upcoming!.local!.obscuration!).toBeGreaterThan(0.99);
    expect(upcoming!.local!.obscuration!).toBeLessThan(1);
    expect(upcoming!.mapLabelText).toBe("Total solar eclipse · upcoming");
    const hudUp = formatEclipseHudStatus(upcoming, "America/New_York", "12hr");
    expect(hudUp).toMatch(/^Eclipse · Partial 99\.\d%/);
    expect(hudUp).not.toMatch(/100%/);
    expect(hudUp).toMatch(/begins /);

    const ge = stateAt(GE_2017, KNOX, "Knoxville", 0);
    expect(ge!.lifecycle).toBe("active");
    expect(ge!.currentShadow).toBe("Totality (central shadow)");
    expect(ge!.local?.kindLabel).toBe("Partial");
    expect(ge!.mapLabelText).toBe("Total solar eclipse · active");
    const hudGe = formatEclipseHudStatus(ge, "America/New_York", "12hr");
    expect(hudGe).toMatch(/^Eclipse · Partial 99\.\d%/);
    expect(hudGe).not.toMatch(/100%/);
    expect(hudGe).toMatch(/max /);

    const info = buildEclipseEventInformation({
      frame: resolveEclipseFrame(GE_2017, { horizonMs: 0 }),
      solarEnabled: true,
      lunarEnabled: true,
      solar: SOLAR,
      lunar: LUNAR,
      info: INFO,
      circumstances: resolveReferenceCityEclipseCircumstances(
        resolveEclipseFrame(GE_2017, { horizonMs: 0 }),
        KNOX,
      ),
      cityName: "Knoxville",
    });
    expect(info.presentation?.mapLabelText).toBe(ge!.mapLabelText);
    expect(info.rows.some((r) => r.label === "Global event" && r.value === "Total solar eclipse")).toBe(
      true,
    );
    expect(info.rows.some((r) => r.label === "Current shadow")).toBe(true);
  });

  it("does not change global map-label identity when the city switches", () => {
    const knox = stateAt(GE_2017, KNOX, "Knoxville", 0);
    const tokyo = stateAt(GE_2017, TOKYO, "Tokyo", 0);
    expect(knox!.eventId).toBe(tokyo!.eventId);
    expect(knox!.lifecycle).toBe(tokyo!.lifecycle);
    expect(knox!.mapLabelText).toBe(tokyo!.mapLabelText);
    expect(knox!.globalTitle).toBe(tokyo!.globalTitle);
    expect(knox!.local?.kindLabel).toBe("Partial");
    expect(tokyo!.local?.visible).toBe(false);
    const hudTokyo = formatEclipseHudStatus(tokyo, "Asia/Tokyo", "12hr");
    expect(hudTokyo).toMatch(/not visible from Tokyo/);
  });

  it("never formats a partial HUD percent as 100%", () => {
    expect(formatEclipseHudObscurationPercent(0.886)).toBe("89%");
    expect(formatEclipseHudObscurationPercent(0.994)).toBe("99.4%");
    expect(formatEclipseHudObscurationPercent(0.999)).toBe("99.9%");
    expect(formatEclipseHudObscurationPercent(0.9999)).toBe("99.9%");
    expect(formatEclipseHudObscurationPercent(1)).toBe("100%");
  });
});
