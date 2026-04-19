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
import { DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG } from "./appConfig";
import { resolveEffectiveTopBandHourMarkers } from "./topBandHourMarkersResolver";
import { TOP_CHROME_STYLE } from "./topChromeStyle";
import { normalizeDisplayChromeLayout } from "./v2/librationConfig";
import { resolveEffectiveTickTapeArea } from "./topBandTickTapeResolver";

describe("resolveEffectiveTickTapeArea", () => {
  it("matches built-in tick stroke/baseline when no background override is authored", () => {
    const eff = resolveEffectiveTickTapeArea(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    expect(eff.usesAuthoredTapeBackgroundOverride).toBe(false);
    expect(eff.tapeTickStroke).toBe(TOP_CHROME_STYLE.ticks.stroke);
    expect(eff.tapeBaselineStroke).toBe(TOP_CHROME_STYLE.ticks.baseline);
  });

  it("uses authored background and dark tick ink on a light tape background", () => {
    const eff = resolveEffectiveTickTapeArea(
      normalizeDisplayChromeLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        tickTapeAreaBackgroundColor: "#ffffff",
      }),
    );
    expect(eff.usesAuthoredTapeBackgroundOverride).toBe(true);
    expect(eff.effectiveBackgroundColor).toBe("#ffffff");
    expect(eff.effectiveForegroundColor).toBe("#000000");
    expect(eff.tapeTickStroke).toBe("rgba(0, 0, 0, 0.88)");
    expect(eff.tapeBaselineStroke).toBe("rgba(0, 0, 0, 0.26)");
  });

  it("uses light tick ink on a dark tape background", () => {
    const eff = resolveEffectiveTickTapeArea(
      normalizeDisplayChromeLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        tickTapeAreaBackgroundColor: "#000000",
      }),
    );
    expect(eff.effectiveForegroundColor).toBe("#ffffff");
    expect(eff.tapeTickStroke).toBe("rgba(255, 255, 255, 0.88)");
    expect(eff.tapeBaselineStroke).toBe("rgba(255, 255, 255, 0.26)");
  });

  it("does not alter resolved indicator entries when only the tape background override changes", () => {
    const base = normalizeDisplayChromeLayout(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const withTape = normalizeDisplayChromeLayout({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      tickTapeAreaBackgroundColor: "#ffeedd",
    });
    expect(resolveEffectiveTopBandHourMarkers(base)).toEqual(resolveEffectiveTopBandHourMarkers(withTape));
  });
});
