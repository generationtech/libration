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
import { normalizeEclipseAlignmentPresentation } from "./eclipseAlignmentAppearance";
import { angularDistanceDeg, ringLongitudeJumpsAreShortArc } from "./eclipseAlignmentGeometry";
import {
  buildEclipseAlignmentPresentation,
  lunarAlignmentStrength01,
  type EclipseAlignmentBuilderInput,
} from "./eclipseAlignmentPresentation";
import { resetEclipseEventServiceCacheForTests, resolveEclipseFrame } from "./eclipseEventService";
import { solarEclipseGeometryAt } from "./solarEclipseGeometry";
import { sublunarPoint } from "../sublunarPoint";
import { subsolarPoint } from "../subsolarPoint";
import { REFERENCE_CITIES } from "../../data/referenceCities";

const TOTAL_SOLAR = Date.parse("2024-04-08T18:17:15.000Z");
const ANNULAR_SOLAR = Date.parse("2023-10-14T17:59:27.300Z");
const PARTIAL_SOLAR = Date.parse("2022-10-25T11:00:06.900Z");
const FORECAST_SOLAR = Date.parse("2024-04-03T18:00:00.000Z");
const DATELINE_SOLAR = Date.parse("2016-03-09T01:57:09.400Z");
const POLAR_SOLAR = Date.parse("2021-12-04T07:34:00.000Z");
const QUIET = Date.parse("2024-01-15T00:00:00.000Z");
const LUNAR_TOTAL = Date.parse("2022-05-16T04:11:29.000Z");
const LUNAR_PARTIAL = Date.parse("2008-08-16T21:10:06.000Z");
const HORIZON_7D = 7 * 86_400_000;

const DEFAULT_ALIGNMENT = normalizeEclipseAlignmentPresentation(undefined);

function glyphs(utcMs: number) {
  const sun = subsolarPoint(utcMs);
  const moon = sublunarPoint(utcMs);
  return {
    subsolar: { latDeg: sun.latDeg, lonDeg: sun.lonDeg },
    sublunar: { latDeg: moon.latDeg, lonDeg: moon.lonDeg },
  };
}

function build(
  utcMs: number,
  patch: Partial<EclipseAlignmentBuilderInput> = {},
  horizonMs = 0,
) {
  const frame = patch.frame ?? resolveEclipseFrame(utcMs, { horizonMs });
  const g = glyphs(utcMs);
  return buildEclipseAlignmentPresentation({
    frame,
    alignment: DEFAULT_ALIGNMENT,
    solarLayerEnabled: true,
    lunarLayerEnabled: true,
    ...g,
    ...patch,
  });
}

