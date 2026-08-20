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
import { getLunarEclipseEventById } from "../core/eclipse/eclipseAuthority";
import { lunarEclipseVisibilityFootprint } from "../core/eclipse/lunarEclipseVisibilityFootprint";
import { hexToRgba } from "../core/eclipse/eclipseStyle";
import { resolveLunarEclipsePaint, normalizeLunarEclipsePresentation } from "../core/eclipse/lunarEclipseAppearance";
import { isEquirectRegionOverlayPayload } from "./equirectRegionPayload";
import { createLunarEclipseLayer } from "./lunarEclipseLayer";
import { createSolarEclipseLayer } from "./solarEclipseLayer";
import { createSolarShadingLayer } from "./solarShadingLayer";
import { isSolarShadingPayload } from "./solarShadingPayload";
import { createSublunarMarkerLayer } from "./sublunarMarkerLayer";
import { isSublunarMarkerPayload } from "./sublunarMarkerPayload";
import { sublunarPoint } from "../core/sublunarPoint";
import { buildEquirectRegionOverlayRenderPlan } from "../renderer/renderPlan/equirectRegionPlan";
import canvasBackendSource from "../renderer/canvasRenderBackend.ts?raw";
import type { RenderPath2DItem } from "../renderer/renderPlan/renderPlanTypes";

const TOTAL_UTC = Date.parse("2022-05-16T04:11:29.000Z");
const FORECAST_UTC = Date.parse("2022-05-13T04:00:00.000Z");
const PARTIAL_FORECAST_UTC = Date.parse("2008-08-13T21:00:00.000Z");
const QUIET_UTC = Date.parse("2024-01-15T00:00:00.000Z");
const GE_2029 = Date.parse("2029-06-26T03:22:05.000Z");
const HORIZON_7D = 7 * 86_400_000;

const ALIGNMENT_OFF = { enabled: false } as const;

describe("lunar eclipse layer", () => {
  it("emits no region primitives when there is no relevant lunar eclipse", () => {
    const layer = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 0 },
      alignment: ALIGNMENT_OFF,
    });
    const st = layer.getState(createTimeContext(QUIET_UTC, 0, true));
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills).toHaveLength(0);
      expect(st.data.strokes).toHaveLength(0);
    }
  });

  it("emits a line-only visibility footprint at 2022 totality, not a Moon-visible fill", () => {
    const layer = createLunarEclipseLayer({ alignment: ALIGNMENT_OFF });
    const frame = resolveEclipseFrame(TOTAL_UTC);
    const st = layer.getState(createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame }));
    expect(frame.activeLunar?.subtype).toBe("total");
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills).toHaveLength(0);
      expect(st.data.strokes).toHaveLength(1);
      expect(st.data.strokes[0]!.points.length).toBeGreaterThan(8);
      expect(st.data.labelPathHints).toBeUndefined();
    }
  });

  it("uses the same footprint geometry for upcoming and active, and none when quiet", () => {
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
    const quiet = layer.getState(
      createTimeContext(QUIET_UTC, 0, true, {
        eclipseFrame: resolveEclipseFrame(QUIET_UTC, { lunarHorizonMs: 0 }),
      }),
    );
    if (
      isEquirectRegionOverlayPayload(upcoming.data) &&
      isEquirectRegionOverlayPayload(active.data) &&
      isEquirectRegionOverlayPayload(quiet.data)
    ) {
      expect(upcoming.data.fills).toHaveLength(0);
      expect(active.data.fills).toHaveLength(0);
      expect(quiet.data.fills).toHaveLength(0);
      expect(upcoming.data.strokes).toHaveLength(1);
      expect(active.data.strokes).toHaveLength(1);
      expect(quiet.data.strokes).toHaveLength(0);
      expect(upcoming.data.strokes[0]!.points).toEqual(active.data.strokes[0]!.points);
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
      expect(active.data.strokes).toHaveLength(1);
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
      expect(st.data.strokes).toHaveLength(1);
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
      expect(st.data.strokes).toHaveLength(1);
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
      expect(hidden.data.strokes).toHaveLength(0);
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
      expect(withCueToggle.data.strokes).toHaveLength(1);
      expect(without.data.strokes).toHaveLength(1);
      expect(withCueToggle.data.strokes[0]!.points).toEqual(without.data.strokes[0]!.points);
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
      expect(st.data.strokes).toHaveLength(1);
    }
  });

  it("omits the footprint when the control is off and after the event ends", () => {
    const off = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7, showVisibilityFootprint: false },
      alignment: ALIGNMENT_OFF,
    });
    const on = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7, showVisibilityFootprint: true },
      alignment: ALIGNMENT_OFF,
    });
    const geFrame = resolveEclipseFrame(GE_2029, { lunarHorizonMs: HORIZON_7D });
    const geOff = off.getState(createTimeContext(GE_2029, 0, true, { eclipseFrame: geFrame }));
    const geOn = on.getState(createTimeContext(GE_2029, 0, true, { eclipseFrame: geFrame }));
    const afterUtc = Date.parse("2029-06-26T06:20:00.000Z");
    const after = on.getState(
      createTimeContext(afterUtc, 0, true, {
        eclipseFrame: resolveEclipseFrame(afterUtc, { lunarHorizonMs: HORIZON_7D }),
      }),
    );
    if (
      isEquirectRegionOverlayPayload(geOff.data) &&
      isEquirectRegionOverlayPayload(geOn.data) &&
      isEquirectRegionOverlayPayload(after.data)
    ) {
      expect(geOff.data.strokes).toHaveLength(0);
      expect(geOff.data.fills).toHaveLength(0);
      expect(geOn.data.strokes).toHaveLength(1);
      expect(geOn.data.fills).toHaveLength(0);
      expect(after.data.strokes).toHaveLength(0);
      expect(after.data.fills).toHaveLength(0);
    }
  });

  it("appears at lunar forecast horizon entry with the same geometry as GE", () => {
    const event = getLunarEclipseEventById("nasa-5mcle-lunar-9716")!;
    const horizonMs = HORIZON_7D;
    const justBefore = event.globalStartMs - horizonMs - 60_000;
    const atHorizon = event.globalStartMs - horizonMs;
    const ge = event.greatestEclipseUtcMs;
    const layer = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: ALIGNMENT_OFF,
    });
    const before = layer.getState(
      createTimeContext(justBefore, 0, true, {
        eclipseFrame: resolveEclipseFrame(justBefore, { lunarHorizonMs: horizonMs }),
      }),
    );
    const entry = layer.getState(
      createTimeContext(atHorizon, 0, true, {
        eclipseFrame: resolveEclipseFrame(atHorizon, { lunarHorizonMs: horizonMs }),
      }),
    );
    const atGe = layer.getState(
      createTimeContext(ge, 0, true, {
        eclipseFrame: resolveEclipseFrame(ge, { lunarHorizonMs: horizonMs }),
      }),
    );
    if (
      isEquirectRegionOverlayPayload(before.data) &&
      isEquirectRegionOverlayPayload(entry.data) &&
      isEquirectRegionOverlayPayload(atGe.data)
    ) {
      expect(before.data.strokes).toHaveLength(0);
      expect(entry.data.strokes).toHaveLength(1);
      expect(atGe.data.strokes).toHaveLength(1);
      expect(entry.data.strokes[0]!.points).toEqual(atGe.data.strokes[0]!.points);
      expect(entry.data.fills).toHaveLength(0);
    }
  });
});

