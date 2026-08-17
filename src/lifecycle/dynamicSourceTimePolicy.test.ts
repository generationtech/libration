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
import { GLOBAL_CLOUDS_IR_SOURCE_ID } from "./dynamicEquirectSourceCatalog";
import { USGS_EARTHQUAKES_SOURCE_ID } from "./dynamicPointFeaturesSourceCatalog";
import { ISS_ORBITAL_TRACK_SOURCE_ID } from "./dynamicTracksSourceCatalog";
import {
  getDynamicSourceTimePolicy,
  isWallClockCurrentSource,
} from "./dynamicSourceTimePolicy";

describe("dynamic source time policy", () => {
  it("classifies the three current live providers as wallClockCurrent", () => {
    expect(getDynamicSourceTimePolicy(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBe(
      "wallClockCurrent",
    );
    expect(getDynamicSourceTimePolicy(USGS_EARTHQUAKES_SOURCE_ID)).toBe(
      "wallClockCurrent",
    );
    expect(getDynamicSourceTimePolicy(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(
      "wallClockCurrent",
    );
    expect(isWallClockCurrentSource(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBe(true);
    expect(isWallClockCurrentSource(USGS_EARTHQUAKES_SOURCE_ID)).toBe(true);
    expect(isWallClockCurrentSource(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(true);
  });

  it("does not invent a policy for unknown sources", () => {
    expect(getDynamicSourceTimePolicy("not-a-catalog-source")).toBeNull();
    expect(isWallClockCurrentSource("not-a-catalog-source")).toBe(false);
  });
});
