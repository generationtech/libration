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
import { createSolarEclipseLayer } from "./solarEclipseLayer";
import canvasBackendSource from "../renderer/canvasRenderBackend.ts?raw";

const TOTAL_UTC = Date.parse("2024-04-08T18:17:15.000Z");
const PARTIAL_UTC = Date.parse("2022-10-25T11:00:06.900Z");
const QUIET_UTC = Date.parse("2024-04-01T00:00:00.000Z");

describe("solar eclipse layer", () => {
  it("emits no region primitives when the layer would be empty (no active eclipse)", () => {
    const layer = createSolarEclipseLayer();
    const st = layer.getState(createTimeContext(QUIET_UTC, 0, true));
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills).toEqual([]);
      expect(st.data.strokes).toEqual([]);
    }
  });

  it("emits partial, umbral band, and centerline at 2024 greatest eclipse", () => {
    const layer = createSolarEclipseLayer();
    const frame = resolveEclipseFrame(TOTAL_UTC);
    const st = layer.getState(
      createTimeContext(TOTAL_UTC, 0, true, { eclipseFrame: frame }),
    );
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills.length).toBe(2);
      expect(st.data.strokes.length).toBe(1);
      expect(st.data.fills[0]!.ring.length).toBeGreaterThan(4);
      expect(st.data.fills[1]!.ring.length).toBeGreaterThan(4);
    }
  });

  it("omits central band and centerline for a partial-only event", () => {
    const layer = createSolarEclipseLayer();
    const st = layer.getState(createTimeContext(PARTIAL_UTC, 0, true));
    expect(isEquirectRegionOverlayPayload(st.data)).toBe(true);
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills).toHaveLength(1);
      expect(st.data.strokes).toEqual([]);
    }
  });

  it("honors independent presentation toggles", () => {
    const layer = createSolarEclipseLayer({
      presentation: {
        showCentralLine: false,
        showCentralBand: false,
        showPartialRegion: true,
      },
    });
    const st = layer.getState(createTimeContext(TOTAL_UTC, 0, true));
    if (isEquirectRegionOverlayPayload(st.data)) {
      expect(st.data.fills).toHaveLength(1);
      expect(st.data.strokes).toEqual([]);
    }
  });
});

describe("Canvas eclipse containment", () => {
  it("does not mention eclipse astronomy in the Canvas backend", () => {
    expect(canvasBackendSource).not.toMatch(/eclipse/i);
    expect(canvasBackendSource).not.toMatch(/besselian/i);
    expect(canvasBackendSource).not.toMatch(/umbra|antumbra|penumbra/i);
    expect(canvasBackendSource).toMatch(/isEquirectRegionOverlayPayload/);
  });
});
