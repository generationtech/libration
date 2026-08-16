/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 */

import { describe, expect, it } from "vitest";
import { createTimeContext } from "../core/time";
import { buildEclipseAlignmentPresentation } from "../core/eclipse/eclipseAlignmentPresentation";
import { normalizeEclipseAlignmentPresentation } from "../core/eclipse/eclipseAlignmentAppearance";
import { getSolarEclipseEventById } from "../core/eclipse/eclipseAuthority";
import { resolveEclipseFrame } from "../core/eclipse/eclipseEventService";
import {
  SOLAR_ECLIPSE_ACTIVE_CORRIDOR_STROKE,
  SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL,
  SOLAR_ECLIPSE_FORECAST_CORRIDOR_UMBRA_FILL,
  SOLAR_ECLIPSE_PARTIAL_FILL,
  SOLAR_ECLIPSE_UMBRA_FILL,
} from "../core/eclipse/solarEclipseAppearance";
import { classifySolarEclipseFillFamily } from "../core/eclipse/solarEclipseVisualFamilies";
import { solarEclipseGeometryAt } from "../core/eclipse/solarEclipseGeometry";
import { sublunarPoint } from "../core/sublunarPoint";
import { subsolarPoint } from "../core/subsolarPoint";
import { isEquirectRegionOverlayPayload } from "./equirectRegionPayload";
import { createSolarEclipseLayer } from "./solarEclipseLayer";
import canvasBackendSource from "../renderer/canvasRenderBackend.ts?raw";
import illuminationPlanSource from "../renderer/renderPlan/sceneSolarShadingIlluminationPlan.ts?raw";

const HORIZON_7D = 7 * 86_400_000;
const TOTAL_2017_ID = "nasa-5mcse-solar-9546";
const STATION = {
  upcoming: Date.parse("2017-08-21T14:51:00.000Z"),
  preCentral: Date.parse("2017-08-21T15:56:00.000Z"),
  earlyCentral: Date.parse("2017-08-21T16:58:00.000Z"),
  ge: Date.parse("2017-08-21T18:25:29.700Z"),
  lateCentral: Date.parse("2017-08-21T18:48:44.000Z"),
  postCentral: Date.parse("2017-08-21T20:21:00.000Z"),
  after: Date.parse("2017-08-21T21:10:00.000Z"),
} as const;

const ALIGNMENT_OFF = { enabled: false } as const;
const ALIGNMENT_ON = { enabled: true, solarEnabled: true } as const;

function requireEvent() {
  const event = getSolarEclipseEventById(TOTAL_2017_ID);
  if (!event) {
    throw new Error("missing 2017 total solar eclipse");
  }
  return event;
}

function payloadAt(
  utcMs: number,
  options: {
    horizonDays?: 0 | 7;
    alignment?: typeof ALIGNMENT_OFF | typeof ALIGNMENT_ON;
  } = {},
) {
  const horizonDays = options.horizonDays ?? 7;
  const frame = resolveEclipseFrame(utcMs, { horizonMs: horizonDays * 86_400_000 });
  const st = createSolarEclipseLayer({
    presentation: { forecastHorizonDays: horizonDays },
    alignment: options.alignment ?? ALIGNMENT_OFF,
    labelsEnabled: false,
  }).getState(createTimeContext(utcMs, 0, true, { eclipseFrame: frame }));
  if (!isEquirectRegionOverlayPayload(st.data)) {
    throw new Error("expected equirect region payload");
  }
  return { frame, data: st.data };
}

function fillsIncluding(data: { fills: readonly { fill: string }[] }, token: string): number {
  return data.fills.filter((f) => f.fill.includes(token) || f.fill === token).length;
}

function hasStrokeAlpha(data: { strokes: readonly { stroke: string }[] }, token: string): boolean {
  return data.strokes.some((s) => s.stroke.includes(token) || s.stroke === token);
}

function ringBounds(ring: readonly { latDeg: number; lonDeg: number }[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of ring) {
    minLat = Math.min(minLat, p.latDeg);
    maxLat = Math.max(maxLat, p.latDeg);
    minLon = Math.min(minLon, p.lonDeg);
    maxLon = Math.max(maxLon, p.lonDeg);
  }
  return { minLat, maxLat, minLon, maxLon };
}

