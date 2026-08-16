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
import { resolveEclipseFrame } from "../core/eclipse/eclipseEventService";
import { SOLAR_ECLIPSE_UMBRA_FILL } from "../core/eclipse/solarEclipseAppearance";
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

describe("Canvas eclipse containment", () => {
  it("does not mention eclipse astronomy in the Canvas backend", () => {
    expect(canvasBackendSource).not.toMatch(/eclipse/i);
    expect(canvasBackendSource).not.toMatch(/besselian/i);
    expect(canvasBackendSource).not.toMatch(/umbra|antumbra|penumbra/i);
    expect(canvasBackendSource).not.toMatch(/forecast/i);
    expect(canvasBackendSource).toMatch(/isEquirectRegionOverlayPayload/);
  });
});