describe("lunar eclipse visibility footprint presentation color", () => {
  const ALIGNMENT_OFF = { enabled: false } as const;
  const MAGENTA = "#ff00ff";
  const VIEW = { viewportWidthPx: 720, viewportHeightPx: 360, layerOpacity: 1 } as const;

  function planFromLayer(layer: ReturnType<typeof createLunarEclipseLayer>, utcMs: number) {
    const frame = resolveEclipseFrame(utcMs);
    const st = layer.getState(createTimeContext(utcMs, 0, true, { eclipseFrame: frame }));
    if (!isEquirectRegionOverlayPayload(st.data)) {
      throw new Error("expected equirect region payload");
    }
    return {
      payload: st.data,
      plan: buildEquirectRegionOverlayRenderPlan({ ...VIEW, payload: st.data }),
    };
  }

  function strokeItems(plan: ReturnType<typeof buildEquirectRegionOverlayRenderPlan>): RenderPath2DItem[] {
    return plan.items.filter((item): item is RenderPath2DItem => item.kind === "path2d" && Boolean(item.stroke));
  }

  it("changes only the RenderPlan stroke when footprint color changes", () => {
    const event = getLunarEclipseEventById("nasa-5mcle-lunar-9700")!;
    const footprint = lunarEclipseVisibilityFootprint(event);
    const factory = createLunarEclipseLayer({ alignment: ALIGNMENT_OFF });
    const magenta = createLunarEclipseLayer({
      presentation: { visibilityFootprintColor: MAGENTA },
      alignment: ALIGNMENT_OFF,
    });
    const thick = createLunarEclipseLayer({
      presentation: { visibilityFootprintThickness: "thick" },
      alignment: ALIGNMENT_OFF,
    });
    const factoryState = planFromLayer(factory, TOTAL_UTC);
    const magentaState = planFromLayer(magenta, TOTAL_UTC);
    const thickState = planFromLayer(thick, TOTAL_UTC);
    expect(factoryState.payload.fills).toHaveLength(0);
    expect(magentaState.payload.fills).toHaveLength(0);
    expect(factoryState.payload.strokes).toHaveLength(1);
    expect(magentaState.payload.strokes).toHaveLength(1);
    expect(factoryState.payload.strokes[0]!.points).toBe(footprint.boundary);
    expect(magentaState.payload.strokes[0]!.points).toBe(footprint.boundary);
    expect(magentaState.payload.strokes[0]!.points).toBe(factoryState.payload.strokes[0]!.points);
    expect(lunarEclipseVisibilityFootprint(event).geometryHash).toBe(footprint.geometryHash);
    const factoryPaint = resolveLunarEclipsePaint(normalizeLunarEclipsePresentation(undefined));
    const magentaPaint = resolveLunarEclipsePaint(
      normalizeLunarEclipsePresentation({ visibilityFootprintColor: MAGENTA }),
    );
    expect(factoryState.payload.strokes[0]!.stroke).toBe(factoryPaint.visibilityFootprintStroke);
    expect(magentaState.payload.strokes[0]!.stroke).toBe(magentaPaint.visibilityFootprintStroke);
    expect(magentaState.payload.strokes[0]!.stroke).toBe(hexToRgba(MAGENTA, 0.78));
    expect(magentaState.payload.strokes[0]!.strokeWidthPx).toBe(
      factoryState.payload.strokes[0]!.strokeWidthPx,
    );
    expect(thickState.payload.strokes[0]!.stroke).toBe(factoryState.payload.strokes[0]!.stroke);
    expect(thickState.payload.strokes[0]!.strokeWidthPx).not.toBe(
      factoryState.payload.strokes[0]!.strokeWidthPx,
    );
    const factoryStrokes = strokeItems(factoryState.plan);
    const magentaStrokes = strokeItems(magentaState.plan);
    expect(factoryStrokes.length).toBeGreaterThan(0);
    expect(magentaStrokes).toHaveLength(factoryStrokes.length);
    for (let i = 0; i < factoryStrokes.length; i += 1) {
      const factoryItem = factoryStrokes[i]!;
      const magentaItem = magentaStrokes[i]!;
      expect(factoryItem.pathKind).toBe("descriptor");
      expect(magentaItem.pathKind).toBe("descriptor");
      if (factoryItem.pathKind === "descriptor" && magentaItem.pathKind === "descriptor") {
        expect(magentaItem.pathDescriptor).toEqual(factoryItem.pathDescriptor);
      }
      expect(magentaItem.stroke).not.toBe(factoryItem.stroke);
      expect(magentaItem.stroke).toContain("255, 0, 255");
      expect(factoryItem.stroke).toContain("106, 154, 168");
      expect(magentaItem.strokeWidthPx).toBe(factoryItem.strokeWidthPx);
    }

    const shadingTime = createTimeContext(TOTAL_UTC, 0, true, {
      eclipseFrame: resolveEclipseFrame(TOTAL_UTC),
    });
    const shadingA = createSolarShadingLayer({ moonlightMode: "illustrative" }).getState(shadingTime);
    const shadingB = createSolarShadingLayer({ moonlightMode: "illustrative" }).getState(shadingTime);
    expect(isSolarShadingPayload(shadingA.data)).toBe(true);
    expect(shadingA.data).toEqual(shadingB.data);

    const moonA = createSublunarMarkerLayer({ earthShadowEnabled: true, earthShadowCueEnabled: true }).getState(
      shadingTime,
    );
    const moonB = createSublunarMarkerLayer({ earthShadowEnabled: true, earthShadowCueEnabled: true }).getState(
      shadingTime,
    );
    expect(isSublunarMarkerPayload(moonA.data) && isSublunarMarkerPayload(moonB.data)).toBe(true);
    if (isSublunarMarkerPayload(moonA.data) && isSublunarMarkerPayload(moonB.data)) {
      expect(moonA.data.earthShadowOverlay).toEqual(moonB.data.earthShadowOverlay);
      expect(moonA.data.earthShadowCue).toEqual(moonB.data.earthShadowCue);
    }

    const solarUtc = Date.parse("2017-08-21T18:25:29.700Z");
    const solarTime = createTimeContext(solarUtc, 0, true, { eclipseFrame: resolveEclipseFrame(solarUtc) });
    const solarFactory = createSolarEclipseLayer({
      lunarPresentation: { visibilityFootprintColor: "#6a9aa8" },
      alignment: ALIGNMENT_OFF,
    }).getState(solarTime);
    const solarMagenta = createSolarEclipseLayer({
      lunarPresentation: { visibilityFootprintColor: MAGENTA },
      alignment: ALIGNMENT_OFF,
    }).getState(solarTime);
    expect(isEquirectRegionOverlayPayload(solarFactory.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(solarFactory.data) && isEquirectRegionOverlayPayload(solarMagenta.data)) {
      expect(solarMagenta.data.fills).toEqual(solarFactory.data.fills);
      expect(solarMagenta.data.strokes).toEqual(solarFactory.data.strokes);
      expect(solarMagenta.data.pointMarkers).toEqual(solarFactory.data.pointMarkers);
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
