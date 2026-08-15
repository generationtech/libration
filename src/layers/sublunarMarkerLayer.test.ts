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
import type { OverlayReadabilityFrame } from "../core/overlayReadabilityFrame";
import { createSublunarMarkerLayer } from "./sublunarMarkerLayer";
import { isSublunarMarkerPayload } from "./sublunarMarkerPayload";
import { opticalLunarLibration } from "../core/lunarOpticalLibration";
import { apparentLunarNorthPositionAngleDeg } from "../core/lunarObserverOrientation";
import { DEFAULT_SUBLUNAR_MARKER_APPEARANCE } from "../core/sublunarMarkerAppearance";
import { REFERENCE_CITIES } from "../data/referenceCities";

const fakeFrame: OverlayReadabilityFrame = {
  globalNightVeil01: 0.5,
  globalEmissiveLegibilityPressure01: 0,
  globalReadabilityVeil01: 0.8,
  substrateOverlayReadabilityLiftScale01: 0.9,
  nightVeil01At: () => 0,
  readabilityVeil01At: (_latDeg, _lonDeg) => 0.55,
};

describe("createSublunarMarkerLayer", () => {
  it("uses attached overlay readability frame when no pilot is set", () => {
    const layer = createSublunarMarkerLayer({});
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isSublunarMarkerPayload(st.data)).toBe(true);
    if (!isSublunarMarkerPayload(st.data)) {
      return;
    }
    expect(st.data.readability?.nightVeil01).toBe(0.55);
    expect(st.data.readability?.overlayReadabilityLiftScale01).toBe(0.9);
  });

  it("applies sublunar marker pilot presentation after the shell frame", () => {
    const layer = createSublunarMarkerLayer({
      sublunarMarkerReadabilityPresentation: { readabilityVeilScale01: 0.5, overlayLiftMultiplier01: 1 },
    });
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isSublunarMarkerPayload(st.data)).toBe(true);
    if (!isSublunarMarkerPayload(st.data)) {
      return;
    }
    expect(st.data.readability?.nightVeil01).toBeCloseTo(0.275, 5);
    expect(st.data.readability?.overlayReadabilityLiftScale01).toBeCloseTo(0.9, 5);
  });

  it("emits optical libration from TimeContext.now", () => {
    const utcMs = Date.UTC(2020, 0, 1);
    const layer = createSublunarMarkerLayer({});
    const st = layer.getState(createTimeContext(utcMs, 0, true));
    expect(isSublunarMarkerPayload(st.data)).toBe(true);
    if (!isSublunarMarkerPayload(st.data)) {
      return;
    }
    const expected = opticalLunarLibration(utcMs);
    expect(st.data.librationLongitudeDeg).toBe(expected.longitudeDeg);
    expect(st.data.librationLatitudeDeg).toBe(expected.latitudeDeg);
    expect(st.data.appearance.librationEnabled).toBe(true);
    expect(st.data.appearance.librationStyle).toBe("ring");
    expect(st.data.librationOrientationDeg).toBe(0);
  });

  it("falls back to map orientation when observer-oriented but no reference city is available", () => {
    const utcMs = Date.UTC(2021, 11, 10);
    const layer = createSublunarMarkerLayer({
      appearance: {
        ...DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
        librationOrientation: "observer",
        librationUseReferenceCity: true,
      },
      observer: null,
    });
    const st = layer.getState(createTimeContext(utcMs, 0, true));
    expect(isSublunarMarkerPayload(st.data)).toBe(true);
    if (!isSublunarMarkerPayload(st.data)) {
      return;
    }
    expect(st.data.librationOrientationDeg).toBe(0);
    const expected = opticalLunarLibration(utcMs);
    expect(st.data.librationLongitudeDeg).toBe(expected.longitudeDeg);
    expect(st.data.librationLatitudeDeg).toBe(expected.latitudeDeg);
  });

  it("emits observer orientation from catalog coordinates without storing a Moon copy of them", () => {
    const utcMs = Date.UTC(2021, 11, 10);
    const knox = REFERENCE_CITIES.find((c) => c.id === "city.knoxville");
    expect(knox).toBeDefined();
    const layer = createSublunarMarkerLayer({
      observer: {
        cityId: knox!.id,
        latitudeDeg: knox!.latitude,
        longitudeDeg: knox!.longitude,
      },
    });
    const st = layer.getState(createTimeContext(utcMs, 0, true));
    expect(isSublunarMarkerPayload(st.data)).toBe(true);
    if (!isSublunarMarkerPayload(st.data)) {
      return;
    }
    expect(st.data.librationOrientationDeg).toBeCloseTo(
      apparentLunarNorthPositionAngleDeg(utcMs, knox!.latitude, knox!.longitude),
      10,
    );
    expect(JSON.stringify(st.data.appearance)).not.toMatch(/city\.knoxville/);
    expect(st.data.appearance).not.toHaveProperty("latitudeDeg");
    expect(st.data.appearance).not.toHaveProperty("longitudeDeg");
  });

  it("keeps map-oriented presentation at 0° even when an observer is supplied", () => {
    const utcMs = Date.UTC(2021, 11, 10);
    const knox = REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!;
    const layer = createSublunarMarkerLayer({
      appearance: { ...DEFAULT_SUBLUNAR_MARKER_APPEARANCE, librationOrientation: "map" },
      observer: {
        cityId: knox.id,
        latitudeDeg: knox.latitude,
        longitudeDeg: knox.longitude,
      },
    });
    const st = layer.getState(createTimeContext(utcMs, 0, true));
    expect(isSublunarMarkerPayload(st.data)).toBe(true);
    if (!isSublunarMarkerPayload(st.data)) {
      return;
    }
    expect(st.data.librationOrientationDeg).toBe(0);
  });
});
