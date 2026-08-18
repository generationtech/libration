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
  LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_STROKE,
  LUNAR_ECLIPSE_VISIBILITY_REGION_FILL,
  normalizeLunarEclipsePresentation,
  resolveLunarEclipsePaint,
} from "./lunarEclipseAppearance";

describe("normalizeLunarEclipsePresentation", () => {
  it("defaults unified Moon-visible region and boundary on and omits forecast visibility keys", () => {
    const p = normalizeLunarEclipsePresentation(undefined);
    expect(p.showVisibilityRegion).toBe(true);
    expect(p.showVisibilityBoundary).toBe(true);
    expect(p).not.toHaveProperty("showForecastVisibilityRegion");
    expect(p).not.toHaveProperty("showForecastVisibilityBoundary");
  });

  it("preserves explicit unified false values", () => {
    const p = normalizeLunarEclipsePresentation({
      showVisibilityRegion: false,
      showVisibilityBoundary: false,
    });
    expect(p.showVisibilityRegion).toBe(false);
    expect(p.showVisibilityBoundary).toBe(false);
  });

  it("seeds unified flags from legacy forecast keys when current keys are missing", () => {
    expect(
      normalizeLunarEclipsePresentation({ showForecastVisibilityRegion: false }).showVisibilityRegion,
    ).toBe(false);
    expect(
      normalizeLunarEclipsePresentation({ showForecastVisibilityBoundary: true }).showVisibilityBoundary,
    ).toBe(true);
  });

  it("uses the more restrictive value when current and forecast keys differ", () => {
    expect(
      normalizeLunarEclipsePresentation({
        showVisibilityRegion: true,
        showForecastVisibilityRegion: false,
      }).showVisibilityRegion,
    ).toBe(false);
    expect(
      normalizeLunarEclipsePresentation({
        showVisibilityRegion: false,
        showForecastVisibilityRegion: true,
      }).showVisibilityRegion,
    ).toBe(false);
    expect(
      normalizeLunarEclipsePresentation({
        showVisibilityBoundary: true,
        showForecastVisibilityBoundary: false,
      }).showVisibilityBoundary,
    ).toBe(false);
    expect(
      normalizeLunarEclipsePresentation({
        showVisibilityBoundary: false,
        showForecastVisibilityBoundary: true,
      }).showVisibilityBoundary,
    ).toBe(false);
  });

  it("keeps unified true only when neither lifecycle key is explicitly false", () => {
    expect(
      normalizeLunarEclipsePresentation({
        showVisibilityRegion: true,
        showForecastVisibilityRegion: true,
        showVisibilityBoundary: true,
        showForecastVisibilityBoundary: true,
      }),
    ).toMatchObject({ showVisibilityRegion: true, showVisibilityBoundary: true });
    expect(
      normalizeLunarEclipsePresentation({
        showVisibilityRegion: false,
        showForecastVisibilityRegion: false,
        showVisibilityBoundary: false,
        showForecastVisibilityBoundary: false,
      }),
    ).toMatchObject({ showVisibilityRegion: false, showVisibilityBoundary: false });
  });
});

describe("resolveLunarEclipsePaint", () => {
  it("emits one visibility paint family and no forecast tokens", () => {
    const paint = resolveLunarEclipsePaint(normalizeLunarEclipsePresentation(undefined));
    expect(paint.visibilityRegionFill).toBe(LUNAR_ECLIPSE_VISIBILITY_REGION_FILL);
    expect(paint.visibilityBoundaryStroke).toBe(LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_STROKE);
    expect(paint).not.toHaveProperty("forecastVisibilityRegionFill");
    expect(paint).not.toHaveProperty("forecastVisibilityBoundaryStroke");
  });
});
