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
import { subsolarPoint } from "../core/subsolarPoint";
import type { OverlayReadabilityFrame } from "../core/overlayReadabilityFrame";
import { isEquirectangularPolylinePayload } from "./equirectPolylinePayload";
import { createSolarAnalemmaLayer } from "./solarAnalemmaLayer";

const fakeFrame: OverlayReadabilityFrame = {
  globalNightVeil01: 0.5,
  globalEmissiveLegibilityPressure01: 0,
  globalReadabilityVeil01: 0.8,
  substrateOverlayReadabilityLiftScale01: 0.9,
  nightVeil01At: () => 0,
  readabilityVeil01At: () => 0,
};

describe("createSolarAnalemmaLayer", () => {
  it("uses attached overlay readability frame when no analemma pilot is set", () => {
    const layer = createSolarAnalemmaLayer({});
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isEquirectangularPolylinePayload(st.data)).toBe(true);
    if (!isEquirectangularPolylinePayload(st.data)) {
      return;
    }
    expect(st.data.readability?.nightVeil01).toBe(0.8);
    expect(st.data.readability?.overlayReadabilityLiftScale01).toBe(0.9);
  });

  it("applies analemma pilot presentation after the shell frame", () => {
    const layer = createSolarAnalemmaLayer({
      solarAnalemmaReadabilityPresentation: { readabilityVeilScale01: 0.5, overlayLiftMultiplier01: 1 },
    });
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isEquirectangularPolylinePayload(st.data)).toBe(true);
    if (!isEquirectangularPolylinePayload(st.data)) {
      return;
    }
    expect(st.data.readability?.nightVeil01).toBeCloseTo(0.4, 5);
    expect(st.data.readability?.overlayReadabilityLiftScale01).toBeCloseTo(0.9, 5);
  });

  it("places today's vertex on the live subsolar point when utcHour is unset", () => {
    const now = Date.UTC(2026, 11, 21, 6, 34, 12, 345);
    const layer = createSolarAnalemmaLayer({});
    const st = layer.getState(createTimeContext(now, 0, true));
    expect(isEquirectangularPolylinePayload(st.data)).toBe(true);
    if (!isEquirectangularPolylinePayload(st.data)) {
      return;
    }
    const d = new Date(now);
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const i = Math.round((dayStart - yearStart) / 86400000);
    const today = st.data.points[i]!;
    const sun = subsolarPoint(now);
    expect(today.latDeg).toBeCloseTo(sun.latDeg, 10);
    expect(today.lonDeg).toBeCloseTo(sun.lonDeg, 10);
  });
});