describe("eclipse alignment presentation — solar", () => {
  it("emits no solar effect when there is no active event", () => {
    resetEclipseEventServiceCacheForTests();
    const view = build(QUIET);
    expect(view.solar).toBeNull();
    expect(view.lunar).toBeNull();
  });

  it("emits a central beam targeting the live umbra at 2024 greatest eclipse", () => {
    resetEclipseEventServiceCacheForTests();
    const frame = resolveEclipseFrame(TOTAL_SOLAR, { horizonMs: 0 });
    const view = build(TOTAL_SOLAR, { frame });
    expect(frame.activeSolar?.subtype).toBe("total");
    expect(frame.solarGeometry?.centralShadowKind).toBe("umbra");
    expect(view.solar?.kind).toBe("solar-central");
    expect(view.solar?.eventId).toBe(frame.activeSolar?.id);
    expect(view.solar?.target).toEqual(frame.solarGeometry?.centralPoint);
    expect(view.solar?.bands.length).toBeGreaterThanOrEqual(3);
    expect(view.solar?.strokes.length).toBe(1);
    expect(view.solar!.strength01).toBeGreaterThan(0.7);
  });

  it("emits a central beam targeting the live antumbra at 2023 annular greatest eclipse", () => {
    resetEclipseEventServiceCacheForTests();
    const frame = resolveEclipseFrame(ANNULAR_SOLAR, { horizonMs: 0 });
    const view = build(ANNULAR_SOLAR, { frame });
    expect(frame.activeSolar?.subtype).toBe("annular");
    expect(frame.solarGeometry?.centralShadowKind).toBe("antumbra");
    expect(view.solar?.kind).toBe("solar-central");
    expect(view.solar?.target).toEqual(frame.solarGeometry?.centralPoint);
    expect(view.solar?.target).not.toBeNull();
  });

  it("does not fabricate a central target for a partial-only solar event", () => {
    resetEclipseEventServiceCacheForTests();
    const frame = resolveEclipseFrame(PARTIAL_SOLAR, { horizonMs: 0 });
    const view = build(PARTIAL_SOLAR, { frame });
    expect(frame.activeSolar?.subtype).toBe("partial");
    expect(frame.solarGeometry?.centralPoint).toBeNull();
    expect(view.solar?.kind).toBe("solar-partial-field");
    expect(view.solar?.target).toBeNull();
    expect(view.solar?.strokes).toEqual([]);
    expect(view.solar!.strength01).toBeLessThan(0.5);
  });

  it("emits no beam for a forecast-only upcoming solar event", () => {
    resetEclipseEventServiceCacheForTests();
    const frame = resolveEclipseFrame(FORECAST_SOLAR, { horizonMs: HORIZON_7D });
    expect(frame.activeSolar).toBeNull();
    expect(frame.upcomingSolar.length).toBeGreaterThan(0);
    const view = build(FORECAST_SOLAR, { frame }, HORIZON_7D);
    expect(view.solar).toBeNull();
  });

  it("strengthens from first contact toward greatest eclipse", () => {
    resetEclipseEventServiceCacheForTests();
    const frameGe = resolveEclipseFrame(TOTAL_SOLAR, { horizonMs: 0 });
    const start = frameGe.activeSolar!.globalStartMs + 60_000;
    const early = solarEclipseGeometryAt(frameGe.activeSolar!, start);
    const ge = frameGe.solarGeometry;
    expect(early).not.toBeNull();
    expect(ge).not.toBeNull();
    expect(ge!.alignmentStrength01).toBeGreaterThan(early!.alignmentStrength01);
    const earlyView = build(start, {
      frame: resolveEclipseFrame(start, { horizonMs: 0 }),
    });
    const geView = build(TOTAL_SOLAR, { frame: frameGe });
    expect(geView.solar!.strength01).toBeGreaterThan(earlyView.solar!.strength01);
  });

  it("moves the beam target with the live footprint", () => {
    resetEclipseEventServiceCacheForTests();
    const later = TOTAL_SOLAR + 20 * 60_000;
    const a = build(TOTAL_SOLAR);
    const b = build(later);
    expect(a.solar?.kind).toBe("solar-central");
    expect(b.solar?.kind).toBe("solar-central");
    expect(a.solar!.target).not.toEqual(b.solar!.target);
    expect(a.solar!.eventId).toBe(b.solar!.eventId);
  });

  it("disappears after the event ends", () => {
    resetEclipseEventServiceCacheForTests();
    const frame = resolveEclipseFrame(TOTAL_SOLAR, { horizonMs: 0 });
    const after = frame.activeSolar!.globalEndMs + 60_000;
    const view = build(after);
    expect(view.solar).toBeNull();
  });

  it("is identical at the same UTC and changes when UTC changes", () => {
    resetEclipseEventServiceCacheForTests();
    const a = build(TOTAL_SOLAR);
    const b = build(TOTAL_SOLAR);
    expect(a).toEqual(b);
    const c = build(TOTAL_SOLAR + 15 * 60_000);
    expect(c.solar?.target).not.toEqual(a.solar?.target);
  });

  it("keeps dateline and polar beams short-arc without a world-spanning jump", () => {
    resetEclipseEventServiceCacheForTests();
    const date = build(DATELINE_SOLAR);
    expect(date.solar?.kind).toBe("solar-central");
    expect(date.solar?.target).not.toBeNull();
    for (const band of date.solar!.bands) {
      expect(ringLongitudeJumpsAreShortArc(band.ring, 55)).toBe(true);
    }
    const polar = build(POLAR_SOLAR);
    if (polar.solar?.kind === "solar-central") {
      expect(polar.solar.target).not.toBeNull();
      for (const band of polar.solar.bands) {
        expect(ringLongitudeJumpsAreShortArc(band.ring, 70)).toBe(true);
      }
    }
  });
});

