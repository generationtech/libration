/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOLAR_ECLIPSE_GROUND_POSITION_SIZE,
  DEFAULT_SOLAR_ECLIPSE_SHOW_LIVE_GROUND_POSITION,
  DEFAULT_SOLAR_LIVE_GROUND_POSITION_COLOR,
  normalizeSolarEclipsePresentation,
  resolveSolarEclipseGroundPositionPaint,
  resolveSolarEclipsePaint,
  solarEclipseGroundPositionRadiusScale,
  SOLAR_ECLIPSE_GROUND_POSITION_UNDERSTROKE_DARK_RGB,
} from "./solarEclipseAppearance";

describe("solar eclipse ground-position appearance", () => {
  it("defaults enabled, normal size, and the high-contrast vermilion locator", () => {
    const p = normalizeSolarEclipsePresentation(undefined);
    expect(p.showLiveGroundPosition).toBe(DEFAULT_SOLAR_ECLIPSE_SHOW_LIVE_GROUND_POSITION);
    expect(p.showLiveGroundPosition).toBe(true);
    expect(p.liveGroundPositionSize).toBe(DEFAULT_SOLAR_ECLIPSE_GROUND_POSITION_SIZE);
    expect(p.liveGroundPositionSize).toBe("normal");
    expect(p.liveGroundPositionColor).toBe(DEFAULT_SOLAR_LIVE_GROUND_POSITION_COLOR);
    expect(p.liveGroundPositionColor).toBe("#d45a3c");
  });

  it("normalizes missing and invalid size/color keys", () => {
    const missing = normalizeSolarEclipsePresentation({});
    expect(missing.showLiveGroundPosition).toBe(true);
    expect(missing.liveGroundPositionSize).toBe("normal");
    expect(missing.liveGroundPositionColor).toBe("#d45a3c");
    const invalid = normalizeSolarEclipsePresentation({
      showLiveGroundPosition: "yes",
      liveGroundPositionSize: "huge",
      liveGroundPositionColor: "coral",
    });
    expect(invalid.showLiveGroundPosition).toBe(false);
    expect(invalid.liveGroundPositionSize).toBe("normal");
    expect(invalid.liveGroundPositionColor).toBe("#d45a3c");
  });

  it("preserves explicit off and extraLarge", () => {
    const p = normalizeSolarEclipsePresentation({
      showLiveGroundPosition: false,
      liveGroundPositionSize: "extraLarge",
      liveGroundPositionColor: "#c94c3c",
    });
    expect(p.showLiveGroundPosition).toBe(false);
    expect(p.liveGroundPositionSize).toBe("extraLarge");
    expect(p.liveGroundPositionColor).toBe("#c94c3c");
  });

  it("scales small / normal / large / extraLarge as bounded multipliers", () => {
    expect(solarEclipseGroundPositionRadiusScale("small")).toBeCloseTo(0.7);
    expect(solarEclipseGroundPositionRadiusScale("normal")).toBe(1);
    expect(solarEclipseGroundPositionRadiusScale("large")).toBeCloseTo(1.45);
    expect(solarEclipseGroundPositionRadiusScale("extraLarge")).toBeCloseTo(1.9);
  });

  it("picks a dark under-ring for the default warm-red foreground", () => {
    const p = normalizeSolarEclipsePresentation(undefined);
    const paint = resolveSolarEclipseGroundPositionPaint(p);
    expect(paint.radiusScale).toBe(1);
    expect(paint.fill).toContain("212, 90, 60");
    expect(paint.underStroke).toContain(SOLAR_ECLIPSE_GROUND_POSITION_UNDERSTROKE_DARK_RGB);
    expect(paint.haloFill).toMatch(/0\.16/);
  });

  it("does not leak ground-marker color into live band or forecast paint", () => {
    const def = normalizeSolarEclipsePresentation(undefined);
    const custom = normalizeSolarEclipsePresentation({ liveGroundPositionColor: "#22cc66" });
    expect(resolveSolarEclipsePaint(custom)).toEqual(resolveSolarEclipsePaint(def));
    expect(resolveSolarEclipseGroundPositionPaint(custom).fill).not.toBe(
      resolveSolarEclipseGroundPositionPaint(def).fill,
    );
  });

  it("keeps the active corridor near upcoming strength instead of collapsing it", () => {
    const paint = resolveSolarEclipsePaint(normalizeSolarEclipsePresentation(undefined));
    expect(paint.forecastCorridorUmbraFill).toBe("rgba(72, 48, 140, 0.28)");
    expect(paint.activeCorridorUmbraFill).toBe("rgba(72, 48, 140, 0.22)");
    expect(paint.activeCorridorAntumbraFill).toBe("rgba(176, 96, 36, 0.19)");
    expect(paint.activeCorridorStroke).toBe("rgba(220, 208, 255, 0.52)");
    expect(paint.forecastCorridorStroke).toBe("rgba(220, 208, 255, 0.38)");
    const custom = resolveSolarEclipsePaint(
      normalizeSolarEclipsePresentation({
        forecastCorridorColor: "#48308c",
        forecastCorridorOpacity: 0.4,
      }),
    );
    expect(custom.activeCorridorUmbraFill).toMatch(/0\.3200/);
    expect(custom.activeCorridorStroke).toMatch(/0\.5200/);
  });
});
