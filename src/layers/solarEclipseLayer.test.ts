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
import { createTimeContext } from "../core/time";
import { buildEclipseAlignmentPresentation } from "../core/eclipse/eclipseAlignmentPresentation";
import { normalizeEclipseAlignmentPresentation } from "../core/eclipse/eclipseAlignmentAppearance";
import { resolveEclipseFrame } from "../core/eclipse/eclipseEventService";
import {
  DEFAULT_SOLAR_LIVE_GROUND_POSITION_COLOR,
  SOLAR_ECLIPSE_UMBRA_FILL,
} from "../core/eclipse/solarEclipseAppearance";
import { sublunarPoint } from "../core/sublunarPoint";
import { subsolarPoint } from "../core/subsolarPoint";
import { isEquirectRegionOverlayPayload } from "./equirectRegionPayload";
import { createSolarEclipseLayer } from "./solarEclipseLayer";
import canvasBackendSource from "../renderer/canvasRenderBackend.ts?raw";

const TOTAL_UTC = Date.parse("2024-04-08T18:17:15.000Z");
const PARTIAL_UTC = Date.parse("2022-10-25T11:00:06.900Z");
const FORECAST_UTC = Date.parse("2024-04-03T18:00:00.000Z");
const QUIET_UTC = Date.parse("2024-01-15T00:00:00.000Z");
const HORIZON_7D = 7 * 86_400_000;

function fillCount(data: unknown): number {
  return isEquirectRegionOverlayPayload(data) ? data.fills.length : -1;
}

function strokeCount(data: unknown): number {
  return isEquirectRegionOverlayPayload(data) ? data.strokes.length : -1;
}

const ALIGNMENT_OFF = { enabled: false } as const;

