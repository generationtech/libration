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
  clampUtcFocusAnnotationX,
  hour0To23FromPad2TapeLabel,
  placeUtcFocusAnnotationXWithGap,
  shortestSignedHourDeltaHours,
  utcFocusAnnotationCenterY,
  utcFocusAnnotationMinGapPx,
  utcFocusAnnotationPreferredX,
  UTC_FOCUS_ANNOTATION_HOUR_OFFSET,
  UTC_FOCUS_WINDOW_HOURS,
  utcFocusAnnotationSide,
  utcFocusLabelCenterXFromUtcHourFloat,
  utcFractionalHourOfDayMs,
} from "./utcTopTapeFocusTreatment";

describe("utcTopTapeFocusTreatment", () => {
  it("documents the focused UTC hour-marker window as three civil UTC hours", () => {
    expect(UTC_FOCUS_WINDOW_HOURS).toBe(3);
  });

  it("places annotation opposite the viewport centerline with stable centered default", () => {
    expect(utcFocusAnnotationSide(100, 480)).toBe("right");
    expect(utcFocusAnnotationSide(860, 480)).toBe("left");
    expect(utcFocusAnnotationSide(480, 480)).toBe("right");
  });

  it("clamps annotation center to remain visible on screen", () => {
    expect(
      clampUtcFocusAnnotationX({
        preferredX: 980,
        annotationSide: "right",
        estimatedTextWidthPx: 120,
        viewportWidthPx: 960,
        marginPx: 12,
      }),
    ).toBeLessThan(960);
    expect(
      clampUtcFocusAnnotationX({
        preferredX: -40,
        annotationSide: "left",
        estimatedTextWidthPx: 120,
        viewportWidthPx: 960,
        marginPx: 12,
      }),
    ).toBeGreaterThan(0);
  });

  it("centers annotation vertically on the focused tape numeral band", () => {
    expect(utcFocusAnnotationCenterY(30, 40)).toBe(50);
  });

  it("anchors annotation near +/-2 hour markers from focused hour", () => {
    expect(
      utcFocusAnnotationPreferredX({
        focusedHourX: 400,
        hourSpacingPx: 30,
        annotationSide: "right",
      }),
    ).toBe(400 + 30 * UTC_FOCUS_ANNOTATION_HOUR_OFFSET);
    expect(
      utcFocusAnnotationPreferredX({
        focusedHourX: 400,
        hourSpacingPx: 30,
        annotationSide: "left",
      }),
    ).toBe(400 - 30 * UTC_FOCUS_ANNOTATION_HOUR_OFFSET);
  });

  it("derives a concrete minimum annotation gap from spacing/label size", () => {
    expect(utcFocusAnnotationMinGapPx({ hourSpacingPx: 0, labelSizePx: 0 })).toBeGreaterThan(0);
    expect(utcFocusAnnotationMinGapPx({ hourSpacingPx: 60, labelSizePx: 10 })).toBeGreaterThan(
      utcFocusAnnotationMinGapPx({ hourSpacingPx: 20, labelSizePx: 10 }),
    );
  });

  it("computes fractional UTC hour-of-day including minutes and seconds", () => {
    const ms = Date.UTC(2024, 5, 10, 16, 59, 45, 500);
    expect(utcFractionalHourOfDayMs(ms)).toBeCloseTo(16 + 59 / 60 + 45.5 / 3600, 10);
  });

  it("shortestSignedHourDeltaHours wraps across midnight for the three-hour window", () => {
    expect(shortestSignedHourDeltaHours(23, 0.25)).toBeCloseTo(-1.25, 10);
    expect(shortestSignedHourDeltaHours(0, 23.5)).toBeCloseTo(0.5, 10);
    expect(shortestSignedHourDeltaHours(17, 16.9833)).toBeCloseTo(0.0167, 4);
  });

  it("utcFocusLabelCenterXFromUtcHourFloat places the fractional instant at readPointX", () => {
    const readPointX = 400;
    const hourSpacingPx = 40;
    const utcHourFloat = 16 + 59 / 60 + 30 / 3600;
    const x17 = utcFocusLabelCenterXFromUtcHourFloat({
      readPointX,
      labelHour0To23: 17,
      utcHourFloat,
      hourSpacingPx,
    });
    expect(x17 - readPointX).toBeCloseTo(shortestSignedHourDeltaHours(17, utcHourFloat) * hourSpacingPx, 8);
  });

  it("parses pad-2 tape labels", () => {
    expect(hour0To23FromPad2TapeLabel("07")).toBe(7);
    expect(Number.isNaN(hour0To23FromPad2TapeLabel("7"))).toBe(true);
  });

  it("places annotation with enforced separation from focused-hour cluster", () => {
    const right = placeUtcFocusAnnotationXWithGap({
      preferredX: 520,
      annotationSide: "right",
      annotationWidthPx: 120,
      viewportWidthPx: 960,
      marginPx: 12,
      minGapPx: 24,
      focusedHourClusterSpan: { minX: 440, maxX: 500 },
    });
    expect(right).toBeGreaterThanOrEqual(500 + 24 + 60);

    const left = placeUtcFocusAnnotationXWithGap({
      preferredX: 420,
      annotationSide: "left",
      annotationWidthPx: 120,
      viewportWidthPx: 960,
      marginPx: 12,
      minGapPx: 24,
      focusedHourClusterSpan: { minX: 440, maxX: 500 },
    });
    expect(left).toBeLessThanOrEqual(440 - 24 - 60);
  });
});
