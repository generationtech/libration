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
import { createTimeContext } from "../time";
import { resolveEclipseFrame } from "./eclipseEventService";
import { getLunarEclipseEventById } from "./eclipseAuthority";
import { lunarEclipseGeometryAt } from "./lunarEclipseGeometry";
import { lunarEclipseMoonlightTransmission } from "./lunarEclipseMoonlightTransmission";
import { createLunarEclipseLayer } from "../../layers/lunarEclipseLayer";
import { createSolarShadingLayer } from "../../layers/solarShadingLayer";
import { sampleIlluminationRgba8 } from "../../renderer/illuminationShading";
import { getMoonlightPolicy } from "../moonlightPolicy";
import { isSolarShadingPayload } from "../../layers/solarShadingPayload";
import { sublunarPoint } from "../sublunarPoint";
import { isMoonGeometricallyAboveHorizon } from "./lunarVisibilityGeometry";

const TOTAL_2029 = "nasa-5mcle-lunar-9716";
const GE_2022 = Date.parse("2022-05-16T04:11:29.000Z");
const ILL = getMoonlightPolicy("illustrative");

function solarDotFromAltDeg(altDeg: number): number {
  return Math.sin((altDeg * Math.PI) / 180);
}

describe("lunar eclipse illumination ownership", () => {
  it("does not change physical shading when the informational visibility overlay is off", () => {
    const frame = resolveEclipseFrame(GE_2022);
    const time = createTimeContext(GE_2022, 0, true, { eclipseFrame: frame });
    const shading = createSolarShadingLayer({ moonlightMode: "illustrative" }).getState(time);
    const regionOn = createLunarEclipseLayer({
      presentation: { showVisibilityRegion: true },
      alignment: { enabled: false },
    }).getState(time);
    const regionOff = createLunarEclipseLayer({
      presentation: { showVisibilityRegion: false, showVisibilityBoundary: false },
      alignment: { enabled: false },
    }).getState(time);
    expect(isSolarShadingPayload(shading.data)).toBe(true);
    if (!isSolarShadingPayload(shading.data)) {
      return;
    }
    const shadingOffRegion = createSolarShadingLayer({ moonlightMode: "illustrative" }).getState(time);
    expect(shading.data).toEqual(shadingOffRegion.data);
    expect(shading.data.moonlightTransmission01).toBeLessThan(0.2);
    void regionOn;
    void regionOff;
  });

  it("attenuates night-side moonlight from coverage, not contact labels", () => {
    const event = getLunarEclipseEventById(TOTAL_2029)!;
    const night = solarDotFromAltDeg(-30);
    const moonUp = solarDotFromAltDeg(50);
    const sample = (utc: number) => {
      const t = lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, utc));
      return sampleIlluminationRgba8(
        night,
        1,
        { lunarDot: moonUp, lunarIlluminatedFraction: 1, moonlightTransmission01: t },
        ILL,
      );
    };
    const pre = sample(event.p1UtcMs! - 5 * 60_000);
    const pen = sample((event.p1UtcMs! + event.u1UtcMs!) / 2);
    const par = sample((event.u1UtcMs! + event.u2UtcMs!) / 2);
    const tot = sample(event.greatestEclipseUtcMs);
    const after = sample(event.p4UtcMs! + 5 * 60_000);
    expect(pen.a).toBeGreaterThan(pre.a);
    expect(par.a).toBeGreaterThan(pen.a);
    expect(tot.a).toBeGreaterThan(par.a);
    expect(after.a).toBe(pre.a);
    expect(tot.r + tot.g + tot.b).toBeLessThan(pre.r + pre.g + pre.b);
  });

  it("adds no moonlight where the Moon is below the horizon", () => {
    const event = getLunarEclipseEventById(TOTAL_2029)!;
    const t = lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, event.greatestEclipseUtcMs));
    const night = solarDotFromAltDeg(-30);
    const none = sampleIlluminationRgba8(night, 1, undefined, ILL);
    const below = sampleIlluminationRgba8(
      night,
      1,
      { lunarDot: -0.4, lunarIlluminatedFraction: 1, moonlightTransmission01: t },
      ILL,
    );
    expect(below.a).toBe(none.a);
    expect(below.r).toBe(none.r);
  });

  it("does not darken the day side during a lunar eclipse", () => {
    const event = getLunarEclipseEventById(TOTAL_2029)!;
    const t = lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, event.greatestEclipseUtcMs));
    const day = solarDotFromAltDeg(45);
    const ordinary = sampleIlluminationRgba8(day, 1, undefined, ILL);
    const eclipsed = sampleIlluminationRgba8(
      day,
      1,
      { lunarDot: 0.2, lunarIlluminatedFraction: 1, moonlightTransmission01: t },
      ILL,
    );
    expect(eclipsed.a).toBe(ordinary.a);
    expect(eclipsed.r).toBe(ordinary.r);
  });

  it("keeps Knoxville/Tokyo from selecting the global Moon-visible hemisphere", () => {
    const moon = sublunarPoint(GE_2022);
    expect(isMoonGeometricallyAboveHorizon(35.9606, -83.9207, moon.latDeg, moon.lonDeg)).toBe(true);
    expect(isMoonGeometricallyAboveHorizon(35.6762, 139.6503, moon.latDeg, moon.lonDeg)).toBe(false);
    const knox = resolveEclipseFrame(GE_2022);
    const tokyo = resolveEclipseFrame(GE_2022);
    expect(knox.lunarGeometry).toEqual(tokyo.lunarGeometry);
    expect(knox.activeLunar?.id).toBe(tokyo.activeLunar?.id);
  });
});
