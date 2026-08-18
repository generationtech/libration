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

  it("emits visibility region and boundary at 2022 totality", () => {
    const layer = createLunarEclipseLayer({ alignment: ALIGNMENT_OFF });
    const frame = resolveEclipseFrame(TOTAL_UTC);
    const st = layer.getState(createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame }));
    expect(frame.activeLunar?.subtype).toBe("total");
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills.length).toBe(1);
      expect(st.data.strokes.length).toBe(1);
      expect(st.data.fills[0]?.polarCloseLatDeg).toBeDefined();
    }
  });

  it("omits the region when the visibility-region toggle is off", () => {
    const layer = createLunarEclipseLayer({
      presentation: { showVisibilityRegion: false, showVisibilityBoundary: true },
      alignment: ALIGNMENT_OFF,
    });
    const st = layer.getState(createTimeContext(TOTAL_UTC, 0, true));
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills).toHaveLength(0);
      expect(st.data.strokes.length).toBe(1);
    }
  });

  it("uses the same Moon-visible flags for upcoming and active geography", () => {
    const on = createLunarEclipseLayer({
      presentation: {
        forecastHorizonDays: 7,
        showVisibilityRegion: true,
        showVisibilityBoundary: true,
      },
      alignment: ALIGNMENT_OFF,
    });
    const off = createLunarEclipseLayer({
      presentation: {
        forecastHorizonDays: 7,
        showVisibilityRegion: false,
        showVisibilityBoundary: false,
      },
      alignment: ALIGNMENT_OFF,
    });
    const upcomingFrame = resolveEclipseFrame(FORECAST_UTC, { lunarHorizonMs: HORIZON_7D });
    const activeFrame = resolveEclipseFrame(TOTAL_UTC);
    const upcomingOn = on.getState(
      createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: upcomingFrame }),
    );
    const upcomingOff = off.getState(
      createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: upcomingFrame }),
    );
    const activeOn = on.getState(createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: activeFrame }));
    const activeOff = off.getState(
      createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: activeFrame }),
    );
    const quiet = on.getState(createTimeContext(QUIET_UTC, 0, true));
    if (
      isEquirectRegionOverlayPayload(upcomingOn.data) &&
      isEquirectRegionOverlayPayload(upcomingOff.data) &&
      isEquirectRegionOverlayPayload(activeOn.data) &&
      isEquirectRegionOverlayPayload(activeOff.data) &&
      isEquirectRegionOverlayPayload(quiet.data)
    ) {
      expect(upcomingOn.data.fills.length).toBe(1);
      expect(upcomingOn.data.strokes.length).toBeGreaterThan(0);
      expect(activeOn.data.fills.length).toBe(1);
      expect(activeOn.data.strokes.length).toBeGreaterThan(0);
      expect(upcomingOff.data.fills).toHaveLength(0);
      expect(upcomingOff.data.strokes).toHaveLength(0);
      expect(activeOff.data.fills).toHaveLength(0);
      expect(activeOff.data.strokes).toHaveLength(0);
      expect(quiet.data.fills).toHaveLength(0);
      expect(quiet.data.strokes).toHaveLength(0);
      expect(upcomingOn.data.fills[0]?.fill).toBe(activeOn.data.fills[0]?.fill);
      expect(upcomingOn.data.strokes[0]?.stroke).toBe(activeOn.data.strokes[0]?.stroke);
    }
  });

  it("keeps unified Moon-visible geography during a live-only active event and omits upcoming", () => {
    const layer = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 0, showVisibilityRegion: true, showVisibilityBoundary: true },
      alignment: ALIGNMENT_OFF,
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
      expect(active.data.fills.length).toBe(1);
      expect(active.data.strokes.length).toBeGreaterThan(0);
    }
  });

  it("keeps label path-hint geometry when the painted boundary is off", () => {
    const layer = createLunarEclipseLayer({
      presentation: { showVisibilityRegion: false, showVisibilityBoundary: false },
      alignment: ALIGNMENT_OFF,
      labelsEnabled: true,
    });
    const st = layer.getState(createTimeContext(TOTAL_UTC, 0, true));
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.strokes).toHaveLength(0);
      expect(st.data.labels).toHaveLength(1);
      expect(st.data.labelPathHints?.length).toBeGreaterThan(0);
      expect(st.data.labelPathHints?.[0]?.points.length).toBeGreaterThan(1);
    }
  });

  it("emits current-instant Moon-visible geography before P1, not the GE freeze", () => {
    const layer = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: { enabled: true, lunarEnabled: true },
      labelsEnabled: true,
    });
    const frame = resolveEclipseFrame(FORECAST_UTC, { lunarHorizonMs: HORIZON_7D });
    const st = layer.getState(createTimeContext(FORECAST_UTC, 0, true, { eclipseFrame: frame }));
    expect(frame.activeLunar).toBeNull();
    expect(frame.upcomingLunar[0]?.subtype).toBe("total");
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      const moon = sublunarPoint(FORECAST_UTC);
      const ge = frame.upcomingLunar[0]!;
      expect(st.data.fills.length).toBe(1);
      expect(st.data.strokes.length).toBeGreaterThan(0);
      expect(st.data.fills[0]?.polarCloseLatDeg).toBe(moon.latDeg >= 0 ? 90 : -90);
      const ring0 = st.data.fills[0]!.ring[0]!;
      let dLon = ring0.lonDeg - (moon.lonDeg - 180);
      while (dLon > 180) dLon -= 360;
      while (dLon < -180) dLon += 360;
      expect(Math.abs(dLon)).toBeLessThan(2);
      expect(Math.abs(moon.lonDeg - ge.zenithLonDeg)).toBeGreaterThan(10);
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
      expect(st.data.fills.length).toBe(1);
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

  it("does not emit geographic lunar alignment fills; visibility region remains", () => {
    const off = createLunarEclipseLayer({ alignment: ALIGNMENT_OFF });
    const on = createLunarEclipseLayer({ alignment: { enabled: true, lunarEnabled: true } });
    const frame = resolveEclipseFrame(TOTAL_UTC);
    const time = createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame });
    const without = off.getState(time);
    const withCueToggle = on.getState(time);
    expect(isEquirectRegionOverlayPayload(withCueToggle.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(withCueToggle.data) && isEquirectRegionOverlayPayload(without.data)) {
      expect(withCueToggle.data.fills.length).toBe(without.data.fills.length);
      expect(without.data.fills.length).toBe(1);
    }
  });

  it("hands city-name boxes to lunar label placement", () => {
    const layer = createLunarEclipseLayer({
      alignment: ALIGNMENT_OFF,
      labelsEnabled: true,
      cityLabelHints: [{ latDeg: -23.5505, lonDeg: -46.6333, name: "São Paulo" }],
    });
    const ge = Date.parse("2029-06-26T03:22:05.000Z");
    const frame = resolveEclipseFrame(ge);
    const st = layer.getState(createTimeContext(ge, 0, true, { eclipseFrame: frame }));
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.labels?.[0]?.placement).toBe("lunar-glyph");
      expect(st.data.labelAvoidCityLabels?.[0]?.name).toBe("São Paulo");
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
