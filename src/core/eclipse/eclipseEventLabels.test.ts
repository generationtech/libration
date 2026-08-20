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
import { resolveEclipseFrame } from "./eclipseEventService";
import { lunarEclipseMapLabel, solarEclipseMapLabel } from "./eclipseEventLabels";
import { createSolarEclipseLayer } from "../../layers/solarEclipseLayer";
import { createLunarEclipseLayer } from "../../layers/lunarEclipseLayer";
import { createTimeContext } from "../time";
import { isEquirectRegionOverlayPayload } from "../../layers/equirectRegionPayload";
import { normalizeSolarEclipsePresentation } from "./solarEclipseAppearance";
import { buildEquirectRegionOverlayRenderPlan } from "../../renderer/renderPlan/equirectRegionPlan";

const FORECAST = Date.parse("2024-04-03T18:00:00.000Z");
const ACTIVE = Date.parse("2024-04-08T18:17:15.000Z");
const QUIET = Date.parse("2024-01-15T00:00:00.000Z");
const HORIZON = 7 * 86_400_000;

describe("eclipse event labels", () => {
  it("labels the nearest upcoming solar event and the active event", () => {
    const upcoming = resolveEclipseFrame(FORECAST, { horizonMs: HORIZON }).upcomingSolar[0]!;
    const up = solarEclipseMapLabel({
      event: upcoming,
      lifecycle: "upcoming",
      productUtcMs: FORECAST,
      latDeg: upcoming.geLatDeg,
      lonDeg: upcoming.geLonDeg,
    });
    expect(up.text).toMatch(/Total solar eclipse/);
    expect(up.text).toMatch(/·/);
    const active = resolveEclipseFrame(ACTIVE, { horizonMs: 0 }).activeSolar!;
    const act = solarEclipseMapLabel({
      event: active,
      lifecycle: "active",
      productUtcMs: ACTIVE,
      latDeg: active.geLatDeg,
      lonDeg: active.geLonDeg,
    });
    expect(act.text).toBe("Total solar eclipse · active");
  });

  it("emits one solar label for upcoming, one for active, and none when quiet", () => {
    const layer = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: { enabled: false },
      labelsEnabled: true,
    });
    const forecast = layer.getState(
      createTimeContext(FORECAST, 0, true, {
        eclipseFrame: resolveEclipseFrame(FORECAST, { horizonMs: HORIZON }),
      }),
    );
    const active = layer.getState(
      createTimeContext(ACTIVE, 0, true, {
        eclipseFrame: resolveEclipseFrame(ACTIVE, { horizonMs: 0 }),
      }),
    );
    const quiet = layer.getState(createTimeContext(QUIET, 0, true));
    expect(isEquirectRegionOverlayPayload(forecast.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(forecast.data)) {
      expect(forecast.data.labels).toHaveLength(1);
    }
    if (isEquirectRegionOverlayPayload(active.data)) {
      expect(active.data.labels).toHaveLength(1);
    }
    if (isEquirectRegionOverlayPayload(quiet.data)) {
      expect(quiet.data.labels ?? []).toHaveLength(0);
    }
  });

  it("does not label a filtered-out upcoming total", () => {
    const layer = createSolarEclipseLayer({
      presentation: normalizeSolarEclipsePresentation({
        forecastHorizonDays: 7,
        showTypeTotal: false,
      }),
      alignment: { enabled: false },
      labelsEnabled: true,
    });
    const st = layer.getState(
      createTimeContext(FORECAST, 0, true, {
        eclipseFrame: resolveEclipseFrame(FORECAST, { horizonMs: HORIZON }),
      }),
    );
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.labels ?? []).toHaveLength(0);
      expect(st.data.fills).toHaveLength(0);
    }
  });

  it("emits no solar map label when labelsEnabled is false", () => {
    const on = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: { enabled: false },
      labelsEnabled: true,
    });
    const off = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: { enabled: false },
      labelsEnabled: false,
    });
    const time = createTimeContext(FORECAST, 0, true, {
      eclipseFrame: resolveEclipseFrame(FORECAST, { horizonMs: HORIZON }),
    });
    const onState = on.getState(time);
    const offState = off.getState(time);
    if (isEquirectRegionOverlayPayload(onState.data)) {
      expect(onState.data.labels).toHaveLength(1);
      expect(onState.data.fills.length).toBeGreaterThan(0);
    }
    if (isEquirectRegionOverlayPayload(offState.data)) {
      expect(offState.data.labels ?? []).toHaveLength(0);
      expect(offState.data.fills.length).toBeGreaterThan(0);
    }
  });

  it("emits zero RenderPlan text items when labels are off for solar and lunar forecast", () => {
    const solarOff = createSolarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: { enabled: false },
      labelsEnabled: false,
    }).getState(
      createTimeContext(FORECAST, 0, true, {
        eclipseFrame: resolveEclipseFrame(FORECAST, { horizonMs: HORIZON }),
      }),
    );
    const lunarOff = createLunarEclipseLayer({
      presentation: { forecastHorizonDays: 7 },
      alignment: { enabled: false },
      labelsEnabled: false,
    }).getState(
      createTimeContext(Date.parse("2022-05-13T04:00:00.000Z"), 0, true, {
        eclipseFrame: resolveEclipseFrame(Date.parse("2022-05-13T04:00:00.000Z"), {
          lunarHorizonMs: HORIZON,
        }),
      }),
    );
    expect(isEquirectRegionOverlayPayload(solarOff.data)).toBe(true);
    expect(isEquirectRegionOverlayPayload(lunarOff.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(solarOff.data)) {
      expect(solarOff.data.labels ?? []).toHaveLength(0);
      expect(solarOff.data.fills.length).toBeGreaterThan(0);
      const plan = buildEquirectRegionOverlayRenderPlan({
        viewportWidthPx: 360,
        viewportHeightPx: 180,
        layerOpacity: 1,
        payload: solarOff.data,
      });
      expect(plan.items.filter((item) => item.kind === "text")).toHaveLength(0);
    }
    if (isEquirectRegionOverlayPayload(lunarOff.data)) {
      expect(lunarOff.data.labels ?? []).toHaveLength(0);
      expect(lunarOff.data.fills).toHaveLength(0);
      expect(lunarOff.data.strokes).toHaveLength(1);
      const plan = buildEquirectRegionOverlayRenderPlan({
        viewportWidthPx: 360,
        viewportHeightPx: 180,
        layerOpacity: 1,
        payload: lunarOff.data,
      });
      expect(plan.items.filter((item) => item.kind === "text")).toHaveLength(0);
    }
  });

  it("names a lunar event without calling it partial when it is penumbral", () => {
    const frame = resolveEclipseFrame(Date.parse("2017-02-11T00:44:00.000Z"), { horizonMs: 0 });
    if (frame.activeLunar) {
      const label = lunarEclipseMapLabel({
        event: frame.activeLunar,
        lifecycle: "active",
        productUtcMs: frame.productUtcMs,
        latDeg: 0,
        lonDeg: 0,
      });
      if (frame.activeLunar.subtype === "penumbral") {
        expect(label.text).toBe("Penumbral lunar eclipse · active");
      }
    }
  });
});
