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
import { getSolarEclipseEventById } from "../core/eclipse/eclipseAuthority";
import { solarEclipseVisualTransmission01 } from "../core/eclipse/solarEclipseDaylightTransmission";
import { solarEclipseObscurationAt } from "../core/eclipse/solarEclipseObscuration";
import {
  buildSolarEclipseObscurationField,
  sampleSolarEclipseObscurationField,
} from "../core/eclipse/solarEclipseObscurationField";
import { subsolarPoint } from "../core/subsolarPoint";
import { solarAltitudeDegFromSurfaceSunDotProduct } from "../core/solarTwilight";
import { sampleIlluminationRgba8 } from "./illuminationShading";
import { buildSolarShadingIlluminationRenderPlan } from "./renderPlan/sceneSolarShadingIlluminationPlan";
import { getMoonlightPolicy } from "../core/moonlightPolicy";

const TOTAL_2017 = "nasa-5mcse-solar-9546";
const PARTIAL_2022 = "nasa-5mcse-solar-9558";
const ANNULAR_2023 = "nasa-5mcse-solar-9560";
const DATELINE_2016 = "nasa-5mcse-solar-9543";
const POLAR_2021 = "nasa-5mcse-solar-9556";
const ILL_POLICY = getMoonlightPolicy("illustrative");

function requireEvent(id: string) {
  const event = getSolarEclipseEventById(id);
  if (!event) {
    throw new Error(`missing ${id}`);
  }
  return event;
}

function solarDot(latDeg: number, lonDeg: number, subLat: number, subLon: number): number {
  const phi = (latDeg * Math.PI) / 180;
  const lam = (lonDeg * Math.PI) / 180;
  const latS = (subLat * Math.PI) / 180;
  const lonS = (subLon * Math.PI) / 180;
  return Math.cos(phi) * Math.cos(latS) * Math.cos(lam - lonS) + Math.sin(phi) * Math.sin(latS);
}

function sampleFinal(
  utcMs: number,
  lat: number,
  lon: number,
  field: ReturnType<typeof buildSolarEclipseObscurationField> | null,
  intensity: "normal" | "dramatic" = "normal",
  eventId: string = TOTAL_2017,
) {
  const event = requireEvent(eventId);
  const sub = subsolarPoint(utcMs);
  const dot = solarDot(lat, lon, sub.latDeg, sub.lonDeg);
  const transmission =
    field === null
      ? 1
      : solarEclipseVisualTransmission01(sampleSolarEclipseObscurationField(field, lon, lat), intensity);
  const ordinary = sampleIlluminationRgba8(dot, 1);
  const eclipsed = sampleIlluminationRgba8(dot, 1, undefined, undefined, undefined, undefined, transmission);
  const sample = solarEclipseObscurationAt(utcMs, event, lat, lon);
  return {
    alt: solarAltitudeDegFromSurfaceSunDotProduct(dot),
    ordinaryA: ordinary.a,
    eclipsedA: eclipsed.a,
    transmission,
    sunAboveHorizon: sample.sunAboveHorizon,
    physical: sample.physicalObscuration01,
    e4: sample.obscuration01,
  };
}

function maxAdjacentAlphaJump(
  utcMs: number,
  lat: number,
  lon0: number,
  lon1: number,
  step: number,
  field: ReturnType<typeof buildSolarEclipseObscurationField>,
  eventId: string = TOTAL_2017,
): { maxJump: number; atHorizon: number } {
  let prev: ReturnType<typeof sampleFinal> | null = null;
  let maxJump = 0;
  let atHorizon = 0;
  for (let lon = lon0; lon <= lon1 + 1e-9; lon += step) {
    const p = sampleFinal(utcMs, lat, lon, field, "normal", eventId);
    if (prev) {
      const jump = Math.abs(p.eclipsedA - prev.eclipsedA);
      maxJump = Math.max(maxJump, jump);
      if (prev.sunAboveHorizon !== p.sunAboveHorizon) {
        atHorizon = jump;
      }
    }
    prev = p;
  }
  return { maxJump, atHorizon };
}

