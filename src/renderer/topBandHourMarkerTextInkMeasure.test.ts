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
import { tryMeasureMaxTopBandHourMarkerTextInkHeightPx } from "./topBandHourMarkerTextInkMeasure.ts";
import { resolveTypographyRole } from "../typography/typographyResolver.ts";

const minimalStyle = resolveTypographyRole("chromeDenseMono", { fontSizePx: 14 });

function mockCtx(measure: (label: string) => TextMetrics): CanvasRenderingContext2D {
  return {
    font: "",
    measureText: (label: string) => measure(label),
  } as unknown as CanvasRenderingContext2D;
}

describe("tryMeasureMaxTopBandHourMarkerTextInkHeightPx", () => {
  it("returns the max ink height across labels when metrics are finite", () => {
    const ctx = mockCtx(() =>
      ({
        actualBoundingBoxAscent: 7,
        actualBoundingBoxDescent: 3,
      }) as TextMetrics,
    );
    expect(
      tryMeasureMaxTopBandHourMarkerTextInkHeightPx({
        ctx,
        resolvedStyle: minimalStyle,
        labels: ["12", "345"],
      }),
    ).toBe(10);
  });

  it("returns undefined when measureText yields no usable height", () => {
    const ctx = mockCtx(() =>
      ({
        actualBoundingBoxAscent: 0,
        actualBoundingBoxDescent: 0,
        fontBoundingBoxAscent: 0,
        fontBoundingBoxDescent: 0,
      }) as TextMetrics,
    );
    expect(
      tryMeasureMaxTopBandHourMarkerTextInkHeightPx({
        ctx,
        resolvedStyle: minimalStyle,
        labels: ["x"],
      }),
    ).toBeUndefined();
  });

  it("ignores non-finite or oversized ink heights so callers can fall back to typography", () => {
    const ctx = mockCtx(() =>
      ({
        actualBoundingBoxAscent: Number.NaN,
        actualBoundingBoxDescent: 1,
      }) as TextMetrics,
    );
    expect(
      tryMeasureMaxTopBandHourMarkerTextInkHeightPx({
        ctx,
        resolvedStyle: minimalStyle,
        labels: ["x"],
      }),
    ).toBeUndefined();
  });

  it("returns undefined for empty label list", () => {
    const ctx = mockCtx(() => ({}) as TextMetrics);
    expect(
      tryMeasureMaxTopBandHourMarkerTextInkHeightPx({
        ctx,
        resolvedStyle: minimalStyle,
        labels: [],
      }),
    ).toBeUndefined();
  });

  it("ignores absurdly large ink heights", () => {
    const ctx = mockCtx(() =>
      ({
        actualBoundingBoxAscent: 5000,
        actualBoundingBoxDescent: 0,
      }) as TextMetrics,
    );
    expect(
      tryMeasureMaxTopBandHourMarkerTextInkHeightPx({
        ctx,
        resolvedStyle: minimalStyle,
        labels: ["x"],
      }),
    ).toBeUndefined();
  });
});