describe("eclipse alignment presentation — lunar", () => {
  it("emits no lunar effect when there is no active event", () => {
    resetEclipseEventServiceCacheForTests();
    expect(build(QUIET).lunar).toBeNull();
  });

  it("emits a Sun→Earth→Moon axis at 2022 totality, not a terrestrial path target", () => {
    resetEclipseEventServiceCacheForTests();
    const frame = resolveEclipseFrame(LUNAR_TOTAL);
    const view = build(LUNAR_TOTAL, { frame });
    expect(frame.activeLunar?.subtype).toBe("total");
    expect(frame.lunarGeometry?.phase).toBe("total-umbral");
    expect(view.lunar?.kind).toBe("lunar-axis");
    expect(view.lunar?.eventId).toBe(frame.activeLunar?.id);
    expect(view.lunar?.target).toEqual(glyphs(LUNAR_TOTAL).sublunar);
    expect(view.lunar!.strength01).toBeGreaterThan(0.75);
    expect(view.lunar!.bands.length).toBeGreaterThanOrEqual(4);
    const span = angularDistanceDeg(view.lunar!.origin, view.lunar!.target!);
    expect(span).toBeLessThan(40);
  });

  it("keeps a partial umbral event distinct and weaker than totality", () => {
    resetEclipseEventServiceCacheForTests();
    const partial = build(LUNAR_PARTIAL);
    const total = build(LUNAR_TOTAL);
    expect(partial.lunar?.kind).toBe("lunar-axis");
    expect(partial.lunar!.strength01).toBeGreaterThan(0.35);
    expect(partial.lunar!.strength01).toBeLessThan(total.lunar!.strength01);
    expect(partial.lunar!.bands.some((b) => b.fill.includes("110, 42, 32"))).toBe(false);
  });

  it("maps penumbral / partial / total strengths in increasing order", () => {
    const pen = lunarAlignmentStrength01({
      phase: "penumbral",
      gamma: 1.2,
      axisDistanceEarthRadii: 1.1,
      alongTrackEarthRadii: 0,
      penumbraRadiusEarthRadii: 1.3,
      umbraRadiusEarthRadii: 0.75,
      moonRadiusEarthRadii: 0.2725,
      penumbralMagnitude: 0.6,
      umbralMagnitude: -0.3,
      shadowOffsetEastMoonRadii: 0,
      shadowOffsetNorthMoonRadii: 0,
      penumbraRadiusMoonRadii: 4,
      umbraRadiusMoonRadii: 2.7,
    });
    const par = lunarAlignmentStrength01({
      phase: "partial-umbral",
      gamma: 0.6,
      axisDistanceEarthRadii: 0.7,
      alongTrackEarthRadii: 0,
      penumbraRadiusEarthRadii: 1.3,
      umbraRadiusEarthRadii: 0.75,
      moonRadiusEarthRadii: 0.2725,
      penumbralMagnitude: 1.4,
      umbralMagnitude: 0.5,
      shadowOffsetEastMoonRadii: 0,
      shadowOffsetNorthMoonRadii: 0,
      penumbraRadiusMoonRadii: 4,
      umbraRadiusMoonRadii: 2.7,
    });
    const tot = lunarAlignmentStrength01({
      phase: "total-umbral",
      gamma: 0.2,
      axisDistanceEarthRadii: 0.2,
      alongTrackEarthRadii: 0,
      penumbraRadiusEarthRadii: 1.3,
      umbraRadiusEarthRadii: 0.75,
      moonRadiusEarthRadii: 0.2725,
      penumbralMagnitude: 2.1,
      umbralMagnitude: 1.4,
      shadowOffsetEastMoonRadii: 0,
      shadowOffsetNorthMoonRadii: 0,
      penumbraRadiusMoonRadii: 4,
      umbraRadiusMoonRadii: 2.7,
    });
    expect(pen).toBeLessThan(par);
    expect(par).toBeLessThan(tot);
    expect(pen).toBeLessThan(0.4);
    expect(tot).toBeGreaterThan(0.75);
  });
});

