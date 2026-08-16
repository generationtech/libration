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
import canvasBackendSource from "../renderer/canvasRenderBackend.ts?raw";

const TOTAL_UTC = Date.parse("2022-05-16T04:11:29.000Z");
const QUIET_UTC = Date.parse("2024-01-15T00:00:00.000Z");

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

  it("adds a lunar alignment axis without removing the visibility region", () => {
    const off = createLunarEclipseLayer({ alignment: ALIGNMENT_OFF });
    const on = createLunarEclipseLayer({ alignment: { enabled: true, lunarEnabled: true } });
    const frame = resolveEclipseFrame(TOTAL_UTC);
    const time = createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame });
    const without = off.getState(time);
    const withBeam = on.getState(time);
    expect(isEquirectRegionOverlayPayload(withBeam.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(withBeam.data) && isEquirectRegionOverlayPayload(without.data)) {
      expect(withBeam.data.fills.length).toBeGreaterThan(without.data.fills.length);
      expect(withBeam.data.strokes.length).toBeGreaterThan(without.data.strokes.length);
      expect(without.data.fills.length).toBe(1);
    }
  });
});

describe("Canvas lunar containment", () => {
  it("does not mention lunar eclipse astronomy in the Canvas backend", () => {
    expect(canvasBackendSource).not.toMatch(/besselian/i);
    expect(canvasBackendSource).not.toMatch(/umbra|antumbra|penumbra/i);
    expect(canvasBackendSource).toMatch(/earthShadowOverlay/);
    expect(canvasBackendSource).toMatch(/isEquirectRegionOverlayPayload/);
  });
});