function livePartialRing(data: { fills: readonly { ring: readonly { latDeg: number; lonDeg: number }[]; fill: string }[] }) {
  return data.fills.find((f) => f.fill === SOLAR_ECLIPSE_PARTIAL_FILL);
}

function beamTargetAt(utcMs: number) {
  const frame = resolveEclipseFrame(utcMs, { horizonMs: HORIZON_7D });
  const sun = subsolarPoint(utcMs);
  const moon = sublunarPoint(utcMs);
  const view = buildEclipseAlignmentPresentation({
    frame,
    alignment: normalizeEclipseAlignmentPresentation(undefined),
    solarLayerEnabled: true,
    lunarLayerEnabled: false,
    subsolar: { latDeg: sun.latDeg, lonDeg: sun.lonDeg },
    sublunar: { latDeg: moon.latDeg, lonDeg: moon.lonDeg },
  });
  return { frame, view };
}

describe("solar eclipse corridor continuity", () => {
  it("keeps the 2017 corridor from forecast through post-central and drops it after the event", () => {
    const upcoming = payloadAt(STATION.upcoming);
    const pre = payloadAt(STATION.preCentral);
    const central = payloadAt(STATION.ge);
    const post = payloadAt(STATION.postCentral);
    const after = payloadAt(STATION.after);
    expect(upcoming.frame.activeSolar).toBeNull();
    expect(upcoming.frame.forecastSelections[0]?.lifecycle).toBe("upcoming");
    expect(fillsIncluding(upcoming.data, "72, 48, 140")).toBeGreaterThan(0);
    expect(hasStrokeAlpha(upcoming.data, "236, 220, 255")).toBe(true);

    expect(pre.frame.activeSolar?.id).toBe(TOTAL_2017_ID);
    expect(pre.frame.solarGeometry?.centralPoint ?? null).toBeNull();
    expect(pre.data.fills.some((f) => f.fill === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL)).toBe(true);
    expect(pre.data.strokes.some((s) => s.stroke === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_STROKE)).toBe(true);
    expect(hasStrokeAlpha(pre.data, "236, 220, 255")).toBe(true);

    expect(central.frame.solarGeometry?.centralPoint).not.toBeNull();
    expect(central.data.fills.some((f) => f.fill === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL)).toBe(
      true,
    );
    expect(central.data.pointMarkers ?? []).toHaveLength(1);

    expect(post.frame.solarGeometry?.centralPoint ?? null).toBeNull();
    expect(post.data.fills.some((f) => f.fill === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL)).toBe(true);
    expect(hasStrokeAlpha(post.data, "236, 220, 255")).toBe(true);
    expect(post.data.pointMarkers ?? []).toEqual([]);

    expect(after.frame.activeSolar).toBeNull();
    expect(after.frame.upcomingSolar).toEqual([]);
    expect(fillsIncluding(after.data, "72, 48, 140")).toBe(0);
  });

  it("does not use the collapsed 0.12 active-corridor fill", () => {
    const central = payloadAt(STATION.ge);
    expect(central.data.fills.some((f) => f.fill.includes("72, 48, 140, 0.12"))).toBe(false);
    expect(central.data.fills.some((f) => f.fill === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL)).toBe(
      true,
    );
    expect(SOLAR_ECLIPSE_FORECAST_CORRIDOR_UMBRA_FILL).toBe("rgba(72, 48, 140, 0.28)");
  });
});

describe("solar eclipse forecast vs live partial ownership", () => {
  it("shows representative forecast partial only while upcoming", () => {
    const upcoming = payloadAt(STATION.upcoming);
    const pre = payloadAt(STATION.preCentral);
    const ge = payloadAt(STATION.ge);
    expect(upcoming.data.fills.some((f) => classifySolarEclipseFillFamily(f.fill) === "forecast-partial")).toBe(
      true,
    );
    expect(upcoming.data.fills.some((f) => f.fill === SOLAR_ECLIPSE_PARTIAL_FILL)).toBe(false);
    expect(pre.data.fills.some((f) => classifySolarEclipseFillFamily(f.fill) === "forecast-partial")).toBe(
      false,
    );
    expect(pre.data.fills.some((f) => f.fill === SOLAR_ECLIPSE_PARTIAL_FILL)).toBe(true);
    expect(ge.data.fills.some((f) => classifySolarEclipseFillFamily(f.fill) === "forecast-partial")).toBe(
      false,
    );
    expect(ge.data.fills.some((f) => f.fill === SOLAR_ECLIPSE_PARTIAL_FILL)).toBe(true);
  });
});

