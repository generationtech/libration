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
import { PLANETARY_BODY_IDS, PLANETARY_BODY_METADATA } from "./planetaryBodies";
import {
  DEFAULT_PLANETARY_OBJECTS_PRESENTATION,
  mergePlanetaryObjectsPresentation,
  normalizePlanetaryObjectsPresentation,
} from "./planetaryObjectsPresentation";

describe("normalizePlanetaryObjectsPresentation", () => {
  it("fills factory defaults for missing keys", () => {
    const n = normalizePlanetaryObjectsPresentation(undefined);
    expect(n.currentSubpointsEnabled).toBe(true);
    expect(n.labelsEnabled).toBe(true);
    expect(n.glyphType).toBe("symbol");
    expect(n.glyphSize).toBe("normal");
    expect(n.groundTracks.enabled).toBe(false);
    expect(n.groundTracks.pastHorizon).toBe("1d");
    expect(n.loci.duration).toBe("1y");
    for (const id of PLANETARY_BODY_IDS) {
      expect(n.bodies[id].enabled).toBe(false);
      expect(n.bodies[id].locusEnabled).toBe(false);
      expect(n.bodies[id].color).toBe(PLANETARY_BODY_METADATA[id].defaultColor);
    }
  });

  it("preserves explicit persisted body colors and locus flags", () => {
    const n = normalizePlanetaryObjectsPresentation({
      bodies: { mars: { enabled: true, color: "#ff00ff", locusEnabled: true } },
    });
    expect(n.bodies.mars.enabled).toBe(true);
    expect(n.bodies.mars.color).toBe("#ff00ff");
    expect(n.bodies.mars.locusEnabled).toBe(true);
    expect(n.bodies.venus.enabled).toBe(false);
  });

  it("keeps a locus preference when merging a body-off patch", () => {
    const on = mergePlanetaryObjectsPresentation(DEFAULT_PLANETARY_OBJECTS_PRESENTATION, {
      bodies: { mercury: { enabled: true, locusEnabled: true } },
    });
    expect(on.bodies.mercury.locusEnabled).toBe(true);
    const off = mergePlanetaryObjectsPresentation(on, {
      bodies: { mercury: { enabled: false } },
    });
    expect(off.bodies.mercury.enabled).toBe(false);
    expect(off.bodies.mercury.locusEnabled).toBe(true);
  });
});
