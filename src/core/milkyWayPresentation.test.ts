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
import {
  DEFAULT_MILKY_WAY_PRESENTATION,
  mergeMilkyWayPresentation,
  normalizeMilkyWayPresentation,
} from "./milkyWayPresentation";

describe("normalizeMilkyWayPresentation", () => {
  it("fills factory defaults", () => {
    const n = normalizeMilkyWayPresentation(undefined);
    expect(n).toEqual(DEFAULT_MILKY_WAY_PRESENTATION);
    expect(n.planeEnabled).toBe(true);
    expect(n.bandEnabled).toBe(true);
    expect(n.bandWidth).toBe("normal");
    expect(n.ribsEnabled).toBe(true);
    expect(n.galacticCenterEnabled).toBe(true);
    expect(n.galacticCenterLabelEnabled).toBe(true);
    expect(n.galacticAnticenterEnabled).toBe(false);
    expect(n.emphasizeNightSide).toBe(true);
    expect(n.planeThickness).toBe("thin");
  });

  it("preserves explicit persisted values and rejects unknown tokens", () => {
    const n = normalizeMilkyWayPresentation({
      planeEnabled: false,
      bandWidth: "wide",
      planeColor: "#ff00ff",
      galacticAnticenterEnabled: true,
    });
    expect(n.planeEnabled).toBe(false);
    expect(n.bandWidth).toBe("wide");
    expect(n.planeColor).toBe("#ff00ff");
    expect(n.galacticAnticenterEnabled).toBe(true);
    const bad = normalizeMilkyWayPresentation({ bandWidth: "huge" });
    expect(bad.bandWidth).toBe("normal");
  });

  it("merges patches without dropping unrelated flags", () => {
    const next = mergeMilkyWayPresentation(DEFAULT_MILKY_WAY_PRESENTATION, {
      galacticAnticenterEnabled: true,
      bandWidth: "narrow",
    });
    expect(next.galacticAnticenterEnabled).toBe(true);
    expect(next.bandWidth).toBe("narrow");
    expect(next.planeEnabled).toBe(true);
    expect(next.emphasizeNightSide).toBe(true);
  });
});