describe("solar eclipse live partial continuity", () => {
  it("evolves the 2017 live partial region progressively around greatest eclipse", () => {
    const times = [
      STATION.ge - 10 * 60_000,
      STATION.ge - 5 * 60_000,
      STATION.ge,
      STATION.ge + 5 * 60_000,
      STATION.ge + 10 * 60_000,
    ];
    const boxes = times.map((utc) => {
      const { frame, data } = payloadAt(utc);
      expect(frame.activeSolar?.id).toBe(TOTAL_2017_ID);
      expect(frame.solarGeometry?.partialRegion.length).toBeGreaterThan(8);
      const live = livePartialRing(data);
      expect(live).toBeDefined();
      expect(live!.ring).toBe(frame.solarGeometry!.partialRegion);
      return ringBounds(live!.ring);
    });
    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i]).not.toEqual(boxes[i - 1]);
    }
    expect(boxes[2]!.minLon).toBeGreaterThan(boxes[0]!.minLon - 40);
  });
});

describe("solar eclipse beam and marker lifecycle", () => {
  it("omits targeted beam and marker when no central terrestrial target exists", () => {
    for (const utc of [STATION.upcoming, STATION.preCentral, STATION.postCentral, STATION.after]) {
      const { frame, view } = beamTargetAt(utc);
      const { data } = payloadAt(utc, { alignment: ALIGNMENT_ON });
      expect(frame.solarGeometry?.centralPoint ?? null).toBeNull();
      expect(view.solar?.kind === "solar-central").toBe(false);
      expect(view.solar?.target ?? null).toBeNull();
      expect(data.pointMarkers ?? []).toEqual([]);
      if (utc === STATION.preCentral || utc === STATION.postCentral) {
        expect(view.solar).toBeNull();
        expect(data.fills.some((f) => f.fill === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL)).toBe(true);
      }
    }
  });

  it("coincides beam target with the ground marker while the 2017 umbra is on Earth", () => {
    for (const utc of [STATION.earlyCentral, STATION.ge, STATION.lateCentral]) {
      const { frame, view } = beamTargetAt(utc);
      const { data } = payloadAt(utc, { alignment: ALIGNMENT_ON });
      const marker = data.pointMarkers?.[0];
      expect(view.solar?.kind).toBe("solar-central");
      expect(view.solar?.target).not.toBeNull();
      expect(marker).toBeDefined();
      expect(marker!.latDeg).toBe(frame.solarGeometry!.centralPoint!.latDeg);
      expect(marker!.lonDeg).toBe(frame.solarGeometry!.centralPoint!.lonDeg);
      expect(marker!.latDeg).toBeCloseTo(view.solar!.target!.latDeg, 8);
      expect(marker!.lonDeg).toBeCloseTo(view.solar!.target!.lonDeg, 8);
      expect(data.fills.some((f) => f.fill === SOLAR_ECLIPSE_UMBRA_FILL)).toBe(true);
    }
  });
});

describe("solar eclipse small-step lifecycle boundaries", () => {
  it("does not flash corridor or marker across 2017 global and central contacts", () => {
    const event = requireEvent();
    const windows = [
      event.globalStartMs,
      event.globalEndMs,
    ];
    let firstCentral = 0;
    let lastCentral = 0;
    for (let t = event.globalStartMs; t <= event.globalEndMs; t += 30_000) {
      const g = solarEclipseGeometryAt(event, t);
      if (g?.centralPoint) {
        if (!firstCentral) {
          firstCentral = t;
        }
        lastCentral = t;
      }
    }
    expect(firstCentral).toBeGreaterThan(0);
    windows.push(firstCentral, lastCentral);

    for (const boundary of windows) {
      const samples: boolean[] = [];
      for (let t = boundary - 180_000; t <= boundary + 180_000; t += 30_000) {
        const { frame, data } = payloadAt(t);
        const inEvent = t >= event.globalStartMs && t <= event.globalEndMs;
        const hasCorridor = data.fills.some(
          (f) =>
            f.fill === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL ||
            f.fill.includes("72, 48, 140, 0.2"),
        );
        samples.push(hasCorridor);
        if (inEvent && frame.forecastSelections.some((s) => s.event.id === TOTAL_2017_ID)) {
          expect(hasCorridor).toBe(true);
        }
        if (t < event.globalStartMs - 1 || t > event.globalEndMs + 1) {
          expect(frame.activeSolar).toBeNull();
        }
        const wantMarker = Boolean(frame.solarGeometry?.centralPoint);
        expect((data.pointMarkers ?? []).length > 0).toBe(wantMarker);
      }
      expect(samples.length).toBeGreaterThan(8);
    }
  });
});

