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
  DEFAULT_PLANETARY_OBJECTS_PRESENTATION,
  mergePlanetaryObjectsPresentation,
} from "../core/planetaryObjectsPresentation";
import { resetPlanetaryGroundTrackCacheForTests } from "../core/planetaryGroundTrack";
import { resetPlanetaryLocusCacheForTests } from "../core/planetaryLocus";
import { createPlanetaryObjectsLayer } from "./planetaryObjectsLayer";
import { isPlanetaryObjectsPayload } from "./planetaryObjectsPayload";

const UTC = Date.UTC(2026, 7, 19, 15, 30, 0, 0);

describe("createPlanetaryObjectsLayer", () => {
  it("emits nothing useful when all bodies are off", () => {
    const layer = createPlanetaryObjectsLayer({
      presentation: DEFAULT_PLANETARY_OBJECTS_PRESENTATION,
    });
    const st = layer.getState(createTimeContext(UTC, 0, true));
    expect(isPlanetaryObjectsPayload(st.data)).toBe(true);
    if (isPlanetaryObjectsPayload(st.data)) {
      expect(st.data.supported).toBe(true);
      expect(st.data.bodies).toHaveLength(0);
    }
  });

  it("emits only enabled bodies and respects per-body locus toggles", () => {
    resetPlanetaryLocusCacheForTests();
    resetPlanetaryGroundTrackCacheForTests();
    const presentation = mergePlanetaryObjectsPresentation(DEFAULT_PLANETARY_OBJECTS_PRESENTATION, {
      bodies: {
        mercury: { enabled: true, locusEnabled: true },
        venus: { enabled: true, locusEnabled: false },
      },
      groundTracks: { enabled: true },
    });
    const layer = createPlanetaryObjectsLayer({ presentation });
    const st = layer.getState(createTimeContext(UTC, 0, true));
    expect(isPlanetaryObjectsPayload(st.data)).toBe(true);
    if (!isPlanetaryObjectsPayload(st.data)) {
      return;
    }
    expect(st.data.bodies.map((b) => b.id)).toEqual(["mercury", "venus"]);
    const mercury = st.data.bodies.find((b) => b.id === "mercury")!;
    const venus = st.data.bodies.find((b) => b.id === "venus")!;
    expect(mercury.showLocus).toBe(true);
    expect(mercury.locus.length).toBeGreaterThan(2);
    expect(venus.showLocus).toBe(false);
    expect(venus.locus).toHaveLength(0);
    expect(mercury.showTrack).toBe(true);
    expect(venus.showTrack).toBe(true);
  });

  it("hides glyph, track, and locus when the body is off while keeping the locus preference", () => {
    const presentation = mergePlanetaryObjectsPresentation(DEFAULT_PLANETARY_OBJECTS_PRESENTATION, {
      bodies: { mercury: { enabled: false, locusEnabled: true } },
    });
    const layer = createPlanetaryObjectsLayer({ presentation });
    const st = layer.getState(createTimeContext(UTC, 0, true));
    if (!isPlanetaryObjectsPayload(st.data)) {
      throw new Error("expected payload");
    }
    expect(st.data.bodies).toHaveLength(0);
    expect(presentation.bodies.mercury.locusEnabled).toBe(true);
  });

  it("marks unsupported dates honestly", () => {
    const presentation = mergePlanetaryObjectsPresentation(DEFAULT_PLANETARY_OBJECTS_PRESENTATION, {
      bodies: { mars: { enabled: true } },
    });
    const layer = createPlanetaryObjectsLayer({ presentation });
    const st = layer.getState(createTimeContext(Date.UTC(1400, 0, 1), 0, true));
    if (!isPlanetaryObjectsPayload(st.data)) {
      throw new Error("expected payload");
    }
    expect(st.data.supported).toBe(false);
    expect(st.data.bodies).toHaveLength(0);
  });
});