describe("solar eclipse layer", () => {
  it("emits no region primitives when there is no eclipse and no forecast", () => {
    const layer = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
    });
    const st = layer.getState(createTimeContext(QUIET_UTC, 0, true));
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    expect(fillCount(st.data)).toBe(0);
    expect(strokeCount(st.data)).toBe(0);
  });

  it("emits forecast corridor and no live umbra several days before 2024-04-08", () => {
    const layer = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
    });
    const frame = resolveEclipseFrame(FORECAST_UTC, { horizonMs: HORIZON_7D });
    const st = layer.getState(
      createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }),
    );
    expect(frame.activeSolar).toBeNull();
    expect(frame.upcomingSolar[0]?.id).toBe("nasa-5mcse-solar-9561");
    expect(fillCount(st.data)).toBeGreaterThan(0);
    expect(strokeCount(st.data)).toBeGreaterThan(0);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills.some((f) => f.fill.includes("0.42"))).toBe(false);
    }
  });

  it("emits live primitives plus corridor context when the event is active and horizon is on", () => {
    const layer = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
    });
    const frame = resolveEclipseFrame(TOTAL_UTC, { horizonMs: HORIZON_7D });
    const st = layer.getState(createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame }));
    expect(frame.activeSolar?.id).toBe("nasa-5mcse-solar-9561");
    expect(fillCount(st.data)).toBeGreaterThan(2);
    expect(strokeCount(st.data)).toBeGreaterThanOrEqual(1);
  });

  it("emits partial, umbral band, and centerline at 2024 greatest eclipse with live-only horizon", () => {
    const layer = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
    });
    const frame = resolveEclipseFrame(TOTAL_UTC, { horizonMs: 0 });
    const st = layer.getState(
      createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame }),
    );
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    expect(fillCount(st.data)).toBe(2);
    expect(strokeCount(st.data)).toBe(1);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills[0]!.ring.length).toBeGreaterThan(4);
      expect(st.data.fills[1]!.ring.length).toBeGreaterThan(4);
    }
  });

  it("omits central band and centerline for a partial-only event", () => {
    const layer = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
    });
    const st = layer.getState(createTimeContext(PARTIAL_UTC, 0, true));
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    expect(fillCount(st.data)).toBe(1);
    expect(strokeCount(st.data)).toBe(0);
  });

  it("emits a partial forecast region and no corridor for an upcoming partial-only event", () => {
    const utc = Date.parse("2022-10-20T11:00:00.000Z");
    const layer = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
    });
    const frame = resolveEclipseFrame(utc, { horizonMs: HORIZON_7D });
    const st = layer.getState(createTimeContext(utc, 0, true, { eclipseFrame: frame }));
    expect(frame.upcomingSolar[0]?.subtype).toBe("partial");
    expect(frame.forecastSelections[0]?.geometry.corridorBands).toEqual([]);
    expect(fillCount(st.data)).toBeGreaterThan(0);
    expect(strokeCount(st.data)).toBe(0);
  });

  it("honors independent presentation toggles", () => {
    const layer = createSolarEclipseLayer({
      presentation: {
        showCentralLine: false,
        showCentralBand: false,
        showPartialRegion: true,
        showForecastCorridor: false,
        showForecastPartialRegion: false,
        forecastHorizonDays: 0,
      },
      alignment: ALIGNMENT_OFF,
    });
    const st = layer.getState(createTimeContext(TOTAL_UTC, 0, true));
    expect(fillCount(st.data)).toBe(1);
    expect(strokeCount(st.data)).toBe(0);
  });

  it("emits nothing when forecast toggles are off and there is no live event", () => {
    const layer = createSolarEclipseLayer({
      presentation: {
        showForecastCorridor: false,
        showForecastPartialRegion: false,
        showCentralLine: false,
        forecastHorizonDays: 7,
      },
      alignment: ALIGNMENT_OFF,
    });
    const frame = resolveEclipseFrame(FORECAST_UTC, { horizonMs: HORIZON_7D });
    const st = layer.getState(
      createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }),
    );
    expect(fillCount(st.data)).toBe(0);
    expect(strokeCount(st.data)).toBe(0);
  });

  it("drops forecast primitives when the horizon no longer includes the event", () => {
    const layer = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 1 },
      alignment: ALIGNMENT_OFF,
    });
    const frame = resolveEclipseFrame(FORECAST_UTC, { horizonMs: 86_400_000 });
    const st = layer.getState(
      createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }),
    );
    expect(frame.upcomingSolar).toEqual([]);
    expect(fillCount(st.data)).toBe(0);
  });

  it("adds alignment bands on an active total without replacing the live umbra", () => {
    const off = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
    });
    const on = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: { enabled: true, solarEnabled: true },
    });
    const frame = resolveEclipseFrame(TOTAL_UTC, { horizonMs: 0 });
    const time = createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame });
    const without = off.getState(time);
    const withBeam = on.getState(time);
    expect(fillCount(withBeam.data)).toBeGreaterThan(fillCount(without.data));
    expect(strokeCount(withBeam.data)).toBeGreaterThan(strokeCount(without.data));
    if (isEquirectRegionOverlayPayload(withBeam.data) && isEquirectRegionOverlayPayload(without.data)) {
      expect(withBeam.data.fills.some((f) => f.fill === SOLAR_ECLIPSE_UMBRA_FILL || f.fill.includes("48, 28, 92"))).toBe(
        true,
      );
      expect(without.data.fills.length).toBe(2);
    }
  });

  it("does not emit a beam for a forecast-only instant", () => {
    const layer = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: { enabled: true },
    });
    const frame = resolveEclipseFrame(FORECAST_UTC, { horizonMs: HORIZON_7D });
    const st = layer.getState(createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }));
    const off = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
    }).getState(createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }));
    expect(fillCount(st.data)).toBe(fillCount(off.data));
    expect(strokeCount(st.data)).toBe(strokeCount(off.data));
  });

  it("hides a filtered-out total without changing authority truth", () => {
    const frame = resolveEclipseFrame(FORECAST_UTC, { horizonMs: HORIZON_7D });
    expect(frame.upcomingSolar[0]?.subtype).toBe("total");
    const hidden = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7, showTypeTotal: false },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }));
    expect(fillCount(hidden.data)).toBe(0);
    expect(frame.upcomingSolar[0]?.id).toBe("nasa-5mcse-solar-9561");
  });

  it("keeps solar forecast paint independent of a custom live band color", () => {
    const frame = resolveEclipseFrame(FORECAST_UTC, { horizonMs: HORIZON_7D });
    const def = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }));
    const custom = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7, liveCentralBandColor: "#ff0000" },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }));
    if (isEquirectRegionOverlayPayload(def.data) && isEquirectRegionOverlayPayload(custom.data)) {
      expect(custom.data.fills.map((f) => f.fill)).toEqual(def.data.fills.map((f) => f.fill));
    }
  });
});