describe("solar eclipse lifecycle regressions", () => {
  it("keeps 2016 dateline corridor, one marker, and short-arc live geography", () => {
    const utc = Date.parse("2016-03-09T01:57:09.400Z");
    const { frame, data } = payloadAt(utc, { alignment: ALIGNMENT_ON });
    expect(frame.activeSolar?.id).toBeDefined();
    expect(data.fills.some((f) => f.fill === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL)).toBe(true);
    expect(data.pointMarkers).toHaveLength(1);
    expect(data.pointMarkers![0]!.lonDeg).toBeGreaterThan(140);
    expect(data.fills.some((f) => f.fill === SOLAR_ECLIPSE_PARTIAL_FILL)).toBe(true);
  });

  it("keeps 2023 annular corridor, antumbra footprint, and marker without totality fill", () => {
    const utc = Date.parse("2023-10-14T17:59:27.300Z");
    const { frame, data } = payloadAt(utc, { alignment: ALIGNMENT_ON });
    expect(frame.activeSolar?.subtype).toBe("annular");
    expect(frame.solarGeometry?.centralShadowKind).toBe("antumbra");
    expect(data.fills.some((f) => f.fill === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL)).toBe(false);
    expect(data.fills.some((f) => f.fill.includes("176, 96, 36"))).toBe(true);
    expect(data.fills.some((f) => f.fill === SOLAR_ECLIPSE_UMBRA_FILL)).toBe(false);
    expect(data.pointMarkers).toHaveLength(1);
    const { view } = beamTargetAt(utc);
    expect(view.solar?.target).toEqual(frame.solarGeometry?.centralPoint);
  });

  it("does not fabricate a marker, corridor, or targeted beam for the 2022 partial-only event", () => {
    const utc = Date.parse("2022-10-25T11:00:06.900Z");
    const { frame, data } = payloadAt(utc, { alignment: ALIGNMENT_ON, horizonDays: 7 });
    expect(frame.activeSolar?.subtype).toBe("partial");
    expect(frame.solarGeometry?.centralPoint ?? null).toBeNull();
    expect(data.pointMarkers ?? []).toEqual([]);
    expect(data.fills.some((f) => f.fill.includes("72, 48, 140"))).toBe(false);
    expect(data.fills.some((f) => f.fill === SOLAR_ECLIPSE_PARTIAL_FILL)).toBe(true);
    const { view } = beamTargetAt(utc);
    expect(view.solar?.kind).toBe("solar-partial-field");
    expect(view.solar?.target).toBeNull();
  });

  it("follows the 2023 hybrid central point without dropping the corridor", () => {
    const utc = Date.parse("2023-04-20T04:16:00.000Z");
    const { frame, data } = payloadAt(utc, { alignment: ALIGNMENT_ON });
    expect(frame.activeSolar?.subtype).toBe("hybrid");
    expect(frame.solarGeometry?.centralPoint).not.toBeNull();
    expect(data.pointMarkers).toHaveLength(1);
    expect(data.fills.some((f) => f.fill === SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL)).toBe(true);
  });
});

describe("solar eclipse lifecycle containment", () => {
  it("does not teach Canvas or solar shading about eclipse presentation phases", () => {
    expect(canvasBackendSource).not.toMatch(/eclipse/i);
    expect(canvasBackendSource).not.toMatch(/pre-central|post-central|forecastPartial/i);
    expect(illuminationPlanSource).not.toMatch(/solarEclipse|umbra|penumbra/i);
  });
});