describe("solar eclipse horizon illumination composition", () => {
  it("has no physical field at 2017-08-21T14:30:00Z (before global start)", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = Date.parse("2017-08-21T14:30:00.000Z");
    expect(utcMs).toBeLessThan(event.globalStartMs);
    const field = buildSolarEclipseObscurationField(utcMs, event);
    expect(field.obscuration01.every((v) => v === 0)).toBe(true);
    const west = sampleFinal(utcMs, 45, -170, field);
    const east = sampleFinal(utcMs, 45, -160, field);
    expect(west.eclipsedA).toBe(west.ordinaryA);
    expect(east.eclipsedA).toBe(east.ordinaryA);
  });

  it("keeps final illumination continuous across the western 2017 terminator at 16:33:24Z", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = Date.parse("2017-08-21T16:33:24.000Z");
    const field = buildSolarEclipseObscurationField(utcMs, event);
    const { maxJump, atHorizon } = maxAdjacentAlphaJump(utcMs, 45, -176, -160, 0.25, field);
    expect(atHorizon).toBeLessThan(12);
    expect(maxJump).toBeLessThan(16);
    const below = sampleFinal(utcMs, 45, -170.5, field);
    const above = sampleFinal(utcMs, 45, -169.0, field);
    expect(below.sunAboveHorizon).toBe(false);
    expect(above.sunAboveHorizon).toBe(true);
    expect(below.physical).toBeGreaterThan(0.4);
    expect(below.e4).toBe(0);
    expect(above.e4).toBeGreaterThan(0.4);
    expect(Math.abs(below.eclipsedA - above.eclipsedA)).toBeLessThan(20);
    expect(below.eclipsedA).toBeGreaterThan(below.ordinaryA);
  });

  it("keeps final illumination continuous across the eastern 2017 terminator at 19:55:32Z", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = Date.parse("2017-08-21T19:55:32.000Z");
    const field = buildSolarEclipseObscurationField(utcMs, event);
    const { maxJump, atHorizon } = maxAdjacentAlphaJump(utcMs, 20, -32, -16, 0.25, field);
    expect(atHorizon).toBeLessThan(12);
    expect(maxJump).toBeLessThan(16);
    const above = sampleFinal(utcMs, 20, -26, field);
    const below = sampleFinal(utcMs, 20, -23.5, field);
    expect(above.sunAboveHorizon).toBe(true);
    expect(below.sunAboveHorizon).toBe(false);
    expect(below.physical).toBeGreaterThan(0.5);
    expect(below.e4).toBe(0);
    expect(Math.abs(below.eclipsedA - above.eclipsedA)).toBeLessThan(24);
  });

  it("does not darken midnight-side locations during 2017 GE", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = event.greatestEclipseUtcMs;
    const field = buildSolarEclipseObscurationField(utcMs, event);
    for (const [lat, lon] of [
      [-40, 140],
      [0, 100],
      [40, 140],
    ] as const) {
      const p = sampleFinal(utcMs, lat, lon, field);
      expect(p.alt).toBeLessThan(-10);
      expect(p.eclipsedA).toBe(p.ordinaryA);
    }
  });

  it("does not brighten when crossing from eclipsed twilight into night", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = Date.parse("2017-08-21T16:45:01.000Z");
    const field = buildSolarEclipseObscurationField(utcMs, event);
    const above = sampleFinal(utcMs, 45, -172.25, field);
    const below = sampleFinal(utcMs, 45, -173.5, field);
    expect(above.sunAboveHorizon).toBe(true);
    expect(below.sunAboveHorizon).toBe(false);
    expect(below.eclipsedA).toBeGreaterThanOrEqual(above.eclipsedA - 8);
  });

  it("changes smoothly for a ±1° solar-altitude family at 16:45Z", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = Date.parse("2017-08-21T16:45:01.000Z");
    const field = buildSolarEclipseObscurationField(utcMs, event);
    const samples = [];
    for (let lon = -176; lon <= -168; lon += 0.05) {
      samples.push(sampleFinal(utcMs, 45, lon, field));
    }
    const nearHorizon = samples.filter((s) => Math.abs(s.alt) <= 1);
    expect(nearHorizon.length).toBeGreaterThan(8);
    for (let i = 1; i < nearHorizon.length; i += 1) {
      expect(Math.abs(nearHorizon[i]!.eclipsedA - nearHorizon[i - 1]!.eclipsedA)).toBeLessThan(8);
    }
  });

  it("leaves a no-eclipse terminator identical to ordinary shading", () => {
    const utcMs = Date.parse("2016-08-21T16:45:01.000Z");
    const event = requireEvent(TOTAL_2017);
    expect(utcMs < event.globalStartMs || utcMs > event.globalEndMs).toBe(true);
    const field = buildSolarEclipseObscurationField(utcMs, event);
    expect(field.obscuration01.every((v) => v === 0)).toBe(true);
    for (const lon of [-180, -170, -160, -90, 0, 90]) {
      const p = sampleFinal(utcMs, 45, lon, field);
      expect(p.eclipsedA).toBe(p.ordinaryA);
    }
  });

  it("matches ordinary shading when the transmission field is omitted or all-ones", () => {
    const ordinary = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 64,
      viewportHeightPx: 32,
      subsolarLatDeg: 12,
      subsolarLonDeg: -70,
      sublunarLatDeg: 0,
      sublunarLonDeg: 180,
      lunarIlluminatedFraction: 0.1,
      layerOpacity: 1,
      moonlightPolicy: ILL_POLICY,
    });
    const ones = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 64,
      viewportHeightPx: 32,
      subsolarLatDeg: 12,
      subsolarLonDeg: -70,
      sublunarLatDeg: 0,
      sublunarLonDeg: 180,
      lunarIlluminatedFraction: 0.1,
      layerOpacity: 1,
      moonlightPolicy: ILL_POLICY,
      daylightTransmissionField: {
        lonSamples: 4,
        latSamples: 3,
        transmission01: new Float32Array(12).fill(1),
      },
    });
    expect(ordinary.items[0]?.kind).toBe("rasterPatch");
    expect(ones.items[0]?.kind).toBe("rasterPatch");
    if (ordinary.items[0]?.kind !== "rasterPatch" || ones.items[0]?.kind !== "rasterPatch") {
      return;
    }
    expect(Array.from(ones.items[0].rgba)).toEqual(Array.from(ordinary.items[0].rgba));
  });

  it("does not darken night-side plan pixels when transmission is 0.3", () => {
    const field = {
      lonSamples: 4,
      latSamples: 3,
      transmission01: new Float32Array(12).fill(0.3),
    };
    const ordinary = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 64,
      viewportHeightPx: 32,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 180,
      lunarIlluminatedFraction: 0.1,
      layerOpacity: 1,
      moonlightPolicy: ILL_POLICY,
    });
    const eclipsed = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 64,
      viewportHeightPx: 32,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 180,
      lunarIlluminatedFraction: 0.1,
      layerOpacity: 1,
      moonlightPolicy: ILL_POLICY,
      daylightTransmissionField: field,
    });
    if (ordinary.items[0]?.kind !== "rasterPatch" || eclipsed.items[0]?.kind !== "rasterPatch") {
      throw new Error("expected rasterPatch");
    }
    const o = ordinary.items[0].rgba;
    const t = eclipsed.items[0].rgba;
    let nightSamples = 0;
    for (let i = 0; i < o.length; i += 4) {
      if (o[i + 3]! >= 157) {
        nightSamples += 1;
        expect(t[i + 3]).toBe(o[i + 3]);
      }
    }
    expect(nightSamples).toBeGreaterThan(10);
  });

  it("keeps Normal and Dramatic strong at high solar altitude", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = event.greatestEclipseUtcMs;
    const field = buildSolarEclipseObscurationField(utcMs, event);
    const normal = sampleFinal(utcMs, event.geLatDeg, event.geLonDeg, field, "normal");
    const dramatic = sampleFinal(utcMs, event.geLatDeg, event.geLonDeg, field, "dramatic");
    expect(normal.alt).toBeGreaterThan(20);
    expect(normal.eclipsedA).toBeGreaterThan(100);
    expect(dramatic.eclipsedA).toBeGreaterThan(normal.eclipsedA);
    expect(dramatic.eclipsedA).toBeGreaterThan(140);
  });

  it("stays continuous near the 2022 partial-only terminator", () => {
    const event = requireEvent(PARTIAL_2022);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const sub = subsolarPoint(event.greatestEclipseUtcMs);
    let prevA: number | null = null;
    let maxJump = 0;
    for (let lon = sub.lonDeg - 100; lon <= sub.lonDeg + 20; lon += 0.5) {
      const p = sampleFinal(event.greatestEclipseUtcMs, event.geLatDeg, lon, field, "normal", PARTIAL_2022);
      if (prevA !== null) {
        maxJump = Math.max(maxJump, Math.abs(p.eclipsedA - prevA));
      }
      prevA = p.eclipsedA;
    }
    expect(maxJump).toBeLessThan(20);
  });

  it("stays continuous near the 2023 annular terminator", () => {
    const event = requireEvent(ANNULAR_2023);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const center = sampleFinal(event.greatestEclipseUtcMs, event.geLatDeg, event.geLonDeg, field, "normal", ANNULAR_2023);
    expect(center.eclipsedA).toBeGreaterThan(80);
    expect(center.eclipsedA).toBeLessThan(230);
    const { maxJump } = maxAdjacentAlphaJump(
      event.greatestEclipseUtcMs,
      event.geLatDeg,
      event.geLonDeg - 40,
      event.geLonDeg + 40,
      0.5,
      field,
      ANNULAR_2023,
    );
    expect(maxJump).toBeLessThan(20);
  });

  it("stays continuous across the 2016 dateline and the local terminator", () => {
    const event = requireEvent(DATELINE_2016);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const wrapA = sampleFinal(event.greatestEclipseUtcMs, event.geLatDeg, 179.5, field, "normal", DATELINE_2016);
    const wrapB = sampleFinal(event.greatestEclipseUtcMs, event.geLatDeg, -179.5, field, "normal", DATELINE_2016);
    expect(Math.abs(wrapA.eclipsedA - wrapB.eclipsedA)).toBeLessThan(12);
    const { maxJump } = maxAdjacentAlphaJump(
      event.greatestEclipseUtcMs,
      event.geLatDeg,
      160,
      179.75,
      0.5,
      field,
      DATELINE_2016,
    );
    expect(maxJump).toBeLessThan(20);
  });

  it("stays finite and without a hard latitude ring on the 2021 polar eclipse", () => {
    const event = requireEvent(POLAR_2021);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    let prevA: number | null = null;
    let maxJump = 0;
    for (let lat = event.geLatDeg - 12; lat <= Math.min(90, event.geLatDeg + 12); lat += 0.5) {
      const p = sampleFinal(event.greatestEclipseUtcMs, lat, event.geLonDeg, field, "normal", POLAR_2021);
      expect(Number.isFinite(p.eclipsedA)).toBe(true);
      if (prevA !== null) {
        maxJump = Math.max(maxJump, Math.abs(p.eclipsedA - prevA));
      }
      prevA = p.eclipsedA;
    }
    expect(maxJump).toBeLessThan(24);
  });
});
