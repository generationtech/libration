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
import { isEquirectRegionOverlayPayload } from "./equirectRegionPayload";
import { createLunarEclipseLayer } from "./lunarEclipseLayer";
import { sublunarPoint } from "../core/sublunarPoint";
import canvasBackendSource from "../renderer/canvasRenderBackend.ts?raw";

const TOTAL_UTC = Date.parse("2022-05-16T04:11:29.000Z");
const FORECAST_UTC = Date.parse("2022-05-13T04:00:00.000Z");
const PARTIAL_FORECAST_UTC = Date.parse("2008-08-13T21:00:00.000Z");
const QUIET_UTC = Date.parse("2024-01-15T00:00:00.000Z");
const GE_2029 = Date.parse("2029-06-26T03:22:05.000Z");
const HORIZON_7D = 7 * 86_400_000;

const ALIGNMENT_OFF = { enabled: false } as const;

describe("lunar eclipse layer", () => {
  it("emits no region primitives when there is no active lunar eclipse", () => {
    const layer = createLunarEclipseLayer({ alignment: ALIGNMENT_OFF });
    const st = layer.getState(createTimeContext(QUIET_UTC, 0, true));
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills).toHaveLength(0);
      expect(st.data.strokes).toHaveLength(0);
    }
  });

  it("emits no Moon-visible fill or horizon boundary at 2022 totality", () => {
    const layer = createLunarEclipseLayer({ alignment: ALIGNMENT_OFF });
    const frame = resolveEclipseFrame(TOTAL_UTC);
    const st = layer.getState(createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame }));
    expect(frame.activeLunar?.subtype).toBe("total");
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills).toHaveLength(0);
      expect(st.data.strokes).toHaveLength(0);
      expect(st.data.labelPathHints).toBeUndefined();
    }
  });

  it("emits no Moon-visible geography for upcoming or active events", () => {
    const layer = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
    });
    const upcomingFrame = resolveEclipseFrame(FORECAST_UTC, { lunarHorizonMs: HORIZON_7D });
    const activeFrame = resolveEclipseFrame(TOTAL_UTC);
    const upcoming = layer.getState(
      createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: upcomingFrame }),
    );
    const active = layer.getState(createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: activeFrame }));
    const quiet = layer.getState(createTimeContext(QUIET_UTC, 0, true));
    if (
      isEquirectRegionOverlayPayload(upcoming.data) &&
      isEquirectRegionOverlayPayload(active.data) &&
      isEquirectRegionOverlayPayload(quiet.data)
    ) {
      expect(upcoming.data.fills).toHaveLength(0);
      expect(upcoming.data.strokes).toHaveLength(0);
      expect(active.data.fills).toHaveLength(0);
      expect(active.data.strokes).toHaveLength(0);
      expect(quiet.data.fills).toHaveLength(0);
      expect(quiet.data.strokes).toHaveLength(0);
    }
  });

  it("keeps labels during a live-only active event and omits upcoming", () => {
    const layer = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: true,
    });
    const upcoming = layer.getState(
      createTimeContext(FORECAST_UTC, 0, true, {
        eclipseFrame: resolveEclipseFrame(FORECAST_UTC, { lunarHorizonMs: 0 }),
      }),
    );
    const active = layer.getState(
      createTimeContext(TOTAL_UTC, 0, true, {
        eclipseFrame: resolveEclipseFrame(TOTAL_UTC, { lunarHorizonMs: 0 }),
      }),
    );
    if (isEquirectRegionOverlayPayload(upcoming.data) && isEquirectRegionOverlayPayload(active.data)) {
      expect(upcoming.data.fills).toHaveLength(0);
      expect(upcoming.data.strokes).toHaveLength(0);
      expect(upcoming.data.labels ?? []).toHaveLength(0);
      expect(active.data.fills).toHaveLength(0);
      expect(active.data.strokes).toHaveLength(0);
      expect(active.data.labels).toHaveLength(1);
    }
  });

  it("places the event label at the current Moon without horizon path hints", () => {
    const layer = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: true,
    });
    const frame = resolveEclipseFrame(FORECAST_UTC, { lunarHorizonMs: HORIZON_7D });
    const st = layer.getState(createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }));
    expect(frame.activeLunar).toBeNull();
    expect(frame.upcomingLunar[0]?.subtype).toBe("total");
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      const moon = sublunarPoint(FORECAST_UTC);
      expect(st.data.fills).toHaveLength(0);
      expect(st.data.strokes).toHaveLength(0);
      expect(st.data.labelPathHints).toBeUndefined();
      expect(st.data.labels).toHaveLength(1);
      expect(st.data.labels?.[0]?.latDeg).toBeCloseTo(moon.latDeg, 5);
      expect(st.data.labels?.[0]?.lonDeg).toBeCloseTo(moon.lonDeg, 5);
      expect(st.data.labels?.[0]?.text).toMatch(/Total lunar eclipse/);
      expect(st.data.labels?.[0]?.text).toMatch(/·/);
      expect(st.data.labels?.[0]?.placement).toBe("lunar-glyph");
      expect(st.data.labelAvoidDiscs).toHaveLength(1);
    }
  });

  it("emits no forecast map label when labelsEnabled is false", () => {
    const layer = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: false,
    });
    const frame = resolveEclipseFrame(FORECAST_UTC, { lunarHorizonMs: HORIZON_7D });
    const st = layer.getState(createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }));
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.labels ?? []).toHaveLength(0);
      expect(st.data.labelAvoidDiscs ?? []).toHaveLength(0);
      expect(st.data.fills).toHaveLength(0);
    }
  });

  it("identifies a partial lunar forecast without totality semantics", () => {
    const layer = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: true,
    });
    const frame = resolveEclipseFrame(PARTIAL_FORECAST_UTC, { lunarHorizonMs: HORIZON_7D });
    expect(frame.upcomingLunar[0]?.subtype).toBe("partial");
    const st = layer.getState(
      createTimeContext(PARTIAL_FORECAST_UTC, 0, true, { eclipseFrame: frame }),
    );
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.labels?.[0]?.text).toMatch(/Partial lunar eclipse/);
      expect(st.data.labels?.[0]?.text).not.toMatch(/Total/);
    }
  });

  it("hides a filtered-out upcoming total without changing authority truth", () => {
    const frame = resolveEclipseFrame(FORECAST_UTC, { lunarHorizonMs: HORIZON_7D });
    expect(frame.upcomingLunar[0]?.id).toBe("nasa-5mcle-lunar-9700");
    const hidden = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7, showTypeTotal: false },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: true,
    }).getState(createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }));
    if (isEquirectRegionOverlayPayload(hidden.data)) {
      expect(hidden.data.fills).toHaveLength(0);
      expect(hidden.data.labels ?? []).toHaveLength(0);
    }
    expect(frame.upcomingLunar[0]?.id).toBe("nasa-5mcle-lunar-9700");
  });

  it("does not emit geographic lunar alignment fills", () => {
    const off = createLunarEclipseLayer({ alignment: ALIGNMENT_OFF });
    const on = createLunarEclipseLayer({ alignment: { enabled: true, lunarEnabled: true } });
    const frame = resolveEclipseFrame(TOTAL_UTC);
    const time = createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame });
    const without = off.getState(time);
    const withCueToggle = on.getState(time);
    expect(isEquirectRegionOverlayPayload(withCueToggle.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(withCueToggle.data) && isEquirectRegionOverlayPayload(without.data)) {
      expect(withCueToggle.data.fills).toHaveLength(0);
      expect(without.data.fills).toHaveLength(0);
      expect(withCueToggle.data.strokes).toHaveLength(0);
    }
  });

  it("hands city-name boxes to lunar label placement without horizon path hints", () => {
    const layer = createLunarEclipseLayer({
      alignment: ALIGNMENT_OFF,
      labelsEnabled: true,
      cityLabelHints: [{ latDeg: -23.5505, lonDeg: -46.6333, name: "São Paulo" }],
    });
    const frame = resolveEclipseFrame(GE_2029);
    const st = layer.getState(createTimeContext(GE_2029, 0, true, { eclipseFrame: frame }));
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.labels?.[0]?.placement).toBe("lunar-glyph");
      expect(st.data.labelAvoidCityLabels?.[0]?.name).toBe("São Paulo");
      expect(st.data.labelPathHints).toBeUndefined();
      expect(st.data.fills).toHaveLength(0);
      expect(st.data.strokes).toHaveLength(0);
    }
  });
});

describe("Canvas lunar containment", () => {
  it("does not mention lunar eclipse astronomy in the Canvas backend", () => {
    expect(canvasBackendSource).not.toMatch(/besselian/i);
    expect(canvasBackendSource).not.toMatch(/umbra|antumbra|penumbra/i);
    expect(canvasBackendSource).toMatch(/earthShadowOverlay/);
    expect(canvasBackendSource).toMatch(/earthShadowCue/);
    expect(canvasBackendSource).toMatch(/isEquirectRegionOverlayPayload/);
  });
});
