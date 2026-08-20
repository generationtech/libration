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
import {
  DEFAULT_MILKY_WAY_PRESENTATION,
  mergeMilkyWayPresentation,
} from "../core/milkyWayPresentation";
import { resetMilkyWayGeometryCacheForTests } from "../core/milkyWayGeometry";
import { REFERENCE_CITIES } from "../data/referenceCities";
import { createMilkyWayLayer } from "./milkyWayLayer";
import { isMilkyWayPayload } from "./milkyWayPayload";

const UTC = Date.UTC(2026, 7, 19, 15, 30, 0, 0);

describe("createMilkyWayLayer", () => {
  it("emits zenith geometry at product time when supported", () => {
    resetMilkyWayGeometryCacheForTests();
    const layer = createMilkyWayLayer({
      presentation: DEFAULT_MILKY_WAY_PRESENTATION,
    });
    const st = layer.getState(createTimeContext(UTC, 0, true));
    expect(isMilkyWayPayload(st.data)).toBe(true);
    if (!isMilkyWayPayload(st.data)) {
      return;
    }
    expect(st.data.supported).toBe(true);
    expect(st.data.geometry).not.toBeNull();
    expect(st.data.geometry!.plane.length).toBeGreaterThan(10);
    expect(st.data.visibility).toBeNull();
    expect(st.data.geometry!.galacticCenter).not.toBeNull();
  });

  it("skips sampling when every structure toggle is off", () => {
    const presentation = mergeMilkyWayPresentation(DEFAULT_MILKY_WAY_PRESENTATION, {
      planeEnabled: false,
      bandEnabled: false,
      ribsEnabled: false,
      galacticCenterEnabled: false,
      galacticAnticenterEnabled: false,
    });
    const layer = createMilkyWayLayer({ presentation });
    const st = layer.getState(createTimeContext(UTC, 0, true));
    if (!isMilkyWayPayload(st.data)) {
      throw new Error("expected payload");
    }
    expect(st.data.supported).toBe(true);
    expect(st.data.geometry).toBeNull();
    expect(st.data.visibility).toBeNull();
    expect(st.data.eventLabel).toBeNull();
  });

  it("samples visibility contours when the ribbon is off", () => {
    const presentation = mergeMilkyWayPresentation(DEFAULT_MILKY_WAY_PRESENTATION, {
      planeEnabled: false,
      bandEnabled: false,
      ribsEnabled: false,
      galacticCenterEnabled: false,
      galacticAnticenterEnabled: false,
      visibilityContoursEnabled: true,
    });
    const layer = createMilkyWayLayer({ presentation });
    const st = layer.getState(createTimeContext(UTC, 0, true));
    if (!isMilkyWayPayload(st.data)) {
      throw new Error("expected payload");
    }
    expect(st.data.geometry).not.toBeNull();
    expect(st.data.visibility).not.toBeNull();
    expect(st.data.visibility!.contours.map((c) => c.altitudeDeg)).toEqual([30, 45, 60, 75]);
    expect(st.data.visibility!.galacticCenter.latDeg).toBeCloseTo(
      st.data.geometry!.galacticCenter!.latDeg,
      8,
    );
  });

  it("marks unsupported dates honestly", () => {
    const layer = createMilkyWayLayer();
    const st = layer.getState(createTimeContext(Date.UTC(1400, 0, 1), 0, true));
    if (!isMilkyWayPayload(st.data)) {
      throw new Error("expected payload");
    }
    expect(st.data.supported).toBe(false);
    expect(st.data.visibility).toBeNull();
    expect(st.data.geometry).toBeNull();
    expect(st.data.eventLabel).toBeNull();
  });

  it("emits a viewing-event label when events are enabled even if the ribbon is off", () => {
    resetMilkyWayGeometryCacheForTests();
    const knoxvilleCity = REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!;
    const layer = createMilkyWayLayer({
      presentation: mergeMilkyWayPresentation(DEFAULT_MILKY_WAY_PRESENTATION, {
        planeEnabled: false,
        bandEnabled: false,
        ribsEnabled: false,
        galacticCenterEnabled: false,
        galacticAnticenterEnabled: false,
        viewingEventsEnabled: true,
        showViewingEventLabels: true,
      }),
      observer: {
        cityId: knoxvilleCity.id,
        latitudeDeg: knoxvilleCity.latitude,
        longitudeDeg: knoxvilleCity.longitude,
      },
      cityName: knoxvilleCity.name,
    });
    const st = layer.getState(createTimeContext(UTC, 0, true));
    if (!isMilkyWayPayload(st.data)) {
      throw new Error("expected payload");
    }
    expect(st.data.eventLabel).not.toBeNull();
    expect(st.data.eventLabel!.cityName).toBe("Knoxville");
    expect(st.data.geometry).not.toBeNull();
  });
});