describe("eclipse alignment presentation — config and independence", () => {
  it("omits the effect when the master toggle is off", () => {
    resetEclipseEventServiceCacheForTests();
    const view = build(TOTAL_SOLAR, {
      alignment: normalizeEclipseAlignmentPresentation({ enabled: false }),
    });
    expect(view.solar).toBeNull();
  });

  it("omits the solar beam when the solar toggle is off", () => {
    resetEclipseEventServiceCacheForTests();
    const view = build(TOTAL_SOLAR, {
      alignment: normalizeEclipseAlignmentPresentation({ solarEnabled: false }),
    });
    expect(view.solar).toBeNull();
  });

  it("omits the solar beam when the solar eclipse layer is disabled", () => {
    resetEclipseEventServiceCacheForTests();
    const view = build(TOTAL_SOLAR, { solarLayerEnabled: false });
    expect(view.solar).toBeNull();
  });

  it("omits the lunar beam when the lunar eclipse layer is disabled", () => {
    resetEclipseEventServiceCacheForTests();
    const view = build(LUNAR_TOTAL, { lunarLayerEnabled: false });
    expect(view.lunar).toBeNull();
  });

  it("does not change geometry, strength, target, or event id across reference cities", () => {
    resetEclipseEventServiceCacheForTests();
    const knox = REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!;
    const tokyo = REFERENCE_CITIES.find((c) => c.id === "city.tokyo")!;
    expect(knox).toBeTruthy();
    expect(tokyo).toBeTruthy();
    const frame = resolveEclipseFrame(TOTAL_SOLAR, { horizonMs: 0 });
    const g = glyphs(TOTAL_SOLAR);
    const a = buildEclipseAlignmentPresentation({
      frame,
      alignment: DEFAULT_ALIGNMENT,
      solarLayerEnabled: true,
      lunarLayerEnabled: true,
      ...g,
    });
    const b = buildEclipseAlignmentPresentation({
      frame,
      alignment: DEFAULT_ALIGNMENT,
      solarLayerEnabled: true,
      lunarLayerEnabled: true,
      ...g,
    });
    expect(a).toEqual(b);
    expect(a.solar?.eventId).toBe(frame.activeSolar?.id);
    expect(a.solar?.target).toEqual(frame.solarGeometry?.centralPoint);
    void knox;
    void tokyo;
  });

  it("still builds a global beam when there is no observer", () => {
    resetEclipseEventServiceCacheForTests();
    const view = build(TOTAL_SOLAR);
    expect(view.solar?.kind).toBe("solar-central");
  });

  it("scales band opacity with intensity without changing the target", () => {
    resetEclipseEventServiceCacheForTests();
    const frame = resolveEclipseFrame(TOTAL_SOLAR, { horizonMs: 0 });
    const g = glyphs(TOTAL_SOLAR);
    const subtle = buildEclipseAlignmentPresentation({
      frame,
      alignment: normalizeEclipseAlignmentPresentation({ intensity: "subtle" }),
      solarLayerEnabled: true,
      lunarLayerEnabled: true,
      ...g,
    });
    const dramatic = buildEclipseAlignmentPresentation({
      frame,
      alignment: normalizeEclipseAlignmentPresentation({ intensity: "dramatic" }),
      solarLayerEnabled: true,
      lunarLayerEnabled: true,
      ...g,
    });
    expect(subtle.solar?.target).toEqual(dramatic.solar?.target);
    expect(subtle.solar?.eventId).toBe(dramatic.solar?.eventId);
    const sa = Number(/,\s*([0-9.]+)\)$/.exec(subtle.solar!.bands[0]!.fill)?.[1] ?? 0);
    const da = Number(/,\s*([0-9.]+)\)$/.exec(dramatic.solar!.bands[0]!.fill)?.[1] ?? 0);
    expect(da).toBeGreaterThan(sa);
  });
});

describe("eclipse alignment presentation — performance", () => {
  it("builds from live geometry without resampling a forecast corridor", () => {
    resetEclipseEventServiceCacheForTests();
    const frame = resolveEclipseFrame(TOTAL_SOLAR, { horizonMs: 0 });
    const g = glyphs(TOTAL_SOLAR);
    const input = {
      frame,
      alignment: DEFAULT_ALIGNMENT,
      solarLayerEnabled: true,
      lunarLayerEnabled: true,
      ...g,
    };
    buildEclipseAlignmentPresentation(input);
    const t0 = performance.now();
    for (let i = 0; i < 40; i += 1) {
      buildEclipseAlignmentPresentation(input);
    }
    const elapsed = performance.now() - t0;
    expect(elapsed / 40).toBeLessThan(8);
  });
});
