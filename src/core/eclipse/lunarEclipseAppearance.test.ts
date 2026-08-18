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
import { normalizeLunarEclipsePresentation } from "./lunarEclipseAppearance";

describe("normalizeLunarEclipsePresentation", () => {
  it("defaults Moon Earth-shadow and type filters on and omits deleted Moon-visible keys", () => {
    const p = normalizeLunarEclipsePresentation(undefined);
    expect(p.showMoonEclipseShadow).toBe(true);
    expect(p.showTypeTotal).toBe(true);
    expect(p.showTypePartial).toBe(true);
    expect(p.showTypePenumbral).toBe(true);
    expect(p.forecastHorizonDays).toBe(7);
    expect(p).not.toHaveProperty("showVisibilityRegion");
    expect(p).not.toHaveProperty("showVisibilityBoundary");
    expect(p).not.toHaveProperty("showForecastVisibilityRegion");
    expect(p).not.toHaveProperty("showForecastVisibilityBoundary");
    expect(p).not.toHaveProperty("visibilityRegionFill");
    expect(p).not.toHaveProperty("visibilityBoundaryStroke");
    expect(p).not.toHaveProperty("visibilityRegionColor");
    expect(p).not.toHaveProperty("visibilityBoundaryColor");
  });

  it("preserves explicit Moon Earth-shadow false", () => {
    const p = normalizeLunarEclipsePresentation({ showMoonEclipseShadow: false });
    expect(p.showMoonEclipseShadow).toBe(false);
  });

  it("accepts deleted Moon-visible keys without emitting them", () => {
    const p = normalizeLunarEclipsePresentation({
      showVisibilityRegion: false,
      showVisibilityBoundary: true,
      showForecastVisibilityRegion: true,
      showForecastVisibilityBoundary: false,
      visibilityRegionColor: "#abcdef",
      visibilityBoundaryColor: "#123456",
      visibilityBoundaryThickness: "thick",
      visibilityRegionOpacity: 0.4,
      showMoonEclipseShadow: true,
    });
    expect(p.showMoonEclipseShadow).toBe(true);
    expect(p).not.toHaveProperty("showVisibilityRegion");
    expect(p).not.toHaveProperty("showVisibilityBoundary");
    expect(p).not.toHaveProperty("visibilityRegionColor");
    expect(p).not.toHaveProperty("visibilityBoundaryThickness");
  });
});