function markersOf(data: unknown) {
  return isEquirectRegionOverlayPayload(data) ? (data.pointMarkers ?? []) : [];
}

function beamTargetAt(utcMs: number) {
  const frame = resolveEclipseFrame(utcMs, { horizonMs: 0 });
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
  return { frame, target: view.solar?.target ?? null };
}

const TOTAL_2017_EARLY = Date.parse("2017-08-21T17:16:44.000Z");
const TOTAL_2017_MID = Date.parse("2017-08-21T18:25:30.000Z");
const TOTAL_2017_LATE = Date.parse("2017-08-21T18:48:44.000Z");
const TOTAL_2017_FORECAST = Date.parse("2017-08-16T18:00:00.000Z");
const TOTAL_2017_AFTER = Date.parse("2017-08-22T00:00:00.000Z");
const ANNULAR_UTC = Date.parse("2023-10-14T17:59:27.300Z");
const HYBRID_UTC = Date.parse("2023-04-20T04:16:00.000Z");
const DATELINE_UTC = Date.parse("2016-03-09T01:57:09.400Z");
const POLAR_UTC = Date.parse("2021-12-04T07:34:00.000Z");

describe("solar eclipse live ground-position marker", () => {
  it("emits a marker at the authoritative central point for a total eclipse", () => {
    const frame = resolveEclipseFrame(TOTAL_UTC, { horizonMs: 0 });
    const st = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame }));
    const markers = markersOf(st.data);
    expect(frame.solarGeometry?.centralPoint).not.toBeNull();
    expect(markers).toHaveLength(1);
    expect(markers[0]?.latDeg).toBe(frame.solarGeometry!.centralPoint!.latDeg);
    expect(markers[0]?.lonDeg).toBe(frame.solarGeometry!.centralPoint!.lonDeg);
    expect(markers[0]?.radiusScale).toBe(1);
    expect(markers[0]?.fill).toContain("212, 90, 60");
  });

  it("emits a marker for annular and hybrid central events", () => {
    for (const utc of [ANNULAR_UTC, HYBRID_UTC]) {
      const frame = resolveEclipseFrame(utc, { horizonMs: 0 });
      const st = createSolarEclipseLayer({
        presentation: { forecastHorizonDays: 0 },
        alignment: ALIGNMENT_OFF,
        labelsEnabled: false,
      }).getState(createTimeContext(utc, 0, true, { eclipseFrame: frame }));
      expect(frame.solarGeometry?.centralPoint).not.toBeNull();
      expect(markersOf(st.data)).toHaveLength(1);
      expect(markersOf(st.data)[0]?.latDeg).toBe(frame.solarGeometry!.centralPoint!.latDeg);
      expect(markersOf(st.data)[0]?.lonDeg).toBe(frame.solarGeometry!.centralPoint!.lonDeg);
    }
    expect(resolveEclipseFrame(ANNULAR_UTC, { horizonMs: 0 }).activeSolar?.subtype).toBe("annular");
    expect(resolveEclipseFrame(HYBRID_UTC, { horizonMs: 0 }).activeSolar?.subtype).toBe("hybrid");
  });

  it("does not fabricate a marker for partial-only, upcoming, or completed events", () => {
    const cases = [
      { utc: PARTIAL_UTC, horizon: 0 },
      { utc: TOTAL_2017_FORECAST, horizon: HORIZON_7D },
      { utc: TOTAL_2017_AFTER, horizon: HORIZON_7D },
      { utc: FORECAST_UTC, horizon: HORIZON_7D },
    ];
    for (const { utc, horizon } of cases) {
      const frame = resolveEclipseFrame(utc, { horizonMs: horizon });
      const st = createSolarEclipseLayer({
        presentation: { forecastHorizonDays: horizon === 0 ? 0 : 7 },
        alignment: ALIGNMENT_OFF,
        labelsEnabled: false,
      }).getState(createTimeContext(utc, 0, true, { eclipseFrame: frame }));
      expect(frame.solarGeometry?.centralPoint ?? null).toBeNull();
      expect(markersOf(st.data)).toEqual([]);
    }
  });

  it("moves Oregon → Kentucky → Carolinas on 2017-08-21 with product UTC", () => {
    const stations = [
      {
        utc: TOTAL_2017_EARLY,
        lat: [43.5, 46.5],
        lon: [-125.5, -119.5],
      },
      {
        utc: TOTAL_2017_MID,
        lat: [35.5, 38.5],
        lon: [-90.5, -85.5],
      },
      {
        utc: TOTAL_2017_LATE,
        lat: [32.0, 35.5],
        lon: [-82.0, -75.5],
      },
    ] as const;
    const points = stations.map(({ utc }) => {
      const frame = resolveEclipseFrame(utc, { horizonMs: 0 });
      const st = createSolarEclipseLayer({
        presentation: { forecastHorizonDays: 0 },
        alignment: ALIGNMENT_OFF,
        labelsEnabled: false,
      }).getState(createTimeContext(utc, 0, true, { eclipseFrame: frame }));
      const marker = markersOf(st.data)[0];
      expect(marker).toBeDefined();
      expect(marker!.latDeg).toBe(frame.solarGeometry!.centralPoint!.latDeg);
      expect(marker!.lonDeg).toBe(frame.solarGeometry!.centralPoint!.lonDeg);
      return marker!;
    });
    expect(points[0]!.latDeg).toBeGreaterThanOrEqual(stations[0].lat[0]);
    expect(points[0]!.latDeg).toBeLessThanOrEqual(stations[0].lat[1]);
    expect(points[0]!.lonDeg).toBeGreaterThanOrEqual(stations[0].lon[0]);
    expect(points[0]!.lonDeg).toBeLessThanOrEqual(stations[0].lon[1]);
    expect(points[1]!.latDeg).toBeGreaterThanOrEqual(stations[1].lat[0]);
    expect(points[1]!.latDeg).toBeLessThanOrEqual(stations[1].lat[1]);
    expect(points[1]!.lonDeg).toBeGreaterThanOrEqual(stations[1].lon[0]);
    expect(points[1]!.lonDeg).toBeLessThanOrEqual(stations[1].lon[1]);
    expect(points[2]!.latDeg).toBeGreaterThanOrEqual(stations[2].lat[0]);
    expect(points[2]!.latDeg).toBeLessThanOrEqual(stations[2].lat[1]);
    expect(points[2]!.lonDeg).toBeGreaterThanOrEqual(stations[2].lon[0]);
    expect(points[2]!.lonDeg).toBeLessThanOrEqual(stations[2].lon[1]);
    expect(points[1]!.lonDeg).toBeGreaterThan(points[0]!.lonDeg);
    expect(points[2]!.lonDeg).toBeGreaterThan(points[1]!.lonDeg);
    expect(points[0]!.latDeg).toBeGreaterThan(points[1]!.latDeg);
    expect(points[1]!.latDeg).toBeGreaterThan(points[2]!.latDeg);
  });

  it("coincides with the alignment beam target at 2017 GE and 2024 GE", () => {
    for (const utc of [TOTAL_2017_MID, TOTAL_UTC]) {
      const { frame, target } = beamTargetAt(utc);
      const st = createSolarEclipseLayer({
        presentation: { forecastHorizonDays: 0 },
        alignment: ALIGNMENT_OFF,
        labelsEnabled: false,
      }).getState(createTimeContext(utc, 0, true, { eclipseFrame: frame }));
      const marker = markersOf(st.data)[0];
      expect(target).not.toBeNull();
      expect(marker).toBeDefined();
      expect(marker!.latDeg).toBeCloseTo(target!.latDeg, 8);
      expect(marker!.lonDeg).toBeCloseTo(target!.lonDeg, 8);
      expect(marker!.latDeg).toBe(frame.solarGeometry!.centralPoint!.latDeg);
      expect(marker!.lonDeg).toBe(frame.solarGeometry!.centralPoint!.lonDeg);
    }
  });

  it("keeps the marker at the 2016 dateline and 2021 polar central points", () => {
    const dateline = resolveEclipseFrame(DATELINE_UTC, { horizonMs: 0 });
    const polar = resolveEclipseFrame(POLAR_UTC, { horizonMs: 0 });
    const datelineSt = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(createTimeContext(DATELINE_UTC, 0, true, { eclipseFrame: dateline }));
    const polarSt = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(createTimeContext(POLAR_UTC, 0, true, { eclipseFrame: polar }));
    expect(markersOf(datelineSt.data)[0]?.lonDeg).toBe(dateline.solarGeometry!.centralPoint!.lonDeg);
    expect(markersOf(datelineSt.data)[0]!.lonDeg).toBeGreaterThan(140);
    expect(markersOf(polarSt.data)[0]?.latDeg).toBe(polar.solarGeometry!.centralPoint!.latDeg);
    expect(markersOf(polarSt.data)[0]!.latDeg).toBeLessThan(-60);
  });

  it("omits the marker when the toggle is off without changing live geography", () => {
    const frame = resolveEclipseFrame(TOTAL_UTC, { horizonMs: 0 });
    const on = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame }));
    const off = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0, showLiveGroundPosition: false },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame }));
    expect(markersOf(on.data)).toHaveLength(1);
    expect(markersOf(off.data)).toEqual([]);
    if (isEquirectRegionOverlayPayload(on.data) && isEquirectRegionOverlayPayload(off.data)) {
      expect(off.data.fills.map((f) => f.fill)).toEqual(on.data.fills.map((f) => f.fill));
      expect(off.data.strokes.map((s) => s.stroke)).toEqual(on.data.strokes.map((s) => s.stroke));
    }
  });

  it("changes only presentation when size or color changes", () => {
    const frame = resolveEclipseFrame(TOTAL_UTC, { horizonMs: 0 });
    const time = createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame });
    const def = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(time);
    const sized = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0, liveGroundPositionSize: "large" },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(time);
    const colored = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 0, liveGroundPositionColor: "#22aa88" },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    }).getState(time);
    expect(markersOf(sized.data)[0]?.radiusScale).toBeCloseTo(1.45);
    expect(markersOf(def.data)[0]?.radiusScale).toBe(1);
    expect(markersOf(colored.data)[0]?.fill).not.toBe(markersOf(def.data)[0]?.fill);
    expect(markersOf(sized.data)[0]?.latDeg).toBe(markersOf(def.data)[0]?.latDeg);
    expect(markersOf(colored.data)[0]?.lonDeg).toBe(markersOf(def.data)[0]?.lonDeg);
    if (isEquirectRegionOverlayPayload(def.data) && isEquirectRegionOverlayPayload(sized.data)) {
      expect(sized.data.fills.map((f) => f.fill)).toEqual(def.data.fills.map((f) => f.fill));
    }
    expect(DEFAULT_SOLAR_LIVE_GROUND_POSITION_COLOR).toBe("#d45a3c");
  });
});

describe("Canvas eclipse containment", () => {
  it("does not mention eclipse astronomy in the Canvas backend", () => {
    expect(canvasBackendSource).not.toMatch(/eclipse/i);
    expect(canvasBackendSource).not.toMatch(/besselian/i);
    expect(canvasBackendSource).not.toMatch(/umbra|antumbra|penumbra/i);
    expect(canvasBackendSource).not.toMatch(/forecast/i);
    expect(canvasBackendSource).toMatch(/isEquirectRegionOverlayPayload/);
  });
});
