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
  buildUtcFocusWindow,
  clampUtcFocusAnnotationX,
  placeUtcFocusAnnotationXWithGap,
  utcFocusAnnotationCenterY,
  utcFocusAnnotationMinGapPx,
  utcFocusAnnotationPreferredX,
  UTC_FOCUS_ANNOTATION_HOUR_OFFSET,
  UTC_FOCUS_HALF_WINDOW_HOURS,
  UTC_FOCUS_WINDOW_HOURS,
  utcFocusAnnotationSide,
  utcFocusOpacityAtX,
} from "./utcTopTapeFocusTreatment";

describe("utcTopTapeFocusTreatment", () => {
  it("builds a 3-hour window in pixel space from hour spacing", () => {
    const window = buildUtcFocusWindow(300, 40);
    expect(UTC_FOCUS_WINDOW_HOURS).toBe(3);
    expect(window.halfWindowPx).toBe(40 * UTC_FOCUS_HALF_WINDOW_HOURS);
    expect(window.minX).toBe(240);
    expect(window.maxX).toBe(360);
  });

  it("uses full opacity near read point and fades to zero at ±1.5h", () => {
    const window = buildUtcFocusWindow(300, 40);
    expect(utcFocusOpacityAtX(window, 300)).toBe(1);
    expect(utcFocusOpacityAtX(window, 340)).toBe(1);
    expect(utcFocusOpacityAtX(window, 350)).toBeGreaterThan(0);
    expect(utcFocusOpacityAtX(window, 360)).toBe(0);
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
