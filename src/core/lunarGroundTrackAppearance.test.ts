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
  DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR,
  normalizeLunarGroundTrackStrokeCss,
} from "./lunarGroundTrackAppearance";

describe("normalizeLunarGroundTrackStrokeCss", () => {
  it("returns the LIB-004 cool default for missing or invalid input", () => {
    expect(normalizeLunarGroundTrackStrokeCss(undefined)).toBe(DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR);
    expect(normalizeLunarGroundTrackStrokeCss(null)).toBe(DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR);
    expect(normalizeLunarGroundTrackStrokeCss("")).toBe(DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR);
    expect(normalizeLunarGroundTrackStrokeCss("not-a-color")).toBe(DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR);
    expect(normalizeLunarGroundTrackStrokeCss("hsl(200, 50%, 50%)")).toBe(
      DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR,
    );
  });

  it("canonicalizes hex and rgb to lowercase #rrggbb and discards rgba alpha", () => {
    expect(normalizeLunarGroundTrackStrokeCss("#AACDF0")).toBe("#aacdf0");
    expect(normalizeLunarGroundTrackStrokeCss("#abc")).toBe("#aabbcc");
    expect(normalizeLunarGroundTrackStrokeCss("rgb(170, 205, 240)")).toBe("#aacdf0");
    expect(normalizeLunarGroundTrackStrokeCss("rgba(255, 0, 0, 0.2)")).toBe("#ff0000");
  });
});
